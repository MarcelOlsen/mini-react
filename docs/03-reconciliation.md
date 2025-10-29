# Reconciliation

## Overview

Reconciliation is the diffing algorithm that figures out what changed between renders. It's probably the most complex part of the fiber system, but also the most important for performance. The goal is to compute the minimal set of DOM operations needed to update the UI.

**Location**: `src/fiber/reconcileChildren.ts`

## The Core Problem

When a component re-renders with new children, we need to figure out:

- Which children stayed the same (reuse them)
- Which children changed (update them)
- Which children are new (create them)
- Which children were removed (delete them)
- Which children moved (rearrange them)

Doing this naively would be O(n³) for comparing two trees. React's reconciliation algorithm brings this down to O(n) by making a few assumptions:

1. Different component types produce different trees
2. The developer can hint at stability with `key` prop
3. Children at the same level can be compared by position or key

## Entry Point

Reconciliation starts in `reconcileChildren`:

```typescript
export function reconcileChildren(
  current: Fiber | null,
  workInProgress: Fiber,
  newChildren: AnyMiniReactElement | AnyMiniReactElement[]
): void {
  const elements = normalizeChildren(newChildren)

  if (current === null) {
    // Mount - create all new fibers
    workInProgress.child = mountChildFibers(workInProgress, elements)
  } else {
    // Update - diff against previous children
    workInProgress.child = reconcileChildFibers(
      workInProgress,
      current.child,
      elements
    )
  }
}
```

The split between mount and update is important. On mount, we know everything is new so we can skip the diffing logic entirely.

## Normalizing Children

Before we can reconcile, we need to normalize the children into a flat array:

```typescript
function normalizeChildren(
  children: AnyMiniReactElement | AnyMiniReactElement[]
): AnyMiniReactElement[] {
  const result: AnyMiniReactElement[] = []
  const childrenArray = Array.isArray(children) ? children : [children]

  for (const child of childrenArray) {
    // Skip null, undefined, booleans
    if (child === null || child === undefined || typeof child === 'boolean') {
      continue
    }

    // Recursively flatten nested arrays
    if (Array.isArray(child)) {
      result.push(...normalizeChildren(child))
      continue
    }

    // Convert primitives to text elements
    if (typeof child === 'string' || typeof child === 'number') {
      result.push({
        type: TEXT_ELEMENT,
        props: { nodeValue: child, children: [] }
      })
      continue
    }

    // Regular element
    result.push(child)
  }

  return result
}
```

This handles a bunch of edge cases:

- Nested arrays get flattened
- Primitives become text elements
- Null/undefined/booleans are filtered out
- Regular elements pass through

## Mount Path

When mounting (first render), we just create all the fibers:

```typescript
function mountChildFibers(
  returnFiber: Fiber,
  newChildren: AnyMiniReactElement[]
): Fiber | null {
  if (newChildren.length === 0) return null

  let previousNewFiber: Fiber | null = null
  let resultingFirstChild: Fiber | null = null

  for (let i = 0; i < newChildren.length; i++) {
    const element = newChildren[i]
    const newFiber = createFiberFromElement(element)

    newFiber.return = returnFiber
    newFiber.index = i
    newFiber.effectTag = Placement

    // Build sibling chain
    if (i === 0) {
      resultingFirstChild = newFiber
    } else if (previousNewFiber !== null) {
      previousNewFiber.sibling = newFiber
    }

    previousNewFiber = newFiber
  }

  return resultingFirstChild
}
```

All fibers get marked with `Placement` effect tag since they all need to be inserted into the DOM.

## Update Path

The update path is where it gets interesting. We have three cases to handle:

1. **No new children**: Delete all old children
2. **Single child**: Optimized path for common case
3. **Multiple children**: Full reconciliation with key-based diffing

```typescript
function reconcileChildFibers(
  returnFiber: Fiber,
  currentFirstChild: Fiber | null,
  newChildren: AnyMiniReactElement[]
): Fiber | null {
  if (newChildren.length === 0) {
    return deleteRemainingChildren(returnFiber, currentFirstChild)
  }

  if (newChildren.length === 1) {
    return reconcileSingleElement(
      returnFiber,
      currentFirstChild,
      newChildren[0]
    )
  }

  return reconcileChildrenArray(returnFiber, currentFirstChild, newChildren)
}
```

## Single Element Reconciliation

When there's only one new child, we can optimize:

```typescript
function reconcileSingleElement(
  returnFiber: Fiber,
  currentFirstChild: Fiber | null,
  element: AnyMiniReactElement
): Fiber | null {
  const key = getElementKey(element)
  const elementType = getElementType(element)
  let child = currentFirstChild

  // Search for a matching old child
  while (child !== null) {
    if (child.effectTag === Deletion) {
      child = child.sibling
      continue
    }

    if (child.key === key) {
      if (isSameElementType(child.type, elementType)) {
        // Found a match - reuse this fiber
        deleteRemainingChildren(returnFiber, child.sibling)

        const existing = createWorkInProgress(child, element.props)
        existing.return = returnFiber
        existing.index = 0
        existing.sibling = null
        existing.effectTag = UpdateEffect

        return existing
      }

      // Key matches but type changed
      deleteRemainingChildren(returnFiber, child)
      break
    }

    // No match - delete this child
    deleteChild(returnFiber, child)
    child = child.sibling
  }

  // No match found - create new fiber
  const newFiber = createFiberFromElement(element)
  newFiber.return = returnFiber
  newFiber.index = 0
  newFiber.effectTag = Placement

  return newFiber
}
```

