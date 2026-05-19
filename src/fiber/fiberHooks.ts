/* **************** */
/* Fiber Hooks Implementation */
/* **************** */

/**
 * Implements React hooks for the fiber architecture.
 * Hooks are stored as a linked list in fiber.memoizedState.
 */

import type { FunctionalComponent } from "../core/types";
import { flagsOr, laneOr } from "./bitwise";
import {
	areHookInputsEqual,
	createEffect,
	createEffectToFiber,
} from "./effectList";
import { findFiberRoot } from "./fiberUtils";
import { SyncLane } from "./lanes";
import type {
	Effect,
	EffectCreate,
	Fiber,
	Hook,
	Lane,
	Lanes,
	Update,
	UpdateQueue,
} from "./types";
import { HookEffectTag, NoLanes, Passive } from "./types";
import { scheduleUpdateOnFiber } from "./workLoop";

// ============================================
// Hook State
// ============================================

/**
 * The fiber we're currently rendering.
 */
let currentlyRenderingFiber: Fiber | null = null;

/**
 * The hook we're currently working on.
 */
let workInProgressHook: Hook | null = null;

/**
 * The corresponding hook from the current tree.
 */
let currentHook: Hook | null = null;

// ============================================
// Hook Dispatchers
// ============================================

/**
 * Dispatcher for mounting hooks (first render).
 */
const HooksDispatcherOnMount = {
	useState: mountState,
	useReducer: mountReducer,
	useEffect: mountEffect,
	useLayoutEffect: mountLayoutEffect,
	useRef: mountRef,
	useMemo: mountMemo,
	useCallback: mountCallback,
	useContext: readContext,
};

/**
 * Dispatcher for updating hooks (re-renders).
 */
const HooksDispatcherOnUpdate = {
	useState: updateState,
	useReducer: updateReducer,
	useEffect: updateEffect,
	useLayoutEffect: updateLayoutEffect,
	useRef: updateRef,
	useMemo: updateMemo,
	useCallback: updateCallback,
	useContext: readContext,
};

/**
 * Current dispatcher.
 */
let ReactCurrentDispatcher:
	| typeof HooksDispatcherOnMount
	| typeof HooksDispatcherOnUpdate = HooksDispatcherOnMount;

// ============================================
// Render Entry Point
// ============================================

/**
 * Renders a function component with hooks support.
 */
export function renderWithHooks<Props extends Record<string, unknown>>(
	current: Fiber | null,
	workInProgress: Fiber,
	Component: FunctionalComponent<Props>,
	props: Props,
	_nextRenderLanes: Lanes,
): ReturnType<FunctionalComponent<Props>> {
	// Set the current fiber
	currentlyRenderingFiber = workInProgress;

	// Set the dispatcher based on mount/update
	if (current === null || current.memoizedState === null) {
		// Mount - reset state for fresh hooks
		workInProgress.memoizedState = null;
		workInProgress.updateQueue = null;
		workInProgress.lanes = NoLanes;
		ReactCurrentDispatcher = HooksDispatcherOnMount;
	} else {
		// Update - reset memoizedState to force proper hook cloning
		// Note: createWorkInProgressFiber copies the pointer, not the object.
		// We must reset it so updateWorkInProgressHook clones hooks properly.
		// Create a fresh updateQueue so we don't modify the current tree's effects
		// (the current tree's effects are needed for cleanup during commit)
		workInProgress.memoizedState = null;
		workInProgress.updateQueue = null; // Create fresh queue, don't share
		workInProgress.lanes = NoLanes;
		ReactCurrentDispatcher = HooksDispatcherOnUpdate;
	}

	// Render the component
	let children: ReturnType<FunctionalComponent<Props>>;
	try {
		children = Component(props);
	} finally {
		// Reset hooks state - must happen even if rendering throws
		currentlyRenderingFiber = null;
		currentHook = null;
		workInProgressHook = null;
	}

	return children;
}

// ============================================
// Hook Mounting
// ============================================

/**
 * Mounts a new hook and returns it.
 */
function mountWorkInProgressHook(): Hook {
	const hook: Hook = {
		memoizedState: null,
		baseState: null,
		baseQueue: null,
		queue: null,
		next: null,
	};

	if (workInProgressHook === null) {
		// First hook in the list
		if (currentlyRenderingFiber === null) {
			throw new Error("Hooks can only be called inside a function component");
		}
		currentlyRenderingFiber.memoizedState = hook;
		workInProgressHook = hook;
	} else {
		// Append to the list
		workInProgressHook.next = hook;
		workInProgressHook = hook;
	}

	return workInProgressHook;
}

