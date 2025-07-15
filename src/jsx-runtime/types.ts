/* ***************** */
/* JSX Runtime Types */
/* ***************** */

import type {
	AnyMiniReactElement,
	ElementType,
	JSXElementType,
} from "../core/types";

export interface JSXSource {
	fileName?: string;
	lineNumber?: number;
	columnNumber?: number;
}

export interface JSXDEVProps {
	children?:
		| AnyMiniReactElement
		| AnyMiniReactElement[]
		| string
		| number
		| null
		| undefined;
	[key: string]: unknown;
}

/**
 * JSX runtime function type for elements with no children or single child
 * Used by modern JSX transformation
 */
export type JSXFunction = (
	type: ElementType,
	props: JSXDEVProps | null,
	key?: string | number,
) => JSXElementType;

/**
 * JSX runtime function type for elements with multiple static children
 * Used by modern JSX transformation for performance optimization
 */
export type JSXSFunction = (
	type: ElementType,
	props: JSXDEVProps | null,
	key?: string | number,
) => JSXElementType;

/**
 * JSX runtime function type for development mode with additional debugging info
 * Used in development builds for better error messages and debugging
 */
export type JSXDEVFunction = (
	type: ElementType,
	props: JSXDEVProps | null,
	key?: string | number,
	_isStaticChildren?: boolean,
	source?: JSXSource,
	_self?: unknown,
) => JSXElementType;
