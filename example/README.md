# MiniReact Showcase

A comprehensive showcase application demonstrating all features of the MiniReact library, served with ElysiaJS.

## Features Demonstrated

### Core Features
- ✅ **JSX/TSX Support** - Full JSX syntax with TypeScript
- ✅ **Component Rendering** - Functional components with props
- ✅ **Event Handling** - Delegated event system with synthetic events

### Hooks
- ✅ **useState** - State management in functional components
- ✅ **useEffect** - Side effects with cleanup
- ✅ **useContext** - Context API for global state
- ✅ **useRef** - DOM references and mutable values
- ✅ **useCallback** - Memoized callbacks
- ✅ **useMemo** - Memoized values
- ✅ **memo** - Component memoization

### Advanced Features
- ✅ **Portals** - Render outside parent DOM tree
- ✅ **Context API** - Global state management
- ✅ **Event Bubbling** - Events bubble through React tree (even in portals)
- ✅ **Key-based Reconciliation** - Efficient list updates

## Getting Started

### Install Dependencies

```bash
cd example
bun install
```

### Development

Run the development server with hot reload:

```bash
bun run dev
```

The app will be available at `http://localhost:3000`

### Build

Build the client bundle:

```bash
bun run build
```

### Production

Run the production server:

```bash
bun start
```

## Architecture

### Tech Stack
- **Server**: ElysiaJS (fast, type-safe web framework)
- **Client**: MiniReact (React clone with Fiber architecture)
- **Runtime**: Bun (fast JavaScript runtime)
- **Language**: TypeScript (fully type-safe)

### Type Safety

The entire application is fully type-safe:
- All components have proper TypeScript types
- Props are strictly typed
- Event handlers use correct event types
- Context values are type-safe
- No `any` types used

### Components

#### Counter
Demonstrates `useState` with a simple counter that can increment, decrement, and reset.

#### Todo List
Shows complex state management with an array of todos. Each todo can be:
- Added with keyboard (Enter) or button
- Toggled as completed
- Deleted
Demonstrates `useState` with objects and `useRef` for DOM access.

#### Timer
Uses `useEffect` to create a timer that:
- Starts/pauses on button click
- Cleans up interval on pause
- Can be reset to zero

#### Portal
Demonstrates `createPortal` by rendering a notification outside the main DOM tree.
Events still bubble through the React tree, not the DOM tree.

#### Memoization
Shows `memo` HOC that prevents unnecessary re-renders when props haven't changed.

#### Callback Demo
Demonstrates `useCallback` to memoize callbacks and prevent function recreation.

#### Theme Toggle
Uses `useContext` to provide a global theme that can be toggled between light and dark mode.

## File Structure

```
example/
├── src/
│   ├── server.ts          # ElysiaJS server
│   └── app.tsx            # Main application
├── public/
│   └── app.js            # Built client bundle
├── package.json
├── tsconfig.json
└── README.md
```

## Key Implementation Details

### Type-Safe Context

```typescript
interface ThemeContextType {
  theme: "light" | "dark";
  toggleTheme: () => void;
}

const ThemeContext: MiniReactContext<ThemeContextType> =
  createContext<ThemeContextType>({
    theme: "light",
    toggleTheme: () => {},
  });
```

### Type-Safe Events

```typescript
onInput={(e: Event) => setInput((e.target as HTMLInputElement).value)}
onKeyDown={(e: KeyboardEvent) => {
  if (e.key === "Enter") addTodo();
}}
```

### Type-Safe Refs

```typescript
const inputRef = useRef<HTMLInputElement | null>(null) as
  MutableRefObject<HTMLInputElement | null>;

// Later:
inputRef.current?.focus();
```

## Performance

The application demonstrates MiniReact's performance features:
- **Fiber Architecture**: Incremental rendering foundation
- **Key-based Reconciliation**: Efficient list updates
- **Event Delegation**: One listener per event type
- **Memoization**: Prevent unnecessary re-renders
- **Effect Cleanup**: Proper resource management

## Browser Support

Modern browsers with ES2020+ support required:
- Chrome 80+
- Firefox 72+
- Safari 13.1+
- Edge 80+

## License

MIT
