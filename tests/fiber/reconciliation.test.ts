/**
 * Reconciliation Algorithm Tests
 *
 * These tests validate the child reconciliation algorithm:
 * - Single child reconciliation
 * - Multiple children reconciliation
 * - Key-based diffing
 * - Fiber reuse
 * - Additions, deletions, updates, reordering
 */

import { describe, expect, test } from "bun:test";
import {
	Placement,
	UpdateEffect,
	createFiber,
	reconcileChildren,
} from "../../src/fiber";
import type { Fiber } from "../../src/fiber";

describe("Child Reconciliation", () => {
	describe("Single Child Reconciliation", () => {
		test("should create new fiber for new element (mount)", () => {
			const parent = createFiber("div", {}, null);

			// No current children
			reconcileChildren(null, parent, [
				{ type: "span", props: { children: [] } },
			]);

			expect(parent.child).not.toBeNull();
			expect(parent.child?.type).toBe("span");
			expect(parent.child?.effectTag).toBe(Placement);
		});

		test("should reuse fiber when type and key match (update)", () => {
			const parent = createFiber("div", {}, null);

			// Create current fiber
			const current = createFiber("div", {}, null);
			const currentChild = createFiber("span", { id: "old" }, "key1");
			current.child = currentChild;

			// Reconcile with same type and key
			reconcileChildren(current, parent, [
				{ type: "span", props: { id: "new", children: [], key: "key1" } },
			]);

			expect(parent.child).not.toBeNull();
			expect(parent.child?.type).toBe("span");
			expect(parent.child?.effectTag).toBe(UpdateEffect);
			// Should reuse fiber via alternate
			expect(parent.child?.alternate).toBe(currentChild);
		});

		test("should create new fiber when type changes", () => {
			const parent = createFiber("div", {}, null);

			// Current child is span
			const current = createFiber("div", {}, null);
			const currentChild = createFiber("span", {}, null);
			current.child = currentChild;

			// New child is div (different type)
			reconcileChildren(current, parent, [
				{ type: "div", props: { children: [] } },
			]);

			expect(parent.child).not.toBeNull();
			expect(parent.child?.type).toBe("div");
			expect(parent.child?.effectTag).toBe(Placement);
			// Should NOT reuse old fiber
			expect(parent.child?.alternate).not.toBe(currentChild);
		});

		test("should delete old children when new child is different", () => {
			const parent = createFiber("div", {}, null);

			const current = createFiber("div", {}, null);
			const child1 = createFiber("span", {}, "key1");
			const child2 = createFiber("div", {}, "key2");
			child1.sibling = child2;
			current.child = child1;

			// New child with different key
			reconcileChildren(current, parent, [
				{ type: "p", props: { key: "key3", children: [] } },
			]);

			expect(parent.child).not.toBeNull();
			expect(parent.child?.type).toBe("p");

			// Old children should be marked for deletion
			expect(parent.deletions).toBeDefined();
			expect(parent.deletions?.length).toBeGreaterThan(0);
		});

		test("should handle null children", () => {
			const parent = createFiber("div", {}, null);

			reconcileChildren(null, parent, [null, undefined]);

			// Should handle gracefully
			expect(parent.child).toBeNull();
		});
	});

	describe("Multiple Children Reconciliation", () => {
		test("should create all new fibers (mount)", () => {
			const parent = createFiber("div", {}, null);

			reconcileChildren(null, parent, [
				{ type: "span", props: { children: [] } },
				{ type: "div", props: { children: [] } },
				{ type: "p", props: { children: [] } },
			]);

			// Check all children created
			expect(parent.child).not.toBeNull();
			expect(parent.child?.sibling).not.toBeNull();
			expect(parent.child?.sibling?.sibling).not.toBeNull();

			// All should be PLACEMENT
			expect(parent.child?.effectTag).toBe(Placement);
			expect(parent.child?.sibling?.effectTag).toBe(Placement);
			expect(parent.child?.sibling?.sibling?.effectTag).toBe(Placement);
		});

		test("should reuse all fibers when order unchanged", () => {
			const parent = createFiber("div", {}, null);

			// Current children
			const current = createFiber("div", {}, null);
			const child1 = createFiber("span", {}, "a");
			const child2 = createFiber("div", {}, "b");
			const child3 = createFiber("p", {}, "c");
			child1.sibling = child2;
			child2.sibling = child3;
			current.child = child1;

			// Same children, same order
			reconcileChildren(current, parent, [
				{ type: "span", props: { key: "a", children: [] } },
				{ type: "div", props: { key: "b", children: [] } },
				{ type: "p", props: { key: "c", children: [] } },
			]);

			// All should be reused (UPDATE, not PLACEMENT)
			let child = parent.child;
			let count = 0;
			while (child) {
				expect(child.effectTag).toBe(UpdateEffect);
				count++;
				child = child.sibling;
			}
			expect(count).toBe(3);
		});

		test("should handle reordering with keys", () => {
			const parent = createFiber("div", {}, null);

			// Current order: a, b, c
			const current = createFiber("div", {}, null);
			const child1 = createFiber("span", {}, "a");
			const child2 = createFiber("div", {}, "b");
			const child3 = createFiber("p", {}, "c");
			child1.sibling = child2;
			child2.sibling = child3;
			current.child = child1;

			// New order: c, a, b
			reconcileChildren(current, parent, [
				{ type: "p", props: { key: "c", children: [] } },
				{ type: "span", props: { key: "a", children: [] } },
				{ type: "div", props: { key: "b", children: [] } },
			]);

			// Check new order
			expect(parent.child?.key).toBe("c");
			expect(parent.child?.sibling?.key).toBe("a");
			expect(parent.child?.sibling?.sibling?.key).toBe("b");

			// All should be reused (UPDATE)
			expect(parent.child?.effectTag).toBe(UpdateEffect);
			expect(parent.child?.sibling?.effectTag).toBe(UpdateEffect);
		});

		test("should add new children at end", () => {
			const parent = createFiber("div", {}, null);

			// Current: a, b
			const current = createFiber("div", {}, null);
			const child1 = createFiber("span", {}, "a");
			const child2 = createFiber("div", {}, "b");
			child1.sibling = child2;
			current.child = child1;

			// New: a, b, c, d
			reconcileChildren(current, parent, [
				{ type: "span", props: { key: "a", children: [] } },
				{ type: "div", props: { key: "b", children: [] } },
				{ type: "p", props: { key: "c", children: [] } },
				{ type: "section", props: { key: "d", children: [] } },
			]);

			// First two reused, last two created
			expect(parent.child?.effectTag).toBe(UpdateEffect);
			expect(parent.child?.sibling?.effectTag).toBe(UpdateEffect);
			expect(parent.child?.sibling?.sibling?.effectTag).toBe(Placement);
			expect(parent.child?.sibling?.sibling?.sibling?.effectTag).toBe(
				Placement,
			);
		});

		test("should remove children from end", () => {
			const parent = createFiber("div", {}, null);

			// Current: a, b, c, d
			const current = createFiber("div", {}, null);
			const child1 = createFiber("span", {}, "a");
			const child2 = createFiber("div", {}, "b");
			const child3 = createFiber("p", {}, "c");
			const child4 = createFiber("section", {}, "d");
			child1.sibling = child2;
			child2.sibling = child3;
			child3.sibling = child4;
			current.child = child1;

			// New: a, b
			reconcileChildren(current, parent, [
				{ type: "span", props: { key: "a", children: [] } },
				{ type: "div", props: { key: "b", children: [] } },
			]);

			// First two reused
			expect(parent.child?.effectTag).toBe(UpdateEffect);
			expect(parent.child?.sibling?.effectTag).toBe(UpdateEffect);
			expect(parent.child?.sibling?.sibling).toBeNull();

			// Last two should be marked for deletion
			expect(parent.deletions).toBeDefined();
			expect(parent.deletions?.length).toBeGreaterThanOrEqual(2);
		});

		test("should handle insertions in middle", () => {
			const parent = createFiber("div", {}, null);

			// Current: a, c
			const current = createFiber("div", {}, null);
			const child1 = createFiber("span", {}, "a");
			const child2 = createFiber("p", {}, "c");
			child1.sibling = child2;
			current.child = child1;

			// New: a, b, c (insert b in middle)
			reconcileChildren(current, parent, [
				{ type: "span", props: { key: "a", children: [] } },
				{ type: "div", props: { key: "b", children: [] } },
				{ type: "p", props: { key: "c", children: [] } },
			]);

			expect(parent.child?.key).toBe("a");
			expect(parent.child?.sibling?.key).toBe("b");
			expect(parent.child?.sibling?.sibling?.key).toBe("c");

			// a and c reused, b created
			expect(parent.child?.effectTag).toBe(UpdateEffect);
			expect(parent.child?.sibling?.effectTag).toBe(Placement);
			expect(parent.child?.sibling?.sibling?.effectTag).toBe(UpdateEffect);
		});

		test("should handle complete replacement", () => {
			const parent = createFiber("div", {}, null);

			// Current: a, b, c
			const current = createFiber("div", {}, null);
			const child1 = createFiber("span", {}, "a");
			const child2 = createFiber("div", {}, "b");
			const child3 = createFiber("p", {}, "c");
			child1.sibling = child2;
			child2.sibling = child3;
			current.child = child1;

			// New: x, y, z (completely different)
			reconcileChildren(current, parent, [
				{ type: "span", props: { key: "x", children: [] } },
				{ type: "div", props: { key: "y", children: [] } },
				{ type: "p", props: { key: "z", children: [] } },
			]);

			// All new children should be PLACEMENT
			let child = parent.child;
			while (child) {
				expect(child.effectTag).toBe(Placement);
				child = child.sibling;
			}

			// All old children should be deleted
			expect(parent.deletions?.length).toBe(3);
		});
	});

	describe("Key-Based Diffing", () => {
		test("should use keys for matching", () => {
			const parent = createFiber("div", {}, null);

			const current = createFiber("div", {}, null);
			const child1 = createFiber("span", { id: "1" }, "unique-key");
			current.child = child1;

			// Same key, should reuse
			reconcileChildren(current, parent, [
				{ type: "span", props: { id: "2", key: "unique-key", children: [] } },
			]);

			expect(parent.child?.effectTag).toBe(UpdateEffect);
			expect(parent.child?.alternate).toBe(child1);
		});

		test("should use index as fallback when no key", () => {
			const parent = createFiber("div", {}, null);

			const current = createFiber("div", {}, null);
			const child1 = createFiber("span", {}, null); // No key
			current.child = child1;

			// No key - should use index
			reconcileChildren(current, parent, [
				{ type: "span", props: { children: [] } },
			]);

			expect(parent.child?.effectTag).toBe(UpdateEffect);
		});

		test("should not reuse if key changes", () => {
			const parent = createFiber("div", {}, null);

			const current = createFiber("div", {}, null);
			const child1 = createFiber("span", {}, "key1");
			current.child = child1;

			// Different key
			reconcileChildren(current, parent, [
				{ type: "span", props: { key: "key2", children: [] } },
			]);

			expect(parent.child?.effectTag).toBe(Placement);
			expect(parent.child?.key).toBe("key2");
		});

		test("should handle duplicate keys gracefully", () => {
			const parent = createFiber("div", {}, null);

			// Multiple children with same key (user error, but should handle)
			reconcileChildren(null, parent, [
				{ type: "span", props: { key: "same", children: [] } },
				{ type: "div", props: { key: "same", children: [] } },
			]);

			// Should create both (behavior may vary, but shouldn't crash)
			expect(parent.child).not.toBeNull();
		});

		test("should handle mixed keyed and non-keyed children", () => {
			const parent = createFiber("div", {}, null);

			reconcileChildren(null, parent, [
				{ type: "span", props: { key: "a", children: [] } },
				{ type: "div", props: { children: [] } }, // No key
				{ type: "p", props: { key: "c", children: [] } },
			]);

			expect(parent.child).not.toBeNull();
			expect(parent.child?.sibling).not.toBeNull();
			expect(parent.child?.sibling?.sibling).not.toBeNull();
		});
	});

	describe("Type Changes", () => {
		test("should create new fiber when type changes", () => {
			const parent = createFiber("div", {}, null);

			const current = createFiber("div", {}, null);
			const child = createFiber("span", {}, null);
			current.child = child;

			// Change from span to div
			reconcileChildren(current, parent, [
				{ type: "div", props: { children: [] } },
			]);

			expect(parent.child?.type).toBe("div");
			expect(parent.child?.effectTag).toBe(Placement);
		});

		test("should handle element to component change", () => {
			const parent = createFiber("div", {}, null);

			const current = createFiber("div", {}, null);
			const child = createFiber("span", {}, null);
			current.child = child;

			const Component = () => null;

			// Change from element to component
			reconcileChildren(current, parent, [
				{ type: Component, props: { children: [] } },
			]);

			expect(parent.child?.type).toBe(Component);
			expect(parent.child?.effectTag).toBe(Placement);
		});

		test("should handle component to element change", () => {
			const parent = createFiber("div", {}, null);

			const Component = () => null;
			const current = createFiber("div", {}, null);
			const child = createFiber(Component, {}, null);
			current.child = child;

			// Change from component to element
			reconcileChildren(current, parent, [
				{ type: "span", props: { children: [] } },
			]);

			expect(parent.child?.type).toBe("span");
			expect(parent.child?.effectTag).toBe(Placement);
		});
	});

	describe("Edge Cases", () => {
		test("should handle empty to non-empty", () => {
			const parent = createFiber("div", {}, null);

			const current = createFiber("div", {}, null);
			current.child = null; // No children

			reconcileChildren(current, parent, [
				{ type: "span", props: { children: [] } },
			]);

			expect(parent.child).not.toBeNull();
			expect(parent.child?.effectTag).toBe(Placement);
		});

		test("should handle non-empty to empty", () => {
			const parent = createFiber("div", {}, null);

			const current = createFiber("div", {}, null);
			const child = createFiber("span", {}, null);
			current.child = child;

			reconcileChildren(current, parent, []);

			expect(parent.child).toBeNull();
			expect(parent.deletions?.length).toBeGreaterThan(0);
		});

		test("should filter out null and undefined", () => {
			const parent = createFiber("div", {}, null);

			reconcileChildren(null, parent, [
				null,
				{ type: "span", props: { children: [] } },
				undefined,
				{ type: "div", props: { children: [] } },
				null,
			]);

			// Should only create 2 children
			expect(parent.child).not.toBeNull();
			expect(parent.child?.sibling).not.toBeNull();
			expect(parent.child?.sibling?.sibling).toBeNull();
		});

		test("should handle large lists efficiently", () => {
			const parent = createFiber("div", {}, null);

			// Create 1000 children
			const children = [];
			for (let i = 0; i < 1000; i++) {
				children.push({
					type: "div",
					props: { key: i, children: [] },
				});
			}

			const start = performance.now();
			reconcileChildren(null, parent, children);
			const duration = performance.now() - start;

			// Should complete quickly (< 50ms)
			expect(duration).toBeLessThan(50);

			// Count children
			let count = 0;
			let child = parent.child;
			while (child) {
				count++;
				child = child.sibling;
			}
			expect(count).toBe(1000);
		});

		test("should maintain correct indices", () => {
			const parent = createFiber("div", {}, null);

			reconcileChildren(null, parent, [
				{ type: "span", props: { children: [] } },
				{ type: "div", props: { children: [] } },
				{ type: "p", props: { children: [] } },
			]);

			expect(parent.child?.index).toBe(0);
			expect(parent.child?.sibling?.index).toBe(1);
			expect(parent.child?.sibling?.sibling?.index).toBe(2);
		});

		test("should set return pointers correctly", () => {
			const parent = createFiber("div", {}, null);

			reconcileChildren(null, parent, [
				{ type: "span", props: { children: [] } },
				{ type: "div", props: { children: [] } },
			]);

			expect(parent.child?.return).toBe(parent);
			expect(parent.child?.sibling?.return).toBe(parent);
		});
	});

	describe("Performance and Optimization", () => {
		test("should reuse fibers when possible", () => {
			const parent = createFiber("div", {}, null);

			const current = createFiber("div", {}, null);
			const child1 = createFiber("span", {}, "a");
			const child2 = createFiber("div", {}, "b");
			child1.sibling = child2;
			current.child = child1;

			reconcileChildren(current, parent, [
				{ type: "span", props: { key: "a", children: [] } },
				{ type: "div", props: { key: "b", children: [] } },
			]);

			// Both should be UPDATE (reused), not PLACEMENT (created)
			expect(parent.child?.effectTag).toBe(UpdateEffect);
			expect(parent.child?.sibling?.effectTag).toBe(UpdateEffect);
		});

		test("should minimize deletions", () => {
			const parent = createFiber("div", {}, null);

			const current = createFiber("div", {}, null);
			const child1 = createFiber("span", {}, "a");
			const child2 = createFiber("div", {}, "b");
			const child3 = createFiber("p", {}, "c");
			child1.sibling = child2;
			child2.sibling = child3;
			current.child = child1;

			// Keep a and c, remove b
			reconcileChildren(current, parent, [
				{ type: "span", props: { key: "a", children: [] } },
				{ type: "p", props: { key: "c", children: [] } },
			]);

			// Only one deletion (b)
			expect(parent.deletions?.length).toBe(1);
			expect(parent.deletions?.[0].key).toBe("b");
		});

		test("should handle complex reordering efficiently", () => {
			const parent = createFiber("div", {}, null);

			// Current: 0,1,2,3,4,5,6,7,8,9
			const current = createFiber("div", {}, null);
			let prevChild: Fiber | null = null;
			for (let i = 0; i < 10; i++) {
				const child = createFiber("div", {}, String(i));
				if (i === 0) {
					current.child = child;
				} else if (prevChild) {
					prevChild.sibling = child;
				}
				prevChild = child;
			}

			// New: 9,8,7,6,5,4,3,2,1,0 (reverse order)
			const newChildren = [];
			for (let i = 9; i >= 0; i--) {
				newChildren.push({
					type: "div",
					props: { key: String(i), children: [] },
				});
			}

			const start = performance.now();
			reconcileChildren(current, parent, newChildren);
			const duration = performance.now() - start;

			// Should be fast (< 5ms)
			expect(duration).toBeLessThan(5);

			// All should be reused
			let child = parent.child;
			while (child) {
				expect(child.effectTag).toBe(UpdateEffect);
				child = child.sibling;
			}
		});
	});
});
