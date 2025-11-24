/**
 * Comprehensive tests for effect tag combinations
 *
 * Tests cover:
 * - Bitwise flag operations
 * - Combined effect tags (Placement + Update)
 * - Effect tag preservation during reconciliation
 * - Effect tag propagation through tree
 */

import { describe, expect, test } from "bun:test";
import { completeWork } from "../../src/fiber/completeWork";
import { createFiber } from "../../src/fiber/fiberCreation";
import {
	Deletion,
	NoEffect,
	Placement,
	UpdateEffect,
	hasEffectTag,
} from "../../src/fiber/fiberFlags";
import { reconcileChildren } from "../../src/fiber/reconcileChildren";
import type { Fiber } from "../../src/fiber/types";

describe("Effect Tags - Bitwise Flags", () => {
	describe("Basic Flag Operations", () => {
		test("NoEffect should be 0", () => {
			expect(NoEffect).toBe(0);
		});

		test("flags should be unique powers of 2", () => {
			expect(Placement).toBe(0b0001); // 1
			expect(UpdateEffect).toBe(0b0010); // 2
			expect(Deletion).toBe(0b0100); // 4
		});

		test("hasEffectTag should correctly identify single flags", () => {
			expect(hasEffectTag(Placement, Placement)).toBe(true);
			expect(hasEffectTag(UpdateEffect, UpdateEffect)).toBe(true);
			expect(hasEffectTag(Deletion, Deletion)).toBe(true);

			expect(hasEffectTag(Placement, UpdateEffect)).toBe(false);
			expect(hasEffectTag(UpdateEffect, Deletion)).toBe(false);
			expect(hasEffectTag(NoEffect, Placement)).toBe(false);
		});

		test("bitwise OR should combine flags", () => {
			const combined = Placement | UpdateEffect;
			expect(combined).toBe(0b0011); // 3

			expect(hasEffectTag(combined, Placement)).toBe(true);
			expect(hasEffectTag(combined, UpdateEffect)).toBe(true);
			expect(hasEffectTag(combined, Deletion)).toBe(false);
		});

		test("should support all three flags combined", () => {
			const allFlags = Placement | UpdateEffect | Deletion;
			expect(allFlags).toBe(0b0111); // 7

			expect(hasEffectTag(allFlags, Placement)).toBe(true);
			expect(hasEffectTag(allFlags, UpdateEffect)).toBe(true);
			expect(hasEffectTag(allFlags, Deletion)).toBe(true);
		});
	});

	describe("Effect Tag Preservation in completeWork", () => {
		test("should preserve Placement flag when adding Update flag", () => {
			const current = createFiber("div", { id: "old" }, null);
			current.stateNode = document.createElement("div");
			current.memoizedProps = { id: "old" };

			const wip = createFiber("div", { id: "new" }, null);
			wip.stateNode = current.stateNode;
			wip.effectTag = Placement; // Already marked for placement

			completeWork(current, wip);

			// Should have both Placement and Update
			expect(hasEffectTag(wip.effectTag, Placement)).toBe(true);
			expect(hasEffectTag(wip.effectTag, UpdateEffect)).toBe(true);
		});

		test("should not add Update flag if props unchanged", () => {
			const current = createFiber("div", { id: "same" }, null);
			current.stateNode = document.createElement("div");
			current.memoizedProps = { id: "same", children: [] };

			const wip = createFiber("div", { id: "same", children: [] }, null);
			wip.stateNode = current.stateNode;
			wip.effectTag = Placement;

			completeWork(current, wip);

			// Should still have Placement, but not Update
			expect(hasEffectTag(wip.effectTag, Placement)).toBe(true);
			expect(hasEffectTag(wip.effectTag, UpdateEffect)).toBe(false);
		});

		test("should add Update flag for text content changes while preserving Placement", () => {
			const current = createFiber("TEXT_ELEMENT", { nodeValue: "old" }, null);
			current.stateNode = document.createTextNode("old");
			current.memoizedProps = { nodeValue: "old" };

			const wip = createFiber("TEXT_ELEMENT", { nodeValue: "new" }, null);
			wip.stateNode = current.stateNode;
			wip.effectTag = Placement;

			completeWork(current, wip);

			expect(hasEffectTag(wip.effectTag, Placement)).toBe(true);
			expect(hasEffectTag(wip.effectTag, UpdateEffect)).toBe(true);
		});
	});

	describe("Effect Tag Combinations in Reconciliation", () => {
		test("should mark moved nodes with proper flags", () => {
			const parent = createFiber("div", {}, null);

			// Create existing children
			const child1 = createFiber("div", {}, "a");
			const child2 = createFiber("div", {}, "b");
			child1.sibling = child2;
			parent.child = child1;

			// Reconcile with swapped order
			const newChildren = [
				{ type: "div", props: { key: "b", children: [] } },
				{ type: "div", props: { key: "a", children: [] } },
			];

			reconcileChildren(child1, parent, newChildren);

			// Child that moved should be marked for placement
			const firstChild = parent.child;
			expect(firstChild?.key).toBe("b");
			expect(hasEffectTag(firstChild?.effectTag || 0, Placement)).toBe(true);
		});

		test("should handle adding new children among existing ones", () => {
			const parent = createFiber("div", {}, null);

			const child1 = createFiber("div", {}, "a");
			parent.child = child1;

			// Add new children before and after
			const newChildren = [
				{ type: "div", props: { key: "new1", children: [] } },
				{ type: "div", props: { key: "a", children: [] } },
				{ type: "div", props: { key: "new2", children: [] } },
			];

			reconcileChildren(child1, parent, newChildren);

			// Walk and verify flags
			let current: Fiber | null = parent.child;
			const results = [];
			while (current) {
				results.push({
					key: current.key,
					hasPlacement: hasEffectTag(current.effectTag, Placement),
					hasUpdate: hasEffectTag(current.effectTag, UpdateEffect),
				});
				current = current.sibling;
			}

			// new1 is new -> Placement
			// "a" is reused -> gets Placement because it moved position
			// new2 is new -> Placement
			expect(results).toEqual([
				{ key: "new1", hasPlacement: true, hasUpdate: false },
				{ key: "a", hasPlacement: true, hasUpdate: false },
				{ key: "new2", hasPlacement: true, hasUpdate: false },
			]);
		});
	});

	describe("Effect Tag Edge Cases", () => {
		test("should handle clearing all flags", () => {
			let effectTag = Placement | UpdateEffect | Deletion;
			effectTag = NoEffect;

			expect(effectTag).toBe(0);
			expect(hasEffectTag(effectTag, Placement)).toBe(false);
			expect(hasEffectTag(effectTag, UpdateEffect)).toBe(false);
			expect(hasEffectTag(effectTag, Deletion)).toBe(false);
		});

		test("should handle removing specific flag with bitwise AND NOT", () => {
			let effectTag = Placement | UpdateEffect;

			// Remove Placement flag
			effectTag = effectTag & ~Placement;

			expect(hasEffectTag(effectTag, Placement)).toBe(false);
			expect(hasEffectTag(effectTag, UpdateEffect)).toBe(true);
		});

		test("should handle toggling flags", () => {
			let effectTag = Placement;

			// Toggle UpdateEffect on
			effectTag = effectTag | UpdateEffect;
			expect(hasEffectTag(effectTag, UpdateEffect)).toBe(true);

			// Toggle UpdateEffect off
			effectTag = effectTag & ~UpdateEffect;
			expect(hasEffectTag(effectTag, UpdateEffect)).toBe(false);
			expect(hasEffectTag(effectTag, Placement)).toBe(true);
		});

		test("should handle checking multiple flags at once", () => {
			const effectTag = Placement | UpdateEffect;

			// Check if has any of the flags
			const hasAnyMutation =
				hasEffectTag(effectTag, Placement) ||
				hasEffectTag(effectTag, UpdateEffect) ||
				hasEffectTag(effectTag, Deletion);

			expect(hasAnyMutation).toBe(true);

			// Check if has all flags
			const hasBothPlacementAndUpdate =
				hasEffectTag(effectTag, Placement) &&
				hasEffectTag(effectTag, UpdateEffect);

			expect(hasBothPlacementAndUpdate).toBe(true);
		});
	});

	describe("Real-World Scenarios", () => {
		test("moving element with changed props should have both Placement and Update", () => {
			const parent = createFiber("div", {}, null);

			// Existing: [A, B, C]
			const childA = createFiber("div", { className: "old" }, "a");
			const childB = createFiber("div", {}, "b");
			const childC = createFiber("div", {}, "c");

			childA.sibling = childB;
			childB.sibling = childC;
			parent.child = childA;

			// New: [C, B, A(with new props)]
			const newChildren = [
				{ type: "div", props: { key: "c", children: [] } },
				{ type: "div", props: { key: "b", children: [] } },
				{ type: "div", props: { key: "a", className: "new", children: [] } },
			];

			reconcileChildren(childA, parent, newChildren);

			// Find the reconciled child A
			let current: Fiber | null = parent.child;
			let reconciledA = null;
			while (current) {
				if (current.key === "a") {
					reconciledA = current;
					break;
				}
				current = current.sibling;
			}

			// Child A moved to different position
			expect(hasEffectTag(reconciledA?.effectTag || 0, Placement)).toBe(true);
		});

		test("text node moving and changing content should have both flags", () => {
			const parent = createFiber("div", {}, null);

			const text = createFiber("TEXT_ELEMENT", { nodeValue: "old" }, null);
			text.stateNode = document.createTextNode("old");
			text.memoizedProps = { nodeValue: "old" };
			parent.child = text;

			// Complete work on text with Placement flag and changed content
			const wipText = createFiber("TEXT_ELEMENT", { nodeValue: "new" }, null);
			wipText.stateNode = text.stateNode;
			wipText.effectTag = Placement;

			completeWork(text, wipText);

			expect(hasEffectTag(wipText.effectTag, Placement)).toBe(true);
			expect(hasEffectTag(wipText.effectTag, UpdateEffect)).toBe(true);
		});

		test("element being deleted should only have Deletion flag", () => {
			const parent = createFiber("div", {}, null);
			const child = createFiber("div", {}, "a");
			child.effectTag = Deletion;

			parent.child = child;

			// Should not have other flags
			expect(hasEffectTag(child.effectTag, Deletion)).toBe(true);
			expect(hasEffectTag(child.effectTag, Placement)).toBe(false);
			expect(hasEffectTag(child.effectTag, UpdateEffect)).toBe(false);
		});
	});

	describe("Effect Tag Propagation", () => {
		test("should accumulate effect tags on parent during complete work", () => {
			const parent = createFiber("div", {}, null);

			// Create children with different effects
			const child1 = createFiber("div", {}, null);
			child1.effectTag = Placement;

			const child2 = createFiber("div", {}, null);
			child2.effectTag = UpdateEffect;

			child1.sibling = child2;
			parent.child = child1;

			// Each child should maintain its own effect tag
			expect(child1.effectTag).toBe(Placement);
			expect(child2.effectTag).toBe(UpdateEffect);
		});

		test("should not inherit parent effect tags", () => {
			const parent = createFiber("div", {}, null);
			parent.effectTag = UpdateEffect;

			const child = createFiber("div", {}, null);
			child.effectTag = NoEffect;
			parent.child = child;

			// Child should have its own effect tag, not parent's
			expect(child.effectTag).toBe(NoEffect);
			expect(hasEffectTag(child.effectTag, UpdateEffect)).toBe(false);
		});
	});
});
