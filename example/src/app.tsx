import {
	type MiniReactContext,
	type MutableRefObject,
	type SyntheticEvent,
	createContext,
	createPortal,
	memo,
	render,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "../../src/MiniReact";
import type { PortalElement } from "../../src/portals/types";

// =============================================================================
// Type Definitions
// =============================================================================

interface Todo {
	id: number;
	text: string;
	completed: boolean;
}

interface ThemeContextType {
	theme: "light" | "dark";
	toggleTheme: () => void;
}

// =============================================================================
// Context
// =============================================================================

const ThemeContext: MiniReactContext<ThemeContextType> =
	createContext<ThemeContextType>({
		theme: "light",
		toggleTheme: () => {},
	});

// =============================================================================
// Components
// =============================================================================

/**
 * Counter Component - Demonstrates useState
 */
const Counter = () => {
	const [count, setCount] = useState<number>(0);

	return (
		<div className="card">
			<h2>Counter - useState Demo</h2>
			<div className="counter">{count}</div>
			<button type="button" onClick={() => setCount(count + 1)}>
				Increment
			</button>
			<button type="button" onClick={() => setCount(count - 1)}>
				Decrement
			</button>
			<button type="button" className="secondary" onClick={() => setCount(0)}>
				Reset
			</button>
		</div>
	);
};

/**
 * Todo List Component - Demonstrates useState with complex state
 */
const TodoList = () => {
	const [todos, setTodos] = useState<Todo[]>([]);
	const [input, setInput] = useState<string>("");
	const inputRef = useRef<HTMLInputElement | null>(
		null,
	) as MutableRefObject<HTMLInputElement | null>;

	const addTodo = () => {
		if (input.trim()) {
			setTodos([...todos, { id: Date.now(), text: input, completed: false }]);
			setInput("");
			inputRef.current?.focus();
		}
	};

	const toggleTodo = (id: number) => {
		setTodos(
			todos.map((todo) =>
				todo.id === id ? { ...todo, completed: !todo.completed } : todo,
			),
		);
	};

	const deleteTodo = (id: number) => {
		setTodos(todos.filter((todo) => todo.id !== id));
	};

	return (
		<div className="card">
			<h2>Todo List - Complex State Demo</h2>
			<input
				ref={inputRef}
				type="text"
				value={input}
				// @ts-expect-error - MiniReact SyntheticEvent differs from React event handler types but works correctly
				onInput={(e: SyntheticEvent<HTMLInputElement>) =>
					setInput((e.target as HTMLInputElement).value)
				}
				// @ts-expect-error - MiniReact SyntheticEvent differs from React event handler types but works correctly
				onKeyDown={(e: SyntheticEvent<HTMLInputElement>) => {
					if ((e.nativeEvent as KeyboardEvent).key === "Enter") addTodo();
				}}
				placeholder="Add a new todo..."
			/>
			<button type="button" onClick={addTodo}>
				Add Todo
			</button>

			<div>
				{todos.map((todo) => (
					<div
						key={todo.id}
						className={`todo-item ${todo.completed ? "completed" : ""}`}
					>
						<input
							type="checkbox"
							checked={todo.completed}
							onChange={() => toggleTodo(todo.id)}
						/>
						<span>{todo.text}</span>
						<button
							type="button"
							className="danger"
							onClick={() => deleteTodo(todo.id)}
						>
							Delete
						</button>
					</div>
				))}
			</div>
		</div>
	);
};

/**
 * Effect Demo Component - Demonstrates useEffect
 */
const EffectDemo = () => {
	const [seconds, setSeconds] = useState<number>(0);
	const [isRunning, setIsRunning] = useState<boolean>(false);

	useEffect(() => {
		if (!isRunning) return;

		const interval = setInterval(() => {
			setSeconds((s) => s + 1);
		}, 1000);

		return () => clearInterval(interval);
	}, [isRunning]);

	return (
		<div className="card">
			<h2>Timer - useEffect Demo</h2>
			<div className="counter">{seconds}s</div>
			<button type="button" onClick={() => setIsRunning(!isRunning)}>
				{isRunning ? "Pause" : "Start"}
			</button>
			<button type="button" className="secondary" onClick={() => setSeconds(0)}>
				Reset
			</button>
		</div>
	);
};

/**
 * Portal Demo Component - Demonstrates createPortal
 */
const PortalDemo = () => {
	const [showPortal, setShowPortal] = useState<boolean>(false);
	const portalTarget = document.getElementById("portal-root");

	const portalContent: PortalElement | false | null = (showPortal &&
		portalTarget &&
		createPortal(
			<div className="portal-target">
				<h3>I'm in a Portal!</h3>
				<p>Rendered outside the main DOM tree.</p>
				<button type="button" onClick={() => setShowPortal(false)}>
					Close
				</button>
			</div>,
			portalTarget,
		)) as PortalElement | false;

	return (
		<div className="card">
			<h2>Portal - Event Bubbling Demo</h2>
			<p>
				Portals render content outside the DOM hierarchy but events still bubble
				through the React tree.
			</p>
			<button type="button" onClick={() => setShowPortal(!showPortal)}>
				{showPortal ? "Hide" : "Show"} Portal
			</button>
			{portalContent as unknown as JSX.Element}
		</div>
	);
};

/**
 * Memoized Component - Demonstrates memo
 */
interface ExpensiveComponentProps {
	count: number;
}

// @ts-expect-error - MiniReact FunctionalComponent type differs slightly from React but works correctly
const ExpensiveComponent = memo<ExpensiveComponentProps>(({ count }) => {
	console.log("ExpensiveComponent rendered");
	return (
		<div className="card">
			<h2>Memoization - memo Demo</h2>
			<p>This component only re-renders when count changes.</p>
			<div className="counter">{count}</div>
		</div>
	);
});

/**
 * Memo Demo Container
 */
const MemoDemo = () => {
	const [count, setCount] = useState<number>(0);
	const [unrelated, setUnrelated] = useState<number>(0);

	return (
		<div>
			{/* @ts-expect-error - MiniReact FunctionalComponent type differs from React types but works correctly */}
			<ExpensiveComponent count={count} />
			<div className="card">
				<button type="button" onClick={() => setCount(count + 1)}>
					Increment Count (causes re-render)
				</button>
				<button
					type="button"
					className="secondary"
					onClick={() => setUnrelated(unrelated + 1)}
				>
					Increment Unrelated (no re-render)
				</button>
			</div>
		</div>
	);
};

/**
 * Callback Demo - Demonstrates useCallback
 */
const CallbackDemo = () => {
	const [count, setCount] = useState<number>(0);
	const [other, setOther] = useState<number>(0);

	// This callback is memoized and only recreated when count changes
	const increment = useCallback(() => {
		setCount((c) => c + 1);
	}, []);

	return (
		<div className="card">
			<h2>useCallback & useMemo Demo</h2>
			<p>Count: {count}</p>
			<p>Other: {other}</p>
			<button type="button" onClick={increment}>
				Increment Count
			</button>
			<button
				type="button"
				className="secondary"
				onClick={() => setOther(other + 1)}
			>
				Increment Other
			</button>
		</div>
	);
};

/**
 * Theme Toggle Component - Demonstrates useContext
 */
const ThemeToggle = () => {
	const { theme, toggleTheme } = useContext(ThemeContext);

	return (
		<div className="card">
			<h2>Theme - useContext Demo</h2>
			<p>Current theme: {theme}</p>
			<button type="button" onClick={toggleTheme}>
				Toggle Theme
			</button>
		</div>
	);
};

/**
 * Main App Component
 */
const App = () => {
	const [theme, setTheme] = useState<"light" | "dark">("light");

	const themeValue: ThemeContextType = useMemo(
		() => ({
			theme,
			toggleTheme: () => setTheme(theme === "light" ? "dark" : "light"),
		}),
		[theme],
	);

	useEffect(() => {
		document.body.className = theme === "dark" ? "theme-dark" : "";
	}, [theme]);

	return (
		// @ts-expect-error - MiniReact Context.Provider type differs from React types but works correctly
		<ThemeContext.Provider value={themeValue}>
			<div className="header">
				<h1>⚛️ MiniReact Showcase</h1>
				<p>A fully-featured React clone with Fiber architecture</p>
			</div>

			<Counter />
			<TodoList />
			<EffectDemo />
			<PortalDemo />
			<MemoDemo />
			<CallbackDemo />
			<ThemeToggle />
		</ThemeContext.Provider>
	);
};

// =============================================================================
// Render
// =============================================================================

const rootElement = document.getElementById("root");
if (rootElement) {
	// @ts-expect-error - JSX runtime path configuration issue with TypeScript but works correctly at runtime
	render(<App />, rootElement);
} else {
	console.error("Root element not found");
}
