# Tutorial 6: Commit Phase — The Point of No Return

## The Render-Commit Separation

Up to this point, everything is **pure** — no side effects. The render phase builds a tree of JavaScript objects (fibers), compares it with the previous tree, and marks what needs to change.

The **commit phase** is where the rubber meets the road:
```
Render Phase   (interruptible, no side effects)
  Build fiber tree → Diff → Schedule effects
  
  Commit Phase (NOT interruptible, has side effects)
  → Update DOM nodes
  → Run useLayoutEffect
  → Run useEffect (scheduled, not immediate)
  */
```

## Why Two Separate Phases?

The render phase is **pure** because it must be **restartable**:
- If we need to interrupt rendering and start over with higher priority data, the partially rendered tree can be discarded
- If rendering produced side effects (like DOM mutations), we couldn't safely discard it

The commit phase is **not restartable** — it must complete from start to finish:
- DOM mutations are visible to the user
- Effects must run in a specific order
- An interrupted commit would leave the DOM in an inconsistent state

## The Three Passes of Commit

```
commitRoot(root, finishedWork)
  ├── Pass 1: Before Mutation
  │  ├── Run Snapshot Effects (rare — read DOM before mutations)
  │  ├── Prepare DOM nodes
  │  └── Prepare for ref updates
  │
  ├── Pass 2: Mutation
  │  ├── Placement: Insert new DOM nodes
  │  ├── Update: Update changed attributes/props
  │  ├── Deletion: Remove deleted DOM nodes
  │  ├── Content Reset: Update text content
  │  └── Ref Update: Unattach old refs, attach new refs
  │
  └── Pass 3: Layout Effects (synchronous)
     ├── Run useLayoutEffect creates
     ├── Run useLayoutEffect cleanups (from previous render)
     └── Read layout measurements

  Later (after browser paints):
  └── Pass 4: Passive Effects (asynchronous, via flushWork)
     ├── Run useEffect creates
     └── Run useEffect cleanups (from previous render)
```

## Pass 1: Before Mutation

Rarely used. Mainly for reading the DOM before we mutate it.

### Example Snapshot Effect

```typescript
useLayoutEffect(() => {
  const rect = node.getBoundingClientRect();
  // Read old position before it potentially changes
}, []);
```

## Pass 2: Mutation — DOM Updates

This is where the actual DOM work happens. MiniReact uses the `flags` stored during reconciliation to know what to do.

### Effect Flags

Each fiber has `flags` and `subtreeFlags`:

```typescript
Placement      = 1 << 0;  // 0b00000001 — Node needs to be inserted
Update         = 1 << 1;  // 0b00000010 — Props changed
ChildDeletion  = 1 << 2;  // 0b00000100 — Children need removal
ContentReset   = 1 << 3;  // 0b00001000 — Text content changed
Ref            = 1 << 4;  // 0b00010000 — Refs need updating
Snapshot       = 1 << 5;  // 0b00100000 — Snapshot before commit
Callback       = 1 << 6;  // 0b01000000 — Callback needs firing
Passive        = 1 << 7;  // 0b10000000 — useEffect needs running
```

### Committing Placements

```typescript
function commitPlacement(finishedWork) {
  // Find the nearest parent that's a DOM node
  const parentFiber = getHostParentFiber(finishedWork);
  const parent = parentFiber.stateNode;
  
  // Find the sibling before which to insert
  const before = getHostSibling(finishedWork);
  
  if (before) {
    parent.insertBefore(finishedWork.stateNode, before);
  } else {
    parent.appendChild(finishedWork.stateNode);
  }
}
```

### Committing Updates

For DOM nodes that existed before but whose props changed:

```typescript
function commitUpdate(fiber) {
  const instance = fiber.stateNode;
  const { style, className, ...domProps } = fiber.memoizedProps;
  
  // Style updates
  if (style !== fiber.alternate.memoizedProps.style) {
    updateStyle(instance, style);
  }
  
  // Class updates
  if (className !== fiber.alternate.memoizedProps.className) {
    instance.className = className;
  }
  
  // Attribute updates
  updateAttributes(instance, domProps);
}
```

