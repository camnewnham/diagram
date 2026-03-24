"use client";

import { memo, useState, useCallback, useRef, useEffect } from "react";
import { Handle, Position, NodeResizer, type NodeProps } from "@xyflow/react";
import { useDiagramStore } from "@/store/use-diagram-store";
import { MarkdownLabel } from "@/components/markdown-label";
import { useModifierKeys } from "@/hooks/use-modifier-keys";
import type { DiagramNodeData } from "@/store/types";

function DiagramNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as DiagramNodeData;
  const { shape, label } = nodeData;
  const updateNodeLabel = useDiagramStore((s) => s.updateNodeLabel);
  const { shift } = useModifierKeys();
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(label);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sizerRef = useRef<HTMLDivElement>(null);
  const [contentSize, setContentSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = sizerRef.current;
    if (!el) return;
    const measure = () =>
      setContentSize({ w: el.offsetWidth, h: el.offsetHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [label]);

  useEffect(() => {
    if (!editing) return;
    const el = inputRef.current;
    const handleWheel = (e: WheelEvent) => e.stopPropagation();
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.addEventListener("wheel", handleWheel, {
        capture: true,
      });
    }, 50);
    return () => {
      el?.removeEventListener("wheel", handleWheel, { capture: true });
    };
  }, [editing]);

  // Auto-enter edit mode for newly created nodes
  useEffect(() => {
    if (nodeData.autoEdit) {
      setEditValue("");
      setEditing(true);
      useDiagramStore.getState().updateNodeData(id, { autoEdit: false });
    }
  }, [nodeData.autoEdit, id]);

  const commitEdit = useCallback(() => {
    setEditing(false);
    if (editValue.trim() !== label) {
      updateNodeLabel(id, editValue.trim() || label);
    }
  }, [editValue, id, label, updateNodeLabel]);

  const handleDoubleClick = useCallback(() => {
    setEditValue(label);
    setEditing(true);
  }, [label]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        commitEdit();
      }
      if (e.key === "Escape") {
        setEditing(false);
        setEditValue(label);
      }
      e.stopPropagation();
    },
    [commitEdit, label],
  );

  const handlePositions = [
    Position.Top,
    Position.Right,
    Position.Bottom,
    Position.Left,
  ];

  const content = editing ? (
    <textarea
      ref={inputRef}
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onBlur={commitEdit}
      onKeyDown={handleKeyDown}
      className="w-full h-full bg-transparent text-center text-sm resize-none outline-none border-none leading-snug nodrag nopan overflow-y-auto p-2"
    />
  ) : (
    <div
      onDoubleClick={handleDoubleClick}
      className="w-full h-full flex items-center justify-center p-2 cursor-text min-h-[40px]"
    >
      <MarkdownLabel text={label} />
    </div>
  );

  const handleClass = "!w-2 !h-2 !bg-muted-foreground !border-background";

  const handles = (
    <>
      {handlePositions.map((pos) => (
        <Handle
          key={`s-${pos}`}
          id={`${pos}-source`}
          type="source"
          position={pos}
          className={handleClass}
        />
      ))}
      {handlePositions.map((pos) => (
        <Handle
          key={`t-${pos}`}
          id={`${pos}-target`}
          type="target"
          position={pos}
          className={handleClass}
        />
      ))}
    </>
  );

  const borderClass = selected ? "border-primary" : "border-border";

  const minW = Math.max(80, contentSize.w + 16);
  const minH = Math.max(shape === "rectangle" ? 40 : 60, contentSize.h + 16);

  const sizer = (
    <div
      ref={sizerRef}
      style={{
        position: "fixed",
        top: -9999,
        left: -9999,
        visibility: "hidden",
        pointerEvents: "none",
      }}
      aria-hidden
    >
      <MarkdownLabel text={label} />
    </div>
  );

  if (shape === "diamond") {
    const stroke = selected ? "var(--color-primary)" : "var(--color-border)";
    return (
      <div
        className="relative w-full h-full"
        style={{ minWidth: minW, minHeight: minH }}
      >
        {sizer}
        <NodeResizer
          isVisible={selected}
          minWidth={minW}
          minHeight={minH}
          keepAspectRatio={shift}
        />
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <polygon
            points="50,0 100,50 50,100 0,50"
            fill="var(--color-background)"
            stroke={stroke}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {content}
        </div>
        {handles}
      </div>
    );
  }

  if (shape === "circle") {
    return (
      <div
        className="relative w-full h-full"
        style={{ minWidth: minW, minHeight: minH }}
      >
        {sizer}
        <NodeResizer
          isVisible={selected}
          minWidth={minW}
          minHeight={minH}
          keepAspectRatio={shift}
        />
        {handles}
        <div
          className={`w-full h-full rounded-full bg-background border-2 ${borderClass} flex items-center justify-center overflow-hidden`}
        >
          {content}
        </div>
      </div>
    );
  }

  // Default rectangle
  return (
    <div
      className="relative w-full h-full"
      style={{ minWidth: minW, minHeight: minH }}
    >
      {sizer}
      <NodeResizer
        isVisible={selected}
        minWidth={minW}
        minHeight={minH}
        keepAspectRatio={shift}
      />
      {handles}
      <div
        className={`w-full h-full bg-background border-2 ${borderClass} rounded-lg flex items-center justify-center overflow-hidden`}
      >
        {content}
      </div>
    </div>
  );
}

export const DiagramNode = memo(DiagramNodeComponent);
