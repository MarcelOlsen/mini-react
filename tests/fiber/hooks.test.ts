import { beforeEach, describe, expect, test } from "bun:test";
import { createElement } from "@/MiniReact";
import type { FiberRoot } from "@/fiber";
import {
	useCallbackFiber,
	useMemoFiber,
	useReducerFiber,
	useRefFiber,
	useStateFiber,
} from "@/fiber";
import { createTestRoot, renderFiber } from "@tests/helpers/fiberTestUtils";

describe("Fiber Hooks", () => {
	let container: HTMLElement;
	let root: FiberRoot;

	beforeEach(() => {
		({ container, root } = createTestRoot());
	});

	describe("useState Hook", () => {
		test("should initialize state", () => {
			let capturedState: number | undefined;

			const Component = () => {
				const [count] = useStateFiber(0);
				capturedState = count;
				return createElement("div", null, String(count));
			};

			renderFiber(createElement(Component, null), root);
			expect(capturedState).toBe(0);
			expect(container.textContent).toBe("0");
		});

		test("should initialize state with function", () => {
			let capturedState: number | undefined;

			const Component = () => {
				const [count] = useStateFiber(() => 42);
				capturedState = count;
				return createElement("div", null, String(count));
			};

			renderFiber(createElement(Component, null), root);
			expect(capturedState).toBe(42);
		});

		test("should update state and re-render", async () => {
			let setState: ((value: number) => void) | undefined;

			const Component = () => {
				const [count, setCount] = useStateFiber(0);
				setState = setCount;
				return createElement("div", null, String(count));
			};

			renderFiber(createElement(Component, null), root);
			expect(container.textContent).toBe("0");

			setState?.(1);
			await new Promise((resolve) => setTimeout(resolve, 10));
			expect(container.textContent).toBe("1");
		});

		test("should support functional updates", async () => {
			let setState: ((fn: (prev: number) => number) => void) | undefined;

			const Component = () => {
				const [count, setCount] = useStateFiber(5);
				setState = setCount as (fn: (prev: number) => number) => void;
				return createElement("div", null, String(count));
			};

			renderFiber(createElement(Component, null), root);
			expect(container.textContent).toBe("5");

			setState?.((prev) => prev * 2);
			await new Promise((resolve) => setTimeout(resolve, 10));
			expect(container.textContent).toBe("10");
		});

		test("should handle multiple useState hooks", async () => {
			let setCount: ((value: number) => void) | undefined;
			let setName: ((value: string) => void) | undefined;

			const Component = () => {
				const [count, setCountHook] = useStateFiber(0);
				const [name, setNameHook] = useStateFiber("John");
				setCount = setCountHook;
				setName = setNameHook;
				return createElement("div", null, `${name}: ${count}`);
			};

			renderFiber(createElement(Component, null), root);
			expect(container.textContent).toBe("John: 0");

			setCount?.(5);
			await new Promise((resolve) => setTimeout(resolve, 10));
			expect(container.textContent).toBe("John: 5");

			setName?.("Jane");
			await new Promise((resolve) => setTimeout(resolve, 10));
			expect(container.textContent).toBe("Jane: 5");
		});
	});

	describe("useReducer Hook", () => {
		test("should initialize with reducer", () => {
			type State = { count: number };
			type Action = { type: "increment" } | { type: "decrement" };

			const reducer = (state: State, action: Action): State => {
				switch (action.type) {
					case "increment":
						return { count: state.count + 1 };
					case "decrement":
						return { count: state.count - 1 };
					default:
						return state;
				}
			};

			let capturedState: State | undefined;

			const Component = () => {
				const [state] = useReducerFiber(reducer, { count: 0 });
				capturedState = state;
				return createElement("div", null, String(state.count));
			};

			renderFiber(createElement(Component, null), root);
			expect(capturedState?.count).toBe(0);
		});

		test("should dispatch actions", async () => {
			type State = { count: number };
			type Action = { type: "increment" };

			const reducer = (state: State, action: Action): State => {
				if (action.type === "increment") {
					return { count: state.count + 1 };
				}
				return state;
			};

			let dispatch: ((action: Action) => void) | undefined;

			const Component = () => {
				const [state, dispatchFn] = useReducerFiber(reducer, { count: 0 });
				dispatch = dispatchFn;
				return createElement("div", null, String(state.count));
			};

			renderFiber(createElement(Component, null), root);
			expect(container.textContent).toBe("0");

			dispatch?.({ type: "increment" });
			await new Promise((resolve) => setTimeout(resolve, 10));
			expect(container.textContent).toBe("1");
		});
	});

	describe("useRef Hook", () => {
		test("should persist ref across renders", async () => {
			let setState: ((value: number) => void) | undefined;
			let refValue: { current: number } | undefined;

			const Component = () => {
				const [count, setCount] = useStateFiber(0);
				const ref = useRefFiber(100);
				setState = setCount;
				refValue = ref;
				return createElement("div", null, `${count}-${ref.current}`);
			};

			renderFiber(createElement(Component, null), root);
			expect(refValue?.current).toBe(100);

			if (refValue) {
				refValue.current = 200;
			}
			setState?.(1);
			await new Promise((resolve) => setTimeout(resolve, 10));
			expect(refValue?.current).toBe(200);
		});

		test("should allow DOM ref assignment", () => {
			let divRef: { current: Element | null } | undefined;

			const Component = () => {
				const ref = useRefFiber<Element | null>(null);
				divRef = ref;
				return createElement("div", { ref }, "Ref Test");
			};

			renderFiber(createElement(Component, null), root);
			expect(divRef?.current).toBeInstanceOf(Element);
		});
	});

	describe("useMemo Hook", () => {
		test("should memoize value", () => {
			let computeCount = 0;

			const Component = () => {
				const value = useMemoFiber(() => {
					computeCount++;
					return 42;
				}, []);
				return createElement("div", null, String(value));
			};

			renderFiber(createElement(Component, null), root);
			expect(computeCount).toBe(1);
			expect(container.textContent).toBe("42");

			renderFiber(createElement(Component, null), root);
			expect(computeCount).toBe(1); // Should not recompute
		});

		test("should recompute when deps change", async () => {
			let computeCount = 0;
			let setState: ((value: number) => void) | undefined;

			const Component = () => {
				const [multiplier, setMultiplier] = useStateFiber(2);
				setState = setMultiplier;
				const value = useMemoFiber(() => {
					computeCount++;
					return 10 * multiplier;
				}, [multiplier]);
				return createElement("div", null, String(value));
			};

			renderFiber(createElement(Component, null), root);
			expect(computeCount).toBe(1);
			expect(container.textContent).toBe("20");

			setState?.(3);
			await new Promise((resolve) => setTimeout(resolve, 10));
			expect(computeCount).toBe(2);
			expect(container.textContent).toBe("30");
		});
	});

	describe("useCallback Hook", () => {
		test("should memoize callback", () => {
			let callbackRef: (() => void) | undefined;

			const Component = () => {
				const callback = useCallbackFiber(() => {
					// noop
				}, []);
				callbackRef = callback;
				return createElement("div", null, "Callback Test");
			};

			renderFiber(createElement(Component, null), root);
			expect(callbackRef).toBeDefined();
			// Store reference before re-render
			const firstCallback = callbackRef as () => void;

			renderFiber(createElement(Component, null), root);
			expect(callbackRef).toBe(firstCallback);
		});
	});

	// P1.7: Hook state corruption between renders
	describe("Hook state isolation", () => {
		test("should not corrupt hooks when switching components", async () => {
			const ComponentA = () => {
				const [count] = useStateFiber(10);
				const ref = useRefFiber("A");
				return createElement("div", null, `A:${count}:${ref.current}`);
			};

			let setStateB: ((value: number) => void) | undefined;
			const ComponentB = () => {
				const [count, setCount] = useStateFiber(20);
				const ref = useRefFiber("B");
				setStateB = setCount;
				return createElement("div", null, `B:${count}:${ref.current}`);
			};

			// Render A
			renderFiber(createElement(ComponentA, null), root);
			expect(container.textContent).toBe("A:10:A");

			// Unmount A
			renderFiber(null, root);
			expect(container.textContent).toBe("");

			// Render B
			renderFiber(createElement(ComponentB, null), root);
			expect(container.textContent).toBe("B:20:B");

			// Update B's state - should work independently
			setStateB?.(30);
			await new Promise((resolve) => setTimeout(resolve, 10));
			expect(container.textContent).toBe("B:30:B");
		});
	});

	// P1.8: useReducer same-value bailout
	describe("useReducer bailout", () => {
		test("should bail out when reducer returns same state", async () => {
			let renderCount = 0;
			type State = { count: number };
			type Action = { type: "noop" } | { type: "increment" };

			const reducer = (state: State, action: Action): State => {
				switch (action.type) {
					case "noop":
						return state; // Same reference
					case "increment":
						return { count: state.count + 1 };
					default:
						return state;
				}
			};

			let dispatch: ((action: Action) => void) | undefined;

			const Component = () => {
				renderCount++;
				const [state, dispatchFn] = useReducerFiber(reducer, { count: 0 });
				dispatch = dispatchFn;
				return createElement("div", null, String(state.count));
			};

			renderFiber(createElement(Component, null), root);
			expect(renderCount).toBe(1);

			// Dispatch noop - returns same state, should bail out
			dispatch?.({ type: "noop" });
			await new Promise((resolve) => setTimeout(resolve, 10));
			expect(renderCount).toBe(1); // Should not re-render
			expect(container.textContent).toBe("0");
		});
	});
});
