/**
 * Commit Work Tests
 *
 * Tests for the commit phase of Fiber rendering.
 * This tests DOM mutations: placements, updates, and deletions.
 */

import { beforeEach, describe, expect, it } from "bun:test";
import { TEXT_ELEMENT } from "../../src/core/types";
import { commitRoot } from "../../src/fiber/commitWork";
import {
	createFiber,
	createWorkInProgress,
} from "../../src/fiber/fiberCreation";
import { Deletion, Placement, UpdateEffect } from "../../src/fiber/fiberFlags";
import { createFiberRoot } from "../../src/fiber/fiberRoot";
import type { FiberRoot } from "../../src/fiber/types";

describe("Commit Work", () => {
	let container: HTMLElement;
	let root: FiberRoot;

	beforeEach(() => {
		// DOM is already available via happy-dom global setup
		container = document.createElement("div");
		document.body.appendChild(container);
		root = createFiberRoot(container);
	});

	describe("DOM Operations - Placement", () => {
		it("should insert a single element into the DOM", () => {
			// Create a simple fiber tree: <div>Hello</div>
			const divFiber = createFiber("div", { children: [] }, null);
			const textFiber = createFiber(
				TEXT_ELEMENT,
				{ nodeValue: "Hello", children: [] },
				null,
			);

			// Set up relationships
			divFiber.child = textFiber;
			textFiber.return = divFiber;

			// Create DOM nodes during render phase (normally done by completeWork)
			const divElement = document.createElement("div");
			const textNode = document.createTextNode("Hello");
			// Complete work appends children before commit
			divElement.appendChild(textNode);

			divFiber.stateNode = divElement;
			textFiber.stateNode = textNode;

			// Mark for placement
			divFiber.effectTag = Placement;

			// Set up root and effect list
			root.current.child = divFiber;
			divFiber.return = root.current;

			// Create work-in-progress root
			const wipRoot = createWorkInProgress(root.current, { children: [] });
			wipRoot.child = divFiber;
			divFiber.return = wipRoot;

			// Set up effect list
			wipRoot.firstEffect = divFiber;
			wipRoot.lastEffect = divFiber;

			root.finishedWork = wipRoot;

			// Commit!
			commitRoot(root);

			// Verify DOM
			expect(container.children.length).toBe(1);
			expect(container.children[0].tagName).toBe("DIV");
			expect(container.children[0].textContent).toBe("Hello");
		});

		it("should insert multiple sibling elements", () => {
			// Create fiber tree: <div>One</div><div>Two</div>
			const div1 = createFiber("div", { children: [] }, null);
			const text1 = createFiber(
				TEXT_ELEMENT,
				{ nodeValue: "One", children: [] },
				null,
			);
			const div2 = createFiber("div", { children: [] }, null);
			const text2 = createFiber(
				TEXT_ELEMENT,
				{ nodeValue: "Two", children: [] },
				null,
			);

			// Set up tree
			div1.child = text1;
			text1.return = div1;
			div1.sibling = div2;
			div2.child = text2;
			text2.return = div2;

			// Create DOM nodes and append children
			const div1Element = document.createElement("div");
			const text1Node = document.createTextNode("One");
			div1Element.appendChild(text1Node);

			const div2Element = document.createElement("div");
			const text2Node = document.createTextNode("Two");
			div2Element.appendChild(text2Node);

			div1.stateNode = div1Element;
			text1.stateNode = text1Node;
			div2.stateNode = div2Element;
			text2.stateNode = text2Node;

			// Mark for placement
			div1.effectTag = Placement;
			div2.effectTag = Placement;

			// Create work-in-progress root
			const wipRoot = createWorkInProgress(root.current, { children: [] });
			wipRoot.child = div1;
			div1.return = wipRoot;
			div2.return = wipRoot;

			// Set up effect list
			wipRoot.firstEffect = div1;
			div1.nextEffect = div2;
			wipRoot.lastEffect = div2;

			root.finishedWork = wipRoot;

			// Commit!
			commitRoot(root);

			// Verify DOM
			expect(container.children.length).toBe(2);
			expect(container.children[0].textContent).toBe("One");
			expect(container.children[1].textContent).toBe("Two");
		});

		it("should insert nested elements", () => {
			// Create fiber tree: <div><span>Nested</span></div>
			const divFiber = createFiber("div", { children: [] }, null);
			const spanFiber = createFiber("span", { children: [] }, null);
			const textFiber = createFiber(
				TEXT_ELEMENT,
				{ nodeValue: "Nested", children: [] },
				null,
			);

			// Set up relationships
			divFiber.child = spanFiber;
			spanFiber.return = divFiber;
			spanFiber.child = textFiber;
			textFiber.return = spanFiber;

			// Create DOM nodes
			const divElement = document.createElement("div");
			const spanElement = document.createElement("span");
			const textNode = document.createTextNode("Nested");

			// Append children during render phase (normally done by completeWork)
			spanElement.appendChild(textNode);
			divElement.appendChild(spanElement);

			divFiber.stateNode = divElement;
			spanFiber.stateNode = spanElement;
			textFiber.stateNode = textNode;

			// Mark for placement
			divFiber.effectTag = Placement;

			// Create work-in-progress root
			const wipRoot = createWorkInProgress(root.current, { children: [] });
			wipRoot.child = divFiber;
			divFiber.return = wipRoot;

			// Set up effect list
			wipRoot.firstEffect = divFiber;
			wipRoot.lastEffect = divFiber;

			root.finishedWork = wipRoot;

			// Commit!
			commitRoot(root);

			// Verify DOM
			expect(container.children.length).toBe(1);
			expect(container.children[0].tagName).toBe("DIV");
			const div = container.children[0];
			expect(div.children.length).toBe(1);
			expect(div.children[0].tagName).toBe("SPAN");
			expect(div.children[0].textContent).toBe("Nested");
		});
	});

	describe("DOM Operations - Updates", () => {
		it("should update element properties", () => {
			// Create initial fiber
			const divFiber = createFiber(
				"div",
				{ className: "old", children: [] },
				null,
			);
			divFiber.stateNode = document.createElement("div");
			(divFiber.stateNode as HTMLElement).className = "old";
			container.appendChild(divFiber.stateNode as HTMLElement);

			// Create updated fiber
			const wipFiber = createWorkInProgress(divFiber, {
				className: "new",
				children: [],
			});
			wipFiber.stateNode = divFiber.stateNode;
			wipFiber.effectTag = UpdateEffect;
			wipFiber.memoizedProps = { className: "new", children: [] };
			divFiber.memoizedProps = { className: "old", children: [] };

			// Set up root
			root.current = divFiber;
			divFiber.stateNode = root;
			root.finishedWork = wipFiber;
			wipFiber.child = createFiber(
				"div",
				{ className: "new", children: [] },
				null,
			);
			wipFiber.child.stateNode = container.children[0];
			wipFiber.child.return = wipFiber;
			wipFiber.child.effectTag = UpdateEffect;
			wipFiber.child.alternate = divFiber;
			wipFiber.child.memoizedProps = { className: "new", children: [] };

			// Set up effect list
			wipFiber.firstEffect = wipFiber.child;
			wipFiber.lastEffect = wipFiber.child;

			// Commit!
			commitRoot(root);

			// Verify update
			expect((container.children[0] as HTMLElement).className).toBe("new");
		});

		it("should update text content", () => {
			// Create initial text fiber
			const textFiber = createFiber(
				TEXT_ELEMENT,
				{ nodeValue: "Old", children: [] },
				null,
			);
			textFiber.stateNode = document.createTextNode("Old");
			container.appendChild(textFiber.stateNode as Text);

			// Create updated fiber
			const wipFiber = createWorkInProgress(textFiber, {
				nodeValue: "New",
				children: [],
			});
			wipFiber.stateNode = textFiber.stateNode;
			wipFiber.effectTag = UpdateEffect;
			wipFiber.memoizedProps = { nodeValue: "New", children: [] };
			textFiber.memoizedProps = { nodeValue: "Old", children: [] };

			// Set up root
			const rootFiber = createFiber(null, { children: [] }, null);
			rootFiber.stateNode = root;
			root.current = rootFiber;

			const wipRoot = createWorkInProgress(rootFiber, { children: [] });
			wipRoot.child = wipFiber;
			wipFiber.return = wipRoot;

			// Set up effect list
			wipRoot.firstEffect = wipFiber;
			wipRoot.lastEffect = wipFiber;

			root.finishedWork = wipRoot;

			// Commit!
			commitRoot(root);

			// Verify update
			expect((container.childNodes[0] as Text).textContent).toBe("New");
		});
	});

	describe("DOM Operations - Deletions", () => {
		it("should remove a deleted element", () => {
			// Create initial fiber
			const divFiber = createFiber("div", { children: [] }, null);
			divFiber.stateNode = document.createElement("div");
			(divFiber.stateNode as HTMLElement).textContent = "Delete me";
			container.appendChild(divFiber.stateNode as HTMLElement);

			expect(container.children.length).toBe(1);

			// Create WIP root with deletion
			const rootFiber = createFiber(null, { children: [] }, null);
			rootFiber.stateNode = root;
			root.current = rootFiber;
			rootFiber.child = divFiber;
			divFiber.return = rootFiber;

			const wipRoot = createWorkInProgress(rootFiber, { children: [] });
			wipRoot.child = null; // No children in new tree
			wipRoot.deletions = [divFiber]; // Mark for deletion

			// Add to effect list
			wipRoot.firstEffect = divFiber;
			wipRoot.lastEffect = divFiber;
			divFiber.effectTag = Deletion;

			root.finishedWork = wipRoot;

			// Commit!
			commitRoot(root);

			// Verify deletion
			expect(container.children.length).toBe(0);
		});

		it("should remove multiple deleted elements", () => {
			// Create initial fibers
			const div1 = createFiber("div", { children: [] }, null);
			div1.stateNode = document.createElement("div");
			(div1.stateNode as HTMLElement).textContent = "One";

			const div2 = createFiber("div", { children: [] }, null);
			div2.stateNode = document.createElement("div");
			(div2.stateNode as HTMLElement).textContent = "Two";

			container.appendChild(div1.stateNode as HTMLElement);
			container.appendChild(div2.stateNode as HTMLElement);

			expect(container.children.length).toBe(2);

			// Create WIP root with deletions
			const rootFiber = createFiber(null, { children: [] }, null);
			rootFiber.stateNode = root;
			root.current = rootFiber;
			rootFiber.child = div1;
			div1.return = rootFiber;
			div1.sibling = div2;
			div2.return = rootFiber;

			const wipRoot = createWorkInProgress(rootFiber, { children: [] });
			wipRoot.child = null;
			wipRoot.deletions = [div1, div2];

			// Add to effect list
			div1.effectTag = Deletion;
			div1.nextEffect = div2;
			div2.effectTag = Deletion;
			wipRoot.firstEffect = div1;
			wipRoot.lastEffect = div2;

			root.finishedWork = wipRoot;

			// Commit!
			commitRoot(root);

			// Verify deletions
			expect(container.children.length).toBe(0);
		});
	});

	describe("Ref Handling", () => {
		it("should attach ref callback on mount", () => {
			let refValue: HTMLElement | null = null;
			const refCallback = (node: HTMLElement | null) => {
				refValue = node;
			};

			// Create fiber with ref
			const divFiber = createFiber("div", { children: [] }, null);
			divFiber.stateNode = document.createElement("div");
			// @ts-expect-error - Testing with incomplete props intentionally
			divFiber.ref = refCallback;
			divFiber.effectTag = Placement;

			// Set up root
			const rootFiber = createFiber(null, { children: [] }, null);
			rootFiber.stateNode = root;
			root.current = rootFiber;

			const wipRoot = createWorkInProgress(rootFiber, { children: [] });
			wipRoot.child = divFiber;
			divFiber.return = wipRoot;

			// Set up effect list (placement will be in mutation phase)
			wipRoot.firstEffect = divFiber;
			wipRoot.lastEffect = divFiber;

			root.finishedWork = wipRoot;

			// Commit!
			commitRoot(root);

			// Verify ref was called
			// @ts-expect-error - Testing with incomplete props intentionally
			expect(refValue).toBe(divFiber.stateNode);
		});

		it("should attach ref object on mount", () => {
			const refObject = { current: null as HTMLElement | null };

			// Create fiber with ref
			const divFiber = createFiber("div", { children: [] }, null);
			divFiber.stateNode = document.createElement("div");
			divFiber.ref = refObject;
			divFiber.effectTag = Placement;

			// Set up root
			const rootFiber = createFiber(null, { children: [] }, null);
			rootFiber.stateNode = root;
			root.current = rootFiber;

			const wipRoot = createWorkInProgress(rootFiber, { children: [] });
			wipRoot.child = divFiber;
			divFiber.return = wipRoot;

			wipRoot.firstEffect = divFiber;
			wipRoot.lastEffect = divFiber;

			root.finishedWork = wipRoot;

			// Commit!
			commitRoot(root);

			// Verify ref.current was set
			// @ts-expect-error - Testing with incomplete props intentionally
			expect(refObject.current).toBe(divFiber.stateNode);
		});

		it("should detach ref on deletion", () => {
			// Simulate that ref was previously attached
			const divElement = document.createElement("div");
			container.appendChild(divElement);

			let refValue: HTMLElement | null = divElement;
			const refCallback = (node: HTMLElement | null) => {
				refValue = node;
			};

			// Create fiber with ref (simulating a previously mounted fiber)
			const divFiber = createFiber("div", { children: [] }, null);
			divFiber.stateNode = divElement;
			// @ts-expect-error - Testing with incomplete ref callback types intentionally
			divFiber.ref = refCallback;
			divFiber.effectTag = Deletion;

			// Set up root with deletion
			const rootFiber = createFiber(null, { children: [] }, null);
			rootFiber.stateNode = root;
			root.current = rootFiber;
			rootFiber.child = divFiber;
			divFiber.return = rootFiber;

			const wipRoot = createWorkInProgress(rootFiber, { children: [] });
			wipRoot.child = null;
			wipRoot.deletions = [divFiber];

			wipRoot.firstEffect = divFiber;
			wipRoot.lastEffect = divFiber;

			root.finishedWork = wipRoot;

			// Verify initial state
			expect(refValue).toBe(divElement);
			expect(container.children.length).toBe(1);

			// Commit - this detaches the ref and removes the element
			commitRoot(root);

			// @ts-expect-error - Testing with incomplete props intentionally
			// Verify ref was cleared
			expect(refValue).toBe(null);
			expect(container.children.length).toBe(0);
		});
	});

	describe("Edge Cases", () => {
		it("should handle null finishedWork gracefully", () => {
			root.finishedWork = null;

			// Should not throw
			expect(() => commitRoot(root)).not.toThrow();
		});

		it("should handle fibers without DOM nodes (components)", () => {
			// Create a component fiber (function type)
			const componentFiber = createFiber(() => null, { children: [] }, null);
			const divFiber = createFiber("div", { children: [] }, null);
			divFiber.stateNode = document.createElement("div");
			divFiber.effectTag = Placement;

			// Component wraps the div
			componentFiber.child = divFiber;
			divFiber.return = componentFiber;

			// Set up root
			const rootFiber = createFiber(null, { children: [] }, null);
			rootFiber.stateNode = root;
			root.current = rootFiber;

			const wipRoot = createWorkInProgress(rootFiber, { children: [] });
			wipRoot.child = componentFiber;
			componentFiber.return = wipRoot;

			wipRoot.firstEffect = divFiber;
			wipRoot.lastEffect = divFiber;

			root.finishedWork = wipRoot;

			// Commit!
			commitRoot(root);

			// Verify div was inserted (component was skipped)
			expect(container.children.length).toBe(1);
			expect(container.children[0].tagName).toBe("DIV");
		});

		it("should switch current pointer after commit", () => {
			const oldCurrent = root.current;
			const newFiber = createWorkInProgress(root.current, { children: [] });

			root.finishedWork = newFiber;

			commitRoot(root);

			// Verify current pointer was switched
			expect(root.current).toBe(newFiber);
			expect(root.current).not.toBe(oldCurrent);
		});

		it("should clear finishedWork after commit", () => {
			const fiber = createWorkInProgress(root.current, { children: [] });
			root.finishedWork = fiber;

			commitRoot(root);

			// @ts-expect-error - Testing with incomplete props intentionally
			// Verify finishedWork was cleared
			expect(root.finishedWork).toBe(null);
		});
	});
});
