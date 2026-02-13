import { beforeEach, describe, expect, test } from "bun:test";
import { createElement } from "@/MiniReact";
import type { FiberRoot } from "@/fiber";
import { useStateFiber } from "@/fiber";
import { createTestRoot, renderFiber } from "@tests/helpers/fiberTestUtils";

describe("Fiber Event Handling", () => {
	let container: HTMLElement;
	let root: FiberRoot;

	beforeEach(() => {
		({ container, root } = createTestRoot());
	});

	test("should handle click events", async () => {
		let clicked = false;

		const Component = () => {
			return createElement(
				"button",
				{
					onClick: () => {
						clicked = true;
					},
				},
				"Click Me",
			);
		};

		renderFiber(createElement(Component, null), root);
		const button = container.querySelector("button");
		button?.click();
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(clicked).toBe(true);
	});

	test("should update event handlers", async () => {
		let clickCount = 0;
		let setState: ((value: number) => void) | undefined;

		const Component = () => {
			const [multiplier, setMultiplier] = useStateFiber(1);
			setState = setMultiplier;
			return createElement(
				"button",
				{
					onClick: () => {
						clickCount += multiplier;
					},
				},
				"Click",
			);
		};

		renderFiber(createElement(Component, null), root);
		const button = container.querySelector("button");

		button?.click();
		expect(clickCount).toBe(1);

		setState?.(2);
		await new Promise((resolve) => setTimeout(resolve, 10));

		button?.click();
		expect(clickCount).toBe(3); // 1 + 2
	});
});
