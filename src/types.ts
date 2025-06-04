/* **************** */
/* Type Definitions */
/* **************** */

export type AnyMiniReactElement = MiniReactElement | InternalTextElement;

export type FunctionalComponent = (
	props: Record<string, unknown> & { children?: AnyMiniReactElement[] },
) => AnyMiniReactElement | null;

export type ElementType = string | FunctionalComponent;

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

// **************** //
// VDOM Instance Types //
// **************** //

export interface VDOMInstance {
	element: AnyMiniReactElement;
	dom: Node | null;
	childInstances: VDOMInstance[];
}
