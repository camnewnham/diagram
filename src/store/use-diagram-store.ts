import type React from "react";
import { create } from "zustand";
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type Connection,
  Position,
} from "@xyflow/react";
import type {
  DiagramNode,
  DiagramEdge,
  DiagramNodeData,
  DiagramEdgeData,
  HistoryEntry,
  NodeShape,
  EdgeStyle,
  DefaultNodeStyle,
  DefaultEdgeStyle,
} from "./types";
import { EDGE_STYLES } from "./types";

export const resizingRef = { current: false };

const MAX_HISTORY = 100;
const LS_DEFAULT_NODE = "diagram:defaultNodeStyle";
const LS_DEFAULT_EDGE = "diagram:defaultEdgeStyle";

function loadDefaultNodeStyle(): DefaultNodeStyle {
  try {
    const raw = localStorage.getItem(LS_DEFAULT_NODE);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { shape: "rectangle", tint: "transparent", textAlign: "center" };
}

function loadDefaultEdgeStyle(): DefaultEdgeStyle {
  try {
    const raw = localStorage.getItem(LS_DEFAULT_EDGE);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { edgeStyle: "default", dashStyle: "solid", arrowStyle: "end", strokeWidth: 2, tint: "transparent" };
}

function saveDefaultNodeStyle(s: DefaultNodeStyle) {
  try { localStorage.setItem(LS_DEFAULT_NODE, JSON.stringify(s)); } catch {}
}

function saveDefaultEdgeStyle(s: DefaultEdgeStyle) {
  try { localStorage.setItem(LS_DEFAULT_EDGE, JSON.stringify(s)); } catch {}
}

function edgeDataFromDefault(des: DefaultEdgeStyle): DiagramEdgeData {
  return {
    edgeStyle: des.edgeStyle,
    dashStyle: des.dashStyle,
    arrowStyle: des.arrowStyle,
    strokeWidth: des.strokeWidth,
    tint: des.tint,
  };
}

interface DiagramState {
  nodes: DiagramNode[];
  edges: DiagramEdge[];

  // History
  past: HistoryEntry[];
  future: HistoryEntry[];

  // Clipboard
  clipboard: { nodes: DiagramNode[]; edges: DiagramEdge[] } | null;

  // Edge style (global cycle)
  edgeStyle: EdgeStyle;

  // Default styles (applied to new nodes/edges, persisted in localStorage)
  defaultNodeStyle: DefaultNodeStyle;
  defaultEdgeStyle: DefaultEdgeStyle;

  // Actions
  onNodesChange: OnNodesChange<DiagramNode>;
  onEdgesChange: OnEdgesChange<DiagramEdge>;
  onConnect: OnConnect;

  addNode: (shape: NodeShape | undefined, position?: { x: number; y: number }, options?: { autoEdit?: boolean }) => void;
  updateNodeLabel: (nodeId: string, label: string) => void;
  updateNodeData: (nodeId: string, data: Partial<DiagramNodeData>) => void;
  updateEdgeLabel: (edgeId: string, label: string) => void;
  updateEdgeData: (edgeId: string, data: Partial<DiagramEdgeData>) => void;
  updateNodeStyle: (nodeId: string, style: Partial<React.CSSProperties>) => void;
  updateSelectedNodesData: (data: Partial<DiagramNodeData>) => void;
  updateSelectedEdgesData: (data: Partial<DiagramEdgeData>) => void;

  // Default style management
  setDefaultNodeStyle: (style: DefaultNodeStyle) => void;
  setDefaultEdgeStyle: (style: DefaultEdgeStyle) => void;
  applyNodeAsDefault: (nodeId: string) => void;
  applyEdgeAsDefault: (edgeId: string) => void;

  // History
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  // Clipboard
  copySelection: () => void;
  pasteSelection: (offset?: { x: number; y: number }) => void;
  duplicateSelection: () => void;
  deleteSelection: () => void;

  // Edge style
  cycleEdgeStyle: () => void;

  // Select all
  selectAll: () => void;

  // Add node + connect in one action
  addNodeAndConnect: (shape: NodeShape | undefined, position: { x: number; y: number }, fromNodeId: string, fromHandleId: string, isSource: boolean) => void;
}

export const SHAPE_SIZES: Record<NodeShape, { width: number; height: number }> = {
  rectangle: { width: 160, height: 80 },
  diamond: { width: 120, height: 120 },
  circle: { width: 100, height: 100 },
};

let nodeIdCounter = 1;
function nextNodeId() {
  return `node-${++nodeIdCounter}`;
}

let edgeIdCounter = 0;
function nextEdgeId() {
  return `edge-${++edgeIdCounter}`;
}

export function resetCounters(maxNodeId: number, maxEdgeId: number) {
  nodeIdCounter = maxNodeId;
  edgeIdCounter = maxEdgeId;
}

export const useDiagramStore = create<DiagramState>((set, get) => ({
  nodes: [
    {
      id: "node-1",
      type: "diagram",
      position: { x: 250, y: 200 },
      data: { label: "Start", shape: "rectangle", tint: "transparent", textAlign: "center" },
      selected: false,
      style: { width: 160, height: 80 },
    },
  ] as DiagramNode[],
  edges: [],
  past: [],
  future: [],
  clipboard: null,
  edgeStyle: "default" as EdgeStyle,
  defaultNodeStyle: loadDefaultNodeStyle(),
  defaultEdgeStyle: loadDefaultEdgeStyle(),

  onNodesChange: (changes) => {
    const state = get();
    const meaningful = changes.some(
      (c) => c.type === "remove" || c.type === "replace"
    );
    if (meaningful) {
      state.pushHistory();
    }
    set({ nodes: applyNodeChanges(changes, state.nodes) });
  },

  onEdgesChange: (changes) => {
    const state = get();
    const meaningful = changes.some(
      (c) => c.type === "remove" || c.type === "replace"
    );
    if (meaningful) {
      state.pushHistory();
    }
    set({ edges: applyEdgeChanges(changes, state.edges) });
  },

  onConnect: (connection: Connection) => {
    const state = get();
    state.pushHistory();
    const ds = state.defaultEdgeStyle;
    const edge: DiagramEdge = {
      ...connection,
      id: nextEdgeId(),
      type: "default",
      data: edgeDataFromDefault(ds),
    };
    set({ edges: addEdge(edge, state.edges) });
  },

  addNode: (shape, position, options) => {
    const state = get();
    state.pushHistory();
    const id = nextNodeId();
    const pos = position ?? { x: 250 + Math.random() * 100, y: 200 + Math.random() * 100 };
    const autoEdit = options?.autoEdit ?? false;
    const ds = state.defaultNodeStyle;
    // If no explicit shape passed, use the default shape
    const resolvedShape = shape ?? ds.shape;
    const defaultSize = SHAPE_SIZES[resolvedShape];
    const width = ds.width ?? defaultSize.width;
    const height = ds.height ?? defaultSize.height;
    const newNode: DiagramNode = {
      id,
      type: "diagram",
      position: pos,
      data: {
        label: autoEdit ? "" : "Node",
        shape: resolvedShape,
        tint: ds.tint,
        textAlign: ds.textAlign,
        autoEdit,
      },
      selected: autoEdit,
      style: { width, height },
    };
    const nodes = autoEdit
      ? state.nodes.map((n) => ({ ...n, selected: false }))
      : state.nodes;
    set({ nodes: [...nodes, newNode] });
  },

  updateNodeLabel: (nodeId, label) => {
    const state = get();
    state.pushHistory();
    set({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, label } } : n
      ),
    });
  },

  updateNodeData: (nodeId, data) => {
    set({
      nodes: get().nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
      ),
    });
  },

  updateNodeStyle: (nodeId, style) => {
    set({
      nodes: get().nodes.map((n) =>
        n.id === nodeId ? { ...n, style: { ...n.style, ...style } } : n
      ),
    });
  },

  updateEdgeLabel: (edgeId, label) => {
    const state = get();
    state.pushHistory();
    set({
      edges: state.edges.map((e) =>
        e.id === edgeId ? { ...e, label } : e
      ),
    });
  },

  updateEdgeData: (edgeId, data) => {
    set({
      edges: get().edges.map((e) =>
        e.id === edgeId ? { ...e, data: { ...e.data, ...data } } : e
      ),
    });
  },

  updateSelectedNodesData: (data) => {
    set({
      nodes: get().nodes.map((n) =>
        n.selected ? { ...n, data: { ...n.data, ...data } } : n
      ),
    });
  },

  updateSelectedEdgesData: (data) => {
    set({
      edges: get().edges.map((e) =>
        e.selected ? { ...e, data: { ...e.data, ...data } } : e
      ),
    });
  },

  setDefaultNodeStyle: (style) => {
    saveDefaultNodeStyle(style);
    set({ defaultNodeStyle: style });
  },

  setDefaultEdgeStyle: (style) => {
    saveDefaultEdgeStyle(style);
    set({ defaultEdgeStyle: style, edgeStyle: style.edgeStyle });
  },

  applyNodeAsDefault: (nodeId) => {
    const node = get().nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const style: DefaultNodeStyle = {
      shape: node.data.shape,
      tint: node.data.tint ?? "transparent",
      textAlign: node.data.textAlign ?? "center",
      width: node.style?.width as number | undefined,
      height: node.style?.height as number | undefined,
    };
    get().setDefaultNodeStyle(style);
  },

  applyEdgeAsDefault: (edgeId) => {
    const edge = get().edges.find((e) => e.id === edgeId);
    if (!edge) return;
    const style: DefaultEdgeStyle = {
      edgeStyle: edge.data?.edgeStyle ?? "default",
      dashStyle: edge.data?.dashStyle ?? "solid",
      arrowStyle: edge.data?.arrowStyle ?? "end",
      strokeWidth: edge.data?.strokeWidth ?? 2,
      tint: edge.data?.tint ?? "transparent",
    };
    get().setDefaultEdgeStyle(style);
  },

  pushHistory: () => {
    const { nodes, edges, past } = get();
    const entry: HistoryEntry = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };
    const newPast = [...past, entry];
    if (newPast.length > MAX_HISTORY) newPast.shift();
    set({ past: newPast, future: [] });
  },

  undo: () => {
    const { past, nodes, edges, future } = get();
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    const current: HistoryEntry = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };
    set({
      nodes: prev.nodes,
      edges: prev.edges,
      past: past.slice(0, -1),
      future: [current, ...future],
    });
  },

  redo: () => {
    const { future, nodes, edges, past } = get();
    if (future.length === 0) return;
    const next = future[0];
    const current: HistoryEntry = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };
    set({
      nodes: next.nodes,
      edges: next.edges,
      past: [...past, current],
      future: future.slice(1),
    });
  },

  copySelection: () => {
    const { nodes, edges } = get();
    const selectedNodes = nodes.filter((n) => n.selected);
    const selectedNodeIds = new Set(selectedNodes.map((n) => n.id));
    const selectedEdges = edges.filter(
      (e) => selectedNodeIds.has(e.source) && selectedNodeIds.has(e.target)
    );
    if (selectedNodes.length === 0) return;
    set({
      clipboard: {
        nodes: JSON.parse(JSON.stringify(selectedNodes)),
        edges: JSON.parse(JSON.stringify(selectedEdges)),
      },
    });
  },

  pasteSelection: (offset) => {
    const state = get();
    const { clipboard, nodes, edges } = state;
    if (!clipboard || clipboard.nodes.length === 0) return;

    state.pushHistory();

    const dx = offset?.x ?? 50;
    const dy = offset?.y ?? 50;
    const idMap = new Map<string, string>();

    const newNodes = clipboard.nodes.map((n) => {
      const newId = nextNodeId();
      idMap.set(n.id, newId);
      return {
        ...n,
        id: newId,
        position: { x: n.position.x + dx, y: n.position.y + dy },
        selected: true,
      };
    });

    const newEdges = clipboard.edges.map((e) => ({
      ...e,
      id: nextEdgeId(),
      source: idMap.get(e.source) ?? e.source,
      target: idMap.get(e.target) ?? e.target,
    }));

    const deselected = nodes.map((n) => ({ ...n, selected: false }));

    set({
      nodes: [...deselected, ...newNodes],
      edges: [...edges, ...newEdges],
    });
  },

  duplicateSelection: () => {
    const state = get();
    state.copySelection();
    state.pasteSelection({ x: 50, y: 50 });
  },

  deleteSelection: () => {
    const state = get();
    const { nodes, edges } = state;
    state.pushHistory();
    const selectedNodeIds = new Set(
      nodes.filter((n) => n.selected).map((n) => n.id)
    );
    set({
      nodes: nodes.filter((n) => !n.selected),
      edges: edges.filter(
        (e) =>
          !e.selected &&
          !selectedNodeIds.has(e.source) &&
          !selectedNodeIds.has(e.target)
      ),
    });
  },

  selectAll: () => {
    const { nodes, edges } = get();
    set({
      nodes: nodes.map((n) => ({ ...n, selected: true })),
      edges: edges.map((e) => ({ ...e, selected: true })),
    });
  },

  cycleEdgeStyle: () => {
    const { edgeStyle, edges } = get();
    const idx = EDGE_STYLES.indexOf(edgeStyle);
    const next = EDGE_STYLES[(idx + 1) % EDGE_STYLES.length];
    set({
      edgeStyle: next,
      edges: edges.map((e) => ({ ...e, data: { ...e.data, edgeStyle: next } })),
    });
  },

  addNodeAndConnect: (shape, position, fromNodeId, fromHandleId, isSource) => {
    const state = get();
    state.pushHistory();
    const nodeId = nextNodeId();

    const ds = state.defaultNodeStyle;
    const des = state.defaultEdgeStyle;
    const resolvedShape = shape ?? ds.shape;
    const defaultSize = SHAPE_SIZES[resolvedShape];
    const w = ds.width ?? defaultSize.width;
    const h = ds.height ?? defaultSize.height;

    const newNode: DiagramNode = {
      id: nodeId,
      type: "diagram",
      position,
      data: {
        label: "",
        shape: resolvedShape,
        tint: ds.tint,
        textAlign: ds.textAlign,
        autoEdit: true,
      },
      selected: true,
      style: { width: w, height: h },
    };

    const fromNode = state.nodes.find((n) => n.id === fromNodeId);
    const fw = (fromNode?.style?.width as number) ?? 160;
    const fh = (fromNode?.style?.height as number) ?? 80;
    const fromCenterX = (fromNode?.position.x ?? 0) + fw / 2;
    const fromCenterY = (fromNode?.position.y ?? 0) + fh / 2;

    const handleCandidates: { pos: Position; x: number; y: number }[] = [
      { pos: Position.Top, x: position.x + w / 2, y: position.y },
      { pos: Position.Bottom, x: position.x + w / 2, y: position.y + h },
      { pos: Position.Left, x: position.x, y: position.y + h / 2 },
      { pos: Position.Right, x: position.x + w, y: position.y + h / 2 },
    ];

    let closest = handleCandidates[0];
    let minDist = Infinity;
    for (const c of handleCandidates) {
      const dist = (c.x - fromCenterX) ** 2 + (c.y - fromCenterY) ** 2;
      if (dist < minDist) { minDist = dist; closest = c; }
    }

    const newHandleType = isSource ? "target" : "source";
    const newEdge: DiagramEdge = isSource
      ? {
          id: nextEdgeId(),
          source: fromNodeId,
          sourceHandle: fromHandleId,
          target: nodeId,
          targetHandle: `${closest.pos}-${newHandleType}`,
          type: "default",
          data: edgeDataFromDefault(des),
        }
      : {
          id: nextEdgeId(),
          source: nodeId,
          sourceHandle: `${closest.pos}-${newHandleType}`,
          target: fromNodeId,
          targetHandle: fromHandleId,
          type: "default",
          data: edgeDataFromDefault(des),
        };

    set({
      nodes: [...state.nodes.map((n) => ({ ...n, selected: false })), newNode],
      edges: [...state.edges, newEdge],
    });
  },
}));
