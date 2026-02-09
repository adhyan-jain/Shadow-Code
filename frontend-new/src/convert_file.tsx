import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import ConvertFilesIcon from "./assets/convertfiles.svg";
import FileIcon from "./assets/fileicon.svg";
import Logo from "./assets/logo.svg";
import ParticlesBackground from "./components/particle_background";

interface FileNode {
  id: string;
  classNames?: string[];
  [key: string]: any;
}

export default function ConvertFiles() {
  const navigate = useNavigate();
  const location = useLocation();
  const { graph, analysis, selectedId } = location.state || {}; // repoUrl variable is unused

  const [files, setFiles] = useState<FileNode[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedId ? [selectedId] : []));

  useEffect(() => {
    if (graph && analysis) {
      const safeFiles = graph.nodes.filter((n: any) => {
        const nodeAnalysis = analysis[n.id];
        return nodeAnalysis && nodeAnalysis.classification === "GREEN";
      });
      setFiles(safeFiles);
    }
  }, [graph, analysis]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (!graph || !analysis) {
    return (
      <div className="min-h-screen bg-[#060C1E] flex items-center justify-center text-white font-primary">
        <div className="text-center">
          <p className="mb-4">No data found. Please go back to the map.</p>
          <button
            onClick={() => navigate("/map")}
            className="px-6 py-2 rounded-md bg-[#10B981] text-black text-sm font-secondary hover:brightness-110 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }


  const convertEnabled = selected.size > 0;

  return (
    <div className="min-h-screen bg-[#060C1E] px-4 sm:px-6 lg:px-10 py-6 sm:py-8 text-white font-primary relative">
      <ParticlesBackground />
      <div className="relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 text-lg font-semibold font-secondary">
            <img src={Logo} alt="" className="h-9 w-9 shrink-0" />
            <span>
              <span className="text-[#10B981]">Shadow</span>Code
            </span>
          </div>

          <button
            onClick={() => navigate("/conversion")}
            disabled={!convertEnabled}
            className={`px-8 py-2.5 rounded-md text-sm font-secondary transition self-start sm:self-auto ${convertEnabled
              ? "bg-[#10B981] text-black hover:brightness-110"
              : "bg-gray-500 text-gray-300 cursor-not-allowed"
              }`}
          >
            Convert
          </button>
        </div>

        <div className="mt-8 mb-10 border border-[#10B981]/30 bg-[#0B1227]/80 backdrop-blur-sm rounded-2xl p-8 flex items-start gap-6">
          <div className="p-3 rounded-full bg-[#10B981]/10 border border-[#10B981]/20">
            <img src={ConvertFilesIcon} alt="" className="h-6 w-6 text-[#10B981]" />
          </div>

          <div>
            <h2 className="text-xl font-medium text-white mb-2">{files.length} Files Safe to Convert</h2>
            <p className="text-gray-400 max-w-2xl leading-relaxed">
              These files have no risky dependencies and can be safely converted.
              They are isolated enough to be migrated without breaking the core architecture.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {files.map((file) => {
            const isSelected = selected.has(file.id);
            const fileName = file.classNames?.[0] || file.id.split("/").pop();
            const nodeAnalysis = analysis[file.id];
            const riskScore = nodeAnalysis?.riskScore || 0;
            // Assuming dependencies count might be in metrics or we calculate from graph. 
            // For now, checking if metrics exists, otherwise 0.
            const dependencies = nodeAnalysis?.metrics?.fanOut || 0;

            return (
              <div
                key={file.id}
                onClick={() => toggleSelect(file.id)}
                className={`cursor-pointer rounded-xl border bg-[#0B1227]/50 backdrop-blur-sm p-5 transition group relative ${isSelected ? "border-[#10B981]" : "border-white/10 hover:border-white/20"
                  }`}
              >
                {/* Checkbox */}
                <div className={`absolute top-5 right-5 w-5 h-5 rounded border flex items-center justify-center transition ${isSelected ? "bg-[#10B981] border-[#10B981]" : "bg-transparent border-gray-600 group-hover:border-gray-400"
                  }`}>
                  {isSelected && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-black" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>

                <div className="flex items-center gap-4 mb-6">
                  <div className="p-2.5 rounded-lg bg-[#10B981]/10 text-[#10B981]">
                    <img src={FileIcon} alt="" className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white truncate pr-6" title={fileName}>
                      {fileName}
                    </h3>
                    <p className="text-xs text-gray-500 truncate mt-0.5 max-w-[150px]" title={file.id}>
                      {file.id}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 mt-auto">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Risk</p>
                    <p className="text-sm font-medium text-white">{riskScore}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Dependencies</p>
                    <p className="text-sm font-medium text-white">{dependencies}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-10">
          <button
            onClick={() => navigate("/map", { state: { graph, analysis } })}
            className="px-6 py-2 rounded-md bg-[#10B981] text-black text-sm font-secondary hover:brightness-110 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
