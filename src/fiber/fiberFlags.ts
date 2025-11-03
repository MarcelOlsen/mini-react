/**
 * Fiber Flags and Constants
 *
 * These constants are used to mark fibers with specific effects
 * that need to be applied during the commit phase.
 */

import type { EffectTag, Lanes } from "./types";

// ===== EFFECT TAGS =====
// Using bitwise flags so multiple effects can be combined

/**
 * No effect - fiber doesn't need any DOM operation
 */
export const NoEffect: EffectTag = 0b0000;

/**
 * Placement - fiber needs to be inserted into the DOM
 * Used for newly created fibers or fibers that moved in the tree
 */
export const Placement: EffectTag = 0b0001;

/**
 * Update - fiber's DOM node needs to be updated
 * Props or content changed, but the node itself stays in the same position
 */
export const UpdateEffect: EffectTag = 0b0010;
// Keep old name for backwards compatibility temporarily
export const Update = UpdateEffect;

/**
 * Deletion - fiber's DOM node needs to be removed
 * Fiber is being removed from the tree
 */
export const Deletion: EffectTag = 0b0100;

// ===== LANES (Priority System) =====
// Using bitwise flags for fine-grained priority control
// Lower bit position = higher priority

/**
 * No lanes - no work scheduled
 */
export const NoLanes: Lanes = 0b00000000;

/**
 * Sync lane - highest priority, must complete immediately
 * Used for controlled inputs, urgent user interactions
 */
export const SyncLane: Lanes = 0b00000001;

/**
 * Input lane - high priority for discrete user input
 * Used for clicks, key presses, focus changes
 */
export const InputLane: Lanes = 0b00000010;

/**
 * Default lane - normal priority for most updates
 * Used for data fetches, network responses, regular state updates
 */
export const DefaultLane: Lanes = 0b00000100;

/**
 * Transition lane - lower priority for transitions
 * Used for startTransition(), loading states, animations
 */
export const TransitionLane: Lanes = 0b00001000;

/**
 * Retry lane - for retrying failed updates
 * Used internally for suspense and error boundaries
 */
export const RetryLane: Lanes = 0b00010000;

/**
 * Idle lane - lowest priority for non-critical updates
 * Used for analytics, prefetching, offscreen rendering
 */
export const IdleLane: Lanes = 0b00100000;

// ===== HELPER FUNCTIONS =====

/**
 * Check if an effect tag indicates DOM mutation is needed
 */
export function isEffectTagMutation(effectTag: EffectTag): boolean {
	return (effectTag & (Placement | UpdateEffect | Deletion)) !== 0;
}

/**
 * Check if effect tag includes a specific flag
 */
export function hasEffectTag(effectTag: EffectTag, flag: EffectTag): boolean {
	return (effectTag & flag) !== 0;
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
 *
 * Uses two's complement negation to isolate the lowest-order (rightmost) set bit.
 * In two's complement, -x = ~x + 1. When we AND x with -x, all bits cancel except
 * the rightmost set bit.
 *
 * Example: lanes = 0b0110 (InputLane | DefaultLane)
 *   lanes:      0b0110
 *   -lanes:     0b1010  (two's complement)
 *   lanes & -lanes: 0b0010  (isolates rightmost set bit = InputLane)
 *
 * Since lower bit positions represent higher priority (SyncLane = 0b00000001 is highest),
 * the rightmost set bit is the highest priority lane.
 */
export function getHighestPriorityLane(lanes: Lanes): Lanes {
	return lanes & -lanes;
}

/**
 * Check if work is sync priority
 */
export function includesSyncLane(lanes: Lanes): boolean {
	return (lanes & SyncLane) !== 0;
}
