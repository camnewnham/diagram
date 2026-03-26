"use client";

import { useState, useEffect } from "react";

export function useDark(): boolean {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const sync = () => {
      const isDark = document.documentElement.classList.contains("dark");
      setDark((prev) => (prev === isDark ? prev : isDark));
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return dark;
}
