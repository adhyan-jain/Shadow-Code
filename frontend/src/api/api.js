const API_BASE_URL = "http://localhost:3001/api";

/**
 * Triggers the full pipeline: clone → parse → graph → analysis
 * @param {string} repoUrl - The git repository URL to analyze
 * @returns {{ success: boolean, graph: object, analysis: object, metrics: object }}
 */
export async function analyzeRepo(repoUrl) {
  const response = await fetch(`${API_BASE_URL}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repoUrl }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.details || "Analysis failed");
  }

  return data;
}

/**
 * Send a single node to Backboard for migration verdict
 * @param {string} nodeId - The node ID to migrate
 * @param {boolean} includeSource - Whether to include source code
 * @returns {{ success, nodeId, verdict, response, classification, ... }}
 */
export async function migrateNode(nodeId, includeSource = false) {
  const response = await fetch(`${API_BASE_URL}/migrate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nodeId, includeSource }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Migration request failed");
  }

  return data;
}

/**
 * Send all GREEN nodes to Backboard for migration verdicts
 * @returns {{ success, total, results: [{ nodeId, verdict, response }] }}
 */
export async function migrateBatch() {
  const response = await fetch(`${API_BASE_URL}/migrate/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Batch migration failed");
  }

  return data;
}

/**
 * Convert a Java file to Go via Gemini
 * @param {string} nodeId - The node ID to convert
 * @returns {{ success, nodeId, originalFile, goFilename, goCode, javaSource }}
 */
export async function convertCode(nodeId) {
  const response = await fetch(`${API_BASE_URL}/convert-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nodeId }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Code conversion failed");
  }

  return data;
}

/**
 * Fetches the dependency graph from the backend
 */
export async function fetchGraph() {
  const response = await fetch(`${API_BASE_URL}/graph`);

  if (!response.ok) {
    throw new Error("Failed to fetch graph data");
  }

  return response.json();
}

/**
 * Fetches the risk analysis data from the backend
 */
export async function fetchAnalysis() {
  const response = await fetch(`${API_BASE_URL}/analysis`);

  if (!response.ok) {
    throw new Error("Failed to fetch analysis data");
  }

  return response.json();
}
