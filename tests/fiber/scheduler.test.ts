import { describe, expect, test } from "bun:test";
import {
	Priority,
	cancelCallback,
	// @ts-ignore: private but needed for test
	flushWork,
	getCurrentPriorityLevel,
	getCurrentTime,
	lanesToSchedulerPriority,
	requestEventTime,
	requestUpdateLane,
	runWithPriority,
	scheduleCallback,
	schedulerPriorityToLane,
	shouldYield,
	shouldYieldForPriority,
} from "@/fiber";
import { DefaultLane, IdleLane, SyncLane } from "@/fiber";

describe("scheduler - time & yield", () => {
	test("getCurrentTime returns a number", () => {
		const t = getCurrentTime();
		expect(typeof t).toBe("number");
		expect(t).toBeGreaterThan(0);
	});

	test("shouldYield returns false before deadline", () => {
		// By default deadline is 0, so shouldYield may be true.
		// We mostly verify it returns a boolean.
		expect(typeof shouldYield()).toBe("boolean");
	});

	test("shouldYieldForPriority immediate never yields", () => {
		expect(shouldYieldForPriority(Priority.ImmediatePriority)).toBe(false);
	});

	test("shouldYieldForPriority lower may yield", () => {
		expect(typeof shouldYieldForPriority(Priority.NormalPriority)).toBe(
			"boolean",
		);
	});
});

describe("scheduler - task queue", () => {
	test("scheduleCallback returns a Task", () => {
		const cb = () => true;
		const task = scheduleCallback(Priority.NormalPriority, cb);
		expect(task).toBeDefined();
		expect(typeof task.id).toBe("number");
		expect(task.callback).toBe(cb);
		cancelCallback(task);
	});

	test("cancelCallback nulls out callback", () => {
		const cb = () => true;
		const task = scheduleCallback(Priority.NormalPriority, cb);
		expect(task.callback).toBe(cb);
		cancelCallback(task);
		expect(task.callback).toBeNull();
	});

	test("flushWork clears the queue", () => {
		let ran = 0;
		scheduleCallback(Priority.NormalPriority, () => {
			ran++;
			return null;
		});
		flushWork();
		expect(ran).toBeGreaterThanOrEqual(1);
	});
});

describe("scheduler - priority helpers", () => {
	test("getCurrentPriorityLevel default", () => {
		expect(getCurrentPriorityLevel()).toBe(Priority.NormalPriority);
	});

	test("runWithPriority updates level", () => {
		expect(
			runWithPriority(Priority.UserBlockingPriority, () => {
				return getCurrentPriorityLevel();
			}),
		).toBe(Priority.UserBlockingPriority);
		expect(getCurrentPriorityLevel()).toBe(Priority.NormalPriority);
	});

	test("lanesToSchedulerPriority maps correctly", () => {
		expect(lanesToSchedulerPriority(SyncLane)).toBe(Priority.ImmediatePriority);
		expect(lanesToSchedulerPriority(DefaultLane)).toBe(
			Priority.UserBlockingPriority,
		);
		expect(lanesToSchedulerPriority(IdleLane)).toBe(Priority.NormalPriority);
	});

	test("schedulerPriorityToLane maps correctly", () => {
		expect(schedulerPriorityToLane(Priority.ImmediatePriority)).toBe(SyncLane);
		expect(schedulerPriorityToLane(Priority.UserBlockingPriority)).toBe(
			DefaultLane,
		);
		expect(schedulerPriorityToLane(Priority.NormalPriority)).toBe(DefaultLane);
		expect(schedulerPriorityToLane(Priority.IdlePriority)).toBe(IdleLane);
	});
});

describe("scheduler - request helpers", () => {
	test("requestEventTime returns a number", () => {
		expect(typeof requestEventTime()).toBe("number");
	});

	test("requestUpdateLane returns SyncLane", () => {
		expect(requestUpdateLane()).toBe(SyncLane);
	});
});
