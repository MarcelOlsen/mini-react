# Glossary

## A

**Alternate** — The corresponding fiber in the other tree (current ↔ work-in-progress). Each fiber has an `alternate` that points to its twin in the opposite tree.

## B

**Begin Work** — The top-down phase of rendering where fibers are created/updated and children are reconciled.

**Binary Min-Heap** — A complete binary tree where every parent node is smaller than its children. Used by the scheduler for O(log n) task management.

**Branded Type** — A TypeScript type that combines a primitive with a phantom type tag (e.g., `type Lane = number & { readonly __lane__: true }`)

## C

**Child** — A fiber's first child in the tree. Parent-child relationships form the component hierarchy.

**ChildDeletion** — A flag indicating that a child fiber needs to be removed from the DOM.

**Commit** — The phase where DOM mutations and side effects are applied. Cannot be interrupted.

**Complete Work** — The bottom-up phase of rendering where DOM nodes are created/updated and effects are propagated upward.

**Concurrent Rendering** — A rendering mode where work can be interrupted and resumed, allowing the browser to remain responsive.

**Context** — A mechanism for passing data through the component tree without prop drilling.

**Context Consumer** — A fiber that reads from a context via `useContext`.

**Context Provider** — A fiber that provides a value to its subtree via `Context.Provider`.

## D

**Dependencies** — The `deps` array passed to `useEffect` or `useMemo`. Used to determine if an effect should re-run.

**Dispatch** — The function returned by `useState` that schedules a state update.

**DOM Mutation** — An actual change to the browser's DOM tree (insert, update, delete).

**Dual Tree** — The system where two fiber trees (current and work-in-progress) exist simultaneously.

## E

**Effect** — A side effect scheduled during rendering (e.g., DOM manipulation, data fetching, subscriptions).

**Effect Cleanup** — A function returned by `useEffect` or `useLayoutEffect` that undoes the effect.

**Effect List** — A circular linked list of effects stored on a fiber.

**Element** — A virtual DOM node created by `createElement` with `type` and `props`.

**Element Type** — The type of an element: string (HTML tag), function (component), or symbol (Fragment/Portal).

## F

**Fiber** — A JavaScript object representing a unit of work in React's rendering system.

**Fiber Root** — The container object that holds the current tree, finished work, and scheduling state.

**Fiber Tree** — The tree structure formed by linked fibers (return, child, sibling).

**Flags** — Bitmask indicating side effects that need to be applied during commit (Placement, Update, Deletion, etc.).

**Fragment** — A special fiber type that groups children without creating a DOM node.

**Function Component** — A component defined as a function that returns elements.

## H

**Hook** — A function that lets components use state and lifecycle features. Stored as a linked list on the fiber.

**Host Component** — A fiber representing a DOM element (div, span, etc.).

**Host Root** — The root fiber of the application tree.

**Host Text** — A fiber representing a text node in the DOM.

## L

**Lane** — A single bit in a bitfield representing a priority level.

**Lanes** — A bitfield containing one or more lanes representing pending work.

**Layout Effect** — An effect that runs synchronously after DOM mutations but before browser paint. `useLayoutEffect`.

**Linked List** — A common data structure in React (hooks, effects, updates, dependencies).

## M

**Memoized Props** — The props from the last committed render. Used for comparison during reconciliation.

**Memoized State** — The state from the last committed render. Read during updates.

**Mount** — The first render of a component. All hooks are created fresh.

**Mutation** — A DOM operation: insertion, update, or deletion of a node.

## N

**Next Effect** — The next effect in the effect list circular linked list.

**NoLanes** — A special lanes value (0) indicating no pending work.

**NoFlags** — A special flags value (0) indicating no side effects.

## P

**Passive Effect** — An effect that runs asynchronously after browser paint. `useEffect`.

**Pending Props** — The props for the current work-in-progress render.

**Pending Lanes** — Lanes that have scheduled updates but haven't been processed yet.

**Placement** — A flag indicating a new fiber needs to be inserted into the DOM.

**Portal** — A fiber that renders its children into a different DOM container.

**Priority** — The urgency of an update (Sync, UserBlocking, Normal, Low, Idle).

## R

**ReactCurrentDispatcher** — The global dispatcher that provides hook functions during rendering.

**Reconciliation** — The algorithm that determines the minimal set of DOM changes needed.

**Reducer** — A function `(state, action) => newState` used by `useReducer`.

**Ref** — A mutable object (`{ current: value }`) that persists across renders.

**Render** — The phase where the fiber tree is built/diffed. Pure, interruptible.

**Render Phase** — The phase where fibers are created, updated, and children are reconciled.

**Root** — The top-level DOM container where the React application is mounted.

## S

**Schedule** — To add work to the scheduler's task queue.

**Scheduler** — The module that prioritizes and executes work based on priority and time budgets.

**Sibling** — The next fiber with the same parent in the tree.

**Side Effect** — Any operation that affects something outside the component (DOM, network, subscriptions).

**Snapshot** — An effect that reads the DOM before mutation.

**State Node** — The real-world object associated with a fiber (DOM node, fiber root, portal container).

**Subtree Flags** — Aggregated flags from all children of a fiber.

**Synchronous Render** — A render mode where all work is processed in a single uninterruptible pass.

## T

**Task** — A unit of work scheduled by the scheduler with a priority and callback.

**Text Element** — A virtual element representing a text node (`TEXT_ELEMENT`).

**Transition** — A user-initiated update that can be deferred (e.g., route navigation).

**Type** — The element type (string for HTML tags, function for components, symbol for special types).

## U

**Update** — A state change queued on a fiber's update queue.

**Update Queue** — A circular linked list of pending updates on a fiber.

**useCallback** — A hook that memoizes a function reference.

**useContext** — A hook that reads the current value of a context.

**useEffect** — A hook for side effects that run after paint.

**useLayoutEffect** — A hook for side effects that run before paint.

**useMemo** — A hook that memoizes a computed value.

**useReducer** — A hook for state management with a reducer function.

**useRef** — A hook that creates a mutable ref object.

**useState** — A hook for simple state management.

## V

**Virtual DOM** — A JavaScript object representation of the actual DOM.

## W

**Work In Progress (WIP)** — The tree being built during rendering. Becomes the current tree after commit.

**Work Loop** — The loop that processes fibers one at a time, checking for interruption after each unit.

**WorkTag** — An enum identifying the type of fiber (FunctionComponent, HostComponent, etc.).

## Y

**Yield** — To pause work and return control to the browser. Checked via `shouldYield()`.
