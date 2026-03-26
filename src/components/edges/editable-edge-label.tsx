"use client";

import { useState, useRef, useEffect } from "react";
import {
  EdgeLabelRenderer,
  Position,
  getBezierPath,
  getStraightPath,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";
import type {
  EdgeStyle,
  EdgeDashStyle,
  EdgeArrowStyle,
  DiagramEdgeData,
} from "@/store/types";
import { useDiagramStore } from "@/store/use-diagram-store";
import { MarkdownLabel } from "@/components/markdown-label";
import { blendTint } from "@/lib/utils";
import { useDark } from "@/hooks/use-dark";

const EDGE_INSET = 4;

const POSITION_OFFSET: Record<Position, [number, number]> = {
  right: [-EDGE_INSET, 0],
  left: [EDGE_INSET, 0],
  bottom: [0, -EDGE_INSET],
  top: [0, EDGE_INSET],
};

function insetEndpoints<
  T extends {
    sourceX: number;
    sourceY: number;
    targetX: number;
    targetY: number;
    sourcePosition: string;
    targetPosition: string;
  },
>(params: T): T {
  const [sdx, sdy] = POSITION_OFFSET[params.sourcePosition as Position] ?? [
    0, 0,
  ];
  const [tdx, tdy] = POSITION_OFFSET[params.targetPosition as Position] ?? [
    0, 0,
  ];
  return {
    ...params,
    sourceX: params.sourceX + sdx,
    sourceY: params.sourceY + sdy,
    targetX: params.targetX + tdx,
    targetY: params.targetY + tdy,
  };
}

type PathParams = {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: Position;
  targetPosition: Position;
};

function computePath(
  edgeStyle: EdgeStyle,
  params: PathParams,
): [string, number, number, number, number] {
  const p = insetEndpoints(params);
  switch (edgeStyle) {
    case "straight":
      return getStraightPath(p);
    case "smoothstep":
      return getSmoothStepPath(p);
    default:
      return getBezierPath(p);
  }
}

function getDasharray(
  dashStyle: EdgeDashStyle,
  sw: number,
): string | undefined {
  if (dashStyle === "dashed") return `${sw * 5} ${sw * 3}`;
  if (dashStyle === "dotted") return `${sw} ${sw * 2.5}`;
  return undefined;
}

// ---------------------------------------------------------------------------
// Pure-math path sampling — no DOM required, so arrows are always in sync
// ---------------------------------------------------------------------------

// Numerically find the t parameter on a cubic bezier where arc length = targetLen,
// using binary search. Returns [x, y, angleDeg].
function sampleCubicBezier(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  fraction: number, // 0..1 of total arc length
): { x: number; y: number; angle: number } {
  // Approximate arc length with N segments, then binary-search for the right t
  const N = 100;
  const pts: { x: number; y: number; len: number }[] = [
    { x: x0, y: y0, len: 0 },
  ];
  for (let i = 1; i <= N; i++) {
    const t = i / N;
    const mt = 1 - t;
    const x =
      mt ** 3 * x0 + 3 * mt ** 2 * t * x1 + 3 * mt * t ** 2 * x2 + t ** 3 * x3;
    const y =
      mt ** 3 * y0 + 3 * mt ** 2 * t * y1 + 3 * mt * t ** 2 * y2 + t ** 3 * y3;
    const prev = pts[pts.length - 1];
    pts.push({ x, y, len: prev.len + Math.hypot(x - prev.x, y - prev.y) });
  }
  const totalLen = pts[pts.length - 1].len;
  const targetLen = totalLen * fraction;

  // Find segment containing targetLen
  let lo = 0,
    hi = N;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (pts[mid].len < targetLen) lo = mid;
    else hi = mid;
  }
  const seg = pts[hi].len - pts[lo].len;
  const f = seg < 0.0001 ? 0 : (targetLen - pts[lo].len) / seg;
  const x = pts[lo].x + f * (pts[hi].x - pts[lo].x);
  const y = pts[lo].y + f * (pts[hi].y - pts[lo].y);
  const angle =
    Math.atan2(pts[hi].y - pts[lo].y, pts[hi].x - pts[lo].x) * (180 / Math.PI);
  return { x, y, angle };
}

