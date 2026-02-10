import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Graph from "./components/Graph";
import Toast from "./components/Toast";
import { convertCode, getConvertedFiles, migrateNode } from "./api/api";
import SearchIcon from "./assets/search.svg";
import Logo from "./assets/logo.svg";

/**
 * OBJECTIVE B & D: Workflow Page
 *
 * This page displays a fan-in dependency closure for a selected node.
 * It reuses ALL functionality from /map:
 * - Risk analysis
 * - Node selection
 * - Side panel
 * - Convert file logic
 * - Visual language
 *
 * ONLY DIFFERENCE: Graph data is scoped to selected node + transitive fan-ins
 */

// Import cache from map_page to access full graph
import {
  cachedGraph as importedCachedGraph,
  cachedAnalysis as importedCachedAnalysis,
} from "./map_page";

// Local cache for workflow page state
let cachedTargetLanguage: "go" | "kotlin" | "typescript" | "" = "";
let cachedConvertedCount: number = 0;

export default function WorkflowPage() {
  const { nodeId } = useParams<{ nodeId: string }>();
  const navigate = useNavigate();

  const [fullGraph, setFullGraph] = useState<any>(null);
  const [fullAnalysis, setFullAnalysis] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [targetLanguage, setTargetLanguage] = useState<
    "go" | "kotlin" | "typescript" | ""
  >(cachedTargetLanguage);
  const [convertedCount, setConvertedCount] = useState(cachedConvertedCount);
  const [converting, setConverting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [verdictData, setVerdictData] = useState<{
    verdict: string;
    response: string;
    riskScore: number;
  } | null>(null);

  // Load full graph from map_page cache
  useEffect(() => {
    if (importedCachedGraph && importedCachedAnalysis) {
      setFullGraph(importedCachedGraph);
      setFullAnalysis(importedCachedAnalysis);
    } else {
      // If no cache, redirect back to map
      navigate("/map");
    }
  }, [navigate]);

  // Check for existing converted files
  useEffect(() => {
    if (!fullAnalysis) return;
    const anyFilePath: string = Object.values(fullAnalysis).find(
      (v: any) => v.filePath,
    )
      ? (Object.values(fullAnalysis).find((v: any) => v.filePath) as any)
          .filePath
      : "";
    if (!anyFilePath || !anyFilePath.includes("/repos/")) return;
    const projectId = anyFilePath.split("/repos/")[1]?.split("/")[0];
    if (!projectId) return;

    getConvertedFiles(projectId)
      .then((data) => {
        if (data.total > 0) {
          setConvertedCount(data.total);
          cachedConvertedCount = data.total;
          const lang = data.conversions[0]?.target_language?.toLowerCase();
          if (lang === "go" || lang === "kotlin" || lang === "typescript") {
            setTargetLanguage(lang);
            cachedTargetLanguage = lang;
          }
        }
      })
      .catch(() => {
        /* ignore */
      });
  }, [fullAnalysis]);

  /**
   * OBJECTIVE D: Fan-In Dependency Closure Algorithm
   *
   * Computes transitive fan-ins using reverse graph traversal (BFS).
   * Includes selected node + all nodes that depend on it (directly or indirectly).
   */
  const workflowGraph = useMemo(() => {
    if (!fullGraph || !nodeId) return null;

    // Build reverse adjacency list (to -> from)
    const reverseEdges = new Map<string, Set<string>>();
    fullGraph.edges.forEach((edge: any) => {
      if (!reverseEdges.has(edge.to)) {
        reverseEdges.set(edge.to, new Set());
      }
      reverseEdges.get(edge.to)!.add(edge.from);
    });

    // BFS to find all fan-ins (nodes that depend on nodeId)
    const fanInNodes = new Set<string>();
    fanInNodes.add(nodeId); // Include selected node

    const queue: string[] = [nodeId];
    const visited = new Set<string>([nodeId]);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const dependents = reverseEdges.get(current);

      if (dependents) {
        dependents.forEach((dependent) => {
          if (!visited.has(dependent)) {
            visited.add(dependent);
            fanInNodes.add(dependent);
            queue.push(dependent);
          }
        });
      }
    }

    // Filter nodes and edges to include only fan-in closure
    const nodes = fullGraph.nodes.filter((n: any) => fanInNodes.has(n.id));
    const edges = fullGraph.edges.filter(
      (e: any) => fanInNodes.has(e.from) && fanInNodes.has(e.to),
    );

    return { nodes, edges };
  }, [fullGraph, nodeId]);

  // Apply search filter
  const filteredGraph = useMemo(() => {
    if (!workflowGraph) return null;
    if (!searchTerm.trim()) return workflowGraph;

    const lowerSearch = searchTerm.toLowerCase();
    const nodes = workflowGraph.nodes.filter((n: any) => {
      const className = n.classNames?.[0] || "";
      return (
        n.id.toLowerCase().includes(lowerSearch) ||
        className.toLowerCase().includes(lowerSearch)
      );
    });
    const nodeIds = new Set(nodes.map((n: any) => n.id));
    const edges = workflowGraph.edges.filter(
      (e: any) => nodeIds.has(e.from) && nodeIds.has(e.to),
    );
    return { nodes, edges };
  }, [workflowGraph, searchTerm]);

  // Step 1: Get Backboard verdict
  const handleRequestVerdict = async (nodeId: string) => {
    if (!targetLanguage) {
      setToastMessage("Please select a target language first");
      setShowToast(true);
      return;
    }
    setAnalyzing(true);
    try {
      const result = await migrateNode(nodeId);
      setVerdictData({
        verdict: result.verdict,
        response: result.response,
        riskScore: result.riskScore,
      });
    } catch (err: any) {
      setToastMessage(err.message || "Failed to get risk assessment");
      setShowToast(true);
    } finally {
      setAnalyzing(false);
    }
  };

  // Step 2: Actually convert the file
  const handleConfirmConvert = async (nodeId: string) => {
    if (!targetLanguage) {
      setToastMessage("Please select a target language first");
      setShowToast(true);
      return;
    }

    setConverting(true);
    try {
      const nodeData = fullAnalysis[nodeId];
      if (!nodeData?.filePath) {
        throw new Error("No file path found for this node");
      }

      await convertCode(nodeData.filePath, targetLanguage);
      setConvertedCount((prev) => prev + 1);
      cachedConvertedCount += 1;
      setToastMessage(`✓ Converted to ${targetLanguage.toUpperCase()}`);
      setShowToast(true);
      setVerdictData(null);
    } catch (err: any) {
      const errorMessage = err.message || "Conversion failed";

      // Enhanced error message for rate limits
      if (
        errorMessage.includes("429") ||
        errorMessage.includes("rate limit") ||
        errorMessage.includes("Resource exhausted")
      ) {
        setToastMessage(
          "⏳ Gemini API rate limit reached. Free tier allows ~15 requests/min. " +
            "Please wait 60 seconds or upgrade to a paid plan.",
        );
      } else {
        setToastMessage(errorMessage);
      }
      setShowToast(true);
    } finally {
      setConverting(false);
    }
  };

  if (!fullGraph || !fullAnalysis || !workflowGraph) {
    return (
      <div className="min-h-screen bg-[#060C1E] flex items-center justify-center">
        <div className="text-white">Loading workflow...</div>
      </div>
    );
  }

  const totalFiles = workflowGraph.nodes.length;
  const safeFiles = workflowGraph.nodes.filter(
    (n: any) => fullAnalysis[n.id]?.classification === "GREEN",
  ).length;
  const hasConvertedFiles = convertedCount > 0;

  return (
    <div className="h-screen bg-[#060C1E] flex flex-col overflow-hidden">
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* LEFT SIDEBAR - Same as map_page */}
        <aside className="w-72 bg-[#0B1227] border-r border-white/10 p-6 flex flex-col overflow-y-auto scrollable-container">
          <div className="flex items-center gap-3 mb-8">
            <img src={Logo} alt="logo" className="w-12 h-12" />
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-white truncate font-secondary">
                Workflow View
              </h1>
            </div>
          </div>
          <p className="mt-1 text-sm text-gray-400 font-primary mb-4">
            Dependency closure for:{" "}
            <strong className="text-white">{nodeId}</strong>
          </p>

          <div className="space-y-3 text-sm text-white mb-8">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-[#10B981]" /> Safe
            </div>
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-[#F59E0B]" /> Moderate
            </div>
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-[#EF4444]" /> Risky
            </div>
          </div>

          <div className="text-sm text-white space-y-2 mb-8">
            <div className="flex justify-between">
              <span className="text-gray-400">Total Files</span>
              <span>{totalFiles}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Safe to Convert</span>
              <span className="text-[#10B981]">{safeFiles}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Converted</span>
              <span className="text-[#10B981]">{convertedCount}</span>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6">
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">
              Target Language
            </label>
            <select
              value={targetLanguage}
              onChange={(e) => {
                const val = e.target.value as
                  | "go"
                  | "kotlin"
                  | "typescript"
                  | "";
                setTargetLanguage(val);
                cachedTargetLanguage = val;
              }}
              className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm bg-[#0B1227] text-white focus:outline-none focus:ring-2 focus:ring-[#10B981]"
            >
              <option value="">Select…</option>
              <option value="go">Go</option>
              <option value="kotlin">Kotlin</option>
              <option value="typescript">TypeScript</option>
            </select>
          </div>
        </aside>

        <main className="flex-1 relative flex flex-col">
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 lg:w-[700px] md:w-[450px] sm:w-[300px]">
            <div className="relative">
              <img
                src={SearchIcon}
                alt=""
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-70"
              />
              <input
                placeholder="Search files"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl bg-[#0B1227]/90 border border-white/10 pl-10 pr-4 py-3 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
              />
            </div>
          </div>

          {(analyzing || converting) && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="text-lg font-secondary text-[#10B981] animate-pulse">
                {analyzing ? "Analyzing…" : "Converting…"}
              </div>
            </div>
          )}

          <div className="flex-1 h-full w-full overflow-hidden">
            {filteredGraph && (
              <Graph
                graph={filteredGraph}
                analysis={fullAnalysis}
                onConvert={handleConfirmConvert}
                onRequestVerdict={handleRequestVerdict}
                verdictData={verdictData}
                onClearVerdict={() => setVerdictData(null)}
              />
            )}
          </div>

          <div className="absolute bottom-6 left-6 flex gap-3">
            <button
              onClick={() => navigate("/map")}
              className="px-8 py-3 rounded-xl bg-[#10B981] text-black font-secondary hover:brightness-110 transition"
            >
              Back to Map
            </button>
            <button
              onClick={() => {
                if (!hasConvertedFiles) return;
                const anyFP: string = Object.values(fullAnalysis).find(
                  (v: any) => v.filePath,
                )
                  ? (
                      Object.values(fullAnalysis).find(
                        (v: any) => v.filePath,
                      ) as any
                    ).filePath
                  : "";
                const pId = anyFP.includes("/repos/")
                  ? anyFP.split("/repos/")[1]?.split("/")[0]
                  : "";
                navigate("/comparison", { state: { projectId: pId } });
              }}
              disabled={!hasConvertedFiles}
              className={`px-6 py-3 rounded-xl font-secondary transition ${
                hasConvertedFiles
                  ? "bg-[#10B981] text-black hover:bg-[#0ea472]"
                  : "bg-gray-600 text-gray-400 cursor-not-allowed"
              }`}
            >
              Converted Files
            </button>
          </div>

          {showToast && (
            <Toast message={toastMessage} onClose={() => setShowToast(false)} />
          )}
        </main>
      </div>
    </div>
  );
}
