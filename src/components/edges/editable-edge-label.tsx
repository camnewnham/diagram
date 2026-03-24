"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getStraightPath,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";
import type { EdgeStyle } from "@/store/types";
import { useDiagramStore } from "@/store/use-diagram-store";
import { MarkdownLabel } from "@/components/markdown-label";

function computePath(
  edgeStyle: EdgeStyle,
  params: {
    sourceX: number;
    sourceY: number;
    targetX: number;
    targetY: number;
    sourcePosition: any;
    targetPosition: any;
  },
): [string, number, number, number, number] {
  switch (edgeStyle) {
    case "straight":
      return getStraightPath(params);
    case "smoothstep":
      return getSmoothStepPath(params);
    default:
      return getBezierPath(params);
  }
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
  style,
  markerEnd,
  data,
}: EdgeProps) {
  const edgeStyle = (data?.edgeStyle as EdgeStyle) ?? "default";
  const [edgePath, labelX, labelY] = computePath(edgeStyle, {
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

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

  const commitEdit = useCallback(() => {
    setEditing(false);
    updateEdgeLabel(id, editValue);
  }, [editValue, id, updateEdgeLabel]);

  const startEditing = useCallback(() => {
    setEditValue(String(label ?? ""));
    setEditing(true);
  }, [label]);

  const [hovered, setHovered] = useState(false);
  const hasLabel = Boolean(label && String(label).trim());
  const showPlus = !hasLabel && (hovered || selected);

  return (
    <>
      <BaseEdge path={edgePath} style={style} markerEnd={markerEnd} />
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
            zIndex: selected ? 1002 : 1001,
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
