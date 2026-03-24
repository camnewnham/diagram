import type { Node, Edge } from "@xyflow/react";

export type NodeShape = "rectangle" | "diamond" | "circle";

export type EdgeStyle = "default" | "straight" | "smoothstep";

export const EDGE_STYLES: EdgeStyle[] = ["default", "straight", "smoothstep"];

export const EDGE_STYLE_LABELS: Record<EdgeStyle, string> = {
  default: "Bezier",
  straight: "Straight",
  smoothstep: "Smooth Step",
};

export interface DiagramNodeData {
  label: string;
  shape: NodeShape;
  [key: string]: unknown;
}

export type DiagramNode = Node<DiagramNodeData>;
export type DiagramEdge = Edge;

export interface HistoryEntry {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}
