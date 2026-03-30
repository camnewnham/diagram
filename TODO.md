feat: markdown editor

- think about: how can we use a better markdown editor if we are making complex text nodes? i.e. https://uiwjs.github.io/react-md-editor/ -- could be that shift+double click opens it in a better editor. Or just add a right click option that opens the 'full 'editor.

sec: Please note markdown needs to be sanitized if you do not completely trust your authors. Otherwise, your app is vulnerable to XSS. This can be achieved by adding rehype-sanitize as a plugin.

---

feat: ctrl + drag a handle to detach from one handle and snap to another. or drag it into empty space to delete the edge(s).

---

feat: groups. when multiple nodes are selected, ctrl+g to group them, ctrl+shift+g to remove from group. groups should be draggable, delete-able and colorable objects -- maybe they should also be a node type? They could also have handles and shapes because why not?

---

feat: don't allow the context menus to render off the edge of the screen.
