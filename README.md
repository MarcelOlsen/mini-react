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
  - [🚀 **ALPHA RELEASE TRACK** (Phases 1-11)](#🚀-alpha-release-track-phases-1-11)
    - [Phase 1: Element Creation & Basic Rendering ✅](#phase-1-element-creation--basic-rendering-)
    - [Phase 2: Functional Components ✅](#phase-2-functional-components-)
    - [Phase 3: Virtual DOM & Basic Reconciliation ✅](#phase-3-virtual-dom--basic-reconciliation-)
    - [Phase 4: Prop Diffing & Efficient Children Reconciliation ✅](#phase-4-prop-diffing--efficient-children-reconciliation-)
    - [Phase 5: State with useState Hook ✅](#phase-5-state-with-usestate-hook)
    - [Phase 6: Event Handling ✅](#phase-6-event-handling)
    - [Phase 7: Effects with useEffect ✅](#phase-7-effects-with-useeffect-)
    - [Phase 8: Context API ✅](#phase-8-context-api-)
    - [Phase 9: Portals and Fragments 🎯](#phase-9-portals-and-fragments)
    - [Phase 10: JSX Support 🎯](#phase-10-jsx-support)
    - [Phase 11: Essential Hooks (useRef & useReducer) 🎯](#phase-11-essential-hooks-useref--usereducer)
    - [🎉 **ALPHA RELEASE v0.1.0** - Complete Core React-like Functionality](#🎉-alpha-release-v010-complete-core-react-like-functionality)
  - [🚀 **STABLE RELEASE TRACK** (Phases 12-20)](#🚀-stable-release-track-phases-12-20)
    - [Phase 12: Performance Optimization Suite](#phase-12-performance-optimization-suite)
    - [Phase 13: Error Boundaries & Resilience](#phase-13-error-boundaries--resilience)
    - [Phase 14: Async Features & Suspense](#phase-14-async-features--suspense)
    - [Phase 15: Concurrent Features (Advanced)](#phase-15-concurrent-features-advanced)
    - [Phase 16: Developer Experience](#phase-16-developer-experience)
    - [Phase 17: Server-Side Rendering](#phase-17-server-side-rendering)
    - [Phase 18: Advanced Component Patterns](#phase-18-advanced-component-patterns)
    - [Phase 19: Testing & Quality Assurance](#phase-19-testing--quality-assurance)
    - [Phase 20: Production Optimizations](#phase-20-production-optimizations)
    - [🎯 **STABLE RELEASE v1.0.0** - Production-Ready React Alternative](#🎯-stable-release-v100-production-ready-react-alternative)
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

🆕 **Current Phase**: Alpha Release Track - Phase 8 ✅ **COMPLETE**

**Latest Achievements**:

- ✅ **Phase 8 Complete**: Context API with createContext and useContext
- ✅ **158 Tests Passing**: Comprehensive test suite covering all functionality
- ✅ **Zero Linter Issues**: Clean codebase with consistent formatting
- ✅ **Complete Hook System**: useState, useEffect, useContext with proper lifecycle management
- ✅ **Advanced Context Management**: Provider components, nested contexts, and value propagation

**Alpha Release Progress**: 8/11 phases complete (73% toward alpha)

**Next Milestones**:

- 🎯 **Phase 9**: Portals and Fragments (2-3 weeks)
- 🎯 **Phase 10**: JSX Support (2-3 weeks)
- 🎯 **Phase 11**: Essential Hooks - useRef & useReducer (1-2 weeks)
- 🎉 **Alpha Release v0.1.0**: Target in 4-6 weeks

**Post-Alpha Roadmap**: 12 additional phases planned for stable v1.0.0 release with advanced features including concurrent rendering, SSR, dev tools, and production optimizations.

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
- **⚡ Effects System**: useEffect hook with dependencies, cleanup, and scheduling
- **🌐 Context API**: createContext and useContext hooks with provider/consumer pattern

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

### 🚀 **ALPHA RELEASE TRACK** (Phases 1-11)

#### Phase 1: Element Creation & Basic Rendering ✅

**Features:**

- ✅ `createElement` to create element objects (host elements only)
- ✅ `render` to convert element objects into real DOM nodes
- ✅ Support for text nodes and nested children
- ✅ Basic props handling and attribute setting

---

#### Phase 2: Functional Components ✅

**Features:**

- ✅ Support for functional components as element types
- ✅ Passing props and children to functional components
- ✅ Components can return other components or host elements
- ✅ Proper handling of null/undefined returns

---

#### Phase 3: Virtual DOM & Basic Reconciliation ✅

**Features:**

- ✅ Virtual DOM (VDOM) tree structure with instances
- ✅ Reconciler algorithm for efficient DOM updates
- ✅ Support for updating props and children
- ✅ Proper cleanup and node reuse

---

#### Phase 4: Prop Diffing & Efficient Children Reconciliation ✅

**Features:**

- ✅ Fine-grained prop diffing (update only changed attributes)
- ✅ Efficient children reconciliation (reuse existing DOM nodes)
- ✅ Support for keyed children (key-based diffing for lists)
- ✅ Minimal DOM operations for performance

---

#### Phase 5: State with useState Hook ✅

**Features:**

- ✅ Implement a basic `useState` hook for functional components
- ✅ Trigger re-renders on state changes
- ✅ Preserve state across renders
- ✅ Component state isolation
- ✅ Support for functional state updates
- ✅ Multiple hooks per component
- ✅ Hook order consistency

---

#### Phase 6: Event Handling ✅

**Features:**

- ✅ Support for event props (e.g., `onClick`) on host elements
- ✅ Event delegation system for efficient event handling
- ✅ Synthetic events with normalized cross-browser behavior
- ✅ Event bubbling and capture phase support
- ✅ Proper event cleanup and memory management
- ✅ Integration with useState hook for stateful interactions

---

#### Phase 7: Effects with useEffect ✅

**Features:**

- ✅ Implement a basic `useEffect` hook
- ✅ Support for cleanup functions and dependency arrays
- ✅ Effect lifecycle management

---

#### Phase 8: Context API ✅

**Features:**

- ✅ Implement a simple context API (`createContext`, `useContext`)
- ✅ Support for context providers and consumers
- ✅ Context value propagation through component trees
- ✅ Nested context providers with proper scoping
- ✅ Multiple contexts support
- ✅ Context value updates and re-rendering
- ✅ Proper context cleanup and memory management

---

#### Phase 9: Portals and Fragments 🎯

**Features (Planned):**

- Support for rendering children into a different part of the DOM (portals)
- Support for fragments (multiple children without extra DOM nodes)
- Portal lifecycle management and cleanup
- Fragment reconciliation optimization

---

#### Phase 10: JSX Support 🎯

**Features (Planned):**

- JSX syntax support for component definitions and element creation
- JSX runtime functions (`jsx`, `jsxs`, `jsxDEV`) for build tool integration
- Fragment support with `<>` and `</Fragment>` syntax
- TypeScript JSX declarations for full type safety
- Build tool configuration (TypeScript/Babel integration)
- Development mode enhancements with source maps and debugging
- Backward compatibility with existing `createElement` API

---

#### Phase 11: Essential Hooks (useRef & useReducer) 🎯

**Features (Planned):**

- **useRef**: DOM references and mutable values that persist across renders
- **useReducer**: Complex state management with dispatch patterns
- Ref forwarding for component composition
- Reducer pattern integration with reconciliation
- Performance optimizations for ref updates

---

### 🎉 **ALPHA RELEASE v0.1.0** - Complete Core React-like Functionality

**Target Features for Alpha:**

- ✅ Full Virtual DOM with reconciliation
- ✅ Complete hook system (useState, useEffect, useContext, useRef, useReducer)
- ✅ Event handling and lifecycle management
- ✅ JSX support with build tool integration
- ✅ Portals and fragments
- ✅ Production-ready for basic applications

---

### 🚀 **STABLE RELEASE TRACK** (Phases 12-20)

#### Phase 12: Performance Optimization Suite

**Features (Planned):**

- **React.memo equivalent** - Component memoization with shallow comparison
- **Batched updates** - Multiple state updates in a single render cycle
- **useMemo** - Expensive computation memoization
- **useCallback** - Function memoization for performance optimization
- **Performance profiler** - Component render time analysis and optimization insights

---

#### Phase 13: Error Boundaries & Resilience

**Features (Planned):**

- **Error boundaries** - Catch and handle component errors gracefully
- **Error recovery** - Retry mechanisms and fallback UI
- **Development warnings** - Helpful error messages and debugging info
- **Error logging** - Structured error reporting and analytics
- **Graceful degradation** - Fallback rendering for failed components

---

#### Phase 14: Async Features & Suspense

**Features (Planned):**

- **Suspense** - Declarative loading states for async components
- **Lazy loading** - Dynamic component imports with code splitting
- **Resource preloading** - Intelligent data fetching coordination
- **Async component boundaries** - Error handling for async operations
- **Loading state management** - Coordinated loading indicators

---

#### Phase 15: Concurrent Features

**Features (Planned):**

- **Fiber-like architecture** - Incremental rendering with interruption support
- **Time slicing** - Breaking work into chunks to avoid blocking the main thread
- **Priority-based scheduling** - High/low priority updates (similar to React's concurrent features)
- **Concurrent rendering** - Non-blocking updates
- **Transitions** - Mark updates as non-urgent
- **Background updates** - Lower priority rendering for better UX

---

#### Phase 16: Developer Experience

**Features (Planned):**

- **DevTools integration** - Browser extension for component inspection
- **Hot module replacement** - Live editing without losing state
- **Source maps** - Better debugging with original source locations
- **Component profiler** - Performance analysis and optimization suggestions
- **Debug mode** - Enhanced development warnings and error messages

---

#### Phase 17: Server-Side Rendering

**Features (Planned):**

- **SSR support** - Render components to HTML strings
- **Hydration** - Attach event listeners to server-rendered HTML
- **Streaming SSR** - Server-side rendering with partial hydration
- **Isomorphic components** - Components that work on both client and server
- **SEO optimization** - Meta tag management and structured data

---

#### Phase 18: Advanced Component Patterns

**Features (Planned):**

- **Higher-Order Components (HOCs)** - Component composition patterns
- **Render props** - Function-as-children pattern
- **Compound components** - Components that work together (like `<Select>` + `<Option>`)
- **Component inheritance** - Class-based component support
- **Advanced prop patterns** - Prop drilling solutions and advanced prop handling

---

#### Phase 19: Testing & Quality Assurance

**Features (Planned):**

- **Testing utilities** - Component testing helpers and utilities
- **Test renderer** - Headless rendering for unit tests
- **Snapshot testing** - Component output verification
- **Performance testing** - Automated performance regression detection
- **Accessibility testing** - Built-in a11y validation and warnings

---

#### Phase 20: Production Optimizations

**Features (Planned):**

- **Bundle optimization** - Tree shaking and dead code elimination
- **Runtime optimizations** - Memory usage optimization and garbage collection
- **Production builds** - Minified and optimized production bundles
- **CDN support** - Easy integration with content delivery networks
- **Analytics integration** - Performance monitoring and usage analytics

---

### 🎯 **STABLE RELEASE v1.0.0** - Production-Ready React Alternative

**Target Features for Stable:**

- 🎯 Complete React feature parity
- 🎯 Advanced performance optimizations
- 🎯 Full developer tooling ecosystem
- 🎯 Server-side rendering capabilities
- 🎯 Robust error handling and monitoring
- 🎯 Comprehensive testing and quality assurance tools

---

## Release Timeline

### **Immediate Focus**

- 🎯 **Phase 9**: Portals and Fragments
- 🎯 **Phase 10**: JSX Support
- 🎯 **Phase 11**: Essential Hooks (useRef & useReducer)

### **Alpha Release**

- 🎉 **v0.1.0-alpha** - Core functionality complete
- 📦 NPM package publication
- 📚 Basic documentation and examples
- 🧪 Community testing and feedback

### **Stable Release**

- 🎯 **v1.0.0** - Production-ready with advanced features
- 📖 Comprehensive documentation
- 🌍 Full ecosystem support

---

## Why This Approach?

### **Alpha Benefits:**

- **Fast time-to-market** - Core React functionality in weeks, not months
- **Incremental development** - Build confidence before advanced features
- **Practical validation** - Test reconciliation and hook systems under real load

### **Stable Benefits:**

- **Feature completeness** - All modern React capabilities
- **Performance leadership** - Advanced optimizations beyond React
- **Developer experience** - Best-in-class tooling and debugging
- **Production readiness** - Robust error handling and monitoring

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

**Comprehensive Test Suite: Unit and integration tests across 8 files**

### Test Categories:

- **Unit Tests**: Individual function testing (createElement, render)
- **Integration Tests**: Full rendering pipeline testing
- **Reconciliation Tests**: Virtual DOM diffing and updates
- **Event Tests**: Event handling, delegation, and synthetic events
- **Hook Tests**: useState, useEffect, and useContext functionality
- **Context Tests**: Full context API with providers and consumers
- **Performance Tests**: Large lists and memory pressure scenarios
- **Edge Case Tests**: Error handling and boundary conditions

### Running Tests:

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
