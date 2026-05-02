# Tutorial 3: Fiber Architecture — Why React Interrupts Itself

## The Problem with Stack Reactors

Before React Fiber (React 16), React used a recursive approach to rendering:

```javascript
function renderComponentTree(component) {
  renderComponent(component);
  component.children.forEach(renderComponentTree);
}
```

This is **synchronous** — the browser freezes until the entire tree is rendered. For large apps, this can cause jank (dropped frames).

## The Solution: Interruptible Work

A **fiber** is just a JavaScript object representing a unit of work. The key insight: if each unit of work is an object, we can save where we are, pause, and resume later.

```
Old React (Synchronous):
  Render A → Render B → Render C → Render D → Commit all at once
  
  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ (Blocking for 300ms)

Fiber React (Interruptible):
  Render A | Browser Paint | Render B | React to Input | Render C | Commit
  
  ▓▓▓▓    blank    ▓▓▓▓    ▓▓      ▓▓▓▓    ▓▓▓▓▓▓▓▓ (Browser responsive throughout)
```

## What Makes a Fiber?

A fiber is a node in a work tree. It contains:
- **what to render** (`elementType`, `pendingProps`, `type`)
- **where it is in the tree** (`return`, `child`, `sibling`, `index`)
- **current state** (`memoizedState`)
- **what was already rendered** (`memoizedProps`, `alternate`)
- **side-effects** (`flags`)
- **remaining work** (`lanes`)

## The Dual Tree System

React/MiniReact maintains two trees at all times:

```
Current Tree (what's on screen — stable)
  
  Root
   ├── A (Fiber 1)
   ├── B (Fiber 2)
   └── C (Fiber 3)

Work In Progress Tree (what's being built — mutable)
  
  Root
   ├── A' (Fiber 4 — alternate of Fiber 1)
   ├── B' (Fiber 5 — alternate of Fiber 2)
   └── C' (Fiber 6 — alternate of Fiber 3)
```

### The `alternate` Property

Each fiber has an `alternate` — its twin in the other tree:
- `current.alternate` = the WIP version of this fiber
- `wip.alternate` = the current version of this fiber

When `wip` tree is complete, we simply swap pointer:
```js
// root.current was pointing to old current tree
root.current = workInProgressTree;  // Point to new finished tree
```

## How Work Is Interrupted

### The Work Loop

```typescript
function performWork() {
  while (wip !== null) {
    wip = performUnitOfWork(wip);
    
    // After each unit, check if we should yield
    if (shouldYield()) {
      // Save our position and return
      root.workInProgress = wip;
      return;
    }
  }
  
  // All work done — commit
  commitRoot(root);
}
```

### `performUnitOfWork`

```typescript
function performUnitOfWork(fiber) {
  // 1. Execute the work for this fiber
  beginWork(fiber);
  
  // 2. Go to first child (depth-first)
  if (fiber.child !== null) return fiber.child;
  
  // 3. No children — finish this unit and siblings
  let wip = fiber;
  while (wip !== null) {
    completeUnitOfWork(wip);
    
    if (wip.sibling !== null) {
      return wip.sibling;
    }
    
    wip = wip.return;  // Go up to parent
  }
  
  return null;  // All work done
}
```

### `beginWork` vs `completeWork`

- **`beginWork()`**: Called on the way *down* the tree
  - Creates the fiber for this element if needed
  - If it's a component, call it (which may update state/hooks)
  - Diff children — reconcile old children with new children
  - Return first child to continue descending

- **`completeWork()`**: Called on the way *up* the tree
  - For DOM elements: create the DOM node if needed, set initial props
  - For function components: nothing special
  - Propagate flags upward (`subtreeFlags` = all children's flags OR'd together)
  - If sibling exists and is ready, return sibling to move sideways

## Lifecycle in Fiber

```
User Event → Schedule Update → Work Loop (beginWork → completeWork) → Commit
```

### Phase 1: Schedule (Synchronous)
The user event triggers a state update. This is synchronous:
```typescript
const [count, setCount] = useState(0);
setCount(1); // Immediately schedules work, no DOM changes yet
```

### Phase 2: Work Loop (Can Be Interrupted)
Builds the new tree. Can be paused and resumed:
```typescript
function workLoop(root) {
  while (wip !== null && !shouldYield()) {
    nextUnitOfWork = performUnitOfWork(wip);
    // ...
  }
}
```

### Phase 3: Commit (Never Interrupted)
Applies all DOM changes at once:
```typescript
function flushWork() {
  // Before mutation: read DOM that will change
  commitBeforeMutationEffects();
  
  // Mutations: add, remove, update DOM
  commitMutationEffects();
  
  // Layout effects: run useLayoutEffect
  commitLayoutEffects();
  
  // Passive effects: schedule useEffect callbacks
  schedulePassiveEffects();
}
```

## Why This Architecture Matters

1. **Large updates don't freeze the browser** — work can be split across frames
2. **Higher priority updates can interrupt lower priority ones** — animations stay smooth
3. **Error boundaries work** — because each fiber is an object, we can traverse back up the tree
4. **Async rendering** — the work loop can yield to the browser as needed
5. **Suspense** — partial trees can be shown while higher priority work is pending

## Exercise

Imagine an app with 10,000 components. Trace with and without fiber:

**Before Fiber (Synchronous):**
1. User clicks button
2. React updates state
3. React renders all 10,000 components (blocking)
4. React commits all changes at once
5. Input/animation events delayed if step 3 takes too long

**With Fiber (Interruptible):**
1. User clicks button
2. React schedules update with high priority lane
3. Render: beginWork(A) → shouldYield? → No → beginWork(B) → shouldYield? → Yes!
4. Yield to browser — handle animation frame, input events
5. Resume: beginWork(C) → ... → completeWork(C) → ...
6. Commit once all work is done

## Key Takeaways

1. **A fiber is just an object** representing a unit of work
2. **Two trees** (current and work-in-progress) allow pausing without corrupting the visible tree
3. **The alternate pointer** links corresponding fibers in both trees
4. **beginWork** goes top-down, **completeWork** goes bottom-up
5. **`shouldYield`** checks if there's a higher priority task or if the browser needs to paint
6. **Commit is always synchronous** — no interrupting DOM mutations!

## Common Misconceptions

1. **"Fiber makes renders async"** — Rendering is interruptible but commit is always sync. You don't have "half applied" state
2. **"Fiber improves every app"** — It mainly helps large apps with complex updates. For simple apps, you might not notice
3. **"Time slicing is automatic"** — You need to use `useTransition` or Suspense to actually trigger concurrent rendering. By default, updates are synchronous

In the next tutorial we'll dive into the lane-based priority system.
