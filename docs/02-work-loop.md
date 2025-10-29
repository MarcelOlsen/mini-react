# Work Loop

## Overview

The work loop is where the rendering actually happens. It's the engine that drives the entire fiber system, coordinating between the render and commit phases. Think of it as the main game loop in a video game - it keeps running until all the work is done.

**Location**: `src/fiber/workLoop.ts`

## Core Responsibilities

The work loop handles a few key things:

1. Scheduling updates when components change
2. Building the work-in-progress tree
3. Processing units of work one by one
4. Committing changes when rendering is complete
5. Tracking which fiber we're currently working on

## Global State

We maintain a couple of key pieces of global state:

```typescript
let workInProgress: Fiber | null = null
let workInProgressRoot: FiberRoot | null = null
```

These track what we're currently working on. When `workInProgress` is null, we know rendering is complete.

## Entry Point: scheduleUpdateOnFiber

When something changes (like when you call `setState`), we need to kick off an update. The entry point is `scheduleUpdateOnFiber`:

```typescript
export function scheduleUpdateOnFiber(fiber: Fiber): void {
  const root = getRootFromFiber(fiber)
  performSyncWorkOnRoot(root)
}
```

Pretty straightforward. We find the root of the tree and start working on it. The function walks up the fiber tree using the `return` pointer until it hits a fiber with no parent - that's the root.

## Finding the Root

```typescript
function getRootFromFiber(fiber: Fiber): FiberRoot {
  let node = fiber

  while (node.return !== null) {
    node = node.return
  }

  // Root fiber's stateNode is the FiberRoot
  return node.stateNode as FiberRoot
}
```

This is important because we always start rendering from the root, even if the update originated from a deeply nested component. This ensures we have a consistent view of the entire tree.

## Performing Work

The main rendering function is `performSyncWorkOnRoot`:

```typescript
function performSyncWorkOnRoot(root: FiberRoot): void {
  trackRenderStart()

  // Render phase - build the work-in-progress tree
  renderRootSync(root)

  // Commit phase - apply changes to DOM
  const finishedWork = root.finishedWork
  if (finishedWork !== null) {
    commitRoot(root)
  }

  trackRenderEnd()
}
```

The "sync" in the name means it all happens synchronously without yielding. In the future, we could have `performConcurrentWorkOnRoot` that yields periodically to keep the UI responsive.

## Building the Tree

`renderRootSync` is where we actually build the work-in-progress tree:

```typescript
function renderRootSync(root: FiberRoot): void {
  workInProgressRoot = root

  // Clone the current tree to create work-in-progress
  const rootWorkInProgress = createWorkInProgress(
    root.current,
    root.current.pendingProps
  )
  workInProgress = rootWorkInProgress

  // Process all work
  workLoopSync()

  // Save the result
  workInProgressRoot = null
  workInProgress = null
  root.finishedWork = rootWorkInProgress
}
```

A few things to note here:

- We create the work-in-progress root from the current root
- We set `workInProgress` to start the loop
- After the loop completes, we save the finished tree on the root
- We clean up the global state

## The Actual Loop

Here's where the magic happens:

```typescript
function workLoopSync(): void {
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress)
  }
}
```

Yep, that's it. Just a simple while loop. The complexity is in `performUnitOfWork`, which updates `workInProgress` to the next fiber that needs processing.

For concurrent mode in the future, this would become:

```typescript
function workLoopConcurrent(): void {
  while (workInProgress !== null && !shouldYield()) {
    performUnitOfWork(workInProgress)
  }
}
```

The `shouldYield()` function would check if we've used up our time slice and need to let the browser do other work.

## Processing a Unit of Work

Each fiber is a "unit of work" that needs to be processed:

```typescript
function performUnitOfWork(unitOfWork: Fiber): void {
  const current = unitOfWork.alternate

  // Begin work - process this fiber
  let next: Fiber | null = null
  try {
    next = beginWork(current, unitOfWork)
  } catch (error) {
    console.error('Error in beginWork:', error)
    throw error
  }

  // Update memoized props
  unitOfWork.memoizedProps = unitOfWork.pendingProps

  if (next === null) {
    // No children, complete this fiber
    completeUnitOfWork(unitOfWork)
  } else {
    // Has children, process them next
    workInProgress = next
  }
}
```

The pattern is:

1. Call `beginWork` to process the fiber and reconcile children
2. If it returns a child, that child is next
3. If it returns null, we're done with this subtree and call `completeUnitOfWork`

## Completing Work

When a fiber has no more children to process, we complete it:

