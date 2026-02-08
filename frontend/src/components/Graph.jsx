import React from "react";
import CytoscapeComponent from "react-cytoscapejs";

/**
 * Graph component - renders the dependency graph using Cytoscape
 */
function Graph({ graph, analysis }) {
  // Transform graph and analysis into Cytoscape format
  const elements = React.useMemo(() => {
    if (!graph || !analysis) return [];

    const nodes = graph.nodes.map((node) => {
      const nodeAnalysis = analysis[node.id] || {};
      const classification = nodeAnalysis.classification || "GREEN";

      // Map classification to color
      const colorMap = {
        GREEN: "#4ade80",
        YELLOW: "#fb923c",
        RED: "#ef4444",
      };

      return {
        data: {
          id: node.id,
          label: node.classNames?.[0] || node.id,
        },
        style: {
          "background-color": colorMap[classification],
          label: node.classNames?.[0] || node.id,
          color: "#000",
          "text-halign": "center",
          "text-valign": "center",
          "font-size": "10px",
        },
      };
    });

    const edges = graph.edges.map((edge, index) => ({
      data: {
        id: `edge-${index}`,
        source: edge.from,
        target: edge.to,
      },
      style: {
        "line-color": "#94a3b8",
        "target-arrow-color": "#94a3b8",
        "target-arrow-shape": "triangle",
        "curve-style": "bezier",
      },
    }));

    return [...nodes, ...edges];
  }, [graph, analysis]);

  const layout = {
    name: "breadthfirst",
    directed: true,
    spacingFactor: 1.5,
    animate: false,
  };

  const stylesheet = [
    {
      selector: "node",
      style: {
        width: 40,
        height: 40,
        "font-size": "10px",
        "text-wrap": "wrap",
        "text-max-width": "80px",
      },
    },
    {
      selector: "edge",
      style: {
        width: 2,
        "line-color": "#94a3b8",
        "target-arrow-color": "#94a3b8",
        "target-arrow-shape": "triangle",
        "curve-style": "bezier",
      },
    },
  ];

  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <CytoscapeComponent
        elements={elements}
        layout={layout}
        stylesheet={stylesheet}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}

export default Graph;
