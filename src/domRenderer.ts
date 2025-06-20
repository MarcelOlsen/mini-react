import { type AnyMiniReactElement, TEXT_ELEMENT } from "./types";

/* ******************** */
/* DOM Renderer Utility */
/* ******************** */

/**
 * Creates a DOM node from a MiniReact element (without children processing)
 *
 * @param element The element to create a DOM node for
 * @returns The created DOM node
 */
export function createDomNode(element: AnyMiniReactElement): Node {
	const { type, props } = element;

	if (type === TEXT_ELEMENT) {
		return document.createTextNode(String(props.nodeValue));
	}

	// Host element
	const domNode = document.createElement(type as string);
	// biome-ignore lint/complexity/noForEach: forEach is appropriate here as we need to iterate over object entries with side effects (setting DOM attributes), not transforming to a new array
	Object.entries(props).forEach(([key, value]) => {
		if (key === "children") return;

		if (key === "className") {
			domNode.setAttribute("class", String(value));
		} else if (value !== undefined && value !== null) {
			domNode.setAttribute(key, String(value));
		}
	});

	return domNode;
}

/**
 * Removes a DOM node from its parent
 *
 * @param domNode The DOM node to remove
 */
export function removeDomNode(domNode: Node): void {
	if (domNode.parentNode) {
		domNode.parentNode.removeChild(domNode);
	}
}

/**
 * Replaces an old DOM node with a new one
 *
 * @param oldDom The old DOM node
 * @param newDom The new DOM node
 */
export function replaceDomNode(oldDom: Node, newDom: Node): void {
	if (oldDom.parentNode) {
		oldDom.parentNode.replaceChild(newDom, oldDom);
	}
}
