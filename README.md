# MiniReact

A learning project to build a simplified React-like library from scratch, with a focus on understanding virtual DOM, reconciliation, and component-based architecture. This project is developed incrementally in well-defined phases, each with comprehensive test coverage and production-quality code.

---

## Table of Contents

- [Overview](#overview)
- [Current Status](#current-status)
- [Quick Start](#quick-start)
- [Features](#features)
- [Project Structure](#project-structure)
- [Development Phases](#development-phases)
  - [Phase 1: Element Creation & Basic Rendering ✅](#phase-1-element-creation--basic-rendering-)
  - [Phase 2: Functional Components ✅](#phase-2-functional-components-)
  - [Phase 3: Virtual DOM & Basic Reconciliation ✅](#phase-3-virtual-dom--basic-reconciliation-)
  - [Phase 4: Prop Diffing & Efficient Children Reconciliation ✅](#phase-4-prop-diffing--efficient-children-reconciliation-)
  - [Phase 5: State with useState Hook ✅](#phase-5-state-with-usestate-hook)
  - [Phase 6: Event Handling ✅](#phase-6-event-handling)
  - [Phase 7: Effects with useEffect ✅](#phase-7-effects-with-useeffect-)
  - [Phase 8: Context API 🚧](#phase-8-context-api-)
  - [Phase 9: Portals and Fragments](#phase-9-portals-and-fragments)
  - [Phase 10: JSX Support](#phase-10-jsx-support)
- [API Reference](#api-reference)
- [Testing](#testing)
- [Code Quality](#code-quality)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

**MiniReact** is a step-by-step implementation of a React-like UI library designed for learning and understanding how modern UI frameworks work under the hood. The project emphasizes:

- **Test-driven development** with full test coverage
- **Quality code** with full TypeScript support and linting
- **Incremental complexity** with well-documented phases
- **Performance optimization** with efficient reconciliation algorithms
- **Real-world patterns** that mirror React's actual implementation

Each phase includes clear specifications, working implementations, and extensive test coverage to ensure reliability and educational value.

---

## Current Status

🎯 **Current Phase**: 8 ✅ **IN PROGRESS**

**Latest Achievements**:

- ✅ **Phase 7 Complete**: useEffect Hook
- ✅ **142 Tests Passing**: Comprehensive test suite covering all functionality
- ✅ **Zero Linter Issues**: Clean codebase with consistent formatting
- ✅ **Almost Complete Hook System**: useState, useEffect with proper lifecycle management
- ✅ **Advanced Effect Management**: Dependencies, cleanup, and scheduling

**Overall Progress**: 8/10 phases complete (80% of planned features)

---

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (for runtime and testing)
- [Biome](https://biomejs.dev/) (for linting/formatting)
- [happy-dom](https://github.com/capricorn86/happy-dom) (for DOM testing environment)

### Installation

```bash
# Clone the repository
git clone https://github.com/MarcelOlsen/mini-react.git
cd mini-react

# Install dependencies
bun install
```

### Basic Usage

```typescript
import { createElement, render } from "./src/MiniReact";
import type { FunctionalComponent } from "./src/types";

// Simple host element
const simpleElement = createElement("h1", { id: "title" }, "Hello MiniReact!");

// Functional component with props
const Greeting: FunctionalComponent = (props) => {
  const { name } = props as { name: string };
  return createElement("p", { className: "greeting" }, `Hello, ${name}!`);
};

// Component with children
const Layout: FunctionalComponent = (props) => {
  const { title, children } = props as { title: string; children?: any[] };
  return createElement(
    "div",
    { className: "app" },
    createElement("h1", null, title),
    createElement("div", { className: "content" }, ...(children || []))
  );
};

// Complex component composition
const App = () => {
  return createElement(
    Layout,
    { title: "MiniReact Demo" },
    createElement(Greeting, { name: "World" }),
    createElement("p", null, "Building React from scratch!")
  );
};

// Render to DOM
const container = document.getElementById("root")!;
render(createElement(App), container);

// Dynamic updates (reconciliation in action)
setTimeout(() => {
  render(createElement(Greeting, { name: "Universe" }), container);
}, 2000);
```

### Running Tests

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run specific test file
bun test tests/MiniReact.render.test.ts

# Check code quality
bunx biome check
```

---

## Features

### ✅ Completed Features

- **🏗️ Virtual DOM**: Complete virtual DOM implementation with tree reconciliation
- **⚡ Efficient Reconciliation**: Smart diffing algorithm that minimizes DOM operations
- **🔑 Keyed Children**: Efficient list updates with key-based node reuse
- **🎯 Prop Diffing**: Fine-grained attribute updates (only changed props are modified)
- **🧩 Functional Components**: Full support for functional components with props and children
- **🔄 Dynamic Updates**: Efficient re-rendering with state preservation
- **📦 TypeScript Support**: Complete type safety with comprehensive type definitions
- **🧪 Comprehensive Testing**: Unit and integration tests covering all functionality and edge cases
- **📏 Code Quality**: Zero linter issues with consistent formatting
- **🔄 State Management**: useState hook with functional updates and state preservation
- **🎪 Event Handling**: Complete event system with delegation, synthetic events, and bubbling/capture

### 🎨 Advanced Capabilities

- **Nested Components**: Deep component hierarchies with proper reconciliation
- **Mixed Content**: Text nodes, numbers, and elements as children
- **Conditional Rendering**: Support for null/undefined elements
- **Performance Optimized**: Key-based reconciliation for efficient list operations
- **Memory Efficient**: Proper cleanup and DOM node reuse
- **Edge Case Handling**: Robust error handling and boundary conditions

---

## Project Structure

```
mini-react/
├── src/
│   ├── MiniReact.ts           # Main API exports
│   ├── types.ts               # TypeScript type definitions
│   ├── domRenderer.ts         # DOM manipulation utilities
│   ├── reconciler.ts          # Virtual DOM reconciliation logic
│   └── eventSystem.ts         # Event delegation and synthetic events
├── tests/
│   ├── MiniReact.createElement.test.ts      # Element creation tests
│   ├── MiniReact.createElementFC.test.ts    # Functional component creation
│   ├── MiniReact.render.test.ts             # Rendering & reconciliation
│   ├── MiniReact.renderFC.test.ts           # Functional component rendering
│   ├── MiniReact.reconciler.test.ts         # Core reconciliation
│   ├── MiniReact.events.test.ts             # Event handling tests
│   └── MiniReact.useState.test.ts           # useState hook tests
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

---

### Phase 2: Functional Components ✅

**Features:**

- ✅ Support for functional components as element types
- ✅ Passing props and children to functional components
- ✅ Components can return other components or host elements
- ✅ Proper handling of null/undefined returns

---

### Phase 3: Virtual DOM & Basic Reconciliation ✅

**Features:**

- ✅ Virtual DOM (VDOM) tree structure with instances
- ✅ Reconciler algorithm for efficient DOM updates
- ✅ Support for updating props and children
- ✅ Proper cleanup and node reuse

---

### Phase 4: Prop Diffing & Efficient Children Reconciliation ✅

**Features:**

- ✅ Fine-grained prop diffing (update only changed attributes)
- ✅ Efficient children reconciliation (reuse existing DOM nodes)
- ✅ Support for keyed children (key-based diffing for lists)
- ✅ Minimal DOM operations for performance

---

### Phase 5: State with useState Hook ✅

**Features:**

- ✅ Implement a basic `useState` hook for functional components
- ✅ Trigger re-renders on state changes
- ✅ Preserve state across renders
- ✅ Component state isolation
- ✅ Support for functional state updates
- ✅ Multiple hooks per component
- ✅ Hook order consistency

---

### Phase 6: Event Handling ✅

**Features:**

- ✅ Support for event props (e.g., `onClick`) on host elements
- ✅ Event delegation system for efficient event handling
- ✅ Synthetic events with normalized cross-browser behavior
- ✅ Event bubbling and capture phase support
- ✅ Proper event cleanup and memory management
- ✅ Integration with useState hook for stateful interactions

---

### Phase 7: Effects with useEffect ✅

**Features:**

- ✅ Implement a basic `useEffect` hook
- ✅ Support for cleanup functions and dependency arrays
- ✅ Effect lifecycle management

---

### Phase 8: Context API 🚧

**Features:**

- 🚧 Implement a simple context API (`createContext`, `useContext`)
- 🚧 Support for context providers and consumers
- 🚧 Context value propagation

---

### Phase 9: Portals and Fragments

**Features (Planned):**

- Support for rendering children into a different part of the DOM (portals)
- Support for fragments (multiple children without extra DOM nodes)

---

### Phase 10: JSX Support

**Features (Planned):**

- JSX syntax support for component definitions and element creation
- JSX runtime functions (`jsx`, `jsxs`, `jsxDEV`) for build tool integration
- Fragment support with `<>` and `</Fragment>` syntax
- TypeScript JSX declarations for full type safety
- Build tool configuration (TypeScript/Babel integration)
- Development mode enhancements with source maps and debugging
- Backward compatibility with existing `createElement` API

---

## API Reference

### createElement

```typescript
function createElement(
  type: ElementType,
  props: Record<string, unknown> | null,
  ...children: (AnyMiniReactElement | string | number)[]
): MiniReactElement;
```

Creates a virtual DOM element.

**Parameters:**

- `type`: String for host elements ("div", "span") or FunctionalComponent
- `props`: Properties object or null
- `children`: Child elements, strings, or numbers

**Example:**

```typescript
// Host element
const div = createElement("div", { className: "container" }, "Hello");

// Functional component
const greeting = createElement(Greeting, { name: "World" });
```

### render

```typescript
function render(
  element: AnyMiniReactElement | null | undefined,
  container: HTMLElement
): void;
```

Renders a virtual DOM element into a real DOM container with efficient reconciliation.

**Parameters:**

- `element`: Virtual DOM element to render (null clears container)
- `container`: Target DOM element

**Example:**

```typescript
const app = createElement("div", null, "Hello World");
render(app, document.getElementById("root")!);
```

### Functional Components

```typescript
type FunctionalComponent<P = Record<string, unknown>> = (
  props: P & { children?: AnyMiniReactElement[] }
) => AnyMiniReactElement | null;
```

Components are functions that take props and return virtual DOM elements. The type is generic, allowing for strongly typed props with destructuring. **Now supports inferred component types just like React!**

**Examples:**

```typescript
// ✅ Inferred component (React-style) - RECOMMENDED
const Component = ({ id }: { id: string }) => {
  return createElement("div", { id }, "Hello World");
};

// ✅ Inferred with optional props
const Greeting = ({
  name = "Anonymous",
  age,
}: {
  name?: string;
  age?: number;
}) => {
  return createElement(
    "p",
    null,
    age ? `${name} is ${age} years old` : `Hello, ${name}!`
  );
};

// ✅ Inferred with complex props
const UserCard = ({
  user,
  onAction,
}: {
  user: { name: string; id: number };
  onAction: (id: number) => void;
}) => {
  return createElement(
    "div",
    {
      onclick: () => onAction(user.id),
    },
    `User: ${user.name}`
  );
};

// ✅ Inferred with no props
const SimpleComponent = () => {
  return createElement("span", null, "Simple component");
};

// Usage - no explicit typing needed!
const app = createElement(
  "div",
  null,
  createElement(Component, { id: "my-component" }),
  createElement(Greeting, { name: "Alice", age: 30 }),
  createElement(UserCard, {
    user: { name: "Bob", id: 123 },
    onAction: (id) => console.log(`Action for ${id}`),
  }),
  createElement(SimpleComponent, null)
);

// Legacy explicit typing (still supported for backward compatibility)
const TypedButton: FunctionalComponent<{
  text: string;
  onClick: () => void;
}> = ({ text, onClick }) => {
  return createElement("button", { onclick: onClick }, text);
};

// With children
const Layout: FunctionalComponent<{ title: string }> = ({
  title,
  children,
}) => {
  return createElement(
    "div",
    null,
    createElement("h1", null, title),
    createElement("div", { className: "content" }, ...(children || []))
  );
};
```

---

## Testing

**Comprehensive Test Suite: Unit and integration tests across 7 files**

### Test Categories:

- **Unit Tests**: Individual function testing (createElement, render)
- **Integration Tests**: Full rendering pipeline testing
- **Reconciliation Tests**: Virtual DOM diffing and updates
- **Event Tests**: Event handling, delegation, and synthetic events
- **Hook Tests**: useState hook functionality and state management
- **Performance Tests**: Large lists and memory pressure scenarios
- **Edge Case Tests**: Error handling and boundary conditions

### Running Tests:

```bash
# All tests
bun test

# Specific functionality
bun test tests/MiniReact.render.test.ts

# Watch mode for development
bun test --watch

# Verbose output
bun test --verbose
```

### Test Features:

- **DOM Environment**: happy-dom for fast, headless testing
- **Async Testing**: Support for promises and timeouts
- **Performance Testing**: Large dataset handling
- **Memory Testing**: Cleanup and leak detection
- **Edge Case Coverage**: Unicode, special characters, extreme scenarios

---

## Code Quality

**Zero linter issues maintained with:**

- **Biome**: Modern linter and formatter
- **TypeScript**: Full type safety
- **Consistent formatting**: Auto-formatted codebase
- **Import organization**: Sorted and clean imports
- **Performance optimizations**: Preferred patterns enforced

### Quality Metrics:

- ✅ **0 linting errors**
- ✅ **100% TypeScript coverage**
- ✅ **Consistent code style**
- ✅ **Optimized performance patterns**
- ✅ **Proper error handling**

### Running Quality Checks:

```bash
# Check linting and formatting
bunx biome check

# Auto-fix issues
bunx biome check --write

# Format only
bunx biome format --write .
```

---

## Contributing

This is a learning project, but contributions are welcome! When contributing:

1. **Follow the phase-based approach** - implement features in order
2. **Write comprehensive tests** - aim for high coverage
3. **Maintain code quality** - ensure linter passes
4. **Update documentation** - keep README current
5. **Add type safety** - use TypeScript throughout
6. **Follow existing patterns** - maintain consistency

### Development Workflow:

```bash
# 1. Install dependencies
bun install

# 2. Run tests in watch mode
bun test --watch

# 3. Check code quality
bunx biome check

# 4. Run all tests before committing
bun test
```

---

## License

MIT License - see LICENSE file for details

---

**Happy hacking and learning! 🚀**

_Building React from scratch to understand how modern UI frameworks really work under the hood._
