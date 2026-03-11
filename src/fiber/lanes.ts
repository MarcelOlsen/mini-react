/* **************** */
/* Lanes - Priority System */
/* **************** */

/**
 * Implements the lanes-based priority system.
 * Lanes are a bitmask representation of priority levels.
 */

import type { Fiber, FiberRoot, Lane, Lanes } from "./types";
import {
	DefaultLane,
	IdleLane,
	InputContinuousLane,
	NoLane,
	NoLanes,
	OffscreenLane,
	SyncLane,
	TransitionLane1,
	TransitionLane2,
	createLane,
	createLanes,
} from "./types";

// ============================================
// Lane Constants Re-exports
// ============================================

export {
	NoLane,
	NoLanes,
	SyncLane,
	InputContinuousLane,
	DefaultLane,
	TransitionLane1,
	TransitionLane2,
	IdleLane,
	OffscreenLane,
};

// ============================================
// Additional Lane Constants
// ============================================

/**
 * All non-idle lanes. Derived from lane constants so it stays correct when
 * lane definitions change.
 */
export const NonIdleLanes: Lanes = createLanes(
	(SyncLane as number) |
		(InputContinuousLane as number) |
		(DefaultLane as number) |
		(TransitionLane1 as number) |
		(TransitionLane2 as number),
);

/**
 * All transition lanes.
 */
export const TransitionLanes: Lanes = createLanes(
	(TransitionLane1 as number) | (TransitionLane2 as number),
);

/**
 * All update lanes (sync through transitions).
 */
export const UpdateLanes: Lanes = createLanes(
	(SyncLane as number) |
		(InputContinuousLane as number) |
		(DefaultLane as number) |
		(TransitionLanes as number),
);

// ============================================
// Lane Operations
// ============================================

/**
 * Merges two lanes together.
 */
export function mergeLanes(a: Lanes | Lane, b: Lanes | Lane): Lanes {
	return createLanes((a as number) | (b as number));
}

/**
 * Removes lanes from a set.
 */
export function removeLanes(set: Lanes, subset: Lanes | Lane): Lanes {
	return createLanes((set as number) & ~(subset as number));
}

/**
 * Intersects two lane sets.
 */
export function intersectLanes(a: Lanes, b: Lanes): Lanes {
	return createLanes((a as number) & (b as number));
}

/**
 * Checks if a lane set includes a specific lane.
 */
export function includesLane(set: Lanes, lane: Lane): boolean {
	return ((set as number) & (lane as number)) !== 0;
}

/**
 * Checks if a lane set includes any of the specified lanes.
 */
export function includesAnyLanes(set: Lanes, lanes: Lanes): boolean {
	return ((set as number) & (lanes as number)) !== 0;
}

/**
 * Checks if a lane set includes only non-urgent lanes.
 */
export function includesOnlyNonUrgentLanes(lanes: Lanes): boolean {
	return (
		((lanes as number) & (SyncLane as number)) === 0 &&
		((lanes as number) & (InputContinuousLane as number)) === 0
	);
}

/**
 * Checks if a lane set includes blocking lanes (sync or input continuous).
 */
export function includesBlockingLane(lanes: Lanes): boolean {
	return (
		((lanes as number) &
			((SyncLane as number) | (InputContinuousLane as number))) !==
		0
	);
}

/**
 * Checks if a lane set is empty.
 */
export function isLaneEmpty(lanes: Lanes): boolean {
	return lanes === NoLanes;
}

// ============================================
// Lane Priority
// ============================================

/**
 * Gets the highest priority lane from a set of lanes.
 * The highest priority is the rightmost bit.
 */
export function getHighestPriorityLane(lanes: Lanes): Lane {
	// Get the rightmost bit
	return createLane((lanes as number) & -(lanes as number));
}

/**
 * Gets the highest priority lanes (may return multiple if same priority).
 */
