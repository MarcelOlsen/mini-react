/**
 * Type-system enforcement tests.
 *
 * These files are NOT run as runtime tests. They are type-checked
 * by the compiler (`bun typecheck`) to verify that our branded
 * types and type guards correctly reject invalid code at compile time.
 *
 * Each `@ts-expect-error` comment asserts that the following line
 * produces a TypeScript error. If the line ever becomes valid,
 * the comment itself will error, alerting us to a regression in
 * our type safety.
 */

import type { Flags, Lane, Lanes, WorkTag } from "@/fiber";
import {
	NoFlags,
	SyncLane,
	createFlags,
	createLane,
	createLanes,
} from "@/fiber";

/* ============================================================ */
/* Branded types — Lane / Lanes / Flags                         */
/* ============================================================ */

// @ts-expect-error Branded type rejects raw number
const _badLane: Lane = 1;

// @ts-expect-error Branded type rejects raw number
const _badLanes: Lanes = 0b101;

// @ts-expect-error Branded type rejects raw number
const _badFlags: Flags = 0b0010;

// createLane only accepts numbers and returns Lane
const _validLane: Lane = createLane(1);
const _validLanes: Lanes = createLanes(0b101);
const _validFlags: Flags = createFlags(0b0010);

// Lane and Lanes are now aliases, so either can be used interchangeably
const _laneAsLanes: Lanes = _validLane;
const _lanesAsLane: Lane = _validLanes;

/* ============================================================ */
/* Centralised cast boundary — bitwise.ts helpers                */
/* ============================================================ */

import {
	flagsIncludes as _flagsIncludes,
	flagsOr as _flagsOr,
	laneIncludes as _laneIncludes,
	laneOr as _laneOr,
} from "@/fiber/bitwise";

const _merged: Lanes = _laneOr(SyncLane, _validLanes);
const _hasSync: boolean = _laneIncludes(_merged, SyncLane);

// flagsOr requires both args to be Flags
// @ts-expect-error raw number not assignable to Flags
const _badFlagsOr = _flagsOr(NoFlags, 0b0001);

// flagsIncludes requires Flags
// @ts-expect-error raw number not assignable to Flags
const _badFlagsCheck = _flagsIncludes(NoFlags, 0b0001);

/* ============================================================ */
/* Type guards — narrowing assertions                           */
/* ============================================================ */

import {
	assertElement,
	isElement,
	isFiberRoot,
	isHostComponentFiber,
	isLanesEmpty,
	lanesIncludeLane,
} from "@/fiber";

const _empty1 = isLanesEmpty(NoFlags as unknown as Lanes);
const _empty2 = isLanesEmpty(SyncLane);

const _includes1 = lanesIncludeLane(NoFlags as unknown as Lanes, SyncLane);
const _includes2 = lanesIncludeLane(SyncLane, SyncLane);

// isElement expects a Node, null is accepted because we widened the param
// but the return will be false
const _isElNull = isElement(null);

// assertElement now accepts Node | null (widened)
// undefined is still rejected at the type level
// @ts-expect-error undefined is not Node | null
assertElement(undefined);

const _maybeRoot: unknown = {};
if (isFiberRoot(_maybeRoot)) {
	// Narrowed to FiberRoot
	void _maybeRoot.containerInfo;
}

// isHostComponentFiber expects a full Fiber shape
// @ts-expect-error object literal is not a Fiber
isHostComponentFiber({ tag: 5 });

/* ============================================================ */
/* Fiber type fields — structural checks                        */
/* ============================================================ */

import type { Fiber, FiberRoot } from "@/fiber";

const _partialFiber: Partial<Fiber> = {
	// @ts-expect-error string not assignable to WorkTag
	tag: "HostComponent",
};

const _badRoot: Partial<FiberRoot> = {
	// @ts-expect-error string not assignable to Element
	containerInfo: "not-an-element",
};

const _hostFiber: Partial<Fiber> = {
	tag: 5 as WorkTag,
	// @ts-expect-error number not assignable to ElementType
	type: 42,
};

/* ============================================================ */
/* Scheduler priority — enum-like object                         */
/* ============================================================ */

import { Priority } from "@/fiber";

const _p1: Priority = Priority.ImmediatePriority;
const _p2: Priority = Priority.NormalPriority;

// @ts-expect-error string not assignable to Priority
const _badPriority: Priority = "high";

// @ts-expect-error non-existent member
const _badMember = Priority.CriticalPriority;

void _badLane;
void _badLanes;
void _badFlags;
void _validLane;
void _validLanes;
void _validFlags;
void _laneAsLanes;
void _lanesAsLane;
void _merged;
void _hasSync;
void _badFlagsOr;
void _badFlagsCheck;
void _empty1;
void _empty2;
void _includes1;
void _includes2;
void _isElNull;
void _maybeRoot;
void _partialFiber;
void _badRoot;
void _hostFiber;
void _p1;
void _p2;
void _badPriority;
void _badMember;
