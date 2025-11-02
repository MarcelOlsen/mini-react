/**
 * Fiber-based Hooks Implementation
 *
 * This module implements React hooks using the Fiber architecture.
 * All hooks work by storing state on the current rendering fiber
 * and triggering updates through the Fiber work loop.
 */

import {
	areDepsEqual,
	createUpdateQueue,
	dispatchReducerAction,
	dispatchSetState,
	getCurrentRenderingFiber,
	processReducerQueue,
	processUpdateQueue,
} from "../fiber/fiberHooks";

/**
 * Effect queue for backward compatibility
 *
 * In the old implementation, effects were scheduled via microtask.
 * In Fiber, effects run during commit phase.
 * This queue is kept for backward compatibility but will be deprecated.
 */
const effectQueue: (() => void)[] = [];
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
import type { UpdateQueue } from "../fiber/types";
import type {
	CallbackHook,
	DependencyList,
	EffectCallback,
	EffectHook,
	MemoHook,
	MutableRefObject,
	Reducer,
	ReducerHook,
	RefHook,
	StateHook,
	StateOrEffectHook,
	UseStateHook,
} from "./types";

/**
 * useState hook implementation
 *
 * @param initialState The initial state value or function that returns initial state
 * @returns A tuple with current state and setState function
 */
export function useState<T>(initialState: T | (() => T)): UseStateHook<T> {
	const fiber = getCurrentRenderingFiber();

	if (!fiber) {
		throw new Error("useState must be called inside a functional component");
	}

	// Ensure hooks array exists
	if (!fiber.hooks) {
		fiber.hooks = [];
	}

	const hooks = fiber.hooks;
	const currentHookIndex = fiber.hookCursor;
	fiber.hookCursor = currentHookIndex + 1;

	// Initialize hook if it doesn't exist
	if (hooks.length <= currentHookIndex) {
		// Compute initial state
		const initialStateValue =
			typeof initialState === "function"
				? (initialState as () => T)()
				: initialState;

		// Create update queue for this hook
		const queue = createUpdateQueue<T>(initialStateValue);

		const stateHook: StateHook<T> = {
			type: "state",
			state: initialStateValue,
			queue: queue as UpdateQueue<T>,
			setState: () => {}, // Will be set below
		};

		hooks.push(stateHook as StateOrEffectHook<unknown>);
	}

	const hook = hooks[currentHookIndex] as StateHook<T>;

	// Process any pending updates
	if (hook.queue?.pending) {
		const newState = processUpdateQueue(hook.queue as UpdateQueue<T>);
		hook.state = newState;
	}

	// Create setState function with closure over fiber and queue
	const queue = hook.queue as UpdateQueue<T>;
	const setState = (newState: T | ((prevState: T) => T)) => {
		// Dispatch state update to fiber
		dispatchSetState(fiber, queue, newState);
	};

	// Update the setState function reference
	hook.setState = setState;

	return [hook.state as T, setState];
}

/**
 * useReducer hook implementation
 *
 * @param reducer The reducer function that takes state and action and returns new state
 * @param initialArg The initial state or argument for lazy initialization
 * @param init Optional lazy initialization function
 * @returns A tuple with current state and dispatch function
 */
export function useReducer<State, Action>(
	reducer: Reducer<State, Action>,
	initialArg: State,
): [State, (action: Action) => void];
export function useReducer<State, Action, Init>(
	reducer: Reducer<State, Action>,
	initialArg: Init,
	init: (arg: Init) => State,
): [State, (action: Action) => void];
export function useReducer<State, Action, Init>(
	reducer: Reducer<State, Action>,
	initialArg: State | Init,
	init?: (arg: Init) => State,
): [State, (action: Action) => void] {
	const fiber = getCurrentRenderingFiber();

	if (!fiber) {
		throw new Error("useReducer must be called inside a functional component");
	}

	// Ensure hooks array exists
	if (!fiber.hooks) {
		fiber.hooks = [];
	}

	const hooks = fiber.hooks;
	const currentHookIndex = fiber.hookCursor;
	fiber.hookCursor = currentHookIndex + 1;

	// Initialize hook if it doesn't exist
	if (hooks.length <= currentHookIndex) {
		// Calculate initial state
		const initialState = init
			? init(initialArg as Init)
			: (initialArg as State);

		// Create update queue
		const queue = createUpdateQueue<State>(initialState);

		const reducerHook: ReducerHook<State, Action> = {
			type: "reducer",
			state: initialState,
			reducer,
			queue: queue as UpdateQueue<State>,
			dispatch: () => {}, // Will be set below
		};

		hooks.push(reducerHook as StateOrEffectHook<unknown>);
	}

	const hook = hooks[currentHookIndex] as ReducerHook<State, Action>;

	// Update reducer in case it changed
	hook.reducer = reducer;

	// Process any pending updates
	if (hook.queue?.pending) {
		const newState = processReducerQueue(
			hook.queue as UpdateQueue<State>,
			reducer,
		);
		hook.state = newState;
	}

	// Create dispatch function with closure over fiber, queue, and reducer
	const queue = hook.queue as UpdateQueue<State>;
	const dispatch = (action: Action) => {
		// Dispatch reducer action to fiber with reducer for optimization
		dispatchReducerAction(fiber, queue, action, reducer);
	};

	// Update the dispatch function reference
	hook.dispatch = dispatch;

	return [hook.state, dispatch];
}

