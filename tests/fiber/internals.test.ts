import { describe, expect, test } from "bun:test";
import { createElement } from "@/MiniReact";
import {
	type Fiber,
	Placement,
	WorkTag,
	createFiber,
	createFlags,
	createWorkInProgress,
	findHostSibling,
	useStateFiber,
} from "@/fiber";
import { createTestRoot, renderFiber } from "@tests/helpers/fiberTestUtils";

/**
 * Helper to build a minimal fiber tree for unit testing.
 */
function buildFiber(
	tag: (typeof WorkTag)[keyof typeof WorkTag],
	key: string | null = null,
): Fiber {
	return createFiber(tag, {}, key);
}

function attachStateNode(fiber: Fiber, node: Element | Text): void {
	fiber.stateNode = node;
}

function linkFibers(parent: Fiber, ...children: Fiber[]): void {
	if (children.length === 0) return;
	parent.child = children[0]!;
	for (let i = 0; i < children.length; i++) {
		children[i]!.return = parent;
		if (i < children.length - 1) {
			children[i]!.sibling = children[i + 1]!;
		}
	}
}

describe("Fiber Internals", () => {
	describe("findHostSibling", () => {
		// P5.1: Sibling through FC wrapper
		test("should find sibling through function component wrapper", () => {
			const root = buildFiber(WorkTag.HostRoot);
			const fc = buildFiber(WorkTag.FunctionComponent);
			const fcChild = buildFiber(WorkTag.HostComponent);
			const span = buildFiber(WorkTag.HostComponent);

			linkFibers(root, fc, span);
			linkFibers(fc, fcChild);

			const spanNode = document.createElement("span");
			const fcChildNode = document.createElement("p");

			attachStateNode(fcChild, fcChildNode);
			attachStateNode(span, spanNode);

			// FC has Placement flag, finding sibling should return span
			fc.flags = createFlags((fc.flags as number) | (Placement as number));

			const sibling = findHostSibling(fc);
			expect(sibling).toBe(spanNode);
		});

		// P5.2: Sibling skipping portals
		test("should skip portal fibers when finding siblings", () => {
			const root = buildFiber(WorkTag.HostRoot);
			const portal = buildFiber(WorkTag.HostPortal);
			const div = buildFiber(WorkTag.HostComponent);

			linkFibers(root, portal, div);

			const portalContainer = document.createElement("div");
			portal.stateNode = { containerInfo: portalContainer };

			const divNode = document.createElement("div");
			attachStateNode(div, divNode);

			portal.flags = createFlags(
				(portal.flags as number) | (Placement as number),
			);

			const sibling = findHostSibling(portal);
			expect(sibling).toBe(divNode);
		});

		// P5.3: Walking up and across
		test("should walk up and find sibling at higher level", () => {
			const root = buildFiber(WorkTag.HostRoot);
			const wrapper = buildFiber(WorkTag.FunctionComponent);
			const innerFC = buildFiber(WorkTag.FunctionComponent);
			const deepChild = buildFiber(WorkTag.HostComponent);
			const span = buildFiber(WorkTag.HostComponent);

			linkFibers(root, wrapper, span);
			linkFibers(wrapper, innerFC);
			linkFibers(innerFC, deepChild);

			const deepChildNode = document.createElement("p");
			const spanNode = document.createElement("span");
			attachStateNode(deepChild, deepChildNode);
			attachStateNode(span, spanNode);

			// deepChild has Placement, should walk up through innerFC, wrapper, find span
			deepChild.flags = createFlags(
				(deepChild.flags as number) | (Placement as number),
			);

			const sibling = findHostSibling(deepChild);
			expect(sibling).toBe(spanNode);
		});

		// P5.4: Skipping placed siblings
		test("should skip siblings that have Placement flag", () => {
			const root = buildFiber(WorkTag.HostRoot);
			const a = buildFiber(WorkTag.HostComponent);
			const b = buildFiber(WorkTag.HostComponent);
			const c = buildFiber(WorkTag.HostComponent);

			linkFibers(root, a, b, c);

			const aNode = document.createElement("div");
			const bNode = document.createElement("div");
			const cNode = document.createElement("div");

			attachStateNode(a, aNode);
			attachStateNode(b, bNode);
			attachStateNode(c, cNode);

			// a has Placement, b also has Placement — should skip to c
			a.flags = createFlags((a.flags as number) | (Placement as number));
			b.flags = createFlags((b.flags as number) | (Placement as number));

			const sibling = findHostSibling(a);
			expect(sibling).toBe(cNode);
		});
	});

	// P7.1: Alternate fiber reuse (double buffering)
	describe("createWorkInProgress", () => {
		test("should reuse alternate fiber on second render", () => {
			const current = buildFiber(WorkTag.HostComponent);
			current.type = "div";
			current.elementType = "div";

			// First call creates a new alternate
			const wip1 = createWorkInProgress(current, {});
			expect(wip1).not.toBe(current);
			expect(wip1.alternate).toBe(current);
			expect(current.alternate).toBe(wip1);

			// Second call should reuse the same alternate
			const wip2 = createWorkInProgress(current, {});
			expect(wip2).toBe(wip1); // Same object reference!
		});
	});

	// P7.2: Bailout skips unchanged subtree
	describe("Bailout behavior", () => {
		test("should skip child render when parent state unchanged", async () => {
			const { root } = createTestRoot();

			let childRenderCount = 0;
			let setParentState: ((value: number) => void) | undefined;

			const Child = () => {
				childRenderCount++;
				return createElement("span", null, "child");
			};

			const Parent = () => {
				const [, setCount] = useStateFiber(0);
				setParentState = setCount;
				return createElement("div", null, createElement(Child, null));
			};

			renderFiber(createElement(Parent, null), root);
			expect(childRenderCount).toBe(1);

			// Set same value - should bail out
			setParentState?.(0);
			await new Promise((resolve) => setTimeout(resolve, 10));
			// With eager state bailout, setting same value shouldn't trigger re-render
			expect(childRenderCount).toBe(1);
		});
	});
});
