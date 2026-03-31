"use client";

import { useEffect, useRef } from "react";
import { useDiagramStore, resetCounters, interactingRef } from "@/store/use-diagram-store";
import { encodeDiagram, decodeDiagram } from "@/lib/serialization";

const DEBOUNCE_MS = 300;

export function flushHashEncode() {
  const { nodes, edges, defaultNodeStyle, defaultEdgeStyle } = useDiagramStore.getState();
  if (nodes.length === 0 && edges.length === 0) {
    history.replaceState(null, "", window.location.pathname);
    return;
  }
  const encoded = encodeDiagram(nodes, edges, defaultNodeStyle, defaultEdgeStyle);
  history.replaceState(null, "", "#" + encoded);
}

export function useHashSync(): void {
  const skipFirstEncode = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nodes = useDiagramStore((s) => s.nodes);
  const edges = useDiagramStore((s) => s.edges);
  const defaultNodeStyle = useDiagramStore((s) => s.defaultNodeStyle);
  const defaultEdgeStyle = useDiagramStore((s) => s.defaultEdgeStyle);

  // Decode hash once synchronously on first render: load state
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

}
