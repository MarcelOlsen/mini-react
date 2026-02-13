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
import { commitRoot } from "./commitRoot";
import { completeWork, unwindInterruptedWork } from "./completeWork";
import type { Fiber, FiberRoot, Lane, Lanes } from "./types";
import { NoFlags, NoLanes, SyncLane, WorkTag, createLanes } from "./types";
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

// ============================================
// Root Entry Points
// ============================================

/**
 * Schedules an update on the root.
 * This is the main entry point for triggering a re-render.
 */
export function scheduleUpdateOnFiber(
	root: FiberRoot,
	fiber: Fiber,
	lane: Lane,
): void {
	// Mark the fiber as having pending work
	markUpdateLaneFromFiberToRoot(fiber, lane);

	// Schedule the work
	ensureRootIsScheduled(root);
}

/**
 * Marks update lanes from a fiber up to the root.
 * Handles the case where the fiber might be an alternate.
 */
function markUpdateLaneFromFiberToRoot(fiber: Fiber, lane: Lane): void {
	// Mark this fiber with the lane
	fiber.lanes = createLanes((fiber.lanes as number) | (lane as number));

	// Also mark the alternate if it exists (for double-buffering)
	if (fiber.alternate !== null) {
		fiber.alternate.lanes = createLanes(
			(fiber.alternate.lanes as number) | (lane as number),
		);
	}

	// Walk up and mark parent childLanes
	let node = fiber;
	let parent = fiber.return;
	while (parent !== null) {
		parent.childLanes = createLanes(
			(parent.childLanes as number) | (lane as number),
		);
		// Also mark the alternate parent's childLanes
		if (parent.alternate !== null) {
			parent.alternate.childLanes = createLanes(
				(parent.alternate.childLanes as number) | (lane as number),
			);
		}
		node = parent;
		parent = parent.return;
	}

	// node is now the host root fiber - mark the FiberRoot's pendingLanes
	if (node.tag === WorkTag.HostRoot && node.stateNode !== null) {
		const root = node.stateNode as FiberRoot;
		root.pendingLanes = createLanes(
			(root.pendingLanes as number) | (lane as number),
		);
	}
}

/**
 * Ensures the root has work scheduled.
 */
function ensureRootIsScheduled(root: FiberRoot): void {
	// Check if we already have scheduled work
	const existingCallbackNode = root.callbackNode;
	const nextLanes = getNextLanes(root);

	if (nextLanes === NoLanes) {
		// No work to do
		if (existingCallbackNode !== null) {
			root.callbackNode = null;
			root.callbackPriority = 0 as Lane;
		}
		return;
	}

	// For now, always use sync rendering
	performSyncWorkOnRoot(root);
}

/**
 * Gets the next lanes to work on.
 */
function getNextLanes(root: FiberRoot): Lanes {
	const pendingLanes = root.pendingLanes;

	if (pendingLanes === NoLanes) {
		return NoLanes;
	}

	// For now, just return all pending lanes
	return pendingLanes;
}

// ============================================
// Sync Work
// ============================================

/**
 * Performs synchronous work on a root.
 * This is the main entry point for sync rendering.
 */
export function performSyncWorkOnRoot(root: FiberRoot): void {
	const lanes = getNextLanes(root);

	if (lanes === NoLanes) {
		return;
	}

	// Track render performance
	trackRenderStart();

	// Render phase
	renderRootSync(root, lanes);

	// Commit phase
	const finishedWork = root.current.alternate;
	root.finishedWork = finishedWork;
	root.finishedLanes = lanes;

	commitRoot(root);

	trackRenderEnd();
}

/**
 * Renders the root synchronously.
 */
function renderRootSync(root: FiberRoot, lanes: Lanes): number {
	const prevExecutionContext = executionContext;
	executionContext |= RenderContext;

	// Check if we're resuming work or starting fresh
	if (
		getWorkInProgressRoot() !== root ||
		workInProgressRootRenderLanes !== lanes
	) {
		// Start fresh
		prepareFreshStack(root, lanes as number);
		workInProgressRootRenderLanes = lanes;
	}

	// Run the work loop
	workLoopSync();

	// Reset context
	executionContext = prevExecutionContext;
	setWorkInProgressRoot(null);

	return 0; // Success
}

/**
 * The synchronous work loop.
 * Processes all work without yielding.
 */
