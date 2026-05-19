# MiniReact

A minimal React-like UI library built from scratch to understand how the virtual DOM, reconciliation, and hooks actually work.

## Overview

This is a learning project, not a production framework. It implements the core ideas behind React—functional components, a virtual DOM, a reconciliation engine, hooks (useState, useEffect, useReducer, useRef, useMemo, useCallback), and the Context API—without the complexity of the real thing. The goal is to write code that is small enough to read in one sitting, but complete enough to actually build UIs with.

## Quick Start

Requires [Bun](https://bun.sh).

```bash
git clone https://github.com/MarcelOlsen/mini-react.git
cd mini-react
bun install
bun test
```

### Usage

```typescript
import { createElement, render, useState } from "@marcelolsen/mini-react";

const Counter = () => {
  const [count, setCount] = useState(0);

  return createElement(
    "button",
    { onClick: () => setCount(count + 1) },
    `Count: ${count}`
  );
};

render(createElement(Counter), document.getElementById("root")!);
```

### JSX

Configure your build tool to use the MiniReact JSX runtime:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@marcelolsen/mini-react"
  }
}
```

Then write components normally:

```tsx
const App = () => {
  return (
    <div>
      <h1>Hello</h1>
      <Counter />
    </div>
  );
};
```

## What's Implemented

- **Virtual DOM & Reconciliation**: Diff and patch the DOM efficiently.
- **Functional Components**: Props, children, and composition.
- **Hooks**: useState, useEffect, useReducer, useRef, useMemo, useCallback.
- **Context API**: createContext / useContext for passing data through the tree.
- **Portals**: Render children into a different DOM container while keeping the React tree structure.
- **Fragments**: Group children without wrapper nodes.
- **JSX Runtime**: Production and development JSX transforms (jsx, jsxs, jsxDEV).
- **Events**: Standard DOM events attached directly to nodes.
- **Performance**: Basic memoization via `memo`, `useMemo`, and `useCallback`.

## Project Structure

```
src/
├── MiniReact.ts          # Main exports and JSX runtime
├── types.ts              # TypeScript definitions
├── vdom.ts               # Virtual DOM creation
├── reconciler.ts         # Reconciliation / diffing engine
├── hooks.ts              # Hook implementations
├── context.ts            # Context API
├── portals.ts            # Portals
├── events.ts             # Event system
└── jsx/
    ├── jsx-runtime.ts
    └── jsx-dev-runtime.ts
```

## Development Phases

This project is built in incremental phases. Each phase has a clear goal, an implementation, and tests.

### Alpha Track (Done)

1. **Element Creation & Basic Rendering**
2. **Functional Components**
3. **Virtual DOM & Reconciliation**
4. **Prop Diffing & Children Reconciliation**
5. **State with useState**
6. **Event Handling**
7. **Effects with useEffect**
8. **Context API**
9. **Portals and Fragments**
10. **JSX Support**
11. **useRef & useReducer**

### Stable Track (In Progress)

12. **Performance Optimization Suite** — memo, useMemo, useCallback
13. **Error Boundaries & Resilience**
14. **Async Features & Suspense**
15. **Concurrent Features**
16. **Developer Experience**
17. **Server-Side Rendering**
18. **Advanced Component Patterns**
19. **Testing & Quality Assurance**
20. **Production Optimizations**

## API

### `createElement(type, props, ...children)`

Creates a virtual DOM element.

```typescript
const el = createElement("div", { id: "app" }, "Hello");
```

### `render(element, container)`

Renders a virtual element into a real DOM container.

```typescript
render(createElement(App), document.getElementById("root")!);
```

### `useState(initialValue)`

Returns a state tuple `[value, setValue]`.

```typescript
const [count, setCount] = useState(0);
```

### `useEffect(effect, deps?)`

Runs side effects after render. Return a cleanup function if needed.

```typescript
useEffect(() => {
  const id = setInterval(() => setTime(t => t + 1), 1000);
  return () => clearInterval(id);
}, []);
```

### `useReducer(reducer, initialState)`

State management with a reducer function.

```typescript
const [state, dispatch] = useReducer(counterReducer, { count: 0 });
```

### `useRef(initialValue)`

Mutable reference that persists across renders without causing re-renders.

```typescript
const inputRef = useRef<HTMLInputElement>(null);
```

### `useMemo(factory, deps)` / `useCallback(fn, deps)`

Memoize expensive computations and stable function references.

### `createContext(defaultValue)` / `useContext(context)`

Create and consume context to avoid prop drilling.

```typescript
const ThemeContext = createContext("light");
const theme = useContext(ThemeContext);
```

### `createPortal(children, container)`

Render children into a different DOM node.

```typescript
createPortal(createElement(Modal), document.getElementById("modal-root")!);
```

### `Fragment`

Group multiple elements without adding a wrapper to the DOM.

```typescript
createElement(Fragment, null, child1, child2);
```

## Testing

Tests run with Bun and use happy-dom for DOM simulation.

```bash
bun test              # run all tests
bun test --watch      # watch mode
bun test --coverage   # with coverage
```

## Code Quality

Linting and formatting with Biome:

```bash
bunx biome check
bunx biome check --apply
```

## License

MIT

---

*Built to learn. Read the code, break it, fix it, understand it.*
