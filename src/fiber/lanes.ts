/* **************** */
/* Lanes - Priority System */
/* **************** */

/**
 * Implements the lanes-based priority system.
 * Lanes are a bitmask representation of priority levels.
 */

import {
	laneHighest as getHighestBit,
	laneAnd,
	laneIncludes,
	laneIncludesAny,
	laneOr,
	lanePriority,
	laneRemove,
	laneSubset,
	unlane,
	unlanes,
} from "./bitwise";
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

/* ============================================ */
/* Constants                                    */
/* ============================================ */

export const NonIdleLanes: Lanes =
	createLanes(0b0001111111111111111111111111111);

export const TransitionLanes: Lanes = createLanes(
	unlane(TransitionLane1) | unlane(TransitionLane2),
);

export const UpdateLanes: Lanes = createLanes(
	unlane(SyncLane) |
		unlane(InputContinuousLane) |
		unlane(DefaultLane) |
		unlane(TransitionLanes),
);

/* ============================================ */
/* Lane operations                              */
/* ============================================ */

export const mergeLanes = laneOr;

export const removeLanes = laneRemove;

export const intersectLanes = laneAnd;

export const includesLane = laneIncludes;

export const includesAnyLanes = laneIncludesAny;

export function includesOnlyNonUrgentLanes(lanes: Lanes): boolean {
	return (
		!laneIncludes(lanes, SyncLane) && !laneIncludes(lanes, InputContinuousLane)
	);
}

export function includesBlockingLane(lanes: Lanes): boolean {
	return laneIncludesAny(
		lanes,
		createLanes(unlane(SyncLane) | unlane(InputContinuousLane)),
	);
}

export function isLaneEmpty(lanes: Lanes): boolean {
	return lanes === NoLanes;
}

/* ============================================ */
/* Lane priority                                */
/* ============================================ */

export function getHighestPriorityLane(lanes: Lanes): Lane {
	return getHighestBit(lanes);
}

export function getHighestPriorityLanes(lanes: Lanes): Lanes {
	return createLanes(unlane(getHighestBit(lanes)));
}

export const isSubsetOfLanes = laneSubset;

export const getLanePriority = lanePriority;

export function getLanesLabel(lanes: Lanes): string {
	const labels: string[] = [];
	if (laneIncludes(lanes, SyncLane)) labels.push("Sync");
	if (laneIncludes(lanes, InputContinuousLane)) labels.push("InputContinuous");
	if (laneIncludes(lanes, DefaultLane)) labels.push("Default");
	if (laneIncludesAny(lanes, TransitionLanes)) labels.push("Transition");
	if (laneIncludes(lanes, IdleLane)) labels.push("Idle");
	if (laneIncludes(lanes, OffscreenLane)) labels.push("Offscreen");
	return labels.length > 0 ? labels.join(", ") : "None";
}

/* ============================================ */
/* Root lane management                         */
/* ============================================ */

export function getNextLanes(
	root: FiberRoot,
	wipLanes: Lanes = NoLanes,
): Lanes {
	const pendingLanes = root.pendingLanes;
	if (pendingLanes === NoLanes) return NoLanes;

	let nextLanes = NoLanes;
	const nonIdlePendingLanes = intersectLanes(pendingLanes, NonIdleLanes);

	if (nonIdlePendingLanes !== NoLanes) {
		const nonSuspendedLanes = removeLanes(
			nonIdlePendingLanes,
			root.suspendedLanes,
		);
		if (nonSuspendedLanes !== NoLanes) {
			nextLanes = getHighestPriorityLanes(nonSuspendedLanes);
		} else {
			const nonIdlePingedLanes = intersectLanes(
				nonIdlePendingLanes,
				root.pingedLanes,
			);
			if (nonIdlePingedLanes !== NoLanes) {
				nextLanes = getHighestPriorityLanes(nonIdlePingedLanes);
			}
		}
	} else {
		const unblockedLanes = removeLanes(pendingLanes, root.suspendedLanes);
		if (unblockedLanes !== NoLanes) {
			nextLanes = getHighestPriorityLanes(unblockedLanes);
		} else {
			const idlePingedLanes = intersectLanes(pendingLanes, root.pingedLanes);
			if (idlePingedLanes !== NoLanes) {
				nextLanes = getHighestPriorityLanes(idlePingedLanes);
			}
		}
	}

	if (nextLanes === NoLanes) return NoLanes;

	if (
		wipLanes !== NoLanes &&
		wipLanes !== nextLanes &&
		!includesAnyLanes(nextLanes, root.suspendedLanes)
	) {
		if (
			unlane(getHighestPriorityLane(wipLanes)) <=
			unlane(getHighestPriorityLane(nextLanes))
		) {
			return wipLanes;
		}
	}
	return nextLanes;
}

