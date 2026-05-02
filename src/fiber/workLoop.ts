/* **************** */
/* Work Loop - Core Fiber Scheduler */
/* **************** */

/**
 * Implements the core work loop of the fiber reconciler.
 * This is the heart of React's scheduling system.
 */

import type { AnyMiniReactElement } from "../core/types";
import { eventSystem } from "../events/eventSystem";
import { trackRenderEnd, trackRenderStart } from "../performance";
import { beginWork } from "./beginWork";
import { laneHighest, laneIncludes, laneOr, unlanes } from "./bitwise";
import { commitRoot } from "./commitRoot";
import { completeWork, unwindInterruptedWork } from "./completeWork";
import { getNextLanes, markRootFinished } from "./lanes";
import { Priority, scheduleCallback, shouldYield } from "./scheduler";
import type { Fiber, FiberRoot, Lane, Lanes } from "./types";
import {
	DefaultLane,
	InputContinuousLane,
	NoFlags,
	NoLane,
	NoLanes,
	SyncLane,
	WorkTag,
} from "./types";
import {
	getWorkInProgress,
	getWorkInProgressRoot,
	prepareFreshStack,
	setWorkInProgress,
	setWorkInProgressRoot,
} from "./workInProgress";

// ============================================
// Work Loop State
// ============================================

/**
 * Execution context flags.
 */
const NoContext = 0b0000;
const RenderContext = 0b0010;
const CommitContext = 0b0100;

let executionContext = NoContext;

/**
 * Current render lanes.
 */
let workInProgressRootRenderLanes: Lanes = NoLanes;

/**
 * The root we are currently working on.
 */
let workInProgressRoot: FiberRoot | null = null;

// ============================================
// Root Entry Points
// ============================================

export function scheduleUpdateOnFiber(
	root: FiberRoot,
	fiber: Fiber,
	lane: Lane,
): void {
	markUpdateLaneFromFiberToRoot(fiber, lane);
	ensureRootIsScheduled(root);
}

function ensureRootIsScheduled(root: FiberRoot): void {
	const nextLanes = getNextLanes(root, NoLanes);

	if (nextLanes === NoLanes) {
		root.callbackNode = null;
		root.callbackPriority = NoLane;
		return;
	}

	const newCallbackPriority = laneHighest(nextLanes);

	if (
		root.callbackNode !== null &&
		root.callbackPriority === newCallbackPriority
	) {
		return;
	}

	root.callbackNode = null;

	if (newCallbackPriority === SyncLane) {
		performSyncWorkOnRoot(root);
		return;
	}

	const schedulerPriority: Priority =
		newCallbackPriority <= InputContinuousLane
			? Priority.UserBlockingPriority
			: newCallbackPriority <= DefaultLane
				? Priority.NormalPriority
				: Priority.IdlePriority;

	root.callbackPriority = newCallbackPriority;
	root.callbackNode = scheduleCallback(
		schedulerPriority,
		performConcurrentWorkOnRoot.bind(null, root),
	);
}

export function performSyncWorkOnRoot(root: FiberRoot): void {
	const lanes = getNextLanes(root, NoLanes);
	if (lanes === NoLanes) return;

	trackRenderStart();
	renderRootSync(root, lanes);

	root.finishedWork = root.current.alternate;
	root.finishedLanes = lanes;
	commitRoot(root);
	markRootFinished(root, lanes);

	trackRenderEnd();
}

export function performConcurrentWorkOnRoot(
	root: FiberRoot,
	didTimeout: boolean,
): boolean {
	const lanes = getNextLanes(
		root,
		workInProgressRoot === root ? workInProgressRootRenderLanes : NoLanes,
	);

	if (lanes === NoLanes) return false;

	if (includesBlockingLane(lanes) || didTimeout) {
		performSyncWorkOnRoot(root);
		return false;
	}

	// Normal concurrent path
	const result = renderRootConcurrent(root, lanes);

	if (result === null) {
		// Root finished rendering normally
		const finishedWork = root.current.alternate;
		if (finishedWork !== null) {
			root.finishedWork = finishedWork;
			root.finishedLanes = lanes;
			commitRoot(root);
			markRootFinished(root, lanes);
			// More work may have been scheduled during commit
			if (root.pendingLanes !== NoLanes) {
				return true;
			}
		}
		return false;
	}

	// Root yielded (returned early with a continuation)
	root.callbackNode = result;
	return true;
}

function includesBlockingLane(lanes: Lanes): boolean {
	return laneIncludes(lanes, SyncLane);
}

// ============================================
// Sync render
// ============================================

function renderRootSync(root: FiberRoot, lanes: Lanes): void {
	const prevExecutionContext = executionContext;
	executionContext |= RenderContext;

	if (
		getWorkInProgressRoot() !== root ||
		workInProgressRootRenderLanes !== lanes
	) {
		prepareFreshStack(root, unlanes(lanes));
		workInProgressRoot = root;
		workInProgressRootRenderLanes = lanes;
	}

	try {
		workLoopSync();
	} catch (thrownValue) {
		handleError(root, thrownValue);
	} finally {
		executionContext = prevExecutionContext;
		workInProgressRoot = null;
		workInProgressRootRenderLanes = NoLanes;
		setWorkInProgressRoot(null);
	}
}

function workLoopSync(): void {
	let wip = getWorkInProgress();
	while (wip !== null) {
		performUnitOfWork(wip);
		wip = getWorkInProgress();
	}
}

