"use client";

import { Grid3X3, Sun, Moon, Monitor, Share2, Check } from "lucide-react";
import { ControlButton, Controls } from "@xyflow/react";
import { useState, useEffect } from "react";

export function Toolbar() {
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [theme, setTheme] = useState<"system" | "light" | "dark">("system");
  const [copied, setCopied] = useState(false);

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

  const handleShare = async () => {
    const hash = window.location.hash;
    const url = `${window.location.origin}${hash}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      <ControlButton onClick={handleShare} title="Copy embed link">
        {copied ? (
          <Check strokeWidth={1.5} style={{ fill: "none" }} />
        ) : (
          <Share2 strokeWidth={1.5} style={{ fill: "none" }} />
        )}
      </ControlButton>
    </Controls>
  );
}
