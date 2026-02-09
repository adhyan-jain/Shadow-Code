import { useState } from "react";
import { useNavigate } from "react-router-dom";

import ConvertFilesIcon from "./assets/convertfiles.svg";
import FileIcon from "./assets/fileicon.svg";
import Logo from "./assets/logo.svg";
import ParticlesBackground from "./components/particle_background";

interface FileNode {
  nodeId: string;
  filePath: string;
  riskScore: number;
  convertibilityScore: number;
  classification: string;
  metrics: {
    fanIn: number;
    fanOut: number;
  };
}

export default function ConvertFiles() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<FileNode[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // useEffect(() => {
  //   const loadFiles = async () => {
  //     const analysisModule = await import("./analysis.json");
  //     const analysis = analysisModule.default as Record<string, FileNode>;

  //     const greenFiles = Object.values(analysis)
  //       .filter((f) => f.classification === "GREEN")
  //       .sort((a, b) => a.riskScore - b.riskScore);

  //     setFiles(greenFiles);
  //     setLoading(false);
  //   };

  //   loadFiles();
  // }, []);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060C1E] flex items-center justify-center text-white font-primary">
        Loading files…
      </div>
    );
  }

  const convertEnabled = selected.size > 0;

  return (
    <div className="min-h-screen bg-[#060C1E] px-4 sm:px-6 lg:px-10 py-6 sm:py-8 text-white font-primary">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 text-lg font-semibold font-secondary">
          <img src={Logo} alt="" className="h-9 w-9 shrink-0" />
          <span>
            <span className="text-[#10B981]">Shadow</span>Code
          </span>
        </div>
        <div className="fixed inset-0 z-0 w-full h-full min-h-screen pointer-events-none">
          <ParticlesBackground />
        </div>

        <button
          onClick={() => navigate("/conversion")}
          disabled={!convertEnabled}
          className={`px-8 py-2.5 rounded-md text-sm font-secondary transition self-start sm:self-auto ${
            convertEnabled
              ? "bg-[#10B981] text-black hover:brightness-110"
              : "bg-gray-500 text-gray-300 cursor-not-allowed"
          }`}
        >
          Convert
        </button>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row gap-4 rounded-xl border border-[#10B981]/30 bg-gradient-to-r from-[#0B1227] to-[#060C1E] p-5 sm:p-6">
        <img src={ConvertFilesIcon} alt="" className="h-10 w-10 shrink-0" />

        <div className="flex-1">
          <h3 className="text-sm font-semibold text-white font-secondary">
            {files.length} Files Safe to Convert
          </h3>

          <p className="mt-1 text-sm text-gray-400 leading-relaxed break-words">
            These files have no risky dependencies and are safe to convert. They
            can be migrated automatically without affecting application
            behavior.
          </p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {files.map((file) => {
          const isSelected = selected.has(file.nodeId);
          const fileName = file.filePath.split("/").pop();

          return (
            <div
              key={file.nodeId}
              onClick={() => toggleSelect(file.nodeId)}
              className="cursor-pointer rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col justify-between hover:border-[#10B981]/40 transition"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <img src={FileIcon} alt="" className="h-8 w-8 shrink-0" />

                    <span className="text-sm font-medium break-words leading-snug">
                      {fileName}
                    </span>
                  </div>

                  <div
                    className={`h-3 w-3 mt-1 shrink-0 rounded-sm border transition ${
                      isSelected
                        ? "bg-[#10B981] border-[#10B981]"
                        : "bg-transparent border-gray-500"
                    }`}
                  />
                </div>

                <p className="mt-2 text-xs text-gray-400 break-all">
                  {file.filePath}
                </p>
              </div>

              <div className="mt-4 flex justify-between text-xs text-gray-300">
                <span>Risk: {file.riskScore}</span>
                <span>
                  Dependencies: {file.metrics.fanIn + file.metrics.fanOut}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-10">
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
