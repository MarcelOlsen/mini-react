import type {
    AnyMiniReactElement,
    VDOMInstance,
    FunctionalComponent,
} from "./types";
import { createDomNode, removeDomNode, replaceDomNode } from "./domRenderer";

/* ********** */
/* Reconciler */
/* ********** */

/**
 * Core reconciliation function that creates/updates VDOM instances and corresponding DOM nodes
 * @param parentDom The parent DOM node
 * @param newElement The new element to render (can be null for removal)
 * @param oldInstance The existing VDOM instance (can be null for initial render)
 * @returns The new or updated VDOM instance (or null if element was removed)
 */
export function reconcile(
    parentDom: Node,
    newElement: AnyMiniReactElement | null,
    oldInstance: VDOMInstance | null,
): VDOMInstance | null {
    // Case 1: Element removal - newElement is null but oldInstance exists
    if (newElement == null) {
        if (oldInstance?.dom) {
            removeDomNode(oldInstance.dom);
        }
        return null;
    }

    // Case 2: Initial render - oldInstance is null
    if (oldInstance == null) {
        return createVDOMInstance(parentDom, newElement);
    }

    // Case 3: Type change - recreate everything
    if (!isSameElementType(oldInstance.element, newElement)) {
        const newInstance = createVDOMInstance(parentDom, newElement);
        if (oldInstance.dom && newInstance.dom) {
            replaceDomNode(oldInstance.dom, newInstance.dom);
        }
        return newInstance;
    }

    // Case 4: Same type - update existing instance
    return updateVDOMInstance(oldInstance, newElement);
}

/**
 * Creates a new VDOM instance and corresponding DOM node for initial render
 *
 * @param parentDom The parent DOM node
 * @param element The element to create a VDOM instance for
 * @returns The VDOM instance
 */
function createVDOMInstance(
    parentDom: Node,
    element: AnyMiniReactElement,
): VDOMInstance {
    const { type, props } = element;

    // Handle functional components
    if (typeof type === "function") {
        const childElement = (type as FunctionalComponent)(props);
        const childInstance = childElement
            ? createVDOMInstance(parentDom, childElement)
            : null;

        return {
            element,
            dom: childInstance?.dom || null,
            childInstances: childInstance ? [childInstance] : [],
        };
    }

    // Handle host elements (including text elements)
    const domNode = createDomNode(element);
    const childInstances: VDOMInstance[] = [];

    // Process children
    for (const child of props.children) {
        const childInstance = createVDOMInstance(domNode, child);
        childInstances.push(childInstance);
        if (childInstance.dom) {
            domNode.appendChild(childInstance.dom);
        }
    }

    // Append to parent
    parentDom.appendChild(domNode);

    return {
        element,
        dom: domNode,
        childInstances,
    };
}

/**
 * Updates an existing VDOM instance with a new element (same type)
 *
 * @param instance The existing VDOM instance
 * @param newElement The new element to update the VDOM instance with
 * @returns The updated VDOM instance
 */
