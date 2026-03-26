"use client";

import { Grid3X3, Sun, Moon, Monitor } from "lucide-react";
import { ControlButton, Controls } from "@xyflow/react";
import { useState, useEffect } from "react";

export function Toolbar() {
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

  const toggleSnap = () => {
    const next = !snapToGrid;
    setSnapToGrid(next);
    window.dispatchEvent(new CustomEvent("diagram:snap", { detail: next }));
  };

  const cycleTheme = () => {
    setTheme((t) =>
      t === "system" ? "light" : t === "light" ? "dark" : "system",
    );
  };

  return (
    <Controls showInteractive={false}>
      <ControlButton
        onClick={toggleSnap}
        title="Snap to Grid"
        style={{
          background: snapToGrid ? "var(--background)" : undefined,
        }}
      >
        <Grid3X3 strokeWidth={1.5} style={{ fill: "none" }} />
      </ControlButton>
      <ControlButton onClick={cycleTheme} title={`Theme: ${theme}`}>
        {theme === "system" && (
          <Monitor strokeWidth={1.5} style={{ fill: "none" }} />
        )}
        {theme === "light" && (
          <Sun strokeWidth={1.5} style={{ fill: "none" }} />
        )}
        {theme === "dark" && (
          <Moon strokeWidth={1.5} style={{ fill: "none" }} />
        )}
      </ControlButton>
    </Controls>
  );
}
