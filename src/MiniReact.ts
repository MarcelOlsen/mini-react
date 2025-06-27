/* ****************** */
/* Core Functionality */
/* ****************** */

import { eventSystem } from "./eventSystem";
import {
	reconcile,
	setContextHooks,
	setHookContext,
	setScheduleEffect,
} from "./reconciler";
import {
	type AnyMiniReactElement,
	type DependencyList,
	type EffectCallback,
	type EffectHook,
	type ElementType,
	FRAGMENT,
	type FunctionalComponent,
	type JSXElementType,
	type MiniReactContext,
	type MutableRefObject,
	PORTAL,
	type PortalElement,
	type Reducer,
	type ReducerHook,
	type RefHook,
	type StateHook,
	type StateOrEffectHook,
	TEXT_ELEMENT,
	type UseStateHook,
	type VDOMInstance,
} from "./types";

// Export event types for external use
export type { SyntheticEvent } from "./eventSystem";
export type { MiniReactContext } from "./types";

/* ******** */
/* Globals  */
/* ******** */

// Store root instances for each container
const rootInstances = new Map<HTMLElement, VDOMInstance | null>();
// Store original root elements for re-rendering
const rootElements = new Map<HTMLElement, AnyMiniReactElement | null>();

// Hook state management
let currentRenderInstance: VDOMInstance | null = null;

// Context system - Track context providers in the render tree
const contextStack: Map<symbol, unknown>[] = [];

// Effect queue management
const effectQueue: (() => void)[] = [];
let isFlushingEffects = false;

// Set the hook context function in the reconciler
setHookContext((instance: VDOMInstance | null) => {
	currentRenderInstance = instance;
	// Reset hookCursor to 0 at the beginning of each component's render
	if (instance) {
		instance.hookCursor = 0;
	}
});

// Set the scheduleEffect function in the reconciler so it can schedule cleanup
setScheduleEffect(scheduleEffect);

// Set the context hooks in the reconciler
setContextHooks(
	(contextValues: Map<symbol, unknown>) => {
		contextStack.push(contextValues);
	},
	() => {
		contextStack.pop();
	},
);

/* *********** */
/* Public APIs */
/* *********** */

/**
 * Creates a MiniReact element (virtual DOM node)
 *
 * @param type The element type (string for host elements, function for components)
 * @param props The element props (can be null)
 * @param children The element children
 * @returns A MiniReact element
 */
export function createElement(
	type: ElementType,
	props: Record<string, unknown> | null,
	...children: (AnyMiniReactElement | string | number | null | undefined)[]
): JSXElementType {
	const normalizedChildren = children
		.flat()
		.filter((child) => child !== null && child !== undefined) // Filter out null/undefined
		.map((child) => {
			// Convert strings and numbers to text elements
			if (typeof child === "string" || typeof child === "number") {
				return {
					type: TEXT_ELEMENT,
					props: {
						nodeValue: child,
						children: [],
					},
				};
			}
			return child;
		});

	return {
		type,
		props: {
			...(props || {}),
			children: normalizedChildren,
		},
	};
}

/**
 * Renders a MiniReact element into a container using the reconciler
 * @param element The element to render (can be null to clear)
 * @param containerNode The container DOM node
 */