function updateVDOMInstance(
    instance: VDOMInstance,
    newElement: AnyMiniReactElement,
): VDOMInstance {
    const { type, props } = newElement;

    // Handle functional components - re-execute and reconcile output
    if (typeof type === "function") {
        const newChildElement = (type as FunctionalComponent)(props);
        const oldChildInstance = instance.childInstances[0] || null;

        // Find the correct parent node to reconcile in
        let parentNode: Node | null = null;
        if (oldChildInstance?.dom?.parentNode) {
            parentNode = oldChildInstance.dom.parentNode;
        } else if (instance.dom?.parentNode) {
            parentNode = instance.dom.parentNode;
        }

        if (!parentNode) {
            throw new Error(
                "Unable to find parent node for functional component reconciliation",
            );
        }

        const newChildInstance = reconcile(
            parentNode,
            newChildElement,
            oldChildInstance,
        );

        return {
            element: newElement,
            dom: newChildInstance?.dom || null,
            childInstances: newChildInstance ? [newChildInstance] : [],
        };
    }

    // Handle host elements - use efficient prop diffing
    const oldProps = instance.element.props as Record<string, unknown>;
    instance.element = newElement;

    // For host elements, update only changed DOM attributes using diffProps
    if (instance.dom && instance.dom.nodeType === Node.ELEMENT_NODE) {
        const domElement = instance.dom as Element;
        const newProps = props as Record<string, unknown>;

        // Use efficient prop diffing instead of naive clear-and-set approach
        diffProps(domElement, oldProps, newProps);
    }

    // For now, we'll just update the DOM node if it's a text element
    if (instance.dom && instance.dom.nodeType === Node.TEXT_NODE) {
        instance.dom.nodeValue = String(props.nodeValue);
    }

    // Naive children reconciliation - reconcile all children
    const newChildren = props.children;
    const childInstances: VDOMInstance[] = [];
    const maxLength = Math.max(
        instance.childInstances.length,
        newChildren.length,
    );

    for (let i = 0; i < maxLength; i++) {
        const oldChildInstance = instance.childInstances[i] || null;
        const newChildElement = newChildren[i] || null;

        if (instance.dom) {
            const newChildInstance = reconcile(
                instance.dom,
                newChildElement,
                oldChildInstance,
            );
            if (newChildInstance) {
                childInstances.push(newChildInstance);
            }
        }
    }

    instance.childInstances = childInstances;
    return instance;
}

/**
 * Checks if two elements have the same type for reconciliation purposes
 *
 * @param oldElement The old element
 * @param newElement The new element
 * @returns True if the elements have the same type, false otherwise
 */
function isSameElementType(
    oldElement: AnyMiniReactElement,
    newElement: AnyMiniReactElement,
): boolean {
    return oldElement.type === newElement.type;
}

/**
 * Efficiently diffs props and applies only the necessary DOM updates
 * @param domElement The DOM element to update
 * @param oldProps The previous props
 * @param newProps The new props
 */
function diffProps(
    domElement: Element,
    oldProps: Record<string, unknown>,
    newProps: Record<string, unknown>,
): void {
    // Create sets of old and new prop keys (excluding children)
    const oldKeys = new Set(
        Object.keys(oldProps).filter((key) => key !== "children")
    );
    const newKeys = new Set(
        Object.keys(newProps).filter((key) => key !== "children")
    );

    // Remove attributes that are no longer present
    for (const key of oldKeys) {
        if (!newKeys.has(key)) {
            removeAttribute(domElement, key);
        }
    }

    // Add or update attributes
    for (const key of newKeys) {
        const oldValue = oldProps[key];
        const newValue = newProps[key];

        // Only update if the value has actually changed
        if (oldValue !== newValue) {
            setAttribute(domElement, key, newValue);
        }
    }
}

/**
 * Sets an attribute on a DOM element with proper handling for special cases
 * @param domElement The DOM element
 * @param key The attribute key
 * @param value The attribute value
 */
function setAttribute(
    domElement: Element,
    key: string,
    value: unknown,
): void {
    if (key === "className") {
        domElement.setAttribute("class", String(value));
    } else if (key.startsWith("on") && typeof value === "function") {
        // Event handling placeholder for future phases
        // const eventType = key.slice(2).toLowerCase();
        // domElement.addEventListener(eventType, value as EventListener);
    } else if (typeof value === "boolean") {
        // Handle boolean attributes specially
        if (value) {
            domElement.setAttribute(key, "");
        } else {
            // Remove the attribute when boolean value is false
            domElement.removeAttribute(key);
        }
    } else if (value !== undefined && value !== null) {
        // Handle all other non-null, non-undefined values
        domElement.setAttribute(key, String(value));
    } else {
        // Remove attribute for null/undefined values
        domElement.removeAttribute(key);
    }
}

/**
 * Removes an attribute from a DOM element with proper handling for special cases
 * @param domElement The DOM element
 * @param key The attribute key
 */
function removeAttribute(domElement: Element, key: string): void {
    if (key === "className") {
        domElement.removeAttribute("class");
    } else {
        domElement.removeAttribute(key);
    }
}
