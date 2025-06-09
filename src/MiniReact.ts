/* ****************** */
/* Core Functionality */
/* ****************** */

import { eventSystem } from "./eventSystem";
import { reconcile, setHookContext } from "./reconciler";
import {
    type AnyMiniReactElement,
    type ElementType,
    type Hook,
    TEXT_ELEMENT,
    type UseStateHook,
    type VDOMInstance,
} from "./types";

// Export event types for external use
export type { SyntheticEvent } from "./eventSystem";

/* ******** */
/* Globals  */
/* ******** */

// Store root instances for each container
const rootInstances = new Map<HTMLElement, VDOMInstance | null>();

// Hook state management
let currentRenderInstance: VDOMInstance | null = null;
let hookIndex = 0;

// Set the hook context function in the reconciler
setHookContext((instance: VDOMInstance | null) => {
    currentRenderInstance = instance;
    hookIndex = 0;
});

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
): AnyMiniReactElement {
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
    const oldInstance = rootInstances.get(containerNode) || null;
    const newInstance = reconcile(containerNode, newElement, oldInstance);
    rootInstances.set(containerNode, newInstance);
}

/**
 * useState hook implementation
 * @param initialState The initial state value or function that returns initial state
 * @returns A tuple with current state and setState function
 */
export function useState<T>(initialState: T | (() => T)): UseStateHook<T> {
    if (!currentRenderInstance) {
        throw new Error(
            "useState must be called inside a functional component",
        );
    }

    // Capture the current instance at hook creation time
    const hookInstance = currentRenderInstance;

    // Ensure hooks array exists
    if (!hookInstance.hooks) {
        hookInstance.hooks = [];
    }

    const hooks = hookInstance.hooks;
    const currentHookIndex = hookIndex++;

    // Initialize hook if it doesn't exist
    if (hooks.length <= currentHookIndex) {
        const initialStateValue =
            typeof initialState === "function"
                ? (initialState as () => T)()
                : initialState;

        (hooks as Hook<T>[]).push({
            state: initialStateValue,
            setState: () => {}, // Will be set below
        });
    }

    const hook = hooks[currentHookIndex] as Hook<T>;

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
                const rootElement =
                    rootInstances.get(container)?.element || null;
                render(rootElement, container);
            }
        }
    };

    // Update the setState function reference
    hook.setState = setState;

    return [hook.state as T, setState];
}

/**
 * Finds the root container for a given VDOM instance
 * @param instance The VDOM instance
 * @returns The root container element or null
 */
function findRootContainer(instance: VDOMInstance): HTMLElement | null {
    for (const [container, rootInstance] of rootInstances.entries()) {
        if (rootInstance && isInstanceInTree(instance, rootInstance)) {
            return container;
        }
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

    for (const child of rootInstance.childInstances) {
        if (isInstanceInTree(targetInstance, child)) {
            return true;
        }
    }

    return false;
}

/* ******* */
/* Exports */
/* ******* */

// Export types for external use
export type { FunctionalComponent } from "./types";