/**
 * useEffect hook implementation
 *
 * @param callback Effect callback function that may return a cleanup function
 * @param dependencies Optional dependency array
 */
export function useEffect(
	callback: EffectCallback,
	dependencies?: DependencyList,
): void {
	const fiber = getCurrentRenderingFiber();

	if (!fiber) {
		throw new Error("useEffect must be called inside a functional component");
	}

	// Ensure hooks array exists
	if (!fiber.hooks) {
		fiber.hooks = [];
	}

	const hooks = fiber.hooks;
	const currentHookIndex = fiber.hookCursor;
	fiber.hookCursor = currentHookIndex + 1;

	// Initialize hook if it doesn't exist
	if (hooks.length <= currentHookIndex) {
		const effectHook: EffectHook = {
			type: "effect",
			callback,
			dependencies,
			hasRun: false,
		};
		hooks.push(effectHook);
	}

	const hook = hooks[currentHookIndex] as EffectHook;
	const prevDependencies = hook.dependencies;

	// Check if dependencies have changed
	const depsEqual = areDepsEqual(prevDependencies, dependencies);

	// Update hook data
	hook.callback = callback;
	hook.dependencies = dependencies;

	// Mark effect as needing to run if dependencies changed
	if (!hook.hasRun || !depsEqual) {
		hook.needsRun = true;
	}
}

/**
 * useRef hook implementation
 *
 * @param initialValue The initial value to set on the ref object
 * @returns A mutable ref object with a current property
 */
export function useRef<T>(initialValue: T): MutableRefObject<T> {
	const fiber = getCurrentRenderingFiber();

	if (!fiber) {
		throw new Error("useRef must be called inside a functional component");
	}

	// Ensure hooks array exists
	if (!fiber.hooks) {
		fiber.hooks = [];
	}

	const hooks = fiber.hooks;
	const currentHookIndex = fiber.hookCursor;
	fiber.hookCursor = currentHookIndex + 1;

	// Initialize hook if it doesn't exist
	if (hooks.length <= currentHookIndex) {
		const refHook: RefHook<T> = {
			type: "ref",
			current: initialValue,
		};

		hooks.push(refHook as StateOrEffectHook<unknown>);
	}

	const hook = hooks[currentHookIndex] as RefHook<T>;

	// Return a reference to the hook itself as the mutable ref object
	return hook as MutableRefObject<T>;
}

/**
 * useMemo hook implementation
 *
 * @param factory Function that returns the memoized value
 * @param dependencies Optional dependency array
 * @returns The memoized value
 */
export function useMemo<T>(factory: () => T, dependencies?: DependencyList): T {
	const fiber = getCurrentRenderingFiber();

	if (!fiber) {
		throw new Error("useMemo must be called inside a functional component");
	}

	// Ensure hooks array exists
	if (!fiber.hooks) {
		fiber.hooks = [];
	}

	const hooks = fiber.hooks;
	const currentHookIndex = fiber.hookCursor;
	fiber.hookCursor = currentHookIndex + 1;

	// Initialize hook if it doesn't exist
	if (hooks.length <= currentHookIndex) {
		const memoHook: MemoHook<T> = {
			type: "memo",
			value: factory(),
			dependencies,
			hasComputed: true,
		};

		hooks.push(memoHook as StateOrEffectHook<unknown>);
		return memoHook.value;
	}

	const hook = hooks[currentHookIndex] as MemoHook<T>;
	const prevDependencies = hook.dependencies;

	// Check if dependencies have changed
	const depsEqual = areDepsEqual(prevDependencies, dependencies);

	// Recompute value if dependencies changed
	if (!hook.hasComputed || !depsEqual) {
		hook.value = factory();
		hook.dependencies = dependencies;
		hook.hasComputed = true;
	}

	return hook.value;
}

/**
 * useCallback hook implementation
 *
 * @param callback The callback function to memoize
 * @param dependencies Optional dependency array
 * @returns The memoized callback function
 */
export function useCallback<T extends (...args: unknown[]) => unknown>(
	callback: T,
	dependencies?: DependencyList,
): T {
	const fiber = getCurrentRenderingFiber();

	if (!fiber) {
		throw new Error("useCallback must be called inside a functional component");
	}

	// Ensure hooks array exists
	if (!fiber.hooks) {
		fiber.hooks = [];
	}

	const hooks = fiber.hooks;
	const currentHookIndex = fiber.hookCursor;
	fiber.hookCursor = currentHookIndex + 1;

	// Initialize hook if it doesn't exist
	if (hooks.length <= currentHookIndex) {
		const callbackHook: CallbackHook<T> = {
			type: "callback",
			callback,
			dependencies,
		};

		hooks.push(callbackHook as StateOrEffectHook<unknown>);
		return callbackHook.callback;
	}

	const hook = hooks[currentHookIndex] as CallbackHook<T>;
	const prevDependencies = hook.dependencies;

	// Check if dependencies have changed
	const depsEqual = areDepsEqual(prevDependencies, dependencies);

	// Update callback if dependencies changed
	if (!depsEqual) {
		hook.callback = callback;
		hook.dependencies = dependencies;
	}

	return hook.callback;
}
