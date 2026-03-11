import { beforeEach, describe, expect, test } from "bun:test";
import { createElement, memo } from "@/MiniReact";
import type { FiberRoot } from "@/fiber";
import { useStateFiber } from "@/fiber";
import { createTestRoot, renderFiber } from "@tests/helpers/fiberTestUtils";

describe("Fiber Memo", () => {
	let container: HTMLElement;
	let root: FiberRoot;

	beforeEach(() => {
		({ container, root } = createTestRoot());
	});

	// P1.6a: Memo prevents re-render
	test("should prevent re-render when props have not changed", async () => {
		let childRenderCount = 0;
		let setParentState: ((value: number) => void) | undefined;

		const Child = memo(({ label }: { label: string }) => {
			childRenderCount++;
			return createElement("span", null, label);
		});

		const Parent = () => {
			const [count, setCount] = useStateFiber(0);
			setParentState = setCount;
			return createElement(
				"div",
				null,
				createElement("p", null, String(count)),
				createElement(Child, { label: "static" }),
			);
		};

		renderFiber(createElement(Parent, null), root);
		expect(childRenderCount).toBe(1);
		expect(container.textContent).toContain("static");

		// Update parent state — child props haven't changed
		setParentState?.(1);
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(childRenderCount).toBe(1); // Should NOT re-render
	});

	// P1.6b: Memo with empty children arrays
	test("should treat empty children arrays as equal", async () => {
		let childRenderCount = 0;
		let setParentState: ((value: number) => void) | undefined;

		// Component receives no explicit children, but createElement creates children: []
		const MemoChild = memo((_props: Record<string, unknown>) => {
			childRenderCount++;
			return createElement("span", null, "memo-child");
		});

		const Parent = () => {
			const [count, setCount] = useStateFiber(0);
			setParentState = setCount;
			return createElement(
				"div",
				null,
				createElement("p", null, String(count)),
				createElement(MemoChild, {}),
			);
		};

		renderFiber(createElement(Parent, null), root);
		expect(childRenderCount).toBe(1);

		// Re-render parent: MemoChild gets new children: [] each time
		setParentState?.(1);
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(childRenderCount).toBe(1); // shallowEqual should treat [] === []
	});
});
