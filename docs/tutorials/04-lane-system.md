# Tutorial 4: Lane-Based Priority System

## Why Priorities?

Not every state update is equally urgent:
- **Typing in a text field** → Should feel instant
- **Animation running smoothly** → Should not stutter
- **Fetching a search result** → Can wait a moment
- **Loading more content on scroll** → Lowest priority

React's solution: assign every update a **priority lane**. Higher priority updates can interrupt lower priority ones.

## What Are Lanes?

Lanes are a bitfield system. Each priority level gets a **bit** in a 32-bit integer:

```
Bit 0 → SyncLane         (0b00000001 = 1)
Bit 2 → InputLane        (0b00000100 = 4)
Bit 4 → DefaultLane      (0b00010000 = 16)
Bit 5 → TransitionLane1  (0b00100000 = 32)
Bit 6 → TransitionLane2  (0b01000000 = 64)
Bit 15 → IdleLane        (0b1000000000000000 = 32768)
```

### Why Bits?

Bits are used for two powerful operations:

```typescript
// 1. Merge multiple lanes (bitwise OR)
const lanes = SyncLane | DefaultLane;  // Both have pending work

// 2. Check if a specific lane is included (bitwise AND)
const hasSyncWork = (lanes & SyncLane) !== 0;  // True

// 3. Remove a lane
const remaining = lanes & ~SyncLane;  // Remove sync lane

// 4. Find highest priority lane
const highest = lanes & -lanes;       // Get lowest set bit
```

These are single **CPU instructions** — extremely fast.

## The Lane Type System

MiniReact uses TypeScript branded types for safety:

```typescript
type Lane = number & { readonly __lane__: true };
type Lanes = number & { readonly __lanes__: true };
```

Why two types? **Type correctness**:
- A **single lane** is a bitmask with exactly one bit set
- **Lanes** is a bitmask with zero or more bits set

But practically, Lane ⊆ Lanes and Lanes ⊇ Lane. So we define an alias:
```typescript
type Lanes = Lane;  // For practical use in function signatures
```

This resolves the TypeScript constraint that `Lane` is not directly assignable to `Lanes`, while keeping runtime performance.

## How Lanes Flow Through the System

```
1. User clicks a button
   → Event handler calls setCount(count + 1)
   → dispatch schedules update with lane = SyncLane (0b00000001)

2. scheduleUpdateOnFiber(fiber, SyncLane)
   → root.pendingLanes |= SyncLane
   → ensureRootIsScheduled()

3. ensureRootIsScheduled()
   → getNextLanes(root)
   → If SyncLane is in pending lanes: performSyncWorkOnRoot()
   → If non-sync lanes: scheduleCallback(performConcurrentWorkOnRoot)

4. performSyncWorkOnRoot(root)
   → Prepare fresh stack
   → Work loop runs to completion (uninterruptible)
   → root.finishedLanes includes SyncLane

5. commitRoot(root)
   → Apply DOM mutations synchronously
```

## Lane Operations in Practice

### Adding Lanes

```typescript
import { laneOr } from "@/fiber/bitwise";

const lanes = NoLanes;           // 0
const withSync = laneOr(lanes, SyncLane);   // 0 | 1 = 1
const withDefault = laneOr(withSync, DefaultLane); // 1 | 16 = 17

// Result: 17 (0b00010001) — both sync and default work pending
```

### Checking Lanes

```typescript
import { laneIncludes } from "@/fiber/bitwise";

const lanes = SyncLane | DefaultLane; // 17
laneIncludes(lanes, SyncLane);        // true (17 & 1 = 1)
laneIncludes(lanes, InputLane)  ;       // false (17 & 4 = 0)
```

### Getting Highest Priority

```typescript
import { laneHighest } from "@/fiber/bitwise";

const lanes = DefaultLane | IdleLane;  // 16 | 32768 = 32784
laneHighest(lanes);                   // DefaultLane (16) — lowest bit = highest priority
```

### Lane Entanglement

When you update state multiple times in a single event, the lanes get **entangled** — they must render together:

```typescript
function handleClick() {
  setCount(count + 1);   // Update A → TransitionLane1
  setName("John");       // Update B → TransitionLane2
  // Result: lanes = TransitionLane1 | TransitionLane2 (entangled)
  // Both transitions render together as one batch
}
```

## Sync vs. Concurrent

### Synchronous Render

```typescript
function performSyncWorkOnRoot(root) {
  root.finishedWork = workInProgressTree; // Built synchronously
  root.finishedLanes = nextLanes;
  commitRoot(root); // Commit immediately
}
```
- **Cannot be interrupted**
- **Runs on main thread**
- **Browser may freeze during large updates**

### Concurrent Render

```typescript
function performConcurrentWorkOnRoot(root) {
  // Runs in chunks via requestIdleCallback
  while (wip !== null && !shouldYield()) {
    wip = performUnitOfWork(wip);
  }
  
  if (wip !== null) {
    // Interrupted — schedule again
    scheduleCallback(performConcurrentWorkOnRoot, priority);
    return;
  }
  
  // Work completed
  commitRoot(root);
}
```
- **Can be interrupted**
- **Uses requestIdleCallback**
- **Browser stays responsive**

## Example: Interruption in Action

```typescript
// 1. Slow search starts (low priority)
const [results, setResults] = useState([]);
startSearch(query); // Schedules with IdleLane

// 2. User clicks a button (high priority)
button.addEventListener("click", () => {
  setCount(count + 1); // SyncLane
});

// 3. What happens:
// - IdleLane work is in progress (search results rendering)
// - SyncLane arrives
// - shouldYield() returns true (SyncLane is higher priority)
// - Work yields, SyncLane takes over
// - SyncLane completes its render + commit
// - Search resumes with remaining IdleLane work
// Final result: button updates are immediate, search results update when idle
```

## Exercise

Given these lanes:
```typescript
const lanesA = SyncLane | InputLane;           // 1 | 4 = 5
const lanesB = DefaultLane | TransitionLane1; // 16 | 32 = 48
const lanesC = InputLane | IdleLane;            // 4 | 32768 = 32772
```

Calculate:
1. Which lane is highest priority in `lanesC`?
2. Does `lanesA` include `DefaultLane`?
3. What is `lanesA | lanesB`?
4. What is `lanesC & ~InputLane`?

## Key Takeaways

1. **Lanes are bitfields** — fast bitwise operations for merge, test, remove
2. **Single bit = lane, multiple bits = lances** — both are the same runtime number
3. **Smaller bit number = higher priority** — bit 0 is most urgent
4. **Lanes get merged** via `|=` when multiple updates occur
5. **Concurrent mode checks** `shouldYield()` after each small unit of work
6. **Sync mode is uninterruptible** — all work completes before commit

In the next tutorial, we'll explore the scheduler that orchestrates this priority system.
