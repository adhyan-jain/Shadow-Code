import React, { useState, useEffect } from "react";
import { getConvertedFiles } from "../api/api";
import "./Compare.css";

function Compare() {
  const [conversions, setConversions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedConversion, setSelectedConversion] = useState(null);
  const [originalCode, setOriginalCode] = useState("");
  const [convertedCode, setConvertedCode] = useState("");
  const [loadingCode, setLoadingCode] = useState(false);

  // Hardcoded project ID - in production, this would come from context/state
  const projectId = "jpetstore-6";

  useEffect(() => {
    loadConversions();
  }, []);

  const loadConversions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getConvertedFiles(projectId);
      setConversions(data.conversions || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectConversion = async (conversion) => {
    setSelectedConversion(conversion);
    setLoadingCode(true);
    setOriginalCode("");
    setConvertedCode("");

    try {
      // Fetch original file contents
      const originalResponse = await fetch(
        `http://localhost:3001/api/file-content?path=${encodeURIComponent(conversion.original_file)}`,
      );
      if (originalResponse.ok) {
        const originalText = await originalResponse.text();
        setOriginalCode(originalText);
      } else {
        setOriginalCode("// Error: Could not load original file");
      }

      // For converted code, we'll need to reconstruct it from a previous conversion
      // Since we don't store the actual converted code, we'll show a placeholder
      setConvertedCode(
        `// Converted to ${conversion.target_language}\n// File: ${conversion.converted_file}\n// Timestamp: ${conversion.converted_at}\n\n// Note: Actual converted code would be displayed here in production.\n// The conversion was completed but the code is not persisted to disk.`,
      );
    } catch (err) {
      setOriginalCode("// Error loading original code");
      setConvertedCode("// Error loading converted code");
    } finally {
      setLoadingCode(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div className="compare-container">
        <div className="loading">Loading converted files...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="compare-container">
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="compare-container">
      <header className="compare-header">
        <h1>Code Comparison</h1>
        <p className="subtitle">View converted files side-by-side</p>
      </header>

      <div className="compare-content">
        <div className="conversions-list">
          <h2>Converted Files ({conversions.length})</h2>

          {conversions.length === 0 ? (
            <div className="empty-state">
              <p>No files have been converted yet.</p>
              <p className="hint">
                Convert Java files from the main view to see them here.
              </p>
            </div>
          ) : (
            <div className="conversion-items">
              {conversions.map((conv, index) => (
                <div
                  key={index}
                  className={`conversion-item ${selectedConversion === conv ? "selected" : ""}`}
                  onClick={() => handleSelectConversion(conv)}
                >
                  <div className="conversion-info">
                    <div className="file-name">
                      {conv.original_file.split("/").pop()}
                    </div>
                    <div className="conversion-meta">
                      <span className="language-badge">
                        {conv.target_language}
                      </span>
                      <span className="arrow">→</span>
                      <span className="converted-name">
                        {conv.converted_file}
                      </span>
                    </div>
                    <div className="timestamp">
                      {formatTimestamp(conv.converted_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedConversion && (
          <div className="code-viewer">
            {loadingCode ? (
              <div className="loading-code">Loading code...</div>
            ) : (
              <div className="side-by-side">
                <div className="code-panel">
                  <div className="code-panel-header">
                    <h3>Original Java</h3>
                    <span className="file-path">
                      {selectedConversion.original_file.split("/").pop()}
                    </span>
                  </div>
                  <pre className="code-content">
                    <code>{originalCode || "// No content"}</code>
                  </pre>
                </div>

                <div className="code-panel">
                  <div className="code-panel-header">
                    <h3>Converted {selectedConversion.target_language}</h3>
                    <span className="file-path">
                      {selectedConversion.converted_file}
                    </span>
                  </div>
                  <pre className="code-content">
                    <code>{convertedCode || "// No content"}</code>
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {!selectedConversion && conversions.length > 0 && (
          <div className="code-viewer">
            <div className="no-selection">
              <p>Select a converted file to view the code comparison</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Compare;
