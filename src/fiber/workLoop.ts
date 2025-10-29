/**
 * Work Loop - The Heart of Fiber Architecture
 *
 * This module implements the work loop that processes fibers incrementally.
 * It's what makes Fiber different from the synchronous reconciler:
 * - Work can be paused and resumed
 * - Work can be prioritized
 * - Work can be discarded on error
 *
 * Key Concepts:
 * - workInProgress: The fiber we're currently working on
 * - performUnitOfWork: Process one fiber and return next unit
 * - completeUnitOfWork: Finish processing a fiber
 * - Depth-first traversal WITHOUT recursion
 */

import { trackRenderEnd, trackRenderStart } from "../performance";
import { beginWork } from "./beginWork";
import { commitRoot } from "./commitWork";
import { completeWork } from "./completeWork";
import { createWorkInProgress } from "./fiberCreation";
import type { Fiber, FiberRoot } from "./types";

/**
 * Global work-in-progress state
 * These track what we're currently rendering
 */
let workInProgress: Fiber | null = null;
let workInProgressRoot: FiberRoot | null = null;

/**
 * Schedule an update on a fiber
 *
 * This is the entry point for all updates (setState, render, etc).
 * It finds the root and schedules work.
 *
 * @param fiber The fiber that needs to update
 */
export function scheduleUpdateOnFiber(fiber: Fiber): void {
	// Find the root fiber by walking up
	const root = getRootFromFiber(fiber);

	// For now, we do all work synchronously
	// In Phase 15 (Concurrent Mode), we'll prioritize and schedule
	performSyncWorkOnRoot(root);
}

/**
 * Find the FiberRoot by walking up the tree
 */
function getRootFromFiber(fiber: Fiber): FiberRoot {
	let node = fiber;

	// Walk up to root fiber (type === null)
	while (node.return !== null) {
		node = node.return;
	}

	// Root fiber's stateNode is the FiberRoot
	if (
		node.stateNode &&
		typeof node.stateNode === "object" &&
		"containerInfo" in node.stateNode
	) {
		return node.stateNode as FiberRoot;
	}

	throw new Error("Unable to find FiberRoot");
}

/**
 * Perform synchronous work on a root
 *
 * This is the main entry point for rendering.
 * It has two phases:
 * 1. RENDER PHASE: Build work-in-progress tree (can pause/discard)
 * 2. COMMIT PHASE: Apply changes to DOM (synchronous, atomic)
 *
 * @param root The FiberRoot to render
 */
function performSyncWorkOnRoot(root: FiberRoot): void {
	// Track render performance
	trackRenderStart();

	// RENDER PHASE
	// Build the work-in-progress tree
	renderRootSync(root);

	// COMMIT PHASE
	// If we have finished work, commit it
	const finishedWork = root.finishedWork;
	if (finishedWork !== null) {
		// Apply all changes to the DOM!
		commitRoot(root);
	}

	// Track render end
	trackRenderEnd();
}

/**
 * Render the root synchronously
 *
 * This builds the entire work-in-progress tree by calling
 * the work loop until all work is complete.
 *
 * @param root The FiberRoot to render
 */
function renderRootSync(root: FiberRoot): void {
	// Prepare for work
	workInProgressRoot = root;

	// Create work-in-progress from current tree
	// Use the pendingProps from root.current
	const rootWorkInProgress = createWorkInProgress(
		root.current,
		root.current.pendingProps,
	);
	workInProgress = rootWorkInProgress;

	// Process all work
	workLoopSync();

	// Finished - save the result
	// NOTE: workInProgress will be null after work loop completes,
	// so we use the saved root reference
	const finishedWork = rootWorkInProgress;

	// Reset work state
	workInProgressRoot = null;
	workInProgress = null;

	// Set finished work after clearing work-in-progress
	root.finishedWork = finishedWork;
}

/**
 * The synchronous work loop
 *
 * This is where the magic happens!
 * We process units of work one at a time until done.
 *
 * The loop is SYNCHRONOUS for now, but the structure allows
 * for ASYNCHRONOUS work in Phase 15 (Concurrent Mode):
 *
 * ```typescript
 * while (workInProgress && !shouldYield()) {
 *   performUnitOfWork(workInProgress);
 * }
 * ```
 */
