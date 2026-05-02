# Tutorial 9: Portals and Fragments

## Portals — Rendering Outside the Tree

### The Problem

Sometimes you need to render elements outside the React tree's DOM hierarchy:
- **Modals** that overlay the entire page (not just the parent component)
- **Tooltips** that shouldn't be affected by parent `overflow: hidden`
- **Toast notifications** at the top of the page

If the parent has `position: relative` with `z-index: 1`, a child with `z-index: 1000` won't overlay — it's constrained by its parent.

### The Solution: Portals

Portals let you render a component's children into a **different DOM container**:

```typescript
// App renders into #root
// Modal renders into #modal-root (sibling to #root)

function App() {
  return (
    <div className="app">
      <button>Open Modal</button>
      {showModal && createPortal(
        <Modal />,
        document.getElementById('modal-root')
      )}
    </div>
  );
}
```

### How Portals Work in MiniReact

A portal is a **fiber** with `tag = HostPortal`:

```typescript
{
  tag: WorkTag.HostPortal,
  type: null, // Portals don't have a React type
  stateNode: { containerInfo: element }, // DOM container
  child: null, // Children are rendered into containerInfo
  // ...
}
```

The key difference from a normal element:
- **`stateNode`** for a portal stores the **DOM container**, not a DOM node
- When committing a portal, children are appended to `stateNode.containerInfo`

### Committing a Portal

```typescript
function commitPlacement(finishedWork, root) {
  const parentFiber = getHostParentFiber(finishedWork);
  const parent = parentFiber.stateNode;
  
  if (parentFiber.tag === WorkTag.HostPortal) {
    // Append to the portal's container, not its DOM parent
    portalContainer = parent.containerInfo;
    portalContainer.appendChild(finishedWork.stateNode);
  } else {
    // Normal path: append to DOM parent
    parent.appendChild(finishedWork.stateNode);
  }
}
```

### Event Bubbling Through Portals

Even though the DOM is outside the React tree, React events still bubble **through** the React tree:

```html
<!-- DOM -->
<div id="root">
  <button>Open</button>
</div>
<div id="modal-root">
  <div class="modal">
    <button>Close</button>
  </div>
</div>

<!-- But React tree is: -->
App
├── button ("Open Modal")
└── Modal (Portal)
    └── div.modal
        └── button ("Close")

<!-- Event bubbling in React (NOT DOM): -->
// Click on "Close" button
// React event: Close button → Modal → App
// DOM event: Close button → div.modal → div#modal-root
```

## Fragments — Grouping Without DOM Nodes

### The Problem

React components can return only **one** element. But sometimes you need siblings:

```typescript
function Table() {
  return (
    <table>
      <tr>
        <Columns />  // <!-- Can't return two <td> here -->
      </tr>
    </table>
  );
}

function Columns() {
  // ❌ Error: can't return multiple elements
  return (
    <td>Name</td>
    <td>Age</td>
  );
}
```

### The Solution: Fragments

Fragments let you return **multiple children** without adding a wrapper node:

```typescript
function Columns() {
  return (
    <>
      <td>Name</td>
      <td>Age</td>
    </>
  );
}

// Result in DOM:
// <table>
//   <tr>
//     <td>Name</td>
//     <td>Age</td>
//   </td>
// </table>
```

### How Fragments Work in MiniReact

A fragment is a **fiber** with `tag = Fragment`:

```typescript
{
  tag: WorkTag.Fragment,
  type: Symbol('react.fragment'),
  props: { children: [...] },
  child: firstChild,
  // No stateNode — fragments don't create DOM nodes
}
```

Key properties:
- **`type`** is the fragment symbol
- **`stateNode`** is always `null` — fragments don't create DOM nodes
- **Children** are rendered as siblings of the fragment's parent's children
- **Fragment** fibers are skipped during DOM traversal

### Fragment Reconciliation

Fragments are reconciled like any other fiber:

```typescript
function updateFragment(current, workInProgress, renderLanes) {
  // Diff children
  const children = workInProgress.pendingProps.children;
  reconcileChildren(current, workInProgress, children);
  return workInProgress.child;
}
```

The key difference: `completeWork` for a fragment **doesn't create a DOM node**:

```typescript
function completeWork(current, workInProgress) {
  switch (workInProgress.tag) {
    // ...
    case WorkTag.Fragment:
      // No DOM node to create
      return null;
    // ...
  }
}
```

### Keyed Fragments

Fragments can have keys for list reconciliation:

```typescript
function List() {
  return (
    <>
      {items.map(item => (
        <>
          <div key={`${item.id}-name`}>{item.name}</div>
          <span key={`${item.id}-price`}>{item.price}</span>
        </>
      ))}
    </>
  );
}
```

Each fragment gets a key so React can match them correctly.

## Portals vs. Fragments

| Feature | Portal | Fragment |
|---------|--------|----------|
| Creates DOM node? | No (renders elsewhere) | No (rendered children become direct siblings) |
| Has `stateNode`? | Yes — the target DOM container | No |
| Can have children? | Yes | Yes |
| Affects DOM structure? | Moves children to a different container | Children are inserted into the parent's node |
| Event bubbling | Through React tree, not DOM tree | Through DOM tree |

## Exercise

Create a portal that renders a tooltip outside the parent's overflow:

```typescript
function Tooltip({ children, content }) {
  const [visible, setVisible] = useState(false);
  const portalRoot = document.getElementById('tooltip-root');
  
  return (
    <div
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && portalRoot && createPortal(
        <div className="tooltip">{content}</div>,
        portalRoot
      )}
    </div>
  );
}
```

## Key Takeaways

1. **Portals** render children into a **different DOM container** — outside the normal React tree
2. **Events bubble** through the React tree (not the DOM tree) — a portal's `onClick` still reaches its React parent
3. **Fragments** return multiple children without adding wrapper nodes
4. **Fragments don't create DOM nodes** — their children are direct children of their parent
5. **Keyed fragments** help with list reconciliation
6. Both are implemented as special **fiber tags** (`HostPortal` and `Fragment`)

## Next Steps

- Tutorial 10: Error Boundaries
