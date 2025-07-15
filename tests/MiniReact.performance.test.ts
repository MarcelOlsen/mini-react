import { beforeEach, describe, expect, test } from "bun:test";
import {
	createElement,
	render,
	startProfiling,
	stopProfiling,
	useState,
} from "../src/MiniReact";

describe("MiniReact.Performance Tools", () => {
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

	test("should measure render performance", async () => {
		let setState: ((value: number) => void) | undefined;

		const Component = () => {
			const [count, setCount] = useState(0);
			setState = setCount;

			// Simulate some work
			for (let i = 0; i < 1000; i++) {
				Math.random();
			}

			return createElement("div", null, `Count: ${count}`);
		};

		startProfiling();
		render(createElement(Component, null), container);

		if (setState) {
			setState(1);
		}

		await new Promise((resolve) => setTimeout(resolve, 10));
		const metrics = stopProfiling();

		expect(metrics).toBeDefined();
		expect(metrics.renderCount).toBeGreaterThan(0);
		expect(metrics.totalRenderTime).toBeGreaterThan(0);
		expect(metrics.averageRenderTime).toBeGreaterThan(0);
	});

	test("should track component render counts", async () => {
		let setState: ((value: number) => void) | undefined;

		const Component = () => {
			const [count, setCount] = useState(0);
			setState = setCount;
			return createElement("div", null, `Count: ${count}`);
		};

		startProfiling();
		render(createElement(Component, null), container);

		// Trigger multiple re-renders
		for (let i = 1; i <= 5; i++) {
			if (setState) {
				setState(i);
			}
			await new Promise((resolve) => setTimeout(resolve, 5));
		}

		const metrics = stopProfiling();
		expect(metrics.renderCount).toBe(6); // Initial + 5 updates
	});
});
