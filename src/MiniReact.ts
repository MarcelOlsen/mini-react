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
	EffectCallback,
	DependencyList,
	Reducer,
	MutableRefObject,
} from "./core/types";

// Fiber-based hooks
export {
	useStateFiber as useState,
	useEffectFiber as useEffect,
	useReducerFiber as useReducer,
	useRefFiber as useRef,
	useMemoFiber as useMemo,
	useCallbackFiber as useCallback,
} from "./fiber";

// Context
export { createContext, useContext } from "./context";
export type { MiniReactContext } from "./context/types";

// Fragments
export { FRAGMENT as Fragment } from "./core/types";

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
import { createElement, render } from "./core";
import { FRAGMENT as Fragment } from "./core/types";
import type { FunctionalComponent } from "./core/types";
import {
	useCallbackFiber as useCallback,
	useEffectFiber as useEffect,
	useMemoFiber as useMemo,
	useReducerFiber as useReducer,
	useRefFiber as useRef,
	useStateFiber as useState,
} from "./fiber";
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
	(MemoizedComponent as unknown as Record<string, unknown>)["__memo"] = {
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

// Export event system for advanced usage
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
