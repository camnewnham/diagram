"use client";

import { useRef } from "react";
import { Spline, Minus, Workflow } from "lucide-react";
import { useDiagramStore } from "@/store/use-diagram-store";
import type { EdgeStyle, EdgeDashStyle, EdgeArrowStyle } from "@/store/types";
import { TINT_SWATCHES } from "@/store/types";
import { blendTint, transparentSwatchStyle } from "@/lib/utils";
import { useDark } from "@/hooks/use-dark";
import { useContextMenuClose } from "@/hooks/use-context-menu-close";

interface EdgeContextMenuProps {
  x: number;
  y: number;
  edgeId: string;
  onClose: () => void;
}

const ROUTING_STYLES: { style: EdgeStyle; icon: typeof Spline; label: string }[] = [
  { style: "default", icon: Spline, label: "Bezier" },
  { style: "straight", icon: Minus, label: "Straight" },
  { style: "smoothstep", icon: Workflow, label: "Smooth Step" },
];

const DASH_STYLES: { style: EdgeDashStyle; label: string }[] = [
  { style: "solid", label: "Solid" },
  { style: "dashed", label: "Dashed" },
  { style: "dotted", label: "Dotted" },
];

const ARROW_STYLES: { style: EdgeArrowStyle; label: string }[] = [
  { style: "none", label: "None" },
  { style: "start", label: "Forward" },
  { style: "end", label: "Reverse" },
  { style: "both", label: "Both" },
];

const STROKE_WIDTHS = [1, 2, 3, 4, 6];

const activeClass = "bg-primary text-primary-foreground";
const idleClass = "hover:bg-accent hover:text-accent-foreground";
const btnBase = "flex-1 flex items-center justify-center p-1.5 rounded transition-colors";

