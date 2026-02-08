# analysis/risk_analyzer.py
from collections import defaultdict, deque

class RiskAnalyzer:
    def __init__(self, graph, metrics):
        self.graph = graph
        self.metrics = metrics
        self.dependency_map = defaultdict(set)

    def analyze(self):
        self.build_dependency_map()
        analysis = {}

        for node in self.graph["nodes"]:
            m = self.metrics[node["id"]]
            blast = self.compute_blast_radius(node["id"])
            risk = self.compute_risk_score(m)
            convertibility = self.compute_convertibility_score(m)
            classification = self.classify(risk, blast, m)

            analysis[node["id"]] = {
                "nodeId": node["id"],
                "filePath": node["filePath"],
                "riskScore": risk,
                "convertibilityScore": convertibility,
                "blastRadius": blast,
                "classification": classification,
                "metrics": m,
            }

        return analysis

    def build_dependency_map(self):
        for edge in self.graph["edges"]:
            self.dependency_map[edge["to"]].add(edge["from"])

    def compute_blast_radius(self, node_id):
        visited = set()
        q = deque([node_id])

        while q:
            cur = q.popleft()
            for dep in self.dependency_map[cur]:
                if dep not in visited:
                    visited.add(dep)
                    q.append(dep)

        total = len(self.graph["nodes"])
        return {
            "affectedNodes": len(visited),
            "totalNodes": total,
            "percentage": round((len(visited) / total) * 100, 2) if total else 0
        }

    def compute_risk_score(self, m):
        score = 0
        if m["fanIn"] > 10: score += 30
        elif m["fanIn"] > 5: score += 20
        elif m["fanIn"] > 2: score += 10

        if m["fanOut"] > 10: score += 15
        elif m["fanOut"] > 5: score += 10

        if m["inCycle"]: score += 40
        if m["writesToDb"]: score += 20
        if m["readsFromDb"]: score += 5

        return min(100, score)

    def compute_convertibility_score(self, m):
        score = 100
        if m["inCycle"]: score -= 50
        if m["writesToDb"]: score -= 25
        if m["fanIn"] > 10: score -= 20
        elif m["fanIn"] > 5: score -= 10
        if m["fanOut"] > 10: score -= 15
        elif m["fanOut"] > 5: score -= 8
        if m["readsFromDb"]: score -= 5
        return max(0, score)

    def classify(self, risk, blast, m):
        if m["inCycle"] or risk >= 60 or blast["percentage"] >= 50:
            return "RED"
        if risk >= 30 or blast["percentage"] >= 20:
            return "YELLOW"
        return "GREEN"


if __name__ == "__main__":
    import json
    import os
    
    # Load graph and metrics
    storage_dir = os.path.join(os.path.dirname(__file__), "storage")
    
    graph_path = os.path.join(storage_dir, "graph.json")
    with open(graph_path, "r") as f:
        graph = json.load(f)
    
    metrics_path = os.path.join(storage_dir, "metrics.json")
    with open(metrics_path, "r") as f:
        metrics = json.load(f)
    
    # Analyze risks
    analyzer = RiskAnalyzer(graph, metrics)
    analysis = analyzer.analyze()
    
    # Save analysis
    analysis_path = os.path.join(storage_dir, "analysis.json")
    with open(analysis_path, "w") as f:
        json.dump(analysis, f, indent=2)
    
    # Print summary
    classifications = {"RED": 0, "YELLOW": 0, "GREEN": 0}
    for item in analysis.values():
        classifications[item["classification"]] += 1
    
    print(f"✓ Generated analysis.json with {len(analysis)} entries")
    print(f"  - RED (high risk): {classifications['RED']}")
    print(f"  - YELLOW (medium risk): {classifications['YELLOW']}")
    print(f"  - GREEN (low risk): {classifications['GREEN']}")
