import React, { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import { useNavigate } from "react-router-dom";

interface GraphNode {
  id: string;
  classNames?: string[];
  [key: string]: any;
}

interface GraphEdge {
  from: string;
  to: string;
  type: string;
  [key: string]: any;
}

interface AnalysisData {
  classification?: "GREEN" | "YELLOW" | "RED";
  explanation?: string;
  riskScore?: number;
  [key: string]: any;
}

interface VerdictData {
  verdict: string;
  response: string;
  riskScore: number;
}

interface GraphProps {
  graph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  analysis: Record<string, AnalysisData>;
  onConvert?: (nodeId: string) => void;
  onRequestVerdict?: (nodeId: string) => void;
  verdictData?: VerdictData | null;
  onClearVerdict?: () => void;
}

const Graph: React.FC<GraphProps> = ({
  graph,
  analysis,
  onConvert,
  onRequestVerdict,
  verdictData,
  onClearVerdict,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<any, any> | null>(null);
  const nodesRef = useRef<any[]>([]);
  const linksRef = useRef<any[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const initializedRef = useRef(false);
  const navigate = useNavigate();

  // STRUCTURE: Compute stable structure signature (topology only)
  const graphStructureKey = useMemo(() => {
    if (!graph) return "";
    const nodeIds = graph.nodes
      .map((n) => n.id)
      .sort()
      .join(",");
    const edgeIds = graph.edges
      .map((e) => `${e.from}-${e.to}`)
      .sort()
      .join(",");
    return `${nodeIds}|${edgeIds}`;
  }, [graph?.nodes, graph?.edges]);

  // INITIALIZATION: Run ONCE per unique graph structure
  useEffect(() => {
    if (!graph || !svgRef.current || !wrapperRef.current || !graphStructureKey)
      return;

    // Skip if already initialized with same structure
    if (initializedRef.current) return;
    initializedRef.current = true;

    // Clear previous graph
    d3.select(svgRef.current).selectAll("*").remove();

    const width = wrapperRef.current.clientWidth;
    const height = wrapperRef.current.clientHeight;

    const colorMap: Record<string, string> = {
      GREEN: "#4ade80",
      YELLOW: "#fb923c",
      RED: "#ef4444",
    };

    // Process data - store in refs for updates
    nodesRef.current = graph.nodes.map((node) => ({
      ...node,
      classification: analysis[node.id]?.classification || "GREEN",
    }));

    linksRef.current = graph.edges.map((edge) => ({
      ...edge,
      source: edge.from,
      target: edge.to,
    }));

    // Identify neighbors for highlighting
    const linkedByIndex: Record<string, boolean> = {};
    linksRef.current.forEach((d) => {
      linkedByIndex[`${d.source},${d.target}`] = true;
    });

    function isConnected(a: any, b: any) {
      return (
        linkedByIndex[`${a.id},${b.id}`] ||
        linkedByIndex[`${b.id},${a.id}`] ||
        a.id === b.id
      );
    }

    // Setup simulation
    const simulation = d3
      .forceSimulation(nodesRef.current as any)
      .force(
        "link",
        d3
          .forceLink(linksRef.current)
          .id((d: any) => d.id)
          .distance(150),
      )
      .force("charge", d3.forceManyBody().strength(-500))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(50).iterations(2))
      .force("x", d3.forceX(width / 2).strength(0.05))
      .force("y", d3.forceY(height / 2).strength(0.05));

    simulationRef.current = simulation;

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .style("font-family", "sans-serif");

    // Arrow marker (visually disabled - direction encoded via color)
    svg
      .append("defs")
      .selectAll("marker")
      .data(["end"])
      .join("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 20)
      .attr("refY", 0)
      .attr("markerWidth", 0) // Size = 0 to hide arrow
      .attr("markerHeight", 0)
      .attr("opacity", 0) // Opacity = 0 for complete invisibility
      .attr("orient", "auto")
      .append("path")
      .attr("fill", "transparent")
      .attr("d", "M0,-5L10,0L0,5");

    const g = svg.append("g");

    // Zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Render links (direction encoded via color, not arrows)
    const link = g
      .append("g")
      .selectAll("line")
      .data(linksRef.current)
      .join("line")
      .attr("stroke", "#64748b") // Neutral slate color when no node selected
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", 2)
      .style("transition", "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"); // Smooth animations

    // Render nodes
    const node = g
      .append("g")
      .selectAll("g")
      .data(nodesRef.current)
      .join("g")
      .call(
        d3
          .drag<any, any>()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended),
      );

    // Node circles
    node
      .append("circle")
      .attr("r", 8)
      .attr("fill", (d: any) => colorMap[d.classification] || "#94a3b8")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .style("transition", "all 0.2s ease-in-out"); // Smooth node animations

    // Node labels
    node
      .append("text")
      .attr("x", 12)
      .attr("y", 4)
      .text((d: any) => d.classNames?.[0] || d.id)
      .attr("font-size", "10px")
      .attr("fill", "#cbd5e1")
      .style("pointer-events", "none");

    // Hover interactions with animated edge highlighting
    node
      .on("mouseover", function (_event, d: any) {
        // Dim non-connected nodes
        node.style("opacity", (o: any) => (isConnected(d, o) ? 1 : 0.1));

        // Enhanced edge coloring on hover
        link
          .attr("stroke-opacity", (o: any) => {
            if (o.source.id === d.id || o.target.id === d.id) {
              return 1;
            }
            return 0.05;
          })
          .attr("stroke", (o: any) => {
            // Fan-IN edges (dependencies flowing into hovered node) - Bright Blue/Cyan
            if (o.target.id === d.id) {
              return "#22d3ee"; // Cyan-400 - glowing teal
            }
            // Fan-OUT edges (dependencies flowing out from hovered node) - Purple/Magenta
            if (o.source.id === d.id) {
              return "#a78bfa"; // Violet-400 - glowing purple
            }
            return "#64748b"; // Neutral gray for others
          })
          .attr("stroke-width", (o: any) => {
            if (o.source.id === d.id || o.target.id === d.id) {
              return 3.5; // Thicker on hover
            }
            return 1.5;
          })
          .style("filter", (o: any) => {
            // Add glow effect to connected edges
            if (o.source.id === d.id || o.target.id === d.id) {
              return "drop-shadow(0 0 6px currentColor)";
            }
            return "none";
          });

        // Highlight hovered node
        d3.select(this)
          .select("circle")
          .attr("stroke", "#fff")
          .attr("stroke-width", 3)
          .style("filter", "drop-shadow(0 0 8px #10B981)");
      })
      .on("mouseout", function () {
        node.style("opacity", 1);

        // Reset edges to default or selected state
        link
          .attr("stroke-opacity", (o: any) => {
            if (selectedNode) {
              return o.source.id === selectedNode ||
                o.target.id === selectedNode
                ? 0.9
                : 0.1;
            }
            return 0.4;
          })
          .attr("stroke", (o: any) => {
            if (selectedNode) {
              if (o.target.id === selectedNode) return "#06b6d4"; // Cyan for fan-in
              if (o.source.id === selectedNode) return "#f59e0b"; // Amber for fan-out
            }
            return "#64748b"; // Neutral
          })
          .attr("stroke-width", (o: any) => {
            if (
              selectedNode &&
              (o.source.id === selectedNode || o.target.id === selectedNode)
            ) {
              return 3;
            }
            return 2;
          })
          .style("filter", "none");

        d3.select(this)
          .select("circle")
          .attr("stroke", "#fff")
          .attr("stroke-width", 1.5)
          .style("filter", "none");
      });

    // Click interaction
    node.on("click", (event, d: any) => {
      onClearVerdict?.();
      setSelectedNode(selectedNode === d.id ? null : d.id);
      event.stopPropagation();
    });

    // Background click to deselect
    svg.on("click", (event) => {
      if (event.target === svgRef.current) {
        setSelectedNode(null);
      }
    });

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      simulation.stop();
      initializedRef.current = false;
    };
  }, [graphStructureKey]); // ONLY re-run if topology changes

  // METADATA UPDATES: Update visual properties without recreating graph
  useEffect(() => {
    if (!svgRef.current || !initializedRef.current || !analysis) return;

    const colorMap: Record<string, string> = {
      GREEN: "#4ade80",
      YELLOW: "#fb923c",
      RED: "#ef4444",
    };

    // Update node colors based on current analysis
    d3.select(svgRef.current)
      .selectAll<SVGGElement, any>("g g") // Select all node groups with proper typing
      .each(function (d) {
        const nodeData = d;
        const classification =
          analysis[nodeData?.id]?.classification || "GREEN";
        const color = colorMap[classification] || "#94a3b8";
        d3.select(this).select("circle").attr("fill", color);
      });
  }, [analysis]); // Update colors when analysis changes

  // OBJECTIVE A: Edge color updates based on selected node (fan-in/fan-out)
  useEffect(() => {
    if (!svgRef.current || !initializedRef.current) return;

    const FAN_IN_COLOR = "#06b6d4"; // Cyan/Teal - dependencies flowing INTO selected node
    const FAN_OUT_COLOR = "#f59e0b"; // Amber/Orange - dependencies flowing OUT from selected node
    const NEUTRAL_COLOR = "#64748b"; // Slate - no selection

    // Update edge colors based on selected node
    d3.select(svgRef.current)
      .selectAll<SVGLineElement, any>("line")
      .attr("stroke", function (d: any) {
        if (!selectedNode) {
          return NEUTRAL_COLOR; // No selection - neutral color
        }

        // Fan-IN: edges where target = selected node (dependencies flowing IN)
        if (d.target.id === selectedNode) {
          return FAN_IN_COLOR;
        }

        // Fan-OUT: edges where source = selected node (dependencies flowing OUT)
        if (d.source.id === selectedNode) {
          return FAN_OUT_COLOR;
        }

        // Other edges - dimmed neutral
        return NEUTRAL_COLOR;
      })
      .attr("stroke-opacity", function (d: any) {
        if (!selectedNode) {
          return 0.4; // Default opacity
        }

        // Highlight fan-in/fan-out edges
        if (d.target.id === selectedNode || d.source.id === selectedNode) {
          return 0.9;
        }

        // Dim other edges
        return 0.1;
      })
      .attr("stroke-width", function (d: any) {
        if (!selectedNode) {
          return 2;
        }

        // Thicker lines for fan-in/fan-out
        if (d.target.id === selectedNode || d.source.id === selectedNode) {
          return 3;
        }

        return 1.5;
      });
  }, [selectedNode]); // Update edge colors when selection changes

  // Sidebar Data
  const selectedNodeData = selectedNode
    ? graph.nodes.find((n) => n.id === selectedNode)
    : null;
  const selectedAnalysis = selectedNode ? analysis[selectedNode] : null;

  // Helper to format keys
  const formatKey = (key: string) => {
    return key
      .replace(/([A-Z])/g, " $1") // insert space before capital letters
      .replace(/^./, (str) => str.toUpperCase()); // maximize first letter
  };

  return (
    <div className="relative w-full h-full flex overflow-hidden">
      <div ref={wrapperRef} className="flex-1 w-full h-full">
        <svg ref={svgRef} className="w-full h-full block"></svg>
      </div>

      {/* Sidebar Overlay */}
      {selectedNode && (
        <div className="absolute top-0 right-0 h-full w-96 bg-[#0B1227]/95 backdrop-blur-md border-l border-white/10 shadow-2xl transform transition-transform duration-300 ease-in-out z-20 flex flex-col">
          <div className="flex justify-between items-start p-6 pb-4 flex-none border-b border-white/5">
            <h2
              className="text-xl font-semibold text-white truncate pr-4"
              title={selectedNode}
            >
              {selectedNodeData?.classNames?.[0] || selectedNode}
            </h2>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-gray-400 hover:text-white transition"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div
            className={`${verdictData ? "flex-1 min-h-0" : "flex-1"} overflow-y-auto p-6 pt-6 space-y-6 scrollable-container`}
          >
            {/* Classification Badge */}
            <div>
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                Risk Level
              </h3>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                  selectedAnalysis?.classification === "GREEN"
                    ? "bg-green-500/10 text-green-400 border-green-500/20"
                    : selectedAnalysis?.classification === "YELLOW"
                      ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                      : "bg-red-500/10 text-red-400 border-red-500/20"
                }`}
              >
                {selectedAnalysis?.classification || "UNKNOWN"}
              </span>
            </div>

            {selectedAnalysis?.riskScore !== undefined && (
              <div>
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                  Risk Score
                </h3>
                <div className="w-full bg-gray-700/50 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      selectedAnalysis.riskScore < 30
                        ? "bg-green-500"
                        : selectedAnalysis.riskScore < 70
                          ? "bg-yellow-500"
                          : "bg-red-500"
                    }`}
                    style={{
                      width: `${Math.min(selectedAnalysis.riskScore, 100)}%`,
                    }}
                  ></div>
                </div>
                <div className="text-right text-xs text-gray-400 mt-1">
                  {selectedAnalysis.riskScore}/100
                </div>
              </div>
            )}

            {selectedAnalysis?.explanation && (
              <div>
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                  Details
                </h3>
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {selectedAnalysis.explanation}
                </p>
              </div>
            )}

            {/* Refined Sidebar Details */}
            <div className="space-y-4 pt-4 border-t border-white/10 mt-6 mb-20">
              <h3 className="text-sm font-semibold text-white mb-4">
                Properties
              </h3>

              {/* Node ID */}
              <div className="group">
                <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                  Node ID
                </div>
                <div className="text-sm text-gray-200 break-all bg-black/20 p-2 rounded border border-white/5 select-all">
                  {selectedNode}
                </div>
              </div>

              {/* Direct Analysis Properties */}
              {selectedAnalysis && (
                <>
                  {/* Risk Score & Complexity */}
                  {["riskScore", "complexityScore"].map((key) => {
                    const value = selectedAnalysis[key];
                    if (value === undefined || value === null) return null;
                    return (
                      <div key={key} className="group">
                        <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                          {formatKey(key)}
                        </div>
                        <div className="text-sm text-gray-200 break-words bg-black/20 p-2 rounded border border-white/5">
                          {String(value)}
                        </div>
                      </div>
                    );
                  })}

                  {/* Blast Radius (Object Handling) */}
                  {selectedAnalysis.blastRadius &&
                    typeof selectedAnalysis.blastRadius === "object" && (
                      <div className="group">
                        <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                          Blast Radius
                        </div>
                        <div className="bg-black/20 p-2 rounded border border-white/5 space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-400">
                              Affected Nodes:
                            </span>
                            <span className="text-gray-200">
                              {selectedAnalysis.blastRadius.affectedNodes}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-400">Total Nodes:</span>
                            <span className="text-gray-200">
                              {selectedAnalysis.blastRadius.totalNodes}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-400">Impact:</span>
                            <span className="text-[#EF4444] font-medium">
                              {selectedAnalysis.blastRadius.percentage}%
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Metrics Object - flatten and exclude filePath */}
                  {selectedAnalysis.metrics &&
                    typeof selectedAnalysis.metrics === "object" &&
                    Object.entries(selectedAnalysis.metrics)
                      .filter(([key]) => key !== "filePath")
                      .map(([key, value]) => (
                        <div key={`metric-${key}`} className="group">
                          <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                            {formatKey(key)}
                          </div>
                          <div className="text-sm text-gray-200 break-words bg-black/20 p-2 rounded border border-white/5">
                            {typeof value === "object"
                              ? JSON.stringify(value)
                              : String(value)}
                          </div>
                        </div>
                      ))}
                </>
              )}
            </div>

            <div className="border-t border-white/10 pt-4 mt-6">
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                Technical ID
              </h3>
              <code className="block bg-black/30 p-2 rounded text-xs text-gray-400 break-all select-all">
                {selectedNode}
              </code>
            </div>
          </div>
          {/* Verdict Panel */}
          {verdictData && (
            <div className="min-h-0 max-h-[40%] overflow-y-auto px-4 py-3 bg-[#0B1227] border-t border-white/10 z-30 scrollable-container">
              <div
                className={`rounded-lg p-3 border ${
                  verdictData.verdict === "SAFE"
                    ? "bg-green-500/10 border-green-500/20"
                    : verdictData.verdict === "RISKY"
                      ? "bg-red-500/10 border-red-500/20"
                      : "bg-amber-500/10 border-amber-500/20"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      verdictData.verdict === "SAFE"
                        ? "bg-green-400"
                        : verdictData.verdict === "RISKY"
                          ? "bg-red-400"
                          : "bg-amber-400"
                    }`}
                  />
                  <span
                    className={`text-xs font-semibold uppercase tracking-wider ${
                      verdictData.verdict === "SAFE"
                        ? "text-green-400"
                        : verdictData.verdict === "RISKY"
                          ? "text-red-400"
                          : "text-amber-400"
                    }`}
                  >
                    {verdictData.verdict === "SAFE"
                      ? "Safe"
                      : verdictData.verdict === "RISKY"
                        ? "Risky"
                        : "Needs Review"}
                  </span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {verdictData.response}
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex-none p-4 bg-[#0B1227] border-t border-white/10 z-30 space-y-2">
            {!verdictData ? (
              <button
                onClick={() =>
                  onRequestVerdict &&
                  selectedNode &&
                  onRequestVerdict(selectedNode)
                }
                className="w-full py-3 rounded-lg bg-[#10B981] text-black font-semibold hover:bg-[#0ea472] transition shadow-lg shadow-green-900/20"
              >
                Analyze
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => onClearVerdict?.()}
                  className="flex-1 py-3 rounded-lg bg-gray-600 text-white font-semibold hover:bg-gray-500 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (onConvert && selectedNode) {
                      onConvert(selectedNode);
                    }
                  }}
                  className={`flex-1 py-3 rounded-lg font-semibold transition shadow-lg ${
                    verdictData.verdict === "RISKY"
                      ? "bg-red-500 text-white hover:bg-red-600 shadow-red-900/20"
                      : "bg-[#10B981] text-black hover:bg-[#0ea472] shadow-green-900/20"
                  }`}
                >
                  {verdictData.verdict === "RISKY"
                    ? "Convert Anyway"
                    : "Confirm Convert"}
                </button>
              </div>
            )}
            <button
              onClick={() =>
                selectedNode &&
                navigate(`/workflow/${encodeURIComponent(selectedNode)}`)
              }
              className="w-full py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition shadow-lg shadow-blue-900/20"
            >
              Get Workflow
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Graph;
