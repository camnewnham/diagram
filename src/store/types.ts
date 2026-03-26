import type { Node, Edge } from "@xyflow/react";

export type NodeShape = "rectangle" | "diamond" | "circle";

export type EdgeStyle = "default" | "straight" | "smoothstep";

export type EdgeDashStyle = "solid" | "dashed" | "dotted";
export type EdgeArrowStyle = "none" | "end" | "start" | "both";

export type TextAlign = "left" | "center" | "right";

export const EDGE_STYLES: EdgeStyle[] = ["default", "straight", "smoothstep"];

export const EDGE_STYLE_LABELS: Record<EdgeStyle, string> = {
  default: "Bezier",
  straight: "Straight",
  smoothstep: "Smooth Step",
};

export const TINT_SWATCHES = [
  { label: "None", value: "transparent" },
  { label: "Red", value: "#fca5a5" },
  { label: "Orange", value: "#fdba74" },
  { label: "Yellow", value: "#fde68a" },
  { label: "Green", value: "#86efac" },
  { label: "Teal", value: "#5eead4" },
  { label: "Blue", value: "#93c5fd" },
  { label: "Purple", value: "#c4b5fd" },
  { label: "Pink", value: "#f9a8d4" },
  { label: "Gray", value: "#d1d5db" },
];

export interface DiagramNodeData {
  label: string;
  shape: NodeShape;
  tint?: string;
  textAlign?: TextAlign;
  [key: string]: unknown;
}

export interface DiagramEdgeData {
  edgeStyle?: EdgeStyle;
  dashStyle?: EdgeDashStyle;
  arrowStyle?: EdgeArrowStyle;
  strokeWidth?: number;
  tint?: string;
  [key: string]: unknown;
}

export type DiagramNode = Node<DiagramNodeData>;
export type DiagramEdge = Edge<DiagramEdgeData>;

export interface HistoryEntry {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

export interface DefaultNodeStyle {
  shape: NodeShape;
  tint: string;
  textAlign: TextAlign;
  width?: number;
  height?: number;
}

export interface DefaultEdgeStyle {
  edgeStyle: EdgeStyle;
  dashStyle: EdgeDashStyle;
  arrowStyle: EdgeArrowStyle;
  strokeWidth: number;
  tint: string;
}
