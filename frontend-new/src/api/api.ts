const API_BASE_URL = "http://localhost:3001/api";

export interface GraphNode {
  id: string;
  label: string;
  [key: string]: unknown;
}

export interface GraphEdge {
  source: string;
  target: string;
  [key: string]: unknown;
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface Analysis {
  [key: string]: unknown;
}

export interface AnalyzeResult {
  success: boolean;
  graph: Graph;
  analysis: Analysis;
  metrics?: Record<string, unknown>;
}

/**
 * Triggers the full pipeline: clone → parse → graph → analysis
 */
export async function analyzeRepo(repoUrl: string): Promise<AnalyzeResult> {
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
export async function fetchGraph(): Promise<Graph> {
  const response = await fetch(`${API_BASE_URL}/graph`);

  if (!response.ok) {
    throw new Error("Failed to fetch graph data");
  }

  return response.json();
}

/**
 * Fetches the risk analysis data from the backend
 */
export async function fetchAnalysis(): Promise<Analysis> {
  const response = await fetch(`${API_BASE_URL}/analysis`);

  if (!response.ok) {
    throw new Error("Failed to fetch analysis data");
  }

  return response.json();
}

export interface ConvertCodeResult {
  success: boolean;
  nodeId: string;
  originalFile: string;
  goFilename: string;
  goCode: string;
  javaSource: string;
  targetLanguage: string;
}

/**
 * Convert a Java file to Go, Kotlin, or TypeScript
 */
export async function convertCode(
  nodeId: string,
  targetLanguage: "go" | "kotlin" | "typescript" = "go",
  projectId?: string,
): Promise<ConvertCodeResult> {
  const response = await fetch(`${API_BASE_URL}/convert-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nodeId, targetLanguage, projectId }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Code conversion failed");
  }

  return data;
}

/**
 * Fetch converted files for a project
 */
export async function getConvertedFiles(projectId: string): Promise<{
  success: boolean;
  projectId: string;
  conversions: any[];
  total: number;
}> {
  const response = await fetch(
    `${API_BASE_URL}/project/${encodeURIComponent(projectId)}/converted-files`,
  );
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Failed to fetch converted files");
  }
  return data;
}

export interface MigrateResult {
  success: boolean;
  nodeId: string;
  filePath: string;
  classification: string;
  verdict: string;
  response: string;
  riskScore: number;
  convertibilityScore: number;
}

/**
 * Send a node to Backboard for migration verdict (risk assessment)
 */
export async function migrateNode(nodeId: string): Promise<MigrateResult> {
  const response = await fetch(`${API_BASE_URL}/migrate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nodeId, includeSource: true }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Migration assessment failed");
  }

  return data;
}

/**
 * Fetch raw file content from the backend (original source files)
 */
export async function fetchFileContent(filePath: string): Promise<string> {
  const response = await fetch(
    `${API_BASE_URL}/file-content?path=${encodeURIComponent(filePath)}`,
  );
  if (!response.ok) {
    throw new Error("Failed to fetch file content");
  }
  return response.text();
}
