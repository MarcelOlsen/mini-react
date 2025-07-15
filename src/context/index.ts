/* ***************** */
/* Context API       */
/* ***************** */

import { createElement } from "../core";
import type {
	AnyMiniReactElement,
	FunctionalComponent,
	VDOMInstance,
} from "../core/types";
import type { MiniReactContext } from "./types";

// Context system - Track context providers in the render tree
const contextStack: Map<symbol, unknown>[] = [];

// Hook state management
let currentRenderInstance: VDOMInstance | null = null;

/**
 * Sets the current render instance for context hooks
 * @param instance The current VDOM instance
 */
export function setContextRenderInstance(instance: VDOMInstance | null): void {
	currentRenderInstance = instance;
}

/**
 * Pushes a context value onto the context stack
 * @param contextValues The context values to push
 */
export function pushContextValues(contextValues: Map<symbol, unknown>): void {
	contextStack.push(contextValues);
}

/**
 * Pops a context value from the context stack
 */
export function popContextValues(): void {
	contextStack.pop();
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
