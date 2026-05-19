import { describe, expect, test } from "bun:test";
import {
	DefaultLane,
	NoLane,
	NoLanes,
	SyncLane,
	WorkTag,
	addEntangledLanes,
	claimNextTransitionLane,
	clearCurrentEventTime,
	createFlags,
	entangleLanes,
	fiberHasWork,
	fiberSubtreeHasWork,
	formatLanes,
	getEntangledLanes,
	getHighestPriorityLane,
	getHighestPriorityLanes,
	getLanesLabel,
	getNextLanes,
	includesBlockingLane,
	includesLane,
	includesOnlyNonUrgentLanes,
	intersectLanes,
	isLaneEmpty,
	isSubsetOfLanes,
	markRootExpired,
	markRootFinished,
	markRootPinged,
	markRootSuspended,
	markRootUpdated,
	mergeLanes,
	removeLanes,
	requestEventTime,
	requestUpdateLane,
} from "@/fiber";
import type { Fiber, FiberRoot } from "@/fiber";

function makeRoot(
	pendingLanes: typeof NoLanes = NoLanes,
	suspendedLanes: typeof NoLanes = NoLanes,
	pingedLanes: typeof NoLanes = NoLanes,
	expiredLanes: typeof NoLanes = NoLanes,
): FiberRoot {
	return {
		tag: 0,
		containerInfo: document.createElement("div"),
		current: null as unknown as Fiber,
		finishedWork: null,
		pendingChildren: null,
		pendingLanes,
		suspendedLanes,
		pingedLanes,
		expiredLanes,
		finishedLanes: NoLanes,
		callbackNode: null,
		callbackPriority: NoLane,
		expirationTimes: new Map(),
		isDehydrated: false,
		mutableSourceEagerHydrationData: null,
	};
}

describe("lanes - basic operations", () => {
	test("mergeLanes combines bits", () => {
		const m = mergeLanes(SyncLane, DefaultLane);
		expect(includesLane(m, SyncLane)).toBe(true);
		expect(includesLane(m, DefaultLane)).toBe(true);
	});

	test("removeLanes strips bits", () => {
		const r = removeLanes(mergeLanes(SyncLane, DefaultLane), SyncLane);
		expect(includesLane(r, SyncLane)).toBe(false);
		expect(includesLane(r, DefaultLane)).toBe(true);
	});

	test("intersectLanes", () => {
		expect(intersectLanes(mergeLanes(SyncLane, DefaultLane), SyncLane)).toBe(
			SyncLane,
		);
		expect(intersectLanes(DefaultLane, SyncLane)).toBe(NoLanes);
	});

	test("includesOnlyNonUrgentLanes", () => {
		expect(includesOnlyNonUrgentLanes(DefaultLane)).toBe(true);
		expect(includesOnlyNonUrgentLanes(mergeLanes(SyncLane, DefaultLane))).toBe(
			false,
		);
	});

	test("includesBlockingLane", () => {
		expect(includesBlockingLane(SyncLane)).toBe(true);
		expect(includesBlockingLane(DefaultLane)).toBe(false);
	});

	test("isLaneEmpty", () => {
		expect(isLaneEmpty(NoLanes)).toBe(true);
		expect(isLaneEmpty(NoLane)).toBe(true);
		expect(isLaneEmpty(SyncLane)).toBe(false);
	});

	test("getHighestPriorityLane", () => {
		expect(getHighestPriorityLane(mergeLanes(SyncLane, DefaultLane))).toBe(
			SyncLane,
		);
	});

	test("getHighestPriorityLanes wraps single bit", () => {
		expect(getHighestPriorityLanes(DefaultLane)).toBe(DefaultLane);
	});

	test("isSubsetOfLanes", () => {
		expect(isSubsetOfLanes(SyncLane, SyncLane)).toBe(true);
		expect(isSubsetOfLanes(DefaultLane, SyncLane)).toBe(false);
	});
});

describe("lanes - label & formatting", () => {
	test("getLanesLabel", () => {
		expect(getLanesLabel(SyncLane)).toBe("Sync");
		expect(getLanesLabel(mergeLanes(SyncLane, DefaultLane))).toBe(
			"Sync, Default",
		);
		expect(getLanesLabel(NoLanes)).toBe("None");
	});

	test("formatLanes", () => {
		expect(formatLanes(SyncLane)).toBe("0000000000000000000000000000001");
	});
});

describe("lanes - root management", () => {
	test("getNextLanes no work", () => {
		expect(getNextLanes(makeRoot())).toBe(NoLanes);
	});

	test("getNextLanes returns highest pending", () => {
		const root = makeRoot(mergeLanes(SyncLane, DefaultLane));
		expect(getNextLanes(root)).toBe(SyncLane);
	});

	test("markRootUpdated adds lane", () => {
		const root = makeRoot();
		markRootUpdated(root, DefaultLane);
		expect(getNextLanes(root)).toBe(DefaultLane);
	});

	test("markRootFinished removes lanes", () => {
		const root = makeRoot(DefaultLane);
		markRootFinished(root, DefaultLane);
		expect(getNextLanes(root)).toBe(NoLanes);
	});

	test("markRootSuspended", () => {
		const root = makeRoot(DefaultLane);
		markRootSuspended(root, DefaultLane);
		expect(getNextLanes(root)).toBe(NoLanes);
	});

	test("markRootPinged revives suspended", () => {
		const root = makeRoot(DefaultLane, DefaultLane);
		markRootPinged(root, DefaultLane);
		expect(getNextLanes(root)).toBe(DefaultLane);
	});

	test("markRootExpired", () => {
		const root = makeRoot();
		markRootExpired(root, DefaultLane);
		expect(getLanesLabel(root.expiredLanes)).toBe("Default");
	});
});

describe("lanes - fiber management", () => {
	function makeFiber(): Fiber {
		return {
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
			flags: createFlags(0),
			subtreeFlags: createFlags(0),
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
	}

	test("fiberHasWork", () => {
		const f = makeFiber();
		f.lanes = DefaultLane;
		expect(fiberHasWork(f, DefaultLane)).toBe(true);
		expect(fiberHasWork(f, SyncLane)).toBe(false);
	});

	test("fiberSubtreeHasWork", () => {
		const f = makeFiber();
		f.childLanes = DefaultLane;
		expect(fiberSubtreeHasWork(f, DefaultLane)).toBe(true);
	});
});

describe("lanes - entanglement", () => {
	test("entangleLanes + getEntangledLanes", () => {
		entangleLanes(SyncLane, DefaultLane);
		expect(includesLane(getEntangledLanes(SyncLane), DefaultLane)).toBe(true);
	});

	test("addEntangledLanes merges entangled", () => {
		entangleLanes(SyncLane, DefaultLane);
		const result = addEntangledLanes(SyncLane);
		expect(includesLane(result, SyncLane)).toBe(true);
		expect(includesLane(result, DefaultLane)).toBe(true);
	});
});

describe("lanes - request helpers", () => {
	test("requestEventTime uses memoized time", () => {
		clearCurrentEventTime();
		const t = requestEventTime();
		expect(typeof t).toBe("number");
	});

	test("requestUpdateLane returns SyncLane", () => {
		expect(requestUpdateLane()).toBe(SyncLane);
	});

	test("claimNextTransitionLane returns lane", () => {
		const lane = claimNextTransitionLane();
		expect(lane).not.toBe(NoLane);
	});
});
