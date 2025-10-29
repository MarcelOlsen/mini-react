// @ts-nocheck - Test file uses incomplete props intentionally to test specific functionality
/**
 * CompleteWork Tests
 *
 * These tests validate the completeWork phase of reconciliation:
 * - DOM node creation
 * - DOM node updates (marking with UPDATE effect)
 * - Effect tagging (PLACEMENT, UPDATE)
 * - Child DOM node collection
 * - Handling all fiber types
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { FRAGMENT, PORTAL, TEXT_ELEMENT } from "../../src/core/types";
import {
	Placement,
	UpdateEffect,
	createFiber,
	createFiberRoot,
	createWorkInProgress,
} from "../../src/fiber";
import type { Fiber } from "../../src/fiber";
import { beginWork } from "../../src/fiber/beginWork";
import { completeWork } from "../../src/fiber/completeWork";

describe("CompleteWork", () => {
	let container: HTMLElement;

	beforeEach(() => {
		container = document.createElement("div");
		document.body.appendChild(container);
	});

	afterEach(() => {
		// Clean up DOM
		if (container?.parentNode) {
			container.parentNode.removeChild(container);
		}
		// Clear document.body children
		while (document.body.firstChild) {
			document.body.removeChild(document.body.firstChild);
		}
	});

	describe("Host Component", () => {
		test("should create DOM node on mount", () => {
			const fiber = createFiber("div", { id: "test", children: [] }, null);

			completeWork(null, fiber);

			expect(fiber.stateNode).toBeInstanceOf(HTMLDivElement);
			expect(fiber.effectTag).toBe(Placement);
		});

		test("should create correct element type", () => {
			const types = ["div", "span", "button", "section", "article"];

			for (const type of types) {
				const fiber = createFiber(type, {}, null);
				completeWork(null, fiber);

				expect(fiber.stateNode).toBeDefined();
				expect((fiber.stateNode as HTMLElement).tagName.toLowerCase()).toBe(
					type,
				);
			}
		});

		test("should mark for update when props change", () => {
			// First render
			const current = createFiber("div", { id: "old", children: [] }, null);
			completeWork(null, current);
			current.memoizedProps = { id: "old", children: [] };

			// Update with different props
			const wip = createWorkInProgress(current, { id: "new", children: [] });

			completeWork(current, wip);

			expect(wip.effectTag).toBe(UpdateEffect);
		});

		test("should not mark for update when props unchanged", () => {
			// First render
			const current = createFiber("div", { id: "test", children: [] }, null);
			completeWork(null, current);
			current.memoizedProps = { id: "test", children: [] };

			// Update with same props
			const wip = createWorkInProgress(current, { id: "test", children: [] });

			completeWork(current, wip);

			// Should not have effect tag
			expect(wip.effectTag).toBeNull();
		});

		test("should append single child DOM node", () => {
			// Create parent
			const parent = createFiber("div", { children: [] }, null);

			// Create child
			const child = createFiber("span", {}, null);
			completeWork(null, child);

			// Link them
			parent.child = child;
			child.return = parent;

			// Complete parent - should append child's DOM
			completeWork(null, parent);

			const parentDOM = parent.stateNode as HTMLElement;
			const childDOM = child.stateNode as HTMLElement;

			expect(parentDOM.children.length).toBe(1);
			expect(parentDOM.children[0]).toBe(childDOM);
		});

		test("should append multiple child DOM nodes", () => {
			// Create parent
			const parent = createFiber("div", { children: [] }, null);

			// Create children
			const child1 = createFiber("span", {}, null);
			const child2 = createFiber("p", {}, null);
			const child3 = createFiber("button", {}, null);

			completeWork(null, child1);
			completeWork(null, child2);
			completeWork(null, child3);

			// Link them
			parent.child = child1;
			child1.return = parent;
			child1.sibling = child2;
			child2.return = parent;
			child2.sibling = child3;
			child3.return = parent;

			// Complete parent
			completeWork(null, parent);

			const parentDOM = parent.stateNode as HTMLElement;

			expect(parentDOM.children.length).toBe(3);
			expect(parentDOM.children[0]).toBe(child1.stateNode);
			expect(parentDOM.children[1]).toBe(child2.stateNode);
			expect(parentDOM.children[2]).toBe(child3.stateNode);
		});

		test("should skip function component children and append their DOM", () => {
			// Create tree: div -> FunctionComponent -> span
			const parent = createFiber("div", {}, null);

			const Component = () => ({ type: "span", props: {} });
			const funcFiber = createFiber(Component, {}, null);
			funcFiber.return = parent;
			parent.child = funcFiber;

			// Function component's child (span)
			const span = createFiber("span", {}, null);
			completeWork(null, span);
			span.return = funcFiber;
			funcFiber.child = span;

			// Complete function component (no DOM)
			completeWork(null, funcFiber);

			// Complete parent - should find span's DOM
			completeWork(null, parent);

			const parentDOM = parent.stateNode as HTMLElement;
			expect(parentDOM.children.length).toBe(1);
			expect(parentDOM.children[0]).toBe(span.stateNode);
		});

		test("should skip fragment children and append their DOM", () => {
			// Create tree: div -> Fragment -> (span, p)
			const parent = createFiber("div", {}, null);

			const fragment = createFiber(FRAGMENT, {}, null);
			fragment.return = parent;
			parent.child = fragment;

			const span = createFiber("span", {}, null);
			const p = createFiber("p", {}, null);
			completeWork(null, span);
			completeWork(null, p);

			fragment.child = span;
			span.return = fragment;
			span.sibling = p;
			p.return = fragment;

			// Complete fragment
			completeWork(null, fragment);

			// Complete parent
			completeWork(null, parent);

			const parentDOM = parent.stateNode as HTMLElement;
			expect(parentDOM.children.length).toBe(2);
			expect(parentDOM.children[0]).toBe(span.stateNode);
			expect(parentDOM.children[1]).toBe(p.stateNode);
		});

		test("should not append portal children", () => {
			// Create tree: div -> Portal -> span
			const parent = createFiber("div", {}, null);

			const portalTarget = document.createElement("div");
			const portal = createFiber(
				PORTAL,
				{ targetContainer: portalTarget },
				null,
			);
			portal.return = parent;
			parent.child = portal;

			const span = createFiber("span", {}, null);
			completeWork(null, span);
			span.return = portal;
			portal.child = span;

			// Complete portal
			completeWork(null, portal);

			// Complete parent
			completeWork(null, parent);

			const parentDOM = parent.stateNode as HTMLElement;

			// Parent should have no children (portal renders elsewhere)
			expect(parentDOM.children.length).toBe(0);
		});

		test("should handle nested structures", () => {
			// Tree: div -> div -> span
			const grandparent = createFiber("div", {}, null);

			const parent = createFiber("div", {}, null);
			parent.return = grandparent;
			grandparent.child = parent;

			const child = createFiber("span", {}, null);
			child.return = parent;
			parent.child = child;

			// Complete from bottom up
			completeWork(null, child);
			completeWork(null, parent);
			completeWork(null, grandparent);

			const grandparentDOM = grandparent.stateNode as HTMLElement;
			const parentDOM = parent.stateNode as HTMLElement;
			const childDOM = child.stateNode as HTMLElement;

			expect(grandparentDOM.children[0]).toBe(parentDOM);
			expect(parentDOM.children[0]).toBe(childDOM);
		});

		test("should reuse existing DOM node on update", () => {
			// First render
			const current = createFiber("div", {}, null);
			completeWork(null, current);
			current.memoizedProps = {};

			const originalDOM = current.stateNode;

			// Update
			const wip = createWorkInProgress(current, {});
			completeWork(current, wip);

			// Should reuse same DOM node
			expect(wip.stateNode).toBe(originalDOM);
		});
	});

	describe("Text Node", () => {
		test("should create text node on mount", () => {
			const fiber = createFiber(
				TEXT_ELEMENT,
				{ nodeValue: "hello", children: [] },
				null,
			);

			// Debug: Log initial state
			console.log("BEFORE completeWork:", {
				stateNode: fiber.stateNode,
				stateNodeType: fiber.stateNode?.constructor?.name,
				effectTag: fiber.effectTag,
				pendingProps: fiber.pendingProps,
				type: fiber.type,
			});

			completeWork(null, fiber);

			// Debug: Log final state
			console.log("AFTER completeWork:", {
				stateNode: fiber.stateNode,
				stateNodeType: fiber.stateNode?.constructor?.name,
				effectTag: fiber.effectTag,
				isText: fiber.stateNode instanceof Text,
				TextConstructor: Text,
				actualConstructor: fiber.stateNode?.constructor,
				match: fiber.stateNode?.constructor === Text,
			});

			if (!(fiber.stateNode instanceof Text)) {
				console.error("INSTANCEOF FAILED!");
				console.error("stateNode constructor:", fiber.stateNode?.constructor);
				console.error("Text constructor:", Text);
				console.error("Are they equal?", fiber.stateNode?.constructor === Text);
				console.error(
					"stateNode proto:",
					Object.getPrototypeOf(fiber.stateNode),
				);
				console.error("Text proto:", Text.prototype);
			}

			expect(fiber.stateNode).toBeInstanceOf(Text);
			expect((fiber.stateNode as Text).textContent).toBe("hello");
			expect(fiber.effectTag).toBe(Placement);
		});

		test("should mark for update when text changes", () => {
			// First render
			const current = createFiber(
				TEXT_ELEMENT,
				{ nodeValue: "old", children: [] },
				null,
			);
			completeWork(null, current);
			current.memoizedProps = { nodeValue: "old", children: [] };

			// Update with different text
			const wip = createWorkInProgress(current, {
				nodeValue: "new",
				children: [],
			});

			completeWork(current, wip);

			expect(wip.effectTag).toBe(UpdateEffect);
		});

		test("should not mark for update when text unchanged", () => {
			// First render
			const current = createFiber(
				TEXT_ELEMENT,
				{ nodeValue: "hello", children: [] },
				null,
			);
			completeWork(null, current);
			current.memoizedProps = { nodeValue: "hello", children: [] };

			// Update with same text
			const wip = createWorkInProgress(current, {
				nodeValue: "hello",
				children: [],
			});

			completeWork(current, wip);

			expect(wip.effectTag).toBeNull();
		});

		test("should handle numeric text", () => {
			const fiber = createFiber(TEXT_ELEMENT, { nodeValue: 123 }, null);

			completeWork(null, fiber);

			expect((fiber.stateNode as Text).textContent).toBe("123");
		});

		test("should handle empty string", () => {
			const fiber = createFiber(
				TEXT_ELEMENT,
				{ nodeValue: "", children: [] },
				null,
			);

			completeWork(null, fiber);

			expect((fiber.stateNode as Text).textContent).toBe("");
		});

		test("should append text node to parent", () => {
			const parent = createFiber("div", {}, null);
			const text = createFiber(
				TEXT_ELEMENT,
				{ nodeValue: "hello", children: [] },
				null,
			);

			completeWork(null, text);

			parent.child = text;
			text.return = parent;

			completeWork(null, parent);

			const parentDOM = parent.stateNode as HTMLElement;
			expect(parentDOM.childNodes.length).toBe(1);
			expect(parentDOM.textContent).toBe("hello");
		});
	});

	describe("Fragment", () => {
		test("should not create DOM node", () => {
			const fiber = createFiber(FRAGMENT, {}, null);

			completeWork(null, fiber);

			expect(fiber.stateNode).toBeNull();
		});

		test("should not have effect tag", () => {
			const fiber = createFiber(FRAGMENT, {}, null);

			completeWork(null, fiber);

			expect(fiber.effectTag).toBeNull();
		});

		test("should handle fragment on update", () => {
			const current = createFiber(FRAGMENT, {}, null);
			completeWork(null, current);

			const wip = createWorkInProgress(current, {});
			completeWork(current, wip);

			expect(wip.stateNode).toBeNull();
		});
	});

	describe("Portal", () => {
		test("should store container info in stateNode", () => {
			const target = document.createElement("div");
			const fiber = createFiber(PORTAL, { targetContainer: target }, null);

			completeWork(null, fiber);

			expect(fiber.stateNode).not.toBeNull();
			expect(
				(fiber.stateNode as { containerInfo: HTMLElement }).containerInfo,
			).toBe(target);
		});

		test("should not have effect tag", () => {
			const target = document.createElement("div");
			const fiber = createFiber(PORTAL, { targetContainer: target }, null);

			completeWork(null, fiber);

			expect(fiber.effectTag).toBeNull();
		});
	});

	describe("Function Component", () => {
		test("should not create DOM node", () => {
			const Component = () => ({ type: "div", props: {} });
			const fiber = createFiber(Component, {}, null);

			completeWork(null, fiber);

			expect(fiber.stateNode).toBeNull();
		});

		test("should not have effect tag", () => {
			const Component = () => ({ type: "div", props: {} });
			const fiber = createFiber(Component, {}, null);

			completeWork(null, fiber);

			expect(fiber.effectTag).toBeNull();
		});
	});

	describe("Host Root", () => {
		test("should not modify stateNode", () => {
			const root = createFiberRoot(container);
			const rootFiber = root.current;
			const originalStateNode = rootFiber.stateNode;

			completeWork(null, rootFiber);

			expect(rootFiber.stateNode).toBe(originalStateNode);
		});

		test("should not have effect tag", () => {
			const root = createFiberRoot(container);
			const rootFiber = root.current;

			completeWork(null, rootFiber);

			expect(rootFiber.effectTag).toBeNull();
		});
	});

	describe("Full Tree Completion", () => {
		test("should complete simple tree correctly", () => {
			// Tree: div -> span
			const div = createFiber("div", { children: [] }, null);
			const span = createFiber("span", {}, null);

			div.child = span;
			span.return = div;

			// Complete bottom-up
			completeWork(null, span);
			completeWork(null, div);

			expect(span.effectTag).toBe(Placement);
			expect(div.effectTag).toBe(Placement);
			expect((div.stateNode as HTMLElement).children[0]).toBe(span.stateNode);
		});

		test("should complete tree with siblings", () => {
			// Tree: div -> (span, p, button)
			const div = createFiber("div", {}, null);
			const span = createFiber("span", {}, null);
			const p = createFiber("p", {}, null);
			const button = createFiber("button", {}, null);

			div.child = span;
			span.return = div;
			span.sibling = p;
			p.return = div;
			p.sibling = button;
			button.return = div;

			// Complete all
			completeWork(null, span);
			completeWork(null, p);
			completeWork(null, button);
			completeWork(null, div);

			const divDOM = div.stateNode as HTMLElement;
			expect(divDOM.children.length).toBe(3);
			expect(divDOM.children[0]).toBe(span.stateNode);
			expect(divDOM.children[1]).toBe(p.stateNode);
			expect(divDOM.children[2]).toBe(button.stateNode);
		});

		test("should complete deep tree", () => {
			// Tree: div -> section -> article -> p
			const div = createFiber("div", {}, null);
			const section = createFiber("section", {}, null);
			const article = createFiber("article", {}, null);
			const p = createFiber("p", {}, null);

			div.child = section;
			section.return = div;
			section.child = article;
			article.return = section;
			article.child = p;
			p.return = article;

			// Complete bottom-up
			completeWork(null, p);
			completeWork(null, article);
			completeWork(null, section);
			completeWork(null, div);

			const divDOM = div.stateNode as HTMLElement;
			const sectionDOM = section.stateNode as HTMLElement;
			const articleDOM = article.stateNode as HTMLElement;
			const pDOM = p.stateNode as HTMLElement;

			expect(divDOM.children[0]).toBe(sectionDOM);
			expect(sectionDOM.children[0]).toBe(articleDOM);
			expect(articleDOM.children[0]).toBe(pDOM);
		});

		test("should complete tree with mixed types", () => {
			// Tree: div -> (FunctionComponent -> span, Fragment -> (p, button))
			const div = createFiber("div", {}, null);

			const Component = () => ({ type: "span", props: {} });
			const funcFiber = createFiber(Component, {}, null);
			const span = createFiber("span", {}, null);

			const fragment = createFiber(FRAGMENT, {}, null);
			const p = createFiber("p", {}, null);
			const button = createFiber("button", {}, null);

			// Link structure
			div.child = funcFiber;
			funcFiber.return = div;
			funcFiber.sibling = fragment;
			fragment.return = div;

			funcFiber.child = span;
			span.return = funcFiber;

			fragment.child = p;
			p.return = fragment;
			p.sibling = button;
			button.return = fragment;

			// Complete all
			completeWork(null, span);
			completeWork(null, funcFiber);
			completeWork(null, p);
			completeWork(null, button);
			completeWork(null, fragment);
			completeWork(null, div);

			const divDOM = div.stateNode as HTMLElement;

			// Should have span (from function component) and p, button (from fragment)
			expect(divDOM.children.length).toBe(3);
		});
	});

	describe("Integration with BeginWork", () => {
		test("should work with beginWork to build complete tree", () => {
			const root = createFiberRoot(container);
			const rootFiber = root.current;
			rootFiber.pendingProps = {
				children: [
					{
						type: "div",
						props: {
							children: [
								{ type: "span", props: { children: [] } },
								{ type: "p", props: { children: [] } },
							],
						},
					},
				],
			};

			// Begin work on root
			const div = beginWork(null, rootFiber);
			expect(div).not.toBeNull();

			// Begin work on div
			const span = beginWork(null, div!);
			expect(span).not.toBeNull();

			// Complete span (no children)
			completeWork(null, span!);

			// Get p (sibling of span)
			const p = span?.sibling;
			expect(p).not.toBeNull();

			// Complete p
			completeWork(null, p!);

			// Complete div
			completeWork(null, div!);

			// Verify structure
			const divDOM = div?.stateNode as HTMLElement;
			expect(divDOM.children.length).toBe(2);
		});

		test("should handle updates correctly", () => {
			// First render
			const current = createFiber(
				"div",
				{
					children: [{ type: "span", props: { id: "old" } }],
				},
				null,
			);

			const currentChild = beginWork(null, current);
			completeWork(null, currentChild!);
			completeWork(null, current);
			current.memoizedProps = current.pendingProps;
			currentChild!.memoizedProps = currentChild?.pendingProps;

			// Update
			const wip = createWorkInProgress(current, {
				children: [{ type: "span", props: { id: "new" } }],
			});

			const wipChild = beginWork(current, wip);
			completeWork(currentChild, wipChild!);
			completeWork(current, wip);

			// Child should be marked for update
			expect(wipChild?.effectTag).toBe(UpdateEffect);
		});
	});

	describe("Edge Cases", () => {
		test("should handle fiber with no type", () => {
			const fiber = createFiber("div", {}, null);
			fiber.type = null;

			// Should handle gracefully (root fiber)
			expect(() => completeWork(null, fiber)).not.toThrow();
		});

		test("should handle missing stateNode on update", () => {
			const current = createFiber("div", {}, null);
			// Don't complete current (no stateNode)

			const wip = createWorkInProgress(current, {});

			// Should create new DOM node
			completeWork(current, wip);

			expect(wip.stateNode).toBeInstanceOf(HTMLElement);
			expect(wip.effectTag).toBe(Placement);
		});

		test("should handle complex appendAllChildren scenarios", () => {
			// Tree: div -> FunctionComponent -> Fragment -> (span, p)
			const div = createFiber("div", {}, null);

			const Component = () => ({ type: FRAGMENT, props: {} });
			const funcFiber = createFiber(Component, {}, null);
			const fragment = createFiber(FRAGMENT, {}, null);
			const span = createFiber("span", {}, null);
			const p = createFiber("p", {}, null);

			div.child = funcFiber;
			funcFiber.return = div;
			funcFiber.child = fragment;
			fragment.return = funcFiber;
			fragment.child = span;
			span.return = fragment;
			span.sibling = p;
			p.return = fragment;

			// Complete bottom-up
			completeWork(null, span);
			completeWork(null, p);
			completeWork(null, fragment);
			completeWork(null, funcFiber);
			completeWork(null, div);

			const divDOM = div.stateNode as HTMLElement;

			// Should find both span and p through function component and fragment
			expect(divDOM.children.length).toBe(2);
		});
	});

	describe("Performance", () => {
		test("should handle large number of children efficiently", () => {
			const parent = createFiber("div", {}, null);

			// Create 100 children
			let prevChild: Fiber | null = null;
			for (let i = 0; i < 100; i++) {
				const child = createFiber("span", {}, null);
				completeWork(null, child);
				child.return = parent;

				if (i === 0) {
					parent.child = child;
				} else {
					prevChild!.sibling = child;
				}
				prevChild = child;
			}

			const start = performance.now();
			completeWork(null, parent);
			const duration = performance.now() - start;

			expect(duration).toBeLessThan(50);
			expect((parent.stateNode as HTMLElement).children.length).toBe(100);
		});

		test("should handle deep nesting efficiently", () => {
			// Create 50 deep nesting
			let deepest: Fiber | null = null;
			let top: Fiber | null = null;

			for (let i = 0; i < 50; i++) {
				const fiber = createFiber("div", {}, null);

				if (i === 0) {
					deepest = fiber;
					top = fiber;
				} else {
					fiber.child = deepest;
					deepest!.return = fiber;
					deepest = fiber;
				}
			}

			// Complete from bottom up
			const start = performance.now();
			let current = top;
			while (current) {
				completeWork(null, current);
				current = current.return;
			}
			const duration = performance.now() - start;

			expect(duration).toBeLessThan(30);
		});
	});
});
