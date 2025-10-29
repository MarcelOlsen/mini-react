/**
 * Fiber Flags and Constants
 *
 * These constants are used to mark fibers with specific effects
 * that need to be applied during the commit phase.
 */

import type { EffectTag, Lanes } from "./types";

// ===== EFFECT TAGS =====

/**
 * No effect - fiber doesn't need any DOM operation
 */
export const NoEffect: EffectTag = null;

/**
 * Placement - fiber needs to be inserted into the DOM
 * Used for newly created fibers or fibers that moved in the tree
 */
export const Placement: EffectTag = "PLACEMENT";

/**
 * Update - fiber's DOM node needs to be updated
 * Props or content changed, but the node itself stays in the same position
 */
export const UpdateEffect: EffectTag = "UPDATE";
// Keep old name for backwards compatibility temporarily
export const Update = UpdateEffect;

/**
 * Deletion - fiber's DOM node needs to be removed
 * Fiber is being removed from the tree
 */
export const Deletion: EffectTag = "DELETION";

// ===== LANES (Priority System) =====

/**
 * No lanes - no work scheduled
 */
export const NoLanes: Lanes = 0;

/**
 * Sync lane - highest priority, must complete immediately
 * Used for user interactions (clicks, typing, etc)
 */
export const SyncLane: Lanes = 1;

/**
 * Default lane - normal priority
 * Used for data fetches, most updates
 */
export const DefaultLane: Lanes = 2;

/**
 * Idle lane - lowest priority
 * Used for non-critical updates that can be delayed
 */
export const IdleLane: Lanes = 4;

// ===== HELPER FUNCTIONS =====

/**
 * Check if an effect tag indicates DOM mutation is needed
 */
export function isEffectTagMutation(effectTag: EffectTag): boolean {
	return (
		effectTag === Placement ||
		effectTag === UpdateEffect ||
		effectTag === Deletion
	);
}

/**
 * Check if lanes include any work
 */
export function includesSomeLane(lanes: Lanes): boolean {
	return lanes !== NoLanes;
}

/**
 * Merge two lane priorities
 */
export function mergeLanes(a: Lanes, b: Lanes): Lanes {
	return a | b;
}

/**
 * Remove lanes from a set
 */
export function removeLanes(set: Lanes, subset: Lanes): Lanes {
	return set & ~subset;
}

/**
 * Check if a set of lanes includes a specific lane
 */
export function isSubsetOfLanes(set: Lanes, subset: Lanes): boolean {
	return (set & subset) === subset;
}

/**
 * Get the highest priority lane from a set
 */
export function getHighestPriorityLane(lanes: Lanes): Lanes {
	// Return the rightmost (highest priority) bit
	return lanes & -lanes;
}

/**
 * Check if work is sync priority
 */
export function includesSyncLane(lanes: Lanes): boolean {
	return (lanes & SyncLane) !== 0;
}
