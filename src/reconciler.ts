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

    // Handle host elements - naive rerender for now
    // Later on, this would be more sophisticated with prop diffing
    instance.element = newElement;

    // For host elements, update the DOM attributes naively
    if (instance.dom && instance.dom.nodeType === Node.ELEMENT_NODE) {
        const domElement = instance.dom as Element;
        const newProps = props as Record<string, unknown>;

        // Clear existing attributes (naive approach)
        const existingAttributes = Array.from(domElement.attributes);
        for (const attr of existingAttributes) {
            domElement.removeAttribute(attr.name);
        }

        // Set new attributes
        // biome-ignore lint/complexity/noForEach: <explanation>
        Object.entries(newProps).forEach(([key, value]) => {
            if (key === "children") return;

            if (key === "className") {
                domElement.setAttribute("class", String(value));
            } else if (key.startsWith("on") && typeof value === "function") {
                // Event handling placeholder for future phases
                // const eventType = key.slice(2).toLowerCase();
                // domElement.addEventListener(eventType, value as EventListener);
            } else if (value !== undefined && value !== null) {
                domElement.setAttribute(key, String(value));
            }
        });
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
 */
function isSameElementType(
    oldElement: AnyMiniReactElement,
    newElement: AnyMiniReactElement,
): boolean {
    return oldElement.type === newElement.type;
}
