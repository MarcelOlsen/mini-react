/* **************** */
/* Effect List Collection */
/* **************** */

/**
 * Implements effect list management for the fiber architecture.
 * Effects are stored as a circular linked list on the fiber's updateQueue.
 */

import { flagsIncludes, flagsOr } from "./bitwise";
import type { EffectCreate, Fiber } from "./types";
import { type Effect, HookEffectTag, Passive, WorkTag } from "./types";

// ============================================
// Effect Types
// ============================================

/**
 * Update queue structure for effects.
 * Effects are stored in a circular linked list.
 */
export type FunctionComponentUpdateQueue = {
	lastEffect: Effect | null;
};

// ============================================
// Effect Creation
// ============================================

/**
 * Creates an effect object.
 * Does not attach it to any fiber — use pushEffectToFiber for that.
 */
export function createEffect(
	tag: HookEffectTag,
	create: EffectCreate,
	destroy: (() => void) | undefined,
	deps: readonly unknown[] | null,
): Effect {
	const effect: Effect = {
		tag,
		create,
		destroy,
		deps,
		next: null,
	};

	return effect;
}

/**
 * Adds an effect to a fiber's update queue.
 * Maintains a circular linked list of effects.
 */
export function createEffectToFiber(fiber: Fiber, effect: Effect): void {
	let componentUpdateQueue =
		fiber.updateQueue as FunctionComponentUpdateQueue | null;

	if (componentUpdateQueue === null) {
		componentUpdateQueue = createFunctionComponentUpdateQueue();
		fiber.updateQueue = componentUpdateQueue as unknown as Fiber["updateQueue"];
		componentUpdateQueue.lastEffect = effect.next = effect;
	} else {
		const lastEffect = componentUpdateQueue.lastEffect;
		if (lastEffect === null) {
			componentUpdateQueue.lastEffect = effect.next = effect;
		} else {
			const firstEffect = lastEffect.next;
			lastEffect.next = effect;
			effect.next = firstEffect;
			componentUpdateQueue.lastEffect = effect;
		}
	}
}

/**
 * Creates an empty function component update queue.
 */
function createFunctionComponentUpdateQueue(): FunctionComponentUpdateQueue {
	return {
		lastEffect: null,
	};
}

// ============================================
// Effect Collection
// ============================================

/**
 * Result of collecting effects from a finished work tree.
 */
export type CollectedEffects = {
	passiveEffects: EffectInstance[];
	layoutEffects: EffectInstance[];
	/** Cleanup-only effects from unmounted components (run destroy but not create) */
	passiveCleanups: EffectInstance[];
	layoutCleanups: EffectInstance[];
};

/**
 * An effect instance with its associated fiber.
 */
export type EffectInstance = {
	fiber: Fiber;
	effect: Effect;
};

/**
 * Collects all effects from the finished work tree.
 * Separates effects into passive (useEffect) and layout (useLayoutEffect).
 */
export function collectEffects(finishedWork: Fiber): CollectedEffects {
	const passiveEffects: EffectInstance[] = [];
	const layoutEffects: EffectInstance[] = [];

	// Traverse the fiber tree and collect effects
	collectEffectsFromFiber(finishedWork, passiveEffects, layoutEffects);

	return {
		passiveEffects,
		layoutEffects,
		passiveCleanups: [],
		layoutCleanups: [],
	};
}

/**
 * Collects effects from both old and new trees for proper cleanup.
 * Effects from old tree need cleanup (if fiber no longer has effects),
 * effects from new tree need to run.
 */
export function collectEffectsWithCleanup(
	finishedWork: Fiber,
	previousCurrent: Fiber,
): CollectedEffects {
	// Collect effects from new tree (for create functions)
	// These already have destroy copied from old effects when deps change
	const newPassiveEffects: EffectInstance[] = [];
	const newLayoutEffects: EffectInstance[] = [];
	collectEffectsFromFiber(finishedWork, newPassiveEffects, newLayoutEffects);

	// Collect cleanup effects from old fibers that no longer have effects
	// (component returned early without calling hooks, or component deleted)
	const cleanupPassiveEffects: EffectInstance[] = [];
	const cleanupLayoutEffects: EffectInstance[] = [];
	collectOrphanedEffects(
		previousCurrent,
		finishedWork,
		cleanupPassiveEffects,
		cleanupLayoutEffects,
	);

	return {
		passiveEffects: newPassiveEffects,
		layoutEffects: newLayoutEffects,
		passiveCleanups: cleanupPassiveEffects,
		layoutCleanups: cleanupLayoutEffects,
	};
}

/**
 * Collects effects from old tree fibers that don't have matching effects
 * in the new tree (orphaned effects that need cleanup).
 */
