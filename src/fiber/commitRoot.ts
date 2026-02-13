/* **************** */
/* Commit Root - Phase Orchestration */
/* **************** */

/**
 * Implements the commit phase of the fiber reconciler.
 * The commit phase is synchronous and cannot be interrupted.
 *
 * Three sub-phases:
 * 1. Before Mutation - Read DOM layout (getSnapshotBeforeUpdate)
 * 2. Mutation - Perform DOM mutations
 * 3. Layout - Run layout effects and refs (synchronously)
 *
 * Passive effects (useEffect) are scheduled asynchronously.
 */

import {
	commitAttachRef,
	commitDeletion,
	commitDetachRef,
	commitPlacement,
	commitUpdate,
} from "./commitWork";
import {
	collectEffects,
	collectEffectsWithCleanup,
	doesFiberHavePassiveEffects,
	runLayoutEffectCleanups,
	runLayoutEffectCreates,
	schedulePassiveEffects,
} from "./effectList";
import { markRootFinished } from "./lanes";
import type { Fiber, FiberRoot, Lanes } from "./types";
import {
	ChildDeletion,
	LayoutMask,
	MutationMask,
	Placement,
	Ref,
	Snapshot,
	Update,
	WorkTag,
	createFlags,
} from "./types";

// ============================================
// Commit Root Entry Point
// ============================================

/**
 * Commits the finished work to the DOM.
 * This is the main entry point for the commit phase.
 */
export function commitRoot(root: FiberRoot): void {
	const finishedWork = root.finishedWork;
	const finishedLanes = root.finishedLanes;
	if (finishedWork === null) {
		return;
	}

	// Save reference to current tree (for effect cleanup)
	const previousCurrent = root.current;

	// Clear the finished work
	root.finishedWork = null;
	root.finishedLanes = 0 as Lanes;

	// Check if there are any passive effects in either tree
	const hasPassiveEffectsInNew = doesFiberHavePassiveEffects(finishedWork);
	const hasPassiveEffectsInOld = doesFiberHavePassiveEffects(previousCurrent);
	const hasPassiveEffects = hasPassiveEffectsInNew || hasPassiveEffectsInOld;

	// === Before Mutation Phase ===
	commitBeforeMutationEffects(root, finishedWork);

	// === Mutation Phase ===
	commitMutationEffects(root, finishedWork);

	// Switch the current tree pointer
	root.current = finishedWork;

	// === Layout Phase ===
	commitLayoutEffects(root, finishedWork);

	// Mark the lanes as finished
	markRootFinished(root, finishedLanes);

	// === Schedule Passive Effects ===
	if (hasPassiveEffects) {
		// Collect effects from new tree (for creates) and old tree (for cleanups)
		const effects = collectEffectsWithCleanup(finishedWork, previousCurrent);
		schedulePassiveEffects(effects);
	}
}

// ============================================
// Before Mutation Phase
// ============================================

/**
 * Phase 1: Before Mutation
 * Called before the DOM is mutated.
 * Used for reading DOM state (e.g., getSnapshotBeforeUpdate).
 */
function commitBeforeMutationEffects(
	_root: FiberRoot,
	finishedWork: Fiber,
): void {
	commitBeforeMutationEffectsOnFiber(finishedWork);
}

/**
 * Recursively processes before mutation effects.
 * Uses DFS traversal visiting each fiber exactly once.
 */
function commitBeforeMutationEffectsOnFiber(fiber: Fiber): void {
	const flags = fiber.flags;

	// Process snapshot effects
	if ((flags as number) & (Snapshot as number)) {
		switch (fiber.tag) {
			case WorkTag.FunctionComponent:
				// Function components don't have getSnapshotBeforeUpdate
				break;
			case WorkTag.HostRoot:
				// Could clear container for portal root
				break;
			case WorkTag.HostComponent:
				// Host components don't need snapshots in our implementation
				break;
		}
	}

	// Recurse into child (child will handle its own siblings via recursion)
	if (fiber.child !== null) {
		commitBeforeMutationEffectsOnFiber(fiber.child);
	}

	// Then move to sibling (avoiding duplicate iteration)
	if (fiber.sibling !== null) {
		commitBeforeMutationEffectsOnFiber(fiber.sibling);
	}
}

// ============================================
// Mutation Phase
// ============================================

/**
 * Phase 2: Mutation
 * Performs actual DOM mutations: placements, updates, deletions.
 */
function commitMutationEffects(root: FiberRoot, finishedWork: Fiber): void {
	commitMutationEffectsOnFiber(root, finishedWork);
}

/**
 * Recursively processes mutation effects.
 * Uses DFS traversal visiting each fiber exactly once.
 */
