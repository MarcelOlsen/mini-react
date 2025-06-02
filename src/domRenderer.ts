import { TEXT_ELEMENT, type AnyMiniReactElement } from "./types";

/* ******************* */
/* DOM Renderer Utility */
/* ******************* */

/**
 * Creates a DOM node from a MiniReact element (without children processing)
 */
export function createDomNode(element: AnyMiniReactElement): Node {
    const { type, props } = element;

    if (type === TEXT_ELEMENT) {
        return document.createTextNode(String(props.nodeValue));
    }

    // Host element
    const domNode = document.createElement(type as string);

    // Set attributes
    // biome-ignore lint/complexity/noForEach: <explanation>
    Object.entries(props).forEach(([key, value]) => {
        if (key === "children") return;

        if (key === "className") {
            domNode.setAttribute("class", String(value));
        } else if (key.startsWith("on") && typeof value === "function") {
            // Event handling placeholder to be implemented in the future
        } else if (value !== undefined && value !== null) {
            domNode.setAttribute(key, String(value));
        }
    });

    return domNode;
}

/**
 * Removes a DOM node from its parent
 */
export function removeDomNode(domNode: Node): void {
    if (domNode.parentNode) {
        domNode.parentNode.removeChild(domNode);
    }
}

/**
 * Replaces an old DOM node with a new one
 */
export function replaceDomNode(oldDom: Node, newDom: Node): void {
    if (oldDom.parentNode) {
        oldDom.parentNode.replaceChild(newDom, oldDom);
    }
}
