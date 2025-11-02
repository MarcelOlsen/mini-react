# MiniReact Documentation

Welcome to the MiniReact design docs. These documents dive deep into how the fiber architecture works, from high-level concepts down to implementation details.

## What is MiniReact?

MiniReact is a simplified React clone built with a modern fiber architecture. It's not trying to be a production framework - it's an educational project that demonstrates how React works under the hood.

The codebase is fully functional with 484 passing tests covering all major features. It's a great way to understand React's internals without getting lost in production complexity.

## Documentation Structure

The docs are organized to build understanding progressively:

### Core Architecture

**[01 - Fiber Architecture](./01-fiber-architecture.md)**

Start here. This covers the fundamental concepts: what fibers are, why we have two trees, how the render and commit phases work, and how we traverse the tree without recursion.

Key topics:
- Fiber data structure
- Double-buffer pattern
- Render vs commit phases
- Tree traversal
- Effect lists

**[02 - Work Loop](./02-work-loop.md)**

The work loop is the engine that drives everything. It schedules updates, builds the work-in-progress tree, and coordinates between phases.

Key topics:
- Processing units of work
- Depth-first traversal
- Effect collection
- Concurrent mode foundations
- Error handling

**[03 - Reconciliation](./03-reconciliation.md)**

Reconciliation is the diffing algorithm. It figures out what changed between renders and computes the minimal DOM operations needed.

Key topics:
- Key-based reconciliation
- Movement detection
- Handling mixed keyed/unkeyed children
- Type matching
- Performance characteristics

### Systems

**[04 - Event System](./04-event-system.md)**

Events in MiniReact use delegation for efficiency. One listener at the root handles everything and routes events through the React tree.

Key topics:
- Event delegation
- Synthetic events
- Portal event bubbling
- Lazy registration
- Performance optimizations

**[05 - Hooks System](./05-hooks-system.md)**

Hooks let functional components have state and side effects. They're implemented as an array on each fiber with order maintained by a cursor.

Key topics:
- Hook storage and context
- useState and useReducer
- useEffect and cleanup
- useMemo and useCallback
- Rules of hooks

## Quick Reference

### Key Concepts

**Fiber**: A unit of work representing a component, element, or text node

**Current Tree**: The committed tree that's currently rendered

**Work-in-Progress Tree**: The tree being built during render

**Effect Tag**: Marks what kind of work a fiber needs (Placement, Update, Deletion)

**Effect List**: Linked list of fibers with side effects for efficient commit

**Reconciliation**: The diffing algorithm that determines what changed

**Synthetic Event**: Wrapper around native events with consistent interface

**Hook**: State or effect stored on a fiber's hooks array

### Important Patterns

**Double Buffering**: Maintain two trees and swap between them

**Incremental Rendering**: Break work into units that can be paused/resumed

**Event Delegation**: One listener delegates to many handlers

**Lazy Registration**: Only register what's actually used

**Circular Linked List**: Efficient queue for updates

**Cursor-Based Hooks**: Array index tracks which hook we're on

### Code Organization

```text
src/
├── fiber/
│   ├── workLoop.ts          # Main rendering loop
│   ├── beginWork.ts          # Process each fiber
│   ├── completeWork.ts       # Finalize each fiber
│   ├── commitWork.ts         # Apply DOM changes
│   ├── reconcileChildren.ts  # Diffing algorithm
│   ├── fiberHooks.ts         # Hook implementations
│   └── types.ts              # Fiber type definitions
├── events/
│   ├── eventSystem.ts        # Event delegation
│   └── types.ts              # Event type definitions
├── hooks/
│   └── fiberHooksImpl.ts     # Public hook API
├── context/
│   └── index.ts              # Context implementation
└── portals/
    └── index.ts              # Portal implementation
```

## Understanding the Flow

Here's what happens when you call `render()`:

1. **Initialize**: Create or get the fiber root for the container
2. **Schedule**: Mark the root fiber as needing update
3. **Render Phase**: Build the work-in-progress tree
   - Walk the tree depth-first
   - Call component functions
   - Reconcile children
   - Create/update DOM nodes
   - Build effect list
4. **Commit Phase**: Apply changes atomically
   - Run deletions
   - Insert new nodes
   - Update existing nodes
   - Run effects
5. **Swap Trees**: Work-in-progress becomes current

When `setState` is called:

1. Queue the update in the hook's update queue
2. Schedule an update on the fiber
3. Re-render from the root
4. Process queued updates to compute new state
5. Reconcile with new props/state
6. Commit changes if anything changed

## Design Principles

A few principles guided the implementation:

**Simplicity Over Features**: We implement core concepts correctly rather than every React feature

**Readability Over Performance**: Code is structured to be understandable, with optimization opportunities clearly marked

**Correctness First**: Tests verify behavior before optimization

**Incremental Architecture**: The system is ready for concurrent mode even though we're currently synchronous

**No Magic**: Everything is explicit and traceable through the code

## Performance Notes

The architecture is designed for performance:

**O(n) Reconciliation**: Linear in number of children

**Effect Lists**: Only process changed fibers during commit

**Fiber Reuse**: Minimize allocations by reusing fibers

**Event Delegation**: One listener per event type

**Lazy Everything**: Register, compute, and execute only what's needed

Current bottlenecks and future work:

- Large lists without keys are slow (O(n²) worst case)
- No time-slicing yet (all work is synchronous)
- No automatic batching of updates
- No component-level bailout optimization

## Testing

The test suite has 484 passing tests covering:

- Core rendering and reconciliation
- All hooks (useState, useEffect, useRef, etc.)
- Event system and synthetic events
- Context API
- Portals with event bubbling
- Fragments
- Component memoization
- Edge cases and error handling

Run tests with:

```bash
bun test
```

## Contributing

If you're working on MiniReact:

1. Read the relevant doc for the area you're changing
2. Make sure tests pass before and after your changes
3. Add tests for new features
4. Update docs if you change architecture
5. Keep the chill, educational vibe

## Further Reading

Want to go deeper?

**React Fiber Architecture**: The original React Fiber design doc

**React Reconciliation**: Official React docs on reconciliation

**Inside Fiber**: Deep dive talks by React team members

**Build Your Own React**: Tutorials building React from scratch

The best way to understand this code is to step through it with a debugger. Set a breakpoint in `performUnitOfWork` and watch the tree get built.

## Getting Help

If something's unclear:

1. Check the relevant doc for the component
2. Look at the tests for usage examples
3. Add logging to trace execution
4. Step through with a debugger
5. Read the source - it's designed to be readable

The code is the ultimate documentation. These docs explain the why and the how, but the code is always the source of truth.

## Summary

MiniReact implements:

- Fiber architecture with incremental rendering foundation
- O(n) reconciliation with key-based diffing
- Delegated event system with portal support
- Full hooks API (useState, useEffect, useContext, etc.)
- Context API for state management
- Portals for rendering outside the tree
- Fragment support
- Component memoization

All in about 3000 lines of readable TypeScript with 100% test coverage.

The goal is understanding, not production use. Fork it, break it, learn from it.