```typescript
function completeUnitOfWork(unitOfWork: Fiber): void {
  let completedWork: Fiber | null = unitOfWork

  while (completedWork !== null) {
    const current = completedWork.alternate
    const returnFiber = completedWork.return

    // Complete this fiber
    try {
      completeWork(current, completedWork)
    } catch (error) {
      console.error('Error in completeWork:', error)
      throw error
    }

    // Build the effect list
    if (returnFiber !== null) {
      // Append child effects to parent
      if (completedWork.firstEffect !== null) {
        if (returnFiber.lastEffect !== null) {
          returnFiber.lastEffect.nextEffect = completedWork.firstEffect
        } else {
          returnFiber.firstEffect = completedWork.firstEffect
        }
        returnFiber.lastEffect = completedWork.lastEffect
      }

      // Add this fiber's effect if it has one
      if (completedWork.effectTag !== null) {
        if (returnFiber.lastEffect !== null) {
          returnFiber.lastEffect.nextEffect = completedWork
        } else {
          returnFiber.firstEffect = completedWork
        }
        returnFiber.lastEffect = completedWork
      }
    }

    // Move to sibling or return to parent
    const siblingFiber = completedWork.sibling
    if (siblingFiber !== null) {
      workInProgress = siblingFiber
      return
    }

    completedWork = returnFiber
    workInProgress = completedWork
  }
}
```

This function does a few important things:

**Completes the Fiber**: Calls `completeWork` to create/update DOM nodes

**Builds Effect List**: This is crucial for performance. As we complete each fiber, we bubble up its effects to the parent. By the time we complete the root, it has a linked list of all fibers with effects.

**Moves to Next Work**: Tries the sibling first (breadth at this level), then returns to parent

## Tree Traversal Order

The combination of `performUnitOfWork` and `completeUnitOfWork` gives us a depth-first traversal:

```
        A
       / \
      B   C
     / \
    D   E

Order:
1. beginWork(A) -> returns B
2. beginWork(B) -> returns D
3. beginWork(D) -> returns null
4. completeWork(D)
5. beginWork(E) -> returns null
6. completeWork(E)
7. completeWork(B)
8. beginWork(C) -> returns null
9. completeWork(C)
10. completeWork(A)
```

We go deep (begin work) until we hit a leaf, then bubble back up (complete work), then move to siblings.

## Error Handling

Right now error handling is pretty basic - we log and rethrow:

```typescript
try {
  next = beginWork(current, unitOfWork)
} catch (error) {
  console.error('Error in beginWork:', error)
  throw error
}
```

In the future, this is where error boundaries would come in. We'd catch errors and look up the tree for an error boundary fiber, then render its fallback UI.

## Performance Tracking

We wrap the work loop with performance tracking:

```typescript
trackRenderStart()
// ... do work
trackRenderEnd()
```

This lets us measure how long renders take, which is useful for profiling and optimization.

## Concurrent Mode Considerations

The current implementation is synchronous, but the structure supports concurrent mode. Here's what would change:

**Time Slicing**: Instead of processing all work at once, we'd break it into chunks and yield between chunks.

```typescript
function workLoopConcurrent(): void {
  while (workInProgress !== null && !shouldYield()) {
    performUnitOfWork(workInProgress)
  }

  if (workInProgress !== null) {
    // More work to do, schedule it
    scheduleCallback(performConcurrentWorkOnRoot)
  }
}
```

**Priority Lanes**: Different updates would have different priorities. High priority (like typing) would interrupt low priority (like data fetching).

**Interruptible Rendering**: We could start rendering an update, pause it to handle a more urgent update, then resume the paused update.

**Suspense**: We could suspend rendering while waiting for data and continue when it's ready.

All of this is possible because the work loop is iterative and maintains its state in the fiber tree, not on the call stack.

## Memory and Performance

The work loop is designed to be efficient:

**No Recursion**: Iterative traversal means no stack overflow risk

**Minimal Allocations**: We reuse fibers through the alternate pointer

**Effect List**: Only process changed fibers during commit, not the entire tree

**Early Bailout**: In begin work, we can skip subtrees that didn't change

**Memoization**: Components can bail out if props haven't changed

## Integration Points

The work loop coordinates with several other systems:

**Begin Work**: Calls this to process each fiber and reconcile children

**Complete Work**: Calls this to create DOM nodes and build effect lists

**Commit Work**: Calls this to apply all changes to the DOM

**Hooks**: The work loop manages the current fiber, which hooks use to store state

**Scheduler**: In concurrent mode, the scheduler would control when the work loop runs

## Debugging Tips

If something's not rendering, check:

1. Is `scheduleUpdateOnFiber` being called?
2. Is the work loop completing (does `workInProgress` become null)?
3. Is the effect list being built correctly?
4. Is commit running after render completes?

You can add logging to track the traversal:

```typescript
function performUnitOfWork(unitOfWork: Fiber): void {
  console.log('Processing:', unitOfWork.type)
  // ... rest of function
}
```

## Summary

The work loop is the coordination layer that makes fiber work. It's responsible for:

- Starting rendering when updates happen
- Building the work-in-progress tree incrementally
- Collecting effects into a list for efficient commit
- Coordinating between render and commit phases
- Maintaining the current state of rendering work

The synchronous implementation we have now is simple and correct. The architecture supports adding concurrent features later without major changes to the overall structure.
