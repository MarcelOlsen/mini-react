/* ****************** */
/* Core Functionality */
/* ****************** */

import { reconcile, setHookContext } from "./reconciler";
import {
	type AnyMiniReactElement,
	type ElementType,
	type Hook,
	type InternalTextElement,
	type MiniReactElement,
	TEXT_ELEMENT,
	type UseStateHook,
	type VDOMInstance,
} from "./types";

// Container-specific root instance tracking
const rootInstances = new Map<HTMLElement, VDOMInstance | null>();

// Hook state management
let currentRenderInstance: VDOMInstance | null = null;
let currentHookIndex = 0;

// Set up hook context with reconciler
setHookContext(setCurrentRenderInstance);

/**
 * Creates and returns a new MiniReact element of the given type.
 * @param type The type of the element (e.g., 'div', 'p').
 * @param configProps The props for the element (e.g., { id: 'foo' }).
 * @param children Child elements or text content.
 *
 * @returns The created MiniReact element.
 */

// Main implementation with flexible ElementType that accepts any function
export function createElement(
	type: ElementType,
	configProps: Record<string, unknown> | null,
	...childrenArgs: (AnyMiniReactElement | string | number)[]
): MiniReactElement {
	const children: AnyMiniReactElement[] = childrenArgs.map((child) =>
		typeof child === "object" && child !== null
			? child
			: createTextElement(child),
	);

	const props: Record<string, unknown> & { children: AnyMiniReactElement[] } = {
		...(configProps ?? {}),
		children,
	};

	return { type, props };
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
	const newElement = element || null;
	const oldInstance = rootInstances.get(containerNode) || null;
	const newInstance = reconcile(containerNode, newElement, oldInstance);
	rootInstances.set(containerNode, newInstance);
}

/**
 * useState hook implementation
 * @param initialState The initial state value
 * @returns A tuple of [state, setState] for managing component state
 */
export function useState<T>(initialState: T | (() => T)): UseStateHook<T> {
	if (!currentRenderInstance) {
		throw new Error(
			"useState can only be called inside a functional component",
		);
	}

	if (!currentRenderInstance.hooks) {
		currentRenderInstance.hooks = [];
	}

	const hooks = currentRenderInstance.hooks;
	const hookIndex = currentHookIndex++;

	// Initialize hook if it doesn't exist
	if (!hooks[hookIndex]) {
		const initialValue =
			typeof initialState === "function"
				? (initialState as () => T)()
				: initialState;

		// Create a stable setState function that will work across re-renders
		const stableSetState = (newState: unknown) => {
			const hook = hooks[hookIndex];
			// Type assertion since we know this is a useState hook
			const typedNewState = newState as T | ((prevState: T) => T);
			const nextState =
				typeof typedNewState === "function"
					? (typedNewState as (prevState: T) => T)(hook.state as T)
					: typedNewState;

			if (hook.state !== nextState) {
				hook.state = nextState;
				// Find the root container and trigger re-render
				scheduleRerenderForHook(hooks);
			}
		};

		hooks[hookIndex] = {
			state: initialValue,
			setState: stableSetState,
		};
	}

	const hook = hooks[hookIndex];
	return [
		hook.state as T,
		hook.setState as (newState: T | ((prevState: T) => T)) => void,
	];
}

/**
 * Sets the current render instance for hook context
 * @param instance The VDOM instance being rendered
 */
export function setCurrentRenderInstance(instance: VDOMInstance | null): void {
	currentRenderInstance = instance;
	currentHookIndex = 0;
}

/**
 * Schedules a re-render by finding the component instance that owns the hook
 * @param hooks The hooks array
 */
function scheduleRerenderForHook(hooks: Hook[]): void {
	// Find the root container for any instance that has these hooks
	for (const [container, rootInstance] of rootInstances.entries()) {
		if (findInstanceWithHooks(rootInstance, hooks)) {
			// Re-render the entire tree
			setTimeout(() => {
				const newInstance = reconcile(
					container,
					rootInstance?.element || null,
					rootInstance,
				);
				rootInstances.set(container, newInstance);
			}, 0);
			break;
		}
	}
}

/**
 * Recursively finds an instance that has the specified hooks array
 * @param instance The instance to search
 * @param targetHooks The hooks array to find
 * @returns True if the instance or any of its children has the target hooks
 */
function findInstanceWithHooks(
	instance: VDOMInstance | null,
	targetHooks: Hook[],
): boolean {
	if (!instance) return false;
	if (instance.hooks === targetHooks) return true;

	return instance.childInstances.some((child) =>
		findInstanceWithHooks(child, targetHooks),
	);
}

/**
 * Creates a text element for MiniReact
 * @param text The text to create a text element for
 * @returns The created text element
 */
function createTextElement(text: string | number): InternalTextElement {
	return {
		type: TEXT_ELEMENT,
		props: {
			nodeValue: text,
			children: [],
		},
	};
}
