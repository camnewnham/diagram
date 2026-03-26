"use client";

import { useEffect } from "react";
import { useReactFlow } from "@xyflow/react";
import { useDiagramStore } from "@/store/use-diagram-store";

export function KeyboardShortcuts() {
  const { fitView } = useReactFlow();
  const undo = useDiagramStore((s) => s.undo);
  const redo = useDiagramStore((s) => s.redo);
  const copySelection = useDiagramStore((s) => s.copySelection);
  const pasteSelection = useDiagramStore((s) => s.pasteSelection);
  const duplicateSelection = useDiagramStore((s) => s.duplicateSelection);
  const deleteSelection = useDiagramStore((s) => s.deleteSelection);
  const selectAll = useDiagramStore((s) => s.selectAll);
  const addNode = useDiagramStore((s) => s.addNode);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Don't handle shortcuts when typing in inputs
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const ctrl = e.ctrlKey || e.metaKey;

      // Undo: Ctrl+Z
      if (ctrl && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // Redo: Ctrl+Shift+Z or Ctrl+Y
      if ((ctrl && e.key === "z" && e.shiftKey) || (ctrl && e.key === "y")) {
        e.preventDefault();
        redo();
        return;
      }

      // Cut: Ctrl+X
      if (ctrl && e.key === "x") {
        e.preventDefault();
        copySelection();
        deleteSelection();
        return;
      }

      // Copy: Ctrl+C
      if (ctrl && e.key === "c") {
        e.preventDefault();
        copySelection();
        return;
      }

      // Paste: Ctrl+V
      if (ctrl && e.key === "v") {
        e.preventDefault();
        pasteSelection();
        return;
      }

      // Duplicate: Ctrl+D
      if (ctrl && e.key === "d") {
        e.preventDefault();
        duplicateSelection();
        return;
      }

      // Delete / Backspace
      if (e.key === "Delete" || e.key === "Backspace") {
        deleteSelection();
        return;
      }

      // Fit view: Ctrl+Shift+F
      if (ctrl && e.shiftKey && e.key === "F") {
        e.preventDefault();
        fitView({ padding: 0.2 });
        return;
      }

      // Select all: Ctrl+A
      if (ctrl && e.key === "a") {
        e.preventDefault();
        selectAll();
        return;
      }

      // Add node: N
      if (e.key === "n" && !ctrl) {
        addNode("rectangle");
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    undo,
    redo,
    copySelection,
    pasteSelection,
    duplicateSelection,
    deleteSelection,
    selectAll,
    fitView,
    addNode,
  ]);

  return null;
}