function DashIcon({ style }: { style: EdgeDashStyle }) {
  const y = 6;
  if (style === "solid") return (
    <svg width="24" height="12" viewBox="0 0 24 12">
      <line x1="2" y1={y} x2="22" y2={y} stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
  if (style === "dashed") return (
    <svg width="24" height="12" viewBox="0 0 24 12">
      <line x1="2" y1={y} x2="22" y2={y} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="5 3" />
    </svg>
  );
  // dotted
  return (
    <svg width="24" height="12" viewBox="0 0 24 12">
      <line x1="2" y1={y} x2="22" y2={y} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="1 4" />
    </svg>
  );
}

function ArrowIcon({ style }: { style: EdgeArrowStyle }) {
  const y = 6;
  const aw = 5; // arrow half-width
  if (style === "none") return (
    <svg width="24" height="12" viewBox="0 0 24 12">
      <line x1="2" y1={y} x2="22" y2={y} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
  if (style === "end") return (
    <svg width="24" height="12" viewBox="0 0 24 12">
      <line x1="5" y1={y} x2="22" y2={y} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <polyline points={`${2 + aw},${y - aw} 2,${y} ${2 + aw},${y + aw}`} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (style === "start") return (
    <svg width="24" height="12" viewBox="0 0 24 12">
      <line x1="2" y1={y} x2="19" y2={y} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <polyline points={`${22 - aw},${y - aw} 22,${y} ${22 - aw},${y + aw}`} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  // both
  return (
    <svg width="24" height="12" viewBox="0 0 24 12">
      <line x1="5" y1={y} x2="19" y2={y} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <polyline points={`${2 + aw},${y - aw} 2,${y} ${2 + aw},${y + aw}`} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={`${22 - aw},${y - aw} 22,${y} ${22 - aw},${y + aw}`} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function EdgeContextMenu({ x, y, edgeId, onClose }: EdgeContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  useContextMenuClose(ref, onClose);
  const edges = useDiagramStore((s) => s.edges);
  const updateEdgeData = useDiagramStore((s) => s.updateEdgeData);
  const updateSelectedEdgesData = useDiagramStore((s) => s.updateSelectedEdgesData);
  const applyEdgeAsDefault = useDiagramStore((s) => s.applyEdgeAsDefault);
  const pushHistory = useDiagramStore((s) => s.pushHistory);

  const dark = useDark();
  const edge = edges.find((e) => e.id === edgeId);
  const isSelected = edge?.selected;
  const selectedCount = isSelected ? edges.filter((e) => e.selected).length : 0;
  const affectsAll = selectedCount > 1;

  const currentRoutingStyle: EdgeStyle = (edge?.data?.edgeStyle as EdgeStyle) ?? "default";
  const currentDashStyle: EdgeDashStyle = (edge?.data?.dashStyle as EdgeDashStyle) ?? "solid";
  const currentArrowStyle: EdgeArrowStyle = (edge?.data?.arrowStyle as EdgeArrowStyle) ?? "end";
  const currentStrokeWidth: number = (edge?.data?.strokeWidth as number) ?? 2;
  const currentTint: string = (edge?.data?.tint as string) ?? "transparent";

  function apply(data: Record<string, unknown>) {
    pushHistory();
    if (affectsAll) updateSelectedEdgesData(data);
    else updateEdgeData(edgeId, data);
  }

  return (
    <div
      ref={ref}
      style={{ position: "fixed", top: y, left: x, zIndex: 9999 }}
      className="min-w-[190px] rounded-md border border-border bg-popover py-2 px-2 shadow-lg text-sm text-popover-foreground flex flex-col gap-2"
    >
      {affectsAll && (
        <p className="text-xs text-muted-foreground px-1 pb-0.5 border-b border-border">
          Editing {selectedCount} selected edges
        </p>
      )}

      {/* Line dash */}
      <div>
        <p className="text-xs text-muted-foreground px-1 mb-1">Line</p>
        <div className="flex gap-1">
          {DASH_STYLES.map(({ style, label }) => (
            <button
              key={style}
              title={label}
              onClick={() => apply({ dashStyle: style })}
              className={`${btnBase} ${currentDashStyle === style && !affectsAll ? activeClass : idleClass}`}
            >
              <DashIcon style={style} />
            </button>
          ))}
        </div>
      </div>

      {/* Arrow direction */}
      <div>
        <p className="text-xs text-muted-foreground px-1 mb-1">Arrow</p>
        <div className="flex gap-1">
          {ARROW_STYLES.map(({ style, label }) => (
            <button
              key={style}
              title={label}
              onClick={() => apply({ arrowStyle: style })}
              className={`${btnBase} ${currentArrowStyle === style && !affectsAll ? activeClass : idleClass}`}
            >
              <ArrowIcon style={style} />
            </button>
          ))}
        </div>
      </div>

      {/* Routing */}
      <div>
        <p className="text-xs text-muted-foreground px-1 mb-1">Routing</p>
        <div className="flex gap-1">
          {ROUTING_STYLES.map(({ style, icon: Icon, label }) => (
            <button
              key={style}
              title={label}
              onClick={() => apply({ edgeStyle: style })}
              className={`${btnBase} ${currentRoutingStyle === style && !affectsAll ? activeClass : idleClass}`}
            >
              <Icon className="size-4" />
            </button>
          ))}
        </div>
      </div>

      {/* Thickness */}
      <div>
        <p className="text-xs text-muted-foreground px-1 mb-1">Thickness</p>
        <div className="flex gap-1 items-center">
          {STROKE_WIDTHS.map((w) => (
            <button
              key={w}
              title={`${w}px`}
              onClick={() => apply({ strokeWidth: w })}
              className={`flex-1 flex items-center justify-center py-1.5 rounded transition-colors ${currentStrokeWidth === w && !affectsAll ? activeClass : idleClass}`}
            >
              <div className="rounded-full bg-current" style={{ width: 20, height: w }} />
            </button>
          ))}
        </div>
      </div>

      {/* Color */}
      <div>
        <p className="text-xs text-muted-foreground px-1 mb-1">Color</p>
        <div className="grid grid-cols-5 gap-1">
          {TINT_SWATCHES.map(({ label, value }) => (
            <button
              key={value}
              title={label}
              onClick={() => apply({ tint: value })}
              className={`w-7 h-7 rounded border-2 transition-all ${
                currentTint === value && !affectsAll ? "border-primary scale-110" : "border-border hover:scale-110"
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
          onClick={() => { applyEdgeAsDefault(edgeId); onClose(); }}
        >
          Set as default style
        </button>
      </div>
    </div>
  );
}
