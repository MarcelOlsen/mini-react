/* ****************** */
/* Core Functionality */
/* ****************** */

import { eventSystem } from "../events";
import {
	createFiberRoot,
	getFiberRoot,
	hasFiberRoot,
	scheduleUpdateOnFiber,
	type FiberRoot,
} from "../fiber";
import {
	type AnyMiniReactElement,
	type ElementType,
	type JSXElementType,
	TEXT_ELEMENT,
} from "./types";

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
 * Renders a MiniReact element into a container using Fiber architecture
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

	// Get or create FiberRoot for this container
	let fiberRoot: FiberRoot;
	if (hasFiberRoot(containerNode)) {
		const existingRoot = getFiberRoot(containerNode);
		if (!existingRoot) {
			throw new Error(
				"FiberRoot exists check passed but getFiberRoot returned null",
			);
		}
		fiberRoot = existingRoot;
	} else {
		fiberRoot = createFiberRoot(containerNode);
	}

	// Update the root fiber's pending props with the new element
	const rootFiber = fiberRoot.current;
	rootFiber.pendingProps = {
		children: newElement ? [newElement] : [],
	};

	// Trigger Fiber reconciliation and commit
	scheduleUpdateOnFiber(rootFiber);

	// Clear container if rendering null
	if (newElement === null) {
		containerNode.innerHTML = "";
	}
}

/**
 * @deprecated Old VDOMInstance system - kept for backward compatibility only
 * Use Fiber's getFiberRoot instead
 */
export function findRootContainer(): HTMLElement | null {
	console.warn(
		"findRootContainer is deprecated - use Fiber's getFiberRoot instead",
	);
	return null;
}

/**
 * @deprecated Old VDOMInstance system - kept for backward compatibility only
 * Use Fiber's getFiberRoot instead
 */
export function getRootElement(): AnyMiniReactElement | null {
	console.warn(
		"getRootElement is deprecated - use Fiber's getFiberRoot instead",
	);
	return null;
}