function collectOrphanedEffects(
	oldFiber: Fiber,
	newFiber: Fiber | null,
	passiveEffects: EffectInstance[],
	layoutEffects: EffectInstance[],
): void {
	// Check if this fiber is a function component with effects
	if (oldFiber.tag === WorkTag.FunctionComponent) {
		const oldUpdateQueue =
			oldFiber.updateQueue as FunctionComponentUpdateQueue | null;

		// Check if new fiber has effects
		const newUpdateQueue =
			newFiber?.tag === WorkTag.FunctionComponent
				? (newFiber.updateQueue as FunctionComponentUpdateQueue | null)
				: null;
		const newHasEffects =
			newUpdateQueue !== null && newUpdateQueue.lastEffect !== null;

		// If old has effects but new doesn't, collect for cleanup
		if (
			oldUpdateQueue !== null &&
			oldUpdateQueue.lastEffect !== null &&
			!newHasEffects
		) {
			const lastEffect = oldUpdateQueue.lastEffect;
			const firstEffect = lastEffect.next;

			if (firstEffect !== null) {
				let effect: Effect | null = firstEffect;

				do {
					if (effect.destroy !== undefined) {
						const instance: EffectInstance = { fiber: oldFiber, effect };

						if ((effect.tag & HookEffectTag.Passive) !== 0) {
							passiveEffects.push(instance);
						} else if ((effect.tag & HookEffectTag.Layout) !== 0) {
							layoutEffects.push(instance);
						}
					}

					effect = effect.next;
				} while (effect !== null && effect !== firstEffect);
			}
		}
	}

	// Recurse into children, matching old and new child fibers
	let oldChild = oldFiber.child;
	let newChild = newFiber?.child ?? null;

	while (oldChild !== null) {
		// Try to find matching new child (by alternate relationship)
		let matchingNewChild: Fiber | null = null;
		if (newChild !== null) {
			// Check if this is the matching fiber (via alternate)
			if (newChild.alternate === oldChild || oldChild.alternate === newChild) {
				matchingNewChild = newChild;
				newChild = newChild.sibling;
			} else {
				// Try to find a match in remaining siblings
				let searchNew: Fiber | null = newChild;
				while (searchNew !== null) {
					if (
						searchNew.alternate === oldChild ||
						oldChild.alternate === searchNew
					) {
						matchingNewChild = searchNew;
						break;
					}
					searchNew = searchNew.sibling;
				}
			}
		}

		collectOrphanedEffects(
			oldChild,
			matchingNewChild,
			passiveEffects,
			layoutEffects,
		);
		oldChild = oldChild.sibling;
	}
}

/**
 * Recursively collects effects from a fiber and its descendants.
 */
function collectEffectsFromFiber(
	fiber: Fiber,
	passiveEffects: EffectInstance[],
	layoutEffects: EffectInstance[],
): void {
	// Only function components can have effects
	if (fiber.tag === WorkTag.FunctionComponent) {
		const updateQueue =
			fiber.updateQueue as FunctionComponentUpdateQueue | null;

		if (updateQueue !== null && updateQueue.lastEffect !== null) {
			const lastEffect = updateQueue.lastEffect;
			const firstEffect = lastEffect.next;

			if (firstEffect !== null) {
				let effect: Effect | null = firstEffect;

				do {
					// Only collect effects that need to run
					if ((effect.tag & HookEffectTag.HasEffect) !== 0) {
						const instance: EffectInstance = { fiber, effect };

						if ((effect.tag & HookEffectTag.Passive) !== 0) {
							passiveEffects.push(instance);
						} else if ((effect.tag & HookEffectTag.Layout) !== 0) {
							layoutEffects.push(instance);
						}
					}

					effect = effect.next;
				} while (effect !== null && effect !== firstEffect);
			}
		}
	}

	// Recurse into children
	let child = fiber.child;
	while (child !== null) {
		collectEffectsFromFiber(child, passiveEffects, layoutEffects);
		child = child.sibling;
	}
}

// ============================================
// Effect Execution
// ============================================

/**
 * Runs all passive effect cleanups.
 */
export function runPassiveEffectCleanups(effects: EffectInstance[]): void {
	for (const { effect } of effects) {
		const destroy = effect.destroy;
		if (destroy !== undefined) {
			try {
				destroy();
			} catch (error) {
				console.error("Error in passive effect cleanup:", error);
			}
		}
	}
}

/**
 * Runs all passive effect creates.
 */
export function runPassiveEffectCreates(effects: EffectInstance[]): void {
	for (const { effect } of effects) {
		try {
			const destroy = effect.create();
			effect.destroy = typeof destroy === "function" ? destroy : undefined;
		} catch (error) {
			console.error("Error in passive effect:", error);
		}
	}
}

/**
 * Runs all layout effect cleanups synchronously.
 */
export function runLayoutEffectCleanups(effects: EffectInstance[]): void {
	for (const { effect } of effects) {
		const destroy = effect.destroy;
		if (destroy !== undefined) {
			try {
				destroy();
			} catch (error) {
				console.error("Error in layout effect cleanup:", error);
			}
		}
	}
}

