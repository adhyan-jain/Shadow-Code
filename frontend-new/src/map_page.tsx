import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ParticlesBackground from "./components/particle_background";
import Graph from "./components/Graph";
import Toast from "./components/Toast";
import { convertCode, getConvertedFiles } from "./api/api";
import SearchIcon from "./assets/search.svg";
import Logo from "./assets/logo.svg";

// ─── Session-level cache ────────────────────────────────────
// Survives navigation but clears on full page refresh / new tab.
let cachedGraph: any = null;
let cachedAnalysis: any = null;
let cachedRepoUrl: string = "";
let cachedTargetLanguage: "go" | "kotlin" | "" = "";
let cachedLanguageLocked: boolean = false;
let cachedConvertedCount: number = 0;

export function clearMapCache() {
  cachedGraph = null;
  cachedAnalysis = null;
  cachedRepoUrl = "";
  cachedTargetLanguage = "";
  cachedLanguageLocked = false;
  cachedConvertedCount = 0;
}

export default function MapPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Hydrate from navigation state (fresh analysis) or cache (returning)
  const incoming = location.state as any;
  const graph = incoming?.graph ?? cachedGraph;
  const analysis = incoming?.analysis ?? cachedAnalysis;
  const repoUrl = incoming?.repoUrl ?? cachedRepoUrl;

  // Persist to cache whenever we have data
  useEffect(() => {
    if (graph && analysis) {
      cachedGraph = graph;
      cachedAnalysis = analysis;
      cachedRepoUrl = repoUrl;
    }
  }, [graph, analysis, repoUrl]);

  // If fresh analysis came in (from home), reset language lock + converted count
  useEffect(() => {
    if (incoming?.graph) {
      cachedTargetLanguage = "";
      cachedLanguageLocked = false;
      cachedConvertedCount = 0;
      setTargetLanguage("");
      setLanguageLocked(false);
      setConvertedCount(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming?.graph]);

  const [searchTerm, setSearchTerm] = useState("");
  const [targetLanguage, setTargetLanguage] = useState<"go" | "kotlin" | "">(
    cachedTargetLanguage,
  );
  const [languageLocked, setLanguageLocked] = useState(cachedLanguageLocked);
  const [convertedCount, setConvertedCount] = useState(cachedConvertedCount);
  const [converting, setConverting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // On mount, check backend for existing converted files
  useEffect(() => {
    if (!analysis) return;
    // Derive project id the same way the backend does
    const anyFilePath: string = Object.values(analysis).find(
      (v: any) => v.filePath,
    )
      ? (Object.values(analysis).find((v: any) => v.filePath) as any).filePath
      : "";
    if (!anyFilePath || !anyFilePath.includes("/repos/")) return;
    const projectId = anyFilePath.split("/repos/")[1]?.split("/")[0];
    if (!projectId) return;

    getConvertedFiles(projectId)
      .then((data) => {
        if (data.total > 0) {
          setConvertedCount(data.total);
          cachedConvertedCount = data.total;
          // If conversions exist, lock the language
          const lang = data.conversions[0]?.target_language?.toLowerCase();
          if (lang === "go" || lang === "kotlin") {
            setTargetLanguage(lang);
            setLanguageLocked(true);
            cachedTargetLanguage = lang;
            cachedLanguageLocked = true;
          }
        }
      })
      .catch(() => {
        /* ignore — first time */
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis]);

  // Filter logic
  const filteredGraph = {
    nodes:
      graph?.nodes.filter(
        (node: any) =>
          !searchTerm ||
          node.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (node.classNames?.[0] &&
            node.classNames[0]
              .toLowerCase()
              .includes(searchTerm.toLowerCase())),
      ) || [],
    edges:
      graph?.edges.filter((edge: any) => {
        const nodeIds = new Set(
          graph.nodes
            .filter(
              (node: any) =>
                !searchTerm ||
                node.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (node.classNames?.[0] &&
                  node.classNames[0]
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase())),
            )
            .map((n: any) => n.id),
        );
        return nodeIds.has(edge.from) && nodeIds.has(edge.to);
      }) || [],
  };

  // ─── Inline conversion (no page navigation) ──────────────
  const handleConvert = async (nodeId: string) => {
    if (!targetLanguage) {
      setToastMessage("Select a target language first.");
      setShowToast(true);
      return;
    }
    setConverting(true);
    try {
      await convertCode(nodeId, targetLanguage);
      const newCount = convertedCount + 1;
      setConvertedCount(newCount);
      cachedConvertedCount = newCount;
      // Lock language after first successful conversion
      if (!languageLocked) {
        setLanguageLocked(true);
        cachedLanguageLocked = true;
        cachedTargetLanguage = targetLanguage;
      }
      setToastMessage("File successfully converted");
      setShowToast(true);
    } catch (err) {
      console.error("Conversion failed:", err);
      setToastMessage(err instanceof Error ? err.message : "Conversion failed");
      setShowToast(true);
    } finally {
      setConverting(false);
    }
  };

  if (!graph || !analysis) {
    return (
      <div className="min-h-screen bg-[#060C1E] flex items-center justify-center text-white">
        <div className="text-center">
          <h2 className="text-xl mb-4">No analysis data found</h2>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-2 rounded-xl bg-[#10B981] text-black font-secondary hover:bg-[#0ea472] transition"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // Calculate stats
  const nodes = graph.nodes;
  const totalFiles = nodes.length;
  const safeFiles = nodes.filter((n: any) => {
    const nodeAnalysis = analysis[n.id];
    return nodeAnalysis && nodeAnalysis.classification === "GREEN";
  }).length;

  const hasConvertedFiles = convertedCount > 0;

  return (
    <div className="min-h-screen bg-[#060C1E] flex text-white relative">
      <ParticlesBackground />
      <div className="relative z-10 flex flex-1 min-w-0">
        <aside className="w-[280px] border-r border-white/10 bg-gradient-to-b from-[#0B1227] to-[#060C1E] p-6 hidden md:block">
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <img src={Logo} alt="" className="h-9 w-9" />
              <h1 className="text-xl font-secondary font-semibold">
                Risk <span className="text-[#10B981]">Analysis Map</span>
              </h1>
            </div>
            <p
              className="mt-1 text-sm text-gray-400 font-primary truncate"
              title={repoUrl}
            >
              {repoUrl || "Repository"}
            </p>
          </div>

          <div className="space-y-3 text-sm mb-8">
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

          <div className="text-sm space-y-2 mb-8">
            <div className="flex justify-between">
              <span className="text-gray-400">Total Files</span>
              <span>{totalFiles}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Safe to Convert</span>
              <span className="text-[#10B981]">{safeFiles}</span>
            </div>
          </div>

          {/* ─── Target Language Dropdown ──────────────── */}
          <div className="border-t border-white/10 pt-6">
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">
              Target Language
            </label>
            <select
              value={targetLanguage}
              onChange={(e) => {
                const val = e.target.value as "go" | "kotlin" | "";
                setTargetLanguage(val);
                cachedTargetLanguage = val;
              }}
              disabled={languageLocked}
              className={`w-full rounded-lg border px-3 py-2 text-sm bg-[#0B1227] focus:outline-none focus:ring-2 focus:ring-[#10B981] ${
                languageLocked
                  ? "border-white/5 text-gray-500 cursor-not-allowed opacity-60"
                  : "border-white/10 text-white"
              }`}
            >
              <option value="">Select…</option>
              <option value="go">Go</option>
              <option value="kotlin">Kotlin</option>
            </select>
            {languageLocked && (
              <p className="mt-2 text-xs text-yellow-500/80">
                Language locked. Reparse repo to change.
              </p>
            )}
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

          {/* Converting overlay */}
          {converting && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="text-lg font-secondary text-[#10B981] animate-pulse">
                Converting…
              </div>
            </div>
          )}

          <div className="flex-1 h-full w-full overflow-hidden">
            <Graph
              graph={filteredGraph}
              analysis={analysis}
              onConvert={handleConvert}
            />
          </div>

          {/* Bottom-left buttons */}
          <div className="absolute bottom-6 left-6 flex gap-3">
            <button
              onClick={() => navigate("/")}
              className="px-8 py-3 rounded-xl bg-[#10B981] text-black font-secondary hover:brightness-110 transition"
            >
              Go Back
            </button>
            <button
              onClick={() => {
                if (!hasConvertedFiles) return;
                // Derive projectId from analysis the same way as the useEffect
                const anyFP: string = Object.values(analysis).find((v: any) => v.filePath)
                  ? (Object.values(analysis).find((v: any) => v.filePath) as any).filePath
                  : "";
                const pId = anyFP.includes("/repos/") ? anyFP.split("/repos/")[1]?.split("/")[0] : "";
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

          {/* Toast */}
          {showToast && (
            <Toast message={toastMessage} onClose={() => setShowToast(false)} />
          )}
        </main>
      </div>
    </div>
  );
}