// Parse a cubic bezier path string "M sx,sy C cx1,cy1 cx2,cy2 tx,ty"
// (the format React Flow's getBezierPath produces)
function parseCubicBezier(
  d: string,
): [number, number, number, number, number, number, number, number] | null {
  const m = d.match(
    /M\s*([\d.e+-]+)[, ]([\d.e+-]+)\s*C\s*([\d.e+-]+)[, ]([\d.e+-]+)\s+([\d.e+-]+)[, ]([\d.e+-]+)\s+([\d.e+-]+)[, ]([\d.e+-]+)/i,
  );
  if (!m) return null;
  return m.slice(1, 9).map(Number) as [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ];
}

type ArrowPoint = { x: number; y: number; angle: number };

function getArrowPoints(
  edgeStyle: EdgeStyle,
  params: PathParams,
  edgePath: string,
  arrowStyle: EdgeArrowStyle,
): { forward: ArrowPoint[]; backward: ArrowPoint[] } {
  const p = insetEndpoints(params);
  const isBoth = arrowStyle === "both";

  if (edgeStyle === "straight") {
    const dx = p.targetX - p.sourceX;
    const dy = p.targetY - p.sourceY;
    if (Math.hypot(dx, dy) < 1) return { forward: [], backward: [] };
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const rev = angle + 180;
    if (isBoth) {
      return {
        forward: [{ x: p.sourceX + dx * 0.8, y: p.sourceY + dy * 0.8, angle }],
        backward: [{ x: p.sourceX + dx * 0.2, y: p.sourceY + dy * 0.2, angle: rev }],
      };
    }
    return {
      forward: [
        { x: p.sourceX + dx * 0.2, y: p.sourceY + dy * 0.2, angle },
        { x: p.sourceX + dx * 0.8, y: p.sourceY + dy * 0.8, angle },
      ],
      backward: [
        { x: p.sourceX + dx * 0.2, y: p.sourceY + dy * 0.2, angle: rev },
        { x: p.sourceX + dx * 0.8, y: p.sourceY + dy * 0.8, angle: rev },
      ],
    };
  }

  if (edgeStyle === "default") {
    const bezier = parseCubicBezier(edgePath);
    if (!bezier) return { forward: [], backward: [] };
    const [x0, y0, x1, y1, x2, y2, x3, y3] = bezier;
    const pt20 = sampleCubicBezier(x0, y0, x1, y1, x2, y2, x3, y3, 0.2);
    const pt80 = sampleCubicBezier(x0, y0, x1, y1, x2, y2, x3, y3, 0.8);
    if (isBoth) {
      return {
        forward: [{ x: pt80.x, y: pt80.y, angle: pt80.angle }],
        backward: [{ x: pt20.x, y: pt20.y, angle: pt20.angle + 180 }],
      };
    }
    return {
      forward: [
        { x: pt20.x, y: pt20.y, angle: pt20.angle },
        { x: pt80.x, y: pt80.y, angle: pt80.angle },
      ],
      backward: [
        { x: pt20.x, y: pt20.y, angle: pt20.angle + 180 },
        { x: pt80.x, y: pt80.y, angle: pt80.angle + 180 },
      ],
    };
  }

  // smoothstep: one arrow at each endpoint.
  // posToAngle = direction the path travels *leaving* that handle.
  // "right" handle: path departs rightward (0°), arrives from the left → arrow points right (0°) at target,
  // or points left (180°) back toward source.
  const posToAngle: Record<string, number> = {
    right: 0,
    left: 180,
    bottom: 90,
    top: -90,
  };
  // forward arrow at target: path arrives from opposite of targetPosition
  const targetAngle = (posToAngle[params.targetPosition] ?? 0) + 180;
  // backward arrow at source: path departs in sourcePosition direction, arrow points back
  const sourceAngle = (posToAngle[params.sourcePosition] ?? 0) + 180;
  return {
    forward: [{ x: p.targetX, y: p.targetY, angle: targetAngle }],
    backward: [{ x: p.sourceX, y: p.sourceY, angle: sourceAngle }],
  };
}

// Build a filled arrowhead with its TIP at (tx,ty) pointing in direction `angleDeg`
function chevronPath(
  tx: number,
  ty: number,
  angleDeg: number,
  size: number,
  reverse = false,
): string {
  const a = (angleDeg + (reverse ? 180 : 0)) * (Math.PI / 180);
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const wing = size * 0.5;
  const back = size * 1.8;
  const lx = tx - cos * back + -sin * wing;
  const ly = ty - sin * back + cos * wing;
  const rx = tx - cos * back + sin * wing;
  const ry = ty - sin * back - cos * wing;
  return `M ${lx},${ly} L ${tx},${ty} L ${rx},${ry} Z`;
}

