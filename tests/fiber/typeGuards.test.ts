import { describe, expect, test } from "bun:test";
import {
	NoFlags,
	NoLanes,
	SyncLane,
	WorkTag,
	assertElement,
	assertFiberRoot,
	assertHostComponentFiber,
	assertHostPortalFiber,
	assertHostRootFiber,
	assertHostTextFiber,
	assertUpdateQueue,
	createRoot,
	isEffectState,
	isElement,
	isFiberRoot,
	isFragmentFiber,
	isFunctionComponentFiber,
	isFunctionType,
	isHTMLElement,
	isHookState,
	isHostComponentFiber,
	isHostPortalFiber,
	isHostRootFiber,
	isHostTextFiber,
	isLanesEmpty,
	isMemoComponent,
	isTextNode,
	lanesIncludeLane,
} from "@/fiber";
import type { Fiber, FiberRoot, PortalStateNode } from "@/fiber";

describe("typeGuards - fiber tag guards", () => {
	const baseFiber: Partial<Fiber> = {
		tag: WorkTag.FunctionComponent,
		stateNode: null,
		child: null,
		sibling: null,
		return: null,
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
		key: null,
		elementType: null,
		type: null,
		ref: null,
		refCleanup: null,
		index: 0,
	};

	test("isHostComponentFiber", () => {
		const f = {
			...baseFiber,
			tag: WorkTag.HostComponent,
			stateNode: document.createElement("div"),
		} as Fiber;
		expect(isHostComponentFiber(f)).toBe(true);
		expect(isHostTextFiber(f)).toBe(false);
	});

	test("isHostTextFiber", () => {
		const f = {
			...baseFiber,
			tag: WorkTag.HostText,
			stateNode: document.createTextNode("hi"),
		} as Fiber;
		expect(isHostTextFiber(f)).toBe(true);
		expect(isHostComponentFiber(f)).toBe(false);
	});

	test("isHostRootFiber", () => {
		const root = {
			tag: 0,
			containerInfo: document.createElement("div"),
			current: null,
			finishedWork: null,
			pendingChildren: null,
			pendingLanes: NoLanes,
			suspendedLanes: NoLanes,
			pingedLanes: NoLanes,
			expiredLanes: NoLanes,
			finishedLanes: NoLanes,
			callbackNode: null,
			callbackPriority: NoFlags,
			expirationTimes: new Map(),
			isDehydrated: false,
			mutableSourceEagerHydrationData: null,
		} as unknown as FiberRoot;
		const f = { ...baseFiber, tag: WorkTag.HostRoot, stateNode: root } as Fiber;
		expect(isHostRootFiber(f)).toBe(true);
	});

	test("isHostPortalFiber", () => {
		const portal: PortalStateNode = {
			containerInfo: document.createElement("div"),
		};
		const f = {
			...baseFiber,
			tag: WorkTag.HostPortal,
			stateNode: portal,
		} as Fiber;
		expect(isHostPortalFiber(f)).toBe(true);
	});

	test("isFunctionComponentFiber", () => {
		const f = { ...baseFiber, tag: WorkTag.FunctionComponent } as Fiber;
		expect(isFunctionComponentFiber(f)).toBe(true);
		expect(isFragmentFiber(f)).toBe(false);
	});

	test("isFragmentFiber", () => {
		const f = { ...baseFiber, tag: WorkTag.Fragment } as Fiber;
		expect(isFragmentFiber(f)).toBe(true);
	});
});

describe("typeGuards - assertions", () => {
	const baseFiber: Partial<Fiber> = {
		tag: WorkTag.HostComponent,
		stateNode: document.createElement("div"),
		child: null,
		sibling: null,
		return: null,
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
		key: null,
		elementType: null,
		type: null,
		ref: null,
		refCleanup: null,
		index: 0,
	};

	test("assertHostComponentFiber passes", () => {
		expect(() => assertHostComponentFiber(baseFiber as Fiber)).not.toThrow();
	});

	test("assertHostComponentFiber throws on wrong tag", () => {
		const f = { ...baseFiber, tag: WorkTag.HostText } as Fiber;
		expect(() => assertHostComponentFiber(f)).toThrow(/HostComponent/);
	});

	test("assertHostComponentFiber throws on null stateNode", () => {
		const f = { ...baseFiber, stateNode: null } as Fiber;
		expect(() => assertHostComponentFiber(f)).toThrow(/null stateNode/);
	});

	test("assertHostTextFiber passes", () => {
		const f = {
			...baseFiber,
			tag: WorkTag.HostText,
			stateNode: document.createTextNode("hi"),
		} as Fiber;
		expect(() => assertHostTextFiber(f)).not.toThrow();
	});

	test("assertHostRootFiber passes", () => {
		const root = {
			tag: 0,
			containerInfo: document.createElement("div"),
			current: null,
			finishedWork: null,
			pendingChildren: null,
			pendingLanes: NoLanes,
			suspendedLanes: NoLanes,
			pingedLanes: NoLanes,
			expiredLanes: NoLanes,
			finishedLanes: NoLanes,
			callbackNode: null,
			callbackPriority: NoFlags,
			expirationTimes: new Map(),
			isDehydrated: false,
			mutableSourceEagerHydrationData: null,
		} as unknown as FiberRoot;
		const f = { ...baseFiber, tag: WorkTag.HostRoot, stateNode: root } as Fiber;
		expect(() => assertHostRootFiber(f)).not.toThrow();
	});

	test("assertHostPortalFiber passes", () => {
		const portal = { containerInfo: document.createElement("div") };
		const f = {
			...baseFiber,
			tag: WorkTag.HostPortal,
			stateNode: portal,
		} as Fiber;
		expect(() => assertHostPortalFiber(f)).not.toThrow();
	});
});