/**
 * Updates an existing hook.
 */
function updateWorkInProgressHook(): Hook {
	// Get the corresponding hook from the current tree
	let nextCurrentHook: Hook | null;

	if (currentHook === null) {
		// First hook in the update
		const current = currentlyRenderingFiber?.alternate;
		if (current !== null && current !== undefined) {
			nextCurrentHook = current.memoizedState as Hook | null;
		} else {
			nextCurrentHook = null;
		}
	} else {
		nextCurrentHook = currentHook.next;
	}

	// Get the corresponding hook from the work-in-progress tree
	let nextWorkInProgressHook: Hook | null;

	if (workInProgressHook === null) {
		nextWorkInProgressHook =
			(currentlyRenderingFiber?.memoizedState as Hook | null) ?? null;
	} else {
		nextWorkInProgressHook = workInProgressHook.next;
	}

	if (nextWorkInProgressHook !== null) {
		// We already have a work-in-progress hook
		workInProgressHook = nextWorkInProgressHook;
		currentHook = nextCurrentHook;
		return workInProgressHook;
	}

	// Clone from current
	if (nextCurrentHook === null) {
		throw new Error("Rendered more hooks than during the previous render");
	}

	currentHook = nextCurrentHook;

	const newHook: Hook = {
		memoizedState: currentHook.memoizedState,
		baseState: currentHook.baseState,
		baseQueue: currentHook.baseQueue,
		queue: currentHook.queue,
		next: null,
	};

	if (workInProgressHook === null) {
		// First hook in the list
		if (currentlyRenderingFiber === null) {
			throw new Error("Hooks can only be called inside a function component");
		}
		currentlyRenderingFiber.memoizedState = newHook;
		workInProgressHook = newHook;
	} else {
		workInProgressHook.next = newHook;
		workInProgressHook = newHook;
	}

	return workInProgressHook;
}

// ============================================
// useState
// ============================================

type BasicStateAction<S> = S | ((prevState: S) => S);

function mountState<S>(
	initialState: S | (() => S),
): [S, (action: BasicStateAction<S>) => void] {
	const hook = mountWorkInProgressHook();

	// Handle lazy initial state
	const state =
		typeof initialState === "function"
			? (initialState as () => S)()
			: initialState;

	hook.memoizedState = state;
	hook.baseState = state;

	const queue: UpdateQueue<S> = {
		pending: null,
		lanes: NoLanes,
		dispatch: null,
		lastRenderedReducer: basicStateReducer,
		lastRenderedState: state,
	};
	hook.queue = queue as UpdateQueue<unknown>;

	if (currentlyRenderingFiber === null) {
		throw new Error("Hooks can only be called inside a function component");
	}
	const dispatch = dispatchAction.bind(
		null,
		currentlyRenderingFiber,
		queue as UpdateQueue<unknown>,
	) as (action: BasicStateAction<S>) => void;
	queue.dispatch = dispatch as UpdateQueue<S>["dispatch"];

	return [state, dispatch];
}

function updateState<S>(
	_initialState: S | (() => S),
): [S, (action: BasicStateAction<S>) => void] {
	return updateReducer(
		basicStateReducer as unknown as (
			state: S,
			action: BasicStateAction<S>,
		) => S,
	);
}

function basicStateReducer<S>(state: S, action: BasicStateAction<S>): S {
	return typeof action === "function"
		? (action as (prevState: S) => S)(state)
		: action;
}

// ============================================
// useReducer
// ============================================

function mountReducer<S, A>(
	reducer: (state: S, action: A) => S,
	initialArg?: S,
	init?: (arg: S) => S,
): [S, (action: A) => void] {
	const hook = mountWorkInProgressHook();

	const initialState =
		init !== undefined ? init(initialArg as S) : (initialArg as S);

	hook.memoizedState = initialState;
	hook.baseState = initialState;

	const queue: UpdateQueue<unknown> = {
		pending: null,
		lanes: NoLanes,
		dispatch: null,
		lastRenderedReducer: reducer as (
			state: unknown,
			action: unknown,
		) => unknown,
		lastRenderedState: initialState,
	};
	hook.queue = queue;

	if (currentlyRenderingFiber === null) {
		throw new Error("Hooks can only be called inside a function component");
	}
	const dispatch = dispatchAction.bind(
		null,
		currentlyRenderingFiber,
		queue,
	) as (action: A) => void;
	queue.dispatch = dispatch as UpdateQueue<unknown>["dispatch"];

	return [initialState, dispatch];
}

