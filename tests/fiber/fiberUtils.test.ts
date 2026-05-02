import { describe, expect, test } from "bun:test";
import { Fragment, createElement } from "@/MiniReact";
import { PORTAL } from "@/core/types";
import {
	NoFlags,
	NoLanes,
	Placement,
	WorkTag,
	checkIfWorkInProgressReceivedUpdate,
	commitTreeSwap,
	createFiber,
	createFiberFromElement,
	createFiberFromFragment,
	createFiberFromText,
	createFiberRoot,
	createHostRootFiber,
	createWorkInProgressFiber,
	findFiberRoot,
	findHostParent,
	findPortalContainer,
	getDidReceiveUpdate,
	getFiberDebugName,
	getFirstHostChild,
	getHostParentNode,
	getNextFiber,
	getStateNode,
	getWorkInProgress,
	getWorkInProgressRoot,
	getWorkInProgressRootRenderLanes,
	markWorkInProgressReceivedUpdate,
	prepareFreshStack,
	resetDidReceiveUpdate,
	resetWorkInProgressFiber,
	setWorkInProgress,
	setWorkInProgressRootRenderLanes,
} from "@/fiber";
import type { Fiber, FiberRoot } from "@/fiber";

describe("createFiber", () => {
	test("createFiber factory sets defaults", () => {
		const fiber = createFiber(
			WorkTag.HostComponent,
			{ className: "box" },
			"key1",
		);
		expect(fiber.tag).toBe(WorkTag.HostComponent);
		expect(fiber.key).toBe("key1");
		expect(fiber.pendingProps).toEqual({ className: "box" });
		expect(fiber.stateNode).toBeNull();
		expect(fiber.child).toBeNull();
		expect(fiber.sibling).toBeNull();
		expect(fiber.alternate).toBeNull();
	});
});

describe("createFiberFromElement", () => {
	test("creates host component fiber", () => {
		const fiber = createFiberFromElement(
			createElement("div", { className: "a" }),
			NoLanes,
		);
		expect(fiber.tag).toBe(WorkTag.HostComponent);
		expect(fiber.type).toBe("div");
		expect(fiber.pendingProps["className"]).toBe("a");
	});

	test("creates function component fiber", () => {
		const Comp = () => createElement("span", null);
		const fiber = createFiberFromElement(createElement(Comp, null), NoLanes);
		expect(fiber.tag).toBe(WorkTag.FunctionComponent);
		expect(fiber.type).toBe(Comp);
	});

	test("creates text fiber for string", () => {
		const fiber = createFiberFromElement("hello", NoLanes);
		expect(fiber.tag).toBe(WorkTag.HostText);
		expect(fiber.pendingProps["nodeValue"]).toBe("hello");
	});

	test("creates fragment fiber", () => {
		const fiber = createFiberFromElement(
			createElement(Fragment, null, "a", "b"),
			NoLanes,
		);
		expect(fiber.tag).toBe(WorkTag.Fragment);
	});

	test("creates portal fiber", () => {
		const container = document.createElement("div");
		const fiber = createFiberFromElement(
			createElement(PORTAL, { targetContainer: container }),
			NoLanes,
		);
		expect(fiber.tag).toBe(WorkTag.HostPortal);
		expect((fiber.stateNode as any)?.containerInfo).toBe(container);
	});

	test("handles null / boolean as empty text", () => {
		const fiberNull = createFiberFromElement(null, NoLanes);
		expect(fiberNull.tag).toBe(WorkTag.HostText);
		const fiberBool = createFiberFromElement(true, NoLanes);
		expect(fiberBool.tag).toBe(WorkTag.HostText);
	});
});

describe("createFiberFromText / Fragment", () => {
	test("createFiberFromText", () => {
		const f = createFiberFromText(42, NoLanes);
		expect(f.tag).toBe(WorkTag.HostText);
		expect(f.pendingProps["nodeValue"]).toBe(42);
	});

	test("createFiberFromFragment", () => {
		const f = createFiberFromFragment(["a", "b"], NoLanes, "frag");
		expect(f.tag).toBe(WorkTag.Fragment);
		expect(f.key).toBe("frag");
	});
});

