# Hooks System

## Overview

Hooks let functional components have state and side effects. They're implemented as a linked list stored on the fiber, with the current position tracked by a cursor. This design lets multiple hooks work together without conflicts.

**Location**: `src/fiber/fiberHooks.ts` and `src/hooks/fiberHooksImpl.ts`

## The Core Idea

Hooks need to:

1. Store state that persists across renders
2. Associate that state with a specific component instance
3. Maintain the same order across renders
4. Handle updates that trigger re-renders

The solution is to store an array of hooks on each fiber. During render, we walk through this array in order. This is why the rules of hooks exist - hooks must be called in the same order every render.

## Hook Storage

Each fiber can have hooks:

```typescript
interface Fiber {
  hooks: Hook[] | null      // Array of hooks
  hookCursor: number        // Current position in the array
  // ... other fields
}

type Hook =
  | StateOrEffectHook<unknown>
  | ReducerHook<unknown, unknown>
  | RefHook<unknown>
  | MemoHook<unknown>
  | CallbackHook

interface StateOrEffectHook<T> {
  type: 'state' | 'effect'
  value: T
  updateQueue?: UpdateQueue<T>
  deps?: unknown[]
  callback?: () => void | (() => void)
  cleanup?: () => void
  needsRun?: boolean
  hasRun?: boolean
}
```

The hooks array grows as hooks are called during the first render. On subsequent renders, we walk through the existing array.

## Hook Context

We need to know which fiber we're currently rendering so hooks know where to store their state:

```typescript
let currentlyRenderingFiber: Fiber | null = null

export function setHookContext(fiber: Fiber | null): void {
  currentlyRenderingFiber = fiber

  if (fiber) {
    fiber.hookCursor = 0  // Reset cursor
  }
}
```

This is called by `beginWork` before rendering a function component. When the component finishes rendering, we set it back to null.

## useState

The most common hook. It gives components state that persists across renders:

```typescript
export function useState<T>(initialState: T | (() => T)): [T, (newValue: T | ((prev: T) => T)) => void] {
  const fiber = currentlyRenderingFiber
  if (!fiber) {
    throw new Error('useState must be called inside a functional component')
  }

  if (!fiber.hooks) {
    fiber.hooks = []
  }

  const index = fiber.hookCursor++
  let hook = fiber.hooks[index] as StateOrEffectHook<T> | undefined

  if (!hook) {
    // First render - initialize
    const value = typeof initialState === 'function'
      ? (initialState as () => T)()
      : initialState

    hook = {
      type: 'state',
      value,
      updateQueue: {
        pending: null,
        lastRenderedState: value
      }
    }

    fiber.hooks[index] = hook
  }

  const setState = (newValue: T | ((prev: T) => T)) => {
    const update = {
      action: newValue,
      next: null
    }

    // Queue the update
    const queue = hook!.updateQueue!
    if (queue.pending === null) {
      // First update - circular link to itself
      update.next = update
    } else {
      // Insert into circular list
      update.next = queue.pending.next
      queue.pending.next = update
    }
    queue.pending = update

    // Trigger re-render
    scheduleUpdateOnFiber(fiber)
  }

  return [hook.value, setState]
}
```

Key points:

**Initialization**: On first render, we create a new hook and add it to the array

**Updates**: We queue updates in a circular linked list

**Re-rendering**: Calling `setState` schedules an update on the fiber

**Functional Updates**: The update can be a value or a function

During the next render, we process the queued updates:

```typescript
// Process updates from queue
if (hook.updateQueue?.pending) {
  let update = hook.updateQueue.pending.next  // Start of circular list
  let newState = hook.value

  do {
    const action = update.action
    newState = typeof action === 'function'
      ? action(newState)
      : action

    update = update.next
  } while (update !== hook.updateQueue.pending.next)

  hook.value = newState
  hook.updateQueue.pending = null
}
```

We process all updates in order to compute the new state.

## useEffect

Side effects that run after render commits:

```typescript
export function useEffect(
  callback: () => void | (() => void),
  deps?: unknown[]
): void {
  const fiber = currentlyRenderingFiber
  if (!fiber) {
    throw new Error('useEffect must be called inside a functional component')
  }

  if (!fiber.hooks) {
    fiber.hooks = []
  }

  const index = fiber.hookCursor++
  let hook = fiber.hooks[index] as StateOrEffectHook<void> | undefined

  if (!hook) {
    // First render
    hook = {
      type: 'effect',
      value: undefined,
      callback,
      deps,
      needsRun: true,
      hasRun: false
    }

    fiber.hooks[index] = hook
  } else {
    // Check if deps changed
    const prevDeps = hook.deps
    const hasChanged = !prevDeps || !deps || !shallowEqual(prevDeps, deps)

    if (hasChanged) {
      hook.needsRun = true
      hook.callback = callback
      hook.deps = deps
    }
  }
}
```

