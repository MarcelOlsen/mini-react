# Fiber Architecture Overview

## Introduction

The fiber architecture is the backbone of MiniReact's rendering system. If you're familiar with React, this should feel pretty similar. The core idea is breaking down rendering work into small units that can be paused, resumed, and prioritized.

## What is a Fiber?

A fiber is basically a JavaScript object that represents a unit of work. Think of it as a node in a tree where each node knows about its parent, children, and siblings. This structure lets us traverse the tree without recursion, which is key for being able to pause and resume work.

```typescript
interface Fiber {
  // Identity - what kind of thing is this?
  type: ElementType        // 'div', a function, or a symbol
  key: string | null       // For reconciliation

  // Relationships - how fibers connect to each other
  return: Fiber | null     // Parent fiber
  child: Fiber | null      // First child
  sibling: Fiber | null    // Next sibling
  index: number            // Position among siblings

  // State - what's the current status?
  stateNode: Node | ...    // The actual DOM node or metadata
  pendingProps: Props      // Props we're working with
  memoizedProps: Props     // Props from last commit

  // Work tracking
  alternate: Fiber | null  // Link to the other tree
  effectTag: EffectTag     // What needs doing (place, update, delete)

  // Effects - side effects to apply
  nextEffect: Fiber | null
  firstEffect: Fiber | null
  lastEffect: Fiber | null
  deletions: Fiber[] | null

  // Hooks and context
  hooks: Hook[] | null
  hookCursor: number
  contextValues: Map<Context, unknown> | null
  ref: RefObject | RefCallback | null
}
```

## The Double-Buffer Pattern

Here's where it gets interesting. We maintain two fiber trees at any given time:

**Current Tree**: This reflects what's actually in the DOM right now. It's the committed state that users can see.

**Work-in-Progress Tree**: This is what we're building during the render phase. It's like a draft that we can throw away if something goes wrong.

These trees are linked through the `alternate` property. When we start rendering, we clone the current tree to create the work-in-progress tree. After we finish rendering and commit the changes, the work-in-progress becomes the new current.

```
Current Tree              Work-in-Progress Tree
┌─────────┐              ┌─────────┐
│  Root   │ <─alternate─>│  Root   │
└────┬────┘              └────┬────┘
     │                        │
┌────▼────┐              ┌────▼────┐
│   App   │ <─alternate─>│   App   │
└────┬────┘              └────┬────┘
     │                        │
┌────▼────┐              ┌────▼────┐
│  Div    │ <─alternate─>│  Div    │
└─────────┘              └─────────┘
```

Why bother with two trees? A few reasons:

1. **Error Recovery**: If something crashes during render, we still have the current tree intact
2. **Concurrent Mode Ready**: We can work on updates without disrupting what's on screen
3. **Efficient Updates**: We can compare the two trees to figure out exactly what changed

## The Rendering Pipeline

Rendering happens in two distinct phases that have very different characteristics:

### Render Phase (Interruptible)

This is where we build the work-in-progress tree. It's pure and has no side effects, which means we can pause it, throw it away, or restart it without any consequences.

The render phase walks through the tree doing two main things:

1. **Begin Work**: Process each fiber, call component functions, reconcile children
2. **Complete Work**: Create or update DOM nodes, build effect lists

The key insight here is that we're not touching the real DOM yet. We're just preparing a plan for what needs to change.

### Commit Phase (Synchronous and Atomic)

Once the render phase is done, we move to the commit phase. This is where we actually apply changes to the DOM. Unlike the render phase, this must complete without interruption. It happens in three sub-phases:

1. **Before Mutation**: Take any snapshots we need (future work for getSnapshotBeforeUpdate)
2. **Mutation**: Apply all DOM changes - insertions, updates, deletions
3. **Layout**: Run layout effects, attach refs

After the commit phase completes, users see the updated UI and the work-in-progress tree becomes the new current tree.

## Effect Lists

One of the clever optimizations in the fiber architecture is the effect list. During the render phase, as we complete each fiber, we build a linked list of all fibers that have side effects (things that need placement, updates, or deletion).

