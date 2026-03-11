/* **************** */
/* Work In Progress Tree Management */
/* **************** */

/**
 * Utilities for managing the work-in-progress (WIP) tree.
 * React uses double buffering: current tree (on screen) and WIP tree (being built).
 */

import type { Fiber, FiberRoot } from "./types";
import { NoFlags, NoLanes, createLanes } from "./types";

// ============================================
// WIP Tree Globals
// ============================================

/**
 * The root of the tree we're working on.
 */
let workInProgressRoot: FiberRoot | null = null;

/**
 * The fiber we're currently working on.
 */
let workInProgress: Fiber | null = null;

/**
 * The lanes we're currently rendering.
 */
let workInProgressRootRenderLanes = 0;

// ============================================
// WIP Getters/Setters
// ============================================

/**
 * Gets the current work-in-progress fiber.
 */
export function getWorkInProgress(): Fiber | null {
	return workInProgress;
}

/**
 * Sets the current work-in-progress fiber.
 */
export function setWorkInProgress(fiber: Fiber | null): void {
	workInProgress = fiber;
}

/**
 * Gets the current work-in-progress root.
 */
export function getWorkInProgressRoot(): FiberRoot | null {
	return workInProgressRoot;
}

/**
 * Sets the current work-in-progress root.
 */
export function setWorkInProgressRoot(root: FiberRoot | null): void {
	workInProgressRoot = root;
}

/**
 * Gets the render lanes for the current WIP tree.
 */
export function getWorkInProgressRootRenderLanes(): number {
	return workInProgressRootRenderLanes;
}

/**
 * Sets the render lanes for the current WIP tree.
 */
export function setWorkInProgressRootRenderLanes(lanes: number): void {
	workInProgressRootRenderLanes = lanes;
}

// ============================================
// WIP Tree Operations
// ============================================

/**
 * Prepares a fresh stack for a new render.
 * Called at the start of renderRoot.
 */
export function prepareFreshStack(root: FiberRoot, lanes: number): Fiber {
	// Reset the WIP root
	root.finishedWork = null;
	root.finishedLanes = NoLanes;

	// Set the current root
	workInProgressRoot = root;
	workInProgressRootRenderLanes = lanes;

	// Create the WIP fiber from current
	const rootWorkInProgress = createWorkInProgressFiber(root.current, {});
	workInProgress = rootWorkInProgress;

	return rootWorkInProgress;
}

/**
 * Creates a work-in-progress fiber from a current fiber.
 * This is the core double-buffering mechanism.
 */
export function createWorkInProgressFiber(
	current: Fiber,
	pendingProps: Record<string, unknown>,
): Fiber {
	let wip = current.alternate;

	if (wip === null) {
		// Create a new WIP fiber
		wip = {
			tag: current.tag,
			key: current.key,
			elementType: current.elementType,
			type: current.type,
			stateNode: current.stateNode,
			return: null,
			child: null,
			sibling: null,
			index: 0,
			ref: current.ref,
			refCleanup: current.refCleanup,
			pendingProps,
			memoizedProps: null,
			memoizedState: current.memoizedState,
			updateQueue: current.updateQueue,
			dependencies: current.dependencies,
			flags: NoFlags,
			subtreeFlags: NoFlags,
			deletions: null,
			lanes: current.lanes,
			childLanes: current.childLanes,
			alternate: current,
		};

		// Link the alternates
		current.alternate = wip;
	} else {
		// Reuse the existing WIP fiber
		wip.pendingProps = pendingProps;
		wip.type = current.type;

		// Reset effects
		wip.flags = NoFlags;
		wip.subtreeFlags = NoFlags;
		wip.deletions = null;

		// Reset child pointer for fresh reconciliation
		// (children will be reconciled from current.child)
	}

	// Copy over fields that need to persist
	wip.childLanes = current.childLanes;
	wip.lanes = current.lanes;
	wip.child = current.child;
	wip.memoizedProps = current.memoizedProps;
	wip.memoizedState = current.memoizedState;
	wip.updateQueue = current.updateQueue;
	wip.dependencies = current.dependencies;

	return wip;
}

/**
 * Resets a WIP fiber for a fresh render attempt.
 */
export function resetWorkInProgressFiber(
	wip: Fiber,
	renderLanes: number,
): void {
	// Clear effects
	wip.flags = NoFlags;
	wip.subtreeFlags = NoFlags;
	wip.deletions = null;

	// Reset lanes to render lanes
	wip.lanes = createLanes(renderLanes);
	wip.childLanes = NoLanes;
}

/**
 * Clones the WIP child fibers from current.
 * Used when bailing out but still needing to clone children.
 */
export function cloneChildFibers(
	_current: Fiber | null,
	workInProgress: Fiber,
): void {
	if (workInProgress.child === null) {
		return;
	}

	// Clone the first child
	let currentChild = workInProgress.child;
	let newChild = createWorkInProgressFiber(
		currentChild,
		currentChild.pendingProps,
	);
	workInProgress.child = newChild;
	newChild.return = workInProgress;

	// Clone siblings
	while (currentChild.sibling !== null) {
		currentChild = currentChild.sibling;
		const newSibling = createWorkInProgressFiber(
			currentChild,
			currentChild.pendingProps,
		);
		newChild.sibling = newSibling;
		newSibling.return = workInProgress;
		newChild = newSibling;
	}
}

// ============================================
// Commit Tree Swap
// ============================================

/**
 * Finalizes the WIP tree as the new current tree.
 * Called during commitRoot.
 */
export function finishConcurrentRender(
	root: FiberRoot,
	finishedWork: Fiber,
	lanes: number,
): void {
	root.finishedWork = finishedWork;
	root.finishedLanes = createLanes(lanes);
}

/**
 * Swaps the current tree with the WIP tree.
 * This happens atomically in commitRoot.
 */
export function commitTreeSwap(root: FiberRoot): void {
	const finishedWork = root.finishedWork;
	if (finishedWork === null) {
		return;
	}

	// The finished work becomes the new current
	root.current = finishedWork;

	// Clear the finished work reference
	root.finishedWork = null;
	root.finishedLanes = NoLanes;

	// Reset WIP globals
	workInProgressRoot = null;
	workInProgress = null;
	workInProgressRootRenderLanes = 0;
}

// ============================================
// Bailout Utilities
// ============================================

/**
 * Checks if we can bail out of updating a fiber.
 * Bailout means we can reuse the current fiber without re-rendering.
 */
export function checkIfWorkInProgressReceivedUpdate(): boolean {
	// This would check if the fiber received an update
	// For now, always return false (no optimization)
	return false;
}

/**
 * Marks that the work-in-progress received an update.
 */
let didReceiveUpdate = false;

export function markWorkInProgressReceivedUpdate(): void {
	didReceiveUpdate = true;
}

export function resetDidReceiveUpdate(): void {
	didReceiveUpdate = false;
}

export function getDidReceiveUpdate(): boolean {
	return didReceiveUpdate;
}

// ============================================
// Debug Utilities
// ============================================

/**
 * Returns debugging info about the current WIP state.
 */
export function getWorkInProgressDebugInfo(): {
	hasRoot: boolean;
	hasFiber: boolean;
	lanes: number;
	fiberTag: number | null;
} {
	return {
		hasRoot: workInProgressRoot !== null,
		hasFiber: workInProgress !== null,
		lanes: workInProgressRootRenderLanes,
		fiberTag: workInProgress?.tag ?? null,
	};
}
