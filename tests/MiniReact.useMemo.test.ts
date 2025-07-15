import { beforeEach, describe, expect, test } from "bun:test";
import { createElement, render, useMemo, useState } from "../src/MiniReact";

describe("MiniReact.useMemo Hook", () => {
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

	test("should memoize expensive calculations", async () => {
		let expensiveCallCount = 0;
		let setState: ((value: number) => void) | undefined;
		let setOtherState: ((value: string) => void) | undefined;

		const expensiveCalculation = (num: number) => {
			expensiveCallCount++;
			return num * num;
		};

		const Component = () => {
			const [count, setCount] = useState(5);
			const [other, setOther] = useState("initial");
			setState = setCount;
			setOtherState = setOther;

			const memoizedValue = useMemo(() => expensiveCalculation(count), [count]);

			return createElement(
				"div",
				null,
				`Result: ${memoizedValue}, Other: ${other}`,
			);
		};

		render(createElement(Component, null), container);
		expect(expensiveCallCount).toBe(1);
		expect(container.textContent).toContain("Result: 25");

		// Update other state - should not recalculate
		if (setOtherState) {
			setOtherState("updated");
		}

		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(expensiveCallCount).toBe(1); // Should not recalculate
		expect(container.textContent).toContain("Result: 25, Other: updated");

		// Update dependency - should recalculate
		if (setState) {
			setState(6);
		}

		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(expensiveCallCount).toBe(2); // Should recalculate
		expect(container.textContent).toContain("Result: 36");
	});

	test("should handle multiple dependencies", async () => {
		let calculationCount = 0;
		let setA: ((value: number) => void) | undefined;
		let _setB: ((value: number) => void) | undefined;
		let setC: ((value: number) => void) | undefined;

		const Component = () => {
			const [a, setAState] = useState(1);
			const [b, setBState] = useState(2);
			const [c, setCState] = useState(3);
			setA = setAState;
			_setB = setBState;
			setC = setCState;

			const result = useMemo(() => {
				calculationCount++;
				return a + b;
			}, [a, b]);

			return createElement("div", null, `Result: ${result}, C: ${c}`);
		};

		render(createElement(Component, null), container);
		expect(calculationCount).toBe(1);
		expect(container.textContent).toContain("Result: 3");

		// Update non-dependency - should not recalculate
		if (setC) {
			setC(10);
		}

		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(calculationCount).toBe(1);

		// Update one dependency - should recalculate
		if (setA) {
			setA(5);
		}

		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(calculationCount).toBe(2);
		expect(container.textContent).toContain("Result: 7");
	});

	test("should handle empty dependency array", async () => {
		let calculationCount = 0;
		let setState: ((value: number) => void) | undefined;

		const Component = () => {
			const [count, setCount] = useState(0);
			setState = setCount;

			const constantValue = useMemo(() => {
				calculationCount++;
				return "constant";
			}, []);

			return createElement(
				"div",
				null,
				`Value: ${constantValue}, Count: ${count}`,
			);
		};

		render(createElement(Component, null), container);
		expect(calculationCount).toBe(1);

		// Update state - should not recalculate memoized value
		if (setState) {
			setState(5);
		}

		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(calculationCount).toBe(1); // Should not recalculate
		expect(container.textContent).toContain("Value: constant, Count: 5");
	});
});
