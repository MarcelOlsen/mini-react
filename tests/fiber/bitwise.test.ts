import { describe, expect, test } from "bun:test";
import {
	DefaultLane,
	IdleLane,
	InputContinuousLane,
	NoLane,
	NoLanes,
	SyncLane,
	createFlags,
	createLane,
	createLanes,
} from "@/fiber";
import {
	flagsAnd,
	flagsIncludes,
	flagsOr,
	flagsRemove,
	laneAnd,
	laneHighest,
	laneIncludes,
	laneIncludesAny,
	laneOr,
	lanePriority,
	laneRemove,
	laneSubset,
	toFlags,
	toLane,
	toLanes,
	unflags,
	unlane,
	unlanes,
} from "@/fiber/bitwise";

describe("bitwise lane operations", () => {
	test("laneOr merges lanes", () => {
		const merged = laneOr(SyncLane, DefaultLane);
		expect(laneIncludes(merged, SyncLane)).toBe(true);
		expect(laneIncludes(merged, DefaultLane)).toBe(true);
	});

	test("laneAnd intersects lanes", () => {
		const a = laneOr(SyncLane, DefaultLane);
		expect(laneAnd(a, SyncLane)).toBe(SyncLane);
		expect(
			laneAnd(a, createLanes(Number(SyncLane) | Number(InputContinuousLane))),
		).toBe(SyncLane);
	});

	test("laneIncludes detects membership", () => {
		const lanes = laneOr(SyncLane, DefaultLane);
		expect(laneIncludes(lanes, SyncLane)).toBe(true);
		expect(laneIncludes(lanes, IdleLane)).toBe(false);
	});

	test("laneIncludesAny detects intersection", () => {
		const a = laneOr(SyncLane, DefaultLane);
		const b = laneOr(DefaultLane, IdleLane);
		expect(laneIncludesAny(a, b)).toBe(true);
		expect(laneIncludesAny(SyncLane, IdleLane)).toBe(false);
	});

	test("laneHighest returns highest-priority (lowest set) bit", () => {
		// DefaultLane = bit 4, InputContinuousLane = bit 2
		// InputContinuousLane is higher priority (lower bit index)
		const lanes = laneOr(DefaultLane, InputContinuousLane);
		expect(laneHighest(lanes)).toBe(InputContinuousLane);
	});

	test("lanePriority returns correct ctz", () => {
		expect(lanePriority(SyncLane)).toBe(0);
		expect(lanePriority(createLane(1 << 4))).toBe(4);
	});

	test("laneSubset", () => {
		expect(laneSubset(DefaultLane, DefaultLane)).toBe(true);
		expect(laneSubset(NoLanes, DefaultLane)).toBe(false);
	});

	test("laneRemove strips bits", () => {
		const lanes = laneOr(SyncLane, DefaultLane);
		const remaining = laneRemove(lanes, SyncLane);
		expect(laneIncludes(remaining, DefaultLane)).toBe(true);
		expect(laneIncludes(remaining, SyncLane)).toBe(false);
	});

	test("NoLane / NoLanes identity", () => {
		expect(laneIncludes(NoLanes, NoLane)).toBe(false);
		expect(laneIncludesAny(NoLanes, NoLanes)).toBe(false);
	});
});

describe("bitwise flags operations", () => {
	test("flagsOr merges flags", () => {
		const a = createFlags(0b0001);
		const b = createFlags(0b0010);
		const c = flagsOr(a, b);
		expect(flagsIncludes(c, a)).toBe(true);
		expect(flagsIncludes(c, b)).toBe(true);
	});

	test("flagsAnd intersects flags", () => {
		const a = createFlags(0b0011);
		const b = createFlags(0b0010);
		expect(flagsAnd(a, b)).toBe(b);
	});

	test("flagsRemove strips bits", () => {
		const a = createFlags(0b0011);
		const b = createFlags(0b0001);
		expect(flagsRemove(a, b)).toBe(createFlags(0b0010));
	});

	test("unflags / toFlags round-trip", () => {
		const raw = 0b10101;
		expect(unflags(toFlags(raw))).toBe(raw);
	});
});

describe("conversion helpers", () => {
	test("unlane / toLane round-trip", () => {
		expect(unlane(toLane(1 << 5))).toBe(1 << 5);
	});

	test("unlanes / toLanes round-trip", () => {
		expect(unlanes(toLanes(0b1010))).toBe(0b1010);
	});
});
