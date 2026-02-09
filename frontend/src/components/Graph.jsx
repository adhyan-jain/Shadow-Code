import React, { useCallback, useRef } from "react";
import CytoscapeComponent from "react-cytoscapejs";

/**
 * Graph component - renders the dependency graph using Cytoscape.
 * Props:
 *   graph        – { nodes, edges }
 *   analysis     – { [nodeId]: analysisObj }
 *   onNodeSelect – (nodeId: string) => void
 *   selectedNode – currently selected node id (string | null)
 */
function Graph({ graph, analysis, onNodeSelect, selectedNode }) {
  const cyRef = useRef(null);

  // Transform graph and analysis into Cytoscape format
  const elements = React.useMemo(() => {
    if (!graph || !analysis) return [];

    const colorMap = {
      GREEN: "#4ade80",
      YELLOW: "#fb923c",
      RED: "#ef4444",
    };

    const nodes = graph.nodes.map((node) => {
      const nodeAnalysis = analysis[node.id] || {};
      const classification = nodeAnalysis.classification || "GREEN";

      return {
        data: {
          id: node.id,
          label: node.classNames?.[0] || node.id,
          classification,
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
        "border-width": 0,
        "border-color": "#fff",
        "transition-property": "border-width, border-color, width, height",
        "transition-duration": "0.15s",
      },
    },
    {
      selector: "node:active",
      style: {
        "overlay-opacity": 0,
      },
    },
    {
      selector: "node.selected",
      style: {
        "border-width": 3,
        "border-color": "#38bdf8",
        width: 50,
        height: 50,
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

  // Bind Cytoscape events once via cy callback
  const handleCy = useCallback(
    (cy) => {
      if (cyRef.current === cy) return;
      cyRef.current = cy;

      cy.on("tap", "node", (evt) => {
        const nodeId = evt.target.id();
        if (onNodeSelect) onNodeSelect(nodeId);
      });

      // Clicking the background deselects
      cy.on("tap", (evt) => {
        if (evt.target === cy && onNodeSelect) {
          onNodeSelect(null);
        }
      });
    },
    [onNodeSelect]
  );

  // Sync the .selected class whenever selectedNode changes
  React.useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.nodes().removeClass("selected");
    if (selectedNode) {
      cy.getElementById(selectedNode).addClass("selected");
    }
  }, [selectedNode]);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <CytoscapeComponent
        elements={elements}
        layout={layout}
        stylesheet={stylesheet}
        style={{ width: "100%", height: "100%" }}
        cy={handleCy}
      />
    </div>
  );
}

export default Graph;
