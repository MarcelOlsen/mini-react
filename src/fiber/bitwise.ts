/* **************** */
/* Bitwise Helpers for Branded Types */
/* **************** */

/**
 * Centralises every unsafe cast between branded numeric types
 * (Lane, Lanes, Flags) and raw numbers. No other file in the
 * package should ever write `as number` or `as Lane` etc. — all
 * conversions go through these helpers so that the “unsafe"
 * boundary is kept in one single file.
 */

import type { Flags, Lane, Lanes } from "./types";

/* ============================================ */
/* Lane helpers                                 */
/* ============================================ */

/** Unwrap a Lane to its raw numeric value. */
export const unlane = (lane: Lane): number => lane as unknown as number;

/** Wrap a raw number as a Lane. */
export const toLane = (n: number): Lane => n as Lane;

/** Unwrap Lanes to its raw numeric value. */
export const unlanes = (lanes: Lanes): number => lanes as unknown as number;

/** Wrap a raw number as Lanes. */
export const toLanes = (n: number): Lanes => n as Lanes;

/** Bitwise OR on Lanes/Lane values. */
export function laneOr(a: Lanes | Lane, b: Lanes | Lane): Lanes {
	return toLanes(unlane(a) | unlane(b));
}

/** Bitwise AND on Lanes values. */
export function laneAnd(a: Lanes, b: Lanes): Lanes {
	return toLanes(unlanes(a) & unlanes(b));
}

/** Bitwise AND NOT: remove `subset` from `set`. */
export function laneRemove(set: Lanes, subset: Lanes | Lane): Lanes {
	return toLanes(unlanes(set) & ~unlane(subset));
}

/** Test whether `set` contains `lane`. */
export function laneIncludes(set: Lanes | Lane, lane: Lane): boolean {
	return (unlanes(set) & unlane(lane)) !== 0;
}

/** Test whether `set` contains any lane in `lanes`. */
export function laneIncludesAny(set: Lanes, lanes: Lanes): boolean {
	return (unlanes(set) & unlanes(lanes)) !== 0;
}

/** Test whether `subset` is fully contained in `set`. */
export function laneSubset(set: Lanes, subset: Lanes | Lane): boolean {
	return (unlanes(set) & unlane(subset)) === unlane(subset);
}

/** Highest-priority (rightmost) bit from a lanes set → single Lane. */
export function laneHighest(set: Lanes): Lane {
	const n = unlanes(set);
	return toLane(n & -n);
}

/** Priority of a lane (count-trailing-zeros). SyncLane = 0. */
export function lanePriority(lane: Lane): number {
	const n = unlane(lane);
	if (n === 0) return 31;
	return 31 - Math.clz32(n ^ (n - 1));
}

/* ============================================ */
/* Flag helpers                                 */
/* ============================================ */

/** Unwrap Flags to its raw numeric value. */
export const unflags = (flags: Flags): number => flags as unknown as number;

/** Wrap a raw number as Flags. */
export const toFlags = (n: number): Flags => n as Flags;

/** Bitwise OR on Flags values. */
export function flagsOr(a: Flags, b: Flags): Flags {
	return toFlags(unflags(a) | unflags(b));
}

/** Bitwise AND on Flags values. */
export function flagsAnd(a: Flags, b: Flags): Flags {
	return toFlags(unflags(a) & unflags(b));
}

/** Test whether `flags` contains `flag`. */
export function flagsIncludes(flags: Flags, flag: Flags): boolean {
	return (unflags(flags) & unflags(flag)) !== 0;
}

/** Remove a flag from a flags set. */
export function flagsRemove(flags: Flags, flag: Flags): Flags {
	return toFlags(unflags(flags) & ~unflags(flag));
}
