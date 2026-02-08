import React, { useState, useEffect } from "react";
import Graph from "./components/Graph";
import { fetchGraph, fetchAnalysis } from "./api/api";
import "./App.css";

function App() {
  const [graph, setGraph] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        // Fetch both graph and analysis data
        const [graphData, analysisData] = await Promise.all([
          fetchGraph(),
          fetchAnalysis(),
        ]);

        setGraph(graphData);
        setAnalysis(analysisData);
        setError(null);
      } catch (err) {
        console.error("Error loading data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="App">
        <div className="loading">Loading graph data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="App">
        <div className="error">
          <h2>Error loading data</h2>
          <p>{error}</p>
          <p>
            Make sure the backend server is running on http://localhost:3001
          </p>
        </div>
      </div>
    );
  }

  if (!graph || !analysis) {
    return (
      <div className="App">
        <div className="error">No data available</div>
      </div>
    );
  }

  return (
    <div className="App">
      <div className="header">
        <h1>Shadow-Code Graph Viewer</h1>
        <div className="stats">
          <span>Nodes: {graph.nodes.length}</span>
          <span>Edges: {graph.edges.length}</span>
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
      <Graph graph={graph} analysis={analysis} />
    </div>
  );
}

export default App;