The logic is:

- Try to find an old child with matching key and type
- If found, reuse it (mark as UPDATE)
- If not found, create new (mark as PLACEMENT)
- Delete any old children that don't match

## Array Reconciliation

This is the most complex case. We need to handle arbitrary adds, removes, moves, and updates:

```typescript
function reconcileChildrenArray(
  returnFiber: Fiber,
  currentFirstChild: Fiber | null,
  newChildren: AnyMiniReactElement[]
): Fiber | null {
  // Check if we have any keyed children
  const hasKeyedChildren =
    newChildren.some(el => getElementKey(el) !== null) ||
    (currentFirstChild !== null && hasAnyKeyedChild(currentFirstChild))

  // Build maps of old children
  const { keyedChildren, allChildren } = mapRemainingChildren(currentFirstChild)

  let resultingFirstChild: Fiber | null = null
  let previousNewFiber: Fiber | null = null
  let lastPlacedIndex = 0

  const reusedChildren = new Set<Fiber>()

  for (let newIdx = 0; newIdx < newChildren.length; newIdx++) {
    const element = newChildren[newIdx]
    const key = getElementKey(element)
    let newFiber: Fiber | null = null

    if (key !== null) {
      // Keyed child - look up in map
      newFiber = updateSlot(
        returnFiber,
        keyedChildren,
        element,
        key,
        lastPlacedIndex
      )
    } else if (!hasKeyedChildren) {
      // Unkeyed child AND no keyed children - match by position
      const oldFiber = allChildren[newIdx]
      if (
        oldFiber &&
        oldFiber.key === null &&
        isSameElementType(oldFiber.type, getElementType(element))
      ) {
        // Reuse by position
        newFiber = createWorkInProgress(oldFiber, element.props)
        newFiber.sibling = null
        newFiber.effectTag = UpdateEffect
        reusedChildren.add(oldFiber)
      } else {
        // Create fresh
        newFiber = createFiberFromElement(element)
        newFiber.effectTag = Placement
      }
    } else {
      // Unkeyed child BUT keyed children exist - create fresh
      newFiber = createFiberFromElement(element)
      newFiber.effectTag = Placement
    }

    if (newFiber === null) continue

    // Update lastPlacedIndex for move detection
    if (newFiber.alternate !== null) {
      reusedChildren.add(newFiber.alternate)
      const oldIndex = newFiber.alternate.index
      if (oldIndex >= lastPlacedIndex) {
        lastPlacedIndex = oldIndex
      } else {
        // Fiber moved backward
        newFiber.effectTag = Placement
      }
    }

    newFiber.index = newIdx
    newFiber.return = returnFiber

    // Build sibling chain
    if (newIdx === 0) {
      resultingFirstChild = newFiber
    } else if (previousNewFiber !== null) {
      previousNewFiber.sibling = newFiber
    }

    previousNewFiber = newFiber
  }

  // Delete unreused children
  for (const child of allChildren) {
    if (!reusedChildren.has(child)) {
      deleteChild(returnFiber, child)
    }
  }

  return resultingFirstChild
}
```

This is doing a lot, so let's break it down.

## The Keyed vs Unkeyed Problem

When all children have keys, reconciliation is straightforward - match by key and type. When none have keys, we can match by position and type. But what about mixing the two?

Consider:

```
Old: [A(key), B, C(key)]
New: [C(key), D, A(key)]
```

If we matched B by position, it would match with D, which is wrong. When keys are present anywhere in the list, position becomes unreliable for unkeyed children.

Solution: Detect if any children (old or new) have keys. If so, unkeyed children are created fresh rather than matched by position.

```typescript
const hasKeyedChildren =
  newChildren.some(el => getElementKey(el) !== null) ||
  (currentFirstChild !== null && hasAnyKeyedChild(currentFirstChild))
```

## Mapping Old Children

We build two data structures from the old children:

```typescript
function mapRemainingChildren(currentFirstChild: Fiber | null) {
  const keyedChildren = new Map<string | number, Fiber>()
  const allChildren: Fiber[] = []

  let existingChild = currentFirstChild

  while (existingChild !== null) {
    if (existingChild.effectTag !== Deletion) {
      if (existingChild.key !== null) {
        keyedChildren.set(existingChild.key, existingChild)
      }
      allChildren.push(existingChild)
    }
    existingChild = existingChild.sibling
  }

  return { keyedChildren, allChildren }
}
```

The `keyedChildren` map lets us quickly look up old children by key. The `allChildren` array lets us match by position when appropriate.

