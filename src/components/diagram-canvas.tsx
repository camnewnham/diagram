"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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
import { useDiagramStore, interactingRef } from "@/store/use-diagram-store";
import type { EdgeStyle } from "@/store/types";
import { flushHashEncode } from "@/hooks/use-hash-sync";
import { DiagramNode } from "@/components/nodes/diagram-node";
import { EditableEdge } from "@/components/edges/editable-edge-label";
import { Toolbar } from "@/components/toolbar";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { CanvasContextMenu } from "@/components/canvas-context-menu";
import { NodeContextMenu } from "@/components/node-context-menu";
import { EdgeContextMenu } from "@/components/edge-context-menu";
import { ReadOnlyContext } from "@/contexts/read-only-context";
import { useHashSync } from "@/hooks/use-hash-sync";

const FIT_VIEW_PADDING = 0.1;

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

interface DiagramCanvasProps {
  readOnly?: boolean;
}

export function DiagramCanvas({ readOnly = false }: DiagramCanvasProps) {
  const nodes = useDiagramStore((s) => s.nodes);
  const edges = useDiagramStore((s) => s.edges);
  const onNodesChange = useDiagramStore((s) => s.onNodesChange);
  const onEdgesChange = useDiagramStore((s) => s.onEdgesChange);
  const onConnect = useDiagramStore((s) => s.onConnect);
  const pushHistory = useDiagramStore((s) => s.pushHistory);
  const edgeStyle = useDiagramStore((s) => s.edgeStyle);
  const defaultEdgeStyle = useDiagramStore((s) => s.defaultEdgeStyle);
  const { screenToFlowPosition, fitView } = useReactFlow();
  const addNode = useDiagramStore((s) => s.addNode);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [dark, setDark] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [ready, setReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useHashSync();

  // Re-fit on container resize (handles iframe being resized by embedder like Notion)
  // In edit mode, only used for the initial ready state — observer disconnects after first fire.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      fitView({ padding: FIT_VIEW_PADDING });
      setReady(true);
      if (!readOnly) ro.disconnect();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fitView, readOnly]);

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
    if (!readOnly) document.documentElement.classList.toggle("zoomed-in", zoom >= 1);
  }, [readOnly]);

  const handleNodeDragStart = useCallback(() => {
    pushHistory();
    interactingRef.current = true;
  }, [pushHistory]);

  const handleNodeDragStop = useCallback(() => {
    interactingRef.current = false;
    flushHashEncode();
  }, []);

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
      const fromHandleId = connectionState.fromHandle.id ?? "";
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
    <ReadOnlyContext.Provider value={readOnly}>
      <div ref={containerRef} style={{ width: "100%", height: "100%", visibility: ready ? "visible" : "hidden" }} className="relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={readOnly ? undefined : onNodesChange}
          onEdgesChange={readOnly ? undefined : onEdgesChange}
          onConnect={readOnly ? undefined : onConnect}
          onNodeDragStart={readOnly ? undefined : handleNodeDragStart}
          onNodeDragStop={readOnly ? undefined : handleNodeDragStop}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          snapToGrid={readOnly ? false : snapToGrid}
          snapGrid={[16, 16]}
          selectNodesOnDrag={!readOnly}
          selectionOnDrag={!readOnly}
          panOnScroll={false}
          zoomOnPinch
          multiSelectionKeyCode={readOnly ? null : ["Meta", "Control", "Shift"]}
          zoomOnDoubleClick={false}
          onConnectEnd={readOnly ? undefined : handleConnectEnd}
          onPaneContextMenu={readOnly ? undefined : handlePaneContextMenu}
          onNodeContextMenu={readOnly ? undefined : handleNodeContextMenu}
          onEdgeContextMenu={readOnly ? undefined : handleEdgeContextMenu}
          fitView
          fitViewOptions={{ padding: FIT_VIEW_PADDING }}
          onViewportChange={handleViewportChange}
          selectionMode={SelectionMode.Partial}
          elevateNodesOnSelect={!readOnly}
          elevateEdgesOnSelect={!readOnly}
          nodesDraggable={!readOnly}
          nodesConnectable={!readOnly}
          elementsSelectable={!readOnly}
          connectionLineType={connectionLineType}
          connectionRadius={35}
          edgesReconnectable={!readOnly}
          defaultEdgeOptions={{ type: "default" }}
          colorMode={dark ? "dark" : "light"}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
          {!readOnly && (
            <MiniMap
              nodeStrokeWidth={3}
              zoomable
              pannable
              className="!bg-background/80 !border-border"
            />
          )}
          {!readOnly && <Toolbar />}
          {!readOnly && <KeyboardShortcuts />}
        </ReactFlow>
        {!readOnly && contextMenu?.kind === "canvas" && (
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
        {!readOnly && contextMenu?.kind === "node" && (
          <NodeContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            nodeId={contextMenu.nodeId}
            onClose={() => setContextMenu(null)}
          />
        )}
        {!readOnly && contextMenu?.kind === "edge" && (
          <EdgeContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            edgeId={contextMenu.edgeId}
            onClose={() => setContextMenu(null)}
          />
        )}
      </div>
    </ReadOnlyContext.Provider>
  );
}
