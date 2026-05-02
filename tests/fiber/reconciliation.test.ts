import { beforeEach, describe, expect, test } from "bun:test";
import { createElement } from "@/MiniReact";
import { FRAGMENT } from "@/core/types";
import type { FiberRoot } from "@/fiber";
import { createTestRoot, renderFiber } from "@tests/helpers/fiberTestUtils";

describe("Fiber Reconciliation", () => {
	let container: HTMLElement;
	let root: FiberRoot;

	beforeEach(() => {
		({ container, root } = createTestRoot());
	});

	describe("Child Reconciliation", () => {
		test("should add new children", () => {
			renderFiber(
				createElement("div", null, createElement("span", { key: "1" }, "A")),
				root,
			);
			expect(container.querySelectorAll("span").length).toBe(1);

			renderFiber(
				createElement(
					"div",
					null,
					createElement("span", { key: "1" }, "A"),
					createElement("span", { key: "2" }, "B"),
				),
				root,
			);
			expect(container.querySelectorAll("span").length).toBe(2);
		});

		test("should remove children", () => {
			renderFiber(
				createElement(
					"div",
					null,
					createElement("span", { key: "1" }, "A"),
					createElement("span", { key: "2" }, "B"),
				),
				root,
			);
			expect(container.querySelectorAll("span").length).toBe(2);

			renderFiber(
				createElement("div", null, createElement("span", { key: "1" }, "A")),
				root,
			);
			expect(container.querySelectorAll("span").length).toBe(1);
		});

		test("should reorder children with keys", () => {
			renderFiber(
				createElement(
					"div",
					null,
					createElement("span", { key: "a" }, "A"),
					createElement("span", { key: "b" }, "B"),
					createElement("span", { key: "c" }, "C"),
				),
				root,
			);
			expect(container.textContent).toBe("ABC");

			renderFiber(
				createElement(
					"div",
					null,
					createElement("span", { key: "c" }, "C"),
					createElement("span", { key: "a" }, "A"),
					createElement("span", { key: "b" }, "B"),
				),
				root,
			);
			expect(container.textContent).toBe("CAB");
		});

		test("should replace element when type changes", () => {
			renderFiber(createElement("div", null, "Content"), root);
			expect(container.querySelector("div")).not.toBeNull();

			renderFiber(createElement("span", null, "Content"), root);
			expect(container.querySelector("div")).toBeNull();
			expect(container.querySelector("span")).not.toBeNull();
		});
	});

	describe("Fragments", () => {
		test("should render fragment children directly into parent", () => {
			renderFiber(
				createElement(
					"div",
					null,
					createElement(
						FRAGMENT,
						null,
						createElement("span", null, "A"),
						createElement("span", null, "B"),
					),
				),
				root,
			);
			expect(container.querySelectorAll("span").length).toBe(2);
			expect(container.textContent).toBe("AB");
		});

		test("should render top-level fragment", () => {
			renderFiber(
				createElement(
					FRAGMENT,
					null,
					createElement("span", null, "X"),
					createElement("span", null, "Y"),
				),
				root,
			);
			expect(container.querySelectorAll("span").length).toBe(2);
			expect(container.textContent).toBe("XY");
		});
	});

	// P1.1: O(n^2) commit traversal regression
	describe("Performance", () => {
		test("should handle 100 keyed items without hanging", () => {
			const items = Array.from({ length: 100 }, (_, i) =>
				createElement("div", { key: String(i) }, `Item ${i}`),
			);

			const start = performance.now();
			renderFiber(createElement("div", null, ...items), root);
			const elapsed = performance.now() - start;

			expect(elapsed).toBeLessThan(500);
			expect(container.querySelectorAll("div").length).toBe(101); // 1 parent + 100 children
		});
	});

	// P2.3: Two-pass algorithm trigger
	describe("Key reordering (two-pass)", () => {
		test("should handle complete reorder triggering second pass", () => {
			renderFiber(
				createElement(
					"div",
					null,
					createElement("span", { key: "a" }, "A"),
					createElement("span", { key: "b" }, "B"),
					createElement("span", { key: "c" }, "C"),
				),
				root,
			);
			expect(container.textContent).toBe("ABC");

			// Completely different order at position 0 - triggers map-based pass
			renderFiber(
				createElement(
					"div",
					null,
					createElement("span", { key: "c" }, "C"),
					createElement("span", { key: "a" }, "A"),
					createElement("span", { key: "b" }, "B"),
				),
				root,
			);
			expect(container.textContent).toBe("CAB");
			expect(container.querySelectorAll("span").length).toBe(3);
		});
	});

	// P2.4: Key match but type differs
	describe("Key reuse with type change", () => {
		test("should delete and recreate when same key but different type", () => {
			// Use section > p (key=x) first, then section > span (key=x)
			renderFiber(
				createElement("section", null, createElement("p", { key: "x" }, "old")),
				root,
			);
			expect(container.querySelector("p")).not.toBeNull();
			expect(container.querySelector("p")?.textContent).toBe("old");

			renderFiber(
				createElement(
					"section",
					null,
					createElement("span", { key: "x" }, "new"),
				),
				root,
			);
			// Old p should be gone, new span should exist
			expect(container.querySelector("p")).toBeNull();
			expect(container.querySelector("span")).not.toBeNull();
			expect(container.querySelector("span")?.textContent).toBe("new");
		});
	});

	// P2.5: Minimum DOM moves
	describe("Minimum DOM moves", () => {
		test("should minimize DOM operations on reorder", () => {
			renderFiber(
				createElement(
					"div",
					null,
					createElement("span", { key: "a" }, "A"),
					createElement("span", { key: "b" }, "B"),
					createElement("span", { key: "c" }, "C"),
					createElement("span", { key: "d" }, "D"),
				),
				root,
			);

			// Reorder: move d to front
			renderFiber(
				createElement(
					"div",
					null,
					createElement("span", { key: "d" }, "D"),
					createElement("span", { key: "a" }, "A"),
					createElement("span", { key: "b" }, "B"),
					createElement("span", { key: "c" }, "C"),
				),
				root,
			);

			// Verify final order is correct
			expect(container.textContent).toBe("DABC");
			const spans = container.querySelectorAll("span");
			expect(spans.length).toBe(4);
			expect(spans[0]?.textContent).toBe("D");
			expect(spans[1]?.textContent).toBe("A");
			expect(spans[2]?.textContent).toBe("B");
			expect(spans[3]?.textContent).toBe("C");
		});
	});
});
