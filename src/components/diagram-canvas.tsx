"use client";

import { useState, useCallback, useEffect } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  SelectionMode,
  ConnectionLineType,
  useReactFlow,
  type NodeTypes,
  type EdgeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useDiagramStore } from "@/store/use-diagram-store";
import type { EdgeStyle } from "@/store/types";
import { DiagramNode } from "@/components/nodes/diagram-node";
import { EditableEdge } from "@/components/edges/editable-edge-label";
import { Toolbar } from "@/components/toolbar";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";

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

export function DiagramCanvas() {
  const nodes = useDiagramStore((s) => s.nodes);
  const edges = useDiagramStore((s) => s.edges);
  const onNodesChange = useDiagramStore((s) => s.onNodesChange);
  const onEdgesChange = useDiagramStore((s) => s.onEdgesChange);
  const onConnect = useDiagramStore((s) => s.onConnect);
  const pushHistory = useDiagramStore((s) => s.pushHistory);
  const edgeStyle = useDiagramStore((s) => s.edgeStyle);
  const { screenToFlowPosition } = useReactFlow();
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [dark, setDark] = useState(false);

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

  const handleNodeDragStart = useCallback(() => {
    pushHistory();
  }, [pushHistory]);

  const handleConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent, connectionState: any) => {
      // If the connection was dropped on blank space (no target node), create a new node
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

      // Defer so React Flow finishes its own connection-end cleanup before we mutate state
      setTimeout(() => {
        useDiagramStore
          .getState()
          .addNodeAndConnect(
            "rectangle",
            newPos,
            fromNodeId,
            fromHandleId,
            isSource,
          );
      }, 0);
    },
    [screenToFlowPosition],
  );

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
        selectionMode={SelectionMode.Partial}
        elevateNodesOnSelect
        elevateEdgesOnSelect
        connectionLineType={CONNECTION_LINE_TYPE_MAP[edgeStyle]}
        connectionRadius={35}
        edgesReconnectable
        defaultEdgeOptions={{ type: "default" }}
        colorMode={dark ? "dark" : "light"}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls showInteractive={false} />
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
          className="!bg-background/80 !border-border"
        />
        <Toolbar />
        <KeyboardShortcuts />
      </ReactFlow>
    </div>
  );
}
