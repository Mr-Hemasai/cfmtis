import { useGraph } from "../../hooks/useGraph";
import { useGraphStore } from "../../store/graphStore";

export const GraphCanvas = () => {
  const nodes = useGraphStore((state) => state.nodes);
  const edges = useGraphStore((state) => state.edges);
  const selectNode = useGraphStore((state) => state.selectNode);
  const ref = useGraph({ nodes, edges, onSelectNode: selectNode });

  return <svg ref={ref} className="h-full w-full rounded-[4px] border border-border bg-[#09111c]" />;
};
