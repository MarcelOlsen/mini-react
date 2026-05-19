# MiniReact Architecture

This document provides a high-level architectural overview of MiniReact, a minimal React implementation built for learning and understanding how React works under the hood.

## Philosophy

MiniReact follows React's actual architecture patterns. We believe the best way to understand React is to implement it yourself. Rather than a simplified toy implementation, MiniReact mirrors React's core concepts:

- **Fiber Architecture**: Work-in-progress / current dual tree for interruptible renders
- **Lane-Based Scheduling**: Priority system with time-slicing support
- **Concurrent Features**: Groundwork for concurrent rendering
- **Branded Types**: Type-safe bitwise operations

## The Render Pipeline

Rendering in MiniReact follows a three-phase pipeline, just like React:

```
Element Tree → Render Phase → Commit Phase
```

### 1. Render Phase (Can be Interrupted)

The render phase builds a **fiber tree** by walking the virtual DOM. This phase is **pure** — it produces no side effects:

```
performWorkOnRoot
  ├── beginWork   (top-down: create/update fibers)
  └── completeWork (bottom-up: finalize fibers)
```

### 2. Commit Phase (Cannot be Interrupted)

The commit phase applies side effects to the DOM. It is **synchronous** and **uninterruptible**:

```
commitRoot
  ├── commitBeforeMutationEffects
  ├── commitMutationEffects   (DOM mutations)
  ├── commitLayoutEffects     (useLayoutEffect)
  └── commitPassiveEffects     (useEffect — scheduled, not immediate)
```

## Core Data Structures

### Fiber

A **Fiber** is the fundamental unit of work:

```typescript
type Fiber = {
  // Instance identification
  tag: WorkTag;           // FunctionComponent, HostComponent, HostRoot, etc.
  elementType: any;       // The function/component class
  type: any;             // The resolved type
  key: null | string;

  // Tree structure
  return: Fiber | null;   // Parent
  child: Fiber | null;    // First child
  sibling: Fiber | null;   // Next sibling
  index: number;         // Position among siblings

  // Props
  pendingProps: Props;    // Props for the work in progress
  memoizedProps: Props;   // Props from last committed render

  // State
  memoizedState: any;      // State, effect hooks, context values

  // Effects
  flags: Flags;           // Side-effects scheduled (Placement, Update, Deletion)
  subtreeFlags: Flags;     // Effects in this subtree

  // Update queue
  updateQueue: UpdateQueue | null;

  // Scheduling
  lanes: Lanes;            // Lanes with pending work
  childLanes: Lanes;       // Lanes in subtree

  // Alternate (dual tree)
  alternate: Fiber | null; // The fiber from the current/previous tree
};
```

### Fiber Root

The **FiberRoot** is the container for the entire application:

```typescript
type FiberRoot = {
  containerInfo: Element;    // The DOM container
  current: Fiber;           // Current tree (what's on screen)
  finishedWork: Fiber | null; // Completed work ready to commit
  finishedLanes: Lanes;     // Lanes completed in finishedWork
  pendingLanes: Lanes;      // Lanes with pending updates
};
```

### Lane System

Lanes are 16-bit bitmasks where each bit represents a priority lane:

```
Bit 0 (SyncLane):       Synchronous, highest priority
Bit 2:                  InputContinuousLane
Bit 4:                  DefaultLane
Bits 5-6:               TransitionLane1, TransitionLane2
Bit 15 (IdleLane):      Lowest priority
```

Key properties:
- A single lane is one bit set (e.g., `1 << 0`)
- `Lanes` is a bitmask with zero or more bits set
- `Lane = Lanes` alias resolves TypeScript constraints while keeping runtime branding
- Merger: `laneOr(a, b)` → `a | b`
- Test: `laneIncludes(set, lane)` → `(set & lane) !== 0`

## Dual Tree System

React/MiniReact maintains **two** fiber trees simultaneously:

### `current` Tree
What's currently rendered to the DOM. This tree is not mutated during rendering.

### `workInProgress` Tree
A copy of `current` that is incrementally updated during rendering. When rendering completes, the `workInProgress` tree becomes the new `current` tree via pointer swap.

```
Before Render:
  current        workInProgress
    Root              Root (copy of current Root)
    /  \\              /  \\
   A    B            A'   (incrementally built)

After Render:
  current (points to old tree)
    Root
    /  \\
   A    B (stale)

  workInProgress (about to become current)
    Root'
    /  \\
   A'    B'
```

## Work Loop

The work loop is the engine that processes fibers:

```
while (wip !== null {&& !shouldYield()) {
  nextUnitOfWork = performUnitOfWork(wip);
  // wip = workInProgress, the fiber we're currently processing
}

function performUnitOfWork(fiber) {
  // 1. Begin work: create/update fiber based on element type
  beginWork(current, wip, renderLanes);

  // 2. If it has children, dive into the first child
  if (wip.child !== null) return wip.child;

  // 3. Complete this unit and move to its sibling, or up to parent
  while (wip !== null) {
    completeUnitOfWork(wip);
    if (wip.sibling !== null) return wip.sibling;
    wip = wip.return; // Move up to parent
  }
  return null;
}
```

