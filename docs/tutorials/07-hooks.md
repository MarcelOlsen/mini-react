# Tutorial 7: Hooks — The Magic Behind useState and useEffect

## The Core Problem

React components are just functions. When a component re-renders, the function runs again. How do we remember state between renders?

If you write:
```typescript
function Counter() {
  let count = 0;        // ❌ Reset to 0 every render
  const increment = () => count++;  // ❌ Doesn't trigger re-render
}
```

Each call to `Counter()` creates a new `count` variable. State would be lost.

## The Solution: Linked List of Hooks

Hooks are stored on the **fiber**. Since the fiber persists across renders, so do the hooks:

```
Fiber
├── memoizedState: Hook 1 (useState)
│       ├── state: 0
│       ├── dispatch: function(setCount)
│       └── next: Hook 2 (useEffect)
│               ├── memoizedState: { create, destroy, deps }
│               ├── create: () => { ... }
│               ├── destroy: (() => void) | null
│               ├── deps: [count]
│               └── next: Hook 3 (useRef)
│                       ├── memoizedState: { current: null }
│                       └── next: null
```

A hook is a JavaScript object with:
- `memoizedState`: The primary data (state, effect list, ref value)
- `baseState` / `baseQueue`: For state updates
- `queue`: Pending updates
- `next`: Next hook in the linked list

## How Hooks Are Called

Hooks are stored in a **linked list** on the fiber. The order of hook calls matters:

```typescript
function Component() {
  // Render 1
  const [count, setCount] = useState(0);    // Hook index 0
  const [name, setName] = useState("");     // Hook index 1
  const ref = useRef(null);                  // Hook index 2
  
  // Render 2 (re-render)
  const [count, setCount] = useState(0);    // Gets hook at index 0 (reads count from fiber)
  const [name, setName] = useState("");     // Gets hook at index 1
  const ref = useRef(null);                  // Gets hook at index 2
}
```

The hook **index** is tracked by the fiber. On the first render, hooks are created. On subsequent renders, hooks are read from the fiber.

## useState Deep Dive

### Mount (First Render)

```typescript
function mountState(initialState) {
  const hook = createHookAtIndex(currentHookIndex++);
  hook.memoizedState = initialState;
  
  // Create dispatch function (bound to this fiber and hook)
  const dispatch = dispatchSetState.bind(null, fiber, hook.queue);
  
  return [hook.memoizedState, dispatch];
}
```

### Update (Subsequent Renders)

```typescript
function updateState() {
  const hook = getHookAtIndex(currentHookIndex++); // Same hook as before
  
  // Process pending updates in the queue
  const queue = hook.queue;
  if (queue.pending !== null) {
    const firstUpdate = queue.pending.next; // Circular linked list
    let newState = hook.memoizedState;
    
    do {
      newState = firstUpdate.reducer(newState, firstUpdate.action);
      firstUpdate = firstUpdate.next;
    } while (firstUpdate !== queue.pending.next);
    
    hook.memoizedState = newState;
    queue.pending = null;
  }
  
  return [hook.memoizedState, queue.dispatch];
}
```

### Dispatch (When User Clicks)

```typescript
function dispatchSetState(fiber, queue, action) {
  // Create update object
  const update = {
    action,
    next: null,
  };
  
  // Add to queue (circular linked list)
  if (queue.pending === null) {
    update.next = update; // Point to itself
  } else {
    update.next = queue.pending.next;
    queue.pending.next = update;
  }
  queue.pending = update;
  
  // Schedule re-render
  scheduleUpdateOnFiber(fiber);
}
```

## useEffect Deep Dive

### Mount

```typescript
function mountEffect(create, deps) {
  const hook = createHookAtIndex(currentHookIndex++);
  
  hook.memoizedState = {
    create,      // The effect callback
    destroy: null, // No cleanup yet
    deps,        // Dependencies for comparison
    next: null,  // For linked list in effect queue
  };
  
  // Mark fiber as having passive effects
  fiber.flags |= Passive;
  
  // Push effect to fiber's effect list
  pushEffect(hook.memoizedState);
  
  return undefined;
}
```

### Update