export function getHighestPriorityLanes(lanes: Lanes): Lanes {
	// For now, just return the highest priority lane
	// In a real implementation, this would return all lanes of the same priority group
	const highestLane = getHighestPriorityLane(lanes);
	return createLanes(highestLane as number);
}

/**
 * Checks if lane A is a subset of lanes B.
 */
export function isSubsetOfLanes(set: Lanes, subset: Lane | Lanes): boolean {
	return ((set as number) & (subset as number)) === (subset as number);
}

/**
 * Gets the priority number for a lane (lower is higher priority).
 */
export function getLanePriority(lane: Lane): number {
	// Count trailing zeros to get priority
	// SyncLane (bit 0) = priority 0 (highest)
	if ((lane as number) === 0) {
		return 31; // Lowest priority
	}

	let priority = 0;
	let n = lane as number;

	while ((n & 1) === 0) {
		priority++;
		n >>>= 1;
	}

	return priority;
}

/**
 * Converts lanes to a human-readable label.
 */
export function getLanesLabel(lanes: Lanes): string {
	const labels: string[] = [];

	if ((lanes as number) & (SyncLane as number)) {
		labels.push("Sync");
	}
	if ((lanes as number) & (InputContinuousLane as number)) {
		labels.push("InputContinuous");
	}
	if ((lanes as number) & (DefaultLane as number)) {
		labels.push("Default");
	}
	if ((lanes as number) & (TransitionLanes as number)) {
		labels.push("Transition");
	}
	if ((lanes as number) & (IdleLane as number)) {
		labels.push("Idle");
	}
	if ((lanes as number) & (OffscreenLane as number)) {
		labels.push("Offscreen");
	}

	return labels.length > 0 ? labels.join(", ") : "None";
}

// ============================================
// Root Lane Management
// ============================================

/**
 * Gets the next lanes to work on for a root.
 */
export function getNextLanes(
	root: FiberRoot,
	wipLanes: Lanes = NoLanes,
): Lanes {
	const pendingLanes = root.pendingLanes;

	if (pendingLanes === NoLanes) {
		return NoLanes;
	}

	// Expired lanes must be flushed synchronously — give them highest priority.
	const expiredPendingLanes = intersectLanes(pendingLanes, root.expiredLanes);
	if (expiredPendingLanes !== NoLanes) {
		return getHighestPriorityLanes(expiredPendingLanes);
	}

	let nextLanes = NoLanes;

	// Check for suspended lanes
	const suspendedLanes = root.suspendedLanes;
	const pingedLanes = root.pingedLanes;

	// Non-suspended lanes
	const nonIdlePendingLanes = intersectLanes(pendingLanes, NonIdleLanes);

	if (nonIdlePendingLanes !== NoLanes) {
		// Work on non-idle lanes first
		const nonSuspendedLanes = removeLanes(nonIdlePendingLanes, suspendedLanes);

		if (nonSuspendedLanes !== NoLanes) {
			nextLanes = getHighestPriorityLanes(nonSuspendedLanes);
		} else {
			// All non-idle lanes are suspended, check pinged
			const nonIdlePingedLanes = intersectLanes(
				nonIdlePendingLanes,
				pingedLanes,
			);
			if (nonIdlePingedLanes !== NoLanes) {
				nextLanes = getHighestPriorityLanes(nonIdlePingedLanes);
			}
		}
	} else {
		// Only idle lanes remain
		const unblockedLanes = removeLanes(pendingLanes, suspendedLanes);
		if (unblockedLanes !== NoLanes) {
			nextLanes = getHighestPriorityLanes(unblockedLanes);
		} else {
			const idlePingedLanes = intersectLanes(pendingLanes, pingedLanes);
			if (idlePingedLanes !== NoLanes) {
				nextLanes = getHighestPriorityLanes(idlePingedLanes);
			}
		}
	}

	if (nextLanes === NoLanes) {
		return NoLanes;
	}

	// Check if currently rendering lanes should be prioritized
	if (
		wipLanes !== NoLanes &&
		wipLanes !== nextLanes &&
		!includesAnyLanes(nextLanes, suspendedLanes)
	) {
		const wipHighestLane = getHighestPriorityLane(wipLanes);
		const nextHighestLane = getHighestPriorityLane(nextLanes);

		if ((wipHighestLane as number) <= (nextHighestLane as number)) {
			// WIP lanes are higher or equal priority
			return wipLanes;
		}
	}

	return nextLanes;
}

