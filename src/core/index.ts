/* ****************** */
/* Core Functionality */
/* ****************** */

import { eventSystem } from "../events";
import { trackRenderEnd, trackRenderStart } from "../performance";
import { reconcile } from "../reconciler";
import {
	type AnyMiniReactElement,
	type ElementType,
	type JSXElementType,
	PORTAL,
	TEXT_ELEMENT,
	type VDOMInstance,
} from "./types";

// Store root instances for each container
const rootInstances = new Map<HTMLElement, VDOMInstance | null>();
// Store original root elements for re-rendering
const rootElements = new Map<HTMLElement, AnyMiniReactElement | null>();

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

	// Track render performance
	trackRenderStart();
	const newInstance = reconcile(containerNode, newElement, oldInstance);
	trackRenderEnd();

	if (newElement === null) {
		// Ensure container is completely cleared when rendering null
		containerNode.innerHTML = "";
		// Clean up rootInstances after reconciliation
		rootInstances.delete(containerNode);
	} else {
		rootInstances.set(containerNode, newInstance);
	}
}

/**
 * Finds the root container for a given VDOM instance
 * @param instance The VDOM instance
 * @returns The root container element or null
 */
export function findRootContainer(instance: VDOMInstance): HTMLElement | null {
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
 * Gets the root element for re-rendering
 * @param container The container element
 * @returns The root element or null
 */
export function getRootElement(
	container: HTMLElement,
): AnyMiniReactElement | null {
	return rootElements.get(container) || null;
}
