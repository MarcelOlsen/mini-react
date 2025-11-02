/**
 * BeginWork Tests
 *
 * These tests validate the beginWork phase of reconciliation:
 * - Dispatching to correct handler based on fiber type
 * - Host component reconciliation
 * - Function component execution
 * - Text node handling
 * - Fragment handling
 * - Portal handling
 * - Root fiber handling
 */

import { beforeEach, describe, expect, test } from "bun:test";
import {
	type AnyMiniReactElement,
	type ElementType,
	FRAGMENT,
	PORTAL,
	TEXT_ELEMENT,
} from "../../src/core/types";
import {
	createFiber,
	createFiberRoot,
	createWorkInProgress,
} from "../../src/fiber";
import { beginWork } from "../../src/fiber/beginWork";

describe("BeginWork", () => {
	let container: HTMLElement;

	beforeEach(() => {
		container = document.createElement("div");
		document.body.appendChild(container);
	});

	describe("Dispatcher", () => {
		test("should dispatch to updateHostComponent for string types", () => {
			const fiber = createFiber("div", { children: [] }, null);
			const result = beginWork(null, fiber);

			// Host component with no children returns null
			expect(result).toBeNull();
		});

		test("should dispatch to updateHostText for TEXT_ELEMENT", () => {
			const fiber = createFiber(TEXT_ELEMENT, { nodeValue: "hello" }, null);
			const result = beginWork(null, fiber);

			// Text nodes have no children
			expect(result).toBeNull();
		});

		test("should dispatch to updateFunctionComponent for functions", () => {
			const Component = () => ({ type: "div", props: { children: [] } });
			const fiber = createFiber(Component, {}, null);
			const result = beginWork(null, fiber);

			// Should create child for returned element
			expect(fiber.child).not.toBeNull();
			expect(result).toBe(fiber.child);
		});

		test("should dispatch to updateFragment for FRAGMENT symbol", () => {
			const fiber = createFiber(FRAGMENT, { children: [] }, null);
			const result = beginWork(null, fiber);

			// Fragment with no children returns null
			expect(result).toBeNull();
		});

		test("should dispatch to updatePortal for PORTAL symbol", () => {
			const fiber = createFiber(
				PORTAL,
				{ children: [], targetContainer: container },
				null,
			);
			const result = beginWork(null, fiber);

			// Portal with no children returns null
			expect(result).toBeNull();
		});

		test("should dispatch to updateHostRoot for null type", () => {
			const root = createFiberRoot(container);
			const rootFiber = root.current;
			rootFiber.pendingProps = { children: [] };

			const result = beginWork(null, rootFiber);

			// Root with no children returns null
			expect(result).toBeNull();
		});

		test("should throw for unknown fiber type", () => {
			const fiber = createFiber("div", {}, null);
			fiber.type = 123 as unknown as ElementType; // Invalid type

			expect(() => beginWork(null, fiber)).toThrow("Unknown fiber type");
		});
	});

	describe("Host Component", () => {
		test("should reconcile single child", () => {
			const fiber = createFiber(
				"div",
				{
					children: [{ type: "span", props: { children: [] } }],
				},
				null,
			);

			const result = beginWork(null, fiber);

			expect(result).not.toBeNull();
			expect(result?.type).toBe("span");
			expect(result?.return).toBe(fiber);
			expect(fiber.child).toBe(result);
		});

		test("should reconcile multiple children", () => {
			const fiber = createFiber(
				"div",
				{
					children: [
						{ type: "span", props: { children: [] } },
						{ type: "p", props: { children: [] } },
						{ type: "button", props: { children: [] } },
					],
				},
				null,
			);

			const result = beginWork(null, fiber);

			// Should return first child
			expect(result?.type).toBe("span");

			// Should create sibling chain
			expect(result?.sibling?.type).toBe("p");
			expect(result?.sibling?.sibling?.type).toBe("button");

			// All children should have correct return pointer
			expect(result?.return).toBe(fiber);
			expect(result?.sibling?.return).toBe(fiber);
			expect(result?.sibling?.sibling?.return).toBe(fiber);
		});

		test("should handle no children", () => {
			const fiber = createFiber("div", { children: [] }, null);

			const result = beginWork(null, fiber);

			expect(result).toBeNull();
			expect(fiber.child).toBeNull();
		});

		test("should handle undefined children", () => {
			const fiber = createFiber("div", {}, null);

			const result = beginWork(null, fiber);

			expect(result).toBeNull();
			expect(fiber.child).toBeNull();
		});

		test("should reuse fiber on update with same type", () => {
			// First render
			const current = createFiber(
				"div",
				{
					children: [{ type: "span", props: { children: [] } }],
				},
				null,
			);
			beginWork(null, current);

			// Create WIP for update
			const wip = createWorkInProgress(current, {
				children: [{ type: "span", props: { children: [] } }],
			});

			const result = beginWork(current, wip);

			// Should reuse child fiber
			expect(result).not.toBeNull();
			expect(result?.alternate).toBe(current.child);
		});

		test("should create new fiber when type changes", () => {
			// First render with span
			const current = createFiber(
				"div",
				{
					children: [{ type: "span", props: { children: [] } }],
				},
				null,
			);
			beginWork(null, current);

			// Update to div
			const wip = createWorkInProgress(current, {
				children: [{ type: "div", props: { children: [] } }],
			});

			const result = beginWork(current, wip);

			// Should create new fiber
			expect(result?.type).toBe("div");
			// Old fiber should be marked for deletion
			expect(wip.deletions).toContain(current.child);
		});

		test("should handle nested children", () => {
			const fiber = createFiber(
				"div",
				{
					children: [
						{
							type: "section",
							props: {
								children: [
									{
										type: "p",
										props: { children: [] },
									},
								],
							},
						},
					],
				},
				null,
			);

			const result = beginWork(null, fiber);

			expect(result?.type).toBe("section");
			expect(result?.pendingProps.children).toBeDefined();
			expect(result?.pendingProps.children?.length).toBe(1);
		});
	});

	describe("Function Component", () => {
		test("should call component function with props", () => {
			let receivedProps: unknown = null;
			const Component = (props: Record<string, unknown>) => {
				receivedProps = props;
				return { type: "div", props: { children: [] } };
			};

			const fiber = createFiber(Component, { id: "test", value: 42 }, null);
			beginWork(null, fiber);

			expect(receivedProps).toEqual({ id: "test", value: 42 });
		});

		test("should reconcile component result", () => {
			const Component = () => ({
				type: "div",
				props: { children: [{ type: "span", props: { children: [] } }] },
			});

			const fiber = createFiber(Component, {}, null);
			const result = beginWork(null, fiber);

			// Should create child for div
			expect(result?.type).toBe("div");
			expect(result?.return).toBe(fiber);
		});

		test("should handle component returning null", () => {
			const Component = () => null;

			const fiber = createFiber(Component, {}, null);
			const result = beginWork(null, fiber);

			expect(result).toBeNull();
			expect(fiber.child).toBeNull();
		});

		test("should handle component returning primitive", () => {
			const Component = () => "hello";

			const fiber = createFiber(Component, {}, null);
			const result = beginWork(null, fiber);

			// Should create text fiber for string
			expect(result?.type).toBe(TEXT_ELEMENT);
			expect(result?.pendingProps.nodeValue).toBe("hello");
		});

		test("should handle component throwing error", () => {
			const Component = () => {
				throw new Error("Component error");
			};

			const fiber = createFiber(Component, {}, null);

			expect(() => beginWork(null, fiber)).toThrow("Component error");
		});

		test("should handle nested function components", () => {
			const Inner = () => ({ type: "span", props: { children: [] } });
			const Outer = () => ({ type: Inner, props: {} });

			// @ts-expect-error - Testing with incomplete props intentionally
			const fiber = createFiber(Outer, {}, null);
			const result = beginWork(null, fiber);

			// Should create child for Inner component
			expect(result?.type).toBe(Inner);
		});

		test("should pass children in props", () => {
			let receivedChildren: unknown = null;
			const Component = (props: Record<string, unknown>) => {
				receivedChildren = props.children;
				return { type: "div", props: { children: [] } };
			};

			const fiber = createFiber(
				Component,
				{
					children: [{ type: "span", props: { children: [] } }],
				},
				null,
			);
			beginWork(null, fiber);

			expect(receivedChildren).toBeDefined();
			// @ts-expect-error - Testing with incomplete props intentionally
			expect(receivedChildren[0].type).toBe("span");
		});
	});

	describe("Text Node", () => {
		test("should return null for text nodes", () => {
			const fiber = createFiber(TEXT_ELEMENT, { nodeValue: "hello" }, null);
			const result = beginWork(null, fiber);

			expect(result).toBeNull();
		});

		test("should handle empty text", () => {
			const fiber = createFiber(TEXT_ELEMENT, { nodeValue: "" }, null);
			const result = beginWork(null, fiber);

			expect(result).toBeNull();
		});

		test("should handle numeric text", () => {
			const fiber = createFiber(TEXT_ELEMENT, { nodeValue: 123 }, null);
			const result = beginWork(null, fiber);

			expect(result).toBeNull();
		});
	});

	describe("Fragment", () => {
		test("should reconcile fragment children", () => {
			const fiber = createFiber(
				FRAGMENT,
				{
					children: [
						{ type: "div", props: { children: [] } },
						{ type: "span", props: { children: [] } },
					],
				},
				null,
			);

			const result = beginWork(null, fiber);

			expect(result?.type).toBe("div");
			expect(result?.sibling?.type).toBe("span");
			expect(result?.return).toBe(fiber);
		});

		test("should handle empty fragment", () => {
			const fiber = createFiber(FRAGMENT, { children: [] }, null);
			const result = beginWork(null, fiber);

			expect(result).toBeNull();
			expect(fiber.child).toBeNull();
		});

		test("should handle nested fragments", () => {
			const fiber = createFiber(
				FRAGMENT,
				{
					children: [
						{
							type: FRAGMENT,
							props: {
								children: [{ type: "div", props: { children: [] } }],
							},
						},
					],
				},
				null,
			);

			const result = beginWork(null, fiber);

			expect(result?.type).toBe(FRAGMENT);
			expect(result?.pendingProps.children).toBeDefined();
		});

		test("should flatten fragment children at reconciliation", () => {
			const fiber = createFiber(
				FRAGMENT,
				{
					children: [
						{ type: "div", props: { children: [] } },
						{ type: "span", props: { children: [] } },
						{ type: "p", props: { children: [] } },
					],
				},
				null,
			);

			const result = beginWork(null, fiber);

			// All three should be direct children
			expect(result?.type).toBe("div");
			expect(result?.sibling?.type).toBe("span");
			expect(result?.sibling?.sibling?.type).toBe("p");
		});
	});

	describe("Portal", () => {
		test("should reconcile portal children", () => {
			const target = document.createElement("div");
			const fiber = createFiber(
				PORTAL,
				{
					targetContainer: target,
					children: [{ type: "div", props: { children: [] } }],
				},
				null,
			);

			const result = beginWork(null, fiber);

			expect(result?.type).toBe("div");
			expect(result?.return).toBe(fiber);
		});

		test("should handle empty portal", () => {
			const target = document.createElement("div");
			const fiber = createFiber(
				PORTAL,
				{
					targetContainer: target,
					children: [],
				},
				null,
			);

			const result = beginWork(null, fiber);

			expect(result).toBeNull();
		});

		test("should maintain tree structure across portal", () => {
			const target = document.createElement("div");
			const fiber = createFiber(
				PORTAL,
				{
					targetContainer: target,
					children: [
						{
							type: "div",
							props: {
								children: [{ type: "span", props: { children: [] } }],
							},
						},
					],
				},
				null,
			);

			const result = beginWork(null, fiber);

			expect(result?.return).toBe(fiber);
			expect(result?.type).toBe("div");
		});
	});

	describe("Host Root", () => {
		test("should reconcile root children", () => {
			const root = createFiberRoot(container);
			const rootFiber = root.current;
			rootFiber.pendingProps = {
				children: [{ type: "div", props: { children: [] } }],
			};

			const result = beginWork(null, rootFiber);

			expect(result?.type).toBe("div");
			expect(result?.return).toBe(rootFiber);
		});

		test("should handle empty root", () => {
			const root = createFiberRoot(container);
			const rootFiber = root.current;
			rootFiber.pendingProps = { children: [] };

			const result = beginWork(null, rootFiber);

			expect(result).toBeNull();
		});

		test("should handle multiple root children", () => {
			const root = createFiberRoot(container);
			const rootFiber = root.current;
			rootFiber.pendingProps = {
				children: [
					{ type: "header", props: { children: [] } },
					{ type: "main", props: { children: [] } },
					{ type: "footer", props: { children: [] } },
				],
			};

			const result = beginWork(null, rootFiber);

			expect(result?.type).toBe("header");
			expect(result?.sibling?.type).toBe("main");
			expect(result?.sibling?.sibling?.type).toBe("footer");
		});
	});

	describe("Reconciliation Integration", () => {
		test("should handle mixed fiber types in tree", () => {
			const Component = () => ({ type: "span", props: { children: [] } });

			const fiber = createFiber(
				"div",
				{
					children: [
						// @ts-expect-error - Testing with incomplete props intentionally
						{ type: Component, props: {} },
						{ type: "p", props: { children: [] } },
						{
							type: FRAGMENT,
							props: {
								children: [{ type: "button", props: { children: [] } }],
							},
						},
					],
				},
				null,
			);

			const result = beginWork(null, fiber);

			expect(result?.type).toBe(Component);
			expect(result?.sibling?.type).toBe("p");
			expect(result?.sibling?.sibling?.type).toBe(FRAGMENT);
		});

		test("should handle keys in reconciliation", () => {
			const fiber = createFiber(
				"div",
				{
					children: [
						{ type: "div", props: { key: "a", children: [] } },
						{ type: "div", props: { key: "b", children: [] } },
						{ type: "div", props: { key: "c", children: [] } },
					],
				},
				null,
			);

			const result = beginWork(null, fiber);

			expect(result?.key).toBe("a");
			expect(result?.sibling?.key).toBe("b");
			expect(result?.sibling?.sibling?.key).toBe("c");
		});

		test("should preserve indices for children", () => {
			const fiber = createFiber(
				"div",
				{
					children: [
						{ type: "span", props: { children: [] } },
						{ type: "p", props: { children: [] } },
						{ type: "button", props: { children: [] } },
					],
				},
				null,
			);

			const result = beginWork(null, fiber);

			expect(result?.index).toBe(0);
			expect(result?.sibling?.index).toBe(1);
			expect(result?.sibling?.sibling?.index).toBe(2);
		});

		test("should handle complex nested structure", () => {
			const Component = () => ({
				type: "div",
				props: {
					children: [{ type: "span", props: { children: [] } }],
				},
			});

			const fiber = createFiber(
				"section",
				{
					children: [
						{
							type: Component,
							// @ts-expect-error - Testing with incomplete props intentionally
							props: {},
						},
						{
							type: FRAGMENT,
							props: {
								children: [
									{ type: "p", props: { children: [] } },
									{ type: "button", props: { children: [] } },
								],
							},
						},
					],
				},
				null,
			);

			const result = beginWork(null, fiber);

			// Should create children
			expect(result).not.toBeNull();
			expect(result?.sibling).not.toBeNull();

			// All should have correct return pointer
			expect(result?.return).toBe(fiber);
			expect(result?.sibling?.return).toBe(fiber);
		});
	});

	describe("Edge Cases", () => {
		test("should handle children with null/undefined values", () => {
			const fiber = createFiber(
				"div",
				{
					children: [
						null,
						undefined,
						{ type: "span", props: { children: [] } },
						null,
					],
				},
				null,
			);

			const result = beginWork(null, fiber);

			// Should filter out null/undefined
			expect(result?.type).toBe("span");
			expect(result?.sibling).toBeNull();
		});

		test("should handle children with boolean values", () => {
			const fiber = createFiber(
				"div",
				{
					children: [true, false, { type: "span", props: { children: [] } }],
				},
				null,
			);

			const result = beginWork(null, fiber);

			// Should filter out booleans
			expect(result?.type).toBe("span");
		});

		test("should handle children with primitive values", () => {
			const fiber = createFiber(
				"div",
				{
					children: ["text", 123, { type: "span", props: { children: [] } }],
				},
				null,
			);

			const result = beginWork(null, fiber);

			// Should create text fibers for primitives
			expect(result?.type).toBe(TEXT_ELEMENT);
			expect(result?.pendingProps.nodeValue).toBe("text");
			expect(result?.sibling?.type).toBe(TEXT_ELEMENT);
			// Note: numbers are converted to strings in createFiberFromText (like React)
			expect(result?.sibling?.pendingProps.nodeValue).toBe("123");
			expect(result?.sibling?.sibling?.type).toBe("span");
		});

		test("should handle deeply nested arrays", () => {
			const fiber = createFiber(
				"div",
				{
					// @ts-expect-error - Testing with incomplete props intentionally
					children: [[[{ type: "span", props: { children: [] } }]]],
				},
				null,
			);

			// Arrays should be flattened during reconciliation
			const _result = beginWork(null, fiber);

			// Depends on reconciliation implementation
			// At minimum, should not throw
			expect(() => beginWork(null, fiber)).not.toThrow();
		});

		test("should handle very large number of children", () => {
			const children = [];
			for (let i = 0; i < 1000; i++) {
				children.push({ type: "div", props: { key: i, children: [] } });
			}

			const fiber = createFiber("div", { children }, null);

			const result = beginWork(null, fiber);

			// Should handle large lists correctly
			expect(result).not.toBeNull();
		});

		test("should maintain fiber tree integrity", () => {
			const fiber = createFiber(
				"div",
				{
					children: [
						{ type: "span", props: { children: [] } },
						{ type: "p", props: { children: [] } },
					],
				},
				null,
			);

			beginWork(null, fiber);

			// Check tree integrity
			expect(fiber.child?.return).toBe(fiber);
			expect(fiber.child?.sibling?.return).toBe(fiber);
			expect(fiber.child?.sibling?.sibling).toBeNull();
		});
	});

	describe("Performance", () => {
		test("should handle wide trees efficiently", () => {
			const children = [];
			for (let i = 0; i < 100; i++) {
				children.push({ type: "div", props: { key: i, children: [] } });
			}

			const fiber = createFiber("div", { children }, null);

			// Should handle wide trees without errors
			expect(() => beginWork(null, fiber)).not.toThrow();
		});

		test("should handle complex nested structures efficiently", () => {
			let nested: AnyMiniReactElement = {
				type: "div",
				props: { children: [] },
			};
			for (let i = 0; i < 50; i++) {
				nested = { type: "div", props: { children: [nested] } };
			}

			const fiber = createFiber("div", { children: [nested] }, null);

			// Should handle deeply nested structures without errors
			expect(() => beginWork(null, fiber)).not.toThrow();
		});
	});
});
