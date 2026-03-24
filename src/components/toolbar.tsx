"use client";

import {
  Square,
  Diamond,
  Circle,
  ZoomIn,
  ZoomOut,
  Maximize,
  Undo2,
  Redo2,
  Grid3X3,
  Copy,
  Clipboard,
  Sun,
  Moon,
  Monitor,
  Spline,
  Minus,
  Workflow,
} from "lucide-react";
import { useReactFlow } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { useDiagramStore } from "@/store/use-diagram-store";
import type { NodeShape } from "@/store/types";
import { EDGE_STYLE_LABELS } from "@/store/types";
import { useState, useEffect } from "react";

export function Toolbar() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const addNode = useDiagramStore((s) => s.addNode);
  const undo = useDiagramStore((s) => s.undo);
  const redo = useDiagramStore((s) => s.redo);
  const copySelection = useDiagramStore((s) => s.copySelection);
  const pasteSelection = useDiagramStore((s) => s.pasteSelection);
  const past = useDiagramStore((s) => s.past);
  const future = useDiagramStore((s) => s.future);
  const edgeStyle = useDiagramStore((s) => s.edgeStyle);
  const cycleEdgeStyle = useDiagramStore((s) => s.cycleEdgeStyle);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [theme, setTheme] = useState<"system" | "light" | "dark">("system");

  useEffect(() => {
    const applyTheme = (t: "system" | "light" | "dark") => {
      if (t === "system") {
        const prefersDark = window.matchMedia(
          "(prefers-color-scheme: dark)",
        ).matches;
        document.documentElement.classList.toggle("dark", prefersDark);
      } else {
        document.documentElement.classList.toggle("dark", t === "dark");
      }
    };
    applyTheme(theme);

    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e: MediaQueryListEvent) => {
        document.documentElement.classList.toggle("dark", e.matches);
      };
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [theme]);

  const shapeButtons: {
    shape: NodeShape;
    icon: typeof Square;
    label: string;
  }[] = [
    { shape: "rectangle", icon: Square, label: "Rectangle" },
    { shape: "diamond", icon: Diamond, label: "Diamond" },
    { shape: "circle", icon: Circle, label: "Circle" },
  ];

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-background/90 backdrop-blur border border-border rounded-lg p-1 shadow-md">
      {/* Node shapes */}
      {shapeButtons.map(({ shape, icon: Icon, label }) => (
        <Button
          key={shape}
          variant="ghost"
          size="icon-sm"
          onClick={() => addNode(shape)}
          title={`Add ${label}`}
        >
          <Icon className="size-4" />
        </Button>
      ))}

      <div className="w-px h-5 bg-border mx-1" />

      {/* Clipboard */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={copySelection}
        title="Copy (Ctrl+C)"
      >
        <Copy className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => pasteSelection()}
        title="Paste (Ctrl+V)"
      >
        <Clipboard className="size-4" />
      </Button>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Undo / Redo */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={undo}
        disabled={past.length === 0}
        title="Undo (Ctrl+Z)"
      >
        <Undo2 className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={redo}
        disabled={future.length === 0}
        title="Redo (Ctrl+Shift+Z)"
      >
        <Redo2 className="size-4" />
      </Button>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Zoom */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => zoomIn()}
        title="Zoom In"
      >
        <ZoomIn className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => zoomOut()}
        title="Zoom Out"
      >
        <ZoomOut className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => fitView({ padding: 0.2 })}
        title="Fit to Screen"
      >
        <Maximize className="size-4" />
      </Button>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Snap to grid */}
      <Button
        variant={snapToGrid ? "secondary" : "ghost"}
        size="icon-sm"
        onClick={() => {
          setSnapToGrid(!snapToGrid);
          window.dispatchEvent(
            new CustomEvent("diagram:snap", { detail: !snapToGrid }),
          );
        }}
        title="Snap to Grid"
      >
        <Grid3X3 className="size-4" />
      </Button>

      {/* Edge style */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={cycleEdgeStyle}
        title={`Edge Style: ${EDGE_STYLE_LABELS[edgeStyle]}`}
      >
        {edgeStyle === "default" && <Spline className="size-4" />}
        {edgeStyle === "straight" && <Minus className="size-4" />}
        {edgeStyle === "smoothstep" && <Workflow className="size-4" />}
      </Button>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Theme: system / light / dark */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => {
          const next =
            theme === "system"
              ? "light"
              : theme === "light"
                ? "dark"
                : "system";
          setTheme(next);
        }}
        title={`Theme: ${theme}`}
      >
        {theme === "system" && <Monitor className="size-4" />}
        {theme === "light" && <Sun className="size-4" />}
        {theme === "dark" && <Moon className="size-4" />}
      </Button>
    </div>
  );
}
