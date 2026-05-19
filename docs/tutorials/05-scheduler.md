# Tutorial 5: The Scheduler — O(log n) Task Management

## The Problem

React needs to execute work in a specific order, but:
- **Work arrives at different times** — user clicks happen unpredictably
- **Work has different priorities** — typing should feel instant, loading images can wait
- **Work may be interrupted** — an animation frame should be serviced before a deferred update
- **Too many tasks can pile up** — if updates are queued faster than they execute, the app feels sluggish

The naive approach (run all tasks in order of arrival) would make a button feel slow because a background image upload started first.

## The Solution: Priority Queue

A **priority queue** serves highest-priority items first, regardless of when they arrived:

```
Current queue (by arrival):
  [fetch-user (arrived 1ms ago), load-image (2ms ago), update-text (3ms ago)]
  Result: text update waits 3ms

Priority queue (by priority):
  [update-text (SyncLane) — highest priority
   fetch-user (DefaultLane)
   load-image (IdleLane)]
  Result: text updates immediately
```

## Binary Min-Heap

React uses a **binary min-heap** for its priority queue. MiniReact implements the same algorithm in `src/fiber/minHeap.ts`.

### What is a Min-Heap?

A complete binary tree where every parent is smaller (or equal to) its children:

```
         [1]  ← Root (minimum)
        /   \
      [3]   [5]
      / \   / \
    [7] [9][11][13]
```

Key property: the **minimum** element is always at index 0.

### Why Binary Heap?

| Operation  | Unsorted Array | Sorted Array | Binary Min-Heap |
|-----------|----------------|-------------|----------------|
| Insert    | O(1)           | O(n)        | **O(log n)**   |
| Extract Min| O(n)           | O(1)        | **O(log n)**   |
| Peek Min  | O(n)           | O(1)        | **O(1)**       |

Binary heaps are fast *and* simple to implement. The `O(log n)` operations mean even for 1,000,000 tasks, you'll make at most 20 comparisons.

### Array Representation

Heaps are stored in a flat array (no pointers!):

```
Tree:        [1]
            /   \
          [3]   [5]
          / \   / \
        [7] [9][11][13]

Array: [1, 3, 5, 7, 9, 11, 13]

Index relationship:
- parent(i) = floor((i - 1) / 2)
- left child(i) = 2*i + 1
- right child(i) = 2*i + 2
```

### MiniReact's Min-Heap Implementation

```typescript
export interface HeapNode {
  id: number;
  sortIndex: number; // Priority (lower = higher priority)
}

export function peek<T extends HeapNode>(heap: T[]): T | undefined {
  return heap[0]; // Minimum is always at index 0
}

export function push<T extends HeapNode>(heap: T[], node: T): void {
  const index = heap.length;
  heap.push(node);
  siftUp(heap, index); // Bubble up to maintain heap property
}

export function pop<T extends HeapNode>(heap: T[]): T | undefined {
  if (heap.length === 0) return undefined;
  const first = heap[0];
  if (heap.length === 1) {
    heap.pop();
    return first;
  }
  const last = heap.pop()!;
  heap[0] = last;
  siftDown(heap, 0); // Sink down to maintain heap property
  return first;
}
```

## Scheduling Tasks

MiniReact's scheduler (`src/fiber/scheduler.ts`) wraps the min-heap into a task system:

```typescript
interface Task {
  callback: ((didTimeout: boolean) => void) | null;
  priorityLevel: Priority;
  startTime: number;
  expirationTime: number;
  sortIndex: number;
  id: number;
}
```

When `scheduleCallback(priority, callback)` is called:

1. Create a new `Task`
2. Compute `sortIndex` based on priority and start time
3. Push to min-heap (`O(log n)`)
4. If this is the highest priority task, flush the queue via `performWorkUntilDeadline()`

### RequestIdleCallback-Based Flushing

```typescript
function performWorkUntilDeadline() {
  // While there's work and we haven't used up our budget:
  while (currentTask !== null) {
    if (shouldYield()) {
      // ran out of time
      schedulePerformWorkUntilDeadline();
      return;
    }
    
    const callback = currentTask.callback;
    callback(false); // Execute work
    currentTask = pop(taskQueue); // Get next task
  }
}
```

### Priority → Sort Index

Higher priority tasks get a **lower sortIndex**:

```typescript
const PRIORITY_MAP = {
  ImmediatePriority: 1,
  UserBlockingPriority: 2,
  NormalPriority: 3,
  LowPriority: 4,
  IdlePriority: 5,
};

function getSortIndex(task) {
  return task.priorityLevel;
}
```

This means: all **ImmediatePriority** tasks run before **UserBlockingPriority** tasks, which run before **NormalPriority**, etc.

### Time Budget

The scheduler uses a **time budget** (typically 5ms per frame) to decide when to yield:

```typescript
const FRAME_YIELD_TIME = 5; // ms

function shouldYield(): boolean {
  const currentTime = getCurrentTime();
  return currentTime >= deadline;
}

function schedulePerformWorkUntilDeadline() {
  // Use requestIdleCallback if available
  if (typeof window !== 'undefined' && window.requestIdleCallback) {
    requestIdleCallback(flushWork);
  } else {
    // Fallback: setTimeout with a small delay
    setTimeout(flushWork, 0);
  }
}
```

### Example: Scheduling Order

```typescript
// User types (immediate)
scheduleCallback(NormalPriority, updateText);
// ...later...
// Data fetch completes (normal priority)
scheduleCallback(NormalPriority, processData);
// ...later...
// Scroll event (blocking)
scheduleCallback(UserBlockingPriority, handleScroll);

// Execution order (sorted by priority, then time):
// 1. handleScroll (UserBlockingPriority = 2) → executes first
// 2. updateText (NormalPriority = 3) → next
// 3. processData (NormalPriority = 3) → next (if both have same priority, time matters)
```

## Exercise

Given these scheduled tasks, what order are they executed?

```typescript
scheduleCallback(NormalPriority, taskA);    // scheduled at t=0
scheduleCallback(IdlePriority, taskB);      // scheduled at t=1
scheduleCallback(UserBlockingPriority, taskC); // scheduled at t=2
scheduleCallback(NormalPriority, taskD);    // scheduled at t=3
```

## Key Takeaways

1. **Binary min-heap** gives O(log n) insert and extract, O(1) peek
2. **Lower `sortIndex` = higher priority** — ImmediatePriority tasks run first
3. **Tasks are scheduled via `requestIdleCallback`** — browser gets a chance to paint between chunks of work
4. **Time budget** determines when to yield — typically 5ms per frame
5. **`shouldYield()`** checks elapsed time against the deadline

## How It Fits Into the Render Pipeline

```
User clicks button
  → dispatch(setState)
  → scheduleUpdateOnFiber(fiber, lane)
  → ensureRootIsScheduled(root)
  → If not sync: scheduleCallback(performConcurrentWorkOnRoot, priority)
    → scheduler pushes task to min-heap
    → scheduler flushes work via requestIdleCallback
    → work loop processes fibers, checking shouldYield() each iteration
    → commits when complete
```

In the next tutorial, we'll look at the commit phase — where all the DOM mutations happen.
