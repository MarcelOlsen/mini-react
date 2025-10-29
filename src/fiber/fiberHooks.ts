/**
 * Fiber Hooks - Hook Integration with Fiber Architecture
 *
 * This module manages hook state and updates within the Fiber architecture.
 * It provides the bridge between React's hook API and Fiber's reconciliation.
 *
 * Key responsibilities:
 * 1. Track current rendering fiber for hook calls
 * 2. Manage hook update queues
 * 3. Dispatch state updates to Fiber work loop
 * 4. Process update queues during reconciliation
 */

import type { Fiber, Update, UpdateQueue } from "./types";
import { scheduleUpdateOnFiber } from "./workLoop";

/**
 * The fiber currently being rendered
 * Set by beginWork before calling component function
 * Cleared after component returns
 *
 * This allows hooks to know which fiber they belong to
 */
let currentRenderingFiber: Fiber | null = null;

/**
 * Set the current rendering fiber
 *
 * Called by beginWork before rendering a functional component
 * and cleared after the component returns.
 *
 * @param fiber The fiber being rendered (or null to clear)
 */
export function setCurrentRenderingFiber(fiber: Fiber | null): void {
	currentRenderingFiber = fiber;
	if (fiber) {
		// Reset hook cursor at the start of each render
		fiber.hookCursor = 0;
	}
}

/**
 * Get the current rendering fiber
 *
 * Used by hooks to access the fiber they belong to
 *
 * @returns The current rendering fiber, or null if not rendering
 */
export function getCurrentRenderingFiber(): Fiber | null {
	return currentRenderingFiber;
}

/**
 * Create an update queue for a hook
 *
 * Update queues manage pending state updates and ensure they're
 * processed in the correct order during reconciliation.
 *
 * @param initialState The initial state value
 * @returns A new update queue
 */
export function createUpdateQueue<T>(initialState: T): UpdateQueue<T> {
	return {
		pending: null,
		lastRenderedState: initialState,
		lastRenderedReducer: (state: T, action: T | ((prev: T) => T)) =>
			typeof action === "function" ? (action as (prev: T) => T)(state) : action,
		baseState: initialState,
		firstBaseUpdate: null,
		lastBaseUpdate: null,
	};
}

/**
 * Add an update to a queue
 *
 * Updates are stored in a circular linked list for efficient
 * insertion and processing.
 *
 * @param queue The update queue
 * @param update The update to add
 */
export function enqueueUpdate<T>(
	queue: UpdateQueue<T>,
	update: Update<T>,
): void {
	// Create circular linked list
	if (queue.pending === null) {
		// First update - point to self
		update.next = update;
	} else {
		// Insert update into circular list
		update.next = queue.pending.next;
		queue.pending.next = update;
	}
	// pending always points to the last update
	queue.pending = update;
}

/**
 * Dispatch a setState update
 *
 * This is called when user calls setState or dispatch.
 * It creates an update, adds it to the queue, and schedules work.
 *
 * @param fiber The fiber that owns this hook
 * @param queue The update queue for this hook
 * @param action The new state or updater function
 */
export function dispatchSetState<T>(
	fiber: Fiber,
	queue: UpdateQueue<T>,
	action: T | ((prev: T) => T),
): void {
	// Eagerly compute next state to check if it changed
	const currentState = queue.lastRenderedState;
	const nextState =
		typeof action === "function"
			? (action as (prev: T) => T)(currentState)
			: action;

	// Bail out if state didn't change (optimization)
	if (Object.is(nextState, currentState)) {
		return;
	}

	// Create update object
	const update: Update<T | ((prev: T) => T)> = {
		action,
		next: null,
		lane: 1, // Default priority (Phase 15 will use proper lanes)
	};

	// Add to queue
	// @ts-expect-error - Update queue processes both values and functions, TypeScript doesn't understand the union type here
	enqueueUpdate(queue, update);

	// Schedule work on this fiber
	scheduleUpdateOnFiber(fiber);
}

/**
 * Process an update queue during reconciliation
 *
 * This computes the new state by applying all pending updates
 * in order. Called during beginWork for functional components.
 *
 * @param queue The update queue to process
 * @returns The new state after applying all updates
 */
