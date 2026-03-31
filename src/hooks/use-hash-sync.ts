"use client";

import { useEffect, useRef } from "react";
import { useDiagramStore, resetCounters, SHAPE_SIZES, interactingRef } from "@/store/use-diagram-store";
import { encodeDiagram, decodeDiagram } from "@/lib/serialization";
import type { Viewport } from "@xyflow/react";

const DEBOUNCE_MS = 300;
const PADDING = 0.1;

function computeViewportForNodes(
  nodes: { position: { x: number; y: number }; width?: number; height?: number }[],
  containerWidth: number,
  containerHeight: number,
): Viewport | undefined {
  if (nodes.length === 0) return undefined;
  const { width: defaultW, height: defaultH } = SHAPE_SIZES.rectangle;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const node of nodes) {
    const w = node.width ?? defaultW;
    const h = node.height ?? defaultH;
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + w);
    maxY = Math.max(maxY, node.position.y + h);
  }
  const bw = maxX - minX;
  const bh = maxY - minY;
  const zoom = Math.min(
    containerWidth / (bw * (1 + 2 * PADDING)),
    containerHeight / (bh * (1 + 2 * PADDING)),
    2,
  );
  const x = (containerWidth - bw * zoom) / 2 - minX * zoom;
  const y = (containerHeight - bh * zoom) / 2 - minY * zoom;
  return { x, y, zoom };
}

export function flushHashEncode() {
  const { nodes, edges, defaultNodeStyle, defaultEdgeStyle } = useDiagramStore.getState();
  if (nodes.length === 0 && edges.length === 0) {
    history.replaceState(null, "", window.location.pathname);
    return;
  }
  const encoded = encodeDiagram(nodes, edges, defaultNodeStyle, defaultEdgeStyle);
  history.replaceState(null, "", "#" + encoded);
}

export function useHashSync(): Viewport | undefined {
  const skipFirstEncode = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nodes = useDiagramStore((s) => s.nodes);
  const edges = useDiagramStore((s) => s.edges);
  const defaultNodeStyle = useDiagramStore((s) => s.defaultNodeStyle);
  const defaultEdgeStyle = useDiagramStore((s) => s.defaultEdgeStyle);

  // Decode hash once synchronously on first render: load state and compute initial viewport
  const initialViewport = useRef<Viewport | undefined>(undefined);
  const didInit = useRef(false);
  if (!didInit.current && typeof window !== "undefined") {
    didInit.current = true;
    const hash = window.location.hash.slice(1);
    if (hash) {
      const result = decodeDiagram(hash);
      if (result) {
        const { nodes: loadedNodes, edges: loadedEdges, defaultNodeStyle: dns, defaultEdgeStyle: des, maxNodeId, maxEdgeId } = result;
        resetCounters(maxNodeId, maxEdgeId);
        useDiagramStore.getState().setDefaultNodeStyle(dns);
        useDiagramStore.getState().setDefaultEdgeStyle(des);
        useDiagramStore.setState({ nodes: loadedNodes, edges: loadedEdges, past: [], future: [] });
        initialViewport.current = computeViewportForNodes(loadedNodes, window.innerWidth, window.innerHeight);
      }
    }
  }

  // Encode to hash on change (debounced)
  useEffect(() => {
    if (skipFirstEncode.current) {
      skipFirstEncode.current = false;
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      if (interactingRef.current) return;
      if (nodes.length === 0 && edges.length === 0) {
        history.replaceState(null, "", window.location.pathname);
        return;
      }
      const encoded = encodeDiagram(nodes, edges, defaultNodeStyle, defaultEdgeStyle);
      history.replaceState(null, "", "#" + encoded);
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [nodes, edges, defaultNodeStyle, defaultEdgeStyle]);

  return initialViewport.current;
}