export function markRootUpdated(root: FiberRoot, updateLane: Lane): void {
	root.pendingLanes = mergeLanes(root.pendingLanes, updateLane);
}

export function markRootFinished(root: FiberRoot, finishedLanes: Lanes): void {
	root.pendingLanes = removeLanes(root.pendingLanes, finishedLanes);
	root.suspendedLanes = removeLanes(root.suspendedLanes, finishedLanes);
	root.pingedLanes = removeLanes(root.pingedLanes, finishedLanes);
	root.expiredLanes = removeLanes(root.expiredLanes, finishedLanes);
}

export function markRootSuspended(
	root: FiberRoot,
	suspendedLanes: Lanes,
): void {
	root.suspendedLanes = mergeLanes(root.suspendedLanes, suspendedLanes);
	root.pingedLanes = removeLanes(root.pingedLanes, suspendedLanes);
}

export function markRootPinged(root: FiberRoot, pingedLanes: Lanes): void {
	root.pingedLanes = mergeLanes(
		root.pingedLanes,
		intersectLanes(root.suspendedLanes, pingedLanes),
	);
}

export function markRootExpired(root: FiberRoot, expiredLanes: Lanes): void {
	root.expiredLanes = mergeLanes(root.expiredLanes, expiredLanes);
}

/* ============================================ */
/* Fiber lane management                        */
/* ============================================ */

export function scheduleUpdateOnFiber(fiber: Fiber, lane: Lane): void {
	fiber.lanes = mergeLanes(fiber.lanes, lane);
	let parent = fiber.return;
	while (parent !== null) {
		parent.childLanes = mergeLanes(parent.childLanes, lane);
		parent = parent.return;
	}
}

export function fiberHasWork(fiber: Fiber, lanes: Lanes): boolean {
	return includesAnyLanes(fiber.lanes, lanes);
}

export function fiberSubtreeHasWork(fiber: Fiber, lanes: Lanes): boolean {
	return includesAnyLanes(fiber.childLanes, lanes);
}

export function resetFiberLanes(fiber: Fiber, renderLanes: Lanes): void {
	fiber.lanes = removeLanes(fiber.lanes, renderLanes);
	fiber.childLanes = removeLanes(fiber.childLanes, renderLanes);
}

/* ============================================ */
/* Lane request & entanglement                  */
/* ============================================ */

let currentEventTime = -1;

export function requestEventTime(): number {
	if (currentEventTime !== -1) return currentEventTime;
	return performance.now();
}

export function setCurrentEventTime(time: number): void {
	currentEventTime = time;
}

export function clearCurrentEventTime(): void {
	currentEventTime = -1;
}

let currentTransitionLane = 0;

export function requestUpdateLane(_fiber: Fiber): Lane {
	return SyncLane;
}

export function claimNextTransitionLane(): Lane {
	const lane = 1 << currentTransitionLane;
	currentTransitionLane = (currentTransitionLane + 1) % 31;
	const u = unlane(TransitionLane1);
	if (lane < u) return TransitionLane1;
	if (lane > u) return TransitionLane2;
	return createLane(lane);
}

const laneEntanglements: Map<Lane, Lanes> = new Map();

export function entangleLanes(a: Lane, b: Lanes): void {
	const existing = laneEntanglements.get(a) ?? NoLanes;
	laneEntanglements.set(a, mergeLanes(existing, b));
}

export function getEntangledLanes(lane: Lane): Lanes {
	return laneEntanglements.get(lane) ?? NoLanes;
}

export function addEntangledLanes(lanes: Lanes): Lanes {
	let result = lanes;
	let remaining = lanes;
	while (remaining !== NoLanes) {
		const lane = getHighestPriorityLane(remaining);
		result = mergeLanes(result, getEntangledLanes(lane));
		remaining = removeLanes(remaining, lane);
	}
	return result;
}

/* ============================================ */
/* Debug                                        */
/* ============================================ */

export function formatLanes(lanes: Lanes): string {
	return unlanes(lanes).toString(2).padStart(31, "0");
}

export function logLanes(label: string, lanes: Lanes): void {
	console.log(`${label}: ${formatLanes(lanes)} (${getLanesLabel(lanes)})`);
}