```typescript
function updateEffect(create, deps) {
  const hook = getHookAtIndex(currentHookIndex++);
  const prevEffect = hook.memoizedState;
  
  // Compare dependency arrays
  if (areHookInputsEqual(deps, prevEffect.deps)) {
    // Dependencies didn't change — skip this effect
    // Keep the old effect but mark create as null
    hook.memoizedState = {
      ...prevEffect,
      create: null, // Will be skipped during commit
    };
  } else {
    // Dependencies changed — re-run effect
    hook.memoizedState = {
      create,
      destroy: null, // Old cleanup will run first
      deps,
      next: null,
    };
    
    fiber.flags |= Passive;
    pushEffect(hook.memoizedState);
  }
}
```

### Cleanup

```typescript
function runEffectCleanup(effect) {
  if (typeof effect.destroy === 'function') {
    effect.destroy();
  }
}

function runEffectCreate(effect) {
  const destroy = effect.create();
  effect.destroy = destroy;
}
```

## Effect List

Effects are stored in a **circular linked list** on the fiber:

```
Fiber
├── memoizedState: Effect 1
│       ├── create: () => { ... }
│       ├── destroy: null
│       ├── deps: [count]
│       ├── tag: Passive
│       └── next: Effect 2
│               ├── create: () => { ... }
│               ├── destroy: () => { ... }
│               ├── deps: [name]
│               ├── tag: Passive
│               └── next: Effect 1 (back to start)
```

## `renderWithHooks`

The function that orchestrates hook execution during rendering:

```typescript
function renderWithHooks(current, workInProgress, Component, props) {
  // Set the currently rendering fiber
  currentlyRenderingFiber = workInProgress;
  
  // If there's a current fiber, we're updating; otherwise, mounting
  ReactCurrentDispatcher.current = current === null
    ? HooksDispatcherOnMount      // First render
    : HooksDispatcherOnUpdate;     // Subsequent render
  
  try {
    const children = Component(props); // Run the component function
    workInProgress.memoizedState = currentlyRenderingFiber.memoizedState;
    return children;
  } finally {
    // Reset hook state
    currentlyRenderingFiber = null;
    currentHook = null;
    workInProgressHook = null;
  }
}
```

## Hook Rules

The reason hooks have these rules is because of the linked list:

1. **Only call hooks at the top level**: If you call hooks conditionally (`if (x) useState()`), hooks will be out of order on re-render, and the wrong hook will be read.

2. **Only call hooks from React functions**: `renderWithHooks` sets up the dispatcher. If you call a hook outside a component, there's no dispatcher.

## Hook Types Summary

| Hook | `memoizedState` | Update Logic | Effect? |
|------|-----------------|--------------|---------|
| `useState` | The state value | Process update queue | No |
| `useReducer` | The state value | Process with reducer | No |
| `useEffect` | Effect object (create, destroy, deps) | Compare deps | Yes (Passive) |
| `useLayoutEffect` | Same as useEffect | Compare deps | Yes (Layout) |
| `useRef` | `{ current: value }` | Never updates | No |
| `useMemo` | `[value, deps]` | Compare deps | No |
| `useCallback` | `[callback, deps]` | Compare deps | No |

## Exercise

Trace the state for this component across 3 renders:

```typescript
function Counter() {
  const [count, setCount] = useState(0);
  const [name, setName] = useState("Alice");
  
  useEffect(() => {
    console.log(`Count: ${count}`);
  }, [count]);
  
  return <button onClick={() => setCount(c => c + 1)}>Increment</button>;
}
```

**Render 1**: count=0, name="Alice"
**Render 2**: count=1, name="Alice"
**Render 3**: count=2, name="Alice"

For each render, describe:
1. How many hooks are in the linked list?
2. What are their `memoizedState` values?
3. What effects are triggered?

## Key Takeaways

1. **Hooks live on the fiber** — they persist across renders
2. **Linked list** of hooks, ordered by call order
3. **`useState` has a queue** of pending updates that are processed during re-render
4. **`useEffect` has a create/destroy cycle** — old destroy runs before new create
5. **Effect dependency comparison** happens during update
6. **`renderWithHooks` swaps the dispatcher** — mount dispatcher vs. update dispatcher
7. **Hook rules are not arbitrary** — they protect the linked list ordering

## Next Steps

- Tutorial 8: Context API
- Tutorial 9: Portals and Fragments
- Tutorial 10: Error Boundaries
