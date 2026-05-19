# Tutorial 8: Context — Passing Data Without Props

## The Props Drilling Problem

Passing data through multiple component layers:

```typescript
// Without Context — every level needs to pass the prop
function App() {
  const theme = "dark";
  return <Layout theme={theme} />;
}

function Layout({ theme }) {
  return <Sidebar theme={theme} />;
}

function Sidebar({ theme }) {
  return <Button theme={theme} />;
}

function Button({ theme }) {
  // Finally uses theme
  return <button className={theme}>Click</button>;
}
```

Every intermediate component becomes a "pass-through" that doesn't use the prop.

## Context API

Context provides a way to pass data through the component tree **without** passing props manually at every level:

```typescript
// 1. Create a context
const ThemeContext = createContext("light");

// 2. Provide a value at the top
function App() {
  return (
    <ThemeContext.Provider value="dark">
      <Layout />  {/* No theme prop needed */}
    </ThemeContext.Provider>
  );
}

// 3. Consume anywhere in the tree
function Button() {
  const theme = useContext(ThemeContext); // "dark"
  return <button className={theme}>Click</button>;
}
```

## How Context Works in MiniReact

### Creating a Context

```typescript
function createContext(defaultValue) {
  const context = {
    $$typeof: REACT_CONTEXT_TYPE,
    _currentValue: defaultValue,
    _currentValue2: defaultValue,
    Provider: null,
    Consumer: null,
  };
  
  context.Provider = {
    $$typeof: REACT_PROVIDER_TYPE,
    _context: context,
  };
  
  return context;
}
```

A context is an object with a `_currentValue` and a `Provider` component.

### Context Provider Fiber

When you render `<Context.Provider value={value}>`, it creates a fiber with `tag = ContextProvider`:

```typescript
// Fiber for Context.Provider
{
  tag: WorkTag.ContextProvider,
  type: context.Provider,
  memoizedState: {
    value: "dark",
    // ...
  },
  // ...
}
```

### The `dependencies` Field

Fibers that use a context (`useContext`) store a **linked list** of context dependencies:

```typescript
type Dependencies = {
  firstContext: ContextDependency | null;
  lanes: Lanes;
};

type ContextDependency = {
  context: MiniReactContext;
  memoizedValue: any;
  next: ContextDependency | null;
};
```

### useContext

```typescript
function useContextFiber(context) {
  // Read current value from context
  let value = context._currentValue;
  
  // Track this context as a dependency
  const dependency = {
    context,
    memoizedValue: value,
    next: null,
  };
  
  // Add to fiber's dependencies
  const dependencies = currentlyRenderingFiber.dependencies;
  if (dependencies === null) {
    currentlyRenderingFiber.dependencies = {
      firstContext: dependency,
      lanes: NoLanes,
    };
  } else {
    // Append to linked list
    let lastContext = dependencies.firstContext;
    while (lastContext.next !== null) {
      lastContext = lastContext.next;
    }
    lastContext.next = dependency;
  }
  
  return value;
}
```

## Context Value Stack

Context values are maintained on a **stack** during rendering:

```
Rendering:
  <ThemeContext.Provider value="dark">
    <UserContext.Provider value={user}>
      <Button />  ← uses both ThemeContext and UserContext
    </UserContext.Provider>
  </ThemeContext.Provider>

Stack during Button render:
  ThemeContext._currentValue = "dark"     (pushed by Theme Provider)
  UserContext._currentValue = user      (pushed by User Provider)
  
Stack after render:
  ThemeContext._currentValue = undefined    (popped)
  UserContext._currentValue = undefined     (popped)
```

This **push/pop** mechanism ensures nested contexts work correctly.

## When Context Changes

When a Provider's value changes:

```typescript
function ContextProviderComponent({ value, children }) {
  // During render, this fiber's memoizedState has the new value
  // The old value is on the alternate (current) fiber
  
  // If value !== old value:
  // 1. Mark all consumers as needing update
  // 2. Bubble this lane up to the provider's parent
}
```

The commit phase checks:
- Did any context change?
- For each context consumer, was the context in its dependency list updated?
- If yes, schedule re-render of the consumer

## Multiple Contexts

A component can depend on multiple contexts:

```typescript
function Settings() {
  const theme = useContext(ThemeContext);
  const user = useContext(UserContext);
  const locale = useContext(LocaleContext);
  // ...
}
```

Each context is tracked in the `dependencies` linked list:
```
Fiber.dependencies
├── firstContext: { context: ThemeContext, memoizedValue: "dark", next: }
│                             └── { context: UserContext, memoizedValue: user, next: }
│                                           └── { context: LocaleContext, memoizedValue: "en", next: null }
└── lanes: NoLanes
```

## Context in Fiber Architecture

Context providers are handled during `beginWork`:

```typescript
function updateContextProvider(current, workInProgress, renderLanes) {
  const contextType = workInProgress.type;
  const context = contextType._context;
  const newValue = workInProgress.pendingProps.value;
  
  // Push new value onto stack
  pushProvider(context, newValue);
  
  // Diff children
  const children = workInProgress.pendingProps.children;
  reconcileChildren(current, workInProgress, children);
  
  return workInProgress.child;
}

function popProvider(context) {
  // Pop value from stack (restores previous value)
  context._currentValue = context._stack.pop();
}
```

## Exercise

Create a context that provides a counter's increment function:

```typescript
const CounterContext = createContext({ count: 0, increment: () => {} });

function CounterProvider({ children }) {
  const [count, setCount] = useState(0);
  const increment = useCallback(() => setCount(c => c + 1), []);
  
  const value = useMemo(() => ({ count, increment }), [count, increment]);
  
  return (
    <CounterContext.Provider value={value}>
      {children}
    </CounterContext.Provider>
  );
}

function DeeplyNestedButton() {
  // This works even if there are 10 components between
  const { increment } = useContext(CounterContext);
  return <button onClick={increment}>+</button>;
}
```

## Key Takeaways

1. **Context avoids prop drilling** — pass data through intermediate layers
2. **Context providers** push values onto a stack during render
3. **`useContext`** reads current value and records a dependency
4. **When context changes**, consumers are automatically re-rendered
5. **Contexts can be nested** — push/pop stack maintains correct values
6. **Fiber tracks dependencies** in a linked list on `fiber.dependencies`

## Pitfalls

1. **Too many contexts** can make debugging harder
2. **Deep context paths** can cause excessive re-renders
3. **Always memoize context values** — otherwise, `useMemo`/`useCallback` in consumers won't work

## Next Steps

- Tutorial 9: Portals and Fragments
- Tutorial 10: Error Boundaries
