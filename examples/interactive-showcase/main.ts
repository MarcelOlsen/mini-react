import {
	Fragment,
	createContext,
	createElement,
	createPortal,
	render,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useReducer,
	useRef,
	useState,
} from "../../index";
import type { AnyMiniReactElement } from "../../src/core/types";

// ============================================================
// THEME CONTEXT
// ============================================================
const ThemeContext = createContext("light");

// ============================================================
// SPEC-SHEET CARD COMPONENT
// ============================================================
const SpecCard = ({
	label,
	children,
	code,
}: {
	label: string;
	children: AnyMiniReactElement;
	code?: string;
}) => {
	return createElement(
		"section",
		{ className: "spec-card" },
		createElement(
			"header",
			{ className: "spec-header" },
			createElement("span", { className: "spec-label" }, label),
			code && createElement("code", { className: "spec-code" }, code),
		),
		createElement("div", { className: "spec-body" }, children),
	);
};

// ============================================================
// 1. STATE & RENDERING DEMO
// ============================================================
const StateDemo = () => {
	const [count, setCount] = useState(0);
	const [history, setHistory] = useState<number[]>([]);

	const increment = useCallback(() => {
		setCount((c) => c + 1);
		setHistory((h) => [...h.slice(-4), count + 1]);
	}, [count]);

	const decrement = useCallback(() => {
		setCount((c) => Math.max(0, c - 1));
	}, []);

	return createElement(
		SpecCard,
		{ label: "useState", code: "const [count, setCount] = useState(0)" },
		createElement(
			"div",
			{ className: "counter-display" },
			createElement(
				"button",
				{ className: "btn-control", onClick: decrement },
				"-",
			),
			createElement("span", { className: "counter-value" }, String(count)),
			createElement(
				"button",
				{ className: "btn-control", onClick: increment },
				"+",
			),
		),
		createElement(
			"div",
			{ className: "history-strip" },
			history.length === 0
				? createElement(
						"span",
						{ className: "history-empty" },
						"History appears here",
					)
				: createElement(
						Fragment,
						null,
						...history.map((n, i) =>
							createElement(
								"span",
								{ key: i, className: "history-chip" },
								String(n),
							),
						),
					),
		),
	);
};

// ============================================================
// 2. EFFECTS & REF DEMO
// ============================================================
const EffectsDemo = () => {
	const [ticks, setTicks] = useState(0);
	const [running, setRunning] = useState(false);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const displayRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (running) {
			intervalRef.current = setInterval(() => setTicks((t) => t + 1), 1000);
		}
		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
		};
	}, [running]);

	useEffect(() => {
		if (displayRef.current) {
			displayRef.current.style.transform = "scale(1.02)";
			requestAnimationFrame(() => {
				if (displayRef.current) displayRef.current.style.transform = "scale(1)";
			});
		}
	}, [ticks]);

	return createElement(
		SpecCard,
		{
			label: "useEffect + useRef",
			code: "useEffect(() => { ... }, [running])",
		},
		createElement(
			"div",
			{ className: "timer-display", ref: displayRef },
			createElement(
				"span",
				{ className: "timer-value" },
				String(ticks).padStart(3, "0"),
			),
			createElement("span", { className: "timer-unit" }, "s"),
		),
		createElement(
			"div",
			{ className: "timer-controls" },
			createElement(
				"button",
				{
					className: running ? "btn-toggle active" : "btn-toggle",
					onClick: () => setRunning(!running),
				},
				running ? "Stop" : "Start",
			),
			createElement(
				"button",
				{
					className: "btn-ghost",
					onClick: () => {
						setRunning(false);
						setTicks(0);
					},
				},
				"Reset",
			),
		),
	);
};

