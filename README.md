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
  - [Phase 5: State with useState Hook 🚧](#phase-5-state-with-usestate-hook)
  - [Phase 6: Event Handling](#phase-6-event-handling)
  - [Phase 7: Effects with useEffect](#phase-7-effects-with-useeffect)
  - [Phase 8: Context API](#phase-8-context-api)
  - [Phase 9: Portals and Fragments](#phase-9-portals-and-fragments)
- [API Reference](#api-reference)
- [Testing](#testing)
- [Code Quality](#code-quality)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

**MiniReact** is a step-by-step implementation of a React-like UI library designed for learning and understanding how modern UI frameworks work under the hood. The project emphasizes:

- **Test-driven development** with 101 comprehensive tests
- **Production-quality code** with full TypeScript support and linting
- **Incremental complexity** with well-documented phases
- **Performance optimization** with efficient reconciliation algorithms
- **Real-world patterns** that mirror React's actual implementation

Each phase includes clear specifications, working implementations, and extensive test coverage to ensure reliability and educational value.

---

## Current Status

🎯 **Current Phase**: 4 ✅ **COMPLETED**

**Latest Achievements**:

- ✅ **Phase 4 Complete**: Advanced prop diffing and efficient children reconciliation
- ✅ **101 Tests Passing**: Comprehensive test suite covering all functionality
- ✅ **Zero Linter Issues**: Clean codebase with consistent formatting
- ✅ **Key-based Reconciliation**: Efficient list updates with DOM node reuse
- ✅ **Performance Optimized**: Minimal DOM operations and smart diffing

**Overall Progress**: 4/9 phases complete (44% of planned features)

---

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (for runtime and testing)
- [Biome](https://biomejs.dev/) (for linting/formatting)
- [happy-dom](https://github.com/capricorn86/happy-dom) (for DOM testing environment)

### Installation

```bash
# Clone the repository
git clone <repository-url>
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

// Functional component
const Greeting: FunctionalComponent = (props) => {
  const { name } = props as { name: string };
  return createElement("p", { className: "greeting" }, `Hello, ${name}!`);
};

// Component with children
const App: FunctionalComponent = () => {
  return createElement(
    "div",
    { className: "app" },
    createElement("h1", null, "MiniReact Demo"),
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
- **🧪 Comprehensive Testing**: 101 tests covering all functionality and edge cases
- **📏 Code Quality**: Zero linter issues with consistent formatting

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
│   └── reconciler.ts          # Virtual DOM reconciliation logic
├── tests/
│   ├── MiniReact.createElement.test.ts      # Element creation tests (3 tests)
│   ├── MiniReact.createElementFC.test.ts    # Functional component creation (18 tests)
│   ├── MiniReact.render.test.ts             # Rendering & reconciliation (58 tests)
│   ├── MiniReact.renderFC.test.ts           # Functional component rendering (16 tests)
│   └── MiniReact.reconciler.test.ts         # Core reconciliation (19 tests)
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

**Tests:** 3 tests passing

- Element creation with/without props and children
- Text and number children handling
- Edge cases (null/undefined props and children)

---

### Phase 2: Functional Components ✅

**Features:**

- ✅ Support for functional components as element types
- ✅ Passing props and children to functional components
- ✅ Components can return other components or host elements
- ✅ Proper handling of null/undefined returns

**Tests:** 18 tests passing

- Functional component creation with various prop types
- Complex nested props and children
- Edge cases and special character handling
- Component reference integrity

---

### Phase 3: Virtual DOM & Basic Reconciliation ✅

**Features:**

- ✅ Virtual DOM (VDOM) tree structure with instances
- ✅ Reconciler algorithm for efficient DOM updates
- ✅ Support for updating props and children
- ✅ Proper cleanup and node reuse

**Tests:** 19 tests passing

- Initial render scenarios
- Element type changes and replacements
- Same-type updates for host elements and components
- Complex nested reconciliation scenarios

---

### Phase 4: Prop Diffing & Efficient Children Reconciliation ✅

**Features:**

- ✅ Fine-grained prop diffing (update only changed attributes)
- ✅ Efficient children reconciliation (reuse existing DOM nodes)
- ✅ Support for keyed children (key-based diffing for lists)
- ✅ Minimal DOM operations for performance

**Tests:** 58 comprehensive tests passing

- Fine-grained prop updates and removals
- Adding/removing/reordering children with and without keys
- Performance scenarios with large lists (500+ items)
- Edge cases: duplicate keys, mixed keyed/unkeyed content
- Memory pressure testing and extreme reordering patterns
- Unicode and special character handling

**Key Implementations:**

- `diffProps(domNode, oldProps, newProps)` function
- Enhanced reconciler with key-based children matching
- DOM node reuse for keyed list reordering
- Efficient handling of mixed text/element content

---

### Phase 5: State with useState Hook 🚧

**Features (Planned):**

- 🚧 Implement a basic `useState` hook for functional components
- 🚧 Trigger re-renders on state changes
- 🚧 Preserve state across renders
- 🚧 Component state isolation

**Implementation Goals:**

- Hook state management system
- Component-level state tracking
- Batched updates for performance
- Proper cleanup on unmount

---

### Phase 6: Event Handling

**Features (Planned):**

- Support for event props (e.g., `onClick`) on host elements
- Attach/detach event listeners as props change
- Proper event delegation and cleanup

**Implementation Goals:**

- Event listener management in reconciler
- Synthetic event system (optional)
- Memory leak prevention

---

### Phase 7: Effects with useEffect

**Features (Planned):**

- Implement a basic `useEffect` hook
- Support for cleanup functions and dependency arrays
- Effect lifecycle management

**Implementation Goals:**

- Effect queue management
- Dependency comparison algorithm
- Cleanup function handling

---

### Phase 8: Context API

**Features (Planned):**

- Implement a simple context API (`createContext`, `useContext`)
- Support for context providers and consumers
- Context value propagation

---

### Phase 9: Portals and Fragments

**Features (Planned):**

- Support for rendering children into a different part of the DOM (portals)
- Support for fragments (multiple children without extra DOM nodes)

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
type FunctionalComponent = (
  props: Record<string, unknown>
) => AnyMiniReactElement | null;
```

Components are functions that take props and return virtual DOM elements.

**Example:**

```typescript
const Button: FunctionalComponent = (props) => {
  const { text, onClick } = props as { text: string; onClick: () => void };
  return createElement("button", { onclick: onClick }, text);
};
```

---

## Testing

**Comprehensive Test Suite: 101 tests across 5 files**

### Test Categories:

- **Unit Tests**: Individual function testing (createElement, render)
- **Integration Tests**: Full rendering pipeline testing
- **Reconciliation Tests**: Virtual DOM diffing and updates
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
- **Performance Testing**: Large dataset handling (500+ elements)
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
