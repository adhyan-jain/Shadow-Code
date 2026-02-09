import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ParticlesBackground from "./components/particle_background";
import Graph from "./components/Graph";
import SearchIcon from "./assets/search.svg";
import Logo from "./assets/logo.svg";

export default function MapPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { graph, analysis, repoUrl } = location.state || {};

  const [searchTerm, setSearchTerm] = useState("");

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
  
  // Filter nodes for search (Graph component might need to handle this or we filter data passed to it)
  // For now, we'll just pass all data as the Graph component in old frontend didn't have search prop.
  // We can implement search later if needed or if Graph component supports it.

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
            <p className="mt-1 text-sm text-gray-400 font-primary truncate" title={repoUrl}>
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

        <main className="flex-1 relative flex flex-col">
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 lg:w-[700px] md:w-[450px] sm:w-[300px]">
             {/* Search bar - functional or just visual for now since Graph handles rendering */}
            <div className="relative">
              <img
                src={SearchIcon}
                alt=""
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-70"
              />
              <input
                placeholder="Search files (visual only)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl bg-[#0B1227]/90 border border-white/10 pl-10 pr-4 py-3 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
              />
            </div>
          </div>

          <div className="flex-1 h-full w-full overflow-hidden">
             <Graph graph={graph} analysis={analysis} />
          </div>

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
}
