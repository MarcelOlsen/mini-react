# MiniReact

A learning project to build a simplified React-like library from scratch, with a focus on understanding virtual DOM, reconciliation, hooks, and more. This project is developed incrementally in well-defined phases, each with its own features and comprehensive test coverage.

---

## Table of Contents

- [Overview](#overview)
- [Current Status](#current-status)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Development Phases](#development-phases)
  - [Phase 1: Element Creation & Basic Rendering ✅](#phase-1-element-creation--basic-rendering-)
  - [Phase 2: Functional Components ✅](#phase-2-functional-components-)
  - [Phase 3: Virtual DOM & Basic Reconciliation ✅](#phase-3-virtual-dom--basic-reconciliation-)
  - [Phase 4: Prop Diffing & Efficient Children Reconciliation 🚧](#phase-4-prop-diffing--efficient-children-reconciliation-)
  - [Phase 5: State with useState Hook](#phase-5-state-with-usestate-hook)
  - [Phase 6: Event Handling](#phase-6-event-handling)
  - [Phase 7: Effects with useEffect](#phase-7-effects-with-useeffect)
  - [Phase 8: Context API (Optional/Advanced)](#phase-8-context-api-optionaladvanced)
  - [Phase 9: Portals and Fragments (Optional/Advanced)](#phase-9-portals-and-fragments-optionaladvanced)
- [Testing](#testing)
- [License](#license)

---

## Overview

**MiniReact** is a step-by-step implementation of a React-like UI library. The goal is to demystify how React works under the hood by building each feature from scratch, with a strong emphasis on test-driven development and code clarity.

Each phase includes:

- **Clear feature specifications**
- **Comprehensive test coverage** (84+ tests currently)
- **Working implementation** with proper separation of concerns
- **Documentation** of design decisions and trade-offs

---

## Current Status

🎯 **Current Phase**: 4 (Prop Diffing & Efficient Children Reconciliation)

✅ **Completed Features**:

- Element creation (`createElement`)
- DOM rendering with reconciliation
- Functional components with props and children
- Virtual DOM tree structure
- Basic reconciliation algorithm
- Comprehensive test suite setup

🚧 **In Progress**:

- Fine-grained prop diffing
- Efficient children reconciliation
- Key-based list diffing

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (for runtime and testing)
- [Biome](https://biomejs.dev/) (for linting/formatting)
- [happy-dom](https://github.com/capricorn86/happy-dom) (for DOM testing environment)

### Installation

```bash
bun install
```

### Running Tests

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run specific test file
bun test tests/MiniReact.render.test.ts
```

### Example Usage

```typescript
import { createElement, render } from "./src/MiniReact";

// Functional component
const App = ({ name }: { name: string }) => {
  return createElement(
    "div",
    null,
    createElement("h1", null, `Hello, ${name}!`),
    createElement("p", null, "Welcome to MiniReact")
  );
};

// Render to DOM
const container = document.getElementById("root")!;
render(createElement(App, { name: "World" }), container);
```

---

## Project Structure

```
mini-react/
├── src/
│   ├── MiniReact.ts           # Main API exports
│   ├── types.ts               # TypeScript type definitions
│   ├── domRenderer.ts         # DOM manipulation utilities
│   └── reconciler.ts          # Virtual DOM reconciliation logic
├── tests/
│   ├── setup/                 # Test environment setup
│   ├── MiniReact.createElement.test.ts      # Element creation tests
│   ├── MiniReact.createElementFC.test.ts    # Functional component creation tests
│   ├── MiniReact.render.test.ts             # Rendering tests
│   ├── MiniReact.renderFC.test.ts           # Functional component rendering tests
│   └── MiniReact.reconciler.test.ts         # Reconciliation tests
├── bunfig.toml                # Bun configuration
├── biome.json                 # Biome linter/formatter config
├── tsconfig.json              # TypeScript configuration
├── package.json
└── README.md
```

---

## Development Phases

### Phase 1: Element Creation & Basic Rendering ✅

**Features:**

- ✅ `createElement` to create element objects (host elements only)
- ✅ `render` to convert element objects into real DOM nodes
- ✅ Support for text nodes and nested children
- ✅ Basic props handling and attribute setting

**Tests:** 11 tests passing

- Element creation with/without props and children
- Rendering simple and nested elements
- Text and number children handling
- Edge cases (null/undefined props and children)

---

### Phase 2: Functional Components ✅

**Features:**

- ✅ Support for functional components as element types
- ✅ Passing props and children to functional components
- ✅ Components can return other components or host elements
- ✅ Proper handling of null/undefined returns

**Tests:** 34 tests passing

- Functional component rendering with various prop types
- Nested functional components
- Complex children handling
- Edge cases and error scenarios

---

### Phase 3: Virtual DOM & Basic Reconciliation ✅

**Features:**

- ✅ Virtual DOM (VDOM) tree structure with instances
- ✅ Reconciler algorithm for efficient DOM updates
- ✅ Support for updating props and children
- ✅ Proper cleanup and node reuse

**Tests:** 39 tests passing

- Initial render scenarios
- Element type changes and replacements
- Same-type updates for host elements and components
- Complex nested reconciliation scenarios

---

### Phase 4: Prop Diffing & Efficient Children Reconciliation 🚧

**Features:**

- 🚧 Fine-grained prop diffing (update only changed attributes)
- 🚧 Efficient children reconciliation (reuse existing DOM nodes)
- 🚧 Support for keyed children (key-based diffing for lists)
- 🚧 Minimal DOM operations for performance

**Tests:** 14 comprehensive tests written (currently failing - implementation needed)

- Fine-grained prop updates and removals
- Adding/removing/reordering children with and without keys
- Performance scenarios and edge cases
- Mixed content handling

**Implementation Goals:**

- `diffProps(oldProps, newProps)` function
- Enhanced reconciler with key-based children matching
- DOM node reuse for keyed list reordering
- Documented behavior differences between keyed/unkeyed lists

---

### Phase 5: State with useState Hook

**Features (Planned):**

- Implement a basic `useState` hook for functional components
- Trigger re-renders on state changes
- Preserve state across renders
- Component state isolation

**Tests (Planned):**

- State updates cause re-renders
- Multiple `useState` calls work independently
- State resets on unmount/remount
- Batching state updates

---

### Phase 6: Event Handling

**Features (Planned):**

- Support for event props (e.g., `onClick`) on host elements
- Attach/detach event listeners as props change
- Proper event delegation and cleanup

**Tests (Planned):**

- Event handlers are called on events
- Changing/removing event handlers updates listeners
- Event handlers receive correct event objects

---

### Phase 7: Effects with useEffect

**Features (Planned):**

- Implement a basic `useEffect` hook
- Support for cleanup functions and dependency arrays
- Effect lifecycle management

**Tests (Planned):**

- Effect runs after render
- Cleanup runs before re-run/unmount
- Effect runs only when dependencies change
- Multiple effects per component

---

### Phase 8: Context API (Optional/Advanced)

**Features (Planned):**

- Implement a simple context API (`createContext`, `useContext`)
- Support for context providers and consumers
- Context value propagation

**Tests (Planned):**

- Components receive correct context value
- Updating provider re-renders consumers
- Nested providers work as expected

---

### Phase 9: Portals and Fragments (Optional/Advanced)

**Features (Planned):**

- Support for rendering children into a different part of the DOM (portals)
- Support for fragments (multiple children without extra DOM nodes)

**Tests (Planned):**

- Portals render content outside the main tree
- Fragments render multiple children without extra DOM nodes

---

## Testing

- **Test-Driven Development**: All features are developed with comprehensive test coverage
- **Testing Framework**: Bun's built-in test runner
- **DOM Environment**: happy-dom for fast, headless DOM simulation
- **Test Organization**: Separated by feature/phase for clarity
- **Current Coverage**: 84 passing tests across 5 test files

### Test Categories:

- **Unit Tests**: Individual function testing
- **Integration Tests**: Full rendering pipeline testing
- **Edge Case Tests**: Error handling and boundary conditions
- **Performance Tests**: Reconciliation efficiency validation

### Running Specific Test Suites:

```bash
# Test specific functionality
bun test MiniReact.createElement.test.ts
bun test MiniReact.render.test.ts
bun test MiniReact.reconciler.test.ts

# Test functional components
bun test MiniReact.renderFC.test.ts
bun test MiniReact.createElementFC.test.ts
```

---

## Contributing

This is a learning project, but contributions are welcome! When adding features:

1. **Follow the phase-based approach** - implement features in order
2. **Write tests first** - TDD approach preferred
3. **Update documentation** - keep README current
4. **Follow existing patterns** - maintain code consistency
5. **Add type safety** - use TypeScript throughout

---

## License

MIT License - see LICENSE file for details

---

**Happy hacking and learning! 🚀**

_Building React from scratch to understand how it really works under the hood._
