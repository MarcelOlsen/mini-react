# Guide: How Rendering Works

This guide walks through the complete rendering pipeline from `render()` call to committed DOM.

## The Entry Point

```typescript
render(createElement(App), document.getElementById('root'));
```

This single call triggers the entire render pipeline.

## Phase 1: Create the Fiber Root

Inside `render`, a `FiberRoot` is created:

```typescript
function render(element, container) {
  let root = fiberRoots.get(container);
  if (!root) {
    root = createFiberRoot(container); // Creates FiberRoot + HostRoot fiber
    fiberRoots.set(container, root);
  }
  
  updateContainer(element, root); // Schedule the update
  flushSync();                   // If sync, immediately process
}
```

The `FiberRoot` structure:
```
FiberRoot
├── containerInfo: <div id="root">   (DOM container)
├── current: HostRoot Fiber          (current tree)
├── finishedWork: null               (completed work)
└── pendingLanes: NoLanes
```

The `HostRoot` fiber:
```
Fiber (tag: HostRoot)
├── stateNode: FiberRoot              (back-pointer)
├── child: null                      (will be App fiber after render)
├── alternate: null                   (WIP version, created later)
└── lanes: NoLanes
```

## Phase 2: Schedule the Update

`updateContainer` schedules work on a lane:

```typescript
function updateContainer(element, root) {
  const current = root.current;
  
  // Create an update
  const update = {
    payload: { element },
    lane: SyncLane,
    next: null,
  };
  
  // Enqueue on root fiber
  const queue = current.updateQueue;
  if (queue === null) {
    current.updateQueue = {
      pending: update,
      dispatch: null,
    };
  } else {
    // Circular linked list
    const last = queue.pending;
    update.next = last.next;
    last.next = update;
    queue.pending = update;
  }
  
  // Add lane to root's pending lanes
  root.pendingLanes |= SyncLane;
  
  // Ensure root is scheduled
  ensureRootIsScheduled(root);
}
```

## Phase 3: Work Loop — Build the WIP Tree

`ensureRootIsScheduled` decides whether to render synchronously or concurrently:

```typescript
function ensureRootIsScheduled(root) {
  const nextLanes = getNextLanes(root);
  
  // If sync lane is pending, render synchronously
  if (includesLane(nextLanes, SyncLane)) {
    performSyncWorkOnRoot(root);
  } else {
    // Otherwise, schedule callback for concurrent work
    scheduleCallback(performConcurrentWorkOnRoot, priority);
  }
}
```

### performSyncWorkOnRoot

```typescript
function performSyncWorkOnRoot(root) {
  // Prepare fresh work-in-progress tree from current
  const wip = prepareFreshStack(root, nextLanes);
  
  // Work loop
  while (wip !== null) {
    wip = performUnitOfWork(wip);
  }
  
  // Work completed
  root.finishedWork = wip;
  root.finishedLanes = nextLanes;
  
  // Commit immediately (sync)
  commitRoot(root);
}
```

### The Work Loop in Detail

```typescript
function performUnitOfWork(fiber) {
  // 1. Begin work
  const current = fiber.alternate;
  const next = beginWork(current, fiber, renderLanes);
  
  // 2. If component has children, dive deeper
  if (next !== null) return next;
  
  // 3. No children — complete this unit and siblings
  let wip = fiber;
  while (wip !== null) {
    completeUnitOfWork(wip);
    
    // Check if sibling is ready
    if (wip.sibling !== null) return wip.sibling;
    
    // Go up to parent
    wip = wip.return;
  }
  
  return null;
}
```

### beginWork Deep Dive

`beginWork` creates or updates child fibers:

```typescript
function beginWork(current, wip, renderLanes) {
  switch (wip.tag) {
    case WorkTag.FunctionComponent:
      return updateFunctionComponent(current, wip, renderLanes);
    case WorkTag.HostRoot:
      return updateHostRoot(current, wip, renderLanes);
    case WorkTag.HostComponent:
      return updateHostComponent(current, wip, renderLanes);
    case WorkTag.HostText:
      return null; // Text nodes have no children
    // ...
  }
}
```

For a function component:
```typescript
function updateFunctionComponent(current, wip, renderLanes) {
  const Component = wip.type;
  const props = wip.pendingProps;
  
  // Execute component function with hooks
  const children = renderWithHooks(current, wip, Component, props);
  
  // Reconcile children
  reconcileChildren(current, wip, children);
  
  return wip.child;
}
```

### completeWork Deep Dive

`completeWork` finalizes fibers on the way up:

