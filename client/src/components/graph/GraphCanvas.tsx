import { useGraph } from "../../hooks/useGraph";
import { useGraphStore } from "../../store/graphStore";
import { GraphEdge, GraphNode } from "../../types";

export const GraphCanvas = ({
  nodes: overrideNodes,
  edges: overrideEdges
}: {
  nodes?: GraphNode[];
  edges?: GraphEdge[];
} = {}) => {
  const storeNodes = useGraphStore((state) => state.nodes);
  const storeEdges = useGraphStore((state) => state.edges);
  const selectNode = useGraphStore((state) => state.selectNode);
  const selectEdge = useGraphStore((state) => state.selectEdge);
  const ref = useGraph({
    nodes: overrideNodes ?? storeNodes,
    edges: overrideEdges ?? storeEdges,
    onSelectNode: selectNode,
    onSelectEdge: selectEdge
  });

  return <svg ref={ref} className="h-full min-h-[820px] w-full rounded-[12px] border border-border bg-[#fbfdff]" />;
};