function commitMutationEffectsOnFiber(root: FiberRoot, fiber: Fiber): void {
	const flags = fiber.flags;

	// Handle deletions first
	if ((flags as number) & (ChildDeletion as number)) {
		const deletions = fiber.deletions;
		if (deletions !== null) {
			for (const childToDelete of deletions) {
				commitDeletion(root, childToDelete, 0);
			}
		}
	}

	// Recurse into children (child will handle its own siblings via recursion)
	if (fiber.child !== null) {
		commitMutationEffectsOnFiber(root, fiber.child);
	}

	// Process this fiber's mutations
	if ((flags as number) & (MutationMask as number)) {
		// Detach ref before mutations
		if ((flags as number) & (Ref as number)) {
			const current = fiber.alternate;
			if (current !== null) {
				commitDetachRef(current);
			}
		}

		// Handle placement
		if ((flags as number) & (Placement as number)) {
			commitPlacement(fiber);
			// Clear the placement flag
			fiber.flags = createFlags(
				(fiber.flags as number) & ~(Placement as number),
			);
		}

		// Handle update
		if ((flags as number) & (Update as number)) {
			commitUpdate(fiber);
		}
	}

	// Then move to sibling (avoiding duplicate iteration)
	if (fiber.sibling !== null) {
		commitMutationEffectsOnFiber(root, fiber.sibling);
	}
}

// ============================================
// Layout Phase
// ============================================

/**
 * Phase 3: Layout
 * Called after DOM mutations.
 * Runs layout effects (useLayoutEffect) and attaches refs.
 */
function commitLayoutEffects(root: FiberRoot, finishedWork: Fiber): void {
	commitLayoutEffectsOnFiber(root, finishedWork);
}

/**
 * Recursively processes layout effects.
 * Uses DFS traversal visiting each fiber exactly once.
 */
function commitLayoutEffectsOnFiber(root: FiberRoot, fiber: Fiber): void {
	const flags = fiber.flags;

	// Recurse into children first (child will handle its own siblings via recursion)
	if (fiber.child !== null) {
		commitLayoutEffectsOnFiber(root, fiber.child);
	}

	// Process this fiber's layout effects
	if ((flags as number) & (LayoutMask as number)) {
		// Run layout effects for function components
		if (fiber.tag === WorkTag.FunctionComponent) {
			commitLayoutEffectOnFunctionComponent(fiber);
		}

		// Attach ref after DOM is ready
		if ((flags as number) & (Ref as number)) {
			commitAttachRef(fiber);
		}
	}

	// Then move to sibling (avoiding duplicate iteration)
	if (fiber.sibling !== null) {
		commitLayoutEffectsOnFiber(root, fiber.sibling);
	}
}

/**
 * Commits layout effects for a function component.
 */
function commitLayoutEffectOnFunctionComponent(_fiber: Fiber): void {
	// Layout effects are collected and run together
	// The actual effect execution happens via collectEffects/runLayoutEffects
	// This function can be used for component-specific handling
}

// ============================================
// Effect Execution Helpers
// ============================================

/**
 * Commits all pending layout effects synchronously.
 */
export function flushLayoutEffects(finishedWork: Fiber): void {
	const effects = collectEffects(finishedWork);
	runLayoutEffectCleanups(effects.layoutEffects);
	runLayoutEffectCreates(effects.layoutEffects);
}

/**
 * Commits unmount effects for a fiber tree.
 */
export function commitUnmountEffects(fiber: Fiber): void {
	let node: Fiber | null = fiber;

	while (node !== null) {
		// Clean up refs
		const ref = node.ref;
		if (ref !== null) {
			if (typeof ref === "function") {
				try {
					ref(null);
				} catch (error) {
					console.error("Error in ref cleanup:", error);
				}
			} else if ("current" in ref) {
				ref.current = null;
			}
		}

		// Traverse the tree
		if (node.child !== null) {
			node = node.child;
			continue;
		}

		if (node === fiber) {
			return;
		}

		while (node.sibling === null) {
			if (node.return === null || node.return === fiber) {
				return;
			}
			node = node.return;
		}

		node = node.sibling;
	}
}

// ============================================
// Root Operations
// ============================================

/**
 * Prepares the root for commit.
 * Called before starting the commit phase.
 */
export function prepareForCommit(_containerInfo: Element): void {
	// Could disable events during commit for consistency
	// For now, this is a no-op
}

/**
 * Resets after commit.
 * Called after the commit phase completes.
 */
export function resetAfterCommit(_containerInfo: Element): void {
	// Could re-enable events after commit
	// For now, this is a no-op
}

// ============================================
// Deletion Queue
// ============================================

/**
 * Processes all pending deletions.
 */
export function commitDeletions(root: FiberRoot, deletions: Fiber[]): void {
	for (const fiber of deletions) {
		commitDeletion(root, fiber, 0);
	}
}