Effects are special because they run after the commit phase. The `needsRun` flag tells the commit phase which effects need executing.

```typescript
// In commit phase
for (const hook of fiber.hooks) {
  if (hook.type === 'effect' && hook.needsRun) {
    // Run cleanup from previous effect
    if (hook.cleanup) {
      hook.cleanup()
    }

    // Run the effect
    const cleanupFunction = hook.callback()
    if (typeof cleanupFunction === 'function') {
      hook.cleanup = cleanupFunction
    }

    hook.hasRun = true
    hook.needsRun = false
  }
}
```

Effects run in order, with cleanup from the previous render running before the new effect.

## useRef

Refs give you a mutable value that persists across renders without causing re-renders when changed:

```typescript
export function useRef<T>(initialValue: T): MutableRefObject<T> {
  const fiber = currentlyRenderingFiber
  if (!fiber) {
    throw new Error('useRef must be called inside a functional component')
  }

  if (!fiber.hooks) {
    fiber.hooks = []
  }

  const index = fiber.hookCursor++
  let hook = fiber.hooks[index] as RefHook<T> | undefined

  if (!hook) {
    // First render - create the ref object
    hook = {
      type: 'ref',
      value: { current: initialValue }
    }

    fiber.hooks[index] = hook
  }

  return hook.value as MutableRefObject<T>
}
```

The key insight: We return the same object every render. When you mutate `ref.current`, you're mutating that object, not triggering a re-render.

## useMemo

Cache expensive computations:

```typescript
export function useMemo<T>(factory: () => T, deps: unknown[]): T {
  const fiber = currentlyRenderingFiber
  if (!fiber) {
    throw new Error('useMemo must be called inside a functional component')
  }

  if (!fiber.hooks) {
    fiber.hooks = []
  }

  const index = fiber.hookCursor++
  let hook = fiber.hooks[index] as MemoHook<T> | undefined

  if (!hook) {
    // First render - compute and cache
    hook = {
      type: 'memo',
      value: factory(),
      deps
    }

    fiber.hooks[index] = hook
  } else {
    // Check if deps changed
    const prevDeps = hook.deps
    const hasChanged = !shallowEqual(prevDeps, deps)

    if (hasChanged) {
      // Recompute
      hook.value = factory()
      hook.deps = deps
    }
  }

  return hook.value
}
```

Only recompute when dependencies change.

## useCallback

Cache function references:

```typescript
export function useCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  deps: unknown[]
): T {
  return useMemo(() => callback, deps)
}
```

This is just `useMemo` that returns the callback itself. Useful for preventing child components from re-rendering when passed as props.

## useReducer

More complex state management:

```typescript
export function useReducer<State, Action>(
  reducer: (state: State, action: Action) => State,
  initialState: State
): [State, (action: Action) => void] {
  const fiber = currentlyRenderingFiber
  if (!fiber) {
    throw new Error('useReducer must be called inside a functional component')
  }

  if (!fiber.hooks) {
    fiber.hooks = []
  }

  const index = fiber.hookCursor++
  let hook = fiber.hooks[index] as ReducerHook<State, Action> | undefined

  if (!hook) {
    // First render
    hook = {
      type: 'reducer',
      value: initialState,
      reducer,
      updateQueue: {
        pending: null,
        lastRenderedState: initialState
      }
    }

    fiber.hooks[index] = hook
  }

  const dispatch = (action: Action) => {
    const update = {
      action,
      next: null
    }

    // Queue the update
    const queue = hook!.updateQueue!
    if (queue.pending === null) {
      update.next = update
    } else {
      update.next = queue.pending.next
      queue.pending.next = update
    }
    queue.pending = update

    scheduleUpdateOnFiber(fiber)
  }

  return [hook.value, dispatch]
}
```

During render, we process the queued actions:

```typescript
if (hook.updateQueue?.pending) {
  let update = hook.updateQueue.pending.next
  let newState = hook.value

  do {
    newState = hook.reducer(newState, update.action)
    update = update.next
  } while (update !== hook.updateQueue.pending.next)

  hook.value = newState
  hook.updateQueue.pending = null
}
```

## useContext

Access context values:

```typescript
export function useContext<T>(context: MiniReactContext<T>): T {
  const fiber = currentlyRenderingFiber
  if (!fiber) {
    throw new Error('useContext must be called inside a functional component')
  }

  // Look up the context value from the fiber's context map
  if (fiber.contextValues?.has(context._currentValue)) {
    return fiber.contextValues.get(context._currentValue) as T
  }

  // Fall back to context's current value
  return context._currentValue as T
}
```

