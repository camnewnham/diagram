"use client";

import dynamic from "next/dynamic";
import { ReactFlowProvider } from "@xyflow/react";

const DiagramCanvas = dynamic(
  () => import("@/components/diagram-canvas").then((m) => m.DiagramCanvas),
  { ssr: false },
);

export default function EmbedPage() {
  return (
    <main style={{ width: "100vw", height: "100vh" }}>
      <ReactFlowProvider>
        <DiagramCanvas readOnly />
      </ReactFlowProvider>
    </main>
  );
}
