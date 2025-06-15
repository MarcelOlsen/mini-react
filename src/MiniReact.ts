/* ****************** */
/* Core Functionality */
/* ****************** */

import { eventSystem } from "./eventSystem";
import { reconcile, setHookContext } from "./reconciler";
import {
    type AnyMiniReactElement,
    type DependencyList,
    type EffectCallback,
    type EffectHook,
    type ElementType,
    type StateHook,
    type StateOrEffectHook,
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
// Store original root elements for re-rendering
const rootElements = new Map<HTMLElement, AnyMiniReactElement | null>();

// Hook state management
let currentRenderInstance: VDOMInstance | null = null;

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

    // Store the original element for re-renders
    rootElements.set(containerNode, newElement);

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
            setState: () => { }, // Will be set below
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
                render(rootElement, container);
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

/* ******* */
/* Exports */
/* ******* */

// Export types for external use
export type { FunctionalComponent } from "./types";
