import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../src/assets/logo.png";
import ParticlesBackground from "./components/particle_background";
import { getConvertedFiles, fetchFileContent, fetchAnalysis } from "./api/api";

interface ConversionRecord {
  node_id: string;
  original_file: string;
  converted_file: string;
  converted_file_path: string;
  target_language: string;
  converted_at: string;
  converted_code: string;
}

export default function Comparison() {
  const navigate = useNavigate();
  const location = useLocation();

  // projectId passed via navigation state from the map page
  const incomingProjectId = (location.state as any)?.projectId as
    | string
    | undefined;

  const [projectId, setProjectId] = useState<string>(incomingProjectId ?? "");
  const [conversions, setConversions] = useState<ConversionRecord[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number>(-1);
  const [originalCode, setOriginalCode] = useState<string>("");
  const [convertedCode, setConvertedCode] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingFile, setLoadingFile] = useState<boolean>(false);

  // Derive projectId from analysis if not provided via state
  useEffect(() => {
    if (projectId) return;
    fetchAnalysis()
      .then((analysis) => {
        const anyFP: string = Object.values(analysis).find(
          (v: any) => v.filePath,
        )
          ? (Object.values(analysis).find((v: any) => v.filePath) as any)
              .filePath
          : "";
        if (anyFP.includes("/repos/")) {
          const pId = anyFP.split("/repos/")[1]?.split("/")[0] ?? "";
          if (pId) setProjectId(pId);
        }
      })
      .catch(() => {
        /* no analysis available */
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  // Load converted files list once projectId is known
  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    getConvertedFiles(projectId)
      .then((data) => {
        setConversions(data.conversions);
        if (data.conversions.length > 0) {
          setSelectedIdx(0);
        }
      })
      .catch(() => setConversions([]))
      .finally(() => setLoading(false));
  }, [projectId]);

  // When selected file changes, fetch the original source and set converted code
  const loadFileContents = useCallback(
    async (idx: number) => {
      const record = conversions[idx];
      if (!record) return;
      setLoadingFile(true);
      try {
        const original = await fetchFileContent(record.original_file);
        setOriginalCode(original);
      } catch {
        setOriginalCode("// Failed to load original source");
      }
      setConvertedCode(record.converted_code);
      setLoadingFile(false);
    },
    [conversions],
  );

  useEffect(() => {
    if (selectedIdx >= 0 && conversions.length > 0) {
      loadFileContents(selectedIdx);
    }
  }, [selectedIdx, loadFileContents, conversions.length]);

  // Derive language labels from the selected conversion record
  const selectedRecord = conversions[selectedIdx] as
    | ConversionRecord
    | undefined;
  const targetLang = selectedRecord?.target_language ?? "";
  const sourceExtension = "Java";

  return (
    <div className="min-h-screen bg-[#060C1E] flex relative">
      {/* ── LEFT SIDEBAR — Dynamic file list ── */}
      <div className="w-60 bg-black/30 border-r border-white/10 p-4 hidden md:flex flex-col">
        <div className="flex items-center gap-2 mb-6">
          <img src={logo} alt="logo" className="w-8 h-8" />
        </div>

        <div className="text-sm font-mono text-white/70 space-y-1 overflow-y-auto flex-1">
          {loading ? (
            <p className="text-white/40 text-xs">Loading…</p>
          ) : conversions.length === 0 ? (
            <p className="text-white/40 text-xs">
              No converted files available
            </p>
          ) : (
            conversions.map((c, i) => {
              const ext = c.converted_file.includes(".")
                ? "." + c.converted_file.split(".").pop()
                : "";
              const baseName = c.converted_file;
              return (
                <button
                  key={c.node_id + "-" + i}
                  onClick={() => setSelectedIdx(i)}
                  className={`block w-full text-left px-2 py-1 rounded hover:text-white truncate ${
                    selectedIdx === i
                      ? "text-white bg-white/10"
                      : "text-white/60"
                  }`}
                  title={baseName}
                >
                  {baseName}
                  <span className="ml-1 text-[10px] text-white/30">
                    {ext}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 p-3 sm:p-4 md:p-5 lg:p-6 relative">
        <ParticlesBackground />

        <div className="relative z-10 flex flex-col flex-1 min-h-0">
          {/* Header */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex gap-2 items-baseline">
                <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-white">
                  Code
                </h1>
                <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-[#10B981]">
                  Comparison
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-white/50 mt-1">
                {selectedRecord
                  ? `Source: ${selectedRecord.original_file.split("/").pop()}`
                  : "Select a file from the sidebar"}
              </p>
            </div>

            {targetLang && (
              <span className="bg-white/10 px-4 py-2 rounded-full text-sm text-white">
                Converted from {sourceExtension} → {targetLang}
              </span>
            )}
          </div>

          {/* Code panes */}
          <div className="mt-6 sm:mt-8 md:mt-10 flex-1 min-h-0 h-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 md:gap-6 h-full">
              {/* Left pane — Original */}
              <div className="flex flex-col w-full min-w-0 h-full">
                <h4 className="text-base sm:text-lg md:text-xl text-white font-medium mb-2 sm:mb-3">
                  Original ({sourceExtension})
                </h4>

                <div className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-md shadow-lg overflow-hidden min-h-0">
                  <pre className="text-[10px] sm:text-[11px] md:text-xs text-white/90 font-mono whitespace-pre overflow-auto max-h-[560px]">
                    {loadingFile
                      ? "Loading…"
                      : originalCode || "// No file selected"}
                  </pre>
                </div>
              </div>

              {/* Right pane — Converted */}
              <div className="flex flex-col w-full min-w-0 h-full">
                <h4 className="text-base sm:text-lg md:text-xl text-[#10B981] font-medium mb-2 sm:mb-3">
                  Converted ({targetLang || "Language"})
                </h4>

                <div className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-md shadow-lg overflow-hidden min-h-0">
                  <pre className="text-[10px] sm:text-[11px] md:text-xs text-white/90 font-mono whitespace-pre overflow-auto max-h-[560px]">
                    {loadingFile
                      ? "Loading…"
                      : convertedCode || "// No file selected"}
                  </pre>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-6 flex justify-start">
            <button
              onClick={() => navigate("/map")}
              className="bg-[#10B981] px-4 py-2 rounded-lg font-medium hover:bg-[#0d9668]"
            >
              Back to Map
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
