"use client";

import { useRef } from "react";
import { Square, Diamond, Circle, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { useDiagramStore } from "@/store/use-diagram-store";
import type { NodeShape, TextAlign } from "@/store/types";
import { TINT_SWATCHES } from "@/store/types";
import { blendTint, transparentSwatchStyle } from "@/lib/utils";
import { useDark } from "@/hooks/use-dark";
import { useContextMenuClose } from "@/hooks/use-context-menu-close";

const SHAPES: { shape: NodeShape; icon: typeof Square; label: string }[] = [
  { shape: "rectangle", icon: Square, label: "Rectangle" },
  { shape: "diamond", icon: Diamond, label: "Diamond" },
  { shape: "circle", icon: Circle, label: "Circle" },
];

const ALIGNS: { align: TextAlign; icon: typeof AlignLeft; label: string }[] = [
  { align: "left", icon: AlignLeft, label: "Left" },
  { align: "center", icon: AlignCenter, label: "Center" },
  { align: "right", icon: AlignRight, label: "Right" },
];

const activeClass = "bg-primary text-primary-foreground";
const idleClass = "hover:bg-accent hover:text-accent-foreground";
const btnBase = "flex-1 flex items-center justify-center p-1.5 rounded transition-colors";

interface NodeContextMenuProps {
  x: number;
  y: number;
  nodeId: string;
  onClose: () => void;
}

export function NodeContextMenu({ x, y, nodeId, onClose }: NodeContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  useContextMenuClose(ref, onClose);
  const nodes = useDiagramStore((s) => s.nodes);
  const updateSelectedNodesData = useDiagramStore((s) => s.updateSelectedNodesData);
  const updateNodeData = useDiagramStore((s) => s.updateNodeData);
  const applyNodeAsDefault = useDiagramStore((s) => s.applyNodeAsDefault);
  const pushHistory = useDiagramStore((s) => s.pushHistory);

  const dark = useDark();
  const node = nodes.find((n) => n.id === nodeId);
  const isSelected = node?.selected;
  const selectedCount = isSelected ? nodes.filter((n) => n.selected).length : 0;
  const affectsAll = selectedCount > 1;

  const currentShape = node?.data.shape ?? "rectangle";
  const currentAlign = node?.data.textAlign ?? "center";
  const currentTint = node?.data.tint ?? "transparent";

  function apply(data: Parameters<typeof updateSelectedNodesData>[0]) {
    pushHistory();
    if (affectsAll) {
      updateSelectedNodesData(data);
    } else {
      updateNodeData(nodeId, data);
    }
  }

  return (
    <div
      ref={ref}
      style={{ position: "fixed", top: y, left: x, zIndex: 9999 }}
      className="min-w-[180px] rounded-md border border-border bg-popover py-2 px-2 shadow-lg text-sm text-popover-foreground flex flex-col gap-2"
    >
      {affectsAll && (
        <p className="text-xs text-muted-foreground px-1 pb-0.5 border-b border-border">
          Editing {selectedCount} selected nodes
        </p>
      )}

      {/* Shape */}
      <div>
        <p className="text-xs text-muted-foreground px-1 mb-1">Shape</p>
        <div className="flex gap-1">
          {SHAPES.map(({ shape, icon: Icon, label }) => (
            <button
              key={shape}
              title={label}
              onClick={() => apply({ shape })}
              className={`${btnBase} ${currentShape === shape && !affectsAll ? activeClass : idleClass}`}
            >
              <Icon className="size-4" />
            </button>
          ))}
        </div>
      </div>

      {/* Text alignment */}
      <div>
        <p className="text-xs text-muted-foreground px-1 mb-1">Alignment</p>
        <div className="flex gap-1">
          {ALIGNS.map(({ align, icon: Icon, label }) => (
            <button
              key={align}
              title={label}
              onClick={() => apply({ textAlign: align })}
              className={`${btnBase} ${currentAlign === align && !affectsAll ? activeClass : idleClass}`}
            >
              <Icon className="size-4" />
            </button>
          ))}
        </div>
      </div>

      {/* Tint */}
      <div>
        <p className="text-xs text-muted-foreground px-1 mb-1">Fill</p>
        <div className="grid grid-cols-5 gap-1">
          {TINT_SWATCHES.map(({ label, value }) => (
            <button
              key={value}
              title={label}
              onClick={() => apply({ tint: value })}
              className={`w-7 h-7 rounded border-2 transition-all ${
                currentTint === value && !affectsAll
                  ? "border-primary scale-110"
                  : "border-border hover:scale-110"
              }`}
              style={
                value === "transparent"
                  ? transparentSwatchStyle
                  : { backgroundColor: blendTint(value, dark) }
              }
            />
          ))}
        </div>
      </div>

      <div className="border-t border-border pt-1">
        <button
          className="w-full px-2 py-1 text-left text-xs rounded hover:bg-accent hover:text-accent-foreground transition-colors"
          onClick={() => {
            applyNodeAsDefault(nodeId);
            onClose();
          }}
        >
          Set as default style
        </button>
      </div>
    </div>
  );
}