// ============================================================
// 3. MEMO & CALLBACK DEMO
// ============================================================
const MemoDemo = () => {
	const [items, setItems] = useState(["Alpha", "Beta", "Gamma"]);
	const [query, setQuery] = useState("");
	const rendersRef = useRef(0);
	rendersRef.current += 1;

	const filtered = useMemo(() => {
		return items.filter((i) => i.toLowerCase().includes(query.toLowerCase()));
	}, [items, query]);

	const addItem = useCallback(() => {
		const next =
			String.fromCharCode(65 + items.length) +
			String.fromCharCode(97 + Math.floor(Math.random() * 26));
		setItems([...items, next]);
	}, [items]);

	return createElement(
		SpecCard,
		{
			label: "useMemo + useCallback",
			code: "const filtered = useMemo(() => ..., [items, query])",
		},
		createElement(
			"div",
			{ className: "memo-toolbar" },
			createElement("input", {
				className: "memo-input",
				value: query,
				placeholder: "Filter items...",
				onInput: (e: Event) => setQuery((e.target as HTMLInputElement).value),
			}),
			createElement(
				"button",
				{ className: "btn-ghost", onClick: addItem },
				"Add Item",
			),
		),
		createElement(
			"ul",
			{ className: "memo-list" },
			...filtered.map((item) =>
				createElement("li", { key: item, className: "memo-item" }, item),
			),
		),
		createElement(
			"div",
			{ className: "memo-meta" },
			`Component renders: ${rendersRef.current} · Filtered: ${filtered.length}/${items.length}`,
		),
	);
};

// ============================================================
// 4. CONTEXT DEMO
// ============================================================
const ThemeIndicator = () => {
	const theme = useContext(ThemeContext);
	return createElement(
		"span",
		{ className: `theme-badge theme-${theme}` },
		theme,
	);
};

const ContextDemo = () => {
	const [theme, setTheme] = useState("light");

	return createElement(
		SpecCard,
		{
			label: "createContext + useContext",
			code: 'const ThemeContext = createContext("light")',
		},
		createElement(
			ThemeContext.Provider,
			{ value: theme },
			createElement(
				"div",
				{ className: "context-bar" },
				createElement("span", { className: "context-label" }, "Active theme:"),
				createElement(ThemeIndicator, null),
			),
		),
		createElement(
			"div",
			{ className: "context-toggle-group" },
			...["light", "dark", "paper"].map((t) =>
				createElement(
					"button",
					{
						key: t,
						className: theme === t ? "btn-chip active" : "btn-chip",
						onClick: () => setTheme(t),
					},
					t,
				),
			),
		),
	);
};

// ============================================================
// 5. PORTAL DEMO
// ============================================================
const PortalDemo = () => {
	const [open, setOpen] = useState(false);
	const portalRoot = document.getElementById("portal-target");

	return createElement(
		SpecCard,
		{ label: "createPortal", code: "createPortal(children, portalRoot)" },
		createElement(
			"div",
			{ className: "portal-demo" },
			createElement(
				"button",
				{
					className: open ? "btn-toggle active" : "btn-toggle",
					onClick: () => setOpen(!open),
				},
				open ? "Close Portal" : "Open Portal",
			),
			portalRoot &&
				open &&
				createPortal(
					createElement(
						"div",
						{ className: "portal-panel" },
						createElement(
							"h4",
							{ className: "portal-title" },
							"Portal Content",
						),
						createElement(
							"p",
							{ className: "portal-desc" },
							"This DOM node is rendered outside the normal tree — inspect the page to see it inside #portal-target.",
						),
						createElement(
							"button",
							{
								className: "btn-ghost",
								onClick: () => setOpen(false),
							},
							"Dismiss",
						),
					),
					portalRoot,
				),
		),
	);
};

// ============================================================
// 6. FRAGMENT DEMO
// ============================================================
const FragmentDemo = () => {
	const [columns, setColumns] = useState(2);

	const cells = useMemo(() => {
		return Array.from({ length: columns * 3 }, (_, i) => ({
			id: i,
			label: `Cell ${String(i + 1).padStart(2, "0")}`,
			status: i % 2 === 0 ? "active" : "idle",
		}));
	}, [columns]);

	return createElement(
		SpecCard,
		{ label: "Fragment", code: "<> ... </>  (no wrapper DOM)" },
		createElement(
			"div",
			{ className: "fragment-toolbar" },
			createElement("span", { className: "context-label" }, "Columns:"),
			...[1, 2, 3, 4].map((n) =>
				createElement(
					"button",
					{
						key: n,
						className: columns === n ? "btn-chip active" : "btn-chip",
						onClick: () => setColumns(n),
					},
					String(n),
				),
			),
		),
		createElement(
			"div",
			{
				className: "fragment-grid",
				style: { gridTemplateColumns: `repeat(${columns}, 1fr)` },
			},
			createElement(
				Fragment,
				null,
				...cells.map((cell) =>
					createElement(
						"div",
						{
							key: cell.id,
							className: `fragment-cell ${cell.status}`,
						},
						cell.label,
					),
				),
			),
		),
	);
};

