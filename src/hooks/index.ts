/* *********** */
/* Hooks API   */
/* *********** */

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

// Re-export legacy scheduler functions for backward compatibility
export {
	scheduleEffect,
	getEffectQueue,
	resetEffectQueueForTests,
} from "./legacyScheduler";

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

		// Create stable setState function once during initialization
		// Capture the fiber reference at creation time
		const capturedFiber = fiber;
		const setState = (newState: T | ((prevState: T) => T)) => {
			dispatchSetState(capturedFiber, queue as UpdateQueue<T>, newState);
		};

		const stateHook: StateHook<T> = {
			type: "state",
			state: initialStateValue,
			queue: queue as UpdateQueue<T>,
			setState: setState,
		};

		hooks.push(stateHook as StateOrEffectHook<unknown>);
	}

	const hook = hooks[currentHookIndex] as StateHook<T>;

	// Process any pending updates
	if (hook.queue?.pending) {
		const newState = processUpdateQueue(hook.queue as UpdateQueue<T>);
		hook.state = newState;
	}

	// Return the stable setState reference from the hook
	return [hook.state as T, hook.setState];
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

		// Create stable dispatch function once during initialization
		// Capture fiber reference and read reducer from the mutable hook object
		const capturedFiber = fiber;
		const dispatch = (action: Action) => {
			const currentHook = hooks[currentHookIndex] as ReducerHook<State, Action>;
			dispatchReducerAction(
				capturedFiber,
				queue as UpdateQueue<State>,
				action,
				currentHook.reducer,
			);
		};

		const reducerHook: ReducerHook<State, Action> = {
			type: "reducer",
			state: initialState,
			reducer,
			queue: queue as UpdateQueue<State>,
			dispatch: dispatch,
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

	// Return the stable dispatch reference from the hook
	return [hook.state, hook.dispatch];
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

// Re-export hook types
export type {
	StateHook,
	EffectHook,
	ContextHook,
	ReducerHook,
	RefHook,
	MemoHook,
	CallbackHook,
	StateOrEffectHook,
	UseStateHook,
	EffectCallback,
	DependencyList,
	UseEffectHook,
	Reducer,
	ReducerStateWithoutAction,
	ReducerActionWithoutState,
	UseReducerHook,
	MutableRefObject,
	UseRefHook,
} from "./types";

// Export hook context management (used by beginWork)
export {
	setCurrentRenderingFiber,
	getCurrentRenderingFiber,
	setCurrentRenderingFiber as setHookContext, // Backward compatibility alias
} from "../fiber/fiberHooks";