export function render(
	element: AnyMiniReactElement | null | undefined,
	containerNode: HTMLElement,
): void {
	// Initialize event system with the container
	eventSystem.initialize(containerNode);

	const newElement = element || null;

	// Get the old instance BEFORE potentially deleting it
	const oldInstance = rootInstances.get(containerNode) || null;

	if (newElement === null) {
		// When unmounting, remove original element from map to prevent memory leaks
		rootElements.delete(containerNode);
	} else {
		// Store the original element for re-renders
		rootElements.set(containerNode, newElement);
	}

	const newInstance = reconcile(containerNode, newElement, oldInstance);

	if (newElement === null) {
		// Ensure container is completely cleared when rendering null
		containerNode.innerHTML = "";
		// Clean up rootInstances after reconciliation
		rootInstances.delete(containerNode);
	} else {
		rootInstances.set(containerNode, newInstance);
	}

	// Flush any scheduled effects after render
	if (effectQueue.length > 0) {
		queueMicrotask(flushEffects);
	}
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
				const rootElement = rootElements.get(container) || null;
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
				const rootElement = rootElements.get(container) || null;
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
 * createContext function - Creates a new context object with default value
 * @param defaultValue The default value for the context
 * @returns A context object with Provider component
 */
export function createContext<T>(defaultValue: T): MiniReactContext<T> {
	const contextId = Symbol("MiniReactContext");

	// Create the final context object that will be returned
	const context: MiniReactContext<T> = {
		_currentValue: defaultValue,
		_defaultValue: defaultValue,
		_contextId: contextId,
	} as MiniReactContext<T>;

	const Provider: FunctionalComponent<{
		value: T;
		children?: AnyMiniReactElement[];
	}> = ({ value, children }) => {
		// Update the context's current value to keep it in sync
		context._currentValue = value;

		// Store context value in the current instance so reconciler can manage context stack
		if (currentRenderInstance) {
			if (!currentRenderInstance.contextValues) {
				currentRenderInstance.contextValues = new Map();
			}
			currentRenderInstance.contextValues.set(contextId, value);
		}

		// Render children
		let result: AnyMiniReactElement | null = null;
		if (!children || children.length === 0) {
			result = null;
		} else if (children.length === 1) {
			result = children[0];
		} else {
			result = createElement(
				"div",
				{ "data-context-provider": true },
				...children,
			);
		}

		return result;
	};

	// Set the Provider function on the context object
	context.Provider = Provider;

	return context;
}

/**
 * useContext hook implementation
 * @param context The context object created by createContext
 * @returns The current context value
 */
export function useContext<T>(context: MiniReactContext<T>): T {
	if (!currentRenderInstance) {
		throw new Error("useContext must be called inside a functional component");
	}

	// Check the global context stack for active context values
	for (let i = contextStack.length - 1; i >= 0; i--) {
		const contextMap = contextStack[i];
		if (contextMap.has(context._contextId)) {
			const value = contextMap.get(context._contextId) as T;
			return value;
		}
	}

	// Return default value if no provider found
	return context._defaultValue;
}

/**
 * Finds the root container for a given VDOM instance
 * @param instance The VDOM instance
 * @returns The root container element or null
 */
function findRootContainer(instance: VDOMInstance): HTMLElement | null {
	// Strategy 1: Walk up the parent chain and validate rootContainer references
	let current: VDOMInstance | undefined = instance;
	let depth = 0;
	while (current) {
		if (current.rootContainer) {
			// Verify this rootContainer is actually a real root by checking our rootInstances map
			for (const [container, rootInstance] of rootInstances) {
				if (container === current.rootContainer && rootInstance) {
					return container;
				}
			}
		}
		current = current.parent;
		depth++;
		if (depth > 10) {
			console.warn(
				"Parent chain depth exceeded 10, breaking to avoid infinite loop",
			);
			break;
		}
	}

	// Strategy 2: Search through all root instances to find the one containing this instance
	for (const [container, rootInstance] of rootInstances) {
		if (rootInstance && isInstanceInTree(instance, rootInstance)) {
			return container;
		}
	}

	// Strategy 3: If not found in main trees, check if this instance is part of a portal tree
	current = instance;
	while (current) {
		if (
			current.element &&
			typeof current.element === "object" &&
			"type" in current.element &&
			current.element.type === PORTAL
		) {
			// Found a portal parent - now find which root tree contains this portal
			for (const [container, rootInstance] of rootInstances) {
				if (rootInstance && isInstanceInTree(current, rootInstance)) {
					return container;
				}
			}
		}
		current = current.parent;
	}

	return null;
}

/**
 * Checks if a given instance is part of a VDOM tree
 * @param targetInstance The instance to find
 * @param rootInstance The root of the tree to search
 * @returns True if the instance is in the tree
 */
function isInstanceInTree(
	targetInstance: VDOMInstance,
	rootInstance: VDOMInstance,
): boolean {
	if (targetInstance === rootInstance) {
		return true;
	}

	return rootInstance.childInstances.some((child) =>
		isInstanceInTree(targetInstance, child),
	);
}

/**
 * Schedules an effect to be run after the current render
 */
function scheduleEffect(effectFn: () => void): void {
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
 * Fragment component - renders children without creating a wrapper DOM node
 */
export const Fragment: typeof FRAGMENT = FRAGMENT;

/**
 * Creates a portal element that renders its children into a different DOM container
 * @param children The children to render in the portal
 * @param targetContainer The DOM container to render into
 * @returns A portal element
 */
export function createPortal(
	children:
		| AnyMiniReactElement
		| AnyMiniReactElement[]
		| string
		| number
		| null
		| undefined,
	targetContainer: HTMLElement,
): PortalElement {
	if (!targetContainer) {
		throw new Error("Portal target cannot be null or undefined");
	}

	// Normalize children similar to createElement
	const childrenArray = Array.isArray(children) ? children : [children];
	const normalizedChildren = childrenArray
		.flat()
		.filter((child) => child !== null && child !== undefined)
		.map((child) => {
			if (typeof child === "string" || typeof child === "number") {
				return {
					type: TEXT_ELEMENT,
					props: {
						nodeValue: child,
						children: [],
					},
				};
			}
			return child;
		});

	return {
		type: PORTAL,
		props: {
			children: normalizedChildren,
			targetContainer,
		},
	};
}

/* ******* */
/* Exports */
/* ******* */

// Export types for external use
export type { FunctionalComponent } from "./types";

/* ***************** */
/* JSX Runtime API   */
/* ***************** */

export interface JSXSource {
	fileName?: string;
	lineNumber?: number;
	columnNumber?: number;
}

export interface JSXDEVProps {
	children?:
		| AnyMiniReactElement
		| AnyMiniReactElement[]
		| string
		| number
		| null
		| undefined;
	[key: string]: unknown;
}

/**
 * JSX runtime function for elements with no children or single child
 * Used by modern JSX transformation
 */
export function jsx(
	type: ElementType,
	props: JSXDEVProps | null,
	key?: string | number,
): JSXElementType {
	const { children, ...restProps } = props || {};
	const finalProps = { ...restProps };

	if (key !== undefined) {
		finalProps.key = key;
	}

	// Handle children
	if (children !== undefined) {
		if (Array.isArray(children)) {
			return createElement(type, finalProps, ...children);
		}
		return createElement(type, finalProps, children);
	}

	return createElement(type, finalProps);
}

/**
 * JSX runtime function for elements with multiple static children
 * Used by modern JSX transformation for performance optimization
 */
export function jsxs(
	type: ElementType,
	props: JSXDEVProps | null,
	key?: string | number,
): JSXElementType {
	// jsxs is identical to jsx in our implementation
	// The distinction is made by the JSX transformer for optimization hints
	return jsx(type, props, key);
}

/**
 * JSX runtime function for development mode with additional debugging info
 * Used in development builds for better error messages and debugging
 */
export function jsxDEV(
	type: ElementType,
	props: JSXDEVProps | null,
	key?: string | number,
	_isStaticChildren?: boolean,
	source?: JSXSource,
	_self?: unknown,
): JSXElementType {
	// In development mode, we could add additional debugging information
	// For now, we'll just delegate to jsx but could extend with:
	// - Component stack traces
	// - Source location tracking
	// - Runtime prop validation

	const element = jsx(type, props, key);

	// Store development metadata if needed (for future dev tools support)
	if (source && typeof element === "object" && element !== null) {
		(element as unknown as Record<string, unknown>).__source = source;
	}

	return element;
}
