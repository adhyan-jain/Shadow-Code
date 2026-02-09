import HomeImage from "../src/assets/logo.svg";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ParticlesBackground from "./components/particle_background";
import { analyzeRepo } from "./api/api";
import { clearMapCache } from "./map_page";

const PIPELINE_STEPS = [
  { key: "clone", label: "Cloning repository" },
  { key: "parse", label: "Parsing Java AST" },
  { key: "analyze", label: "Building graph & risk analysis" },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [repoUrl, setRepoUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(-1);

  const handleAnalyze = async () => {
    if (!repoUrl.trim()) {
      setError("Please enter the repository URL");
      return;
    }

    setLoading(true);
    setError("");
    setPipelineStep(0);

    // Clear any cached map state from previous session
    clearMapCache();

    try {
      const result = await analyzeRepo(repoUrl.trim());
      setPipelineStep(3); // all done

      // Navigate to map page with the analysis results
      navigate("/map", {
        state: { graph: result.graph, analysis: result.analysis, repoUrl },
      });
    } catch (err) {
      console.error("Pipeline error:", err);
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060C1E] overflow-hidden">
      <div className="fixed inset-0 z-0 w-full h-full min-h-screen">
        <ParticlesBackground />
      </div>
      <div className="relative z-10">
        <div className="flex justify-center">
          <img
            className="mt-[50px] lg:h-[180px] sm:h-[100px]"
            src={HomeImage}
            alt="Home"
          />
        </div>

        <div className="flex gap-2 justify-center">
          <h1 className="md:text-2xl lg:text-6xl text-white">CODE</h1>
          <h1 className="md:text-2xl lg:text-6xl text-[#10B981]">CONVERTOR</h1>
        </div>

        <div className="flex justify-center">
          <h4 className="mt-4 md:text-lg lg:text-xl text-white">
            System-Aware Legacy Code Migration
          </h4>
        </div>

        <div className="flex justify-center">
          <div className="mt-[30px] w-full max-w-xl rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-8 shadow-[0_0_60px_rgba(16,185,129,0.15)]">
            <label className="block text-sm text-gray-300 mb-2">
              Repository Url
            </label>

            <input
              type="text"
              placeholder="https://github.com/username/repo"
              value={repoUrl}
              onChange={(e) => {
                setRepoUrl(e.target.value);
                setError("");
              }}
              disabled={loading}
              className="w-full rounded-lg bg-[#0B1227] border border-white/10 px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#10B981] disabled:opacity-50"
            />

            {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

            <button
              className="mt-6 w-full rounded-lg bg-[#10B981] py-3 font-secondary text-black hover:bg-[#0ea472] transition disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleAnalyze}
              disabled={loading || !repoUrl.trim()}
            >
              {loading ? "Analyzing..." : "Convert Code"}
            </button>

            {loading && (
              <div className="mt-6 space-y-3">
                {PIPELINE_STEPS.map((step, idx) => (
                  <div
                    key={step.key}
                    className={`flex items-center gap-3 text-sm ${
                      idx < pipelineStep
                        ? "text-[#10B981]"
                        : idx === pipelineStep
                          ? "text-white"
                          : "text-gray-500"
                    }`}
                  >
                    <span className="w-5 text-center">
                      {idx < pipelineStep
                        ? "✓"
                        : idx === pipelineStep
                          ? "⟳"
                          : "○"}
                    </span>
                    <span>{step.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
