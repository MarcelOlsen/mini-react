import { beforeEach, describe, expect, test } from "bun:test";
import { createElement } from "@/MiniReact";
import type { FiberRoot } from "@/fiber";
import { useStateFiber } from "@/fiber";
import { createTestRoot, renderFiber } from "@tests/helpers/fiberTestUtils";

describe("Fiber Refs", () => {
	let container: HTMLElement;
	let root: FiberRoot;

	beforeEach(() => {
		({ container, root } = createTestRoot());
	});

	// P8.1: Callback refs
	test("should call callback ref with element on mount and null on unmount", () => {
		let captured: Element | null = null;
		const log: (Element | null)[] = [];

		const Component = () => {
			return createElement(
				"div",
				{
					ref: (el: Element | null) => {
						captured = el;
						log.push(el);
					},
				},
				"Callback Ref",
			);
		};

		renderFiber(createElement(Component, null), root);
		expect(captured).toBeInstanceOf(Element);
		expect(log.length).toBe(1);

		// Unmount
		renderFiber(null, root);
		expect(log).toContain(null);
	});

	// P8.2: Ref persists across re-renders
	test("should keep ref attached across re-renders", async () => {
		const ref = { current: null as Element | null };
		let setState: ((value: number) => void) | undefined;

		const Component = () => {
			const [count, setCount] = useStateFiber(0);
			setState = setCount;
			return createElement("div", { ref }, `Count: ${count}`);
		};

		renderFiber(createElement(Component, null), root);
		expect(ref.current).toBeInstanceOf(Element);
		const firstElement = ref.current;

		// Re-render with same ref
		setState?.(1);
		await new Promise((resolve) => setTimeout(resolve, 10));
		// Ref should still point to the same DOM element (reused)
		expect(ref.current).toBeInstanceOf(Element);
		expect(ref.current).toBe(firstElement);
		expect(container.textContent).toBe("Count: 1");
	});

	// P8.3: Ref cleanup during deletion
	test("should set ref to null when component unmounts", () => {
		const ref = { current: null as Element | null };

		const Component = () => {
			return createElement("div", { ref }, "Ref Cleanup");
		};

		renderFiber(createElement(Component, null), root);
		expect(ref.current).toBeInstanceOf(Element);

		renderFiber(null, root);
		expect(ref.current).toBeNull();
	});
});
