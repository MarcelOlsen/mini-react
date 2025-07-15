/* ***************** */
/* JSX Runtime API   */
/* ***************** */

import { createElement } from "../core";
import type { ElementType, JSXElementType } from "../core/types";
import type { JSXDEVProps, JSXSource } from "./types";

/**
 * JSX runtime function for elements with no children or single child
 * Used by modern JSX transformation
 */
export function jsx(
	type: ElementType,
	props: JSXDEVProps | null,
	key?: string | number,
): JSXElementType {
	const { children, ...restProps } = props || {};
	const finalProps = { ...restProps };

	if (key !== undefined) {
		finalProps.key = key;
	}

	// Handle children
	if (children !== undefined) {
		if (Array.isArray(children)) {
			return createElement(type, finalProps, ...children);
		}
		return createElement(type, finalProps, children);
	}

	return createElement(type, finalProps);
}

/**
 * JSX runtime function for elements with multiple static children
 * Used by modern JSX transformation for performance optimization
 */
export function jsxs(
	type: ElementType,
	props: JSXDEVProps | null,
	key?: string | number,
): JSXElementType {
	// jsxs is identical to jsx in our implementation
	// The distinction is made by the JSX transformer for optimization hints
	return jsx(type, props, key);
}

/**
 * JSX runtime function for development mode with additional debugging info
 * Used in development builds for better error messages and debugging
 */
export function jsxDEV(
	type: ElementType,
	props: JSXDEVProps | null,
	key?: string | number,
	_isStaticChildren?: boolean,
	source?: JSXSource,
	_self?: unknown,
): JSXElementType {
	// In development mode, we could add additional debugging information
	// For now, we'll just delegate to jsx but could extend with:
	// - Component stack traces
	// - Source location tracking
	// - Runtime prop validation

	const element = jsx(type, props, key);

	// Store development metadata if needed (for future dev tools support)
	if (source && typeof element === "object" && element !== null) {
		(element as unknown as Record<string, unknown>).__source = source;
	}

	return element;
}
