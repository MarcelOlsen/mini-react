import { beforeEach, describe, expect, test } from "bun:test";
import {
	createContext,
	createElement,
	render,
	useContext,
	useState,
} from "../src/MiniReact";
import type { FunctionalComponent } from "../src/types";

describe("MiniReact.Context API", () => {
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

	test("should create context with default value", () => {
		const TestContext = createContext("default");

		expect(TestContext._defaultValue).toBe("default");
		expect(TestContext._currentValue).toBe("default");
		expect(typeof TestContext._contextId).toBe("symbol");
		expect(typeof TestContext.Provider).toBe("function");
	});

	test("should use default context value when no provider", () => {
		const TestContext = createContext("default");
		let capturedValue: string | undefined;

		const Consumer: FunctionalComponent = () => {
			capturedValue = useContext(TestContext);
			return createElement("div", null, capturedValue);
		};

		render(createElement(Consumer, null), container);

		expect(capturedValue).toBe("default");
		expect(container.textContent).toBe("default");
	});

	test("should use provided context value", () => {
		const TestContext = createContext("default");
		let capturedValue: string | undefined;

		const Consumer: FunctionalComponent = () => {
			capturedValue = useContext(TestContext);
			return createElement("div", null, capturedValue);
		};

		const App: FunctionalComponent = () => {
			return createElement(
				TestContext.Provider,
				{ value: "provided" },
				createElement(Consumer, null),
			);
		};

		render(createElement(App, null), container);

		expect(capturedValue).toBe("provided");
		expect(container.textContent).toBe("provided");
	});

	test("should handle nested providers", () => {
		const TestContext = createContext("default");
		let innerValue: string | undefined;
		let outerValue: string | undefined;

		const InnerConsumer: FunctionalComponent = () => {
			innerValue = useContext(TestContext);
			return createElement("span", null, `inner: ${innerValue}`);
		};

		const OuterConsumer: FunctionalComponent = () => {
			outerValue = useContext(TestContext);
			return createElement(
				"div",
				null,
				`outer: ${outerValue}, `,
				createElement(
					TestContext.Provider,
					{ value: "inner" },
					createElement(InnerConsumer, null),
				),
			);
		};

		const App: FunctionalComponent = () => {
			return createElement(
				TestContext.Provider,
				{ value: "outer" },
				createElement(OuterConsumer, null),
			);
		};

		render(createElement(App, null), container);

		expect(outerValue).toBe("outer");
		expect(innerValue).toBe("inner");
		expect(container.textContent).toBe("outer: outer, inner: inner");
	});

	test("should handle multiple contexts", () => {
		const NameContext = createContext("Anonymous");
		const AgeContext = createContext(0);
		let capturedName: string | undefined;
		let capturedAge: number | undefined;

		const Consumer: FunctionalComponent = () => {
			capturedName = useContext(NameContext);
			capturedAge = useContext(AgeContext);
			return createElement(
				"div",
				null,
				`${capturedName} is ${capturedAge} years old`,
			);
		};

		const App: FunctionalComponent = () => {
			return createElement(
				NameContext.Provider,
				{ value: "Alice" },
				createElement(
					AgeContext.Provider,
					{ value: 30 },
					createElement(Consumer, null),
				),
			);
		};

		render(createElement(App, null), container);

		expect(capturedName).toBe("Alice");
		expect(capturedAge).toBe(30);
		expect(container.textContent).toBe("Alice is 30 years old");
	});

	test("should handle context with object values", () => {
		interface User {
			name: string;
			id: number;
		}

		const UserContext = createContext<User>({ name: "Guest", id: 0 });
		let capturedUser: User | undefined;

		const Consumer: FunctionalComponent = () => {
			capturedUser = useContext(UserContext);
			return createElement(
				"div",
				null,
				`User: ${capturedUser.name} (${capturedUser.id})`,
			);
		};

		const App: FunctionalComponent = () => {
			return createElement(
				UserContext.Provider,
				{ value: { name: "John", id: 123 } },
				createElement(Consumer, null),
			);
		};

		render(createElement(App, null), container);

		expect(capturedUser).toEqual({ name: "John", id: 123 });
		expect(container.textContent).toBe("User: John (123)");
	});

	test("should handle provider with no children", () => {
		const TestContext = createContext("default");

		const App: FunctionalComponent = () => {
			return createElement(TestContext.Provider, { value: "test" });
		};

		render(createElement(App, null), container);

		expect(container.textContent).toBe("");
	});

	test("should handle provider with single child", () => {
		const TestContext = createContext("default");
		let capturedValue: string | undefined;

		const Consumer: FunctionalComponent = () => {
			capturedValue = useContext(TestContext);
			return createElement("span", null, capturedValue);
		};

		const App: FunctionalComponent = () => {
			return createElement(
				TestContext.Provider,
				{ value: "single" },
				createElement(Consumer, null),
			);
		};

		render(createElement(App, null), container);

		expect(capturedValue).toBe("single");
		expect(container.textContent).toBe("single");
	});

	test("should handle provider with multiple children", () => {
		const TestContext = createContext("default");
		let value1: string | undefined;
		let value2: string | undefined;

		const Consumer1: FunctionalComponent = () => {
			value1 = useContext(TestContext);
			return createElement("span", null, `first: ${value1}`);
		};

		const Consumer2: FunctionalComponent = () => {
			value2 = useContext(TestContext);
			return createElement("span", null, `second: ${value2}`);
		};

		const App: FunctionalComponent = () => {
			return createElement(
				TestContext.Provider,
				{ value: "multiple" },
				createElement(Consumer1, null),
				createElement(Consumer2, null),
			);
		};

		render(createElement(App, null), container);

		expect(value1).toBe("multiple");
		expect(value2).toBe("multiple");
		expect(container.innerHTML).toContain("first: multiple");
		expect(container.innerHTML).toContain("second: multiple");
	});

	test("should throw error when useContext called outside component", () => {
		const TestContext = createContext("test");

		expect(() => {
			useContext(TestContext);
		}).toThrow("useContext must be called inside a functional component");
	});

	test("should handle context value updates", () => {
		const TestContext = createContext("default");
		let capturedValue: string | undefined;

		const Consumer: FunctionalComponent = () => {
			capturedValue = useContext(TestContext);
			return createElement("div", null, capturedValue);
		};

		const Provider: FunctionalComponent<{ value: string }> = ({ value }) => {
			return createElement(
				TestContext.Provider,
				{ value },
				createElement(Consumer, null),
			);
		};

		const App: FunctionalComponent = () => {
			const [contextValue, _setContextValue] = useState("initial");

			return createElement(Provider, { value: contextValue });
		};

		render(createElement(App, null), container);
		expect(capturedValue).toBe("initial");

		// Simulate context value update (this would need useState integration)
		// For now, just test the provider accepts different values
		render(createElement(Provider, { value: "updated" }), container);
		expect(capturedValue).toBe("updated");
	});

	test("should handle deeply nested context consumption", () => {
		const TestContext = createContext("default");
		let deepValue: string | undefined;

		const DeepChild: FunctionalComponent = () => {
			deepValue = useContext(TestContext);
			return createElement("span", null, deepValue);
		};

		const MiddleChild: FunctionalComponent = () => {
			return createElement("div", null, createElement(DeepChild, null));
		};

		const Parent: FunctionalComponent = () => {
			return createElement("section", null, createElement(MiddleChild, null));
		};

		const App: FunctionalComponent = () => {
			return createElement(
				TestContext.Provider,
				{ value: "deep" },
				createElement(Parent, null),
			);
		};

		render(createElement(App, null), container);

		expect(deepValue).toBe("deep");
		expect(container.textContent).toBe("deep");
	});

	test("should handle context with function values", () => {
		const ActionContext = createContext<() => string>(() => "default action");
		let capturedAction: (() => string) | undefined;

		const Consumer: FunctionalComponent = () => {
			capturedAction = useContext(ActionContext);
			const result = capturedAction();
			return createElement("div", null, result);
		};

		const customAction = () => "custom action";

		const App: FunctionalComponent = () => {
			return createElement(
				ActionContext.Provider,
				{ value: customAction },
				createElement(Consumer, null),
			);
		};

		render(createElement(App, null), container);

		expect(typeof capturedAction).toBe("function");
		expect(capturedAction?.()).toBe("custom action");
		expect(container.textContent).toBe("custom action");
	});

	test("should handle boolean context values", () => {
		const ThemeContext = createContext(false);
		let capturedTheme: boolean | undefined;

		const Consumer: FunctionalComponent = () => {
			capturedTheme = useContext(ThemeContext);
			return createElement("div", null, capturedTheme ? "dark" : "light");
		};

		const App: FunctionalComponent = () => {
			return createElement(
				ThemeContext.Provider,
				{ value: true },
				createElement(Consumer, null),
			);
		};

		render(createElement(App, null), container);

		expect(capturedTheme).toBe(true);
		expect(container.textContent).toBe("dark");
	});

	test("should handle null context values", () => {
		const TestContext = createContext<string | null>("default");
		let capturedValue: string | null | undefined;

		const Consumer: FunctionalComponent = () => {
			capturedValue = useContext(TestContext);
			return createElement("div", null, capturedValue || "null value");
		};

		const App: FunctionalComponent = () => {
			return createElement(
				TestContext.Provider,
				{ value: null as string | null },
				createElement(Consumer, null),
			);
		};

		render(createElement(App, null), container);

		expect(capturedValue).toBe(null);
		expect(container.textContent).toBe("null value");
	});

	test("should handle undefined context values", () => {
		const TestContext = createContext<string | undefined>("default");
		let capturedValue: string | undefined;

		const Consumer: FunctionalComponent = () => {
			capturedValue = useContext(TestContext);
			return createElement("div", null, capturedValue || "undefined value");
		};

		const App: FunctionalComponent = () => {
			return createElement(
				TestContext.Provider,
				{ value: undefined },
				createElement(Consumer, null),
			);
		};

		render(createElement(App, null), container);

		expect(capturedValue).toBeUndefined();
		expect(container.textContent).toBe("undefined value");
	});

	// Tests for dynamic context value changes and re-renders
	describe("Dynamic Context Value Changes", () => {
		test("should trigger child re-renders when context value changes", () => {
			const TestContext = createContext("initial");
			let capturedValue: string | undefined;
			let renderCount = 0;
			let exposedSetContextValue: ((value: string) => void) | null = null;

			const Consumer: FunctionalComponent = () => {
				renderCount++;
				capturedValue = useContext(TestContext);
				return createElement(
					"div",
					null,
					`Value: ${capturedValue}, Renders: ${renderCount}`,
				);
			};

			const App: FunctionalComponent = () => {
				const [contextValue, setContextValue] = useState("initial");
				exposedSetContextValue = setContextValue;

				return createElement(
					TestContext.Provider,
					{ value: contextValue },
					createElement(Consumer, null),
				);
			};

			render(createElement(App, null), container);

			expect(capturedValue).toBe("initial");
			expect(renderCount).toBe(1);
			expect(container.textContent).toBe("Value: initial, Renders: 1");

			// Trigger context value change
			(exposedSetContextValue as unknown as (value: string) => void)("updated");

			expect(capturedValue).toBe("updated");
			expect(renderCount).toBe(2);
			expect(container.textContent).toBe("Value: updated, Renders: 2");
		});

		test("should trigger re-renders in multiple child consumers", () => {
			const TestContext = createContext("initial");
			let value1: string | undefined;
			let value2: string | undefined;
			let renderCount1 = 0;
			let renderCount2 = 0;
			let exposedSetContextValue: ((value: string) => void) | null = null;

			const Consumer1: FunctionalComponent = () => {
				renderCount1++;
				value1 = useContext(TestContext);
				return createElement("span", null, `Consumer1: ${value1}`);
			};

			const Consumer2: FunctionalComponent = () => {
				renderCount2++;
				value2 = useContext(TestContext);
				return createElement("span", null, `Consumer2: ${value2}`);
			};

			const App: FunctionalComponent = () => {
				const [contextValue, setContextValue] = useState("initial");
				exposedSetContextValue = setContextValue;

				return createElement(
					TestContext.Provider,
					{ value: contextValue },
					createElement(Consumer1, null),
					createElement(Consumer2, null),
				);
			};

			render(createElement(App, null), container);

			expect(value1).toBe("initial");
			expect(value2).toBe("initial");
			expect(renderCount1).toBe(1);
			expect(renderCount2).toBe(1);

			// Trigger context value change
			(exposedSetContextValue as unknown as (value: string) => void)("changed");

			expect(value1).toBe("changed");
			expect(value2).toBe("changed");
			expect(renderCount1).toBe(2);
			expect(renderCount2).toBe(2);
		});

		test("should trigger re-renders in deeply nested consumers", () => {
			const TestContext = createContext("initial");
			let deepValue: string | undefined;
			let deepRenderCount = 0;
			let exposedSetContextValue: ((value: string) => void) | null = null;

			const DeepConsumer: FunctionalComponent = () => {
				deepRenderCount++;
				deepValue = useContext(TestContext);
				return createElement("span", null, `Deep: ${deepValue}`);
			};

			const MiddleComponent: FunctionalComponent = () => {
				return createElement(
					"div",
					null,
					createElement("p", null, "Middle"),
					createElement(DeepConsumer, null),
				);
			};

			const App: FunctionalComponent = () => {
				const [contextValue, setContextValue] = useState("initial");
				exposedSetContextValue = setContextValue;

				return createElement(
					TestContext.Provider,
					{ value: contextValue },
					createElement(MiddleComponent, null),
				);
			};

			render(createElement(App, null), container);

			expect(deepValue).toBe("initial");
			expect(deepRenderCount).toBe(1);

			// Trigger context value change
			(exposedSetContextValue as unknown as (value: string) => void)(
				"deep-changed",
			);

			expect(deepValue).toBe("deep-changed");
			expect(deepRenderCount).toBe(2);
		});

		test("should handle context value changes with object references", () => {
			interface User {
				name: string;
				id: number;
			}

			const UserContext = createContext<User>({ name: "Guest", id: 0 });
			let capturedUser: User | undefined;
			let renderCount = 0;
			let exposedSetUser: ((user: User) => void) | null = null;

			const Consumer: FunctionalComponent = () => {
				renderCount++;
				capturedUser = useContext(UserContext);
				return createElement(
					"div",
					null,
					`User: ${capturedUser.name} (${capturedUser.id})`,
				);
			};

			const App: FunctionalComponent = () => {
				const [user, setUser] = useState<User>({ name: "Alice", id: 1 });
				exposedSetUser = setUser;

				return createElement(
					UserContext.Provider,
					{ value: user },
					createElement(Consumer, null),
				);
			};

			render(createElement(App, null), container);

			expect(capturedUser).toEqual({ name: "Alice", id: 1 });
			expect(renderCount).toBe(1);

			// Change user object
			(exposedSetUser as unknown as (user: User) => void)({
				name: "Bob",
				id: 2,
			});

			expect(capturedUser).toEqual({ name: "Bob", id: 2 });
			expect(renderCount).toBe(2);
		});

		test("should handle context value changes to same value", () => {
			const TestContext = createContext("initial");
			let capturedValue: string | undefined;
			let renderCount = 0;
			let exposedSetContextValue: ((value: string) => void) | null = null;

			const Consumer: FunctionalComponent = () => {
				renderCount++;
				capturedValue = useContext(TestContext);
				return createElement("div", null, capturedValue);
			};

			const App: FunctionalComponent = () => {
				const [contextValue, setContextValue] = useState("same");
				exposedSetContextValue = setContextValue;

				return createElement(
					TestContext.Provider,
					{ value: contextValue },
					createElement(Consumer, null),
				);
			};

			render(createElement(App, null), container);

			expect(capturedValue).toBe("same");
			expect(renderCount).toBe(1);

			// Set to same value - our useState implementation doesn't re-render if value is the same
			(exposedSetContextValue as unknown as (value: string) => void)("same");

			expect(capturedValue).toBe("same");
			expect(renderCount).toBe(1); // Should stay 1 since value didn't change

			// Now set to different value - should trigger re-render
			(exposedSetContextValue as unknown as (value: string) => void)(
				"different",
			);

			expect(capturedValue).toBe("different");
			expect(renderCount).toBe(2); // Now should be 2
		});
	});

	// Edge case tests
	describe("Context Edge Cases", () => {
		test("should handle context changes with conditional rendering", () => {
			const TestContext = createContext("default");
			let capturedValue: string | undefined;
			let renderCount = 0;
			let exposedSetContextValue: ((value: string) => void) | null = null;
			let exposedSetShowConsumer: ((show: boolean) => void) | null = null;

			const ConditionalConsumer: FunctionalComponent<{ show: boolean }> = ({
				show,
			}) => {
				if (!show) {
					return createElement("div", null, "Hidden");
				}

				renderCount++;
				capturedValue = useContext(TestContext);
				return createElement("div", null, `Shown: ${capturedValue}`);
			};

			const App: FunctionalComponent = () => {
				const [contextValue, setContextValue] = useState("initial");
				const [showConsumer, setShowConsumer] = useState(true);

				exposedSetContextValue = setContextValue;
				exposedSetShowConsumer = setShowConsumer;

				return createElement(
					TestContext.Provider,
					{ value: contextValue },
					createElement(ConditionalConsumer, { show: showConsumer }),
				);
			};

			render(createElement(App, null), container);

			expect(capturedValue).toBe("initial");
			expect(renderCount).toBe(1);
			expect(container.textContent).toBe("Shown: initial");

			// Hide consumer
			(exposedSetShowConsumer as unknown as (show: boolean) => void)(false);
			expect(container.textContent).toBe("Hidden");

			// Change context while hidden
			(exposedSetContextValue as unknown as (value: string) => void)(
				"changed-while-hidden",
			);

			// Show consumer again - should see new value
			(exposedSetShowConsumer as unknown as (show: boolean) => void)(true);
			expect(capturedValue).toBe("changed-while-hidden");
			expect(container.textContent).toBe("Shown: changed-while-hidden");
		});

		test("should handle multiple contexts with independent changes", () => {
			const ThemeContext = createContext("light");
			const UserContext = createContext("anonymous");
			let capturedTheme: string | undefined;
			let capturedUser: string | undefined;
			let renderCount = 0;
			let exposedSetTheme: ((theme: string) => void) | null = null;
			let exposedSetUser: ((user: string) => void) | null = null;

			const Consumer: FunctionalComponent = () => {
				renderCount++;
				capturedTheme = useContext(ThemeContext);
				capturedUser = useContext(UserContext);
				return createElement(
					"div",
					null,
					`Theme: ${capturedTheme}, User: ${capturedUser}`,
				);
			};

			const App: FunctionalComponent = () => {
				const [theme, setTheme] = useState("light");
				const [user, setUser] = useState("anonymous");

				exposedSetTheme = setTheme;
				exposedSetUser = setUser;

				return createElement(
					ThemeContext.Provider,
					{ value: theme },
					createElement(
						UserContext.Provider,
						{ value: user },
						createElement(Consumer, null),
					),
				);
			};

			render(createElement(App, null), container);

			expect(capturedTheme).toBe("light");
			expect(capturedUser).toBe("anonymous");
			expect(renderCount).toBe(1);

			// Change only theme
			(exposedSetTheme as unknown as (theme: string) => void)("dark");
			expect(capturedTheme).toBe("dark");
			expect(capturedUser).toBe("anonymous");
			expect(renderCount).toBe(2);

			// Change only user
			(exposedSetUser as unknown as (user: string) => void)("alice");
			expect(capturedTheme).toBe("dark");
			expect(capturedUser).toBe("alice");
			expect(renderCount).toBe(3);
		});

		test("should handle context changes with falsy values", () => {
			const TestContext = createContext<string | number | boolean>("initial");
			let capturedValue: string | number | boolean | undefined;
			let exposedSetContextValue:
				| ((value: string | number | boolean) => void)
				| null = null;

			const Consumer: FunctionalComponent = () => {
				capturedValue = useContext(TestContext);
				return createElement("div", null, String(capturedValue));
			};

			const App: FunctionalComponent = () => {
				const [contextValue, setContextValue] = useState<
					string | number | boolean
				>("initial");
				exposedSetContextValue = setContextValue;

				return createElement(
					TestContext.Provider,
					{ value: contextValue },
					createElement(Consumer, null),
				);
			};

			render(createElement(App, null), container);
			expect(capturedValue).toBe("initial");

			// Test falsy values
			(
				exposedSetContextValue as unknown as (
					value: string | number | boolean,
				) => void
			)(0);
			expect(capturedValue).toBe(0);
			expect(container.textContent).toBe("0");

			(
				exposedSetContextValue as unknown as (
					value: string | number | boolean,
				) => void
			)(false);
			expect(capturedValue).toBe(false);
			expect(container.textContent).toBe("false");

			(
				exposedSetContextValue as unknown as (
					value: string | number | boolean,
				) => void
			)("");
			expect(capturedValue).toBe("");
			expect(container.textContent).toBe("");
		});

		test("should handle rapid context value changes", () => {
			const TestContext = createContext("initial");
			let capturedValue: string | undefined;
			let renderCount = 0;
			let exposedSetContextValue: ((value: string) => void) | null = null;

			const Consumer: FunctionalComponent = () => {
				renderCount++;
				capturedValue = useContext(TestContext);
				return createElement("div", null, capturedValue);
			};

			const App: FunctionalComponent = () => {
				const [contextValue, setContextValue] = useState("initial");
				exposedSetContextValue = setContextValue;

				return createElement(
					TestContext.Provider,
					{ value: contextValue },
					createElement(Consumer, null),
				);
			};

			render(createElement(App, null), container);

			const initialRenderCount = renderCount;

			// Rapid changes
			(exposedSetContextValue as unknown as (value: string) => void)("change1");
			(exposedSetContextValue as unknown as (value: string) => void)("change2");
			(exposedSetContextValue as unknown as (value: string) => void)("change3");
			(exposedSetContextValue as unknown as (value: string) => void)("final");

			expect(capturedValue).toBe("final");
			expect(renderCount).toBe(initialRenderCount + 4);
		});

		test("should handle context changes combined with component state", () => {
			const TestContext = createContext("context-initial");
			let capturedContextValue: string | undefined;
			let capturedLocalState: string | undefined;
			let renderCount = 0;
			let exposedSetContextValue: ((value: string) => void) | null = null;
			let exposedSetLocalState: ((value: string) => void) | null = null;

			const Consumer: FunctionalComponent = () => {
				renderCount++;
				const [localState, setLocalState] = useState("local-initial");
				capturedContextValue = useContext(TestContext);
				capturedLocalState = localState;

				exposedSetLocalState = setLocalState;

				return createElement(
					"div",
					null,
					`Context: ${capturedContextValue}, Local: ${localState}`,
				);
			};

			const App: FunctionalComponent = () => {
				const [contextValue, setContextValue] = useState("context-initial");
				exposedSetContextValue = setContextValue;

				return createElement(
					TestContext.Provider,
					{ value: contextValue },
					createElement(Consumer, null),
				);
			};

			render(createElement(App, null), container);

			expect(capturedContextValue).toBe("context-initial");
			expect(capturedLocalState).toBe("local-initial");
			expect(renderCount).toBe(1);

			// Change context value
			(exposedSetContextValue as unknown as (value: string) => void)(
				"context-changed",
			);
			expect(capturedContextValue).toBe("context-changed");
			expect(capturedLocalState).toBe("local-initial");
			expect(renderCount).toBe(2);

			// Change local state
			(exposedSetLocalState as unknown as (value: string) => void)(
				"local-changed",
			);
			expect(capturedContextValue).toBe("context-changed");
			expect(capturedLocalState).toBe("local-changed");
			expect(renderCount).toBe(3);
		});

		test("should handle context provider unmounting", () => {
			const TestContext = createContext("default");
			let capturedValue: string | undefined;
			let exposedSetHasProvider: ((hasProvider: boolean) => void) | null = null;

			const Consumer: FunctionalComponent = () => {
				capturedValue = useContext(TestContext);
				return createElement("div", null, capturedValue);
			};

			const ConditionalProvider: FunctionalComponent<{
				hasProvider: boolean;
			}> = ({ hasProvider }) => {
				if (hasProvider) {
					return createElement(
						TestContext.Provider,
						{ value: "provided" },
						createElement(Consumer, null),
					);
				}
				return createElement(Consumer, null);
			};

			const App: FunctionalComponent = () => {
				const [hasProvider, setHasProvider] = useState(true);
				exposedSetHasProvider = setHasProvider;

				return createElement(ConditionalProvider, { hasProvider });
			};

			render(createElement(App, null), container);

			expect(capturedValue).toBe("provided");
			expect(container.textContent).toBe("provided");

			// Remove provider
			(exposedSetHasProvider as unknown as (hasProvider: boolean) => void)(
				false,
			);
			expect(capturedValue).toBe("default");
			expect(container.textContent).toBe("default");

			// Restore provider
			(exposedSetHasProvider as unknown as (hasProvider: boolean) => void)(
				true,
			);
			expect(capturedValue).toBe("provided");
			expect(container.textContent).toBe("provided");
		});
	});
});
