/* ***************** */
/* MiniReact Library */
/* ***************** */

// Core functionality
export { createElement, render } from "./core";
export type {
	AnyMiniReactElement,
	JSXElementType,
	FunctionalComponent,
	ElementType,
	MiniReactElement,
} from "./core/types";

// Hooks
export {
	useState,
	useEffect,
	useReducer,
	useRef,
	useMemo,
	useCallback,
} from "./hooks";
export type {
	UseStateHook,
	UseEffectHook,
	UseReducerHook,
	UseRefHook,
	EffectCallback,
	DependencyList,
	Reducer,
	MutableRefObject,
} from "./hooks/types";

// Context
export { createContext, useContext } from "./context";
export type { MiniReactContext } from "./context/types";

// Fragments
export { Fragment } from "./fragments";

// Portals
export { createPortal } from "./portals";

// Performance
export {
	startProfiling,
	stopProfiling,
	getPerformanceMetrics,
} from "./performance";
export type { PerformanceMetrics } from "./performance/types";

// JSX Runtime
export { jsx, jsxs, jsxDEV } from "./jsx-runtime";

// Event System
export type { SyntheticEvent } from "./events/types";

import { createContext, useContext } from "./context";
// Higher-order components
import { createElement, render } from "./core";
import type { FunctionalComponent, VDOMInstance } from "./core/types";
import { Fragment } from "./fragments";
import {
	useCallback,
	useEffect,
	useMemo,
	useReducer,
	useRef,
	useState,
} from "./hooks";
import { jsx, jsxDEV, jsxs } from "./jsx-runtime";
import {
	getPerformanceMetrics,
	startProfiling,
	stopProfiling,
} from "./performance";
import { createPortal } from "./portals";

/**
 * Higher-order component that memoizes a functional component
 * Only re-renders when props change (shallow comparison)
 */
export function memo<P extends Record<string, unknown>>(
	Component: FunctionalComponent<P>,
	areEqual?: (prevProps: P, nextProps: P) => boolean,
): FunctionalComponent<P> {
	const MemoizedComponent: FunctionalComponent<P> = (props: P) => {
		return Component(props);
	};

	// Store the comparison function and original component for reconciliation
	(MemoizedComponent as unknown as Record<string, unknown>).__memo = {
		Component,
		areEqual: areEqual || shallowEqual,
	};

	return MemoizedComponent;
}

/**
 * Default shallow equality comparison for memo
 */
function shallowEqual<P extends Record<string, unknown>>(
	prevProps: P,
	nextProps: P,
): boolean {
	// Filter out children property as it's not part of meaningful props for memoization
	const prevKeys = Object.keys(prevProps).filter((key) => key !== "children");
	const nextKeys = Object.keys(nextProps).filter((key) => key !== "children");

	if (prevKeys.length !== nextKeys.length) {
		return false;
	}

	for (const key of prevKeys) {
		if (prevProps[key] !== nextProps[key]) {
			return false;
		}
	}

	return true;
}

import {
	popContextValues,
	pushContextValues,
	setContextRenderInstance,
} from "./context";
// Set up cross-module dependencies
import { scheduleEffect, setHookContext } from "./hooks";
import {
	setContextHooks,
	setHookContext as setReconcilerHookContext,
	setScheduleEffect,
} from "./reconciler";

// Initialize cross-module dependencies
setScheduleEffect(scheduleEffect);
setContextHooks(pushContextValues, popContextValues);
setReconcilerHookContext(setHookContext);
// Connect context render instance to hooks render instance
setReconcilerHookContext((instance: VDOMInstance | null) => {
	setHookContext(instance);
	setContextRenderInstance(instance);
});

// Export internal utilities for advanced usage
export { setHookContext } from "./hooks";
export { eventSystem } from "./events";

// Constants
export { TEXT_ELEMENT, FRAGMENT, PORTAL } from "./core/types";

// Default export for convenience
const MiniReact = {
	createElement,
	render,
	useState,
	useEffect,
	useReducer,
	useRef,
	useMemo,
	useCallback,
	createContext,
	useContext,
	Fragment,
	createPortal,
	memo,
	startProfiling,
	stopProfiling,
	getPerformanceMetrics,
	jsx,
	jsxs,
	jsxDEV,
};

export default MiniReact;
