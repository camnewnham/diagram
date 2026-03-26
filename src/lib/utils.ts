import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Blend a hex tint color at 30% over white (light mode) or black (dark mode),
// returning a fully-opaque rgb string.
// Used for both node fills and edge strokes so colors stay consistent.
export const transparentSwatchStyle = {
  backgroundImage:
    "linear-gradient(45deg,#ccc 25%,transparent 25%),linear-gradient(-45deg,#ccc 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#ccc 75%),linear-gradient(-45deg,transparent 75%,#ccc 75%)",
  backgroundSize: "6px 6px",
  backgroundPosition: "0 0,0 3px,3px -3px,-3px 0px",
};

export function blendTint(hex: string, dark?: boolean): string {
  const isDark =
    dark ??
    (typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark"));
  const bg = isDark ? 0 : 255;
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h.slice(0, 6);
  const r = Math.round(parseInt(full.slice(0, 2), 16) * 0.5 + bg * 0.5);
  const g = Math.round(parseInt(full.slice(2, 4), 16) * 0.5 + bg * 0.5);
  const b = Math.round(parseInt(full.slice(4, 6), 16) * 0.5 + bg * 0.5);
  return `rgb(${r},${g},${b})`;
}
