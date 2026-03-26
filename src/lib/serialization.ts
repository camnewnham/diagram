import { encode, decode } from "@msgpack/msgpack";
import { deflateSync, inflateSync } from "fflate";
import type {
  DiagramNode,
  DiagramEdge,
  DefaultNodeStyle,
  DefaultEdgeStyle,
} from "@/store/types";
import { SHAPE_SIZES } from "@/store/use-diagram-store";

// ─── Enum lookup tables ───────────────────────────────────────────────────────
const SHAPES = ["rectangle", "diamond", "circle"] as const;
const EDGE_STYLES = ["default", "straight", "smoothstep"] as const;
const DASH_STYLES = ["solid", "dashed", "dotted"] as const;
const ARROW_STYLES = ["none", "end", "start", "both"] as const;
const TEXT_ALIGNS = ["left", "center", "right"] as const;
// handle id → index; covers all 8 handle ids used by diagram-node.tsx
const HANDLES = [
  "top-source", "right-source", "bottom-source", "left-source",
  "top-target", "right-target", "bottom-target", "left-target",
] as const;

type ValueOf<T extends readonly unknown[]> = T[number];

function encEnum<T extends readonly string[]>(arr: T, val: string): number {
  const idx = (arr as readonly string[]).indexOf(val);
  return idx >= 0 ? idx : 0;
}
function decEnum<T extends readonly string[]>(arr: T, idx: unknown): ValueOf<T> {
  const i = typeof idx === "number" ? idx : 0;
  return (arr[i] ?? arr[0]) as ValueOf<T>;
}

// ─── Hard-coded sentinel defaults ────────────────────────────────────────────
const DEFAULT_NODE: DefaultNodeStyle = {
  shape: "rectangle",
  tint: "transparent",
  textAlign: "center",
};
const DEFAULT_EDGE: DefaultEdgeStyle = {
  edgeStyle: "default",
  dashStyle: "solid",
  arrowStyle: "end",
  strokeWidth: 2,
  tint: "transparent",
};

