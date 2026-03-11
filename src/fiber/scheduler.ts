/* **************** */
/* Fiber Scheduler - Time Slicing */
/* **************** */

/**
 * Implements time-sliced rendering with interruptibility.
 * Uses MessageChannel for scheduling and performance.now() for timing.
 */

import type { Lane, Lanes } from "./types";
import { DefaultLane, IdleLane, SyncLane, createLane } from "./types";

// ============================================
// Priority Levels
// ============================================

/**
 * Priority levels for scheduling.
 * Using const object pattern.
 */
export const Priority = {
	ImmediatePriority: 1,
	UserBlockingPriority: 2,
	NormalPriority: 3,
	LowPriority: 4,
	IdlePriority: 5,
} as const satisfies Record<string, number>;

export type Priority = (typeof Priority)[keyof typeof Priority];

// ============================================
// Scheduler Configuration
// ============================================

/**
 * Frame yield interval in milliseconds.
 * React uses ~5ms to leave time for browser painting at 60fps.
 */
const FRAME_YIELD_INTERVAL = 5;

/**
 * Maximum time to yield for idle work.
 */
const IDLE_YIELD_INTERVAL = 50;

// ============================================
// Scheduler State
// ============================================

/**
 * Current deadline for yielding.
 */
let deadline = 0;

/**
 * Whether there's pending work scheduled.
 */
let isMessageLoopRunning = false;

/**
 * The callback to execute during the message loop.
 */
let scheduledCallback:
	| ((hasTimeRemaining: boolean, currentTime: number) => boolean)
	| null = null;

/**
 * MessageChannel for scheduling.
 */
let channel: MessageChannel | null = null;

/**
 * Current priority level.
 */
let currentPriorityLevel: Priority = Priority.NormalPriority;

/**
 * Maps priority to timeout in milliseconds.
 */
const PRIORITY_TIMEOUT: Record<Priority, number> = {
	[Priority.ImmediatePriority]: -1, // Sync
	[Priority.UserBlockingPriority]: 250,
	[Priority.NormalPriority]: 5000,
	[Priority.LowPriority]: 10000,
	[Priority.IdlePriority]: 1073741823, // Max int32 (never expires)
};

// ============================================
// Time Functions
// ============================================

/**
 * Gets the current time.
 */
export function getCurrentTime(): number {
	if (
		typeof performance !== "undefined" &&
		typeof performance.now === "function"
	) {
		return performance.now();
	}
	return Date.now();
}

/**
 * Checks if we should yield to the browser.
 */
export function shouldYield(): boolean {
	const currentTime = getCurrentTime();
	return currentTime >= deadline;
}

/**
 * Checks if we should yield for a specific priority.
 */
export function shouldYieldForPriority(priority: Priority): boolean {
	if (priority <= Priority.ImmediatePriority) {
		return false; // Never yield for immediate priority
	}
	return shouldYield();
}

/**
 * Calculates the deadline based on priority.
 */
function calculateDeadline(priority: Priority): number {
	const currentTime = getCurrentTime();
	const timeout =
		priority === Priority.IdlePriority
			? IDLE_YIELD_INTERVAL
			: FRAME_YIELD_INTERVAL;
	return currentTime + timeout;
}

// ============================================
// Task Scheduling
// ============================================

/**
 * Task node for the scheduler queue.
 */
type Task = {
	id: number;
	callback:
		| ((hasTimeRemaining: boolean, currentTime: number) => boolean | null)
		| null;
	priorityLevel: Priority;
	startTime: number;
	expirationTime: number;
	sortIndex: number;
};

/**
 * Task ID counter.
 */
let taskIdCounter = 0;

/**
 * Task queue (min-heap by sortIndex).
 */
const taskQueue: Task[] = [];

/**
 * Schedules a callback with the given priority.
 */
export function scheduleCallback(
	priorityLevel: Priority,
	callback: (hasTimeRemaining: boolean, currentTime: number) => boolean | null,
): Task {
	const currentTime = getCurrentTime();
	const startTime = currentTime;
	const timeout = PRIORITY_TIMEOUT[priorityLevel];
	const expirationTime = startTime + timeout;

	const task: Task = {
		id: taskIdCounter++,
		callback,
		priorityLevel,
		startTime,
		expirationTime,
		sortIndex: expirationTime,
	};

	// Add to queue (simple push, should use heap for real implementation)
	taskQueue.push(task);
	taskQueue.sort((a, b) => a.sortIndex - b.sortIndex);

	// Start the message loop if not already running
	if (!isMessageLoopRunning) {
		isMessageLoopRunning = true;
		schedulePerformWorkUntilDeadline();
	}

	return task;
}

/**
 * Cancels a scheduled task.
 */
export function cancelCallback(task: Task): void {
	// Mark the callback as null to cancel
	task.callback = null;
}

/**
 * Gets the current priority level.
 */
export function getCurrentPriorityLevel(): Priority {
	return currentPriorityLevel;
}

/**
 * Runs a callback with a specific priority.
 */
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

// ============================================
// Message Loop
// ============================================

/**
 * Schedules the performWorkUntilDeadline function.
 */