describe("createHostRootFiber / createFiberRoot", () => {
	test("createHostRootFiber", () => {
		const f = createHostRootFiber(0);
		expect(f.tag).toBe(WorkTag.HostRoot);
		expect(f.stateNode).toBeNull();
	});

	test("createFiberRoot wires current", () => {
		const container = document.createElement("div");
		const root = createFiberRoot(container, 0, null);
		expect(root.current.tag).toBe(WorkTag.HostRoot);
		expect(root.current.stateNode).toBe(root);
	});
});

describe("fiberUtils - traversal", () => {
	function makeFiber(
		tag: WorkTag = WorkTag.HostComponent,
		type: Fiber["type"] = "div",
		stateNode: Fiber["stateNode"] = null,
	): Fiber {
		return {
			tag,
			type,
			stateNode,
			return: null,
			child: null,
			sibling: null,
			index: 0,
			key: null,
			elementType: null,
			ref: null,
			refCleanup: null,
			pendingProps: {},
			memoizedProps: null,
			memoizedState: null,
			updateQueue: null,
			dependencies: null,
			flags: NoFlags,
			subtreeFlags: NoFlags,
			deletions: null,
			lanes: NoLanes,
			childLanes: NoLanes,
			alternate: null,
		};
	}

	test("getNextFiber returns child then sibling then uncle", () => {
		const root = makeFiber(WorkTag.HostRoot);
		const child = makeFiber();
		const sibling = makeFiber();
		const grandchild = makeFiber();

		root.child = child;
		child.return = root;
		child.child = grandchild;
		grandchild.return = child;
		child.sibling = sibling;
		sibling.return = root;

		expect(getNextFiber(root, root)).toBe(child);
		expect(getNextFiber(child, root)).toBe(grandchild);
		expect(getNextFiber(grandchild, root)).toBe(sibling);
	});

	test("findHostParent traverses up", () => {
		const host = makeFiber(
			WorkTag.HostComponent,
			"div",
			document.createElement("div"),
		);
		const fn = makeFiber(WorkTag.FunctionComponent, () => null);
		fn.return = host;
		expect(findHostParent(fn)).toBe(host);
	});

	test("getHostParentNode returns container for root", () => {
		const container = document.createElement("div");
		const rootFiber: Fiber = {
			...makeFiber(WorkTag.HostRoot, null),
			stateNode: { containerInfo: container } as unknown as FiberRoot,
		};
		const child = makeFiber();
		child.return = rootFiber;
		expect(getHostParentNode(child)).toBe(container);
	});

	test("getStateNode returns element for host fiber", () => {
		const el = document.createElement("span");
		const f = makeFiber(WorkTag.HostComponent, "span", el);
		expect(getStateNode(f)).toBe(el);
	});

	test("getFirstHostChild drills through function components", () => {
		const fn = makeFiber(WorkTag.FunctionComponent, null);
		const host = makeFiber(
			WorkTag.HostComponent,
			"span",
			document.createElement("span"),
		);
		fn.child = host;
		host.return = fn;
		expect(getFirstHostChild(fn)).toBe(host.stateNode as any);
	});

	test("findFiberRoot returns root from child", () => {
		const container = document.createElement("div");
		const root = createFiberRoot(container, 0, null);
		const child = makeFiber();
		child.return = root.current;
		root.current.child = child;
		expect(findFiberRoot(child)).toBe(root);
	});

	test("findPortalContainer", () => {
		const portalContainer = document.createElement("aside");
		const portal = makeFiber(WorkTag.HostPortal, null);
		portal.stateNode = { containerInfo: portalContainer } as any;
		const child = makeFiber();
		child.return = portal;
		expect(findPortalContainer(child)).toBe(portalContainer);
	});

	test("getFiberDebugName", () => {
		const fn = makeFiber(WorkTag.FunctionComponent, function Named() {} as any);
		expect(getFiberDebugName(fn)).toBe("Named");
		expect(getFiberDebugName(makeFiber(WorkTag.HostRoot, null))).toBe(
			"HostRoot",
		);
		expect(getFiberDebugName(makeFiber(WorkTag.HostComponent, "div"))).toBe(
			"div",
		);
		expect(getFiberDebugName(makeFiber(WorkTag.HostText, null))).toBe(
			"HostText",
		);
		expect(getFiberDebugName(makeFiber(WorkTag.Fragment, null))).toBe(
			"Fragment",
		);
	});
});

