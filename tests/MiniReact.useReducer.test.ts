import { beforeEach, describe, expect, test } from "bun:test";
import { createElement, render, useReducer } from "../src/MiniReact";

describe("MiniReact.useReducer Hook", () => {
	let container: HTMLElement;
	const ROOT_ID = "test-root";

	beforeEach(() => {
		document.body.innerHTML = `<div id="${ROOT_ID}"></div>`;
		const foundContainer = document.getElementById(ROOT_ID);
		if (!foundContainer) {
			throw new Error(
				`Test setup critical failure: #${ROOT_ID} not found in happy-dom environment.`,
			);
		}
		container = foundContainer;
	});

	// Basic functionality tests
	test("should initialize state with initial value", () => {
		let capturedState: number | undefined;

		const reducer = (
			state: number,
			action: { type: "increment" | "decrement" },
		) => {
			switch (action.type) {
				case "increment":
					return state + 1;
				case "decrement":
					return state - 1;
				default:
					return state;
			}
		};

		const Component = () => {
			const [count] = useReducer(reducer, 0);
			capturedState = count;
			return createElement("div", null, String(count));
		};

		render(createElement(Component, null), container);

		expect(capturedState).toBe(0);
		expect(container.textContent).toBe("0");
	});

	test("should handle basic state updates with dispatch", async () => {
		let dispatch:
			| ((action: { type: "increment" | "decrement" }) => void)
			| undefined;

		const reducer = (
			state: number,
			action: { type: "increment" | "decrement" },
		) => {
			switch (action.type) {
				case "increment":
					return state + 1;
				case "decrement":
					return state - 1;
				default:
					return state;
			}
		};

		const Component = () => {
			const [count, dispatchAction] = useReducer(reducer, 0);
			dispatch = dispatchAction;
			return createElement("div", null, String(count));
		};

		render(createElement(Component, null), container);
		expect(container.textContent).toBe("0");

		// Dispatch increment action
		if (dispatch) {
			dispatch({ type: "increment" });
		}

		// Wait for re-render
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(container.textContent).toBe("1");

		// Dispatch decrement action
		if (dispatch) {
			dispatch({ type: "decrement" });
		}

		// Wait for re-render
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(container.textContent).toBe("0");
	});

	test("should support lazy initialization with init function", () => {
		let capturedState: number | undefined;

		const reducer = (state: number, action: { type: "double" | "reset" }) => {
			switch (action.type) {
				case "double":
					return state * 2;
				case "reset":
					return 0;
				default:
					return state;
			}
		};

		const init = (initialCount: number) => {
			return initialCount * 10;
		};

		const Component = () => {
			const [count] = useReducer(reducer, 5, init);
			capturedState = count;
			return createElement("div", null, String(count));
		};

		render(createElement(Component, null), container);

		expect(capturedState).toBe(50); // 5 * 10 = 50
		expect(container.textContent).toBe("50");
	});

	test("should handle complex state objects", async () => {
		interface State {
			count: number;
			name: string;
		}

		type Action =
			| { type: "increment" }
			| { type: "decrement" }
			| { type: "setName"; name: string }
			| { type: "reset" };

		let dispatch: ((action: Action) => void) | undefined;

		const reducer = (state: State, action: Action): State => {
			switch (action.type) {
				case "increment":
					return { ...state, count: state.count + 1 };
				case "decrement":
					return { ...state, count: state.count - 1 };
				case "setName":
					return { ...state, name: action.name };
				case "reset":
					return { count: 0, name: "Default" };
				default:
					return state;
			}
		};

		const Component = () => {
			const [state, dispatchAction] = useReducer(reducer, {
				count: 0,
				name: "John",
			});
			dispatch = dispatchAction;
			return createElement("div", null, `${state.name}: ${state.count}`);
		};

		render(createElement(Component, null), container);
		expect(container.textContent).toBe("John: 0");

		// Update count
		if (dispatch) {
			dispatch({ type: "increment" });
		}
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(container.textContent).toBe("John: 1");

		// Update name
		if (dispatch) {
			dispatch({ type: "setName", name: "Jane" });
		}
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(container.textContent).toBe("Jane: 1");

		// Reset
		if (dispatch) {
			dispatch({ type: "reset" });
		}
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(container.textContent).toBe("Default: 0");
	});

	test("should handle multiple useReducer hooks in same component", async () => {
		let dispatch1:
			| ((action: { type: "increment" | "decrement" }) => void)
			| undefined;
		let dispatch2:
			| ((
					action:
						| { type: "add"; value: number }
						| { type: "multiply"; value: number },
			  ) => void)
			| undefined;

		const reducer1 = (
			state: number,
			action: { type: "increment" | "decrement" },
		) => {
			switch (action.type) {
				case "increment":
					return state + 1;
				case "decrement":
					return state - 1;
				default:
					return state;
			}
		};

		const reducer2 = (
			state: number,
			action:
				| { type: "add"; value: number }
				| { type: "multiply"; value: number },
		) => {
			switch (action.type) {
				case "add":
					return state + action.value;
				case "multiply":
					return state * action.value;
				default:
					return state;
			}
		};

		const Component = () => {
			const [count1, dispatch1Action] = useReducer(reducer1, 0);
			const [count2, dispatch2Action] = useReducer(reducer2, 10);
			dispatch1 = dispatch1Action;
			dispatch2 = dispatch2Action;

			return createElement("div", null, `Count1: ${count1}, Count2: ${count2}`);
		};

		render(createElement(Component, null), container);
		expect(container.textContent).toBe("Count1: 0, Count2: 10");

		// Update first reducer
		if (dispatch1) {
			dispatch1({ type: "increment" });
		}
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(container.textContent).toBe("Count1: 1, Count2: 10");

		// Update second reducer
		if (dispatch2) {
			dispatch2({ type: "add", value: 5 });
		}
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(container.textContent).toBe("Count1: 1, Count2: 15");
	});

	test("should preserve state across re-renders", async () => {
		let dispatch: ((action: { type: "increment" }) => void) | undefined;
		let triggerRerender: (() => void) | undefined;

		const reducer = (state: number, action: { type: "increment" }) => {
			switch (action.type) {
				case "increment":
					return state + 1;
				default:
					return state;
			}
		};

		const Component = (props: { trigger?: boolean }) => {
			const [count, dispatchAction] = useReducer(reducer, 0);
			const { trigger } = props;
			dispatch = dispatchAction;

			return createElement("div", null, `count: ${count}, trigger: ${trigger}`);
		};

		const App = () => {
			const [trigger, setTrigger] = useReducer(
				(state: boolean, _action: unknown) => !state,
				false,
			);
			triggerRerender = () => setTrigger("toggle");
			return createElement(Component, { trigger });
		};

		render(createElement(App, null), container);
		expect(container.textContent).toBe("count: 0, trigger: false");

		// Update nested component state
		if (dispatch) {
			dispatch({ type: "increment" });
		}
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(container.textContent).toBe("count: 1, trigger: false");

		// Trigger parent re-render
		if (triggerRerender) {
			triggerRerender();
		}
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(container.textContent).toBe("count: 1, trigger: true");
	});

	test("should handle state updates with same value (no re-render)", async () => {
		let dispatch:
			| ((action: { type: "noop" | "increment" }) => void)
			| undefined;
		let renderCount = 0;

		const reducer = (state: number, action: { type: "noop" | "increment" }) => {
			switch (action.type) {
				case "increment":
					return state + 1;
				case "noop":
					return state; // Returns same state
				default:
					return state;
			}
		};

		const Component = () => {
			renderCount++;
			const [count, dispatchAction] = useReducer(reducer, 0);
			dispatch = dispatchAction;
			return createElement("div", null, String(count));
		};

		render(createElement(Component, null), container);
		expect(renderCount).toBe(1);

		// Dispatch action that returns same state
		if (dispatch) {
			dispatch({ type: "noop" });
		}
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(renderCount).toBe(1); // Should not re-render

		// Dispatch action that changes state
		if (dispatch) {
			dispatch({ type: "increment" });
		}
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(renderCount).toBe(2); // Should re-render
	});

	test("should throw error when useReducer called outside component", () => {
		const reducer = (state: number, _action: { type: "increment" }) =>
			state + 1;

		expect(() => {
			useReducer(reducer, 0);
		}).toThrow("useReducer must be called inside a functional component");
	});

	test("should handle multiple components with independent reducers", async () => {
		let dispatch1: ((action: { type: "increment" }) => void) | undefined;
		let dispatch2: ((action: { type: "increment" }) => void) | undefined;

		const reducer = (state: number, action: { type: "increment" }) => {
			switch (action.type) {
				case "increment":
					return state + 1;
				default:
					return state;
			}
		};

		const Counter = ({
			id,
			initialValue,
		}: { id: string; initialValue: number }) => {
			const [count, dispatch] = useReducer(reducer, initialValue);

			if (id === "1") dispatch1 = dispatch;
			if (id === "2") dispatch2 = dispatch;

			return createElement("div", { id }, `Counter ${id}: ${count}`);
		};

		const App = () => {
			return createElement(
				"div",
				null,
				createElement(Counter, { id: "1", initialValue: 0 }),
				createElement(Counter, { id: "2", initialValue: 100 }),
			);
		};

		render(createElement(App, null), container);
		expect(container.textContent).toBe("Counter 1: 0Counter 2: 100");

		// Update first counter
		if (dispatch1) {
			dispatch1({ type: "increment" });
		}
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(container.textContent).toBe("Counter 1: 1Counter 2: 100");

		// Update second counter
		if (dispatch2) {
			dispatch2({ type: "increment" });
		}
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(container.textContent).toBe("Counter 1: 1Counter 2: 101");
	});

	test("should handle hook order consistency", async () => {
		let toggleCondition: (() => void) | undefined;
		let dispatch: ((action: { type: "increment" }) => void) | undefined;

		const countReducer = (state: number, action: { type: "increment" }) => {
			switch (action.type) {
				case "increment":
					return state + 1;
				default:
					return state;
			}
		};

		const Component = () => {
			const [condition, toggleConditionAction] = useReducer(
				(state: boolean, _action: unknown) => !state,
				true,
			);

			// This should always be the second hook
			const [count, dispatchAction] = useReducer(countReducer, 0);

			toggleCondition = () => toggleConditionAction("toggle");
			dispatch = dispatchAction;

			return createElement(
				"div",
				null,
				`condition: ${condition}, count: ${count}`,
			);
		};

		render(createElement(Component, null), container);
		expect(container.textContent).toBe("condition: true, count: 0");

		// Update count
		if (dispatch) {
			dispatch({ type: "increment" });
		}
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(container.textContent).toBe("condition: true, count: 1");

		// Toggle condition
		if (toggleCondition) {
			toggleCondition();
		}
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(container.textContent).toBe("condition: false, count: 1");
	});

	test("should support lazy initialization with complex init function", () => {
		interface State {
			items: string[];
			total: number;
		}

		type Action = { type: "addItem"; item: string } | { type: "clear" };

		let capturedState: State | undefined;

		const reducer = (state: State, action: Action): State => {
			switch (action.type) {
				case "addItem":
					return {
						items: [...state.items, action.item],
						total: state.total + 1,
					};
				case "clear":
					return { items: [], total: 0 };
				default:
					return state;
			}
		};

		const init = (initialItems: string[]): State => {
			return {
				items: initialItems.map((item) => item.toUpperCase()),
				total: initialItems.length,
			};
		};

		const Component = () => {
			const [state] = useReducer(reducer, ["apple", "banana"], init);
			capturedState = state;
			return createElement(
				"div",
				null,
				`Items: ${state.items.join(", ")}, Total: ${state.total}`,
			);
		};

		render(createElement(Component, null), container);

		expect(capturedState).toEqual({
			items: ["APPLE", "BANANA"],
			total: 2,
		});
		expect(container.textContent).toBe("Items: APPLE, BANANA, Total: 2");
	});

	test("should handle reducer that changes between renders", async () => {
		let dispatch: ((action: { type: "increment" }) => void) | undefined;
		let switchReducer: (() => void) | undefined;

		const reducer1 = (state: number, action: { type: "increment" }) => {
			return action.type === "increment" ? state + 1 : state;
		};

		const reducer2 = (state: number, action: { type: "increment" }) => {
			return action.type === "increment" ? state + 10 : state;
		};

		const Component = () => {
			const [useFirstReducer, setUseFirstReducer] = useReducer(
				(state: boolean, _action: unknown) => !state,
				true,
			);
			const [count, dispatchAction] = useReducer(
				useFirstReducer ? reducer1 : reducer2,
				0,
			);

			switchReducer = () => setUseFirstReducer("switch");
			dispatch = dispatchAction;

			return createElement(
				"div",
				null,
				`Reducer: ${useFirstReducer ? "1" : "2"}, Count: ${count}`,
			);
		};

		render(createElement(Component, null), container);
		expect(container.textContent).toBe("Reducer: 1, Count: 0");

		// Use first reducer (increment by 1)
		if (dispatch) {
			dispatch({ type: "increment" });
		}
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(container.textContent).toBe("Reducer: 1, Count: 1");

		// Switch to second reducer
		if (switchReducer) {
			switchReducer();
		}
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(container.textContent).toBe("Reducer: 2, Count: 1");

		// Use second reducer (increment by 10)
		if (dispatch) {
			dispatch({ type: "increment" });
		}
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(container.textContent).toBe("Reducer: 2, Count: 11");
	});

	test("should handle async actions pattern", async () => {
		interface State {
			loading: boolean;
			data: string | null;
			error: string | null;
		}

		type Action =
			| { type: "FETCH_START" }
			| { type: "FETCH_SUCCESS"; data: string }
			| { type: "FETCH_ERROR"; error: string };

		let dispatch: ((action: Action) => void) | undefined;

		const reducer = (state: State, action: Action): State => {
			switch (action.type) {
				case "FETCH_START":
					return { loading: true, data: null, error: null };
				case "FETCH_SUCCESS":
					return { loading: false, data: action.data, error: null };
				case "FETCH_ERROR":
					return { loading: false, data: null, error: action.error };
				default:
					return state;
			}
		};

		const Component = () => {
			const [state, dispatchAction] = useReducer(reducer, {
				loading: false,
				data: null,
				error: null,
			});
			dispatch = dispatchAction;

			return createElement(
				"div",
				null,
				`Loading: ${state.loading}, Data: ${state.data}, Error: ${state.error}`,
			);
		};

		render(createElement(Component, null), container);
		expect(container.textContent).toBe(
			"Loading: false, Data: null, Error: null",
		);

		// Start loading
		if (dispatch) {
			dispatch({ type: "FETCH_START" });
		}
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(container.textContent).toBe(
			"Loading: true, Data: null, Error: null",
		);

		// Success
		if (dispatch) {
			dispatch({ type: "FETCH_SUCCESS", data: "test data" });
		}
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(container.textContent).toBe(
			"Loading: false, Data: test data, Error: null",
		);

		// Error
		if (dispatch) {
			dispatch({ type: "FETCH_ERROR", error: "test error" });
		}
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(container.textContent).toBe(
			"Loading: false, Data: null, Error: test error",
		);
	});
});