This loop processes the entire tree depth-first:
1. **Begin work** on the way down (creating/updating fibers)
2. **Complete work** on the way up (finalizing, creating DOM nodes)

## Scheduler

### Min-Heap Task Queue

The scheduler uses a binary min-heap for O(log n) task scheduling:

```typescript
interface Task {
  callback: ((didTimeout: boolean) => void) | null;
  priorityLevel: Priority;
  startTime: number;
  expirationTime: number;
  sortIndex: number; // Used for heap ordering
  id: number;
}
```

### Priority Levels

```
ImmediatePriority     — Synchronous execution
UserBlockingPriority — Input events (e.g., click)
NormalPriority        — Default, most updates
LowPriority           — Deferred work
IdlePriority          — Lowest, will run when idle
```

The scheduler periodically checks if work should yield using `shouldYield()`, returning control to the browser in concurrent mode.

## Effect System

Effects are categorized and executed during commit:

### Mutation Effects (1st pass)
- `Placement` — Insert new DOM nodes
- `Update` — Update existing props
- `ChildDeletion` — Remove nodes

### Layout Effects (2nd pass)
- `Ref` — Attach/detach refs
- `Snapshot` — Read DOM before mutation (rare)
- `UpdateEffect` (React's `Passive` for layout effects)

### Passive Effects (3rd pass — scheduled, not immediate)
- `Passive` — `useEffect` callbacks and cleanups
- Runs after the browser paints the current commit

## Type Safety

### Branded Types

MiniReact uses TypeScript's nominal typing for safety:

```typescript
// Branded types enforce compile-time correct usage
type Lane = number & { readonly __lane__: true };
type Lanes = number & { readonly __lanes__: true };
type Flags = number & { readonly __flags__: true };

// Centralized unsafe conversions in bitwise.ts
export function unlane(value: Lane): number { return value as number; }
export function unlanes(value: Lanes): number { return value as number; }
```

This ensures:
- No accidental mixing of `Lane` and `Lanes` where they shouldn't mix
- Centralized documentation of all type-cast assumptions
- Zero stray `as number` casts outside `bitwise.ts`

## File Organization

```
src/
├── core/              # createElement, public API
├── fiber/             # Fiber architecture (17 modules)
│   ├── types.ts       # Type definitions, WorkTag, Lane, Lanes
│   ├── bitwise.ts     # Branded type conversions
│   ├── createFiber.ts # Fiber factory functions
│   ├── beginWork.ts   # Begin work phase
│   ├── completeWork.ts # Complete work phase
│   ├── commitWork.ts  # DOM mutation helpers
│   ├── commitRoot.ts  # Commit orchestration
│   ├── childReconciler.ts # Child reconciliation
│   ├── fiberHooks.ts  # Hook implementations
│   ├── effectList.ts  # Effect collection
│   ├── workLoop.ts    # Work loop + public API
│   ├── scheduler.ts   # Task scheduler
│   ├── minHeap.ts     # Min-heap for scheduler
│   ├── lanes.ts       # Lane priority system
│   ├── workInProgress.ts # WIP tree management
│   ├── typeGuards.ts  # Runtime type guards
│   ├── hydration.ts   # SSR hydration
│   └── resumability.ts # SSR serialization
└── ...
```

## How it All Fits Together

```
User calls render(element, container)
  └── createFiberRoot(container)
      └── createRoot(container, ...)
          └── createFiber(WorkTag.HostRoot, ...)
          └── root.current = hostRootFiber

User calls useState(0)
  └── renderWithHooks()
      └── useStateFiber() — read from current fiber's hooks

User updates state
  └── dispatch({ type: update, payload })
      └── scheduleUpdateOnFiber(fiber, lane)
          └── ensureRootIsScheduled(root)
              └── performSyncWorkOnRoot(root)
                  └── while loop (beginWork → completeWork)
                  └── root.finishedWork = wip
              └── flushSync()
                  └── commitRoot(root) ← Synchronous, no interrupt

For concurrent mode:
  └── ensureRootIsScheduled(root)
      └── scheduleCallback(performConcurrentWorkOnRoot)
          └── flushWork() — uses requestIdleCallback
          └── workLoop can be interrupted by shouldYield()
          └── When done: performSyncWorkOnRoot to commit
```

## Key Design Decisions

1. **Single commit per work loop**: Once a work tree is complete, we commit it atomically
2. **WorkInProgress tree**: Allows us to pause work without mutating the live tree
3. **Lanes over expiration times**: Simpler conceptually, more flexible for priority
4. **Binary min-heap scheduler**: More efficient than sorting task arrays
5. **Centralized type cast boundary**: `bitwise.ts` is the single place where type safety is relaxed

## Further Reading

- [Virtual DOM Deep Dive](tutorials/01-virtual-dom.md)
- [Reconciliation Algorithm](tutorials/02-reconciliation.md)
- [Fiber Architecture](tutorials/03-fiber-architecture.md)
- [Scheduler Internals](tutorials/04-scheduler.md)
- [Render Pipeline Guide](guides/how-rendering-works.md)
- [State Management](guides/how-state-works.md)
- [Effect System](guides/how-effects-work.md)
