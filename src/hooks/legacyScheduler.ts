/**
 * Legacy Effect Scheduler
 *
 * This module provides backward compatibility for effect scheduling
 * via microtask queue. In the Fiber architecture, effects should run
 * during the commit phase, but this shim is kept for compatibility.
 *
 * @deprecated This will be removed in a future version once all
 * effects are properly handled by the Fiber commit phase.
 */

/**
 * Effect queue for backward compatibility
 *
 * In the old implementation, effects were scheduled via microtask.
 * In Fiber, effects run during commit phase.
 */
let effectQueue: (() => void)[] = [];
let isFlushingEffects = false;

/**
 * Schedule an effect to be run after the current render
 *
 * @deprecated Effects should run in commit phase, not via microtask
 */
export function scheduleEffect(effectFn: () => void): void {
	effectQueue.push(effectFn);

	if (!isFlushingEffects) {
		queueMicrotask(flushEffects);
	}
}

/**
 * Flush all queued effects
 */
function flushEffects(): void {
	if (isFlushingEffects) return;

	isFlushingEffects = true;

	try {
		while (effectQueue.length > 0) {
			const effect = effectQueue.shift();
			if (effect) {
				effect();
			}
		}
	} finally {
		isFlushingEffects = false;
	}
}

/**
 * Get the effect queue for external access
 *
 * @deprecated For testing only
 */
export function getEffectQueue(): (() => void)[] {
	return effectQueue;
}

/**
 * Reset the effect queue (for testing)
 *
 * This is needed to prevent test pollution when multiple tests
 * schedule effects that outlive the test lifecycle.
 */
export function resetEffectQueueForTests(): void {
	effectQueue = [];
	isFlushingEffects = false;
}