function updateReducer<S, A>(
	reducer: (state: S, action: A) => S,
): [S, (action: A) => void] {
	const hook = updateWorkInProgressHook();
	const queue = hook.queue as UpdateQueue<S>;

	if (queue === null) {
		throw new Error("Should have a queue. This is likely a bug in React.");
	}

	queue.lastRenderedReducer =
		reducer as unknown as UpdateQueue<S>["lastRenderedReducer"];

	if (currentHook === null) {
		throw new Error("Rendered fewer hooks than expected.");
	}
	const current = currentHook;
	let baseQueue = current.baseQueue as Update<S> | null;

	// Check if there are pending updates
	const pendingQueue = queue.pending;
	if (pendingQueue !== null) {
		// Merge pending with base
		if (baseQueue !== null) {
			// Merge the two queues
			const baseFirst = baseQueue.next;
			const pendingFirst = pendingQueue.next;
			baseQueue.next = pendingFirst;
			pendingQueue.next = baseFirst;
		}
		current.baseQueue = pendingQueue as Update<unknown>;
		queue.pending = null;
		baseQueue = pendingQueue;
	}

	if (baseQueue !== null) {
		const first = baseQueue.next;
		let newState = current.baseState as S;
		let update = first;

		do {
			if (update === null) {
				break;
			}

			const action = update.action as A;
			newState = reducer(newState, action);
			update = update.next;
		} while (update !== null && update !== first);

		hook.memoizedState = newState;
		hook.baseState = newState;
		hook.baseQueue = null; // Clear after processing to prevent reprocessing
		queue.lastRenderedState = newState;
	}

	if (queue.dispatch === null) {
		throw new Error("Dispatch function not initialized.");
	}
	const dispatch = queue.dispatch;
	return [hook.memoizedState as S, dispatch as (action: A) => void];
}

// ============================================
// Dispatch Functions
// ============================================

function dispatchAction(
	fiber: Fiber,
	queue: UpdateQueue<unknown>,
	action: unknown,
): void {
	const lane = SyncLane;

	const update: Update<unknown> = {
		lane,
		action,
		hasEagerState: false,
		eagerState: null,
		next: null,
	};

	// Eager state computation for bailout
	const lastRenderedReducer = queue.lastRenderedReducer;
	if (lastRenderedReducer !== null) {
		const currentState = queue.lastRenderedState;
		const eagerState = lastRenderedReducer(currentState, action);
		update.hasEagerState = true;
		update.eagerState = eagerState;

		if (Object.is(eagerState, currentState)) {
			// Bailout - state hasn't changed
			return;
		}
	}

	enqueueUpdate(queue, update, lane);
	scheduleUpdate(fiber, lane);
}

function enqueueUpdate<S>(
	queue: UpdateQueue<S>,
	update: Update<S>,
	lane: Lane,
): void {
	const pending = queue.pending;
	if (pending === null) {
		// First update, create circular list
		update.next = update;
	} else {
		update.next = pending.next;
		pending.next = update;
	}
	queue.pending = update;
	queue.lanes = laneOr(queue.lanes, lane);
}

function scheduleUpdate(fiber: Fiber, lane: Lane): void {
	const root = findFiberRoot(fiber);
	if (root !== null) {
		scheduleUpdateOnFiber(root, fiber, lane);
	}
}

// ============================================
// useEffect / useLayoutEffect
// ============================================

function mountEffect(
	create: EffectCreate,
	deps: readonly unknown[] | undefined,
): void {
	mountEffectImpl(
		HookEffectTag.Passive | HookEffectTag.HasEffect,
		create,
		deps,
	);
}

function updateEffect(
	create: EffectCreate,
	deps: readonly unknown[] | undefined,
): void {
	updateEffectImpl(
		HookEffectTag.Passive,
		HookEffectTag.Passive | HookEffectTag.HasEffect,
		create,
		deps,
	);
}

