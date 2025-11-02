/**
 * Tests for Fiber Creation Functions
 *
 * These tests validate that we can correctly create Fiber instances
 * from various element types and that work-in-progress pooling works correctly.
 */

import { describe, expect, test } from "bun:test";
import { FRAGMENT, TEXT_ELEMENT } from "../../src/core/types";
import {
	NoEffect,
	NoLanes,
	UpdateEffect,
	cloneFiber,
	createFiber,
	createFiberFromElement,
	createFiberFromFragment,
	createFiberFromText,
	createWorkInProgress,
	getElementKey,
	getElementProps,
	getElementType,
} from "../../src/fiber";
import type { StateOrEffectHook } from "../../src/hooks/types";

describe("Fiber Creation", () => {
	describe("createFiber", () => {
		test("creates a fiber with all fields initialized", () => {
			const fiber = createFiber("div", { id: "test" }, "key1");

			expect(fiber.type).toBe("div");
			expect(fiber.props.id).toBe("test");
			expect(fiber.key).toBe("key1");
			expect(fiber.child).toBeNull();
			expect(fiber.sibling).toBeNull();
			expect(fiber.return).toBeNull();
			expect(fiber.alternate).toBeNull();
			expect(fiber.effectTag).toBe(NoEffect);
			expect(fiber.stateNode).toBeNull();
			expect(fiber.hooks).toBeNull();
			expect(fiber.lanes).toBe(NoLanes);
		});

		test("creates fibers with different types", () => {
			const hostFiber = createFiber("div", {}, null);
			expect(hostFiber.type).toBe("div");

			const Component = () => null;
			const componentFiber = createFiber(Component, {}, null);
			expect(componentFiber.type).toBe(Component);

			const textFiber = createFiber(TEXT_ELEMENT, { nodeValue: "text" }, null);
			expect(textFiber.type).toBe(TEXT_ELEMENT);
		});

		test("handles null key correctly", () => {
			const fiber = createFiber("div", {}, null);
			expect(fiber.key).toBeNull();
		});
	});

	describe("createWorkInProgress", () => {
		test("creates alternate when none exists", () => {
			const current = createFiber("div", { id: "test" }, null);
			const wip = createWorkInProgress(current, { id: "updated" });

			// Verify alternate relationship
			expect(wip.alternate).toBe(current);
			expect(current.alternate).toBe(wip);

			// Verify props updated
			expect(wip.pendingProps.id).toBe("updated");

			// Verify type preserved
			expect(wip.type).toBe("div");
		});

		test("reuses existing alternate", () => {
			const current = createFiber("div", {}, null);
			const wip1 = createWorkInProgress(current, { v: 1 });
			const wip2 = createWorkInProgress(current, { v: 2 });

			// Should be same object reused
			expect(wip1).toBe(wip2);

			// Props should be updated
			expect(wip2.pendingProps.v).toBe(2);
		});

		test("resets effect fields on reuse", () => {
			const current = createFiber("div", {}, null);
			const wip1 = createWorkInProgress(current, {});

			// Simulate effects from previous render
			wip1.effectTag = UpdateEffect;
			wip1.nextEffect = createFiber("span", {}, null);
			wip1.firstEffect = createFiber("p", {}, null);

			// Create WIP again
			const wip2 = createWorkInProgress(current, {});

			// Effects should be reset
			expect(wip2.effectTag).toBe(NoEffect);
			expect(wip2.nextEffect).toBeNull();
			expect(wip2.firstEffect).toBeNull();
		});

		test("copies memoized props and state", () => {
			const current = createFiber("div", { id: "test" }, null);
			current.memoizedProps = { id: "test" };
			current.memoizedState = { count: 5 };

			const wip = createWorkInProgress(current, { id: "updated" });

			expect(wip.memoizedProps).toEqual({ id: "test" });
			expect(wip.memoizedState).toEqual({ count: 5 });
		});

		test("copies hooks from current", () => {
			const current = createFiber("div", {}, null);
			const mockHooks: unknown[] = [
				{
					type: "state" as const,
					memoizedState: 1,
					state: 1,
					setState: () => {},
				},
				{ type: "effect" as const, cleanup: () => {}, hasRun: false },
			];
			current.hooks = mockHooks as StateOrEffectHook<unknown>[];

			const wip = createWorkInProgress(current, {});

			// @ts-expect-error - Testing with incomplete props intentionally
			expect(wip.hooks).toBe(mockHooks);
		});
	});

	describe("createFiberFromElement", () => {
		test("creates fiber from host element", () => {
			const element = {
				type: "div",
				props: { id: "test", children: [] },
			};

			const fiber = createFiberFromElement(element)!;

			expect(fiber.type).toBe("div");
			expect(fiber.props.id).toBe("test");
		});

		test("creates fiber from functional component", () => {
			const Component = () => null;
			const element = {
				type: Component,
				props: { name: "Test", children: [] },
			};

			const fiber = createFiberFromElement(element)!;

			expect(fiber.type).toBe(Component);
			expect(fiber.props.name).toBe("Test");
		});

		test("creates fiber from text element", () => {
			const element = {
				type: TEXT_ELEMENT,
				props: { nodeValue: "Hello", children: [] },
			};

			const fiber = createFiberFromElement(element)!;

			expect(fiber.type).toBe(TEXT_ELEMENT);
			expect(fiber.props.nodeValue).toBe("Hello");
		});

		test("creates fiber from string primitive", () => {
			const fiber = createFiberFromElement("Hello")!;

			expect(fiber.type).toBe(TEXT_ELEMENT);
			expect(fiber.props.nodeValue).toBe("Hello");
		});

		test("creates fiber from number primitive", () => {
			const fiber = createFiberFromElement(42)!;

			expect(fiber.type).toBe(TEXT_ELEMENT);
			expect(fiber.props.nodeValue).toBe("42");
		});

		test("creates fiber from boolean primitive", () => {
			const fiber = createFiberFromElement(true)!;

			expect(fiber.type).toBe(TEXT_ELEMENT);
			expect(fiber.props.nodeValue).toBe("true");
		});

		test("returns null for null element (valid render nothing case)", () => {
			const fiber = createFiberFromElement(null);
			expect(fiber).toBeNull();
		});

		test("returns null for undefined element (valid render nothing case)", () => {
			const fiber = createFiberFromElement(undefined);
			expect(fiber).toBeNull();
		});

		test("extracts key from element props", () => {
			const element = {
				type: "div",
				props: { key: "unique-key", children: [] },
			};

			const fiber = createFiberFromElement(element)!;

			expect(fiber.key).toBe("unique-key");
		});

		test("handles element with no key", () => {
			const element = {
				type: "div",
				props: { children: [] },
			};

			const fiber = createFiberFromElement(element)!;

			expect(fiber.key).toBeNull();
		});
	});

	describe("createFiberFromText", () => {
		test("creates text fiber from string", () => {
			const fiber = createFiberFromText("Hello");

			expect(fiber.type).toBe(TEXT_ELEMENT);
			expect(fiber.props.nodeValue).toBe("Hello");
			expect(fiber.key).toBeNull();
		});

		test("creates text fiber from number", () => {
			const fiber = createFiberFromText(123);

			expect(fiber.type).toBe(TEXT_ELEMENT);
			expect(fiber.props.nodeValue).toBe("123");
		});

		test("creates text fiber from boolean", () => {
			const fiber = createFiberFromText(false);

			expect(fiber.type).toBe(TEXT_ELEMENT);
			expect(fiber.props.nodeValue).toBe("false");
		});
	});

	describe("createFiberFromFragment", () => {
		test("creates fragment fiber with children", () => {
			const children = [
				{ type: "div", props: { children: [] } },
				{ type: "span", props: { children: [] } },
			];

			const fiber = createFiberFromFragment(children, null);

			expect(fiber.type).toBe(FRAGMENT);
			expect(fiber.props.children).toBe(children);
			expect(fiber.key).toBeNull();
		});

		test("creates fragment fiber with key", () => {
			const fiber = createFiberFromFragment([], "fragment-key");

			expect(fiber.type).toBe(FRAGMENT);
			expect(fiber.key).toBe("fragment-key");
		});

		test("handles empty children array", () => {
			const fiber = createFiberFromFragment([], null);

			expect(fiber.type).toBe(FRAGMENT);
			expect(fiber.props.children).toEqual([]);
		});
	});

	describe("cloneFiber", () => {
		test("clones fiber with new props", () => {
			const original = createFiber("div", { id: "original" }, "key1");
			const clone = cloneFiber(original, { id: "cloned" });

			expect(clone.type).toBe("div");
			expect(clone.pendingProps.id).toBe("cloned");
			expect(clone.key).toBe("key1");
		});

		test("resets index and sibling", () => {
			const original = createFiber("div", {}, null);
			original.index = 5;
			original.sibling = createFiber("span", {}, null);

			const clone = cloneFiber(original, {});

			expect(clone.index).toBe(0);
			expect(clone.sibling).toBeNull();
		});

		test("preserves alternate relationship", () => {
			const original = createFiber("div", {}, null);
			const clone = cloneFiber(original, {});

			expect(clone.alternate).toBe(original);
			expect(original.alternate).toBe(clone);
		});
	});

	describe("getElementKey", () => {
		test("extracts key from element props", () => {
			const element = {
				type: "div",
				props: { key: "my-key", children: [] },
			};

			expect(getElementKey(element)).toBe("my-key");
		});

		test("returns null for element without key", () => {
			const element = {
				type: "div",
				props: { children: [] },
			};

			expect(getElementKey(element)).toBeNull();
		});

		test("returns null for primitive elements", () => {
			expect(getElementKey("text")).toBeNull();
			expect(getElementKey(123)).toBeNull();
			expect(getElementKey(true)).toBeNull();
		});

		test("returns null for null/undefined", () => {
			expect(getElementKey(null)).toBeNull();
			expect(getElementKey(undefined)).toBeNull();
		});

		test("converts non-string keys to strings", () => {
			const element = {
				type: "div",
				props: { key: 42, children: [] },
			};

			expect(getElementKey(element)).toBe("42");
		});
	});

	describe("getElementProps", () => {
		test("extracts props from element", () => {
			const element = {
				type: "div",
				props: { id: "test", className: "box", children: [] },
			};

			const props = getElementProps(element);

			expect(props.id).toBe("test");
			expect(props.className).toBe("box");
		});

		test("returns nodeValue props for primitives", () => {
			expect(getElementProps("text")).toEqual({
				nodeValue: "text",
				children: [],
			});
			expect(getElementProps(42)).toEqual({ nodeValue: 42, children: [] });
		});

		test("returns empty children for null/undefined", () => {
			expect(getElementProps(null)).toEqual({ children: [] });
			expect(getElementProps(undefined)).toEqual({ children: [] });
		});
	});

	describe("getElementType", () => {
		test("returns type from element", () => {
			const element = {
				type: "div",
				props: { children: [] },
			};

			expect(getElementType(element)).toBe("div");
		});

		test("returns TEXT_ELEMENT for primitives", () => {
			expect(getElementType("text")).toBe(TEXT_ELEMENT);
			expect(getElementType(123)).toBe(TEXT_ELEMENT);
			expect(getElementType(true)).toBe(TEXT_ELEMENT);
		});

		test("returns null for null/undefined", () => {
			expect(getElementType(null)).toBeNull();
			expect(getElementType(undefined)).toBeNull();
		});

		test("returns functional component type", () => {
			const Component = () => null;
			const element = {
				type: Component,
				props: { children: [] },
			};

			expect(getElementType(element)).toBe(Component);
		});
	});
});
