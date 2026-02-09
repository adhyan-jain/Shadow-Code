# analysis/graph_builder.py
import json
from collections import defaultdict

class GraphBuilder:
    def __init__(self, ast_data):
        self.ast_data = ast_data
        self.nodes = {}
        self.edges = []
        self.package_to_files = {}
        self.adjacency_list = defaultdict(set)

    def build(self):
        self.create_nodes()
        self.build_package_lookup()
        self.create_edges()
        self.detect_cycles()
        metrics = self.compute_metrics()

        return {
            "graph": {
                "nodes": list(self.nodes.values()),
                "edges": self.edges,
            },
            "metrics": metrics,
        }

    def create_nodes(self):
        for idx, file in enumerate(self.ast_data["files"]):
            node_id = f"file_{idx}"
            self.nodes[node_id] = {
                "id": node_id,
                "type": "FILE",
                "filePath": file["filePath"],
                "packageName": file.get("packageName", "default"),
                "classNames": file.get("classNames", []),
                "readsFromDb": file.get("readsFromDb", False),
                "writesToDb": file.get("writesToDb", False),
                "inCycle": False,
                # New metrics from enhanced parser
                "lineCount": file.get("lineCount", 0),
                "methodCount": file.get("methodCount", 0),
                "classCount": file.get("classCount", 0),
                "importCount": file.get("importCount", 0),
                "fieldCount": file.get("fieldCount", 0),
                "catchBlockCount": file.get("catchBlockCount", 0),
                "staticMethodCount": file.get("staticMethodCount", 0),
                "hasInheritance": file.get("hasInheritance", False),
                "implementsInterfaces": file.get("implementsInterfaces", False),
                "usesAnnotations": file.get("usesAnnotations", False),
                "usesReflection": file.get("usesReflection", False),
                "usesThreading": file.get("usesThreading", False),
                "usesStreams": file.get("usesStreams", False),
                "hasInnerClasses": file.get("hasInnerClasses", False),
                "throwsExceptions": file.get("throwsExceptions", False),
                "usesGenerics": file.get("usesGenerics", False),
            }

    def build_package_lookup(self):
        for node_id, node in self.nodes.items():
            pkg = node["packageName"]
            for cls in node["classNames"]:
                fq = f"{pkg}.{cls}" if pkg else cls
                self.package_to_files[fq] = node_id
                self.package_to_files[cls] = node_id
            if pkg:
                self.package_to_files[pkg] = node_id

    def resolve_import(self, import_path):
        if import_path in self.package_to_files:
            return self.package_to_files[import_path]

        parts = import_path.split(".")
        for i in range(len(parts), 0, -1):
            candidate = ".".join(parts[:i])
            if candidate in self.package_to_files:
                return self.package_to_files[candidate]

        return None

    def create_edges(self):
        for idx, file in enumerate(self.ast_data["files"]):
            from_id = f"file_{idx}"
            seen = set()

            for imp in file.get("imports", []):
                to_id = self.resolve_import(imp)
                if to_id and to_id != from_id and to_id not in seen:
                    self.edges.append({"from": from_id, "to": to_id, "type": "DEPENDS_ON"})
                    self.adjacency_list[from_id].add(to_id)
                    seen.add(to_id)

    def detect_cycles(self):
        visited = set()
        stack = set()
        in_cycle = set()

        def dfs(node, path):
            if node in stack:
                in_cycle.update(path[path.index(node):])
                return
            if node in visited:
                return
            visited.add(node)
            stack.add(node)
            for nei in self.adjacency_list[node]:
                dfs(nei, path + [nei])
            stack.remove(node)

        for node in self.nodes:
            if node not in visited:
                dfs(node, [node])

        for node_id in in_cycle:
            self.nodes[node_id]["inCycle"] = True

    def compute_metrics(self):
        fan_in = defaultdict(int)
        fan_out = defaultdict(int)

        for edge in self.edges:
            fan_out[edge["from"]] += 1
            fan_in[edge["to"]] += 1

        metrics = {}
        for node_id, node in self.nodes.items():
            metrics[node_id] = {
                "nodeId": node_id,
                "filePath": node["filePath"],
                "fanIn": fan_in[node_id],
                "fanOut": fan_out[node_id],
                "readsFromDb": node["readsFromDb"],
                "writesToDb": node["writesToDb"],
                "inCycle": node["inCycle"],
                # New metrics
                "lineCount": node["lineCount"],
                "methodCount": node["methodCount"],
                "classCount": node["classCount"],
                "importCount": node["importCount"],
                "fieldCount": node["fieldCount"],
                "catchBlockCount": node["catchBlockCount"],
                "staticMethodCount": node["staticMethodCount"],
                "hasInheritance": node["hasInheritance"],
                "implementsInterfaces": node["implementsInterfaces"],
                "usesAnnotations": node["usesAnnotations"],
                "usesReflection": node["usesReflection"],
                "usesThreading": node["usesThreading"],
                "usesStreams": node["usesStreams"],
                "hasInnerClasses": node["hasInnerClasses"],
                "throwsExceptions": node["throwsExceptions"],
                "usesGenerics": node["usesGenerics"],
                # Computed: coupling score = fanIn + fanOut
                "couplingScore": fan_in[node_id] + fan_out[node_id],
            }
        return metrics


if __name__ == "__main__":
    import os
    
    # Load AST data
    ast_path = os.path.join(os.path.dirname(__file__), ".", "ast.json")
    with open(ast_path, "r") as f:
        ast_data = json.load(f)
    
    # Build graph
    builder = GraphBuilder(ast_data)
    result = builder.build()
    
    # Save graph and metrics
    storage_dir = os.path.join(os.path.dirname(__file__), "storage")
    os.makedirs(storage_dir, exist_ok=True)
    
    graph_path = os.path.join(storage_dir, "graph.json")
    with open(graph_path, "w") as f:
        json.dump(result["graph"], f, indent=2)
    
    metrics_path = os.path.join(storage_dir, "metrics.json")
    with open(metrics_path, "w") as f:
        json.dump(result["metrics"], f, indent=2)
    
    print(f"[OK] Generated graph.json with {len(result['graph']['nodes'])} nodes and {len(result['graph']['edges'])} edges")
    print(f"[OK] Generated metrics.json with {len(result['metrics'])} entries")
