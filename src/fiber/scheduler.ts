/* **************** */
/* Fiber Scheduler - Time Slicing               */
/* **************** */

/**
 * Implements time-sliced rendering with interruptibility.
 * Uses MessageChannel for scheduling, performance.now() for timing,
 * and a binary min-heap for the task queue.
 */

import { peek, pop, push } from "./minHeap";
import type { Lane, Lanes } from "./types";
import { DefaultLane, IdleLane, SyncLane, createLane } from "./types";

/* ============================================ */
/* Priority levels                              */
/* ============================================ */

export const Priority = {
	ImmediatePriority: 1,
	UserBlockingPriority: 2,
	NormalPriority: 3,
	LowPriority: 4,
	IdlePriority: 5,
} as const satisfies Record<string, number>;

export type Priority = (typeof Priority)[keyof typeof Priority];

/* ============================================ */
/* Configuration                                */
/* ============================================ */

const FRAME_YIELD_INTERVAL = 5;
const IDLE_YIELD_INTERVAL = 50;

const PRIORITY_TIMEOUT: Record<Priority, number> = {
	[Priority.ImmediatePriority]: -1,
	[Priority.UserBlockingPriority]: 250,
	[Priority.NormalPriority]: 5000,
	[Priority.LowPriority]: 10000,
	[Priority.IdlePriority]: 1073741823,
};

/* ============================================ */
/* State                                        */
/* ============================================ */

let deadline = 0;
let isMessageLoopRunning = false;

let channel: MessageChannel | null = null;

let currentPriorityLevel: Priority = Priority.NormalPriority;

/* ============================================ */
/* Time                                         */
/* ============================================ */

export function getCurrentTime(): number {
	if (
		typeof performance !== "undefined" &&
		typeof performance.now === "function"
	) {
		return performance.now();
	}
	return Date.now();
}

export function shouldYield(): boolean {
	return getCurrentTime() >= deadline;
}

export function shouldYieldForPriority(priority: Priority): boolean {
	if (priority <= Priority.ImmediatePriority) return false;
	return shouldYield();
}

function calculateDeadline(priority: Priority): number {
	const now = getCurrentTime();
	return (
		now +
		(priority === Priority.IdlePriority
			? IDLE_YIELD_INTERVAL
			: FRAME_YIELD_INTERVAL)
	);
}

/* ============================================ */
/* Task type                                    */
/* ============================================ */

export type Continuation = (
	hasTimeRemaining: boolean,
	currentTime: number,
) => Continuation | boolean | null;

type Task = {
	id: number;
	callback: Continuation | null;
	priorityLevel: Priority;
	startTime: number;
	expirationTime: number;
	sortIndex: number;
};

let taskIdCounter = 0;

/* ============================================ */
/* Min-heap task queue                          */
/* ============================================ */

const taskQueue: Task[] = [];

/**
 * Insert a task into the scheduler queue and start the message loop
 * if it is not already running.
 */
export function scheduleCallback(
	priorityLevel: Priority,
	callback: (hasTimeRemaining: boolean, currentTime: number) => boolean | null,
): Task {
	const now = getCurrentTime();
	const expirationTime = now + PRIORITY_TIMEOUT[priorityLevel];

	const task: Task = {
		id: taskIdCounter++,
		callback,
		priorityLevel,
		startTime: now,
		expirationTime,
		sortIndex: expirationTime,
	};

	push(taskQueue, task);

	if (!isMessageLoopRunning) {
		isMessageLoopRunning = true;
		schedulePerformWorkUntilDeadline();
	}

	return task;
}

export function cancelCallback(task: Task): void {
	task.callback = null;
}

export function getCurrentPriorityLevel(): Priority {
	return currentPriorityLevel;
}

export function runWithPriority<T>(
	priorityLevel: Priority,
	callback: () => T,
): T {
	const previousPriorityLevel = currentPriorityLevel;
	currentPriorityLevel = priorityLevel;
	try {
		return callback();
	} finally {
		currentPriorityLevel = previousPriorityLevel;
	}
}

/* ============================================ */
/* Message loop                                 */
/* ============================================ */

function schedulePerformWorkUntilDeadline(): void {
	if (typeof MessageChannel !== "undefined") {
		if (channel === null) {
			channel = new MessageChannel();
			channel.port1.onmessage = performWorkUntilDeadline;
		}
		channel.port2.postMessage(null);
	} else {
		setTimeout(performWorkUntilDeadline, 0);
	}
}

function performWorkUntilDeadline(): void {
	isMessageLoopRunning = false;
	processTaskQueue();
}

