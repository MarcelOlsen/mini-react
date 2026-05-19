# Guide: How Effects Work

Understanding useEffect, useLayoutEffect, and their lifecycle.

## Effect Types

| Effect | Runs When | Synchronous? | Cleanup |
|--------|-----------|-------------|---------|
| `useLayoutEffect` | After DOM mutation, before paint | Yes | Before next layout effect |
| `useEffect` | After paint | No (scheduled) | Before next effect run |
| Passive | Part of useEffect | No | Before create |

## Effect Structure

```typescript
type Effect = {
  create: () => (() => void) | void;      // The effect callback
  destroy: (() => void) | null;          // Cleanup from previous run
  deps: unknown[] | null;              // Dependency array
  next: Effect | null;                 // Circular linked list
  tag: HookEffectTag;                 // Passive | Layout
};
```

## The Effect Lifecycle

### Mount (useEffect)

1. Component renders
2. `useEffect` is called → creates Effect object, stores on fiber
3. Fiber flagged with `Passive` effect
4. DOM is updated
5. **After browser paint** → passive effects are scheduled
6. Effect create function runs → returns destroy function

```typescript
function mountEffect(create, deps) {
  const effect = {
    create,
    destroy: null,
    deps,
    next: null,
    tag: Passive,
  };
  
  // Add to fiber's effect list
  const componentUpdateQueue = currentlyRenderingFiber.updateQueue;
  if (componentUpdateQueue === null) {
    currentlyRenderingFiber.updateQueue = {
      lastEffect: effect,
    };
    effect.next = effect; // Circular
  } else {
    const lastEffect = componentUpdateQueue.lastEffect;
    effect.next = lastEffect.next;
    lastEffect.next = effect;
    componentUpdateQueue.lastEffect = effect;
  }
  
  // Flag fiber for passive effects
  currentlyRenderingFiber.flags |= Passive;
}
```

### Update (useEffect)

1. Component re-renders
2. `useEffect` is called again → compares deps
3. If deps changed: creates new Effect, old destroy will run
4. If deps same: creates "no-op" Effect (create = null)
5. During commit, destroyed before created

```typescript
function updateEffect(create, deps) {
  const hook = getHookAtIndex(currentHookIndex++);
  const prevEffect = hook.memoizedState;
  
  if (depsAreEqual(deps, prevEffect.deps)) {
    // No changes — skip create
    hook.memoizedState = {
      create: null,      // null = no create needed
      destroy: null,     // no cleanup needed (will run old cleanup later)
      deps,
      next: null,
      tag: Passive,
    };
  } else {
    // Dependencies changed
    hook.memoizedState = {
      create,            // Will run after old destroy
      destroy: null,     // Will be set after create runs
      deps,
      next: null,
      tag: Passive,
    };
    currentlyRenderingFiber.flags |= Passive;
  }
}
```

### Commit: Effect Execution

```typescript
function commitPassiveMountEffects(finishedWork) {
  // Walk effect list
  const lastEffect = finishedWork.updateQueue.lastEffect;
  let effect = lastEffect;
  
  do {
    effect = effect.next;
    
    if (effect.destroy !== null) {
      // Run cleanup from PREVIOUS render
      effect.destroy();
    }
    
    if (effect.create !== null) {
      // Run create, store returned destroy function
      const destroy = effect.create();
      effect.destroy = destroy || null;
    }
    
  } while (effect !== lastEffect);
}
```

## Effect Timing

### useLayoutEffect (Synchronous)

```
Render → commitMutationEffects → commitLayoutEffects → Browser Paint
                         (useLayoutEffect runs here)
```

Runs **before** browser paint. Can read DOM layout. Blocking.

### useEffect (Asynchronous)

```
Render → commitMutationEffects → Browser Paint → (microtask) → commitPassiveEffects
                                                        (useEffect runs here)
```

Runs **after** browser paint. Non-blocking.

## Effect Cleanup

### When Cleanup Runs

```typescript
useEffect(() => {
  const subscription = subscribe();
  
  // This returned function is the cleanup
  return () => {
    subscription.unsubscribe();
  };
}, [dependency]);
```

Cleanup runs:
1. **Before the next effect create** (always before new create)
2. **When component unmounts** (before fiber deletion)

### Cleanup Order

```
Render N:    create runs → returns destroy
Render N+1:
  1. destroy (cleanup from Render N)
  2. create (new effect)
  3. returns new destroy
```

## Effect Flags

Fibers are flagged with effect types:

```typescript
Passive      = 1 << 0;   // 0b00000001 — has useEffect
LayoutEffect = 1 << 1;   // 0b00000010 — has useLayoutEffect
Snapshot     = 1 << 2;   // 0b00000100 — snapshot effect
```

## Effect List ( Circular Linked List)

```
Fiber
└── updateQueue
    └── lastEffect ──┐
        ↑            ↓
    Effect 1    ←  Effect 2    ←  Effect 3
    (Passive)      (Layout)       (Passive)
    create: fn     create: null   create: fn
    destroy: fn    destroy: fn    destroy: fn
    next: ───────────────↑
```

## Reading the Source

Key files:
- `src/fiber/fiberHooks.ts` — `useEffect`, `useLayoutEffect`
- `src/fiber/effectList.ts` — `pushEffect`, `runPassiveEffects`
- `src/fiber/commitRoot.ts` — `commitLayoutEffects`, `commitPassiveEffects`
- `src/fiber/types.ts` — Effect type definitions
