/* **************** */
/* Type Definitions */
/* **************** */

export type ElementType = string; // Only string type is supported for now

export interface ElementProps {
    // biome-ignore lint/suspicious/noExplicitAny: Props can be of any type
    [key: string]: any;
    children: Array<MiniReactElement | string>;
}

export interface MiniReactElement {
    type: ElementType;
    props: ElementProps;
}

/* ****************** */
/* Core Functionality */
/* ****************** */

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
    // biome-ignore lint/suspicious/noExplicitAny: Config props can be of any type
    configProps: Record<string, any> | null,
    ...children: (MiniReactElement | string | number)[]
): MiniReactElement {
    const props: ElementProps = {
        ...configProps,
        children: children.map((child) =>
            typeof child === "object" && child !== null
                ? child
                : createTextElement(child),
        ),
    };

    return { type, props };
}

export const TEXT_ELEMENT = "TEXT_ELEMENT";

interface TextElement extends MiniReactElement {
    type: typeof TEXT_ELEMENT;
    props: {
        nodeValue: string | number;
        children: []; // Text elements don't have children
    };
}

function createTextElement(text: string | number): TextElement {
    return {
        type: TEXT_ELEMENT,
        props: {
            nodeValue: text,
            children: [],
        },
    };
}

/**
 * Renders a MiniReact element into a DOM container.
 * In Phase 1, this function directly creates and appends DOM nodes.
 * @param element The MiniReact element to render.
 * @param containerNode The DOM node to render into.
 *
 * @returns The created DOM node.
 */
export function render(
    element: MiniReactElement | null | undefined,
    containerNode: HTMLElement,
): void {
    if (element == null) {
        containerNode.innerHTML = "";
        return;
    }

    // Clear the container before rendering new content (simple approach for now)
    containerNode.innerHTML = "";

    const domNode = createDomNodeFromElement(element);
    if (domNode) {
        containerNode.appendChild(domNode);
    }
}

function createDomNodeFromElement(element: MiniReactElement): Node | null {
    if (!element) return null;

    const { type, props } = element;

    let domNode: Node;

    if (type === TEXT_ELEMENT) {
        domNode = document.createTextNode(props.nodeValue);
    } else if (typeof type === "string") {
        domNode = document.createElement(type);
    } else {
        console.error(`Unsupported element of type: ${typeof type}`, element);
        throw new Error(`Unknown element type: ${type}`);
    }

    // biome-ignore lint/complexity/noForEach: <explanation>
    Object.keys(props)
        .filter((key) => key !== "children")
        .forEach((name) => {
            if (name === "nodeValue" && domNode.nodeType === Node.TEXT_NODE) {
                // We're dealing with a text node and the prop is "nodeValue" (which holds the actual text content for our text elements)
                (domNode as Text).nodeValue = props[name] as string;
            } else if (name === "className" && domNode instanceof HTMLElement) {
                (domNode as HTMLElement).className = props[name] as string;
            } else if (
                name.startsWith("on") &&
                domNode instanceof HTMLElement
            ) {
                // Event handling will be expanded later
            } else if (domNode instanceof HTMLElement) {
                (domNode as HTMLElement).setAttribute(
                    name,
                    props[name] as string, // Simplification for now, will need to handle different props types alter
                );
            }
        });

    if (props.children && props.children.length > 0) {
        // biome-ignore lint/complexity/noForEach: <explanation>
        props.children.forEach((childElementOrText) => {
            // If childElementOrText is already a MiniReactElement (e.g., from createTextElement),
            // it will be handled correctly.
            // If it were a raw string/number not wrapped by createTextElement,
            // we'd need to handle that case here or ensure createElement always wraps.
            // Our current createElement wraps primitives, so childElementOrText should be an Element.
            const childDomNode = createDomNodeFromElement(
                childElementOrText as MiniReactElement,
            );
            if (childDomNode) {
                domNode.appendChild(childDomNode);
            }
        });
    }

    return domNode;
}
