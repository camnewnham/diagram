"use client";

import { useState, useEffect } from "react";

interface ModifierKeys {
  shift: boolean;
  ctrl: boolean;
  alt: boolean;
}

export function useModifierKeys(): ModifierKeys {
  const [keys, setKeys] = useState<ModifierKeys>({ shift: false, ctrl: false, alt: false });

  useEffect(() => {
    const update = (e: KeyboardEvent) => {
      setKeys((prev) => {
        if (prev.shift === e.shiftKey && prev.ctrl === e.ctrlKey && prev.alt === e.altKey) return prev;
        return { shift: e.shiftKey, ctrl: e.ctrlKey, alt: e.altKey };
      });
    };
    window.addEventListener("keydown", update);
    window.addEventListener("keyup", update);
    return () => {
      window.removeEventListener("keydown", update);
      window.removeEventListener("keyup", update);
    };
  }, []);

  return keys;
}
