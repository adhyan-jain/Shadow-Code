import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import ParticlesBackground from "./components/particle_background";
import { useNavigate } from "react-router-dom";
import SearchIcon from "./assets/search.svg";
import Logo from "./assets/logo.svg";

interface FileNode {
  nodeId: string;
  filePath: string;
  className: string;
  riskScore: number;
  convertibilityScore: number;
  classification: string;
  blastRadius: {
    affectedNodes: number;
    totalNodes: number;
    percentage: number;
  };
  metrics: {
    fanIn: number;
    fanOut: number;
    readsFromDb: boolean;
    writesToDb: boolean;
    inCycle: boolean;
  };
  reasons: string[];
  recommendations: string[];
}

interface GraphEdge {
  from: string;
  to: string;
  type: "CALLS" | "DEPENDS_ON";
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  filePath: string;
  classification: string;
  riskScore: number;
  convertibilityScore: number;
  metrics: FileNode["metrics"];
  blastRadius: FileNode["blastRadius"];
  reasons: string[];
  recommendations: string[];
}

const InteractiveGraph: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);

  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<
    { source: string; target: string; type: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    metrics: GraphNode["metrics"];
  } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      const analysisModule = await import("./analysis.json");
      const graphModule = await import("./graph.json");

      const analysis = analysisModule.default as Record<string, FileNode>;
      const graph = graphModule.default as { edges: GraphEdge[] };

      const graphNodes: GraphNode[] = Object.values(analysis).map((f) => ({
        id: f.nodeId,
        name: f.filePath.split("/").pop() || f.className,
        filePath: f.filePath,
        classification: f.classification,
        riskScore: f.riskScore,
        convertibilityScore: f.convertibilityScore,
        metrics: f.metrics,
        blastRadius: f.blastRadius,
        reasons: f.reasons,
        recommendations: f.recommendations,
      }));

      const graphLinks = graph.edges.map((e) => ({
        source: e.from,
        target: e.to,
        type: e.type,
      }));

      setNodes(graphNodes);
      setLinks(graphLinks);
      setIsLoading(false);
    };

    loadData();
  }, []);

  const nodeColor = (c: string) =>
    c === "RED" ? "#EF4444" : c === "YELLOW" ? "#F59E0B" : "#10B981";

  useEffect(() => {
    if (!svgRef.current || isLoading) return;

    const width = 900;
    const height = 600;

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3
      .select(svgRef.current)
      .attr("viewBox", [0, 0, width, height]);

    const g = svg.append("g");

    svg.call(
      d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.5, 3])
        .on("zoom", (e) => g.attr("transform", e.transform))
    );

    const simulation = d3
      .forceSimulation(nodes as any)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d: any) => d.id)
          .distance(140)
      )
      .force("charge", d3.forceManyBody().strength(-450))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(34));

    const link = g
      .append("g")
      .selectAll("path")
      .data(links)
      .join("path")
      .attr("fill", "none")
      .attr("stroke", (d: any) => (d.type === "CALLS" ? "#3B82F6" : "#6B7280"))
      .attr("stroke-width", (d: any) => (d.type === "CALLS" ? 2.5 : 1.5))
      .attr("stroke-opacity", 0.35);

    const node = g
      .append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .call(
        d3
          .drag<any, any>()
          .on("start", (e) => {
            if (!e.active) simulation.alphaTarget(0.3).restart();
            e.subject.fx = e.subject.x;
            e.subject.fy = e.subject.y;
          })
          .on("drag", (e) => {
            e.subject.fx = e.x;
            e.subject.fy = e.y;
          })
          .on("end", (e) => {
            if (!e.active) simulation.alphaTarget(0);
            e.subject.fx = null;
            e.subject.fy = null;
          })
      );

    node
      .append("circle")
      .attr("r", (d: any) => 14 + d.riskScore / 10)
      .attr("fill", (d: any) => nodeColor(d.classification))
      .attr("stroke", "#020617")
      .attr("stroke-width", 2)
      .style("filter", "drop-shadow(0 0 6px rgba(16,185,129,0.35))");

    node
      .append("text")
      .text((d: any) => d.name)
      
      .attr("y", 24)
      .attr("text-anchor", "middle")
      .attr("fill", "#E5E7EB")
      .attr("font-size", "10px");

    node
      .style("cursor", "pointer")
      .on("mouseover", function (event: any, d: any) {
        const nodeId = d.id;
        link.attr("stroke-opacity", (l: any) =>
          l.source.id === nodeId || l.target.id === nodeId ? 1 : 0.12
        );
        node.style("opacity", (n: any) =>
          n.id === nodeId ||
          links.some(
            (ln: { source: string; target: string }) =>
              (ln.source === nodeId && ln.target === n.id) ||
              (ln.target === nodeId && ln.source === n.id)
          )
            ? 1
            : 0.25
        );
        setTooltip({
          x: event.clientX,
          y: event.clientY,
          metrics: d.metrics,
        });
      })
      .on("mouseout", function () {
        link.attr("stroke-opacity", 0.35);
        node.style("opacity", 1);
        setTooltip(null);
      });

    simulation.on("tick", () => {
      link.attr("d", (d: any) => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dr = Math.sqrt(dx * dx + dy * dy) * 1.5;
        return `M ${d.source.x},${d.source.y}
                A ${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
      });

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });
  }, [nodes, links, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#060C1E] flex items-center justify-center text-white">
        Loading graph…
      </div>
    );
  }

  const totalFiles = nodes.length;
  const safeFiles = nodes.filter((n) => n.classification === "GREEN").length;

  return (
    <div className="min-h-screen bg-[#060C1E] flex text-white relative">
      <ParticlesBackground />
      <div className="relative z-10 flex flex-1 min-w-0">
      <aside className="w-[280px] border-r border-white/10 bg-gradient-to-b from-[#0B1227] to-[#060C1E] p-6">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <img src={Logo} alt="" className="h-9 w-9" />

            <h1 className="text-xl font-secondary font-semibold">
              Risk <span className="text-[#10B981]">Analysis Map</span>
            </h1>
          </div>

          <p className="mt-1 text-sm text-gray-400 font-primary">
            github.com/username/repository
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
           <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-[#3473C5]" /> Already Converted
          </div>
        </div>

        <div className="text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-400">Total Files</span>
            <span>{totalFiles}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Safe to Convert</span>
            <span className="text-[#10B981]">{safeFiles}</span>
          </div>
        </div>
      </aside>

      <main className="flex-1 relative">
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 lg:w-[700px] md:w-[450px] sm:w-[300px]">
          <div className="relative">
            <img
              src={SearchIcon}
              alt=""
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-70"
            />

            <input
              placeholder="Search files"
              className="w-full rounded-xl bg-[#0B1227]/90 border border-white/10 pl-10 pr-4 py-3 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
            />
          </div>
        </div>

        <div className="h-full flex items-center justify-center">
          <svg ref={svgRef} className="w-full h-[600px]" />
        </div>

        {tooltip && (
          <div
            className="fixed z-20 pointer-events-none rounded-lg border border-white/20 bg-[#0B1227]/95 px-4 py-3 text-sm shadow-xl backdrop-blur"
            style={{
              left: tooltip.x + 12,
              top: tooltip.y + 12,
            }}
          >
            <div className="space-y-1.5 font-medium text-gray-300">
              <div className="flex justify-between gap-6">
                <span className="text-gray-400">Fan In</span>
                <span>{tooltip.metrics.fanIn}</span>
              </div>
              <div className="flex justify-between gap-6">
                <span className="text-gray-400">Fan Out</span>
                <span>{tooltip.metrics.fanOut}</span>
              </div>
              <div className="flex justify-between gap-6">
                <span className="text-gray-400">Read from DB</span>
                <span>{tooltip.metrics.readsFromDb ? "Yes" : "No"}</span>
              </div>
              <div className="flex justify-between gap-6">
                <span className="text-gray-400">Write to DB</span>
                <span>{tooltip.metrics.writesToDb ? "Yes" : "No"}</span>
              </div>
              <div className="flex justify-between gap-6">
                <span className="text-gray-400">In Cycle</span>
                <span>{tooltip.metrics.inCycle ? "Yes" : "No"}</span>
              </div>
            </div>
          </div>
        )}

        <div className="absolute bottom-6 right-6">
          <button
            onClick={() => navigate("/convertfiles")}
            className="px-6 py-3 rounded-xl bg-[#10B981] text-black font-secondary hover:bg-[#0ea472] transition"
          >
            View Safe Files
          </button>
        </div>
        <div className="absolute bottom-6 left-6">
          <button
            onClick={() => navigate("/")}
            className="px-8 py-3 rounded-xl bg-[#10B981] text-black font-secondary hover:brightness-110 transition"
          >
            Go Back
          </button>
        </div>
      </main>
      </div>
    </div>
  );
};

export default InteractiveGraph;
