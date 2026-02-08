import React, { useState } from "react";
import Graph from "./components/Graph";
import { analyzeRepo } from "./api/api";
import "./App.css";

const PIPELINE_STEPS = [
  { key: "clone", label: "Cloning repository" },
  { key: "parse", label: "Parsing Java AST" },
  { key: "analyze", label: "Building graph & risk analysis" },
];

function App() {
  const [repoUrl, setRepoUrl] = useState("");
  const [graph, setGraph] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pipelineStep, setPipelineStep] = useState(-1);

  async function handleAnalyze(e) {
    e.preventDefault();
    if (!repoUrl.trim()) return;

    setLoading(true);
    setError(null);
    setGraph(null);
    setAnalysis(null);
    setPipelineStep(0);

    try {
      // Simulate step progression while the single request runs
      const stepTimer1 = setTimeout(() => setPipelineStep(1), 3000);
      const stepTimer2 = setTimeout(() => setPipelineStep(2), 8000);

      const result = await analyzeRepo(repoUrl.trim());

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setPipelineStep(3); // all done

      setGraph(result.graph);
      setAnalysis(result.analysis);
    } catch (err) {
      console.error("Pipeline error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setGraph(null);
    setAnalysis(null);
    setError(null);
    setRepoUrl("");
    setPipelineStep(-1);
  }

  // ─── Landing / Input view ──────────────────────────────────
  if (!graph) {
    return (
      <div className="App">
        <div className="landing">
          <div className="landing-content">
            <h1 className="landing-title">
              <span className="logo-icon">◈</span> Shadow-Code
            </h1>
            <p className="landing-subtitle">
              Analyze Java repositories for dependency risks, circular
              dependencies, and migration complexity.
            </p>

            <form className="repo-form" onSubmit={handleAnalyze}>
              <div className="input-group">
                <input
                  type="text"
                  className="repo-input"
                  placeholder="https://github.com/user/repo.git"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="submit"
                  className="analyze-btn"
                  disabled={loading || !repoUrl.trim()}
                >
                  {loading ? "Analyzing..." : "Analyze"}
                </button>
              </div>
            </form>

            {loading && (
              <div className="pipeline-status">
                {PIPELINE_STEPS.map((step, idx) => (
                  <div
                    key={step.key}
                    className={`pipeline-step ${
                      idx < pipelineStep
                        ? "done"
                        : idx === pipelineStep
                        ? "active"
                        : ""
                    }`}
                  >
                    <span className="step-indicator">
                      {idx < pipelineStep ? "✓" : idx === pipelineStep ? "⟳" : "○"}
                    </span>
                    <span className="step-label">{step.label}</span>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="error-box">
                <strong>Error:</strong> {error}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Graph view ────────────────────────────────────────────
  return (
    <div className="App">
      <div className="header">
        <div className="header-left">
          <h1>
            <span className="logo-icon">◈</span> Shadow-Code
          </h1>
          <span className="repo-badge">{repoUrl}</span>
        </div>
        <div className="header-right">
          <div className="stats">
            <span>Nodes: {graph.nodes.length}</span>
            <span>Edges: {graph.edges.length}</span>
          </div>
          <div className="legend">
            <span className="legend-item">
              <span className="dot green"></span> Low Risk
            </span>
            <span className="legend-item">
              <span className="dot yellow"></span> Medium Risk
            </span>
            <span className="legend-item">
              <span className="dot red"></span> High Risk
            </span>
          </div>
          <button className="reset-btn" onClick={handleReset}>
            ← New Repo
          </button>
        </div>
      </div>
      <Graph graph={graph} analysis={analysis} />
    </div>
  );
}

export default App;