// ─── base64url helpers ────────────────────────────────────────────────────────
function uint8ToBase64url(buf: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < buf.length; i += chunkSize) {
    binary += String.fromCharCode(...buf.subarray(i, i + chunkSize));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlToUint8(str: string): Uint8Array {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
  return buf;
}

// ─── Parse node/edge IDs ──────────────────────────────────────────────────────
function parseNodeId(id: string): number {
  return parseInt(id.replace("node-", ""), 10) || 0;
}
function parseEdgeId(id: string): number {
  return parseInt(id.replace("edge-", ""), 10) || 0;
}

// ─── Wire format types ────────────────────────────────────────────────────────
// Node tuple: [idNum, x, y, w, h, label, shape?, tint?, textAlign?]
type NodeTuple = [number, number, number, number, number, string, ...unknown[]];

// Edge tuple: [idNum, srcNum, tgtNum, srcHandle, tgtHandle, label?, edgeStyle?, dashStyle?, arrowStyle?, strokeWidth?, tint?]
type EdgeTuple = [number, number, number, number | string, number | string, ...unknown[]];

interface Payload {
  v: number;
  nd: Record<string, unknown>;
  ed: Record<string, unknown>;
  nodes: NodeTuple[];
  edges: EdgeTuple[];
}

// ─── encodeDiagram ────────────────────────────────────────────────────────────
export function encodeDiagram(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  defaultNodeStyle: DefaultNodeStyle,
  defaultEdgeStyle: DefaultEdgeStyle,
): string {
  // Encode node defaults (omit fields matching hard-coded sentinel)
  const nd: Record<string, unknown> = {};
  if (defaultNodeStyle.shape !== DEFAULT_NODE.shape) nd.s = encEnum(SHAPES, defaultNodeStyle.shape);
  if (defaultNodeStyle.tint !== DEFAULT_NODE.tint) nd.t = defaultNodeStyle.tint;
  if (defaultNodeStyle.textAlign !== DEFAULT_NODE.textAlign) nd.a = encEnum(TEXT_ALIGNS, defaultNodeStyle.textAlign);
  if (defaultNodeStyle.width !== undefined) nd.w = defaultNodeStyle.width;
  if (defaultNodeStyle.height !== undefined) nd.h = defaultNodeStyle.height;

  // Encode edge defaults
  const ed: Record<string, unknown> = {};
  if (defaultEdgeStyle.edgeStyle !== DEFAULT_EDGE.edgeStyle) ed.e = encEnum(EDGE_STYLES, defaultEdgeStyle.edgeStyle);
  if (defaultEdgeStyle.dashStyle !== DEFAULT_EDGE.dashStyle) ed.d = encEnum(DASH_STYLES, defaultEdgeStyle.dashStyle);
  if (defaultEdgeStyle.arrowStyle !== DEFAULT_EDGE.arrowStyle) ed.a = encEnum(ARROW_STYLES, defaultEdgeStyle.arrowStyle);
  if (defaultEdgeStyle.strokeWidth !== DEFAULT_EDGE.strokeWidth) ed.w = defaultEdgeStyle.strokeWidth;
  if (defaultEdgeStyle.tint !== DEFAULT_EDGE.tint) ed.t = defaultEdgeStyle.tint;

  const nodeTuples: NodeTuple[] = nodes.map((n) => {
    const idNum = parseNodeId(n.id);
    const x = Math.round(n.position.x);
    const y = Math.round(n.position.y);
    const shape = n.data.shape;
    const defaultSize = SHAPE_SIZES[shape];
    const w = Math.round((n.style?.width as number) ?? defaultSize.width);
    const h = Math.round((n.style?.height as number) ?? defaultSize.height);
    const label = n.data.label ?? "";

    const tuple: unknown[] = [idNum, x, y, w, h, label];

    // Only append optional fields if different from defaults
    const shapeIdx = encEnum(SHAPES, shape);
    const defaultShapeIdx = encEnum(SHAPES, defaultNodeStyle.shape);
    const tint = n.data.tint ?? "transparent";
    const textAlign = n.data.textAlign ?? "center";
    const textAlignIdx = encEnum(TEXT_ALIGNS, textAlign);
    const defaultTextAlignIdx = encEnum(TEXT_ALIGNS, defaultNodeStyle.textAlign);

    const hasShape = shapeIdx !== defaultShapeIdx;
    const hasTint = tint !== defaultNodeStyle.tint;
    const hasAlign = textAlignIdx !== defaultTextAlignIdx;

    if (hasShape || hasTint || hasAlign) tuple.push(shapeIdx);
    else tuple.push(null); // placeholder to keep indices stable... actually use sparse approach:

    // Better: only include up to the last non-default field
    // Rebuild with trailing nulls stripped
    const tail: unknown[] = [];
    if (hasTint || hasAlign) tail.push(hasShape ? shapeIdx : defaultShapeIdx);
    else if (hasShape) tail.push(shapeIdx);

    if (hasAlign) tail.push(hasTint ? tint : defaultNodeStyle.tint);
    else if (hasTint) tail.push(tint);

    if (hasAlign) tail.push(textAlignIdx);

    return [idNum, x, y, w, h, label, ...tail] as NodeTuple;
  });

  const edgeTuples: EdgeTuple[] = edges.map((e) => {
    const idNum = parseEdgeId(e.id);
    const srcNum = parseNodeId(e.source);
    const tgtNum = parseNodeId(e.target);

    const srcHandle = e.sourceHandle
      ? encEnum(HANDLES, e.sourceHandle)
      : (HANDLES as readonly string[]).indexOf(e.sourceHandle ?? "") >= 0
        ? encEnum(HANDLES, e.sourceHandle ?? "")
        : (e.sourceHandle ?? 0);
    const tgtHandle = e.targetHandle
      ? encEnum(HANDLES, e.targetHandle)
      : (e.targetHandle ?? 4);

    const label = (e.label as string | undefined) ?? "";

    const data = e.data ?? {};
    const edgeStyleIdx = encEnum(EDGE_STYLES, data.edgeStyle ?? defaultEdgeStyle.edgeStyle);
    const dashIdx = encEnum(DASH_STYLES, data.dashStyle ?? defaultEdgeStyle.dashStyle);
    const arrowIdx = encEnum(ARROW_STYLES, data.arrowStyle ?? defaultEdgeStyle.arrowStyle);
    const strokeWidth = data.strokeWidth ?? defaultEdgeStyle.strokeWidth;
    const tint = data.tint ?? defaultEdgeStyle.tint;

    const defaultEdgeStyleIdx = encEnum(EDGE_STYLES, defaultEdgeStyle.edgeStyle);
    const defaultDashIdx = encEnum(DASH_STYLES, defaultEdgeStyle.dashStyle);
    const defaultArrowIdx = encEnum(ARROW_STYLES, defaultEdgeStyle.arrowStyle);

    const hasLabel = label !== "";
    const hasEdgeStyle = edgeStyleIdx !== defaultEdgeStyleIdx;
    const hasDash = dashIdx !== defaultDashIdx;
    const hasArrow = arrowIdx !== defaultArrowIdx;
    const hasStroke = strokeWidth !== defaultEdgeStyle.strokeWidth;
    const hasTint = tint !== defaultEdgeStyle.tint;

    // Build tail only up to last non-default field
    const fields: unknown[] = [label, edgeStyleIdx, dashIdx, arrowIdx, strokeWidth, tint];
    const defaults: unknown[] = ["", defaultEdgeStyleIdx, defaultDashIdx, defaultArrowIdx, defaultEdgeStyle.strokeWidth, defaultEdgeStyle.tint];

    // Find last index that differs from default
    let lastDiff = -1;
    for (let i = fields.length - 1; i >= 0; i--) {
      if (fields[i] !== defaults[i]) { lastDiff = i; break; }
    }
    // hasLabel forces at least index 0
    if (hasLabel) lastDiff = Math.max(lastDiff, 0);

    const tail = lastDiff >= 0 ? fields.slice(0, lastDiff + 1) : [];

    // Suppress unused variable warnings
    void hasLabel; void hasEdgeStyle; void hasDash; void hasArrow; void hasStroke; void hasTint;

    return [idNum, srcNum, tgtNum, srcHandle, tgtHandle, ...tail] as EdgeTuple;
  });

  const payload: Payload = { v: 1, nd, ed, nodes: nodeTuples, edges: edgeTuples };
  const packed = encode(payload);
  const compressed = deflateSync(packed, { level: 9 });
  return uint8ToBase64url(compressed);
}

// ─── decodeDiagram ────────────────────────────────────────────────────────────
export interface DecodeResult {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  defaultNodeStyle: DefaultNodeStyle;
  defaultEdgeStyle: DefaultEdgeStyle;
  maxNodeId: number;
  maxEdgeId: number;
}

export function decodeDiagram(hash: string): DecodeResult | null {
  try {
    const compressed = base64urlToUint8(hash);
    const packed = inflateSync(compressed);
    const payload = decode(packed) as Payload;

    if (payload.v !== 1) return null;

    const nd = payload.nd ?? {};
    const ed = payload.ed ?? {};

    const defaultNodeStyle: DefaultNodeStyle = {
      shape: nd.s !== undefined ? decEnum(SHAPES, nd.s) : DEFAULT_NODE.shape,
      tint: nd.t !== undefined ? (nd.t as string) : DEFAULT_NODE.tint,
      textAlign: nd.a !== undefined ? decEnum(TEXT_ALIGNS, nd.a) : DEFAULT_NODE.textAlign,
      width: nd.w !== undefined ? (nd.w as number) : undefined,
      height: nd.h !== undefined ? (nd.h as number) : undefined,
    };

    const defaultEdgeStyle: DefaultEdgeStyle = {
      edgeStyle: ed.e !== undefined ? decEnum(EDGE_STYLES, ed.e) : DEFAULT_EDGE.edgeStyle,
      dashStyle: ed.d !== undefined ? decEnum(DASH_STYLES, ed.d) : DEFAULT_EDGE.dashStyle,
      arrowStyle: ed.a !== undefined ? decEnum(ARROW_STYLES, ed.a) : DEFAULT_EDGE.arrowStyle,
      strokeWidth: ed.w !== undefined ? (ed.w as number) : DEFAULT_EDGE.strokeWidth,
      tint: ed.t !== undefined ? (ed.t as string) : DEFAULT_EDGE.tint,
    };

    let maxNodeId = 0;
    let maxEdgeId = 0;

    const nodes: DiagramNode[] = (payload.nodes ?? []).map((tuple) => {
      const [idNum, x, y, w, h, label, shapeField, tintField, alignField] = tuple;
      maxNodeId = Math.max(maxNodeId, idNum);

      const shape = shapeField !== undefined
        ? decEnum(SHAPES, shapeField)
        : defaultNodeStyle.shape;
      const tint = tintField !== undefined
        ? (tintField as string)
        : defaultNodeStyle.tint;
      const textAlign = alignField !== undefined
        ? decEnum(TEXT_ALIGNS, alignField)
        : defaultNodeStyle.textAlign;

      const defaultSize = SHAPE_SIZES[shape];
      const width = (w as number) ?? defaultSize.width;
      const height = (h as number) ?? defaultSize.height;

      return {
        id: `node-${idNum}`,
        type: "diagram",
        position: { x: x as number, y: y as number },
        data: { label: label as string, shape, tint, textAlign },
        selected: false,
        style: { width, height },
      } as DiagramNode;
    });

    const edges: DiagramEdge[] = (payload.edges ?? []).map((tuple) => {
      const [idNum, srcNum, tgtNum, srcHandleRaw, tgtHandleRaw, labelField, edgeStyleField, dashField, arrowField, strokeField, tintField] = tuple;
      maxEdgeId = Math.max(maxEdgeId, idNum as number);

      const sourceHandle = typeof srcHandleRaw === "number"
        ? HANDLES[srcHandleRaw] ?? "bottom-source"
        : (srcHandleRaw as string);
      const targetHandle = typeof tgtHandleRaw === "number"
        ? HANDLES[tgtHandleRaw] ?? "top-target"
        : (tgtHandleRaw as string);

      const edgeStyle = edgeStyleField !== undefined
        ? decEnum(EDGE_STYLES, edgeStyleField)
        : defaultEdgeStyle.edgeStyle;
      const dashStyle = dashField !== undefined
        ? decEnum(DASH_STYLES, dashField)
        : defaultEdgeStyle.dashStyle;
      const arrowStyle = arrowField !== undefined
        ? decEnum(ARROW_STYLES, arrowField)
        : defaultEdgeStyle.arrowStyle;
      const strokeWidth = strokeField !== undefined
        ? (strokeField as number)
        : defaultEdgeStyle.strokeWidth;
      const tint = tintField !== undefined
        ? (tintField as string)
        : defaultEdgeStyle.tint;

      return {
        id: `edge-${idNum as number}`,
        source: `node-${srcNum as number}`,
        target: `node-${tgtNum as number}`,
        sourceHandle,
        targetHandle,
        type: "default",
        label: labelField !== undefined && labelField !== "" ? (labelField as string) : undefined,
        data: { edgeStyle, dashStyle, arrowStyle, strokeWidth, tint },
        selected: false,
      } as DiagramEdge;
    });

    return { nodes, edges, defaultNodeStyle, defaultEdgeStyle, maxNodeId, maxEdgeId };
  } catch {
    return null;
  }
}
