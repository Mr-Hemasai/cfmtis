import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { GraphEdge, GraphNode } from "../types";

type UseGraphOptions = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onSelectNode: (node: GraphNode) => void;
};

const nodeColor = (type: GraphNode["nodeType"]) => {
  if (type === "Victim") return "#c86464";
  if (type === "Mule") return "#b9825a";
  if (type === "Suspect") return "#8670a6";
  if (type === "Transfer") return "#b7a069";
  if (type === "Frozen") return "#7b8794";
  return "#6f9b7f";
};

const nodeRadius = (type: GraphNode["nodeType"]) => {
  if (type === "Victim") return 26;
  if (type === "Mule") return 18;
  if (type === "Suspect") return 20;
  return 14;
};

export const useGraph = ({ nodes, edges, onSelectNode }: UseGraphOptions) => {
  const ref = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!ref.current || nodes.length === 0) return;

    const svg = d3.select(ref.current);
    const width = ref.current.clientWidth || 900;
    const height = ref.current.clientHeight || 680;
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const defs = svg.append("defs");
    defs
      .append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 18)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("fill", "#ffd600")
      .attr("d", "M0,-5L10,0L0,5");

    const viewport = svg.append("g");
    svg.call(
      d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.2, 3])
        .on("zoom", (event) => viewport.attr("transform", event.transform.toString()))
    );

    const depthMap = d3.group(
      [...nodes].sort((a, b) => a.chainDepth - b.chainDepth || b.amountReceived - a.amountReceived),
      (node) => node.chainDepth
    );
    const maxDepth = d3.max(nodes, (node) => node.chainDepth) ?? 0;
    const horizontalPadding = 140;
    const verticalPadding = 90;
    const columnWidth = maxDepth === 0 ? width / 2 : (width - horizontalPadding * 2) / Math.max(maxDepth, 1);

    const layoutNodes = nodes.map((node) => {
      const siblings = depthMap.get(node.chainDepth) ?? [node];
      const rowGap = (height - verticalPadding * 2) / Math.max(siblings.length, 1);
      const index = siblings.findIndex((candidate) => candidate.id === node.id);
      return {
        ...node,
        x: horizontalPadding + node.chainDepth * columnWidth,
        y: verticalPadding + rowGap * index + rowGap / 2
      };
    });

    const nodeLookup = new Map(layoutNodes.map((node) => [node.accountNumber, node]));
    const layoutEdges = edges
      .map((edge) => ({
        ...edge,
        sourceNode: nodeLookup.get(edge.source),
        targetNode: nodeLookup.get(edge.target)
      }))
      .filter((edge) => edge.sourceNode && edge.targetNode);

    const edgeLine = (edge: (typeof layoutEdges)[number]) => {
      const source = edge.sourceNode!;
      const target = edge.targetNode!;
      const controlOffset = Math.max((target.x - source.x) * 0.48, 44);
      return `M ${source.x} ${source.y} C ${source.x + controlOffset} ${source.y}, ${target.x - controlOffset} ${target.y}, ${target.x} ${target.y}`;
    };

    const link = viewport
      .append("g")
      .selectAll("path")
      .data(layoutEdges)
      .enter()
      .append("path")
      .attr("fill", "none")
      .attr("stroke", (edge) => (edge.amount > 20000 ? "rgba(200,100,100,0.82)" : edge.amount > 10000 ? "rgba(185,130,90,0.78)" : "rgba(183,160,105,0.72)"))
      .attr("stroke-width", (edge) => Math.max(1.2, edge.amount / 9000))
      .attr("marker-end", "url(#arrow)")
      .attr("d", edgeLine);

    const edgeLabels = viewport
      .append("g")
      .selectAll("text")
      .data(layoutEdges)
      .enter()
      .append("text")
      .attr("fill", "#92a2b5")
      .attr("font-family", "IBM Plex Mono")
      .attr("font-size", 9)
      .text((edge) => `₹${edge.amount.toLocaleString("en-IN")}`);

    const node = viewport
      .append("g")
      .selectAll("g")
      .data(layoutNodes)
      .enter()
      .append("g")
      .style("cursor", "pointer")
      .on("click", (_event, datum) => onSelectNode(datum));

    node
      .append("circle")
      .attr("r", (datum) => nodeRadius(datum.nodeType))
      .attr("fill", (datum) => nodeColor(datum.nodeType))
      .attr("stroke", "#c9d3df")
      .attr("stroke-width", 1);

    node
      .append("title")
      .text(
        (datum) =>
          `Account: ${datum.accountNumber}\nBank: ${datum.bankName}\nAmount Received: ₹${datum.amountReceived.toLocaleString(
            "en-IN"
          )}\nBalance: ₹${datum.currentBalance.toLocaleString("en-IN")}\nRisk Score: ${Math.round(
            datum.riskScore
          )}\nChain Depth: ${datum.chainDepth}\nLocation: ${datum.location ?? "Unknown"}`
      );

    node
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", 34)
      .attr("font-family", "IBM Plex Mono")
      .attr("font-size", 10)
      .attr("fill", "#dce4ee")
      .text((datum) => datum.accountNumber);

    viewport
      .append("g")
      .selectAll("text")
      .data(d3.range(maxDepth + 1))
      .enter()
      .append("text")
      .attr("x", (depth) => horizontalPadding + depth * columnWidth)
      .attr("y", 34)
      .attr("text-anchor", "middle")
      .attr("font-family", "IBM Plex Sans Condensed")
      .attr("font-size", 11)
      .attr("letter-spacing", "0.18em")
      .attr("fill", "#92a2b5")
      .text((depth) => `LEVEL ${depth}`);

    const refreshPositions = () => {
      link.attr("d", edgeLine);
      edgeLabels
        .attr("x", (edge) => ((edge.sourceNode!.x + edge.targetNode!.x) / 2) - 4)
        .attr("y", (edge) => ((edge.sourceNode!.y + edge.targetNode!.y) / 2) - 8);
      node.attr("transform", (datum: any) => `translate(${datum.x},${datum.y})`);
    };

    node.call(
      d3
        .drag<SVGGElement, any>()
        .on("drag", (event, datum) => {
          datum.x = event.x;
          datum.y = event.y;
          refreshPositions();
        })
    );

    refreshPositions();

    return () => {
      svg.on(".zoom", null);
    };
  }, [nodes, edges, onSelectNode]);

  return ref;
};
