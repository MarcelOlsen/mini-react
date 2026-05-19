/* ****************** */
/* Core Functionality */
/* ****************** */

import {
	type FiberRoot,
	createRoot as createFiberRoot,
	flushSync,
	updateContainer,
} from "../fiber";
import {
	type AnyMiniReactElement,
	type ElementType,
	type JSXElementType,
	TEXT_ELEMENT,
} from "./types";

// Store fiber roots for each container
const fiberRoots = new Map<HTMLElement, FiberRoot>();

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
 * Renders a MiniReact element into a container using the fiber reconciler
 * @param element The element to render (can be null to clear)
 * @param containerNode The container DOM node
 */
export function render(
	element: AnyMiniReactElement | null | undefined,
	containerNode: HTMLElement,
): void {
	const newElement = element || null;

	// Get or create fiber root for this container
	let root = fiberRoots.get(containerNode);
	if (!root) {
		root = createFiberRoot(containerNode);
		fiberRoots.set(containerNode, root);
	}

	// Render tracking is handled inside performSyncWorkOnRoot
	updateContainer(newElement, root);
	flushSync();

	if (newElement === null) {
		// Clean up fiber root when unmounting
		fiberRoots.delete(containerNode);
	}
}

/**
 * Gets the fiber root for a container
 * @param container The container element
 * @returns The fiber root or undefined
 */
export function getFiberRoot(container: HTMLElement): FiberRoot | undefined {
	return fiberRoots.get(container);
}

// Re-export fiber-based hydration for SSR
export { hydrateRoot, type HydrateRootOptions } from "../fiber/hydration";

// Re-export fiber-based resumability for state persistence
export {
	serializeFiberTree,
	dehydrateRoot,
	parseSerializedRoot,
	type SerializedFiberRoot,
} from "../fiber/resumability";
