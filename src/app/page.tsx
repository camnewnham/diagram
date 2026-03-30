"use client";

import dynamic from "next/dynamic";
import { ReactFlowProvider } from "@xyflow/react";

const DiagramCanvas = dynamic(
  () => import("@/components/diagram-canvas").then((m) => m.DiagramCanvas),
  { ssr: false },
);

const isEmbedded = typeof window !== "undefined" && window.self !== window.top;

export default function Home() {
  return (
    <main style={{ width: "100vw", height: "100vh" }}>
      <ReactFlowProvider>
        <DiagramCanvas readOnly={isEmbedded} />
      </ReactFlowProvider>
    </main>
  );
}
