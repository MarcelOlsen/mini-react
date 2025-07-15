/* ********** */
/* Hook Types */
/* ********** */

import type { MiniReactContext } from "../context/types";

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

export interface RefHook<T = unknown> {
	type: "ref";
	current: T;
}

export interface MemoHook<T = unknown> {
	type: "memo";
	value: T;
	dependencies?: DependencyList;
	hasComputed: boolean;
}

export interface CallbackHook<
	T extends (...args: unknown[]) => unknown = (...args: unknown[]) => unknown,
> {
	type: "callback";
	callback: T;
	dependencies?: DependencyList;
}

/**
 * Union type for hooks stored in component instances.
 * Note: The generic parameter T only applies to StateHook and ContextHook, EffectHook ignores it.
 */
export type StateOrEffectHook<T = unknown> =
	| StateHook<T>
	| EffectHook
	| ContextHook<T>
	| ReducerHook<T, unknown>
	| RefHook<T>
	| MemoHook<T>
	| CallbackHook<(...args: unknown[]) => unknown>;

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

// Ref types
export type MutableRefObject<T> = {
	current: T;
};

export type UseRefHook = <T>(initialValue: T) => MutableRefObject<T>;
