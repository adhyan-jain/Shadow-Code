# analysis/risk_analyzer.py
from collections import defaultdict, deque

class RiskAnalyzer:
    def __init__(self, graph, metrics):
        self.graph = graph
        self.metrics = metrics
        self.dependency_map = defaultdict(set)        # reverse: who depends on me
        self.forward_dependency_map = defaultdict(set) # forward: who do I depend on

    def analyze(self):
        self.build_dependency_map()
        analysis = {}

        for node in self.graph["nodes"]:
            m = self.metrics[node["id"]]
            blast = self.compute_blast_radius(node["id"])
            complexity = self.compute_complexity_score(m)
            risk = self.compute_risk_score(m, blast, complexity)
            convertibility = self.compute_convertibility_score(m, blast, complexity)
            classification = self.classify(risk, blast, m, complexity)

            analysis[node["id"]] = {
                "nodeId": node["id"],
                "filePath": node["filePath"],
                "riskScore": risk,
                "complexityScore": complexity,
                "convertibilityScore": convertibility,
                "blastRadius": blast,
                "classification": classification,
                "metrics": m,
            }

        return analysis

    def build_dependency_map(self):
        for edge in self.graph["edges"]:
            self.dependency_map[edge["to"]].add(edge["from"])
            self.forward_dependency_map[edge["from"]].add(edge["to"])

    def compute_blast_radius(self, node_id):
        """Compute how many nodes are transitively affected if this node changes."""
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

    def compute_complexity_score(self, m):
        """
        Compute a standalone complexity score (0-100) based on structural indicators.
        This captures how complex and hard-to-understand a file is, independent of
        its position in the dependency graph.
        """
        score = 0

        # --- Size complexity ---
        loc = m.get("lineCount", 0)
        if loc > 500:
            score += 20
        elif loc > 300:
            score += 15
        elif loc > 150:
            score += 10
        elif loc > 50:
            score += 5

        # --- Method count complexity ---
        method_count = m.get("methodCount", 0)
        if method_count > 20:
            score += 15
        elif method_count > 10:
            score += 10
        elif method_count > 5:
            score += 5

        # --- Multiple classes in one file ---
        class_count = m.get("classCount", 0)
        if class_count > 3:
            score += 10
        elif class_count > 1:
            score += 5

        # --- Inner classes (harder to decompose) ---
        if m.get("hasInnerClasses", False):
            score += 8

        # --- Heavy imports = high coupling surface ---
        import_count = m.get("importCount", 0)
        if import_count > 20:
            score += 10
        elif import_count > 10:
            score += 5

        # --- Field count (state management) ---
        field_count = m.get("fieldCount", 0)
        if field_count > 15:
            score += 10
        elif field_count > 8:
            score += 7
        elif field_count > 3:
            score += 3

        # --- Exception handling complexity ---
        catch_blocks = m.get("catchBlockCount", 0)
        if catch_blocks > 5:
            score += 8
        elif catch_blocks > 2:
            score += 4

        # --- Generics (harder to convert across languages) ---
        if m.get("usesGenerics", False):
            score += 5

        # --- Static methods (tight coupling, no polymorphism) ---
        static_count = m.get("staticMethodCount", 0)
        if static_count > 5:
            score += 8
        elif static_count > 2:
            score += 4

        return min(100, score)

    def compute_risk_score(self, m, blast, complexity):
        """
        Compute a comprehensive risk score (0-100).
        Much stricter than before: considers coupling, complexity,
        dangerous patterns, and blast radius together.
        """
        score = 0

        # --- Fan-in: how many files depend on this (stricter thresholds) ---
        fan_in = m["fanIn"]
        if fan_in > 8:
            score += 25
        elif fan_in > 4:
            score += 18
        elif fan_in > 2:
            score += 12
        elif fan_in >= 1:
            score += 5

        # --- Fan-out: how many files this depends on ---
        fan_out = m["fanOut"]
        if fan_out > 8:
            score += 15
        elif fan_out > 4:
            score += 10
        elif fan_out > 2:
            score += 5

        # --- Circular dependencies (severe) ---
        if m["inCycle"]:
            score += 30

        # --- DB operations ---
        if m["writesToDb"]:
            score += 15
        if m["readsFromDb"]:
            score += 8

        # --- Dangerous patterns ---
        if m.get("usesReflection", False):
            score += 15  # Reflection is very hard to convert safely
        if m.get("usesThreading", False):
            score += 12  # Threading models differ across languages

        # --- Inheritance / interface coupling ---
        if m.get("hasInheritance", False):
            score += 8   # Inheritance hierarchies are migration blockers
        if m.get("implementsInterfaces", False):
            score += 5   # Interface contracts need careful mapping

        # --- Complexity contribution (up to 15 points from complexity) ---
        score += int(complexity * 0.15)

        # --- Blast radius contribution (up to 10 points) ---
        blast_pct = blast["percentage"]
        if blast_pct > 30:
            score += 10
        elif blast_pct > 15:
            score += 7
        elif blast_pct > 5:
            score += 3

        return min(100, score)

    def compute_convertibility_score(self, m, blast, complexity):
        """
        Compute how easy this file is to safely convert/migrate (0-100).
        Lower = harder to convert. Much stricter deductions.
        """
        score = 100

        # --- Circular dependency (major blocker) ---
        if m["inCycle"]:
            score -= 35

        # --- DB operations (require careful mapping) ---
        if m["writesToDb"]:
            score -= 20
        if m["readsFromDb"]:
            score -= 10

        # --- Fan-in penalty (many dependents = risky to change) ---
        fan_in = m["fanIn"]
        if fan_in > 8:
            score -= 25
        elif fan_in > 4:
            score -= 18
        elif fan_in > 2:
            score -= 12
        elif fan_in >= 1:
            score -= 5

        # --- Fan-out penalty ---
        fan_out = m["fanOut"]
        if fan_out > 8:
            score -= 15
        elif fan_out > 4:
            score -= 10
        elif fan_out > 2:
            score -= 5

        # --- Dangerous / hard-to-convert patterns ---
        if m.get("usesReflection", False):
            score -= 20  # Reflection has no clean equivalent in many languages
        if m.get("usesThreading", False):
            score -= 15  # Threading models are platform-specific
        if m.get("usesStreams", False):
            score -= 5   # Java streams have subtle semantics
        if m.get("usesGenerics", False):
            score -= 8   # Generics differ across languages

        # --- Structural complexity ---
        if m.get("hasInheritance", False):
            score -= 10
        if m.get("implementsInterfaces", False):
            score -= 5
        if m.get("hasInnerClasses", False):
            score -= 10
        if m.get("throwsExceptions", False):
            score -= 5

        # --- Size penalty ---
        loc = m.get("lineCount", 0)
        if loc > 500:
            score -= 15
        elif loc > 300:
            score -= 10
        elif loc > 150:
            score -= 5

        # --- Method count penalty ---
        method_count = m.get("methodCount", 0)
        if method_count > 20:
            score -= 10
        elif method_count > 10:
            score -= 5

        # --- Field count penalty (state complexity) ---
        field_count = m.get("fieldCount", 0)
        if field_count > 10:
            score -= 8
        elif field_count > 5:
            score -= 4

        # --- Blast radius penalty ---
        blast_pct = blast["percentage"]
        if blast_pct > 30:
            score -= 10
        elif blast_pct > 15:
            score -= 5

        return max(0, score)

    def classify(self, risk, blast, m, complexity):
        """
        Stricter classification logic. Files must prove they're safe to be GREEN.
        
        RED: Any one severe indicator, or combined moderate indicators
        YELLOW: Moderate risk or any non-trivial complexity
        GREEN: Only truly simple, isolated, low-risk files
        """
        # --- Immediate RED triggers ---
        if m["inCycle"]:
            return "RED"
        if risk >= 50:
            return "RED"
        if blast["percentage"] >= 40:
            return "RED"
        if m.get("usesReflection", False):
            return "RED"
        if m.get("usesThreading", False) and m["fanIn"] > 2:
            return "RED"
        if m["writesToDb"] and m["fanIn"] > 3:
            return "RED"

        # --- Combined RED: multiple moderate signals ---
        red_signals = 0
        if risk >= 35:
            red_signals += 1
        if blast["percentage"] >= 25:
            red_signals += 1
        if complexity >= 40:
            red_signals += 1
        if m.get("hasInheritance", False) and m.get("hasInnerClasses", False):
            red_signals += 1
        if m["fanIn"] > 4 and m["fanOut"] > 4:
            red_signals += 1
        if red_signals >= 2:
            return "RED"

        # --- YELLOW triggers (broader net) ---
        if risk >= 25:
            return "YELLOW"
        if blast["percentage"] >= 10:
            return "YELLOW"
        if complexity >= 30:
            return "YELLOW"
        if m.get("usesThreading", False):
            return "YELLOW"
        if m.get("hasInheritance", False):
            return "YELLOW"
        if m.get("hasInnerClasses", False):
            return "YELLOW"
        if m["writesToDb"]:
            return "YELLOW"
        if m["fanIn"] > 2 or m["fanOut"] > 3:
            return "YELLOW"
        if m.get("lineCount", 0) > 200:
            return "YELLOW"
        if m.get("methodCount", 0) > 8:
            return "YELLOW"
        if m.get("usesGenerics", False) and m.get("importCount", 0) > 10:
            return "YELLOW"

        # --- GREEN: only truly simple, isolated files ---
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