```typescript
function completeWork(current, wip, renderLanes) {
  switch (wip.tag) {
    case WorkTag.HostComponent:
      if (current === null) {
        // Mount: create DOM node
        const instance = createInstance(wip.type, wip.memoizedProps);
        wip.stateNode = instance;
        appendAllChildren(instance, wip);
      } else {
        // Update: diff props
        const oldProps = current.memoizedProps;
        const newProps = wip.memoizedProps;
        if (oldProps !== newProps) {
          wip.flags |= Update;
        }
      }
      return null;
      
    case WorkTag.HostRoot:
      return null;
      
    case WorkTag.HostText:
      if (current === null) {
        wip.stateNode = document.createTextNode(wip.pendingProps.children);
      } else {
        if (wip.pendingProps !== current.memoizedProps) {
          wip.flags |= Update;
        }
      }
      return null;
  }
}
```

## Phase 4: Commit — Apply to DOM

After the work loop finishes, `commitRoot` applies all the changes:

```typescript
function commitRoot(root) {
  const finishedWork = root.finishedWork;
  const lanes = root.finishedLanes;
  
  if (finishedWork === null) return;
  
  // Reset finished work
  root.finishedWork = null;
  root.finishedLanes = NoLanes;
  
  // --- Commit Phase (uninterruptible) ---
  
  // 1. Before mutation effects
  commitBeforeMutationEffects();
  
  // 2. Mutation effects (DOM changes)
  commitMutationEffects(finishedWork, root);
  
  // 3. Layout effects (useLayoutEffect)
  commitLayoutEffects(finishedWork, root);
  
  // 4. Swap trees
  const finishedWorkAlternate = finishedWork.alternate;
  root.current = finishedWorkAlternate;
  
  // 5. Passive effects (useEffect — scheduled async)
  scheduleCallback(NormalPriority, () => commitPassiveEffects());
}
```

### commitMutationEffects

Walks the effect list and applies DOM mutations:

```typescript
function commitMutationEffects(finishedWork, root) {
  let fiber = finishedWork;
  while (fiber !== null) {
    if (fiber.flags & Placement) {
      commitPlacement(fiber);
    }
    if (fiber.flags & Update) {
      commitUpdate(fiber);
    }
    if (fiber.flags & ChildDeletion) {
      commitDeletion(fiber);
    }
    
    // Walk through effect list
    const nextEffect = fiber.nextEffect;
    if (nextEffect !== null) {
      fiber = nextEffect;
    } else {
      break;
    }
  }
}
```

## The Complete Pipeline

```
User Click → setState(1)
  │
  v
Dispatch Action
  │
  v
Schedule Update on Fiber (lane = SyncLane)
  │
  v
ensureRootIsScheduled → performSyncWorkOnRoot
  │
  v
[Phase 1] Work Loop (interruptible)
  ├── beginWork (top-down)
  │     ├── FunctionComponent → execute component
  │     │     ├── useState(1) → read hook at index 0
  │     │     └── return children
  │     ├── HostComponent → create/update DOM node
  │     └── reconcileChildren → diff old vs new
  │
  └── completeWork (bottom-up)
        ├── HostComponent → finalize props
        ├── propagate flags upward
        └── create DOM instance if needed
  │
  v
[Phase 2] Commit (uninterruptible)
  ├── Before mutation → snapshot effects
  ├── Mutation → insert/update/delete DOM nodes
  ├── Layout → useLayoutEffect
  ├── Tree swap → current = new tree
  └── Passive → schedule useEffect (async)
  │
  v
Browser Paint
  │
  v
useEffect callbacks run
```

## Key Insight: Render vs. Commit

| Aspect | Render Phase | Commit Phase |
|--------|-------------|-------------|
| Interruptible? | Yes | No |
| Side effects? | No | Yes |
| DOM changes? | No | Yes |
| Re-entrant? | Can restart | Must complete |
| Called | build/update fiber tree | apply effects |

## Common Scenarios

### Initial Render
```
1. No current tree (mount)
2. Create all fibers from scratch
3. Create all DOM nodes
4. Commit with Placement flags
```

### State Update
```
1. Current tree exists
2. Build alternate tree (WIP)
3. Reuse fibers that haven't changed
4. Update changed fibers
5. Commit with Update flags
```

### Component Unmount
```
1. Work that returns null
2. Child deletion flag set
3. Commit removes DOM nodes and runs cleanup effects
```

## Reading the Source

Key files for understanding rendering:
- `src/fiber/workLoop.ts` — work loop orchestration
- `src/fiber/beginWork.ts` — begin work phase
- `src/fiber/completeWork.ts` — complete work phase
- `src/fiber/commitRoot.ts` — commit phase
- `src/fiber/childReconciler.ts` — reconciliation
