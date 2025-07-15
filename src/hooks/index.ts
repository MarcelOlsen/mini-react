/* *********** */
/* Hooks API   */
/* *********** */

import { findRootContainer, getRootElement, render } from "../core";
import type { VDOMInstance } from "../core/types";
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

// Hook state management
let currentRenderInstance: VDOMInstance | null = null;

// Effect queue management
const effectQueue: (() => void)[] = [];
let isFlushingEffects = false;

/**
 * Sets the current render instance for hooks
 * @param instance The current VDOM instance
 */
export function setHookContext(instance: VDOMInstance | null): void {
	currentRenderInstance = instance;
	// Reset hookCursor to 0 at the beginning of each component's render
	if (instance) {
		instance.hookCursor = 0;
	}
}

/**
 * Schedules an effect to be run after the current render
 */
export function scheduleEffect(effectFn: () => void): void {
	effectQueue.push(effectFn);

	if (!isFlushingEffects) {
		queueMicrotask(flushEffects);
	}
}

/**
 * Flushes all queued effects
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
 * Gets the effect queue for external access
 */
export function getEffectQueue(): (() => void)[] {
	return effectQueue;
}

/**
 * useState hook implementation
 * @param initialState The initial state value or function that returns initial state
 * @returns A tuple with current state and setState function
 */
export function useState<T>(initialState: T | (() => T)): UseStateHook<T> {
	if (!currentRenderInstance) {
		throw new Error("useState must be called inside a functional component");
	}

	// Capture the current instance at hook creation time
	const hookInstance = currentRenderInstance;

	// Ensure hooks array exists
	if (!hookInstance.hooks) {
		hookInstance.hooks = [];
	}

	const hooks = hookInstance.hooks;
	const currentHookIndex = hookInstance.hookCursor ?? 0;
	hookInstance.hookCursor = currentHookIndex + 1;

	// Initialize hook if it doesn't exist
	if (hooks.length <= currentHookIndex) {
		const initialStateValue =
			typeof initialState === "function"
				? (initialState as () => T)()
				: initialState;

		const stateHook: StateHook<T> = {
			type: "state",
			state: initialStateValue,
			setState: () => {}, // Will be set below
		};

		(hooks as StateOrEffectHook<T>[]).push(stateHook);
	}

	const hook = hooks[currentHookIndex] as StateHook<T>;

	// Create setState function with closure over hook and container
	const setState = (newState: T | ((prevState: T) => T)) => {
		const nextState =
			typeof newState === "function"
				? (newState as (prevState: T) => T)(hook.state as T)
				: newState;

		// Only update if state actually changed
		if (nextState !== hook.state) {
			hook.state = nextState;

			// Find the root container for this instance and trigger re-render
			const container = findRootContainer(hookInstance);
			if (container) {
				// Use the original root element for re-render instead of stale element from instance
				const rootElement = getRootElement(container);
				if (rootElement) {
					render(rootElement, container);
				} else {
					console.warn(
						"No root element found for container, skipping re-render",
					);
				}
			} else {
				console.warn(
					"No root container found for hook instance, skipping re-render",
				);
			}
		}
	};

	// Update the setState function reference
	hook.setState = setState;

	return [hook.state as T, setState];
}

/**
 * useEffect hook implementation
 * @param callback Effect callback function that may return a cleanup function
 * @param dependencies Optional dependency array
 */
export function useEffect(
	callback: EffectCallback,
	dependencies?: DependencyList,
): void {
	if (!currentRenderInstance) {
		throw new Error("useEffect must be called inside a functional component");
	}

	// Capture the current instance at hook creation time
	const hookInstance = currentRenderInstance;

	// Ensure hooks array exists
	if (!hookInstance.hooks) {
		hookInstance.hooks = [];
	}

	const hooks = hookInstance.hooks;
	const currentHookIndex = hookInstance.hookCursor ?? 0;
	hookInstance.hookCursor = currentHookIndex + 1;

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
	const dependenciesChanged =
		dependencies === undefined ||
		prevDependencies === undefined ||
		dependencies.length !== prevDependencies.length ||
		dependencies.some((dep, index) => !Object.is(dep, prevDependencies[index]));

	// Update hook data
	hook.callback = callback;
	hook.dependencies = dependencies;

	// Schedule effect if dependencies changed or it's the first run
	if (!hook.hasRun || dependenciesChanged) {
		scheduleEffect(() => {
			// Run cleanup from previous effect if it exists
			if (hook.cleanup) {
				try {
					hook.cleanup();
				} catch (error) {
					console.error("Error in useEffect cleanup:", error);
				}
				hook.cleanup = undefined;
			}

			// Run the effect
			try {
				const cleanupFunction = hook.callback();
				if (typeof cleanupFunction === "function") {
					hook.cleanup = cleanupFunction;
				}
			} catch (error) {
				console.error("Error in useEffect callback:", error);
			}

			hook.hasRun = true;
		});
	}
}

