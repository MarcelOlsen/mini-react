# Tutorial 2: Reconciliation — How Diffing Works

## The Problem

When state changes, we need to update the DOM efficiently. The naive approach is "destroy everything and rebuild it." Reconciliation is the algorithm that decides *what needs to change* in the DOM.

## The Strategy

MiniReact follows React's reconciliation strategy:

1. **Element type changed?** Destroy and recreate
2. **DOM element with different tag ("div" → "span")?** Destroy and recreate
3. **Text changed?** Just update the text node
4. **List items?** Use keys to match identical items
5. **Props changed?** Update only changed props

## The Diffing Algorithm

When comparing two trees (old virtual tree and new virtual tree), MiniReact does a **single left-to-right pass** over children:

```
Old: [Apple, Banana, Cherry]
New: [Apple, Cherry, Date]

Pass 1: Apple → Apple (same, no change)
Pass 2: Banana → Cherry (different type/tag, delete Banana, insert Cherry)
Pass 3: Cherry → Date (different type/tag, delete Cherry, insert Date)
```

The key insight: if the elements have the same key as they did before, we match them even if their position changed. If we don't use keys, we match by **position**.

## When to Destroy vs. Update

The first question during reconciliation is: "Does this need to be completely replaced, or can it be updated?"

### Different Element Types

If the old element was an `<input>` and the new element is a `<span>`, we *destroy* the old element tree and insert the new one.

### Same Element Type

If both are `<input>`, we *update*:
```typescript
// Old
{ type: "input", props: { value: "hello", id: "name" } }
// New
{ type: "input", props: { value: "world", id: "name" } }

// Only `value` changed → update that single attribute
```

### Text Nodes

Text nodes are the "cheap" case:
```typescript
// Text node just needs its textContent updated
oldNode.textContent = newText;
```

## Reconciling Children

This is where the real work happens. For each child in the new tree, we need to decide: should it be created, updated, or moved?

### With Keys

Keys tell the reconciler: "This is the same logical element, even if it's in a different position."

```typescript
// Old
[li(key=1, "Apple"), li(key=2, "Banana"), li(key=3, "Cherry")]

// New (reordered)
[li(key=3, "Cherry"), li(key=1, "Apple"), li(key=2, "Banana")]

// Result: elements move to new positions, no DOM creation/deletion
```

### Without Keys

Without keys, reconciliation is simpler and faster but less efficient for lists:
```
Old: [A, B, C]
New: [C, A, B]
// No keys → compare by position
// Position 0: A vs C → Delete A, insert C
// Position 1: B vs A → Delete B, insert A
// Position 2: C vs B → Delete C, insert B
// Result: 3 deletions + 3 insertions (worst case)
```

## Effects and Flags

During reconciliation, each fiber accumulates **flags** indicating what side-effects need to happen during commit:

```typescript
Placement      — New node, needs to be inserted into DOM
Update        — Existing node, props changed
ChildDeletion — Child needs to be removed
ContentReset   — Text content needs updating
```

## How It Actually Works in Code

### The High-Level Flow

```typescript
function reconcileChildren(current, workInProgress, nextChildren) {
  // If no current → mount (first render)
  // If current → update (subsequent render)
}

// For Mount
function mountChildFibers(returnFiber, newChildren) {
  // Just create all fibers fresh, no comparisons needed
  return createFiberFromElement(child);
}

// For Update
function reconcileChildFibers(returnFiber, currentFirstChild, newChildren) {
  // Compare old children with new children
  // Case 1: Current is null, next is object → mount
  // Case 2: Current is text, next is object → delete text, mount object
  // Case 3: Current is object, next is text → delete object, mount text
  // Case 4: Both objects with same type → reuse, update props
  // Case 5: Both objects with different types → delete old, mount new
}
```

### Key-Based Reconciliation in Detail

When children have keys, we use a **map** to associate old fibers with their keys:

```typescript
function reconcileChildrenArray(returnFiber, currentFirstChild, newChildren) {
  // Step 1: Walk both old and new children simultaneously from the left
  // while they match by key. This handles the common case: add/remove at end.

  // Step 2: If we ran out of old children but have new ones:
  // Insert all remaining new children.

  // Step 3: If we ran out of new children but have old ones:
  // Delete all remaining old children.

  // Step 4: Both have leftover children that don't match in position.
  // Build a map of old children by key, then for each new child:
  //   - If key exists in map: move it to new position
  //   - If key doesn't exist: create new
  //   - Any old keys not used: delete
}
```

## Exercise

Without writing code, trace the reconciliation for:

Old tree:
```html
<ul>
  <li key="a">Item A</li>
  <li key="b">Item B</li>
  <li key="c">Item C</li>
</ul>
```

New tree:
```html
<ul>
  <li key="a">Item A (updated)</li>
  <li key="d">Item D</li>
  <li key="c">Item C</li>
</ul>
```

What operations are performed? (Insertion, deletion, update, move)

## Key Takeaways

1. **Reconciliation = diffing old virtual tree vs new virtual tree**
2. **Two cases**: mount (first render, nothing to diff) and update (subsequent render, must compare)
3. **Different element types →** destroy and recreate
4. **Same element type →** update props, diff children
5. **Keys let us match** items even when they change position
6. **Reconciliation produces flags** that tell the commit phase what DOM operations to perform

## Common Pitfalls

1. **Missing keys in lists**: Causes entire list to be recreated on reorder
2. **Using index as key**: Breaks state when items are reordered
3. **Mutating children array directly**: React/MiniReact expects a fresh array each render

In the next tutorial, we'll explore how the Fiber architecture enables interruptible rendering.