/**
 * Marks a root as having pending work at the given lanes.
 */
export function markRootUpdated(root: FiberRoot, updateLane: Lane): void {
	root.pendingLanes = mergeLanes(root.pendingLanes, updateLane);
	// A new update arriving on this lane means it is no longer suspended or
	// waiting for a ping — clear any stale blocked state so getNextLanes can
	// pick it up immediately.
	root.suspendedLanes = removeLanes(root.suspendedLanes, updateLane);
	root.pingedLanes = removeLanes(root.pingedLanes, updateLane);
}

/**
 * Marks lanes as finished (removes them from pending).
 */
export function markRootFinished(root: FiberRoot, finishedLanes: Lanes): void {
	root.pendingLanes = removeLanes(root.pendingLanes, finishedLanes);
	root.suspendedLanes = removeLanes(root.suspendedLanes, finishedLanes);
	root.pingedLanes = removeLanes(root.pingedLanes, finishedLanes);
	root.expiredLanes = removeLanes(root.expiredLanes, finishedLanes);
}

/**
 * Marks lanes as suspended.
 */
export function markRootSuspended(
	root: FiberRoot,
	suspendedLanes: Lanes,
): void {
	root.suspendedLanes = mergeLanes(root.suspendedLanes, suspendedLanes);
	// Remove from pinged since we're suspending
	root.pingedLanes = removeLanes(root.pingedLanes, suspendedLanes);
}

/**
 * Marks suspended lanes as pinged (ready to retry).
 */
export function markRootPinged(root: FiberRoot, pingedLanes: Lanes): void {
	root.pingedLanes = mergeLanes(
		root.pingedLanes,
		intersectLanes(root.suspendedLanes, pingedLanes),
	);
}

/**
 * Marks lanes as expired (must render synchronously).
 */
export function markRootExpired(root: FiberRoot, expiredLanes: Lanes): void {
	root.expiredLanes = mergeLanes(root.expiredLanes, expiredLanes);
}

// ============================================
// Fiber Lane Management
// ============================================

/**
 * Schedules an update lane on a fiber.
 */
export function scheduleUpdateOnFiber(fiber: Fiber, lane: Lane): void {
	// Mark the fiber and its alternate with the update lane.
	fiber.lanes = mergeLanes(fiber.lanes, lane);
	if (fiber.alternate !== null) {
		fiber.alternate.lanes = mergeLanes(fiber.alternate.lanes, lane);
	}

	// Bubble up to parents, keeping both current and alternate trees in sync.
	let parent = fiber.return;
	while (parent !== null) {
		parent.childLanes = mergeLanes(parent.childLanes, lane);
		if (parent.alternate !== null) {
			parent.alternate.childLanes = mergeLanes(
				parent.alternate.childLanes,
				lane,
			);
		}
		parent = parent.return;
	}
}

/**
 * Checks if a fiber has pending work at the given lanes.
 */
export function fiberHasWork(fiber: Fiber, lanes: Lanes): boolean {
	return includesAnyLanes(fiber.lanes, lanes);
}

/**
 * Checks if a fiber's subtree has pending work at the given lanes.
 */
export function fiberSubtreeHasWork(fiber: Fiber, lanes: Lanes): boolean {
	return includesAnyLanes(fiber.childLanes, lanes);
}

/**
 * Resets fiber lanes after rendering.
 */
