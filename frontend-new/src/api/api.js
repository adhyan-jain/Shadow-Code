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
