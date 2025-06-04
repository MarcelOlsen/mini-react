/* ****************** */
/* Core Functionality */
/* ****************** */

import { reconcile } from "./reconciler";
import {
	type AnyMiniReactElement,
	type ElementType,
	type InternalTextElement,
	type MiniReactElement,
	TEXT_ELEMENT,
	type VDOMInstance,
} from "./types";

// Container-specific root instance tracking
const rootInstances = new WeakMap<HTMLElement, VDOMInstance | null>();

/**
 * Creates and returns a new MiniReact element of the given type.
 * @param type The type of the element (e.g., 'div', 'p').
 * @param configProps The props for the element (e.g., { id: 'foo' }).
 * @param children Child elements or text content.
 *
 * @returns The created MiniReact element.
 */
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
