import { type AnyMiniReactElement, TEXT_ELEMENT } from "./types";

/* ******************** */
/* DOM Renderer Utility */
/* ******************** */

/**
 * Checks if a prop name is an event handler
 * @param propName The prop name to check
 * @returns True if it's an event handler, false otherwise
 */
function isEventHandler(propName: string): boolean {
	return propName.startsWith("on") && propName.length > 2;
}

/**
 * Sets a single attribute on a DOM element, handling special cases
 * @param element The DOM element
 * @param key The attribute name
 * @param value The attribute value
 */
function setAttribute(element: Element, key: string, value: unknown): void {
	if (key === "className") {
		element.setAttribute("class", String(value));
	} else if (key === "style" && typeof value === "string") {
		element.setAttribute("style", value);
	} else if (typeof value === "boolean") {
		// For boolean attributes, only set if true, remove if false
		if (value) {
			element.setAttribute(key, ""); // Set to empty string for boolean attributes
		} else {
			element.removeAttribute(key);
		}
	} else if (value !== undefined && value !== null) {
		element.setAttribute(key, String(value));
	}
}

/**
 * Creates a DOM node from a VDOM element
 * @param element The VDOM element to convert
 * @returns The created DOM node
 */
export function createDomNode(element: AnyMiniReactElement): Element | Text {
	// Handle text elements (TEXT_ELEMENT)
	if (element.type === TEXT_ELEMENT) {
		return document.createTextNode(String(element.props.nodeValue));
	}

	// Create host element
	const domElement = document.createElement(element.type as string);

	// Set attributes (props), but skip event handlers and children
	if (element.props) {
		for (const [key, value] of Object.entries(element.props)) {
			if (key !== "children" && !isEventHandler(key)) {
				setAttribute(domElement, key, value);
			}
		}
	}

	return domElement;
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