## Movement Detection

The `lastPlacedIndex` is a clever trick for detecting moves:

```typescript
let lastPlacedIndex = 0

for (let newIdx = 0; newIdx < newChildren.length; newIdx++) {
  // ... create or reuse fiber

  if (newFiber.alternate !== null) {
    const oldIndex = newFiber.alternate.index
    if (oldIndex >= lastPlacedIndex) {
      // Didn't move (or moved forward)
      lastPlacedIndex = oldIndex
    } else {
      // Moved backward - needs placement
      newFiber.effectTag = Placement
    }
  }
}
```

The idea: As we process new children left to right, we track the highest old index we've seen. If we encounter an old child with a lower index, it means it moved backward in the list and needs to be repositioned.

Example:

```
Old: [A(0), B(1), C(2), D(3)]
New: [C, A, D, B]

Processing:
- C (oldIndex=2): lastPlacedIndex = 2, no move
- A (oldIndex=0): 0 < 2, mark for placement
- D (oldIndex=3): lastPlacedIndex = 3, no move
- B (oldIndex=1): 1 < 3, mark for placement
```

This efficiently detects moves with a single pass.

## Type Matching

We need to determine if two fibers are the same type:

```typescript
function isSameElementType(a: ElementType, b: ElementType): boolean {
  // Both strings - compare directly
  if (typeof a === 'string' && typeof b === 'string') {
    return a === b
  }

  // Both functions - compare references
  if (typeof a === 'function' && typeof b === 'function') {
    return a === b
  }

  // Both symbols - compare directly
  if (typeof a === 'symbol' && typeof b === 'symbol') {
    return a === b
  }

  return false
}
```

If types match and keys match, we can reuse the fiber. Otherwise, we need to create a new one.

## Deletion

When a fiber can't be reused, we mark it for deletion:

```typescript
function deleteChild(returnFiber: Fiber, childToDelete: Fiber): void {
  childToDelete.effectTag = Deletion

  // Add to parent's deletion list
  if (!returnFiber.deletions) {
    returnFiber.deletions = []
  }
  returnFiber.deletions.push(childToDelete)

  // Add to effect list
  if (returnFiber.lastEffect !== null) {
    returnFiber.lastEffect.nextEffect = childToDelete
    returnFiber.lastEffect = childToDelete
  } else {
    returnFiber.firstEffect = childToDelete
    returnFiber.lastEffect = childToDelete
  }
}
```

Deletions are stored both in a `deletions` array on the parent and in the effect list. The commit phase will process these and remove the DOM nodes.

## Performance Characteristics

The reconciliation algorithm is O(n) where n is the number of children:

**Best Case**: All children unchanged - we just verify keys and types

**Average Case**: Some adds/removes/moves - we process each child once

**Worst Case**: Complete replacement - we still only process each child once

The key insight that makes this fast: We don't try to find the optimal set of moves. We use heuristics (same key/type) to make good-enough decisions quickly.

## Common Patterns

**Appending**: Adding items to the end is optimal - all old items stay in place, new items get Placement

**Prepending**: Adding items to the start requires moving all old items (they get Placement tags)

**Removing**: Removed items get Deletion tags, others stay in place

**Reordering with Keys**: Only the items that actually moved get Placement tags

**Mixed Keys**: Unkeyed children are recreated to be safe

## Edge Cases

**Duplicate Keys**: We take the first match and ignore duplicates. This is a developer error but we handle it gracefully.

**Null Elements**: Filtered out during normalization.

**Fragments**: Fragments are reconciled normally, but their children are hoisted up during rendering.

**Portals**: Reconciled like regular components, but their children render to a different container.

## Debugging Tips

If reconciliation isn't working right:

1. Check if keys are stable (not random or based on index)
2. Verify `isSameElementType` is working correctly
3. Look for duplicate keys in lists
4. Check if elements are being normalized correctly

Add logging to see what's happening:

```typescript
console.log('Reconciling:', {
  newChildren: newChildren.length,
  oldChildren: currentFirstChild ? 'present' : 'none',
  hasKeys: hasKeyedChildren
})
```

## Future Optimizations

Some ideas for making this even faster:

**Bailout Earlier**: If props haven't changed and we're using the same element reference, skip reconciliation

**Lazy Reconciliation**: For hidden subtrees (like collapsed accordions), defer reconciliation until they're visible

**Stable Keys**: If all keys are stable and in the same order, we could skip building the map

**Partial Hydration**: For SSR, we could skip reconciliation for parts that haven't changed since server render

## Summary

Reconciliation is the heart of React's performance story. The algorithm:

- Normalizes children into a consistent format
- Handles mounting efficiently (no diffing needed)
- Uses keys to identify stable elements across renders
- Detects moves with a single-pass algorithm
- Marks fibers with appropriate effect tags
- Handles edge cases like mixed keyed/unkeyed children

The result is an O(n) algorithm that produces a good-enough (if not optimal) set of DOM operations to update the UI efficiently.
