import { beforeEach, describe, expect, test } from "bun:test";
import { createElement, render, useEffect, useState } from "../src/MiniReact";
import type { FunctionalComponent } from "../src/types";

describe("MiniReact.useEffect Hook", () => {
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

	test("should run effect on initial render", async () => {
		let effectRan = false;

		const Component = () => {
			useEffect(() => {
				effectRan = true;
			});

			return createElement("div", null, "Hello");
		};

		render(createElement(Component, null), container);

		// Wait for effect to run
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(effectRan).toBe(true);
	});

	test("should run effect with cleanup function", async () => {
		let effectRan = false;
		let cleanupRan = false;

		const Component = ({ shouldRender }: { shouldRender: boolean }) => {
			if (!shouldRender) return null;

			useEffect(() => {
				effectRan = true;
				return () => {
					cleanupRan = true;
				};
			});

			return createElement("div", null, "Hello");
		};

		// Initial render
		render(createElement(Component, { shouldRender: true }), container);
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(effectRan).toBe(true);
		expect(cleanupRan).toBe(false);

		// Unmount component
		render(createElement(Component, { shouldRender: false }), container);
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(cleanupRan).toBe(true);
	});

	test("should run effect with cleanup function - direct unmount", async () => {
		let effectRan = false;
		let cleanupRan = false;

		const Component = () => {
			useEffect(() => {
				effectRan = true;
				return () => {
					cleanupRan = true;
				};
			});

			return createElement("div", null, "Hello");
		};

		// Initial render
		render(createElement(Component, null), container);
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(effectRan).toBe(true);
		expect(cleanupRan).toBe(false);

		// Unmount component directly
		render(null, container);
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(cleanupRan).toBe(true);
	});

	test("should run effect with dependencies", async () => {
		let effectRunCount = 0;
		let setCount: ((value: number) => void) | undefined;

		const Component = () => {
			const [count, setCountHook] = useState(0);
			setCount = setCountHook;

			useEffect(() => {
				effectRunCount++;
			}, [count]);

			return createElement("div", null, `Count: ${count}`);
		};

		render(createElement(Component, null), container);
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(effectRunCount).toBe(1);

		// Update state - should trigger effect
		if (setCount) {
			setCount(1);
		}
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(effectRunCount).toBe(2);

		// Update with same value - should not trigger effect
		if (setCount) {
			setCount(1);
		}
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(effectRunCount).toBe(2);
	});

	test("should run effect with empty dependency array only once", async () => {
		let effectRunCount = 0;
		let setCount: ((value: number) => void) | undefined;

		const Component = () => {
			const [count, setCountHook] = useState(0);
			setCount = setCountHook;

			useEffect(() => {
				effectRunCount++;
			}, []); // Empty dependency array

			return createElement("div", null, `Count: ${count}`);
		};

		render(createElement(Component, null), container);
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(effectRunCount).toBe(1);

		// Update state - should NOT trigger effect
		if (setCount) {
			setCount(1);
		}
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(effectRunCount).toBe(1);

		// Update state again - should still NOT trigger effect
		if (setCount) {
			setCount(2);
		}
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(effectRunCount).toBe(1);
	});

	test("should run effect without dependencies on every render", async () => {
		let effectRunCount = 0;
		let setCount: ((value: number) => void) | undefined;

		const Component = () => {
			const [count, setCountHook] = useState(0);
			setCount = setCountHook;

			useEffect(() => {
				effectRunCount++;
			}); // No dependency array

			return createElement("div", null, `Count: ${count}`);
		};

		render(createElement(Component, null), container);
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(effectRunCount).toBe(1);

		// Update state - should trigger effect
		if (setCount) {
			setCount(1);
		}
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(effectRunCount).toBe(2);

		// Update state again - should trigger effect again
		if (setCount) {
			setCount(2);
		}
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(effectRunCount).toBe(3);
	});

	test("should handle multiple effects in same component", async () => {
		let effect1RunCount = 0;
		let effect2RunCount = 0;
		let setCount: ((value: number) => void) | undefined;

		const Component = () => {
			const [count, setCountHook] = useState(0);
			setCount = setCountHook;

			useEffect(() => {
				effect1RunCount++;
			}, []);

			useEffect(() => {
				effect2RunCount++;
			}, [count]);

			return createElement("div", null, `Count: ${count}`);
		};

		render(createElement(Component, null), container);
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(effect1RunCount).toBe(1);
		expect(effect2RunCount).toBe(1);

		// Update state
		if (setCount) {
			setCount(1);
		}
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(effect1RunCount).toBe(1); // Should not run again (empty deps)
		expect(effect2RunCount).toBe(2); // Should run again (depends on count)
	});

	test("should handle effect with complex dependencies", async () => {
		let effectRunCount = 0;
		let setUser: ((value: { name: string; age: number }) => void) | undefined;

		const Component = () => {
			const [user, setUserHook] = useState({ name: "John", age: 25 });
			setUser = setUserHook;

			useEffect(() => {
				effectRunCount++;
			}, [user.name, user.age]);

			return createElement("div", null, `${user.name}: ${user.age}`);
		};

		render(createElement(Component, null), container);
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(effectRunCount).toBe(1);

		// Update user object
		if (setUser) {
			setUser({ name: "Jane", age: 25 });
		}
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(effectRunCount).toBe(2); // Name changed

		// Update age
		if (setUser) {
			setUser({ name: "Jane", age: 30 });
		}
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(effectRunCount).toBe(3); // Age changed
	});

	test("should clean up effects when dependencies change", async () => {
		let cleanupCount = 0;
		let setToggle: ((value: boolean) => void) | undefined;

		const Component = () => {
			const [toggle, setToggleHook] = useState(false);
			setToggle = setToggleHook;

			useEffect(() => {
				return () => {
					cleanupCount++;
				};
			}, [toggle]);

			return createElement("div", null, `Toggle: ${toggle}`);
		};

		render(createElement(Component, null), container);
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(cleanupCount).toBe(0);

		// Change dependency
		if (setToggle) {
			setToggle(true);
		}
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(cleanupCount).toBe(1); // Previous effect cleaned up

		// Change dependency again
		if (setToggle) {
			setToggle(false);
		}
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(cleanupCount).toBe(2); // Previous effect cleaned up again
	});

	test("should throw error when useEffect called outside component", () => {
		expect(() => {
			useEffect(() => { });
		}).toThrow("useEffect must be called inside a functional component");
	});

	test("should handle effect that modifies DOM", async () => {
		const Component = () => {
			useEffect(() => {
				document.title = "Effect Test";
			});

			return createElement("div", null, "Hello");
		};

		render(createElement(Component, null), container);
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(document.title).toBe("Effect Test");
	});

	test("should handle effects in nested components", async () => {
		let parentEffectRan = false;
		let childEffectRan = false;

		const Child: FunctionalComponent = () => {
			useEffect(() => {
				childEffectRan = true;
			});

			return createElement("span", null, "Child");
		};

		const Parent: FunctionalComponent = () => {
			useEffect(() => {
				parentEffectRan = true;
			});

			return createElement("div", null, "Parent", createElement(Child, null));
		};

		render(createElement(Parent, null), container);
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(parentEffectRan).toBe(true);
		expect(childEffectRan).toBe(true);
	});

	test("should handle effect hook order consistency", async () => {
		let effect1Runs = 0;
		let effect2Runs = 0;
		let setCondition: ((value: boolean) => void) | undefined;

		const Component = () => {
			const [condition, setConditionHook] = useState(true);
			setCondition = setConditionHook;

			// First effect
			useEffect(() => {
				effect1Runs++;
			}, []);

			// Second effect (should always be in the same order)
			useEffect(() => {
				effect2Runs++;
			}, [condition]);

			return createElement("div", null, `Condition: ${condition}`);
		};

		render(createElement(Component, null), container);
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(effect1Runs).toBe(1);
		expect(effect2Runs).toBe(1);

		// Update condition
		if (setCondition) {
			setCondition(false);
		}
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(effect1Runs).toBe(1); // Should not run again
		expect(effect2Runs).toBe(2); // Should run again
	});
});