function workLoopSync(): void {
	let wip = getWorkInProgress();
	while (wip !== null) {
		performUnitOfWork(wip);
		wip = getWorkInProgress();
	}
}

// ============================================
// Unit of Work
// ============================================

/**
 * Performs one unit of work.
 * This processes a single fiber and returns the next one to work on.
 */
function performUnitOfWork(unitOfWork: Fiber): void {
	const current = unitOfWork.alternate;

	// Begin phase: render this component
	const next = beginWork(current, unitOfWork, workInProgressRootRenderLanes);

	// Memoize props after rendering
	unitOfWork.memoizedProps = unitOfWork.pendingProps;

	if (next === null) {
		// No more children, complete this unit of work
		completeUnitOfWork(unitOfWork);
	} else {
		// Continue with the child
		setWorkInProgress(next);
	}
}

/**
 * Completes a unit of work and finds the next sibling/uncle.
 */
function completeUnitOfWork(unitOfWork: Fiber): void {
	let completedWork: Fiber | null = unitOfWork;

	while (completedWork !== null) {
		const current = completedWork.alternate;

		// Complete phase: create DOM nodes, bubble flags
		const next = completeWork(
			current,
			completedWork,
			workInProgressRootRenderLanes,
		);

		// If this produced more work, do it
		if (next !== null) {
			setWorkInProgress(next);
			return;
		}

		// Check for sibling
		const sibling = completedWork.sibling;
		if (sibling !== null) {
			setWorkInProgress(sibling);
			return;
		}

		// Move up to parent
		completedWork = completedWork.return;
		setWorkInProgress(completedWork);
	}
}

// ============================================
// Render Root API
// ============================================

/**
 * Creates a fiber root for a container.
 */
export function createRoot(containerInfo: Element): FiberRoot {
	// Initialize event system for this container
	eventSystem.initialize(containerInfo);
	eventSystem.enableFiberMode();

	// Create the root fiber
	const hostRootFiber: Fiber = {
		tag: WorkTag.HostRoot,
		key: null,
		elementType: null,
		type: null,
		stateNode: null, // Will be set to root
		return: null,
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
	};

	// Create the FiberRoot
	const root: FiberRoot = {
		tag: 0, // LegacyRoot
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
		callbackPriority: 0 as Lane,
		expirationTimes: new Map(),
		isDehydrated: false,
		mutableSourceEagerHydrationData: null,
	};

	// Link them
	hostRootFiber.stateNode = root;

	return root;
}

/**
 * Updates a root with new children.
 */
export function updateContainer(
	element: AnyMiniReactElement | null,
	root: FiberRoot,
): void {
	const current = root.current;
	const lane = SyncLane;

	// Store the element to render
	root.pendingChildren = element;

	// Mark the root as having pending work
	root.pendingLanes = createLanes(
		(root.pendingLanes as number) | (lane as number),
	);

	// Schedule the update
	scheduleUpdateOnFiber(root, current, lane);
}

// ============================================
// Flush Operations
// ============================================

/**
 * Flushes all sync work.
 */
export function flushSync<R>(fn?: () => R): R | undefined {
	const prevExecutionContext = executionContext;
	executionContext |= RenderContext;

	try {
		if (fn) {
			return fn();
		}
	} finally {
		executionContext = prevExecutionContext;
	}
}

/**
 * Flushes all passive effects.
 */
export function flushPassiveEffectsImpl(): boolean {
	// This will be implemented with effects
	return false;
}

// ============================================
// Context Helpers
// ============================================

/**
 * Checks if we're in a render context.
 */
export function isRendering(): boolean {
	return (executionContext & RenderContext) !== NoContext;
}

/**
 * Checks if we're in a commit context.
 */
export function isCommitting(): boolean {
	return (executionContext & CommitContext) !== NoContext;
}

// ============================================
// Error Handling
// ============================================

/**
 * Handles an error during rendering.
 */
export function handleError(_root: FiberRoot, thrownValue: unknown): void {
	console.error("Error during render:", thrownValue);

	// Unwind the work
	const workInProgress = getWorkInProgress();
	if (workInProgress !== null) {
		unwindInterruptedWork(
			workInProgress.alternate,
			workInProgress,
			workInProgressRootRenderLanes,
		);
	}

	// Reset state
	setWorkInProgress(null);
	setWorkInProgressRoot(null);
}