function processTaskQueue(): void {
	const now = getCurrentTime();

	while (true) {
		const task = peek(taskQueue);
		if (!task) break;

		// Stale / cancelled → drop and keep going
		if (task.callback === null) {
			pop(taskQueue);
			continue;
		}

		// Delayed task → stop (min-heap guarantees nothing else is ready)
		if (task.startTime > now) break;

		// Work on the task
		deadline = calculateDeadline(task.priorityLevel);
		currentPriorityLevel = task.priorityLevel;
		const continuation = task.callback(true, now);

		if (typeof continuation === "function") {
			// Task yielded — keep in queue with updated callback
			task.callback = continuation as typeof task.callback;
		} else {
			// Task finished — remove from heap
			pop(taskQueue);
		}

		if (shouldYield() && peek(taskQueue) !== undefined) {
			// More work but we should yield to the browser
			if (!isMessageLoopRunning) {
				isMessageLoopRunning = true;
				schedulePerformWorkUntilDeadline();
			}
			break;
		}
	}

	currentPriorityLevel = Priority.NormalPriority;
}

/* ============================================ */
/* Lane mapping                                 */
/* ============================================ */

export function lanesToSchedulerPriority(lanes: Lanes | Lane): Priority {
	const lane = getHighestPriorityLane(lanes);
	if (lane === SyncLane) return Priority.ImmediatePriority;

	const n = unlane(lane);
	if (n <= unlane(DefaultLane)) return Priority.UserBlockingPriority;
	if (n <= unlane(IdleLane)) return Priority.NormalPriority;
	return Priority.IdlePriority;
}

export function schedulerPriorityToLane(priority: Priority): Lane {
	switch (priority) {
		case Priority.ImmediatePriority:
			return SyncLane;
		case Priority.UserBlockingPriority:
			return DefaultLane;
		case Priority.NormalPriority:
			return DefaultLane;
		case Priority.LowPriority:
			return IdleLane;
		case Priority.IdlePriority:
			return IdleLane;
		default:
			return DefaultLane;
	}
}

function getHighestPriorityLane(lanes: Lanes): Lane {
	return createLane(unlanes(lanes) & -unlanes(lanes));
}

/* ============================================ */
/* Concurrent flags                             */
/* ============================================ */

let workInProgressIsConcurrent = false;

export function setWorkInProgressConcurrent(isConcurrent: boolean): void {
	workInProgressIsConcurrent = isConcurrent;
}

export function isWorkInProgressConcurrent(): boolean {
	return workInProgressIsConcurrent;
}

export function requestEventTime(): number {
	return getCurrentTime();
}

export function requestUpdateLane(): Lane {
	return SyncLane;
}

/* ============================================ */
/* Idle scheduling                                */
/* ============================================ */

export function scheduleIdleCallback(
	callback: (deadline: {
		didTimeout: boolean;
		timeRemaining: () => number;
	}) => void,
): number {
	if (typeof requestIdleCallback !== "undefined") {
		return requestIdleCallback(callback);
	}
	const start = getCurrentTime();
	return setTimeout(
		() =>
			callback({
				didTimeout: false,
				timeRemaining: () =>
					Math.max(0, IDLE_YIELD_INTERVAL - (getCurrentTime() - start)),
			}),
		0,
	) as unknown as number;
}

export function cancelIdleCallback(id: number): void {
	if (
		typeof window !== "undefined" &&
		typeof window.cancelIdleCallback !== "undefined"
	) {
		window.cancelIdleCallback(id);
	} else {
		clearTimeout(id);
	}
}

/* ============================================ */
/* Force flush                                  */
/* ============================================ */

export function flushWork(): boolean {
	const previousPriorityLevel = currentPriorityLevel;
	currentPriorityLevel = Priority.ImmediatePriority;

	try {
		while (taskQueue.length > 0) {
			const task = peek(taskQueue);
			if (!task || task.callback === null) {
				if (task) pop(taskQueue);
				continue;
			}

			const result = task.callback(true, getCurrentTime());
			if (typeof result !== "function") {
				pop(taskQueue);
			} else {
				task.callback = result as typeof task.callback;
			}
		}
		return true;
	} finally {
		currentPriorityLevel = previousPriorityLevel;
	}
}

/* ============================================ */
/* Bitwise helpers (single source of truth)       */
/* ============================================ */

const unlane = (lane: Lane): number => lane as unknown as number;
const unlanes = (lanes: Lanes): number => lanes as unknown as number;
