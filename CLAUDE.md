# Diagram

A flowchart and diagramming tool.

## Stack

- **Next.js** — App Router, static export (`output: 'export'`)
- **React Flow (@xyflow/react)** — canvas, nodes, edges
- **Zustand** — state management
- **shadcn/ui** — component library
- **Tailwind CSS v4** — styling
- **react-markdown** — markdown rendering in labels (with `remark-gfm` and `rehype-raw`)
- **@msgpack/msgpack + fflate** — compact binary serialization + compression for URL hash persistence

## Project Structure

```
src/
  app/
    page.tsx              — entry point, dynamically imports DiagramCanvas (ssr: false)
    embed/
      page.tsx            — read-only embed route (/embed/), loads diagram from hash
    layout.tsx            — root layout with fonts and suppressHydrationWarning
    globals.css           — Tailwind + shadcn theme variables (light/dark + prefers-color-scheme media query)
  store/
    types.ts              — TypeScript types (DiagramNode, DiagramEdge, NodeShape, etc.)
    use-diagram-store.ts  — Zustand store: nodes, edges, history, clipboard, CRUD actions
  components/
    diagram-canvas.tsx    — main React Flow canvas; accepts readOnly prop; mounts useHashSync
    toolbar.tsx           — extends React Flow Controls panel: snap, theme toggle, share button
    keyboard-shortcuts.tsx — global keyboard shortcut handler
    markdown-label.tsx    — renders markdown text in node/edge labels
    canvas-context-menu.tsx — right-click on canvas: add rectangle/diamond/circle node
    node-context-menu.tsx — right-click on node: shape, text alignment, fill tint, set-default
    edge-context-menu.tsx — right-click on edge: line style, routing, thickness, color, set-default
    nodes/
      diagram-node.tsx    — single custom node component; hides handles/resizer in read-only mode
    edges/
      editable-edge-label.tsx — custom edge: routing style, line style (solid/dashed/arrows), stroke width, tint, double-click-to-edit label
    ui/
      button.tsx          — shadcn button component
  contexts/
    read-only-context.ts  — React context for read-only mode (used by DiagramCanvas and DiagramNode)
  lib/
    utils.ts              — cn() utility
    serialization.ts      — encode/decode diagram to/from base64url-compressed-msgpack for URL hash
  hooks/
    use-modifier-keys.ts  — tracks shift/ctrl/alt state (used for aspect-ratio-lock on resize)
    use-hash-sync.ts      — syncs diagram state to/from window.location.hash (debounced encode, load on mount)
```

## Key Patterns

- The canvas is loaded with `dynamic(..., { ssr: false })` to avoid hydration mismatches since React Flow and Zustand are client-only.
- Dark mode CSS variables are scoped to `html.dark` (not `.dark`) to prevent conflicts with React Flow's internal `.dark` class on its wrapper.
- React Flow's `colorMode` prop is synced with the `html.dark` class via a MutationObserver.
- Toolbar is embedded inside React Flow's `Controls` component (bottom-left panel) using `ControlButton`. There is no separate floating top bar.
- Toolbar communicates snap-to-grid state to the canvas via `CustomEvent` on `window`.
- All node shapes use a single `DiagramNode` component that branches on `data.shape`.
- Nodes support `tint` (fill color) and `textAlign` (left/center/right) stored in node data.
- Undo/redo uses a snapshot-based history (deep clone of nodes/edges arrays, max 100 entries).
- Edge routing style (bezier/straight/smoothstep) is stored per-edge in `data.edgeStyle`. Edge line style (solid/dashed/arrow/arrow-reverse/arrow-both), stroke width, and color tint are also stored per-edge.
- Edge arrows are rendered using inline SVG `<defs>` marker elements per edge (not React Flow's built-in markerEnd string), keyed by edge id.
- Default node style (`shape`, `tint`, `textAlign`) and default edge style (`edgeStyle`, `lineStyle`, `strokeWidth`, `tint`) are stored in Zustand and persisted to `localStorage` under `diagram:defaultNodeStyle` and `diagram:defaultEdgeStyle`.
- "Set as default style" in context menus calls `applyNodeAsDefault` / `applyEdgeAsDefault` which reads the clicked item's current style and saves it as the new default.
- Right-click on canvas → `CanvasContextMenu` (add rectangle/diamond/circle). Right-click on node → `NodeContextMenu`. Right-click on edge → `EdgeContextMenu`. All context menus close on outside click or Escape.
- When multiple nodes/edges are selected and one is right-clicked, the context menu applies changes to all selected items (via `updateSelectedNodesData` / `updateSelectedEdgesData`).
- Dragging an edge to empty canvas space creates a new connected node (`addNodeAndConnect` in the store).
- `SHAPE_SIZES` constant in the store is the single source of truth for default node dimensions — use it when adding new shapes.
- `autoEdit` flag on node data triggers immediate edit mode when a node is first created; the flag is cleared after first render.
- Diagram state is serialized to `window.location.hash` on every change (debounced 300ms) using msgpack + deflate + base64url. Loaded from hash on mount. Default-valued fields are omitted from the payload to minimize size. Numeric enums replace strings for all style values.
- The share button in the toolbar copies `origin/embed/#<hash>` to clipboard. The `/embed/` route is read-only (no editing, handles, controls, or minimap).
- `ReadOnlyContext` (boolean React context) is provided by `DiagramCanvas` and consumed by `DiagramNode` to suppress handles, resizer, and double-click editing in embed mode.
- Dark mode on the embed page follows `prefers-color-scheme` automatically via a CSS media query in `globals.css` (no JS required). The main page's toolbar still takes precedence when it sets `html.dark`.

## Commands

- `npm run dev` — start dev server
- `npm run build` — production build (static export)
- `npm run lint` — eslint

## Notes

- After implementing any new features, update this file to reflect the changes.
