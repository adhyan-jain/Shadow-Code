import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface GraphNode {
  id: string;
  classNames?: string[];
  [key: string]: any;
}

interface GraphEdge {
  from: string;
  to: string;
  type: string;
  [key: string]: any;
}

interface AnalysisData {
  classification?: 'GREEN' | 'YELLOW' | 'RED';
  explanation?: string;
  riskScore?: number;
  [key: string]: any;
}

interface GraphProps {
  graph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  analysis: Record<string, AnalysisData>;
}

const Graph: React.FC<GraphProps> = ({ graph, analysis }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  useEffect(() => {
    if (!graph || !analysis || !svgRef.current || !wrapperRef.current) return;

    // Clear previous graph
    d3.select(svgRef.current).selectAll("*").remove();

    const width = wrapperRef.current.clientWidth;
    const height = wrapperRef.current.clientHeight;

    const colorMap: Record<string, string> = {
      GREEN: '#4ade80',
      YELLOW: '#fb923c',
      RED: '#ef4444',
    };

    // Process data
    const nodes = graph.nodes.map(node => ({
      ...node,
      classification: analysis[node.id]?.classification || 'GREEN'
    }));
    


    const links = graph.edges.map(edge => ({
      ...edge,
      source: edge.from,
      target: edge.to
    }));

    // Identify neighbors for highlighting
    const linkedByIndex: Record<string, boolean> = {};
    links.forEach(d => {
      linkedByIndex[`${d.source},${d.target}`] = true;
    });

    function isConnected(a: any, b: any) {
      return linkedByIndex[`${a.id},${b.id}`] || linkedByIndex[`${b.id},${a.id}`] || a.id === b.id;
    }

    // Setup simulation
    const simulation = d3.forceSimulation(nodes as any)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(30));

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .style("font-family", "sans-serif");

    // Add arrow marker
    svg.append("defs").selectAll("marker")
      .data(["end"])
      .join("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 20) // Adjusted for node radius
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("fill", "#94a3b8")
      .attr("d", "M0,-5L10,0L0,5");

    const g = svg.append("g");

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Initial transform to center if needed, or rely on forceCenter

    // Render links
    const link = g.append("g")
      .attr("stroke", "#94a3b8")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", 1.5)
      .attr("marker-end", "url(#arrow)");

    // Render nodes
    const node = g.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .call(d3.drag<any, any>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    // Node circles
    node.append("circle")
      .attr("r", 8)
      .attr("fill", (d: any) => colorMap[d.classification] || '#94a3b8')
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5);

    // Node labels
    node.append("text")
      .attr("x", 12)
      .attr("y", 4)
      .text((d: any) => d.classNames?.[0] || d.id)
      .attr("font-size", "10px")
      .attr("fill", "#cbd5e1")
      .style("pointer-events", "none");

    // Hover interactions
    node.on("mouseover", function(_event, d: any) {
      node.style("opacity", (o: any) => isConnected(d, o) ? 1 : 0.1);
      link.style("opacity", (o: any) => (o.source.id === d.id || o.target.id === d.id) ? 1 : 0.1);
      d3.select(this).select("circle").attr("stroke", "#fff").attr("stroke-width", 3);
    })
    .on("mouseout", function() {
      node.style("opacity", 1);
      link.style("opacity", 1);
      d3.select(this).select("circle").attr("stroke", "#fff").attr("stroke-width", 1.5);
    });

    // Click interaction
    node.on("click", (event, d: any) => {
      setSelectedNode(selectedNode === d.id ? null : d.id);
      event.stopPropagation(); // Prevent bg click from deselecting immediately if we add that logic
    });
    
    // Background click to deselect
    svg.on("click", (event) => {
        if (event.target === svgRef.current) {
            setSelectedNode(null);
        }
    });

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [graph, analysis]);

  // Sidebar Data
  const selectedNodeData = selectedNode ? graph.nodes.find(n => n.id === selectedNode) : null;
  const selectedAnalysis = selectedNode ? analysis[selectedNode] : null;

  return (
    <div className="relative w-full h-full flex overflow-hidden">
      <div ref={wrapperRef} className="flex-1 w-full h-full">
        <svg ref={svgRef} className="w-full h-full block"></svg>
      </div>

      {/* Sidebar Overlay */}
      {selectedNode && (
        <div className="absolute top-0 right-0 h-full w-80 bg-[#0B1227]/95 backdrop-blur-md border-l border-white/10 shadow-2xl transform transition-transform duration-300 ease-in-out p-6 overflow-y-auto z-20">
            <div className="flex justify-between items-start mb-6">
                <h2 className="text-xl font-semibold text-white truncate pr-4" title={selectedNode}>
                    {selectedNodeData?.classNames?.[0] || selectedNode}
                </h2>
                <button 
                  onClick={() => setSelectedNode(null)}
                  className="text-gray-400 hover:text-white transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
            </div>

            <div className="space-y-6">
                {/* Classification Badge */}
                <div>
                   <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Risk Level</h3>
                   <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                       selectedAnalysis?.classification === 'GREEN' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                       selectedAnalysis?.classification === 'YELLOW' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                       'bg-red-500/10 text-red-400 border-red-500/20'
                   }`}>
                       {selectedAnalysis?.classification || 'UNKNOWN'}
                   </span>
                </div>

                 {selectedAnalysis?.riskScore !== undefined && (
                    <div>
                        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Risk Score</h3>
                         <div className="w-full bg-gray-700/50 rounded-full h-2">
                            <div 
                                className={`h-2 rounded-full ${
                                    selectedAnalysis.riskScore < 30 ? 'bg-green-500' : 
                                    selectedAnalysis.riskScore < 70 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${Math.min(selectedAnalysis.riskScore, 100)}%` }}
                            ></div>
                         </div>
                         <div className="text-right text-xs text-gray-400 mt-1">{selectedAnalysis.riskScore}/100</div>
                    </div>
                )}

                {selectedAnalysis?.explanation && (
                    <div>
                        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Details</h3>
                        <p className="text-sm text-gray-300 leading-relaxed">
                            {selectedAnalysis.explanation}
                        </p>
                    </div>
                )}
                
                {/* Could add incoming/outgoing edges list here if needed */}
                 <div>
                    <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Technical ID</h3>
                    <code className="block bg-black/30 p-2 rounded text-xs text-gray-400 break-all">
                        {selectedNode}
                    </code>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Graph;
