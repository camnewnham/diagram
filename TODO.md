- feat: right click context menu when clicking on blank canvas space. One option: "Add node"

- feat: remove top menu. use contextual menus instead, as follows:
- add grid snap, dark/light toggle to the in-built react-flow toolbar

- feat: right click on a node to show a context menu. These options should apply to all selected items (or just the individual node if no selection).
  In this toolbar:
- a button group for shapes (rect/diamond/circle).
- button group for text justification (left/center/right)
- grid of buttons for tint (present swatches to choose from -- include a transparent option)

feat: right click on edge for options. these also apply to all selected.

- button group for edge line style: (solid, dashed, arrow, arrow-reverse, arrow-bidirectional)
- button group for edge style: straight, bezier, smooth-step
- tint: preset swatches
- thickness

feat: Add an option when selecting a node or edge to make it's style the default style for future edges

feat: ctrl+a to select all (so we can bulk change styles etc.)

feat: markdown editor

- think about: how can we use a better markdown editor if we are making complex text nodes? i.e. https://uiwjs.github.io/react-md-editor/ -- could be that shift+double click opens it in a better editor. Or just add a right click option that opens the 'full 'editor.

feat: serialization
on change, serialize to the hash using messagepack + fflate. automatically load from the hash too

feat: share
add a share button to the react-flow toolbar which creates a url with the path being '/embed/'
when shared, do not permit any editing or selection, and hide the controls and minimap.

feat: embed
this project will be hosted as nextjs on vercel (static page). if any configuration is required to support embedding (i.e. in notion) ensure it is done. ideally, dark/light mode of the parent will also affect this page.

feat: ctrl + drag a handle to detach from one handle and snap to another. or drag it into empty space to delete the edge.

feat: groups. when multiple nodes are selected, ctrl+g to group them, ctrl+shift+g to remove from group. groups should be draggable, delete-able and colorable objects -- maybe they should also be a node type? They could also have handles and shapes because why not?

sec: Please note markdown needs to be sanitized if you do not completely trust your authors. Otherwise, your app is vulnerable to XSS. This can be achieved by adding rehype-sanitize as a plugin.
