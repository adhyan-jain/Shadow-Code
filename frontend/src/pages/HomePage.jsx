import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Graph from "../components/Graph";
import { analyzeRepo, migrateNode, convertCode } from "../api/api";
import "../App.css";

const PIPELINE_STEPS = [
  { key: "clone", label: "Cloning repository" },
  { key: "parse", label: "Parsing Java AST" },
  { key: "analyze", label: "Building graph & risk analysis" },
];

function HomePage() {
  const navigate = useNavigate();
  const [repoUrl, setRepoUrl] = useState("");
  const [graph, setGraph] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pipelineStep, setPipelineStep] = useState(-1);

  // Migration state
  const [selectedNode, setSelectedNode] = useState(null);
  const [migrateLoading, setMigrateLoading] = useState(false);
  const [migrateResult, setMigrateResult] = useState(null);
  const [migrateError, setMigrateError] = useState(null);

  // Conversion state
  const [convertLoading, setConvertLoading] = useState(false);
  const [convertResult, setConvertResult] = useState(null);
  const [convertError, setConvertError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState("");
  const [lockedLanguage, setLockedLanguage] = useState(null); // locks after first conversion
  const [panelTab, setPanelTab] = useState("overview");

  async function handleAnalyze(e) {
    e.preventDefault();
    if (!repoUrl.trim()) return;

    setLoading(true);
    setError(null);
    setGraph(null);
    setAnalysis(null);
    setSelectedNode(null);
    setMigrateResult(null);
    setPipelineStep(0);

    try {
      const stepTimer1 = setTimeout(() => setPipelineStep(1), 3000);
      const stepTimer2 = setTimeout(() => setPipelineStep(2), 8000);

      const result = await analyzeRepo(repoUrl.trim());

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setPipelineStep(3);

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
    setSelectedNode(null);
    setMigrateResult(null);
    setMigrateError(null);
  }

  function handleNodeSelect(nodeId) {
    setSelectedNode(nodeId);
    setMigrateResult(null);
    setMigrateError(null);
    setConvertResult(null);
    setConvertError(null);
    setCopied(false);
    setPanelTab("overview");
  }

  async function handleMigrate() {
    if (!selectedNode) return;

    setMigrateLoading(true);
    setMigrateError(null);
    setMigrateResult(null);

    try {
      const result = await migrateNode(selectedNode, true);
      setMigrateResult(result);
    } catch (err) {
      console.error("Migration error:", err);
      setMigrateError(err.message);
    } finally {
      setMigrateLoading(false);
    }
  }

  async function handleConvert() {
    if (!selectedNode) return;

    const lang = targetLanguage || "Go";

    // First conversion: confirm language lock
    if (!lockedLanguage) {
      const confirmed = window.confirm(
        `You are about to convert to "${lang}".\n\n` +
          `This will lock "${lang}" as the target language for the entire repo. ` +
          `You will not be able to change it after this.\n\n` +
          `If you want a different language, press Cancel and change the dropdown first.`,
      );
      if (!confirmed) return;
      setLockedLanguage(lang);
    }

    setConvertLoading(true);
    setConvertError(null);
    setConvertResult(null);
    setCopied(false);

    try {
      const result = await convertCode(selectedNode, lockedLanguage || lang);
      setConvertResult(result);
    } catch (err) {
      console.error("Conversion error:", err);
      setConvertError(err.message);
    } finally {
      setConvertLoading(false);
    }
  }

  function handleCopyCode() {
    if (!convertResult?.goCode) return;
    navigator.clipboard.writeText(convertResult.goCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
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
                      {idx < pipelineStep
                        ? "✓"
                        : idx === pipelineStep
                          ? "⟳"
                          : "○"}
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

  // Helpers for selected node
  const nodeAnalysis = selectedNode ? analysis[selectedNode] : null;
  const nodeClassification = nodeAnalysis?.classification || "";
  const nodeFilePath = nodeAnalysis?.filePath || "";
  const nodeFileName = nodeFilePath.split("/").pop() || selectedNode;

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
          <div className="target-lang">
            <label htmlFor="target-lang-select">
              Target Language{lockedLanguage ? " 🔒" : ""}
            </label>
            <select
              id="target-lang-select"
              value={lockedLanguage || targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              disabled={!!lockedLanguage}
              title={
                lockedLanguage
                  ? `Locked to ${lockedLanguage} for this repo`
                  : ""
              }
            >
              <option value="" disabled>
                Select…
              </option>
              <option value="Go">Go</option>
              <option value="Kotlin">Kotlin</option>
            </select>
          </div>
          <button className="compare-btn" onClick={() => navigate("/compare")}>
            📄 Converted Files
          </button>
          <button className="reset-btn" onClick={handleReset}>
            ← New Repo
          </button>
        </div>
      </div>

      <div className="main-content">
        <div className="graph-area">
          <Graph
            graph={graph}
            analysis={analysis}
            onNodeSelect={handleNodeSelect}
            selectedNode={selectedNode}
          />
        </div>

        {/* ─── Side Panel ─────────────────────────────────── */}
        <div className={`side-panel ${selectedNode ? "open" : ""}`}>
          {selectedNode && nodeAnalysis ? (
            <>
              <div className="panel-header">
                <h3>{nodeFileName}</h3>
                <button
                  className="panel-close"
                  onClick={() => setSelectedNode(null)}
                >
                  ✕
                </button>
              </div>

              {/* Classification badge under header */}
              <div className="panel-badge-row">
                <span
                  className={`classification-badge ${nodeClassification.toLowerCase()}`}
                >
                  {nodeClassification === "GREEN"
                    ? "Safe"
                    : nodeClassification === "YELLOW"
                      ? "Caution"
                      : "Risky"}
                </span>
              </div>

              {/* Tabs */}
              <div className="panel-tabs">
                <button
                  className={`panel-tab ${panelTab === "overview" ? "active" : ""}`}
                  onClick={() => setPanelTab("overview")}
                >
                  Overview
                </button>
                <button
                  className={`panel-tab ${panelTab === "dependencies" ? "active" : ""}`}
                  onClick={() => setPanelTab("dependencies")}
                >
                  Dependencies
                </button>
              </div>

              <div className="panel-body">
                {panelTab === "overview" ? (
                  <>
                    {/* Risk Analysis heading */}
                    <h4 className="panel-section-title">Risk Analysis</h4>

                    {/* Metric cards */}
                    <div className="scores-grid">
                      <div className="score-item">
                        <span className="score-label">Line of Code</span>
                        <span className="score-value">
                          {nodeAnalysis.metrics?.lineCount ?? "—"}
                        </span>
                      </div>
                      <div className="score-item">
                        <span className="score-label">Dependencies</span>
                        <span className="score-value">
                          {nodeAnalysis.metrics?.fanOut ?? "—"}
                        </span>
                      </div>
                    </div>

                    <div className="scores-grid">
                      <div className="score-item">
                        <span className="score-label">Risk Score</span>
                        <span className="score-value">
                          {nodeAnalysis.riskScore}/100
                        </span>
                      </div>
                      <div className="score-item">
                        <span className="score-label">Complexity</span>
                        <span className="score-value">
                          {nodeAnalysis.complexityScore}/100
                        </span>
                      </div>
                    </div>

                    <div className="scores-grid">
                      <div className="score-item">
                        <span className="score-label">Convertibility</span>
                        <span className="score-value">
                          {nodeAnalysis.convertibilityScore}/100
                        </span>
                      </div>
                      <div className="score-item">
                        <span className="score-label">Blast Radius</span>
                        <span className="score-value">
                          {nodeAnalysis.blastRadius?.percentage}%
                        </span>
                      </div>
                    </div>

                    {/* Import stats */}
                    <div className="import-stats">
                      <div className="import-row">
                        <span className="import-label">Imported from</span>
                        <span className="import-value">
                          {nodeAnalysis.metrics?.fanOut ?? 0}
                        </span>
                      </div>
                      <div className="import-row">
                        <span className="import-label">Imported by</span>
                        <span className="import-value">
                          {nodeAnalysis.metrics?.fanIn ?? 0}
                        </span>
                      </div>
                    </div>

                    {/* Flags (compact) */}
                    {(nodeAnalysis.metrics?.inCycle ||
                      nodeAnalysis.metrics?.usesReflection ||
                      nodeAnalysis.metrics?.usesThreading ||
                      nodeAnalysis.metrics?.writesToDb ||
                      nodeAnalysis.metrics?.hasInheritance) && (
                      <div className="flags-section">
                        <div className="flags-list">
                          {nodeAnalysis.metrics?.inCycle && (
                            <span className="flag red">In Cycle</span>
                          )}
                          {nodeAnalysis.metrics?.usesReflection && (
                            <span className="flag red">Reflection</span>
                          )}
                          {nodeAnalysis.metrics?.usesThreading && (
                            <span className="flag red">Threading</span>
                          )}
                          {nodeAnalysis.metrics?.writesToDb && (
                            <span className="flag yellow">DB Write</span>
                          )}
                          {nodeAnalysis.metrics?.readsFromDb && (
                            <span className="flag yellow">DB Read</span>
                          )}
                          {nodeAnalysis.metrics?.hasInheritance && (
                            <span className="flag yellow">Inheritance</span>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  /* Dependencies tab */
                  <>
                    <h4 className="panel-section-title">Dependency Info</h4>
                    <div className="metrics-section">
                      <div className="metrics-list">
                        <span>Fan-In: {nodeAnalysis.metrics?.fanIn}</span>
                        <span>Fan-Out: {nodeAnalysis.metrics?.fanOut}</span>
                        <span>
                          Methods: {nodeAnalysis.metrics?.methodCount}
                        </span>
                      </div>
                    </div>
                    {nodeAnalysis.metrics?.usesGenerics && (
                      <span className="flag neutral">Generics</span>
                    )}
                    {nodeAnalysis.metrics?.usesStreams && (
                      <span className="flag neutral">Streams</span>
                    )}
                    {nodeAnalysis.metrics?.hasInnerClasses && (
                      <span className="flag neutral">Inner Classes</span>
                    )}
                    {nodeAnalysis.metrics?.usesAnnotations && (
                      <span className="flag neutral">Annotations</span>
                    )}
                  </>
                )}
              </div>

              {/* Bottom action buttons */}
              <div className="panel-actions">
                <button
                  className="action-btn convert"
                  onClick={handleConvert}
                  disabled={convertLoading}
                >
                  {convertLoading ? `Converting...` : `Convert File`}
                </button>
                <button
                  className="action-btn workflow"
                  onClick={() =>
                    navigate(
                      `/workflow?nodeId=${encodeURIComponent(selectedNode)}`,
                    )
                  }
                >
                  Get Workflow
                </button>
              </div>

              {/* Migration error */}
              {migrateError && (
                <div className="panel-footer-msg error-box">{migrateError}</div>
              )}

              {/* Conversion error */}
              {convertError && (
                <div className="panel-footer-msg error-box">{convertError}</div>
              )}

              {/* Migration result */}
              {migrateResult && (
                <div className="panel-footer-msg">
                  <div
                    className={`verdict-badge ${
                      migrateResult.verdict === "YES"
                        ? "yes"
                        : migrateResult.verdict === "NO"
                          ? "no"
                          : "unknown"
                    }`}
                  >
                    {migrateResult.verdict === "YES"
                      ? "✅ Safe to convert"
                      : migrateResult.verdict === "NO"
                        ? "❌ Do not convert"
                        : "⚠️ Review manually"}
                  </div>
                  <div className="verdict-response">
                    <pre>{migrateResult.response}</pre>
                  </div>
                </div>
              )}

              {/* Converted code output */}
              {convertResult && (
                <div className="panel-footer-msg">
                  <div className="conversion-output">
                    <div className="conversion-header">
                      <div className="conversion-title">
                        <span className="go-icon">
                          {targetLanguage === "Kotlin" ? "🟣" : "🐹"}
                        </span>
                        <span>{convertResult.goFilename}</span>
                      </div>
                      <button className="copy-btn" onClick={handleCopyCode}>
                        {copied ? "✓ Copied" : "📋 Copy"}
                      </button>
                    </div>
                    <pre className="code-block">
                      <code>{convertResult.goCode}</code>
                    </pre>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="panel-empty">
              <p>Click a node in the graph to inspect it</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default HomePage;