describe("typeGuards - DOM type guards", () => {
	test("isElement", () => {
		expect(isElement(document.createElement("div"))).toBe(true);
		expect(isElement(document.createTextNode("hi"))).toBe(false);
		expect(isElement(null)).toBe(false);
	});

	test("isHTMLElement", () => {
		expect(isHTMLElement(document.createElement("div"))).toBe(true);
		expect(
			isHTMLElement(
				document.createElementNS("http://www.w3.org/1999/xhtml", "div"),
			),
		).toBe(true);
		expect(isHTMLElement(document.createTextNode("hi"))).toBe(false);
	});

	test("isTextNode", () => {
		expect(isTextNode(document.createTextNode("hi"))).toBe(true);
		expect(isTextNode(document.createElement("div"))).toBe(false);
	});

	test("assertElement", () => {
		expect(() => assertElement(document.createElement("div"))).not.toThrow();
		expect(() => assertElement(null as unknown as Node)).toThrow();
	});
});

describe("typeGuards - lane helpers", () => {
	test("lanesIncludeLane", () => {
		expect(lanesIncludeLane(SyncLane, SyncLane)).toBe(true);
		expect(lanesIncludeLane(NoLanes, SyncLane)).toBe(false);
	});

	test("isLanesEmpty", () => {
		expect(isLanesEmpty(NoLanes)).toBe(true);
		expect(isLanesEmpty(SyncLane)).toBe(false);
	});
});

describe("typeGuards - hook / effect guards", () => {
	test("isHookState", () => {
		expect(
			isHookState({
				memoizedState: 0,
				baseState: 0,
				baseQueue: null,
				queue: null,
				next: null,
			}),
		).toBe(true);
		expect(isHookState(null)).toBe(false);
		expect(isHookState({})).toBe(false);
	});

	test("isEffectState", () => {
		expect(
			isEffectState({
				tag: 0,
				create: () => {},
				destroy: undefined,
				deps: null,
				next: null,
			}),
		).toBe(true);
		expect(isEffectState(null)).toBe(false);
	});
});

describe("typeGuards - component type guards", () => {
	test("isMemoComponent", () => {
		expect(
			isMemoComponent({
				$$typeof: Symbol("test"),
				type: () => null,
				compare: null,
			}),
		).toBe(true);
		expect(isMemoComponent(() => null)).toBe(false);
	});

	test("isFunctionType", () => {
		expect(isFunctionType(() => null)).toBe(true);
		expect(isFunctionType("div")).toBe(false);
	});
});

describe("typeGuards - update queue helpers", () => {
	test("assertUpdateQueue passes for valid hook", () => {
		const validHookQueue = {
			pending: null,
			lanes: NoLanes,
			dispatch: null,
			lastRenderedReducer: null,
			lastRenderedState: null,
		};
		const hook = {
			memoizedState: 0,
			baseState: 0,
			baseQueue: null,
			queue: validHookQueue,
			next: null,
		};
		expect(() => assertUpdateQueue(hook.queue as unknown)).not.toThrow();
	});

	test("assertUpdateQueue throws for invalid shape", () => {
		expect(() => assertUpdateQueue({} as unknown)).toThrow();
	});
});

describe("typeGuards - fiber root", () => {
	test("isFiberRoot", () => {
		const root = createRoot(document.createElement("div"));
		expect(isFiberRoot(root)).toBe(true);
		expect(isFiberRoot({})).toBe(false);
	});

	test("assertFiberRoot", () => {
		const root = createRoot(document.createElement("div"));
		expect(() => assertFiberRoot(root)).not.toThrow();
		expect(() => assertFiberRoot({})).toThrow();
	});
});
