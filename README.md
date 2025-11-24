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
  - [🚀 **ALPHA RELEASE TRACK** (Phases 1-11)](#-alpha-release-track-phases-1-11)
    - [Phase 1: Element Creation & Basic Rendering ✅](#phase-1-element-creation--basic-rendering-)
    - [Phase 2: Functional Components ✅](#phase-2-functional-components-)
    - [Phase 3: Virtual DOM & Basic Reconciliation ✅](#phase-3-virtual-dom--basic-reconciliation-)
    - [Phase 4: Prop Diffing & Efficient Children Reconciliation ✅](#phase-4-prop-diffing--efficient-children-reconciliation-)
    - [Phase 5: State with useState Hook ✅](#phase-5-state-with-usestate-hook-)
    - [Phase 6: Event Handling ✅](#phase-6-event-handling-)
    - [Phase 7: Effects with useEffect ✅](#phase-7-effects-with-useeffect-)
    - [Phase 8: Context API ✅](#phase-8-context-api-)
    - [Phase 9: Portals and Fragments ✅](#phase-9-portals-and-fragments-)
    - [Phase 10: JSX Support ✅](#phase-10-jsx-support-)
    - [Phase 11: Essential Hooks (useRef & useReducer) ✅](#phase-11-essential-hooks-useref--usereducer-)
    - [🎉 **ALPHA RELEASE v0.1.0** - Complete Core React-like Functionality](#-alpha-release-v010---complete-core-react-like-functionality)
  - [🚀 **STABLE RELEASE TRACK** (Phases 12-20)](#-stable-release-track-phases-12-20)
    - [Phase 12: Performance Optimization Suite ✅](#phase-12-performance-optimization-suite-)
    - [Phase 13: Error Boundaries & Resilience](#phase-13-error-boundaries--resilience)
    - [Phase 14: Async Features & Suspense](#phase-14-async-features--suspense)
    - [Phase 15: Concurrent Features (Advanced)](#phase-15-concurrent-features-advanced)
    - [Phase 16: Developer Experience](#phase-16-developer-experience)
    - [Phase 17: Server-Side Rendering](#phase-17-server-side-rendering)
    - [Phase 18: Advanced Component Patterns](#phase-18-advanced-component-patterns)
    - [Phase 19: Testing & Quality Assurance](#phase-19-testing--quality-assurance)
    - [Phase 20: Production Optimizations](#phase-20-production-optimizations)
    - [🎯 **STABLE RELEASE v1.0.0** - Production-Ready React Alternative](#-stable-release-v100---production-ready-react-alternative)
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

🆕 **Current Phase**: Stable Release Track - Phase 12 ✅ **COMPLETE**

**Latest Achievements**:

- ✅ **Phase 12 Complete**: Performance Optimization Suite - memo, useMemo, useCallback with comprehensive test coverage
- ✅ **Enhanced Performance**: React.memo equivalent for component memoization and optimization hooks
- ✅ **272 Tests Passing**: Comprehensive test suite covering all functionality including performance optimizations
- ✅ **Zero Linter Issues**: Clean codebase with consistent formatting and biome configuration
- ✅ **Complete Performance Toolkit**: memo, useMemo, useCallback hooks for production-grade optimization
- ✅ **Production-Ready**: Robust error handling, TypeScript support, and comprehensive edge case coverage
- ✅ **Package Preparation**: Ready for npm registry publication with performance features

**Stable Release Progress**: 1/9 phases complete (11% complete) 🚀

**Immediate Milestones**:

- 🚀 **npm Package Publication**: Package will be available on npm registry soon
- 📦 **Alpha Release v0.1.0**: Complete core React-like functionality now available
- 📚 **Documentation & Examples**: Comprehensive guides and demo applications

**Post-Alpha Roadmap**: 12 additional phases planned for stable v1.0.0 release with advanced features including concurrent rendering, SSR, dev tools, and production optimizations.

---

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (for runtime and testing)
- [Biome](https://biomejs.dev/) (for linting/formatting)
- [happy-dom](https://github.com/capricorn86/happy-dom) (for DOM testing environment)

### Installation

**📦 npm Package (Coming Soon):**

# Installation

```bash
npm install @marcelolsen/mini-react
# or
bun add @marcelolsen/mini-react
```

**🔧 Development Installation (Current):**

```bash
# Clone the repository for development/testing
git clone https://github.com/MarcelOlsen/mini-react.git
cd mini-react

# Install dependencies
bun install

# Setup git hooks (automatic code formatting)
./scripts/setup-hooks.sh

# Run tests to verify installation
bun test

# Build the project
bun run build
```

### Basic Usage

```typescript
import { createElement, render } from "@marcelolsen/mini-react";
import type { FunctionalComponent } from "@marcelolsen/mini-react";

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

### JSX Usage (New!)

With Phase 10 complete, you can now use JSX syntax! Configure your build tool (TypeScript/Bun) to use the MiniReact JSX runtime:

**tsconfig.json:**

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@marcelolsen/mini-react"
  }
}
```

**JSX Examples:**

```tsx
import { render, useState, Fragment } from "@marcelolsen/mini-react";

// JSX syntax instead of createElement!
const Greeting = ({ name }: { name: string }) => {
  return <p className="greeting">Hello, {name}!</p>;
};

const Counter = () => {
  const [count, setCount] = useState(0);

  return (
    <div className="counter">
      <h2>Count: {count}</h2>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
};

// Fragments work too!
const App = () => {
  return (
    <>
      <h1>MiniReact with JSX!</h1>
      <Greeting name="World" />
      <Counter />
    </>
  );
};

// Render with JSX
render(<App />, document.getElementById("root")!);
```

### Advanced Usage Examples

#### Portal Usage

```typescript
import {
  createElement,
  render,
  createPortal,
  useState,
} from "@marcelolsen/mini-react";

// Create a portal target in your HTML
// <div id="modal-root"></div>

const Modal = ({
  children,
  onClose,
}: {
  children: any;
  onClose: () => void;
}) => {
  const modalRoot = document.getElementById("modal-root");
  if (!modalRoot) return null;

  return createPortal(
    createElement(
      "div",
      {
        className: "modal-overlay",
        onClick: onClose,
        style: {
          position: "fixed",
          top: "0",
          left: "0",
          right: "0",
          bottom: "0",
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        },
      },
      createElement(
        "div",
        {
          className: "modal-content",
          onClick: (e: Event) => e.stopPropagation(),
          style: {
            backgroundColor: "white",
            padding: "20px",
            borderRadius: "5px",
          },
        },
        children,
        createElement("button", { onClick: onClose }, "Close")
      )
    ),
    modalRoot
  );
};

const App = () => {
  const [showModal, setShowModal] = useState(false);

  return createElement(
    "div",
    null,
    createElement("h1", null, "Portal Demo"),
    createElement(
      "button",
      { onClick: () => setShowModal(true) },
      "Open Modal"
    ),
    showModal &&
      createElement(
        Modal,
        { onClose: () => setShowModal(false) },
        createElement("h2", null, "Modal Content"),
        createElement("p", null, "This modal is rendered using createPortal!")
      )
  );
};
```

#### Fragment Usage

```typescript
import { createElement, Fragment } from "@marcelolsen/mini-react";

// Multiple children without wrapper element
const ItemList = ({ items }: { items: string[] }) => {
  return createElement(
    Fragment,
    null,
    ...items.map((item, index) => createElement("li", { key: index }, item))
  );
};

const App = () => {
  return createElement(
    "ul",
    null,
    createElement(ItemList, { items: ["Apple", "Banana", "Cherry"] })
  );
};
```

---

## Features

### 🌟 Core React-Like Functionality

- **🏗️ Virtual DOM**: Efficient virtual DOM implementation with reconciliation algorithm
- **⚡ Component System**: Functional components with props and children support
- **🎣 Complete Hook Ecosystem**: All essential React hooks implemented
  - **useState**: State management with automatic re-rendering
  - **useEffect**: Side effects with dependency arrays and cleanup
  - **useContext**: Context API for prop drilling elimination
  - **useRef**: DOM references and mutable values without re-renders
  - **useReducer**: Complex state management with reducer patterns
- **⚡ Event Handling**: Synthetic event system with proper event delegation and cleanup
- **🌐 Context API**: createContext and useContext hooks with provider/consumer pattern
- **🌉 Portals**: createPortal for rendering content to different DOM containers with React tree event bubbling
- **📦 Fragments**: React.Fragment equivalent for rendering multiple children without wrapper DOM nodes
- **🎨 JSX Support**: Full JSX syntax with jsx/jsxs/jsxDEV runtime functions and TypeScript integration

### 🎨 Advanced Capabilities

- **JSX Syntax**: Full JSX syntax support with modern runtime (jsx, jsxs, jsxDEV)
- **TypeScript JSX**: Complete type safety for JSX elements and components
- **Nested Components**: Deep component hierarchies with proper reconciliation
- **Mixed Content**: Text nodes, numbers, and elements as children
- **Conditional Rendering**: Support for null/undefined elements with enhanced error handling
- **Performance Optimized**: Key-based reconciliation for efficient list operations
- **Memory Efficient**: Proper cleanup and DOM node reuse
- **Edge Case Handling**: Robust error handling and boundary conditions with recent bug fixes
- **Portal Event System**: Events bubble through React component tree, not DOM tree
- **Portal Context Propagation**: Context values work seamlessly across portal boundaries
- **Fragment Reconciliation**: Efficient updates for fragment children without wrapper elements

### 📋 Testing & Quality

- **261 Comprehensive Tests**: Full test coverage for all features and edge cases including all hooks
- **TypeScript Support**: Full type safety with detailed type definitions
- **Linting & Formatting**: Biome-based code quality and consistent formatting
- **Error Handling**: Graceful degradation and helpful error messages
- **Performance Testing**: Reconciliation benchmarks and memory leak detection
- **Integration Testing**: Full component lifecycle and interaction testing

---

## Project Structure

```
mini-react/
├── src/
│   ├── MiniReact.ts          # Main library exports and JSX runtime
│   ├── types.ts              # TypeScript type definitions
│   ├── vdom.ts               # Virtual DOM creation and utilities
│   ├── reconciler.ts         # Virtual DOM reconciliation engine
│   ├── hooks.ts              # Hook implementations (useState, useEffect, useContext)
│   ├── context.ts            # Context API implementation
│   ├── portals.ts            # Portal system implementation
│   ├── events.ts             # Event system and synthetic events
│   └── jsx/                  # JSX runtime functions
│       ├── jsx-runtime.ts    # Production JSX runtime
│       └── jsx-dev-runtime.ts # Development JSX runtime with debugging
├── tests/                    # Comprehensive test suite
│   ├── MiniReact.render.test.ts
│   ├── MiniReact.functional-components.test.ts
│   ├── MiniReact.reconciliation.test.ts
│   ├── MiniReact.hooks.test.ts
│   ├── MiniReact.events.test.ts
│   ├── MiniReact.context.test.ts
│   ├── MiniReact.portals.test.ts
│   ├── MiniReact.fragments.test.ts
│   └── MiniReact.jsx.test.ts
├── examples/                 # Usage examples and demos
│   ├── jsx-examples/         # JSX syntax examples
│   ├── basic-usage/          # Basic API examples
│   ├── advanced-patterns/    # Advanced usage patterns
│   └── performance-tests/    # Performance benchmarks
└── package.json             # Dependencies and scripts
```

---

## Development Phases

### 🚀 **ALPHA RELEASE TRACK** (Phases 1-11)

#### Phase 1: Element Creation & Basic Rendering ✅

**Features:**

- ✅ createElement function for host elements (div, span, etc.)
- ✅ Basic render function that creates real DOM from virtual DOM
- ✅ Support for props (attributes, event handlers, etc.)
- ✅ Support for children (text nodes, nested elements)
- ✅ Comprehensive test coverage for element creation and rendering

---

#### Phase 2: Functional Components ✅

**Features:**

- ✅ Support for functional components that return virtual DOM
- ✅ Props passing to functional components
- ✅ Component composition and nesting
- ✅ Proper TypeScript types for functional components
- ✅ Test coverage for functional component rendering and composition

---

#### Phase 3: Virtual DOM & Basic Reconciliation ✅

**Features:**

- ✅ Virtual DOM tree structure with proper typing
- ✅ Basic reconciliation algorithm to diff virtual DOM trees
- ✅ Efficient DOM updates (add, remove, update nodes)
- ✅ Text content updates and mixed content handling
- ✅ Element type changes and property updates
- ✅ Test coverage for virtual DOM creation and reconciliation

---

#### Phase 4: Prop Diffing & Efficient Children Reconciliation ✅

**Features:**

- ✅ Intelligent prop diffing with add/remove/update detection
- ✅ Key-based reconciliation for efficient list rendering and reordering
- ✅ Advanced children reconciliation with position tracking
- ✅ Style object diffing and updates
- ✅ Event handler updates and cleanup
- ✅ Edge case handling for complex reconciliation scenarios

---

#### Phase 5: State with useState Hook ✅

**Features:**

- ✅ useState hook implementation with proper state management
- ✅ Component re-rendering on state changes
- ✅ State preservation between renders
- ✅ Functional state updates and batching
- ✅ Hook rules enforcement and error handling
- ✅ Integration with reconciliation system for efficient updates

---

#### Phase 6: Event Handling ✅

**Features:**

- ✅ Synthetic event system with cross-browser compatibility
- ✅ Event delegation and efficient event management
- ✅ Event handler prop updates during reconciliation
- ✅ Event cleanup and memory leak prevention
- ✅ Support for all common DOM events (click, change, submit, etc.)
- ✅ Event object normalization and additional properties

---

#### Phase 7: Effects with useEffect ✅

**Features:**

- ✅ useEffect hook with dependency array support
- ✅ Effect cleanup functions and proper lifecycle management
- ✅ Effect scheduling and execution timing
- ✅ Dependency comparison and change detection
- ✅ Mount, update, and unmount effect handling
- ✅ Integration with component lifecycle and state changes

---

#### Phase 8: Context API ✅

**Features:**

- ✅ createContext function for context creation
- ✅ Context Provider component with value passing
- ✅ useContext hook for consuming context values
- ✅ Context value change detection and re-rendering
- ✅ Nested context support and context composition
- ✅ Performance optimization for context updates

---

#### Phase 9: Portals and Fragments ✅

**Features:**

- ✅ createPortal function for rendering to different DOM containers
- ✅ Portal event bubbling through React tree (not DOM tree)
- ✅ Context propagation across portal boundaries
- ✅ Portal cleanup and lifecycle management
- ✅ React.Fragment equivalent for grouping elements without wrapper
- ✅ Fragment reconciliation and efficient updates

---

#### Phase 10: JSX Support ✅

**Features:**

- ✅ JSX syntax support for component definitions and element creation
- ✅ JSX runtime functions (`jsx`, `jsxs`, `jsxDEV`) for build tool integration
- ✅ Fragment support with `<>` and `</Fragment>` syntax
- ✅ TypeScript JSX declarations for full type safety
- ✅ Build tool configuration (TypeScript/Babel integration)
- ✅ Development mode enhancements with source maps and debugging
- ✅ Backward compatibility with existing `createElement` API

---

#### Phase 11: Essential Hooks (useRef & useReducer) ✅

**Features:**

- ✅ useRef hook for DOM references and mutable values without re-renders
- ✅ useReducer hook for complex state management with reducer patterns
- ✅ Ref object with mutable .current property that persists across renders
- ✅ Reducer pattern with actions, state transitions, and dispatch function
- ✅ Integration with existing hook system and component lifecycle
- ✅ Comprehensive test coverage for all hook scenarios and edge cases
- ✅ TypeScript support with proper type inference and safety

---

### 🎉 **ALPHA RELEASE v0.1.0** - Complete Core React-like Functionality

**Status**: ✅ **NPM PACKAGE PUBLISHED**

**Alpha Release Features:**

- ✅ Full React-like component system with JSX support
- ✅ Complete hook ecosystem (useState, useEffect, useContext, useRef, useReducer)
- ✅ Advanced rendering (Portals, Fragments)
- ✅ Production-ready reconciliation engine
- ✅ Comprehensive TypeScript support
- ✅ 261 tests with full coverage
- ✅ Developer-friendly API matching React patterns
- ✅ npm package ready for publication

---

### 🚀 **STABLE RELEASE TRACK** (Phases 12-20)

#### Phase 12: Performance Optimization Suite ✅

**Features:**

- ✅ Memoization (React.memo equivalent) for component optimization
- ✅ useMemo hook for expensive computation memoization
- ✅ useCallback hook for function reference stability
- ✅ Shallow prop comparison with custom comparison support
- ✅ Performance tracking and measurement utilities
- ✅ Comprehensive test coverage for all optimization features
- ✅ TypeScript support with proper type inference and safety

#### Phase 13: Error Boundaries & Resilience

- Error boundary implementation
- Graceful error handling and recovery
- Development mode error overlays
- Production error reporting
- Component error isolation

#### Phase 14: Async Features & Suspense

- Suspense component for async rendering
- Lazy loading and code splitting support
- Async component patterns
- Loading state management
- Error handling for async operations

#### Phase 15: Concurrent Features (Advanced)

- Time slicing for smooth rendering
- Priority-based rendering
- Interruptible rendering
- Scheduler implementation
- Advanced reconciliation strategies

#### Phase 16: Developer Experience

- Development tools and debugging
- Component inspector
- Hook debugging utilities
- Performance profiler
- Development warnings and tips

#### Phase 17: Server-Side Rendering

- SSR capabilities
- Hydration support
- Server/client rendering parity
- SEO optimization features
- Static site generation support

#### Phase 18: Advanced Component Patterns

- Higher-order components (HOCs)
- Render props pattern
- Compound components
- Advanced composition patterns
- Performance optimization patterns

#### Phase 19: Testing & Quality Assurance

- Testing utilities and helpers
- Component testing patterns
- Integration testing tools
- Performance testing suite
- Accessibility testing support

#### Phase 20: Production Optimizations

- Tree shaking and dead code elimination
- Advanced bundling strategies
- Runtime optimization
- Memory usage optimization
- Production monitoring tools

---

### 🎯 **STABLE RELEASE v1.0.0** - Production-Ready React Alternative

**Target**: 6-8 months after Alpha Release

**Stable Release Features:**

- Complete React API compatibility
- Advanced performance optimizations
- Full SSR and concurrent rendering support
- Comprehensive developer tools
- Production-ready with monitoring
- Enterprise-level documentation and support

---

## API Reference

### createElement

```typescript
function createElement(
  type: string | FunctionalComponent,
  props: Props | null,
  ...children: (MiniReactElement | string | number | null | undefined)[]
): MiniReactElement;
```

Creates a virtual DOM element. Supports both host elements (strings) and functional components.

**Parameters:**

- `type`: Element type (e.g., 'div', 'span') or functional component
- `props`: Element properties/attributes object or null
- `children`: Child elements, text nodes, or primitive values

**Example:**

```typescript
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

- `element`: Virtual DOM element to render
- `container`: Target DOM container element

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
    age ? `${name} is ${age} years old`
```

### useState

```typescript
function useState<T>(
  initialValue: T
): [T, (newValue: T | ((prev: T) => T)) => void];
```

Hook for managing component state with automatic re-rendering.

**Example:**

```typescript
const Counter = () => {
  const [count, setCount] = useState(0);
  return createElement(
    "button",
    { onClick: () => setCount(count + 1) },
    `Count: ${count}`
  );
};
```

### useEffect

```typescript
function useEffect(
  effect: () => void | (() => void),
  dependencies?: any[]
): void;
```

Hook for side effects with optional cleanup and dependency tracking.

**Example:**

```typescript
const Timer = () => {
  const [time, setTime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTime((t) => t + 1), 1000);
    return () => clearInterval(interval); // Cleanup
  }, []); // Empty dependency array = run once on mount

  return createElement("div", null, `Time: ${time}`);
};
```

### createContext & useContext

```typescript
function createContext<T>(defaultValue: T): Context<T>;
function useContext<T>(context: Context<T>): T;
```

Context API for passing data through component tree without prop drilling.

**Example:**

```typescript
const ThemeContext = createContext("light");

const ThemedButton = () => {
  const theme = useContext(ThemeContext);
  return createElement(
    "button",
    { style: { background: theme === "dark" ? "#333" : "#fff" } },
    "Themed Button"
  );
};

const App = () => {
  return createElement(
    ThemeContext.Provider,
    { value: "dark" },
    createElement(ThemedButton)
  );
};
```

### createPortal

```typescript
function createPortal(
  children: MiniReactElement,
  container: HTMLElement
): PortalElement;
```

Renders children into a different DOM container while maintaining React tree relationships.

**Example:**

```typescript
const Modal = ({ children }: { children: MiniReactElement }) => {
  const modalRoot = document.getElementById("modal-root")!;
  return createPortal(children, modalRoot);
};
```

### Fragment

```typescript
const Fragment: symbol;
```

Component for grouping multiple children without adding extra DOM nodes.

**Example:**

```typescript
const ItemList = () => {
  return createElement(
    Fragment,
    null,
    createElement("li", null, "Item 1"),
    createElement("li", null, "Item 2")
  );
};
```

### JSX Runtime Functions

```typescript
function jsx(type: any, props: any, key?: string): MiniReactElement;
function jsxs(type: any, props: any, key?: string): MiniReactElement;
function jsxDEV(
  type: any,
  props: any,
  key?: string,
  isStaticChildren?: boolean,
  source?: any,
  self?: any
): MiniReactElement;
```

JSX runtime functions for transpiled JSX syntax. These are automatically used by build tools and shouldn't be called directly.

### useRef

```typescript
function useRef<T>(initialValue: T): MutableRefObject<T>;

interface MutableRefObject<T> {
  current: T;
}
```

Hook for creating mutable references that persist across re-renders without triggering re-renders when changed. Useful for DOM references and storing mutable values.

**Example:**

```typescript
const InputComponent = () => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const renderCountRef = useRef(0);

  // Track renders without causing re-renders
  renderCountRef.current += 1;

  const focusInput = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return createElement(
    "div",
    null,
    createElement("input", { ref: inputRef, type: "text" }),
    createElement("button", { onClick: focusInput }, "Focus Input"),
    createElement("p", null, `Render count: ${renderCountRef.current}`)
  );
};
```

### useReducer

```typescript
function useReducer<State, Action>(
  reducer: (state: State, action: Action) => State,
  initialState: State
): [State, (action: Action) => void];

function useReducer<State, Action, Init>(
  reducer: (state: State, action: Action) => State,
  initialArg: Init,
  init: (arg: Init) => State
): [State, (action: Action) => void];
```

Hook for managing complex state with a reducer function. Ideal for state that involves multiple sub-values or complex update logic.

**Example:**

```typescript
interface CounterState {
  count: number;
  step: number;
}

type CounterAction =
  | { type: "INCREMENT" }
  | { type: "DECREMENT" }
  | { type: "SET_STEP"; payload: number }
  | { type: "RESET" };

const counterReducer = (
  state: CounterState,
  action: CounterAction
): CounterState => {
  switch (action.type) {
    case "INCREMENT":
      return { ...state, count: state.count + state.step };
    case "DECREMENT":
      return { ...state, count: state.count - state.step };
    case "SET_STEP":
      return { ...state, step: action.payload };
    case "RESET":
      return { count: 0, step: 1 };
    default:
      return state;
  }
};

const Counter = () => {
  const [state, dispatch] = useReducer(counterReducer, { count: 0, step: 1 });

  return createElement(
    "div",
    null,
    createElement("h3", null, `Count: ${state.count}`),
    createElement(
      "button",
      { onClick: () => dispatch({ type: "INCREMENT" }) },
      "+"
    ),
    createElement(
      "button",
      { onClick: () => dispatch({ type: "DECREMENT" }) },
      "-"
    ),
    createElement(
      "button",
      { onClick: () => dispatch({ type: "RESET" }) },
      "Reset"
    )
  );
};
```

---

## Testing

The project uses [Bun](https://bun.sh) as the test runner with [happy-dom](https://github.com/capricorn86/happy-dom) for DOM simulation.

### Running Tests

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run specific test file
bun test tests/MiniReact.render.test.ts

# Run tests with coverage
bun test --coverage
```

### Test Structure

```
tests/
├── MiniReact.render.test.ts              # Basic rendering tests
├── MiniReact.functional-components.test.ts # Component tests
├── MiniReact.reconciliation.test.ts      # Virtual DOM reconciliation
├── MiniReact.hooks.test.ts               # Hook implementations
├── MiniReact.events.test.ts              # Event system tests
├── MiniReact.context.test.ts             # Context API tests
├── MiniReact.portals.test.ts             # Portal functionality
├── MiniReact.fragments.test.ts           # Fragment rendering
└── MiniReact.jsx.test.ts                 # JSX runtime tests
```

### Test Coverage

Current test coverage: **261 tests** covering:

- ✅ Element creation and rendering
- ✅ Functional component composition
- ✅ Virtual DOM reconciliation algorithms
- ✅ Hook lifecycle and state management (useState, useEffect, useContext, useRef, useReducer)
- ✅ Event handling and cleanup
- ✅ Context propagation and updates
- ✅ Portal rendering and event bubbling
- ✅ Fragment reconciliation
- ✅ JSX syntax and runtime functions
- ✅ Edge cases and error conditions
- ✅ Performance and memory leak prevention

---

## Code Quality

### Linting and Formatting

The project uses [Biome](https://biomejs.dev/) for linting and code formatting:

```bash
# Check code quality
bunx biome check

# Fix auto-fixable issues
bunx biome check --apply

# Format code
bunx biome format --write .
```

### TypeScript Configuration

Full TypeScript support with strict type checking:

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "jsxImportSource": "./src/MiniReact"
  }
}
```

### Development Workflow

1. **Write Tests First**: Follow TDD approach with comprehensive test coverage
2. **Type Safety**: Use TypeScript for all code with strict type checking
3. **Code Quality**: Run Biome checks before committing
4. **Documentation**: Keep README and code comments updated
5. **Performance**: Profile and optimize critical paths

---

## Contributing

### Development Setup

1. Clone the repository:

```bash
git clone https://github.com/MarcelOlsen/mini-react.git
cd mini-react
```

2. Install dependencies:

```bash
bun install
```

3. Run tests:

```bash
bun test --watch
```

4. Start developing and follow the phase-based approach!

### Contribution Guidelines

- Follow the established phase structure
- Write comprehensive tests for new features
- Maintain TypeScript type safety
- Use consistent code formatting (Biome)
- Document new APIs and patterns
- Focus on educational value and code clarity

### Phase Development Process

1. **Plan**: Review phase specifications and requirements
2. **Test**: Write comprehensive tests for the new functionality
3. **Implement**: Build the feature with focus on clarity and correctness
4. **Validate**: Ensure all tests pass and code quality standards are met
5. **Document**: Update README, API documentation, and examples
6. **Review**: Code review focusing on educational value and best practices

---

## License

MIT License - feel free to use this project for learning and educational purposes.

---

**Happy Coding! 🚀**

_Building React from scratch, one phase at a time._
