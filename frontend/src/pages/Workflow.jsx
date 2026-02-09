import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Graph from "../components/Graph";
import { fetchWorkflow } from "../api/api";
import "./Workflow.css";

/**
 * Workflow view: fan-in subgraph (no external intelligence)
 *
 * Shows all ancestor nodes that feed into a selected node,
 * rendered with the same Graph component as the main map page.
 * This view is read-only — no conversion or migration actions.
 */
function Workflow() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const nodeId = searchParams.get("nodeId");

  const [graph, setGraph] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(nodeId);
  const [metadata, setMetadata] = useState(null);

  useEffect(() => {
    if (!nodeId) {
      setError("No node selected. Go back to the map and select a node.");
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchWorkflow(nodeId);
        setGraph({ nodes: data.nodes, edges: data.edges });
        setAnalysis(data.analysis || {});
        setMetadata(data.metadata || {});
      } catch (err) {
        console.error("Workflow load error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [nodeId]);

  // Get info about selected node for the side panel
  const nodeAnalysis = selectedNode ? analysis?.[selectedNode] : null;
  const nodeFilePath = nodeAnalysis?.filePath || "";
  const nodeFileName = nodeFilePath.split("/").pop() || selectedNode;
  const nodeClassification = nodeAnalysis?.classification || "";

  // Find the root node label
  const rootNodeData = graph?.nodes?.find((n) => n.id === nodeId) || null;
  const rootLabel = rootNodeData?.classNames?.[0] || nodeId || "Unknown";

  return (
    <div className="workflow-page">
      {/* Header */}
      <div className="workflow-header">
        <div className="workflow-header-left">
          <button className="workflow-back-btn" onClick={() => navigate("/")}>
            ← Back to Map
          </button>
          <h1>
            <span className="logo-icon">◈</span> Workflow
          </h1>
        </div>
        <div className="workflow-header-right">
          <span className="workflow-label">
            Required files leading to <strong>{rootLabel}</strong>
          </span>
          {metadata && (
            <div className="workflow-stats">
              <span>Nodes: {metadata.total_nodes}</span>
              <span>Edges: {metadata.total_edges}</span>
            </div>
          )}
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
        </div>
      </div>

      {/* Main area */}
      <div className="workflow-main">
        {loading && (
          <div className="workflow-loading">
            <p>⟳ Loading workflow subgraph...</p>
          </div>
        )}

        {error && (
          <div className="workflow-error">
            <p className="error-box">{error}</p>
            <button className="workflow-back-btn" onClick={() => navigate("/")}>
              ← Back to Map
            </button>
          </div>
        )}

        {!loading && !error && graph && (
          <>
            <div className="graph-area">
              <Graph
                graph={graph}
                analysis={analysis}
                onNodeSelect={setSelectedNode}
                selectedNode={selectedNode}
              />
            </div>

            {/* Read-only side panel */}
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
                    {selectedNode === nodeId && (
                      <span className="workflow-root-tag">Root Node</span>
                    )}
                  </div>

                  <div className="panel-body">
                    <h4 className="panel-section-title">Risk Analysis</h4>

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
                  </div>
                </>
              ) : (
                <div className="panel-empty">
                  <p>Click a node to inspect it</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Workflow;
