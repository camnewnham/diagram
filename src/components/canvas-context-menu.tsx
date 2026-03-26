"use client";

import { useRef } from "react";
import { Plus } from "lucide-react";
import { useContextMenuClose } from "@/hooks/use-context-menu-close";

interface CanvasContextMenuProps {
  x: number;
  y: number;
  onAddNode: () => void;
  onClose: () => void;
}

export function CanvasContextMenu({ x, y, onAddNode, onClose }: CanvasContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  useContextMenuClose(ref, onClose);

  return (
    <div
      ref={ref}
      style={{ position: "fixed", top: y, left: x, zIndex: 9999 }}
      className="min-w-[140px] rounded-md border border-border bg-popover py-1 shadow-md text-sm text-popover-foreground"
    >
      <button
        className="w-full px-3 py-1.5 text-left hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-2"
        onClick={() => {
          onAddNode();
          onClose();
        }}
      >
        <Plus className="size-4 shrink-0" />
        Add node
      </button>
    </div>
  );
}
