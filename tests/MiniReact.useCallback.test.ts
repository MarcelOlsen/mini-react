import { beforeEach, describe, expect, test } from "bun:test";
import {
	createElement,
	memo,
	render,
	useCallback,
	useState,
} from "../src/MiniReact";

describe("MiniReact.useCallback Hook", () => {
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

	test("should memoize callback functions", async () => {
		let childRenderCount = 0;
		let setState: ((value: number) => void) | undefined;
		let setOtherState: ((value: string) => void) | undefined;
		let capturedCallback: (() => void) | null = null;

		const Child = memo(({ onClick }: { onClick: () => void }) => {
			childRenderCount++;
			capturedCallback = onClick;
			return createElement("button", { onClick }, "Click me");
		});

		const Parent = () => {
			const [count, setCount] = useState(0);
			const [other, setOther] = useState("initial");
			setState = setCount;
			setOtherState = setOther;

			const handleClick = useCallback(() => {
				setCount(count + 1);
			}, [count]);

			return createElement(
				"div",
				null,
				createElement("div", null, `Count: ${count}, Other: ${other}`),
				createElement(Child, { onClick: handleClick }),
			);
		};

		render(createElement(Parent, null), container);
		expect(childRenderCount).toBe(1);
		const firstCallback = capturedCallback;

		// Update other state - callback should remain the same
		if (setOtherState) {
			setOtherState("updated");
		}

		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(childRenderCount).toBe(1); // Child should not re-render
		expect(capturedCallback).toBe(firstCallback); // Same callback reference

		// Update dependency - callback should change
		if (setState) {
			setState(1);
		}

		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(childRenderCount).toBe(2); // Child should re-render
		expect(capturedCallback).not.toBe(firstCallback); // Different callback reference
	});

	test("should handle empty dependency array", async () => {
		let _callbackCallCount = 0;
		let setState: ((value: number) => void) | undefined;
		let capturedCallback: (() => void) | null = null;

		const Component = () => {
			const [count, setCount] = useState(0);
			setState = setCount;

			const stableCallback = useCallback(() => {
				_callbackCallCount++;
			}, []);

			capturedCallback = stableCallback;

			return createElement("div", null, `Count: ${count}`);
		};

		render(createElement(Component, null), container);
		const firstCallback = capturedCallback;

		// Update state - callback should remain the same
		if (setState) {
			setState(5);
		}

		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(capturedCallback).toBe(firstCallback); // Same callback reference
	});
});
