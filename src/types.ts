/* **************** */
/* Type Definitions */
/* **************** */

import type { SyntheticEvent } from "./eventSystem";

export type AnyMiniReactElement =
	| MiniReactElement
	| InternalTextElement
	| PortalElement
	| string
	| number
	| boolean
	| null
	| undefined;

// Type for JSX function return values (excludes primitives)
export type JSXElementType =
	| MiniReactElement
	| InternalTextElement
	| PortalElement;

export type FunctionalComponent<P = Record<string, unknown>> = (
	props: P & { children?: AnyMiniReactElement[] },
) => AnyMiniReactElement | null;

export type ElementType =
	| string
	| FunctionalComponent<Record<string, unknown>>
	| ((...args: never[]) => AnyMiniReactElement | null)
	| typeof FRAGMENT
	| typeof PORTAL;

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
export const FRAGMENT = Symbol("react.fragment");
export const PORTAL = Symbol("react.portal");

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

export interface ContextHook<T = unknown> {
	type: "context";
	context: MiniReactContext<T>;
	value: T;
}

export interface ReducerHook<State = unknown, Action = unknown> {
	type: "reducer";
	state: State;
	reducer: (state: State, action: Action) => State;
	dispatch: (action: Action) => void;
}

<<<<<<< HEAD
=======
export interface RefHook<T = unknown> {
	type: "ref";
	current: T;
}

>>>>>>> master
/**
 * Union type for hooks stored in component instances.
 * Note: The generic parameter T only applies to StateHook and ContextHook, EffectHook ignores it.
 */
export type StateOrEffectHook<T = unknown> =
	| StateHook<T>
	| EffectHook
	| ContextHook<T>
<<<<<<< HEAD
	| ReducerHook<T, unknown>;
=======
	| ReducerHook<T, unknown>
	| RefHook<T>;
>>>>>>> master

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

// Reducer types
export type Reducer<State, Action> = (state: State, action: Action) => State;
export type ReducerStateWithoutAction<R> = R extends Reducer<infer S, unknown>
	? S
	: never;
export type ReducerActionWithoutState<R> = R extends Reducer<unknown, infer A>
	? A
	: never;

export type UseReducerHook = {
	<R extends Reducer<unknown, unknown>, I>(
		reducer: R,
		initializerArg: I,
		initializer: (arg: I) => ReducerStateWithoutAction<R>,
	): [
		ReducerStateWithoutAction<R>,
		(action: ReducerActionWithoutState<R>) => void,
	];
	<R extends Reducer<unknown, unknown>>(
		reducer: R,
		initialState: ReducerStateWithoutAction<R>,
	): [
		ReducerStateWithoutAction<R>,
		(action: ReducerActionWithoutState<R>) => void,
	];
};

<<<<<<< HEAD
=======
// Ref types
export type MutableRefObject<T> = {
	current: T;
};

export type UseRefHook = <T>(initialValue: T) => MutableRefObject<T>;

>>>>>>> master
// ******************* //
// VDOM Instance Types //
// ******************* //

export interface VDOMInstance {
	element: JSXElementType;
	dom: Node | null;
	childInstances: VDOMInstance[];
	parent?: VDOMInstance;
	hooks?: StateOrEffectHook<unknown>[];
	hookCursor?: number;
	contextValues?: Map<symbol, unknown>; // For context providers
	rootContainer?: HTMLElement; // Track root container for root-level instances
}

// ***************** //
// Context API Types //
// ***************** //

export interface MiniReactContext<T = unknown> {
	_currentValue: T;
	_defaultValue: T;
	_contextId: symbol;
	Provider: FunctionalComponent<{ value: T; children?: AnyMiniReactElement[] }>;
}

export type UseContextHook = <T>(context: MiniReactContext<T>) => T;

export interface PortalElement {
	type: typeof PORTAL;
	props: {
		children: AnyMiniReactElement[];
		targetContainer: HTMLElement;
	};
}
