# Features

| Done                    | Feature                                            | Category                          | Complexity     |
| ----------------------- | -------------------------------------------------- | --------------------------------- | -------------- |
| **Canvas & Navigation** |                                                    |                                   |                |
| [x]                     | Pan & zoom                                         | React Flow built-in               | Out of the box |
| [x]                     | Minimap                                            | React Flow built-in               | Out of the box |
| [x]                     | Fit-to-screen / zoom to selection                  | React Flow built-in               | Out of the box |
| [x]                     | Snap to grid                                       | React Flow built-in               | Out of the box |
| [ ]                     | Alignment guides (smart snap while dragging)       | Common pattern                    | Moderate       |
| **Nodes**               |                                                    |                                   |                |
| [x]                     | Add nodes                                          | Common pattern                    | Simple         |
| [ ]                     | Drag edge to empty space to create connected node  | Common pattern                    | Moderate       |
| [x]                     | Resize nodes (drag handles)                        | React Flow built-in (NodeResizer) | Out of the box |
| [ ]                     | Change node color (tint)                           | Common pattern                    | Simple         |
| [ ]                     | Change text justification                          | Common pattern                    | Simple         |
| [ ]                     | Group nodes (outline with tinted background)       | Common pattern                    | Moderate       |
| [x]                     | Node shape (diamond/circle)                        | Common pattern                    | Simple         |
| [x]                     | Floating text (label-only node)                    | Common pattern                    | Simple         |
| **Edges**               |                                                    |                                   |                |
| [x]                     | Connect nodes with edges                           | React Flow built-in               | Out of the box |
| [x]                     | Add labels to edges                                | React Flow built-in               | Out of the box |
| [ ]                     | Change edge style (solid, dashed, dotted)          | Common pattern                    | Simple         |
| [ ]                     | Arrow style (none, forward, backward, both)        | Common pattern                    | Simple         |
| [ ]                     | Dynamic routing (auto handle selection)            | Common pattern                    | Moderate       |
| [ ]                     | Manual routing (user-selected handles)             | Common pattern                    | Moderate       |
| [ ]                     | Orthogonal / elbow routing (right-angle edges)     | Common pattern                    | Moderate       |
| [ ]                     | Self-loops                                         | Common pattern                    | Moderate       |
| **Text & Markdown**     |                                                    |                                   |                |
| [x]                     | Markdown formatting on all visible text            | Common pattern                    | Moderate       |
| **Selection & Editing** |                                                    |                                   |                |
| [x]                     | Multi-select (box select, shift-click)             | React Flow built-in               | Out of the box |
| [x]                     | Copy / paste nodes and edges                       | Common pattern                    | Moderate       |
| [ ]                     | Duplicate                                          | Common pattern                    | Simple         |
| [x]                     | Delete selected                                    | React Flow built-in               | Out of the box |
| [ ]                     | Align / distribute selected nodes                  | Common pattern                    | Moderate       |
| **History**             |                                                    |                                   |                |
| [x]                     | Undo / redo                                        | Common pattern                    | Moderate       |
| **Export & Sharing**    |                                                    |                                   |                |
| [ ]                     | Serialize scene to URL hash (MessagePack + fflate) | Custom                            | Complex        |
| [ ]                     | Read-only share link                               | Common pattern                    | Simple         |
| [ ]                     | Export as PNG                                      | Common pattern                    | Moderate       |
| [ ]                     | Export as SVG                                      | Common pattern                    | Moderate       |
| [ ]                     | Copy as image to clipboard                         | Common pattern                    | Moderate       |
| **Organization**        |                                                    |                                   |                |
| [ ]                     | Diagram title                                      | Common pattern                    | Simple         |
| [x]                     | Keyboard shortcuts                                 | Common pattern                    | Simple         |
| [ ]                     | Context menu (right-click)                         | Common pattern                    | Moderate       |
