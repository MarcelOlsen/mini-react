/* **************** */
/* Type Definitions */
/* **************** */

import type { SyntheticEvent } from "./eventSystem";

export type AnyMiniReactElement = MiniReactElement | InternalTextElement;

export type FunctionalComponent<P = Record<string, unknown>> = (
	props: P & { children?: AnyMiniReactElement[] },
) => AnyMiniReactElement | null;

export type ElementType =
	| string
	| FunctionalComponent<Record<string, unknown>>
	| ((...args: never[]) => AnyMiniReactElement | null);

// Event handler types for common events
export interface EventHandlers {
	onClick?: (event: SyntheticEvent<HTMLElement>) => void;
	onDoubleClick?: (event: SyntheticEvent<HTMLElement>) => void;
	onMouseDown?: (event: SyntheticEvent<HTMLElement>) => void;
	onMouseUp?: (event: SyntheticEvent<HTMLElement>) => void;
	onMouseOver?: (event: SyntheticEvent<HTMLElement>) => void;
	onMouseOut?: (event: SyntheticEvent<HTMLElement>) => void;
	onMouseEnter?: (event: SyntheticEvent<HTMLElement>) => void;
	onMouseLeave?: (event: SyntheticEvent<HTMLElement>) => void;
	onContextMenu?: (event: SyntheticEvent<HTMLElement>) => void;
	onChange?: (event: SyntheticEvent<HTMLInputElement>) => void;
	onInput?: (event: SyntheticEvent<HTMLInputElement>) => void;
	onSubmit?: (event: SyntheticEvent<HTMLFormElement>) => void;
	onFocus?: (event: SyntheticEvent<HTMLElement>) => void;
	onBlur?: (event: SyntheticEvent<HTMLElement>) => void;
	onKeyDown?: (event: SyntheticEvent<HTMLElement>) => void;
	onKeyUp?: (event: SyntheticEvent<HTMLElement>) => void;
	onKeyPress?: (event: SyntheticEvent<HTMLElement>) => void;
	onLoad?: (event: SyntheticEvent<HTMLElement>) => void;
	onError?: (event: SyntheticEvent<HTMLElement>) => void;
	onWheel?: (event: SyntheticEvent<HTMLElement>) => void;
	onScroll?: (event: SyntheticEvent<HTMLElement>) => void;
	onResize?: (event: SyntheticEvent<HTMLElement>) => void;
	onTouchStart?: (event: SyntheticEvent<HTMLElement>) => void;
	onTouchMove?: (event: SyntheticEvent<HTMLElement>) => void;
	onTouchEnd?: (event: SyntheticEvent<HTMLElement>) => void;
	onTouchCancel?: (event: SyntheticEvent<HTMLElement>) => void;

	// Capture phase variants
	onClickCapture?: (event: SyntheticEvent<HTMLElement>) => void;
	onDoubleClickCapture?: (event: SyntheticEvent<HTMLElement>) => void;
	onMouseDownCapture?: (event: SyntheticEvent<HTMLElement>) => void;
	onMouseUpCapture?: (event: SyntheticEvent<HTMLElement>) => void;
	onFocusCapture?: (event: SyntheticEvent<HTMLElement>) => void;
	onBlurCapture?: (event: SyntheticEvent<HTMLElement>) => void;
	onKeyDownCapture?: (event: SyntheticEvent<HTMLElement>) => void;
	onKeyUpCapture?: (event: SyntheticEvent<HTMLElement>) => void;
}

export interface MiniReactElement {
	type: ElementType;
	props: Record<string, unknown> &
		EventHandlers & { children: AnyMiniReactElement[] };
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

export interface StateHook<T = unknown> {
	type: "state";
	state: T;
	setState: (newState: T | ((prevState: T) => T)) => void;
}

export interface EffectHook {
	type: "effect";
	callback: EffectCallback;
	cleanup?: () => void;
	dependencies?: DependencyList;
	hasRun: boolean;
}

export type Hook<T = unknown> = StateHook<T> | EffectHook;

export type UseStateHook<T> = [
	T,
	(newState: T | ((prevState: T) => T)) => void,
];

// Effect types
export type EffectCallback = (() => void) | (() => () => void);
export type DependencyList = readonly unknown[];

export type UseEffectHook = (
	callback: EffectCallback,
	dependencies?: DependencyList,
) => void;

// ******************* //
// VDOM Instance Types //
// ******************* //

export interface VDOMInstance {
	element: AnyMiniReactElement;
	dom: Node | null;
	childInstances: VDOMInstance[];
	hooks?: Hook<unknown>[];
	hookCursor?: number;
}
