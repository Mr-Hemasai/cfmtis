import { create } from "zustand";
import { GraphEdge, GraphNode } from "../types";

type GraphState = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNode: GraphNode | null;
  summary: {
    victimAccount: string;
    fraudAmount: number;
    accounts: number;
    transfers: number;
    depth: number;
  } | null;
  setGraph: (payload: { nodes: GraphNode[]; edges: GraphEdge[]; summary: GraphState["summary"] }) => void;
  selectNode: (node: GraphNode | null) => void;
  markNodeFrozen: (accountId: string) => void;
};

export const useGraphStore = create<GraphState>((set) => ({
  nodes: [],
  edges: [],
  selectedNode: null,
  summary: null,
  setGraph: ({ nodes, edges, summary }) => set({ nodes, edges, summary }),
  selectNode: (selectedNode) => set({ selectedNode }),
  markNodeFrozen: (accountId) =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === accountId ? { ...node, isFrozen: true, nodeType: "Frozen" } : node
      ),
      selectedNode:
        state.selectedNode?.id === accountId
          ? { ...state.selectedNode, isFrozen: true, nodeType: "Frozen" }
          : state.selectedNode
    }))
}));