function mountLayoutEffect(
	create: EffectCreate,
	deps: readonly unknown[] | undefined,
): void {
	mountEffectImpl(HookEffectTag.Layout | HookEffectTag.HasEffect, create, deps);
}

function updateLayoutEffect(
	create: EffectCreate,
	deps: readonly unknown[] | undefined,
): void {
	updateEffectImpl(
		HookEffectTag.Layout,
		HookEffectTag.Layout | HookEffectTag.HasEffect,
		create,
		deps,
	);
}

function mountEffectImpl(
	tag: HookEffectTag,
	create: EffectCreate,
	deps: readonly unknown[] | undefined,
): void {
	const hook = mountWorkInProgressHook();
	const nextDeps = deps === undefined ? null : deps;

	// Mark fiber as having passive effects
	if (currentlyRenderingFiber !== null) {
		currentlyRenderingFiber.flags = flagsOr(
			currentlyRenderingFiber.flags,
			Passive,
		);
	}

	const effect = createEffect(tag, create, undefined, nextDeps);
	hook.memoizedState = effect;

	if (currentlyRenderingFiber !== null) {
		createEffectToFiber(currentlyRenderingFiber, effect);
	}
}

function updateEffectImpl(
	passiveTag: HookEffectTag,
	effectTag: HookEffectTag,
	create: EffectCreate,
	deps: readonly unknown[] | undefined,
): void {
	const hook = updateWorkInProgressHook();
	const nextDeps = deps === undefined ? null : deps;
	let destroy: (() => void) | undefined;

	if (currentHook !== null) {
		const prevEffect = currentHook.memoizedState as Effect;
		destroy = prevEffect.destroy;

		if (nextDeps !== null) {
			const prevDeps = prevEffect.deps;
			if (areHookInputsEqual(nextDeps, prevDeps)) {
				// No change, keep the existing effect
				const effect = createEffect(passiveTag, create, destroy, nextDeps);
				hook.memoizedState = effect;
				if (currentlyRenderingFiber !== null) {
					createEffectToFiber(currentlyRenderingFiber, effect);
				}
				return;
			}
		}
	}

	// Effect needs to run
	if (currentlyRenderingFiber !== null) {
		currentlyRenderingFiber.flags = flagsOr(
			currentlyRenderingFiber.flags,
			Passive,
		);
	}

	const effect = createEffect(effectTag, create, destroy, nextDeps);
	hook.memoizedState = effect;

	if (currentlyRenderingFiber !== null) {
		createEffectToFiber(currentlyRenderingFiber, effect);
	}
}

// ============================================
// useRef
// ============================================

type MutableRefObject<T> = { current: T };

function mountRef<T>(initialValue: T): MutableRefObject<T> {
	const hook = mountWorkInProgressHook();
	const ref: MutableRefObject<T> = { current: initialValue };
	hook.memoizedState = ref;
	return ref;
}

function updateRef<T>(_initialValue: T): MutableRefObject<T> {
	const hook = updateWorkInProgressHook();
	return hook.memoizedState as MutableRefObject<T>;
}

// ============================================
// useMemo
// ============================================

function mountMemo<T>(
	nextCreate: () => T,
	deps: readonly unknown[] | undefined,
): T {
	const hook = mountWorkInProgressHook();
	const nextDeps = deps === undefined ? null : deps;
	const nextValue = nextCreate();
	hook.memoizedState = [nextValue, nextDeps];
	return nextValue;
}

function updateMemo<T>(
	nextCreate: () => T,
	deps: readonly unknown[] | undefined,
): T {
	const hook = updateWorkInProgressHook();
	const nextDeps = deps === undefined ? null : deps;
	const prevState = hook.memoizedState as [T, readonly unknown[] | null];

	if (prevState !== null) {
		if (nextDeps !== null) {
			const prevDeps = prevState[1];
			if (areHookInputsEqual(nextDeps, prevDeps)) {
				return prevState[0];
			}
		}
	}

	const nextValue = nextCreate();
	hook.memoizedState = [nextValue, nextDeps];
	return nextValue;
}

// ============================================
// useCallback
// ============================================

function mountCallback<T extends (...args: unknown[]) => unknown>(
	callback: T,
	deps: readonly unknown[] | undefined,
): T {
	const hook = mountWorkInProgressHook();
	const nextDeps = deps === undefined ? null : deps;
	hook.memoizedState = [callback, nextDeps];
	return callback;
}

