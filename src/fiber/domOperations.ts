/**
 * DOM Operations - Utilities for manipulating the DOM
 *
 * This module provides low-level DOM manipulation functions used by the commit phase.
 * It handles:
 * - Inserting and removing nodes
 * - Updating properties (className, style, attributes, event handlers)
 * - Setting initial properties on new elements
 *
 * These functions are the bridge between Fiber's virtual representation
 * and the actual browser DOM.
 */

import type { Props } from "./types";

/**
 * Insert a DOM node into a parent container
 *
 * @param parent The parent DOM element
 * @param child The child DOM node to insert
 * @param before The node to insert before (null = append to end)
 */
export function insertBefore(
	parent: Node,
	child: Node,
	before: Node | null,
): void {
	if (before !== null) {
		parent.insertBefore(child, before);
	} else {
		parent.appendChild(child);
	}
}

/**
 * Remove a DOM node from its parent
 *
 * @param parent The parent DOM element
 * @param child The child DOM node to remove
 */
export function removeChild(parent: Node, child: Node): void {
	parent.removeChild(child);
}

/**
 * Set initial properties on a newly created DOM element
 *
 * @param domElement The DOM element
 * @param props The element's props
 */
export function setInitialProperties(domElement: Element, props: Props): void {
	for (const propKey in props) {
		const propValue = props[propKey];

		// Skip special props
		if (propKey === "children" || propKey === "key" || propKey === "ref") {
			continue;
		}

		// Handle different property types
		if (propKey === "className") {
			setClassName(domElement, propValue as string);
		} else if (propKey === "style") {
			setStyle(domElement, propValue as Record<string, string>);
		} else if (isEventHandler(propKey)) {
			// Event handlers are handled by the delegated event system
			// Don't attach them directly - the event system will handle delegation
		} else {
			setAttribute(domElement, propKey, propValue);
		}
	}
}

/**
 * Update properties on an existing DOM element
 *
 * Efficiently diffs old and new props and only updates what changed.
 *
 * @param domElement The DOM element
 * @param oldProps Previous props
 * @param newProps New props
 */
export function updateProperties(
	domElement: Element,
	oldProps: Props,
	newProps: Props,
): void {
	// Remove old properties that are no longer present
	for (const propKey in oldProps) {
		if (
			propKey === "children" ||
			propKey === "key" ||
			propKey === "ref" ||
			Object.hasOwn(newProps, propKey)
		) {
			continue;
		}

		// Property was removed
		if (propKey === "className") {
			setClassName(domElement, "");
		} else if (propKey === "style") {
			setStyle(domElement, {});
		} else if (isEventHandler(propKey)) {
			// Event handlers are handled by the delegated event system
			// No need to remove them directly
		} else {
			removeAttribute(domElement, propKey);
		}
	}

	// Add or update new properties
	for (const propKey in newProps) {
		const oldValue = oldProps[propKey];
		const newValue = newProps[propKey];

		// Skip if unchanged
		if (
			propKey === "children" ||
			propKey === "key" ||
			propKey === "ref" ||
			oldValue === newValue
		) {
			continue;
		}

		// Property changed - update it
		if (propKey === "className") {
			setClassName(domElement, newValue as string);
		} else if (propKey === "style") {
			setStyle(domElement, newValue as Record<string, string>);
		} else if (isEventHandler(propKey)) {
			// Event handlers are handled by the delegated event system
			// No need to add/remove them directly
		} else {
			setAttribute(domElement, propKey, newValue);
		}
	}
}

/**
 * Update text content of a text node
 *
 * @param textNode The text node
 * @param newText The new text content
 */
export function updateTextContent(textNode: Text, newText: string): void {
	textNode.nodeValue = newText;
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Check if a prop key is an event handler (starts with 'on')
 */
function isEventHandler(propKey: string): boolean {
	return propKey.startsWith("on");
}

/**
 * Set className on a DOM element
 */
function setClassName(domElement: Element, className: string | unknown): void {
	if (typeof className === "string") {
		(domElement as HTMLElement).className = className;
	}
}

/**
 * Set style properties on a DOM element
 */
function setStyle(
	domElement: Element,
	style: Record<string, string> | string | unknown,
): void {
	const htmlElement = domElement as HTMLElement;

	// Handle string styles (e.g., "color: red; font-size: 14px;")
	if (typeof style === "string") {
		htmlElement.setAttribute("style", style);
		return;
	}

	// Handle object styles
	if (typeof style !== "object" || style === null) {
		return;
	}

	const styleObj = style as Record<string, string>;

	// Clear existing styles first
	htmlElement.style.cssText = "";

	// Apply new styles
	for (const key in styleObj) {
		const value = styleObj[key];
		if (value !== undefined && value !== null) {
			htmlElement.style.setProperty(key, String(value));
		}
	}
}

/**
 * Set an attribute on a DOM element
 */
function setAttribute(domElement: Element, name: string, value: unknown): void {
	// Handle special attributes
	if (name === "value" && domElement instanceof HTMLInputElement) {
		domElement.value = String(value ?? "");
		// Also set the attribute for empty strings
		if (value === "") {
			domElement.setAttribute("value", "");
		}
		return;
	}

	if (name === "checked" && domElement instanceof HTMLInputElement) {
		domElement.checked = Boolean(value);
		return;
	}

	if (name === "selected" && domElement instanceof HTMLOptionElement) {
		domElement.selected = Boolean(value);
		return;
	}

	// Regular attributes
	if (value === null || value === undefined || value === false) {
		domElement.removeAttribute(name);
	} else if (value === true) {
		domElement.setAttribute(name, "");
	} else {
		domElement.setAttribute(name, String(value));
	}
}

/**
 * Remove an attribute from a DOM element
 */
function removeAttribute(domElement: Element, name: string): void {
	// Handle special attributes
	if (name === "value" && domElement instanceof HTMLInputElement) {
		domElement.value = "";
		return;
	}

	if (name === "checked" && domElement instanceof HTMLInputElement) {
		domElement.checked = false;
		return;
	}

	if (name === "selected" && domElement instanceof HTMLOptionElement) {
		domElement.selected = false;
		return;
	}

	// Regular attributes
	domElement.removeAttribute(name);
}
