# Diagram

A flowchart and diagramming tool.

## Stack

- **Next.js** — App Router, static export (`output: 'export'`)
- **React Flow (@xyflow/react)** — canvas, nodes, edges
- **Zustand** — state management
- **shadcn/ui** — component library
- **Tailwind CSS v4** — styling
- **react-markdown** — markdown rendering in labels (with `remark-gfm` and `rehype-raw`)

## Project Structure

```
src/
  app/
    page.tsx              — entry point, dynamically imports DiagramCanvas (ssr: false)
    layout.tsx            — root layout with fonts and suppressHydrationWarning
    globals.css           — Tailwind + shadcn theme variables (light/dark)
  store/
    types.ts              — TypeScript types (DiagramNode, DiagramEdge, NodeShape, etc.)
    use-diagram-store.ts  — Zustand store: nodes, edges, history, clipboard, CRUD actions
  components/
    diagram-canvas.tsx    — main React Flow canvas with background, controls, minimap
    toolbar.tsx           — top toolbar: shapes, clipboard, undo/redo, zoom, snap, theme toggle
    keyboard-shortcuts.tsx — global keyboard shortcut handler
    markdown-label.tsx    — renders markdown text in node/edge labels
    nodes/
      diagram-node.tsx    — single custom node component supporting rectangle, diamond, circle shapes
    edges/
      editable-edge-label.tsx — custom edge with selectable routing style and double-click-to-edit label
    ui/
      button.tsx          — shadcn button component
  lib/
    utils.ts              — cn() utility
  hooks/
    use-modifier-keys.ts  — tracks shift/ctrl/alt state (used for aspect-ratio-lock on resize)
```

## Key Patterns

- The canvas is loaded with `dynamic(..., { ssr: false })` to avoid hydration mismatches since React Flow and Zustand are client-only.
- Dark mode CSS variables are scoped to `html.dark` (not `.dark`) to prevent conflicts with React Flow's internal `.dark` class on its wrapper.
- React Flow's `colorMode` prop is synced with the `html.dark` class via a MutationObserver.
- Toolbar communicates snap-to-grid state to the canvas via `CustomEvent` on `window`.
- All node shapes use a single `DiagramNode` component that branches on `data.shape`.
- Undo/redo uses a snapshot-based history (deep clone of nodes/edges arrays, max 100 entries).
- Edge routing style (bezier/straight/smoothstep) is stored per-edge in `data.edgeStyle` and cycled globally via the toolbar. New edges inherit the current global style.
- Dragging an edge to empty canvas space creates a new connected node (`addNodeAndConnect` in the store).
- `SHAPE_SIZES` constant in the store is the single source of truth for default node dimensions — use it when adding new shapes.
- `autoEdit` flag on node data triggers immediate edit mode when a node is first created; the flag is cleared after first render.

## Commands

- `npm run dev` — start dev server
- `npm run build` — production build (static export)
- `npm run lint` — eslint

## Notes

- After implementing any new features, update this file to reflect the changes.