export function processUpdateQueue<T>(queue: UpdateQueue<T>): T {
	let newState = queue.baseState;
	const firstUpdate = queue.pending;

	if (firstUpdate !== null) {
		// Process all updates in the circular list
		const _last = firstUpdate;
		let update: Update<T> | null = firstUpdate.next;

		do {
			const action = update?.action;

			// Apply update
			if (typeof action === "function") {
				// Updater function: newState = action(prevState)
				newState = (action as (prev: T) => T)(newState);
			} else if (action !== undefined) {
				// Direct value: newState = action
				newState = action as T;
			}

			update = update?.next ?? null;
		} while (update !== firstUpdate.next);

		// Clear pending updates
		queue.pending = null;
		queue.baseState = newState;
		queue.lastRenderedState = newState;
	}

	return newState;
}

/**
 * Dispatch a reducer action (for useReducer)
 *
 * Similar to dispatchSetState but uses a reducer function
 * to compute the next state.
 *
 * @param fiber The fiber that owns this hook
 * @param queue The update queue for this hook
 * @param action The action to dispatch
 * @param reducer The reducer function to compute next state
 */
export function dispatchReducerAction<State, Action>(
	fiber: Fiber,
	queue: UpdateQueue<State>,
	action: Action,
	reducer?: (state: State, action: Action) => State,
): void {
	// Eagerly compute next state if reducer provided (for optimization)
	if (reducer) {
		const currentState = queue.lastRenderedState;
		const nextState = reducer(currentState, action);

		// Bail out if state didn't change
		if (Object.is(nextState, currentState)) {
			return;
		}
	}

	// Create update object
	const update: Update<Action> = {
		action,
		next: null,
		lane: 1,
	};

	// Add to queue
	// Cast through unknown since reducer queue stores actions, not state
	enqueueUpdate(queue as unknown as UpdateQueue<Action>, update);

	// Schedule work
	scheduleUpdateOnFiber(fiber);
}

/**
 * Process a reducer queue during reconciliation
 *
 * Applies all pending actions using the reducer function
 *
 * @param queue The update queue
 * @param reducer The reducer function
 * @returns The new state after applying all actions
 */
export function processReducerQueue<State, Action>(
	queue: UpdateQueue<State>,
	reducer: (state: State, action: Action) => State,
): State {
	let newState = queue.baseState;
	const firstUpdate = queue.pending;

	if (firstUpdate !== null) {
		const _last = firstUpdate;
		// Cast through unknown since reducer queue stores actions, not state
		let update: Update<Action> | null =
			firstUpdate.next as unknown as Update<Action>;

		do {
			// Apply action through reducer
			if (update?.action !== undefined) {
				newState = reducer(newState, update.action as Action);
			}
			update = (update?.next as unknown as Update<Action>) ?? null;
		} while (update !== (firstUpdate.next as unknown as Update<Action>));

		// Clear pending updates
		queue.pending = null;
		queue.baseState = newState;
		queue.lastRenderedState = newState;
	}

	// Update the reducer in case it changed
	queue.lastRenderedReducer = reducer as (
		state: State,
		action: State | ((prev: State) => State),
	) => State;

	return newState;
}

/**
 * Check if a hook's dependencies have changed
 *
 * Used by useEffect, useMemo, and useCallback to determine
 * if the hook should re-run.
 *
 * @param prevDeps Previous dependency array
 * @param nextDeps New dependency array
 * @returns true if dependencies changed, false otherwise
 */
export function areDepsEqual(
	prevDeps: readonly unknown[] | undefined,
	nextDeps: readonly unknown[] | undefined,
): boolean {
	// No dependency array = always run
	if (prevDeps === undefined || nextDeps === undefined) {
		return false;
	}

	// Different lengths = changed
	if (prevDeps.length !== nextDeps.length) {
		return false;
	}

	// Check each dependency with Object.is
	for (let i = 0; i < prevDeps.length; i++) {
		if (!Object.is(prevDeps[i], nextDeps[i])) {
			return false;
		}
	}

	return true;
}
