import { create } from "zustand";
import { GraphEdge, GraphNode } from "../types";

type GraphState = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNode: GraphNode | null;
  selectedEdge: GraphEdge | null;
  summary: {
    victimAccount: string;
    fraudAmount: number;
    accounts: number;
    transfers: number;
    depth: number;
  } | null;
  setGraph: (payload: { nodes: GraphNode[]; edges: GraphEdge[]; summary: GraphState["summary"] }) => void;
  selectNode: (node: GraphNode | null) => void;
  selectEdge: (edge: GraphEdge | null) => void;
  markNodeFrozen: (accountId: string) => void;
  unmarkNodeFrozen: (accountId: string) => void;
  markNodeInnocent: (accountId: string) => void;
};

export const useGraphStore = create<GraphState>((set) => ({
  nodes: [],
  edges: [],
  selectedNode: null,
  selectedEdge: null,
  summary: null,
  setGraph: ({ nodes, edges, summary }) => set({ nodes, edges, summary, selectedNode: null, selectedEdge: null }),
  selectNode: (selectedNode) => set({ selectedNode, selectedEdge: null }),
  selectEdge: (selectedEdge) => set({ selectedEdge, selectedNode: null }),
  markNodeFrozen: (accountId) =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === accountId ? { ...node, isFrozen: true, nodeType: "Frozen" } : node
      ),
      selectedNode:
        state.selectedNode?.id === accountId
          ? { ...state.selectedNode, isFrozen: true, nodeType: "Frozen" }
          : state.selectedNode
    })),
  unmarkNodeFrozen: (accountId) =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === accountId ? { ...node, isFrozen: false, nodeType: "Suspect" } : node
      ),
      selectedNode:
        state.selectedNode?.id === accountId
          ? { ...state.selectedNode, isFrozen: false, nodeType: "Suspect" }
          : state.selectedNode
    })),
  markNodeInnocent: (accountId) =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === accountId
          ? { ...node, nodeType: "Recovered", riskLevel: "LOW", riskScore: Math.min(node.riskScore, 15) }
          : node
      ),
      selectedNode:
        state.selectedNode?.id === accountId
          ? {
              ...state.selectedNode,
              nodeType: "Recovered",
              riskLevel: "LOW",
              riskScore: Math.min(state.selectedNode.riskScore, 15)
            }
          : state.selectedNode
    }))
}));