// ============================================
// Concurrent render
// ============================================

function renderRootConcurrent(
	root: FiberRoot,
	lanes: Lanes,
): ((didTimeout: boolean) => boolean) | null {
	const prevExecutionContext = executionContext;
	executionContext |= RenderContext;

	if (
		getWorkInProgressRoot() !== root ||
		workInProgressRootRenderLanes !== lanes
	) {
		prepareFreshStack(root, unlanes(lanes));
		workInProgressRoot = root;
		workInProgressRootRenderLanes = lanes;
	}

	try {
		let wip = getWorkInProgress();
		while (wip !== null) {
			if (shouldYield()) {
				// Yield to the browser — return a continuation callback
				setWorkInProgressRoot(root);
				executionContext = prevExecutionContext;
				return performConcurrentWorkOnRoot.bind(null, root);
			}
			performUnitOfWork(wip);
			wip = getWorkInProgress();
		}
	} catch (thrownValue) {
		handleError(root, thrownValue);
	} finally {
		executionContext = prevExecutionContext;
		workInProgressRoot = null;
		workInProgressRootRenderLanes = NoLanes;
		setWorkInProgressRoot(null);
	}

	return null;
}

// ============================================
// Unit of work
// ============================================

function performUnitOfWork(unitOfWork: Fiber): void {
	const current = unitOfWork.alternate;
	const next = beginWork(current, unitOfWork, workInProgressRootRenderLanes);
	unitOfWork.memoizedProps = unitOfWork.pendingProps;

	if (next === null) {
		completeUnitOfWork(unitOfWork);
	} else {
		setWorkInProgress(next);
	}
}

function completeUnitOfWork(unitOfWork: Fiber): void {
	let completedWork: Fiber | null = unitOfWork;

	while (completedWork !== null) {
		const current = completedWork.alternate;
		const next = completeWork(
			current,
			completedWork,
			workInProgressRootRenderLanes,
		);

		if (next !== null) {
			setWorkInProgress(next);
			return;
		}

		const sibling = completedWork.sibling;
		if (sibling !== null) {
			setWorkInProgress(sibling);
			return;
		}

		completedWork = completedWork.return;
		setWorkInProgress(completedWork);
	}
}

// ============================================
// Lane propagation (bitwise helpers)
// ============================================

function markUpdateLaneFromFiberToRoot(fiber: Fiber, lane: Lane): void {
	fiber.lanes = laneOr(fiber.lanes, lane);

	if (fiber.alternate !== null) {
		fiber.alternate.lanes = laneOr(fiber.alternate.lanes, lane);
	}

	let node = fiber;
	let parent = fiber.return;
	while (parent !== null) {
		parent.childLanes = laneOr(parent.childLanes, lane);
		if (parent.alternate !== null) {
			parent.alternate.childLanes = laneOr(parent.alternate.childLanes, lane);
		}
		node = parent;
		parent = parent.return;
	}

	if (node.tag === WorkTag.HostRoot && node.stateNode !== null) {
		const root = node.stateNode as FiberRoot;
		root.pendingLanes = laneOr(root.pendingLanes, lane);
	}
}

// ============================================
// createRoot / updateContainer
// ============================================

export function createRoot(containerInfo: Element): FiberRoot {
	eventSystem.initialize(containerInfo);
	eventSystem.enableFiberMode();

	const hostRootFiber: Fiber = {
		tag: WorkTag.HostRoot,
		key: null,
		elementType: null,
		type: null,
		stateNode: null,
		child: null,
		sibling: null,
		index: 0,
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
		return: null,
	};

	const root: FiberRoot = {
		tag: 0, // LegacyRoot,
		containerInfo,
		current: hostRootFiber,
		finishedWork: null,
		pendingChildren: null,
		pendingLanes: NoLanes,
		suspendedLanes: NoLanes,
		pingedLanes: NoLanes,
		expiredLanes: NoLanes,
		finishedLanes: NoLanes,
		callbackNode: null,
		callbackPriority: NoLane,
		expirationTimes: new Map(),
		isDehydrated: false,
		mutableSourceEagerHydrationData: null,
	};

	hostRootFiber.stateNode = root;
	return root;
}

export function updateContainer(
	element: AnyMiniReactElement | null,
	root: FiberRoot,
): void {
	const current = root.current;
	const lane = SyncLane;

	root.pendingChildren = element;
	root.pendingLanes = laneOr(root.pendingLanes, lane);
	scheduleUpdateOnFiber(root, current, lane);
}

// ============================================
// Flush / context / error
// ============================================

export function flushSync<R>(fn?: () => R): R | undefined {
	const prevExecutionContext = executionContext;
	executionContext |= RenderContext;
	try {
		return fn?.();
	} finally {
		executionContext = prevExecutionContext;
	}
}

export function flushPassiveEffectsImpl(): boolean {
	return false;
}

export function isRendering(): boolean {
	return Boolean(executionContext & RenderContext);
}

export function isCommitting(): boolean {
	return Boolean(executionContext & CommitContext);
}

export function handleError(_root: FiberRoot, thrownValue: unknown): never {
	const wip = getWorkInProgress();
	if (wip !== null) {
		unwindInterruptedWork(wip.alternate, wip, workInProgressRootRenderLanes);
	}
	setWorkInProgress(null);
	setWorkInProgressRoot(null);
	throw thrownValue;
}