function workLoopSync(): void {
	while (workInProgress !== null) {
		performUnitOfWork(workInProgress);
	}
}

/**
 * Process one unit of work
 *
 * This is the core of Fiber's incremental rendering.
 * Each call processes ONE fiber and returns the NEXT fiber to process.
 *
 * The key insight: We use the fiber's child/sibling/return pointers
 * to traverse the tree WITHOUT recursion!
 *
 * Traversal order (depth-first):
 * 1. Process current fiber (beginWork)
 * 2. If it has a child, go to child
 * 3. If no child, complete current fiber
 * 4. If it has a sibling, go to sibling
 * 5. If no sibling, return to parent and repeat from step 3
 *
 * @param unitOfWork The fiber to process
 */
function performUnitOfWork(unitOfWork: Fiber): void {
	// Get the current (committed) version of this fiber
	const current = unitOfWork.alternate;

	// RENDER PHASE: Reconcile this fiber
	// beginWork returns the first child fiber (or null)
	let next: Fiber | null = null;
	try {
		next = beginWork(current, unitOfWork);
	} catch (error) {
		// TODO Phase 7: Error boundary handling
		console.error("Error in beginWork:", error);
		throw error;
	}

	// Update memoized props (what was just rendered)
	unitOfWork.memoizedProps = unitOfWork.pendingProps;

	if (next === null) {
		// No child - this fiber is complete
		// Move to sibling or return to parent
		completeUnitOfWork(unitOfWork);
	} else {
		// Has child - continue with it
		workInProgress = next;
	}
}

/**
 * Complete a unit of work
 *
 * When a fiber has no children (or all children are processed),
 * we complete it and move to the next unit of work.
 *
 * This function:
 * 1. Calls completeWork to finalize the fiber
 * 2. Collects effects from children
 * 3. Moves to sibling or returns to parent
 *
 * @param unitOfWork The fiber to complete
 */
function completeUnitOfWork(unitOfWork: Fiber): void {
	let completedWork: Fiber | null = unitOfWork;

	while (completedWork !== null) {
		const current = completedWork.alternate;
		const returnFiber: Fiber | null = completedWork.return;

		// COMPLETE PHASE: Finalize this fiber
		// This creates/updates DOM nodes but doesn't insert them yet
		try {
			completeWork(current, completedWork);
		} catch (error) {
			// TODO Phase 7: Error boundary handling
			console.error("Error in completeWork:", error);
			throw error;
		}

		// COLLECT EFFECTS: Build the effect list
		// The effect list is a linked list of all fibers with side effects
		// This makes the commit phase very efficient - we only process fibers that changed!
		if (returnFiber !== null) {
			// Append child effects to parent's effect list
			if (completedWork.firstEffect !== null) {
				if (returnFiber.lastEffect !== null) {
					// Parent already has effects - append to the end
					returnFiber.lastEffect.nextEffect = completedWork.firstEffect;
				} else {
					// Parent has no effects yet - this is the first
					returnFiber.firstEffect = completedWork.firstEffect;
				}
				returnFiber.lastEffect = completedWork.lastEffect;
			}

			// If this fiber has an effect, append it too
			const effectTag = completedWork.effectTag;
			if (effectTag !== null) {
				if (returnFiber.lastEffect !== null) {
					returnFiber.lastEffect.nextEffect = completedWork;
				} else {
					returnFiber.firstEffect = completedWork;
				}
				returnFiber.lastEffect = completedWork;
			} else {
			}
		}

		// MOVE TO NEXT UNIT OF WORK
		// Try sibling first (breadth at this level)
		const siblingFiber = completedWork.sibling;
		if (siblingFiber !== null) {
			// Process sibling next
			workInProgress = siblingFiber;
			return;
		}

		// No sibling - return to parent (move up the tree)
		completedWork = returnFiber;
		workInProgress = completedWork;
	}
}

/**
 * Get the current work-in-progress fiber
 * Used by hooks to access the currently rendering component
 */
export function getCurrentFiber(): Fiber | null {
	return workInProgress;
}

/**
 * Get the current work-in-progress root
 */
export function getCurrentRoot(): FiberRoot | null {
	return workInProgressRoot;
}