### Committing Deletions

```typescript
function commitDeletion(fiber) {
  // Unmount component tree
  unmountFiber(fiber);
  
  // Remove from DOM
  const parent = getHostParentFiber(fiber);
  parent.stateNode.removeChild(fiber.stateNode);
}
```

## Pass 3: Layout Effects

Layout effects run **synchronously** after all DOM mutations, but **before** the browser paints. This means you can read layout measurements and the DOM will reflect the new state.

```typescript
function commitLayoutEffects(root, finishedWork) {
  // Walk tree from leaves to root
  runLayoutEffectCreates(finishedWork);   // First: create new effects
  runLayoutEffectCleanups(finishedWork);   // Then: clean up old effects
}
```

### Why Layout Effects Are Sync

Because they run before paint, you can measure the layout:

```typescript
useLayoutEffect(() => {
  // DOM has been updated, but browser hasn't painted yet
  const height = node.getBoundingClientRect().height;
  // This measurement reflects the *new* DOM state
}, [content]);
```

## Pass 4: Passive Effects (useEffect)

Passive effects run **asynchronously**, after the browser has painted:

```typescript
// Scheduled, not immediate
scheduleCallback(
  NormalPriority,
  () => {
    runPassiveEffects(finishedWork);
  }
);
```

### Why Passive Effects Are Async

They don't block the browser from painting:

```typescript
useEffect(() => {
  // Browser has already painted the current state
  fetchData().then(setData);
  // This doesn't delay the paint
}, []);
```

## The Complete Commit Flow

```typescript
function commitRoot(root) {
  const finishedWork = root.finishedWork;
  
  // --- Phase 1: Before Mutation ---
  commitBeforeMutationEffects();
  
  // --- Phase 2: Mutation (DOM changes) ---
  commitMutationEffects(finishedWork, root);
  
  // --- Phase 3: Layout Effects ---
  commitLayoutEffects(finishedWork);
  
  // --- Swap trees ---
  root.current = finishedWork.alternate;
  finishedWork.alternate = root.current;
  
  // --- Phase 4: Passive Effects (scheduled) ---
  scheduleCallback(NormalPriority, () => runPassiveEffects());
}
```

## Refs During Commit

Refs are a special kind of layout effect. They must be updated synchronously:

```typescript
function commitAttachRef(fiber) {
  const ref = fiber.ref;
  const instance = fiber.stateNode;
  
  if (typeof ref === 'function') {
    ref(instance);
  } else {
    ref.current = instance;
  }
}

function commitDetachRef(fiber) {
  const ref = fiber.ref;
  
  if (typeof ref === 'function') {
    ref(null);
  } else {
    ref.current = null;
  }
}
```

Refs are special because:
- They must be updated **before** layout effects (so layout effects can use the ref)
- They're updated **after** DOM mutations (so the ref points to the new DOM node)

## Exercise

Trace the commit for this scenario:

```typescript
// Initial render
<div ref={divRef}>
  <span>Hello</span>
</div>

// Next render
<div ref={divRef}>
  <p>World</p>  {/* 'span' → 'p', ref unchanged */}
</div>
```

What happens during commit?
1. Before mutation passes
2. Mutation effects on span and p
3. Ref update
4. Layout effects
5. Passive effects

## Key Takeaways

1. **Render is pure (no side effects)**, commit has all side effects
2. **Commit is uninterruptible** — once started, it must complete
3. **Three mandatory passes**: before mutation, mutation, layout effects
4. **Passive effects are async** — they run after browser paint
5. **Refs updated synchronously** during commit, after DOM mutations
6. **Effect cleanup** runs before new effects are created, but layout effects run interleaved

## Effect Timing

| Effect Type | Runs During | Synchronous? | Can Read DOM? |
|-----------|------------|-------------|---------------|
| Snapshot  | Before mutation | Yes | Yes (old state) |
| Mutation  | DOM changes | Yes | No (being changed) |
| Layout (useLayoutEffect) | After mutation | Yes | Yes (new state) |
| Passive (useEffect) | After paint | No | Yes (new state) |

In the next tutorial, we'll explore Hooks — the foundation of state and effects in React.
