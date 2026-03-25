"use client";

import { useEffect, useRef } from "react";

interface CanvasContextMenuProps {
  x: number;
  y: number;
  onAddNode: () => void;
  onClose: () => void;
}

export function CanvasContextMenu({ x, y, onAddNode, onClose }: CanvasContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{ position: "fixed", top: y, left: x, zIndex: 1000 }}
      className="min-w-[140px] rounded-md border border-border bg-popover py-1 shadow-md text-sm text-popover-foreground"
    >
      <button
        className="w-full px-3 py-1.5 text-left hover:bg-accent hover:text-accent-foreground transition-colors"
        onClick={() => {
          onAddNode();
          onClose();
        }}
      >
        Add node
      </button>
    </div>
  );
}