export function resetFiberLanes(fiber: Fiber, renderLanes: Lanes): void {
	fiber.lanes = removeLanes(fiber.lanes, renderLanes);
	fiber.childLanes = removeLanes(fiber.childLanes, renderLanes);
}

// ============================================
// Lane Request
// ============================================

/**
 * Current event time for lane calculations.
 */
let currentEventTime = -1;

/**
 * Requests the current event time.
 */
export function requestEventTime(): number {
	if (currentEventTime !== -1) {
		return currentEventTime;
	}
	return performance.now();
}

/**
 * Sets the current event time.
 */
export function setCurrentEventTime(time: number): void {
	currentEventTime = time;
}

/**
 * Clears the current event time.
 */
export function clearCurrentEventTime(): void {
	currentEventTime = -1;
}

/**
 * Number of distinct transition lanes defined between TransitionLane1 and
 * TransitionLane2 (inclusive). Derived so it updates automatically when more
 * transition lanes are added.
 */
const TRANSITION_LANE_COUNT =
	Math.log2((TransitionLane2 as number) / (TransitionLane1 as number)) + 1;

/**
 * Transition lane tracking.
 */
let currentTransitionLane = 0;

/**
 * Requests an update lane based on current context.
 * In a full implementation, this would consider:
 * - Current execution context (event handlers, effects, etc.)
 * - Whether we're in a transition
 * - User blocking vs non-blocking updates
 */
export function requestUpdateLane(_fiber: Fiber): Lane {
	// For now, always return SyncLane for simplicity
	// A full implementation would check:
	// - If inside a transition, return TransitionLane
	// - If inside an event handler, return InputContinuousLane or DefaultLane
	// - If idle update, return IdleLane
	return SyncLane;
}

/**
 * Claims the next transition lane.
 * Used for useTransition/startTransition.
 */
export function claimNextTransitionLane(): Lane {
	// Shift TransitionLane1 left by the current index so we cycle only through
	// the real transition-lane bit positions rather than arbitrary bit slots.
	const lane = (TransitionLane1 as number) << currentTransitionLane;
	currentTransitionLane = (currentTransitionLane + 1) % TRANSITION_LANE_COUNT;
	return createLane(lane);
}

// ============================================
// Entanglement
// ============================================

/**
 * Entanglements between lanes.
 * When lane A is entangled with lane B, working on A requires also working on B.
 */
const laneEntanglements: Map<Lane, Lanes> = new Map();

/**
 * Entangles lanes together.
 */
export function entangleLanes(a: Lane, b: Lanes): void {
	const existing = laneEntanglements.get(a) ?? NoLanes;
	laneEntanglements.set(a, mergeLanes(existing, b));
}

/**
 * Gets the entangled lanes for a lane.
 */
export function getEntangledLanes(lane: Lane): Lanes {
	return laneEntanglements.get(lane) ?? NoLanes;
}

/**
 * Adds entangled lanes to a set.
 */
export function addEntangledLanes(lanes: Lanes): Lanes {
	let result = lanes;
	let remaining = lanes;

	while (remaining !== NoLanes) {
		const lane = getHighestPriorityLane(remaining);
		const entangled = getEntangledLanes(lane);
		result = mergeLanes(result, entangled);
		remaining = removeLanes(remaining, lane);
	}

	return result;
}

// ============================================
// Debug Utilities
// ============================================

/**
 * Total number of bits used for lane representation.
 * Derived from the highest defined lane (OffscreenLane) so formatLanes stays
 * correct when new lanes are added.
 */
const MAX_LANE_BITS =
	Math.floor(Math.log2(OffscreenLane as number)) + 1;

/**
 * Formats lanes for debugging.
 */
export function formatLanes(lanes: Lanes): string {
	return (lanes as number).toString(2).padStart(MAX_LANE_BITS, "0");
}

/**
 * Logs lane information.
 */
export function logLanes(label: string, lanes: Lanes): void {
	console.log(`${label}: ${formatLanes(lanes)} (${getLanesLabel(lanes)})`);
}