describe("workInProgress - state", () => {
	test("get/set WorkInProgress", () => {
		expect(getWorkInProgress()).toBeNull();
		const fiber = createFiber(WorkTag.HostComponent, {}, null);
		setWorkInProgress(fiber);
		expect(getWorkInProgress()).toBe(fiber);
		setWorkInProgress(null);
	});

	test("createWorkInProgressFiber links alternates", () => {
		const current = createFiber(WorkTag.HostComponent, { a: 1 }, null);
		current.memoizedState = "state";
		const wip = createWorkInProgressFiber(current, { a: 2 });
		expect(wip.alternate).toBe(current);
		expect(current.alternate).toBe(wip);
		expect(wip.pendingProps).toEqual({ a: 2 });
		expect(wip.memoizedState).toBe("state");
	});

	test("createWorkInProgressFiber reuses existing alternate", () => {
		const current = createFiber(WorkTag.HostComponent, { a: 1 }, null);
		const wip1 = createWorkInProgressFiber(current, { a: 2 });
		const wip2 = createWorkInProgressFiber(current, { a: 3 });
		expect(wip2).toBe(wip1);
		expect(wip2.pendingProps).toEqual({ a: 3 });
	});

	test("resetWorkInProgressFiber clears effects", () => {
		const wip = createFiber(WorkTag.HostComponent, {}, null);
		wip.flags = Placement;
		wip.subtreeFlags = Placement;
		wip.deletions = [];
		resetWorkInProgressFiber(wip, 0);
		expect(wip.flags).toBe(NoFlags);
		expect(wip.subtreeFlags).toBe(NoFlags);
		expect(wip.deletions).toBeNull();
	});

	test("prepareFreshStack resets root", () => {
		const container = document.createElement("div");
		const root = createFiberRoot(container, 0, null);
		root.finishedWork = createFiber(WorkTag.HostComponent, {}, null);
		root.finishedLanes = Placement as any;

		const wip = prepareFreshStack(root, 0);
		expect(root.finishedWork).toBeNull();
		expect(root.finishedLanes).toBe(NoLanes);
		expect(getWorkInProgressRoot()).toBe(root);
		expect(wip.return).toBeNull();
	});

	test("commitTreeSwap swaps current tree", () => {
		const container = document.createElement("div");
		const root = createFiberRoot(container, 0, null);
		const finished = createFiber(WorkTag.HostComponent, {}, null);
		root.finishedWork = finished;
		root.finishedLanes = Placement as any;

		commitTreeSwap(root);
		expect(root.current).toBe(finished);
		expect(root.finishedWork).toBeNull();
		expect(root.finishedLanes).toBe(NoLanes);
	});

	test("didReceiveUpdate helpers", () => {
		resetDidReceiveUpdate();
		expect(getDidReceiveUpdate()).toBe(false);
		markWorkInProgressReceivedUpdate();
		expect(getDidReceiveUpdate()).toBe(true);
	});

	test("checkIfWorkInProgressReceivedUpdate", () => {
		expect(checkIfWorkInProgressReceivedUpdate()).toBe(false);
	});
});

describe("workInProgress - setWorkInProgressRootRenderLanes", () => {
	test("set/get render lanes", () => {
		setWorkInProgressRootRenderLanes(42);
		expect(getWorkInProgressRootRenderLanes()).toBe(42);
		setWorkInProgressRootRenderLanes(0);
	});
});