/**
 * useReducer hook implementation
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
	if (!currentRenderInstance) {
		throw new Error("useReducer must be called inside a functional component");
	}

	// Capture the current instance at hook creation time
	const hookInstance = currentRenderInstance;

	// Ensure hooks array exists
	if (!hookInstance.hooks) {
		hookInstance.hooks = [];
	}

	const hooks = hookInstance.hooks;
	const currentHookIndex = hookInstance.hookCursor ?? 0;
	hookInstance.hookCursor = currentHookIndex + 1;

	// Initialize hook if it doesn't exist
	if (hooks.length <= currentHookIndex) {
		// Calculate initial state based on whether init function is provided
		const initialState = init
			? init(initialArg as Init)
			: (initialArg as State);

		const reducerHook: ReducerHook<State, Action> = {
			type: "reducer",
			state: initialState,
			reducer,
			dispatch: () => {}, // Will be set below
		};

		hooks.push(reducerHook as StateOrEffectHook<unknown>);
	}

	const hook = hooks[currentHookIndex] as ReducerHook<State, Action>;

	// Update reducer in case it changed between renders
	hook.reducer = reducer;

	// Create dispatch function with closure over hook and container
	const dispatch = (action: Action) => {
		const nextState = hook.reducer(hook.state, action);

		// Only update if state actually changed
		if (nextState !== hook.state) {
			hook.state = nextState;

			// Find the root container for this instance and trigger re-render
			const container = findRootContainer(hookInstance);
			if (container) {
				// Use the original root element for re-render instead of stale element from instance
				const rootElement = getRootElement(container);
				if (rootElement) {
					render(rootElement, container);
				} else {
					console.warn(
						"No root element found for container, skipping re-render",
					);
				}
			} else {
				console.warn(
					"No root container found for hook instance, skipping re-render",
				);
			}
		}
	};

	// Update the dispatch function reference
	hook.dispatch = dispatch;

	return [hook.state, dispatch];
}

/**
 * useRef hook implementation
 * @param initialValue The initial value to set on the ref object
 * @returns A mutable ref object with a current property
 */
export function useRef<T>(initialValue: T): MutableRefObject<T> {
	if (!currentRenderInstance) {
		throw new Error("useRef must be called inside a functional component");
	}

	// Capture the current instance at hook creation time
	const hookInstance = currentRenderInstance;

	// Ensure hooks array exists
	if (!hookInstance.hooks) {
		hookInstance.hooks = [];
	}

	const hooks = hookInstance.hooks;
	const currentHookIndex = hookInstance.hookCursor ?? 0;
	hookInstance.hookCursor = currentHookIndex + 1;

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
	// This ensures mutations to .current directly modify the hook's state
	return hook as MutableRefObject<T>;
}

/**
 * useMemo hook implementation
 * @param factory Function that returns the memoized value
 * @param dependencies Optional dependency array
 * @returns The memoized value
 */
export function useMemo<T>(factory: () => T, dependencies?: DependencyList): T {
	if (!currentRenderInstance) {
		throw new Error("useMemo must be called inside a functional component");
	}

	// Capture the current instance at hook creation time
	const hookInstance = currentRenderInstance;

	// Ensure hooks array exists
	if (!hookInstance.hooks) {
		hookInstance.hooks = [];
	}

	const hooks = hookInstance.hooks;
	const currentHookIndex = hookInstance.hookCursor ?? 0;
	hookInstance.hookCursor = currentHookIndex + 1;

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
	const dependenciesChanged =
		dependencies === undefined ||
		prevDependencies === undefined ||
		dependencies.length !== prevDependencies.length ||
		dependencies.some((dep, index) => !Object.is(dep, prevDependencies[index]));

	// Recompute value if dependencies changed or it's the first computation
	if (!hook.hasComputed || dependenciesChanged) {
		hook.value = factory();
		hook.dependencies = dependencies;
		hook.hasComputed = true;
	}

	return hook.value;
}

/**
 * useCallback hook implementation
 * @param callback The callback function to memoize
 * @param dependencies Optional dependency array
 * @returns The memoized callback function
 */
export function useCallback<T extends (...args: unknown[]) => unknown>(
	callback: T,
	dependencies?: DependencyList,
): T {
	if (!currentRenderInstance) {
		throw new Error("useCallback must be called inside a functional component");
	}

	// Capture the current instance at hook creation time
	const hookInstance = currentRenderInstance;

	// Ensure hooks array exists
	if (!hookInstance.hooks) {
		hookInstance.hooks = [];
	}

	const hooks = hookInstance.hooks;
	const currentHookIndex = hookInstance.hookCursor ?? 0;
	hookInstance.hookCursor = currentHookIndex + 1;

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
	const dependenciesChanged =
		dependencies === undefined ||
		prevDependencies === undefined ||
		dependencies.length !== prevDependencies.length ||
		dependencies.some((dep, index) => !Object.is(dep, prevDependencies[index]));

	// Update callback if dependencies changed
	if (dependenciesChanged) {
		hook.callback = callback;
		hook.dependencies = dependencies;
	}

	return hook.callback;
}
