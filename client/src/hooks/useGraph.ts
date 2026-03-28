import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { GraphEdge, GraphNode } from "../types";

type UseGraphOptions = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onSelectNode: (node: GraphNode) => void;
  onSelectEdge: (edge: GraphEdge) => void;
};

const nodeColor = (type: GraphNode["nodeType"]) => {
  if (type === "Victim") return "#cf6a6a";
  if (type === "Mule") return "#c3904d";
  if (type === "Suspect") return "#8e79bc";
  if (type === "Transfer") return "#d0a84b";
  if (type === "Frozen") return "#8b99a7";
  return "#5d916f";
};

const nodeRadius = (type: GraphNode["nodeType"]) => {
  if (type === "Victim") return 26;
  if (type === "Mule") return 18;
  if (type === "Suspect") return 20;
  return 14;
};

const compactAccountLabel = (accountNumber: string) =>
  accountNumber.length > 14 ? `${accountNumber.slice(0, 6)}...${accountNumber.slice(-4)}` : accountNumber;

export const useGraph = ({ nodes, edges, onSelectNode, onSelectEdge }: UseGraphOptions) => {
  const ref = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!ref.current || nodes.length === 0) return;

    const svg = d3.select(ref.current);
    const baseWidth = ref.current.clientWidth || 900;
    const baseHeight = ref.current.clientHeight || 680;
    svg.selectAll("*").remove();

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
      .attr("fill", "#d7a72b")
      .attr("d", "M0,-5L10,0L0,5");

    const viewport = svg.append("g");
    svg.call(
      d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.08, 10])
        .on("zoom", (event) => viewport.attr("transform", event.transform.toString()))
    );

    const depthMap = d3.group(
      [...nodes].sort((a, b) => a.chainDepth - b.chainDepth || b.amountReceived - a.amountReceived),
      (node) => node.chainDepth
    );
    const maxDepth = d3.max(nodes, (node) => node.chainDepth) ?? 0;
    const horizontalPadding = 96;
    const verticalPadding = 104;
    const levelCount = Math.max(maxDepth + 1, 1);
    const levelGap = 120;
    const laneWidth = 180;
    const rowSpacing = 82;
    const levelTallestCount = d3.max([...depthMap.values()], (items) => items.length) ?? 1;
    const layoutWidth = Math.max(
      baseWidth,
      horizontalPadding * 2 + levelCount * laneWidth + Math.max(levelCount - 1, 0) * levelGap
    );
    const layoutHeight = Math.max(
      baseHeight,
      verticalPadding * 2 + Math.max(levelTallestCount - 1, 0) * rowSpacing + 120
    );

    svg.attr("viewBox", `0 0 ${layoutWidth} ${layoutHeight}`);

    const lane = viewport
      .append("g")
      .attr("class", "graph-lanes")
      .selectAll("g")
      .data(d3.range(levelCount))
      .enter()
      .append("g");

    lane
      .append("rect")
      .attr("x", (depth) => horizontalPadding + depth * (laneWidth + levelGap))
      .attr("y", 22)
      .attr("rx", 18)
      .attr("ry", 18)
      .attr("width", laneWidth)
      .attr("height", layoutHeight - 44)
      .attr("fill", (depth) => (depth === 0 ? "rgba(61,111,154,0.08)" : "rgba(22,48,67,0.035)"))
      .attr("stroke", (depth) => (depth === 0 ? "rgba(61,111,154,0.2)" : "rgba(22,48,67,0.08)"))
      .attr("stroke-width", 1);

    lane
      .append("text")
      .attr("x", (depth) => horizontalPadding + depth * (laneWidth + levelGap) + laneWidth / 2)
      .attr("y", 48)
      .attr("text-anchor", "middle")
      .attr("font-family", "IBM Plex Sans Condensed")
      .attr("font-size", 11)
      .attr("font-weight", 600)
      .attr("letter-spacing", "0.18em")
      .attr("fill", "#6f8192")
      .text((depth) => `LEVEL ${depth}`);

    const layoutNodes = nodes.map((node) => {
      const siblings = depthMap.get(node.chainDepth) ?? [node];
      const index = siblings.findIndex((candidate) => candidate.id === node.id);
      const levelHeight = Math.max((siblings.length - 1) * rowSpacing, 0);
      const laneX = horizontalPadding + node.chainDepth * (laneWidth + levelGap);
      const startY = verticalPadding + (layoutHeight - verticalPadding * 2 - levelHeight) / 2;

      return {
        ...node,
        x: laneX + laneWidth / 2,
        y: startY + index * rowSpacing
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
      const controlOffset = Math.max((target.x - source.x) * 0.42, 44);
      return `M ${source.x} ${source.y} C ${source.x + controlOffset} ${source.y}, ${target.x - controlOffset} ${target.y}, ${target.x} ${target.y}`;
    };

    const maxEdgeAmount = d3.max(layoutEdges, (edge) => edge.amount) ?? 1;
    const edgeWidth = d3.scaleLinear().domain([0, maxEdgeAmount]).range([1.2, 6]).clamp(true);
    const showEdgeLabels = layoutEdges.length <= 14;

    const link = viewport
      .append("g")
      .selectAll("path")
      .data(layoutEdges)
      .enter()
      .append("path")
      .style("cursor", "pointer")
      .attr("fill", "none")
      .attr("stroke", (edge) =>
        edge.amount > maxEdgeAmount * 0.7
          ? "rgba(207,106,106,0.68)"
          : edge.amount > maxEdgeAmount * 0.35
            ? "rgba(195,144,77,0.58)"
            : "rgba(163,133,69,0.38)"
      )
      .attr("stroke-width", (edge) => edgeWidth(edge.amount))
      .attr("stroke-linecap", "round")
      .attr("opacity", 0.88)
      .attr("marker-end", "url(#arrow)")
      .attr("d", edgeLine)
      .on("click", (event, datum) => {
        event.stopPropagation();
        onSelectEdge(datum);
      });

    const edgeLabels = viewport
      .append("g")
      .selectAll("text")
      .data(layoutEdges)
      .enter()
      .append("text")
      .attr("fill", "#7a8d9f")
      .attr("font-family", "IBM Plex Mono")
      .attr("font-size", 9)
      .attr("display", showEdgeLabels ? "block" : "none")
      .text((edge) => `₹${Math.round(edge.amount).toLocaleString("en-IN")}`);

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
      .attr("stroke", "#ffffff")
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
      .attr("fill", "#27445c")
      .text((datum) => compactAccountLabel(datum.accountNumber));

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
  }, [nodes, edges, onSelectNode, onSelectEdge]);

  return ref;
};
