/* **************** */
/* Type Definitions */
/* **************** */

export type AnyMiniReactElement = MiniReactElement | InternalTextElement;

export type FunctionalComponent<P = Record<string, unknown>> = (
    props: P & { children?: AnyMiniReactElement[] },
) => AnyMiniReactElement | null;

export type ElementType =
    | string
    | FunctionalComponent<Record<string, unknown>>
    | ((...args: never[]) => AnyMiniReactElement | null);

export interface MiniReactElement {
    type: ElementType;
    props: Record<string, unknown> & { children: AnyMiniReactElement[] };
}

export interface TextElementProps {
    nodeValue: string | number;
    [key: string]: unknown;
}

export interface InternalTextElement {
    type: typeof TEXT_ELEMENT;
    props: TextElementProps & { children: [] };
}

export const TEXT_ELEMENT = "TEXT_ELEMENT";

// ********** //
// Hook Types //
// ********** //

export interface Hook {
    state: unknown;
    setState: (newState: unknown) => void;
}

export type UseStateHook<T> = [T, (newState: T | ((prevState: T) => T)) => void];

// ******************* //
// VDOM Instance Types //
// ******************* //

export interface VDOMInstance {
    element: AnyMiniReactElement;
    dom: Node | null;
    childInstances: VDOMInstance[];
    hooks?: Hook[];
}
