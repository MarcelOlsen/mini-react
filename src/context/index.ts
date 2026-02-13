/* ***************** */
/* Context API       */
/* ***************** */

import { createElement } from "../core";
import type { AnyMiniReactElement, FunctionalComponent } from "../core/types";
import { getCurrentlyRenderingFiber } from "../fiber/fiberHooks";
import type { Fiber } from "../fiber/types";
import type { MiniReactContext } from "./types";

// Map from Provider function to its context object
// Used to identify Provider fibers when traversing the tree
const providerToContext = new WeakMap<
	FunctionalComponent<{ value: unknown; children?: AnyMiniReactElement[] }>,
	MiniReactContext<unknown>
>();

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

	// Register Provider function with its context for fiber traversal lookup
	providerToContext.set(
		Provider as FunctionalComponent<{
			value: unknown;
			children?: AnyMiniReactElement[];
		}>,
		context as MiniReactContext<unknown>,
	);

	return context;
}

/**
 * Finds the context value by traversing up the fiber tree.
 * Returns the value from the nearest Provider or the default value.
 */
function findContextValue<T>(fiber: Fiber, context: MiniReactContext<T>): T {
	let currentFiber: Fiber | null = fiber.return;

	while (currentFiber !== null) {
		// Check if this fiber is a Provider for our context
		const fiberType = currentFiber.type;
		if (typeof fiberType === "function") {
			const providerContext = providerToContext.get(
				fiberType as FunctionalComponent<{
					value: unknown;
					children?: AnyMiniReactElement[];
				}>,
			);
			if (providerContext === (context as MiniReactContext<unknown>)) {
				// Found the Provider! Get the value from its props
				const props = currentFiber.memoizedProps ?? currentFiber.pendingProps;
				if (props && "value" in props) {
					return props["value"] as T;
				}
			}
		}
		currentFiber = currentFiber.return;
	}

	// No Provider found, return default value
	return context._defaultValue;
}

/**
 * useContext hook implementation
 * @param context The context object created by createContext
 * @returns The current context value
 */
export function useContext<T>(context: MiniReactContext<T>): T {
	const currentFiber = getCurrentlyRenderingFiber();
	if (currentFiber === null) {
		throw new Error("useContext must be called inside a functional component");
	}

	return findContextValue(currentFiber, context);
}