/**
 * Runs all layout effect creates synchronously.
 */
export function runLayoutEffectCreates(effects: EffectInstance[]): void {
	for (const { effect } of effects) {
		try {
			const destroy = effect.create();
			effect.destroy = typeof destroy === "function" ? destroy : undefined;
		} catch (error) {
			console.error("Error in layout effect:", error);
		}
	}
}

// ============================================
// Effect Dependencies
// ============================================

/**
 * Checks if effect dependencies have changed.
 */
export function areHookInputsEqual(
	nextDeps: readonly unknown[] | null,
	prevDeps: readonly unknown[] | null,
): boolean {
	if (prevDeps === null || nextDeps === null) {
		return false;
	}

	if (prevDeps.length !== nextDeps.length) {
		return false;
	}

	for (let i = 0; i < prevDeps.length; i++) {
		if (Object.is(nextDeps[i], prevDeps[i])) {
			continue;
		}
		return false;
	}

	return true;
}

// ============================================
// Deletion Effects
// ============================================

/**
 * Collects effects from fibers that are being deleted.
 * These effects need their cleanup functions called.
 */
export function collectDeletionEffects(
	deletions: Fiber[] | null,
): EffectInstance[] {
	if (deletions === null) {
		return [];
	}

	const effects: EffectInstance[] = [];

	for (const fiber of deletions) {
		collectEffectsForDeletion(fiber, effects);
	}

	return effects;
}

/**
 * Recursively collects effects from a deleted fiber tree.
 */
function collectEffectsForDeletion(
	fiber: Fiber,
	effects: EffectInstance[],
): void {
	// Only function components can have effects
	if (fiber.tag === WorkTag.FunctionComponent) {
		const updateQueue =
			fiber.updateQueue as FunctionComponentUpdateQueue | null;

		if (updateQueue !== null && updateQueue.lastEffect !== null) {
			const lastEffect = updateQueue.lastEffect;
			const firstEffect = lastEffect.next;

			if (firstEffect !== null) {
				let effect: Effect | null = firstEffect;

				do {
					// Collect all effects that have destroy functions
					if (effect.destroy !== undefined) {
						effects.push({ fiber, effect });
					}

					effect = effect.next;
				} while (effect !== null && effect !== firstEffect);
			}
		}
	}

	// Recurse into children
	let child = fiber.child;
	while (child !== null) {
		collectEffectsForDeletion(child, effects);
		child = child.sibling;
	}
}

// ============================================
// Effect Flags
// ============================================

/**
 * Marks a fiber as having passive effects.
 */
export function markFiberWithPassiveEffect(fiber: Fiber): void {
	fiber.flags = flagsOr(fiber.flags, Passive);

	// Bubble up to root
	let parent = fiber.return;
	while (parent !== null) {
		parent.subtreeFlags = flagsOr(parent.subtreeFlags, Passive);
		parent = parent.return;
	}
}

/**
 * Checks if a fiber tree has passive effects.
 */
export function doesFiberHavePassiveEffects(fiber: Fiber): boolean {
	return (
		flagsIncludes(fiber.flags, Passive) ||
		flagsIncludes(fiber.subtreeFlags, Passive)
	);
}

// ============================================
// Passive Effect Scheduling
// ============================================

let pendingPassiveEffects: CollectedEffects | null = null;
let passiveEffectCallbackScheduled = false;

/**
 * Schedules passive effects to run asynchronously.
 */
export function schedulePassiveEffects(effects: CollectedEffects): void {
	pendingPassiveEffects = effects;

	if (!passiveEffectCallbackScheduled) {
		passiveEffectCallbackScheduled = true;
		scheduleCallback(flushPassiveEffects);
	}
}

/**
 * Flushes all pending passive effects.
 */
export function flushPassiveEffects(): boolean {
	if (pendingPassiveEffects === null) {
		return false;
	}

	const effects = pendingPassiveEffects;
	pendingPassiveEffects = null;
	passiveEffectCallbackScheduled = false;

	// First, run cleanups from orphaned/unmounted components (destroy only, no create)
	runPassiveEffectCleanups(effects.passiveCleanups);

	// Then run cleanups from active effects (deps changed)
	runPassiveEffectCleanups(effects.passiveEffects);

	// Finally, run creates for active effects only (not orphaned ones)
	runPassiveEffectCreates(effects.passiveEffects);

	return true;
}

/**
 * Schedules a callback to run asynchronously.
 * Uses MessageChannel for better timing than setTimeout.
 */
function scheduleCallback(callback: () => void): void {
	if (typeof MessageChannel !== "undefined") {
		const channel = new MessageChannel();
		channel.port1.onmessage = () => {
			callback();
		};
		channel.port2.postMessage(null);
	} else {
		// Fallback to setTimeout for macrotask timing (passive effects should run after paint)
		setTimeout(callback, 0);
	}
}
