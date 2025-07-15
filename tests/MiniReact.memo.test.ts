import { beforeEach, describe, expect, test } from "bun:test";
import { createElement, memo, render, useState } from "../src/MiniReact";

describe("MiniReact.memo Component Memoization", () => {
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

	test("should prevent re-render when props haven't changed", async () => {
		let childRenderCount = 0;
		let setParentState: ((value: string) => void) | undefined;

		const Child = memo(({ value }: { value: number }) => {
			childRenderCount++;
			return createElement("div", null, `Child: ${value}`);
		});

		const Parent = () => {
			const [count] = useState(0);
			const [otherState, setOtherState] = useState("initial");
			setParentState = setOtherState;

			return createElement(
				"div",
				null,
				createElement("div", null, `Parent: ${otherState}`),
				createElement(Child, { value: count }),
			);
		};

		render(createElement(Parent, null), container);
		expect(childRenderCount).toBe(1);
		expect(container.textContent).toContain("Child: 0");

		// Update parent state that doesn't affect child props
		if (setParentState) {
			setParentState("updated");
		}

		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(childRenderCount).toBe(1); // Should not re-render
		expect(container.textContent).toContain("Parent: updated");
		expect(container.textContent).toContain("Child: 0");
	});

	test("should re-render when props change", async () => {
		let childRenderCount = 0;
		let setCount: ((value: number) => void) | undefined;

		const Child = memo(({ value }: { value: number }) => {
			childRenderCount++;
			return createElement("div", null, `Child: ${value}`);
		});

		const Parent = () => {
			const [count, setCountState] = useState(0);
			setCount = setCountState;

			return createElement(Child, { value: count });
		};

		render(createElement(Parent, null), container);
		expect(childRenderCount).toBe(1);

		// Update prop that should trigger re-render
		if (setCount) {
			setCount(1);
		}

		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(childRenderCount).toBe(2); // Should re-render
		expect(container.textContent).toContain("Child: 1");
	});

	test("should support custom comparison function", async () => {
		let childRenderCount = 0;
		let setUser: ((value: { name: string; age: number }) => void) | undefined;

		interface User {
			name: string;
			age: number;
		}

		// Custom comparison that only checks name
		const areEqual = (prevProps: { user: User }, nextProps: { user: User }) => {
			return prevProps.user.name === nextProps.user.name;
		};

		const Child = memo(({ user }: { user: User }) => {
			childRenderCount++;
			return createElement("div", null, `User: ${user.name}, Age: ${user.age}`);
		}, areEqual);

		const Parent = () => {
			const [user, setUserState] = useState({ name: "John", age: 25 });
			setUser = setUserState;

			return createElement(Child, { user });
		};

		render(createElement(Parent, null), container);
		expect(childRenderCount).toBe(1);

		// Update age only - should not re-render due to custom comparison
		if (setUser) {
			setUser({ name: "John", age: 26 });
		}

		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(childRenderCount).toBe(1); // Should not re-render

		// Update name - should re-render
		if (setUser) {
			setUser({ name: "Jane", age: 26 });
		}

		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(childRenderCount).toBe(2); // Should re-render
		expect(container.textContent).toContain("User: Jane, Age: 26");
	});

	test("should handle complex nested props", async () => {
		let childRenderCount = 0;
		let setData:
			| ((value: { items: string[]; meta: { count: number } }) => void)
			| undefined;

		const Child = memo(
			({ data }: { data: { items: string[]; meta: { count: number } } }) => {
				childRenderCount++;
				return createElement(
					"div",
					null,
					`Items: ${data.items.join(", ")}, Count: ${data.meta.count}`,
				);
			},
		);

		const Parent = () => {
			const [data, setDataState] = useState({
				items: ["a", "b"],
				meta: { count: 2 },
			});
			setData = setDataState;

			return createElement(Child, { data });
		};

		render(createElement(Parent, null), container);
		expect(childRenderCount).toBe(1);

		// Update with same structure but different object reference
		if (setData) {
			setData({
				items: ["a", "b"],
				meta: { count: 2 },
			});
		}

		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(childRenderCount).toBe(2); // Should re-render due to shallow comparison
	});
});
