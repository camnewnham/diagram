"use client";

import { memo, useState, useCallback, useRef, useEffect, useContext } from "react";
import { Handle, Position, NodeResizer, type NodeProps } from "@xyflow/react";
import { useDiagramStore, interactingRef } from "@/store/use-diagram-store";
import { MarkdownLabel } from "@/components/markdown-label";
import { useModifierKeys } from "@/hooks/use-modifier-keys";
import type { DiagramNodeData, TextAlign } from "@/store/types";
import { blendTint } from "@/lib/utils";
import { useDark } from "@/hooks/use-dark";
import { ReadOnlyContext } from "@/contexts/read-only-context";
import { flushHashEncode } from "@/hooks/use-hash-sync";

function DiagramNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as DiagramNodeData;
  const { shape, label, tint, textAlign } = nodeData;
  const dark = useDark();
  const readOnly = useContext(ReadOnlyContext);
  const updateNodeLabel = useDiagramStore((s) => s.updateNodeLabel);
  const updateNodeStyle = useDiagramStore((s) => s.updateNodeStyle);
  const pushHistory = useDiagramStore((s) => s.pushHistory);
  const storedHeight = useDiagramStore((s) => s.nodes.find((n) => n.id === id)?.style?.height as number | undefined);
  const { shift } = useModifierKeys();
  const [hovered, setHovered] = useState(false);
  const handleMouseEnter = useCallback(() => setHovered(true), []);
  const handleMouseLeave = useCallback(() => setHovered(false), []);
  const [editing, setEditing] = useState(() => !!nodeData.autoEdit);
  const [editValue, setEditValue] = useState(() => nodeData.autoEdit ? "" : label);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sizerRef = useRef<HTMLDivElement>(null);
  const [contentH, setContentH] = useState(0);

  useEffect(() => {
    const el = sizerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => setContentH(el.offsetHeight));
    obs.observe(el);
    setContentH(el.offsetHeight);
    return () => obs.disconnect();
  }, []);

  // When content height exceeds the stored node height, update the stored height
  // so React Flow repositions edges to match the actual rendered node size.
  useEffect(() => {
    if (readOnly) return;
    const needed = contentH + 16;
    if (storedHeight !== undefined && needed > storedHeight) {
      updateNodeStyle(id, { height: needed });
    }
  }, [contentH, storedHeight, id, readOnly, updateNodeStyle]);

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

  // Clear the autoEdit flag after first render
  useEffect(() => {
    if (nodeData.autoEdit) {
      useDiagramStore.getState().updateNodeData(id, { autoEdit: false });
    }
  }, [nodeData.autoEdit, id]);

  const commitEdit = useCallback(() => {
    setEditing(false);
    if (editValue.trim() !== label) {
      updateNodeLabel(id, editValue.trim());
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

  const alignClass: Record<TextAlign, string> = {
    left: "text-left justify-start",
    center: "text-center justify-center",
    right: "text-right justify-end",
  };
  const resolvedAlign = textAlign ?? "center";
  const textAlignClass = alignClass[resolvedAlign];

  const fillColor = tint && tint !== "transparent" ? blendTint(tint, dark) : undefined;

  const content = (!readOnly && editing) ? (
    <textarea
      ref={inputRef}
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onBlur={commitEdit}
      onKeyDown={handleKeyDown}
      className={`w-full h-full bg-transparent text-sm resize-none outline-none border-none leading-snug nodrag nopan overflow-y-auto p-2 ${alignClass[resolvedAlign].split(" ")[0]}`}
    />
  ) : (
    <div
      onDoubleClick={readOnly ? undefined : handleDoubleClick}
      className={`w-full h-full flex items-center p-2 ${readOnly ? "" : "cursor-text "}min-h-[40px] ${textAlignClass}`}
    >
      <MarkdownLabel text={label} />
    </div>
  );

  const handleClass = `!w-2 !h-2 !border-background ${selected ? "!bg-primary" : "!bg-muted-foreground"}`;
  const handleStyle: React.CSSProperties = { opacity: hovered || selected ? 1 : 0, transition: "opacity 0.15s" };

  const hiddenHandleStyle: React.CSSProperties = { opacity: 0, pointerEvents: "none", background: "transparent", border: "none" };
  const handles = readOnly ? (
    <>
      {handlePositions.map((pos) => (
        <Handle key={`s-${pos}`} id={`${pos}-source`} type="source" position={pos} className={handleClass} style={hiddenHandleStyle} />
      ))}
      {handlePositions.map((pos) => (
        <Handle key={`t-${pos}`} id={`${pos}-target`} type="target" position={pos} className={handleClass} style={hiddenHandleStyle} />
      ))}
    </>
  ) : (
    <>
      {handlePositions.map((pos) => (
        <Handle
          key={`s-${pos}`}
          id={`${pos}-source`}
          type="source"
          position={pos}
          className={handleClass}
          style={handleStyle}
        />
      ))}
      {handlePositions.map((pos) => (
        <Handle
          key={`t-${pos}`}
          id={`${pos}-target`}
          type="target"
          position={pos}
          className={handleClass}
          style={handleStyle}
        />
      ))}
    </>
  );

  const borderClass = selected ? "border-primary" : "border-muted-foreground";

  const minW = 120;
  const minH = Math.max(shape === "rectangle" ? 40 : 60, contentH + 16);

  const sizer = (
    <div
      ref={sizerRef}
      className="absolute invisible pointer-events-none w-full p-2 text-sm leading-snug"
      aria-hidden
    >
      <MarkdownLabel text={label} />
    </div>
  );


  if (shape === "diamond") {
    const stroke = selected ? "var(--color-primary)" : "var(--color-muted-foreground)";
    const polygonFill = fillColor ?? "var(--color-background)";
    return (
      <div
        className="relative w-full h-full"
        style={{ minWidth: minW, minHeight: minH }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >

        {sizer}
        {!readOnly && <NodeResizer isVisible={selected} minWidth={minW} minHeight={minH} keepAspectRatio={shift} onResizeStart={() => { pushHistory(); interactingRef.current = true; }} onResizeEnd={() => { interactingRef.current = false; flushHashEncode(); }} />}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <polygon
            points="50,0 100,50 50,100 0,50"
            fill={polygonFill}
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
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >

        {sizer}
        {!readOnly && <NodeResizer isVisible={selected} minWidth={minW} minHeight={minH} keepAspectRatio={shift} onResizeStart={() => { pushHistory(); interactingRef.current = true; }} onResizeEnd={() => { interactingRef.current = false; flushHashEncode(); }} />}
        {handles}
        <div
          className={`w-full h-full rounded-full border-2 ${borderClass} flex items-center justify-center overflow-hidden`}
          style={{ backgroundColor: fillColor ?? "var(--color-background)" }}
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
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {sizer}
      {!readOnly && <NodeResizer isVisible={selected} minWidth={minW} minHeight={minH} keepAspectRatio={shift} onResizeStart={() => { pushHistory(); interactingRef.current = true; }} onResizeEnd={() => { interactingRef.current = false; flushHashEncode(); }} />}
      {handles}
      <div
        className={`w-full h-full border-2 ${borderClass} rounded-lg flex items-center justify-center overflow-hidden`}
        style={{ backgroundColor: fillColor ?? "var(--color-background)" }}
      >
        {content}
      </div>
    </div>
  );
}

export const DiagramNode = memo(DiagramNodeComponent);