function schedulePerformWorkUntilDeadline(): void {
	if (typeof MessageChannel !== "undefined") {
		if (channel === null) {
			channel = new MessageChannel();
			channel.port1.onmessage = performWorkUntilDeadline;
		}
		channel.port2.postMessage(null);
	} else {
		// Fallback to setTimeout
		setTimeout(performWorkUntilDeadline, 0);
	}
}

/**
 * Performs work until the deadline.
 */
function performWorkUntilDeadline(): void {
	if (scheduledCallback !== null) {
		const currentTime = getCurrentTime();
		deadline = currentTime + FRAME_YIELD_INTERVAL;

		const hasTimeRemaining = true;
		let hasMoreWork = true;

		try {
			hasMoreWork = scheduledCallback(hasTimeRemaining, currentTime);
		} finally {
			if (hasMoreWork) {
				schedulePerformWorkUntilDeadline();
			} else {
				isMessageLoopRunning = false;
				scheduledCallback = null;
			}
		}
	} else {
		isMessageLoopRunning = false;
	}

	// Process the task queue
	processTaskQueue();
}

/**
 * Processes tasks from the queue.
 */
function processTaskQueue(): void {
	const currentTime = getCurrentTime();

	while (taskQueue.length > 0) {
		const task = taskQueue[0]!;

		if (task.callback === null) {
			// Task was cancelled
			taskQueue.shift();
			continue;
		}

		if (task.startTime > currentTime) {
			// Task is delayed, stop processing
			break;
		}

		// Calculate deadline for this task
		deadline = calculateDeadline(task.priorityLevel);

		const callback = task.callback;
		currentPriorityLevel = task.priorityLevel;

		const continuationCallback = callback(true, currentTime);

		if (typeof continuationCallback === "function") {
			// Task yielded and wants to continue
			task.callback = continuationCallback as (
				hasTimeRemaining: boolean,
				currentTime: number,
			) => boolean | null;
		} else {
			// Task completed
			taskQueue.shift();
		}

		// Check if we should yield
		if (shouldYield() && taskQueue.length > 0) {
			// More work to do but we should yield
			if (!isMessageLoopRunning) {
				isMessageLoopRunning = true;
				schedulePerformWorkUntilDeadline();
			}
			break;
		}
	}

	currentPriorityLevel = Priority.NormalPriority;
}

// ============================================
// Lane to Priority Mapping
// ============================================

/**
 * Converts a lane to a scheduler priority.
 */
export function lanesToSchedulerPriority(lanes: Lanes): Priority {
	// Get the highest priority lane
	const lane = getHighestPriorityLane(lanes);

	if (lane === SyncLane) {
		return Priority.ImmediatePriority;
	}

	if ((lane as number) <= (DefaultLane as number)) {
		return Priority.UserBlockingPriority;
	}

	if ((lane as number) <= (IdleLane as number)) {
		return Priority.NormalPriority;
	}

	return Priority.IdlePriority;
}

/**
 * Converts a scheduler priority to a lane.
 */
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

/**
 * Gets the highest priority lane from a lanes bitmask.
 */
function getHighestPriorityLane(lanes: Lanes): Lane {
	// Get the rightmost bit (highest priority)
	return createLane((lanes as number) & -(lanes as number));
}

// ============================================
// Concurrent Work Loop
// ============================================

/**
 * Flag indicating if we're working concurrently.
 */
let workInProgressIsConcurrent = false;

/**
 * Sets the concurrent mode flag.
 */
export function setWorkInProgressConcurrent(isConcurrent: boolean): void {
	workInProgressIsConcurrent = isConcurrent;
}

/**
 * Checks if we're in concurrent mode.
 */
export function isWorkInProgressConcurrent(): boolean {
	return workInProgressIsConcurrent;
}

/**
 * Requests the current event time.
 */
export function requestEventTime(): number {
	return getCurrentTime();
}

/**
 * Requests a lane for an update.
 */
export function requestUpdateLane(): Lane {
	// For now, always use sync lane
	return SyncLane;
}

// ============================================
// Idle Scheduling
// ============================================

/**
 * Schedules work to run during idle time.
 */
export function scheduleIdleCallback(
	callback: (deadline: {
		didTimeout: boolean;
		timeRemaining: () => number;
	}) => void,
): number {
	if (typeof requestIdleCallback !== "undefined") {
		return requestIdleCallback(callback);
	}

	// Fallback implementation
	const start = getCurrentTime();
	return setTimeout(() => {
		callback({
			didTimeout: false,
			timeRemaining: () =>
				Math.max(0, IDLE_YIELD_INTERVAL - (getCurrentTime() - start)),
		});
	}, 0) as unknown as number;
}

/**
 * Cancels an idle callback.
 */
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

// ============================================
// Force Flush
// ============================================

/**
 * Forces all pending work to flush synchronously.
 */
export function flushWork(): boolean {
	const previousPriorityLevel = currentPriorityLevel;
	currentPriorityLevel = Priority.ImmediatePriority;

	try {
		while (taskQueue.length > 0) {
			const task = taskQueue[0]!;

			if (task.callback === null) {
				taskQueue.shift();
				continue;
			}

			const callback = task.callback;
			const result = callback(true, getCurrentTime());

			if (typeof result !== "function") {
				taskQueue.shift();
			}
		}
		return true;
	} finally {
		currentPriorityLevel = previousPriorityLevel;
	}
}