When we get to the commit phase, instead of walking the entire tree again, we just walk this effect list. This means if you have a tree with 10,000 nodes but only 5 changed, we only process those 5 nodes during commit.

```typescript
// Each fiber can point to the next effect
fiber.nextEffect = anotherFiber

// The root tracks the first and last effects
root.firstEffect = firstEffectFiber
root.lastEffect = lastEffectFiber
```

## Tree Traversal Without Recursion

Traditional recursive tree traversal can blow the stack with deep trees. Fiber solves this by using the sibling pointers to implement depth-first traversal iteratively.

Here's the basic pattern:

```typescript
function workLoop() {
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress)
  }
}

function performUnitOfWork(fiber) {
  // Process this fiber
  const next = beginWork(fiber)

  if (next) {
    // Has children, go to first child
    workInProgress = next
  } else {
    // No children, complete this fiber
    completeUnitOfWork(fiber)
  }
}

function completeUnitOfWork(fiber) {
  while (fiber) {
    completeWork(fiber)

    if (fiber.sibling) {
      // Move to sibling
      workInProgress = fiber.sibling
      return
    }

    // No sibling, go back to parent
    fiber = fiber.return
  }

  workInProgress = null
}
```

This gives us the same depth-first order as recursion but without the stack depth issues.

## Fiber Types

Different fiber types get handled differently:

**Host Components** (like 'div', 'span'): These create actual DOM nodes. During complete work, we call `document.createElement` and set up properties.

**Function Components**: These don't create DOM nodes themselves. During begin work, we call the function and reconcile its return value.

**Text Elements**: Special host components that create text nodes with `document.createTextNode`.

**Fragments**: Don't create any DOM nodes, just a container for grouping children.

**Portals**: Create a different rendering context, allowing children to render into a different DOM container.

**Context Providers**: Update context values for their subtree.

## Work-in-Progress Creation

When we create a work-in-progress fiber from a current fiber, we try to reuse as much as possible:

```typescript
function createWorkInProgress(current, pendingProps) {
  let workInProgress = current.alternate

  if (workInProgress === null) {
    // First update, create a new fiber
    workInProgress = createFiber(current.type, pendingProps, current.key)
    workInProgress.alternate = current
    current.alternate = workInProgress
  } else {
    // Reuse the existing alternate
    workInProgress.pendingProps = pendingProps
    workInProgress.effectTag = null
    workInProgress.nextEffect = null
    workInProgress.firstEffect = null
    workInProgress.lastEffect = null
  }

  // Copy over state from current
  workInProgress.child = current.child
  workInProgress.memoizedProps = current.memoizedProps
  workInProgress.memoizedState = current.memoizedState
  // ... copy other fields

  return workInProgress
}
```

This pooling strategy reduces garbage collection pressure.

## Priority and Scheduling

Currently, all work is synchronous and happens in one go. But the architecture is set up to support different priority levels:

```typescript
// Future work
const lanes = {
  NoLane: 0,
  SyncLane: 1,
  InputContinuousLane: 2,
  DefaultLane: 4,
  IdleLane: 8
}
```

The idea is that urgent updates (like typing in an input) would get higher priority than non-urgent updates (like data fetching results). The fiber structure makes this possible because we can pause low-priority work to handle high-priority updates.

## Memory Management

The fiber tree can get pretty large, so memory management matters. A few strategies we use:

**Reuse Fibers**: The alternate pattern means we're not constantly allocating new fibers

**Clear Effect Lists**: After commit, we clear out all the effect pointers so garbage collection can happen

**Minimal Cloning**: We only clone what changed, not the entire tree

**WeakMaps**: For things like event system integration, we use WeakMaps so fibers can be garbage collected when no longer needed

## Putting It All Together

When you call `render()`:

1. Create or get the fiber root for the container
2. Update the root fiber's pending props with the new element
3. Schedule an update by calling the work loop
4. The work loop builds the work-in-progress tree
5. During the render phase, we figure out what changed
6. During the commit phase, we apply those changes to the DOM
7. The work-in-progress tree becomes the new current tree

The whole system is designed around making this process efficient and interruptible. The fiber architecture gives us the foundation to add features like time-slicing, Suspense, and concurrent rendering down the line.
