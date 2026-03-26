"use client";

import { useState, useCallback, useEffect } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  SelectionMode,
  ConnectionLineType,
  useReactFlow,
  type NodeTypes,
  type EdgeTypes,
  type Viewport,
  type FinalConnectionState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useDiagramStore } from "@/store/use-diagram-store";
import type { EdgeStyle } from "@/store/types";
import { DiagramNode } from "@/components/nodes/diagram-node";
import { EditableEdge } from "@/components/edges/editable-edge-label";
import { Toolbar } from "@/components/toolbar";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { CanvasContextMenu } from "@/components/canvas-context-menu";
import { NodeContextMenu } from "@/components/node-context-menu";
import { EdgeContextMenu } from "@/components/edge-context-menu";

const nodeTypes: NodeTypes = {
  diagram: DiagramNode,
};

const edgeTypes: EdgeTypes = {
  default: EditableEdge,
};

const CONNECTION_LINE_TYPE_MAP: Record<EdgeStyle, ConnectionLineType> = {
  default: ConnectionLineType.Bezier,
  straight: ConnectionLineType.Straight,
  smoothstep: ConnectionLineType.SmoothStep,
};

type ContextMenuState =
  | { kind: "canvas"; x: number; y: number; flowX: number; flowY: number }
  | { kind: "node"; x: number; y: number; nodeId: string }
  | { kind: "edge"; x: number; y: number; edgeId: string }
  | null;

export function DiagramCanvas() {
  const nodes = useDiagramStore((s) => s.nodes);
  const edges = useDiagramStore((s) => s.edges);
  const onNodesChange = useDiagramStore((s) => s.onNodesChange);
  const onEdgesChange = useDiagramStore((s) => s.onEdgesChange);
  const onConnect = useDiagramStore((s) => s.onConnect);
  const pushHistory = useDiagramStore((s) => s.pushHistory);
  const edgeStyle = useDiagramStore((s) => s.edgeStyle);
  const defaultEdgeStyle = useDiagramStore((s) => s.defaultEdgeStyle);
  const { screenToFlowPosition } = useReactFlow();
  const addNode = useDiagramStore((s) => s.addNode);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [dark, setDark] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);

  // Listen for snap toggle from toolbar
  useEffect(() => {
    const handler = (e: Event) => {
      setSnapToGrid((e as CustomEvent).detail);
    };
    window.addEventListener("diagram:snap", handler);
    return () => window.removeEventListener("diagram:snap", handler);
  }, []);

  // Watch dark class on <html> to sync React Flow colorMode
  useEffect(() => {
    const sync = () =>
      setDark(document.documentElement.classList.contains("dark"));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  const handleViewportChange = useCallback(({ zoom }: Viewport) => {
    document.documentElement.classList.toggle("zoomed-in", zoom >= 1);
  }, []);

  const handleNodeDragStart = useCallback(() => {
    pushHistory();
  }, [pushHistory]);

  const handlePaneContextMenu = useCallback(
    (event: React.MouseEvent | MouseEvent) => {
      event.preventDefault();
      const e = event as React.MouseEvent;
      const { x, y } = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      setContextMenu({ kind: "canvas", x: e.clientX, y: e.clientY, flowX: x, flowY: y });
    },
    [screenToFlowPosition],
  );

  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: { id: string }) => {
      event.preventDefault();
      event.stopPropagation();
      setContextMenu({ kind: "node", x: event.clientX, y: event.clientY, nodeId: node.id });
    },
    [],
  );

  const handleEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: { id: string }) => {
      event.preventDefault();
      event.stopPropagation();
      setContextMenu({ kind: "edge", x: event.clientX, y: event.clientY, edgeId: edge.id });
    },
    [],
  );

  const handleConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent, connectionState: FinalConnectionState) => {
      if (connectionState.toNode) return;
      if (!connectionState.fromNode || !connectionState.fromHandle) return;

      const clientX =
        "changedTouches" in event
          ? event.changedTouches[0].clientX
          : (event as MouseEvent).clientX;
      const clientY =
        "changedTouches" in event
          ? event.changedTouches[0].clientY
          : (event as MouseEvent).clientY;
      const { x, y } = screenToFlowPosition({ x: clientX, y: clientY });

      const fromNodeId = connectionState.fromNode.id;
      const fromHandleId = connectionState.fromHandle.id;
      const isSource = connectionState.fromHandle.type === "source";
      const newPos = { x: x - 80, y: y - 40 };

      setTimeout(() => {
        useDiagramStore
          .getState()
          .addNodeAndConnect(
            undefined,
            newPos,
            fromNodeId,
            fromHandleId,
            isSource,
          );
      }, 0);
    },
    [screenToFlowPosition],
  );

  // The connection line type tracks the default edge style for new connections
  const connectionLineType = CONNECTION_LINE_TYPE_MAP[defaultEdgeStyle.edgeStyle ?? edgeStyle];

  return (
    <div style={{ width: "100%", height: "100%" }} className="relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStart={handleNodeDragStart}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        snapToGrid={snapToGrid}
        snapGrid={[16, 16]}
        fitView
        selectNodesOnDrag
        selectionOnDrag
        panOnScroll={false}
        zoomOnPinch
        multiSelectionKeyCode={["Meta", "Control", "Shift"]}
        zoomOnDoubleClick={false}
        onConnectEnd={handleConnectEnd}
        onPaneContextMenu={handlePaneContextMenu}
        onNodeContextMenu={handleNodeContextMenu}
        onEdgeContextMenu={handleEdgeContextMenu}
        onViewportChange={handleViewportChange}
        selectionMode={SelectionMode.Partial}
        elevateNodesOnSelect
        elevateEdgesOnSelect
        connectionLineType={connectionLineType}
        connectionRadius={35}
        edgesReconnectable
        defaultEdgeOptions={{ type: "default" }}
        colorMode={dark ? "dark" : "light"}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
          className="!bg-background/80 !border-border"
        />
        <Toolbar />
        <KeyboardShortcuts />
      </ReactFlow>
      {contextMenu?.kind === "canvas" && (
        <CanvasContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onAddNode={() =>
            addNode(undefined, {
              x: contextMenu.flowX - 80,
              y: contextMenu.flowY - 40,
            })
          }
          onClose={() => setContextMenu(null)}
        />
      )}
      {contextMenu?.kind === "node" && (
        <NodeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeId={contextMenu.nodeId}
          onClose={() => setContextMenu(null)}
        />
      )}
      {contextMenu?.kind === "edge" && (
        <EdgeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          edgeId={contextMenu.edgeId}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
