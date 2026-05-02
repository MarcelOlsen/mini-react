# Guide: How State Works

Understanding state updates from dispatch to DOM commit.

## The State Update Pipeline

```
User Event → dispatch(action)
  │
  v
Update Queue (circular linked list)
  │
  v
Schedule Re-render (lane system)
  │
  v
Work Loop (process update queue)
  │
  v
New State Computed
  │
  v
Reconciliation (determine what changed)
  │
  v
Commit Phase (update DOM)
```

## 1. Dispatching an Update

When you call `setCount(count + 1)`:

```typescript
function dispatchSetState(fiber, queue, action) {
  // Create update
  const update = {
    lane: SyncLane,      // Priority
    action,              // The value/function
    next: null,          // Circular linked list
  };
  
  // Add to queue
  if (queue.pending === null) {
    // First update: circular list of 1
    update.next = update;
    queue.pending = update;
  } else {
    // Append to circular list
    const lastPending = queue.pending;
    const firstPending = lastPending.next;
    update.next = firstPending;
    lastPending.next = update;
    queue.pending = update;
  }
  
  // Schedule re-render
  const root = getFiberRoot(fiber);
  scheduleUpdateOnFiber(fiber, SyncLane);
}
```

## 2. The Update Queue

The queue is a **circular linked list**:

```
Empty:   null

After dispatch(1):
  pending → [Update: action=1, next=↑] (points to itself)

After dispatch(2):
  pending → [Update: action=2, next=↓]
            ↓                          ↓
            ↑ [Update: action=1, next=↑]

After dispatch(3):
  pending → [Update: action=3, next=↓]
            ↓                          ↓
            [Update: action=2, next=↓]
            ↓                          ↓
            ↑ [Update: action=1, next=↑]
```

## 3. Processing the Queue During Render

During `renderWithHooks`, the queue is processed:

```typescript
function updateState(hook) {
  const queue = hook.queue;
  const pendingQueue = queue.pending;
  
  if (pendingQueue !== null) {
    // Start from first update (pending.next because it's circular)
    const firstUpdate = pendingQueue.next;
    let newState = hook.baseState || hook.memoizedState;
    let update = firstUpdate;
    
    do {
      // Apply update
      if (typeof update.action === 'function') {
        // Functional update: setCount(c => c + 1)
        newState = update.action(newState);
      } else {
        // Direct value: setCount(5)
        newState = update.action;
      }
      
      update = update.next;
    } while (update !== firstUpdate);
    
    // Store new state
    hook.memoizedState = newState;
    hook.baseState = newState;
    queue.pending = null; // Queue consumed
  }
  
  return [hook.memoizedState, queue.dispatch];
}
```

## 4. Batched Updates

Multiple `setState` calls in one event handler are batched:

```typescript
function handleClick() {
  setCount(c => c + 1);    // Queue: [1]
  setCount(c => c + 1);    // Queue: [1, 1]
  setCount(c => c + 1);    // Queue: [1, 1, 1]
}

// During next render:
// Initial state: 0
// Update 1: 0 + 1 = 1
// Update 2: 1 + 1 = 2
// Update 3: 2 + 1 = 3
// Final state: 3
```

React batches these into a **single re-render** by:
1. Using `unstable_batchedUpdates` (or automatic batching in React 18+)
2. Flushing at the end of the event handler

MiniReact uses automatic batching via `flushSync`:

```typescript
function dispatchSetState(fiber, queue, action) {
  // ... add to queue ...
  
  // Schedule flush
  scheduleUpdateOnFiber(fiber);
  
  // If inside an event handler, batching will defer flush
  // If synchronous (flushSync called), flush immediately
}
```

## 5. Functional vs. Direct Updates

### Direct Update
```typescript
setCount(5); // action = 5 (the value)
```

Process:
```typescript
newState = update.action; // Just assign the value
// newState = 5
```

### Functional Update
```typescript
setCount(prev => prev + 1); // action = function
```

Process:
```typescript
newState = update.action(newState); // Call with current state
// newState = newState + 1
```

## 6. Why `baseState`?

`baseState` exists for **resumable updates**:

```typescript
// Render 1: state = 0
// User clicks: setCount(1)
// While rendering with state=1, another click: setCount(2)
// But we're still on the old tree!

// Solution: baseState tracks the committed state
const baseState = hook.baseState; // Always the "real" state
const memoizedState = hook.memoizedState; // May be WIP
```

## 7. State in Fiber Architecture

State is stored on the **fiber's hook list**:

```
Fiber
├── memoizedState: Hook 0 (useState)
│     ├── memoizedState: 5 (current state)
│     ├── baseState: 5 (committed state)
│     ├── baseQueue: null (interleaved updates)
│     ├── queue: { pending: null, dispatch: fn }
│     └── next: Hook 1 (useEffect)
│           ├── memoizedState: Effect
│           └── next: null
```

## 8. useReducer — The Same but Different

`useReducer` and `useState` use the same underlying mechanism. The difference:

```typescript
// useState
const [count, setCount] = useState(0);
// action is the new value (or updater function)

// useReducer
function reducer(state, action) {
  switch (action.type) {
    case 'increment': return state + 1;
    case 'decrement': return state - 1;
    default: return state;
  }
}

const [count, dispatch] = useReducer(reducer, 0);
// dispatch({ type: 'increment' })
// action is passed to reducer to compute new state
```

`useState` is just `useReducer` with a pre-defined reducer:
```typescript
function basicStateReducer(state, action) {
  return typeof action === 'function' ? action(state) : action;
}
```

## 9. Reading the Source

Key files for understanding state:
- `src/fiber/fiberHooks.ts` — `useStateFiber`, `useReducerFiber`
- `src/fiber/types.ts` — Update, UpdateQueue types
- `src/fiber/workLoop.ts` — `scheduleUpdateOnFiber`