// ============================================================
// 7. REDUCER DEMO
// ============================================================
interface ReducerState {
	items: string[];
	lastAction: string;
}

interface ReducerAction {
	type: "add" | "remove" | "clear";
	payload?: string;
	index?: number;
}

const reducer = (state: ReducerState, action: ReducerAction): ReducerState => {
	switch (action.type) {
		case "add":
			return {
				items: [...state.items, action.payload ?? ""],
				lastAction: "add",
			};
		case "remove":
			return {
				items: state.items.filter((_, i) => i !== action.index),
				lastAction: "remove",
			};
		case "clear":
			return { items: [], lastAction: "clear" };
		default:
			return state;
	}
};

const ReducerDemo = () => {
	const [state, dispatch] = useReducer(reducer, {
		items: ["Item A"],
		lastAction: "",
	});
	const inputRef = useRef<HTMLInputElement | null>(null);

	const handleAdd = () => {
		const ref = inputRef.current;
		if (ref === null) return;
		const val = ref.value;
		if (val.length > 0) {
			dispatch({ type: "add", payload: val });
			ref.value = "";
		}
	};

	return createElement(
		SpecCard,
		{
			label: "useReducer",
			code: "const [state, dispatch] = useReducer(reducer, initialState)",
		},
		createElement(
			"div",
			{ className: "reducer-form" },
			createElement("input", {
				ref: inputRef,
				className: "memo-input",
				placeholder: "New item...",
				onKeyDown: (e: Event) => {
					if (e instanceof KeyboardEvent && e.key === "Enter") {
						handleAdd();
					}
				},
			}),
			createElement(
				"button",
				{
					className: "btn-ghost",
					onClick: handleAdd,
				},
				"Add",
			),
		),
		createElement(
			"ul",
			{ className: "memo-list" },
			...(state.items.length === 0
				? [createElement("li", { className: "memo-item dim" }, "No items")]
				: state.items.map((item: string, i: number) =>
						createElement(
							"li",
							{ key: i, className: "memo-item interactive" },
							item,
							createElement(
								"button",
								{
									className: "btn-chip danger",
									onClick: () => dispatch({ type: "remove", index: i }),
								},
								"×",
							),
						),
					)),
		),
		createElement(
			"div",
			{ className: "memo-meta" },
			`Count: ${state.items.length}${state.lastAction ? ` · Last: ${state.lastAction}` : ""}`,
		),
	);
};

// ============================================================
// APP SHELL
// ============================================================
const App = () => {
	return createElement(
		"div",
		{ className: "showcase" },
		createElement(
			"header",
			{ className: "showcase-header" },
			createElement("h1", { className: "showcase-title" }, "MiniReact"),
			createElement(
				"p",
				{ className: "showcase-subtitle" },
				"Interactive API Showcase · ",
				createElement("code", null, "v0.3.0"),
			),
		),
		createElement(
			"main",
			{ className: "showcase-grid" },
			createElement(StateDemo, null),
			createElement(EffectsDemo, null),
			createElement(MemoDemo, null),
			createElement(ContextDemo, null),
			createElement(PortalDemo, null),
			createElement(FragmentDemo, null),
			createElement(ReducerDemo, null),
		),
		createElement(
			"footer",
			{ className: "showcase-footer" },
			createElement("span", null, "Built with "),
			createElement(
				"a",
				{
					href: "https://github.com/MarcelOlsen/mini-react",
					target: "_blank",
					rel: "noreferrer",
				},
				"MiniReact",
			),
		),
	);
};

const rootEl = document.getElementById("root");
if (rootEl !== null) {
	render(createElement(App, null), rootEl);
}
