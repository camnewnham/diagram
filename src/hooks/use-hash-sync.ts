"use client";

import { useEffect, useRef } from "react";
import { useDiagramStore, resetCounters } from "@/store/use-diagram-store";
import { encodeDiagram, decodeDiagram } from "@/lib/serialization";

const DEBOUNCE_MS = 300;

export function useHashSync() {
  const isFirstRender = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nodes = useDiagramStore((s) => s.nodes);
  const edges = useDiagramStore((s) => s.edges);
  const defaultNodeStyle = useDiagramStore((s) => s.defaultNodeStyle);
  const defaultEdgeStyle = useDiagramStore((s) => s.defaultEdgeStyle);

  // Load from hash on mount
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const result = decodeDiagram(hash);
    if (!result) return;

    const { nodes: loadedNodes, edges: loadedEdges, defaultNodeStyle: dns, defaultEdgeStyle: des, maxNodeId, maxEdgeId } = result;
    resetCounters(maxNodeId, maxEdgeId);

    // Use Zustand actions for defaults so localStorage is updated too
    useDiagramStore.getState().setDefaultNodeStyle(dns);
    useDiagramStore.getState().setDefaultEdgeStyle(des);
    useDiagramStore.setState({ nodes: loadedNodes, edges: loadedEdges, past: [], future: [] });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Encode to hash on change (debounced)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
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