Context values are stored on the fiber during begin work as we traverse down from context providers.

## Rules of Hooks

The hook implementation relies on a few invariants:

**Same Order**: Hooks must be called in the same order every render. This is why we use an array and cursor.

**Top Level Only**: Hooks can't be inside conditionals or loops that might change which hooks run.

**Function Components Only**: Hooks need the fiber context, which only exists during function component render.

Breaking these rules leads to bugs because the hook cursor gets out of sync with the hook array.

## Update Queue

Both `useState` and `useReducer` use an update queue with a circular linked list:

```typescript
interface Update<T> {
  action: T | ((prev: T) => T)
  next: Update<T> | null
}

interface UpdateQueue<T> {
  pending: Update<T> | null
  lastRenderedState: T
}
```

Why circular? It makes it easy to find the first update (it's `pending.next`) and the last update (it's `pending`).

```text
pending -> Update3 -> Update1 -> Update2 -> Update3 (circular)
           ^                                 ^
           last                              first
```

We process updates in order during render, then clear the queue.

## Effect Cleanup

When a component unmounts, we need to run cleanup:

```typescript
function commitUnmountEffects(fiber: Fiber): void {
  const hooks = fiber.hooks
  if (hooks) {
    for (const hook of hooks) {
      if (hook.type === 'effect' && hook.cleanup) {
        hook.cleanup()
      }
    }
  }

  // Recursively clean up children
  let child = fiber.child
  while (child !== null) {
    commitUnmountEffects(child)
    child = child.sibling
  }
}
```

Cleanup functions are saved when effects run and executed when the component unmounts or when the effect re-runs.

## Dependency Comparison

We compare dependencies with shallow equality:

```typescript
function shallowEqual(a: unknown[], b: unknown[]): boolean {
  if (a.length !== b.length) return false

  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }

  return true
}
```

This is why dependencies should be primitive values or stable references. If you pass `[{}]` every time, it's never equal to the previous `[{}]` even though they look the same.

## Integration with Fiber

Hooks integrate with the fiber system at a few points:

**Begin Work**: Sets the hook context before calling the component

```typescript
function updateFunctionComponent(current, workInProgress) {
  setHookContext(workInProgress)
  const Component = workInProgress.type
  const children = Component(workInProgress.pendingProps)
  setHookContext(null)
  // ... reconcile children
}
```

**Commit Work**: Runs effects after committing DOM changes

```typescript
function commitLayoutEffects(fiber) {
  commitFiberEffects(fiber)  // Run effects for this fiber
  // ... recurse to children
}
```

**Deletion**: Cleans up effects when components unmount

```typescript
function commitDeletion(fiber) {
  commitUnmountEffects(fiber)
  // ... remove from DOM
}
```

## Common Patterns

**Data Fetching**:

```typescript
function useData(url) {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetch(url)
      .then(r => r.json())
      .then(setData)
  }, [url])

  return data
}
```

**Previous Value**:

```typescript
function usePrevious(value) {
  const ref = useRef()

  useEffect(() => {
    ref.current = value
  })

  return ref.current
}
```

**Local Storage Sync**:

```typescript
function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : initialValue
  })

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])

  return [value, setValue]
}
```

## Performance Considerations

**Avoid Inline Functions**: Creating new functions every render can cause issues with `useCallback` and `useMemo`

**Stable Dependencies**: Try to keep dependency arrays stable

**Lazy Initialization**: `useState` accepts a function for expensive initial values

**Bail Out**: If `setState` is called with the same value, we can skip re-rendering (future optimization)

## Debugging Hooks

Common issues:

**Wrong Number of Hooks**: Check that hooks are called the same number of times each render

**Stale Closures**: Effect callbacks capture values from their render. Use refs if you need the latest value.

**Missing Dependencies**: Effect dependencies should include everything used in the effect

Add logging to track hook calls:

```typescript
export function useState<T>(initialState: T) {
  console.log('useState called, cursor:', currentlyRenderingFiber?.hookCursor)
  // ... rest of implementation
}
```

## Future Enhancements

Ideas for improving hooks:

**useTransition**: Mark state updates as transitions for better UX

**useDeferredValue**: Defer updating a value to avoid blocking urgent updates

**useId**: Generate stable IDs for accessibility

**useInsertionEffect**: Run effects before layout effects (for CSS-in-JS)

**Auto-batching**: Batch multiple setState calls into one render

## Summary

The hooks system provides:

- State management for functional components
- Side effects with cleanup
- Memoization for performance
- Context consumption
- Refs for mutable values

All built on a simple array-and-cursor model that integrates cleanly with the fiber architecture. The key constraint - hooks must be called in the same order - makes the implementation straightforward and efficient.
