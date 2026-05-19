# MiniReact Documentation

Welcome to the MiniReact documentation! This directory contains comprehensive guides and tutorials to help you understand React's internals by building it from scratch.

## Getting Started

**New to MiniReact?** Start with the architecture overview:
- [Architecture Overview](ARCHITECTURE.md) — High-level system design
- [Tutorial 1: Virtual DOM](tutorials/01-virtual-dom.md) — What is the virtual DOM and why does it exist?

## Tutorials (Step-by-Step Learning)

Each tutorial builds on the previous one. Complete them in order:

1. **[Virtual DOM](tutorials/01-virtual-dom.md)** — JavaScript object tree representing UI
2. **[Reconciliation](tutorials/02-reconciliation.md)** — Diffing algorithm for efficient updates
3. **[Fiber Architecture](tutorials/03-fiber-architecture.md)** — Interruptible rendering with dual trees
4. **[Lane System](tutorials/04-lane-system.md)** — Priority-based update scheduling
5. **[Scheduler](tutorials/05-scheduler.md)** — O(log n) task queue with binary min-heap
6. **[Commit Phase](tutorials/06-commit-phase.md)** — DOM mutations and effect execution
7. **[Hooks](tutorials/07-hooks.md)** — useState, useEffect, and friends
8. **[Context](tutorials/08-context.md)** — Passing data without prop drilling
9. **[Portals and Fragments](tutorials/09-portals-and-fragments.md)** — Rendering outside the tree

## Guides (Deep Dives)

- [How Rendering Works](guides/how-rendering-works.md) — Complete render pipeline walkthrough
- [How State Works](guides/how-state-works.md) — State updates from dispatch to DOM
- [How Effects Work](guides/how-effects-work.md) — useEffect lifecycle and cleanup

## API Reference

- [Public API](../README.md#api-reference) — Complete API documented in README

## Contributing

See the [main README](../README.md#contributing) for development setup.

## Related Resources

- [React Fiber Architecture](https://github.com/acdlite/react-fiber-architecture) — Original React Fiber docs
- [Build your own React](https://pomb.us/build-your-own-react/) — Rodrigo Pombo's classic tutorial
- [The how and why on React's usage of linked list in Fiber](https://www.youtube.com/watch?v=ZCuYPiUIONs) — Video deep-dive

---

**Tip:** Open `examples/interactive-showcase/` and follow along with the tutorials as you read. Seeing concepts in action makes them stick.