export function EditableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
  selected,
  data,
}: EdgeProps) {
  const dark = useDark();
  const edgeData = data as DiagramEdgeData | undefined;
  const edgeStyle = edgeData?.edgeStyle ?? "default";
  const dashStyle: EdgeDashStyle = edgeData?.dashStyle ?? "solid";
  const arrowStyle: EdgeArrowStyle = edgeData?.arrowStyle ?? "end";
  const strokeWidth = edgeData?.strokeWidth ?? 2;
  const tint = edgeData?.tint;

  const pathParams: PathParams = {
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  };
  const [edgePath, labelX, labelY] = computePath(edgeStyle, pathParams);

  const stroke =
    tint && tint !== "transparent"
      ? blendTint(tint, dark)
      : selected
        ? "var(--color-primary)"
        : "var(--color-muted-foreground)";
  const dasharray = getDasharray(dashStyle, strokeWidth);
  const arrowSize = strokeWidth * 2.5 + 3;

  const showEnd = arrowStyle === "end" || arrowStyle === "both";
  const showStart = arrowStyle === "start" || arrowStyle === "both";

  // Pure-math arrow positions — computed synchronously, always in sync with the path
  const arrowPoints =
    showEnd || showStart
      ? getArrowPoints(edgeStyle, pathParams, edgePath, arrowStyle)
      : { forward: [], backward: [] };

  const updateEdgeLabel = useDiagramStore((s) => s.updateEdgeLabel);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(label ?? ""));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commitEdit = () => {
    setEditing(false);
    updateEdgeLabel(id, editValue);
  };

  const startEditing = () => {
    setEditValue(String(label ?? ""));
    setEditing(true);
  };

  const [hovered, setHovered] = useState(false);
  const hasLabel = Boolean(label && String(label).trim());
  const showPlus = !hasLabel && (hovered || selected);

  const sharedStrokeProps = {
    stroke,
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none" as const,
  };

  return (
    <>
      {/* Main edge line */}
      <path d={edgePath} {...sharedStrokeProps} strokeDasharray={dasharray} />

      {/* Arrow chevrons */}
      {showEnd &&
        arrowPoints.forward.map((pt, i) => (
          <path
            key={`fe-${i}`}
            d={chevronPath(pt.x, pt.y, pt.angle, arrowSize)}
            fill={stroke}
            stroke={stroke}
            strokeWidth={strokeWidth * 0.5}
            strokeLinejoin="round"
          />
        ))}
      {showStart &&
        arrowPoints.backward.map((pt, i) => (
          <path
            key={`bs-${i}`}
            d={chevronPath(pt.x, pt.y, pt.angle, arrowSize)}
            fill={stroke}
            stroke={stroke}
            strokeWidth={strokeWidth * 0.5}
            strokeLinejoin="round"
          />
        ))}

      {/* Wide transparent hit area */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={24}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />

      <EdgeLabelRenderer>
        <div
          className="absolute pointer-events-auto nodrag nopan"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            zIndex: 2000,
          }}
        >
          {editing ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitEdit();
                if (e.key === "Escape") {
                  setEditing(false);
                  setEditValue(String(label ?? ""));
                }
                e.stopPropagation();
              }}
              className="bg-background border border-border rounded px-2 py-0.5 text-xs text-center outline-none min-w-[60px]"
            />
          ) : hasLabel ? (
            <div
              className={`bg-background border rounded px-2 py-0.5 text-xs cursor-pointer min-h-[20px] ${selected ? "border-primary" : "border-transparent hover:border-border"}`}
              onDoubleClick={startEditing}
            >
              <MarkdownLabel text={String(label)} />
            </div>
          ) : (
            <button
              onClick={startEditing}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              className="w-4 h-4 rounded-full bg-background border border-border text-muted-foreground hover:text-foreground hover:border-foreground flex items-center justify-center transition-opacity"
              style={{
                fontSize: 12,
                lineHeight: 1,
                paddingBottom: 2,
                opacity: showPlus ? 1 : 0,
              }}
            >
              +
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