function updateCallback<T extends (...args: unknown[]) => unknown>(
	callback: T,
	deps: readonly unknown[] | undefined,
): T {
	const hook = updateWorkInProgressHook();
	const nextDeps = deps === undefined ? null : deps;
	const prevState = hook.memoizedState as [T, readonly unknown[] | null];

	if (prevState !== null) {
		if (nextDeps !== null) {
			const prevDeps = prevState[1];
			if (areHookInputsEqual(nextDeps, prevDeps)) {
				return prevState[0];
			}
		}
	}

	hook.memoizedState = [callback, nextDeps];
	return callback;
}

// ============================================
// useContext
// ============================================

function readContext<T>(context: { _currentValue: T }): T {
	return context._currentValue;
}

// ============================================
// Public Hook Exports
// ============================================

/**
 * useState hook for fiber architecture.
 */
export function useStateFiber<S>(
	initialState: S | (() => S),
): [S, (action: BasicStateAction<S>) => void] {
	if (currentlyRenderingFiber === null) {
		throw new Error("useState must be called inside a functional component");
	}
	return ReactCurrentDispatcher.useState(initialState);
}

/**
 * useReducer hook for fiber architecture.
 */
export function useReducerFiber<S, A, I>(
	reducer: (state: S, action: A) => S,
	initialArg: I,
	init: (arg: I) => S,
): [S, (action: A) => void];
export function useReducerFiber<S, A>(
	reducer: (state: S, action: A) => S,
	initialArg: S,
): [S, (action: A) => void];
export function useReducerFiber<S, A, I = S>(
	reducer: (state: S, action: A) => S,
	initialArg: S | I,
	init?: (arg: I) => S,
): [S, (action: A) => void] {
	if (currentlyRenderingFiber === null) {
		throw new Error("useReducer must be called inside a functional component");
	}
	return ReactCurrentDispatcher.useReducer(
		reducer,
		initialArg as S,
		init as ((arg: S) => S) | undefined,
	);
}

/**
 * useEffect hook for fiber architecture.
 */
export function useEffectFiber(
	create: EffectCreate,
	deps?: readonly unknown[],
): void {
	if (currentlyRenderingFiber === null) {
		throw new Error("useEffect must be called inside a functional component");
	}
	ReactCurrentDispatcher.useEffect(create, deps);
}

/**
 * useLayoutEffect hook for fiber architecture.
 */
export function useLayoutEffectFiber(
	create: EffectCreate,
	deps?: readonly unknown[],
): void {
	if (currentlyRenderingFiber === null) {
		throw new Error(
			"useLayoutEffect must be called inside a functional component",
		);
	}
	ReactCurrentDispatcher.useLayoutEffect(create, deps);
}

/**
 * useRef hook for fiber architecture.
 */
export function useRefFiber<T>(initialValue: T): MutableRefObject<T> {
	if (currentlyRenderingFiber === null) {
		throw new Error("useRef must be called inside a functional component");
	}
	return ReactCurrentDispatcher.useRef(initialValue);
}

/**
 * useMemo hook for fiber architecture.
 */
export function useMemoFiber<T>(create: () => T, deps?: readonly unknown[]): T {
	if (currentlyRenderingFiber === null) {
		throw new Error("useMemo must be called inside a functional component");
	}
	return ReactCurrentDispatcher.useMemo(create, deps);
}

/**
 * useCallback hook for fiber architecture.
 */
export function useCallbackFiber<T extends (...args: unknown[]) => unknown>(
	callback: T,
	deps?: readonly unknown[],
): T {
	if (currentlyRenderingFiber === null) {
		throw new Error("useCallback must be called inside a functional component");
	}
	return ReactCurrentDispatcher.useCallback(callback, deps);
}

/**
 * useContext hook for fiber architecture.
 */
export function useContextFiber<T>(context: { _currentValue: T }): T {
	return ReactCurrentDispatcher.useContext(context);
}

// ============================================
// Debug/Test Utilities
// ============================================

/**
 * Gets the currently rendering fiber.
 */
export function getCurrentlyRenderingFiber(): Fiber | null {
	return currentlyRenderingFiber;
}

/**
 * Checks if hooks are being rendered.
 */
export function isRenderingHooks(): boolean {
	return currentlyRenderingFiber !== null;
}
