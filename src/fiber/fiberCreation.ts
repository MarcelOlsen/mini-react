/**
 * Fiber Creation Functions
 *
 * These functions create new Fiber instances from various element types.
 * The key insight is work-in-progress (WIP) fiber pooling: we reuse fibers
 * between renders to avoid garbage collection pressure.
 */

import type { AnyMiniReactElement, ElementType } from "../core/types";
import { FRAGMENT, PORTAL, TEXT_ELEMENT } from "../core/types";
import { NoEffect, NoLanes } from "./fiberFlags";
import type { Fiber, Props } from "./types";

/**
 * Create a new Fiber instance
 *
 * This is the low-level fiber creation function.
 * Most code should use createFiberFromElement instead.
 *
 * @param type The element type (string, function, symbol, or null for root)
 * @param pendingProps The props for this fiber
 * @param key The reconciliation key
 * @returns A new Fiber instance
 */
export function createFiber(
	type: ElementType | null,
	pendingProps: Props,
	key: string | null,
): Fiber {
	const fiber: Fiber = {
		// Identity
		type,
		key,

		// Tree structure
		return: null,
		child: null,
		sibling: null,
		index: 0,

		// Work-in-progress / current
		alternate: null,
		effectTag: NoEffect,
		nextEffect: null,
		firstEffect: null,
		lastEffect: null,

		// Props and state
		props: pendingProps,
		pendingProps,
		memoizedProps: null,
		memoizedState: null,

		// Update queue
		updateQueue: null,

		// Refs
		ref: null,

		// DOM
		stateNode: null,

		// Hooks
		hooks: null,
		hookCursor: 0,

		// Context
		contextValues: null,

		// Error handling
		errorBoundary: null,

		// Suspense
		suspenseState: null,

		// Priority
		lanes: NoLanes,
		childLanes: NoLanes,

		// Deletion tracking
		deletions: [],
	};

	return fiber;
}

/**
 * Create or reuse a work-in-progress fiber
 *
 * This is the CORE of fiber pooling and double-buffering.
 *
 * During reconciliation, we alternate between two fiber trees:
 * - current: what's on screen
 * - workInProgress: what we're building
 *
 * They point to each other via the `alternate` property.
 *
 * @param current The current fiber (what's committed)
 * @param pendingProps The new props to apply
 * @returns A work-in-progress fiber
 */
export function createWorkInProgress(
	current: Fiber,
	pendingProps: Props,
): Fiber {
	let workInProgress = current.alternate;

	if (workInProgress === null) {
		// No existing WIP fiber - create a new one
		workInProgress = createFiber(current.type, pendingProps, current.key);

		// Copy immutable properties
		workInProgress.stateNode = current.stateNode;
		workInProgress.index = current.index;

		// Set up the alternate relationship
		workInProgress.alternate = current;
		current.alternate = workInProgress;
	} else {
		// Reuse existing WIP fiber
		workInProgress.pendingProps = pendingProps;
		workInProgress.type = current.type;

		// Reset effect fields (we'll recalculate them)
		workInProgress.effectTag = NoEffect;
		workInProgress.nextEffect = null;
		workInProgress.firstEffect = null;
		workInProgress.lastEffect = null;

		// Reset deletion tracking
		workInProgress.deletions = [];
	}

	// Clone mutable properties from current
	// These will be updated during reconciliation
	workInProgress.child = current.child;
	workInProgress.sibling = current.sibling;
	workInProgress.memoizedProps = current.memoizedProps;
	workInProgress.memoizedState = current.memoizedState;
	workInProgress.updateQueue = current.updateQueue;
	workInProgress.hooks = current.hooks;
	workInProgress.hookCursor = current.hookCursor;

	// Refs
	workInProgress.ref = current.ref;

	// Context
	workInProgress.contextValues = current.contextValues;

	// Error boundary
	workInProgress.errorBoundary = current.errorBoundary;

	// Priority
	workInProgress.lanes = current.lanes;
	workInProgress.childLanes = current.childLanes;

	// Copy the return pointer
	workInProgress.return = current.return;

	return workInProgress;
}

/**
 * Create a fiber from a MiniReact element
 *
 * This is the main entry point for creating fibers during reconciliation.
 *
 * @param element The element to create a fiber for
 * @returns A new Fiber instance
 */
export function createFiberFromElement(element: AnyMiniReactElement): Fiber {
	// Handle primitives (strings, numbers, booleans)
	if (
		typeof element === "string" ||
		typeof element === "number" ||
		typeof element === "boolean"
	) {
		return createFiberFromText(element);
	}

	// Handle null/undefined
	if (element === null || element === undefined) {
		throw new Error("Cannot create fiber from null or undefined element");
	}

	// Type guard: ensure we have an object with type and props
	if (
		typeof element !== "object" ||
		!("type" in element) ||
		!("props" in element)
	) {
		throw new Error("Invalid element passed to createFiberFromElement");
	}

	const { type, props } = element;
	const key = getKeyFromProps(props);

	// Handle text elements
	if (type === TEXT_ELEMENT) {
		const textProps = props as { nodeValue: string | number };
		return createFiberFromText(textProps.nodeValue);
	}

	// Handle fragments
	if (type === FRAGMENT) {
		const fragmentProps = props as { children: AnyMiniReactElement[] };
		return createFiberFromFragment(fragmentProps.children, key);
	}

	// Handle portals
	if (type === PORTAL) {
		return createFiberFromPortal(element, key);
	}

	// Handle host components (div, span, etc) and functional components
	const fiber = createFiber(type, props as Props, key);

	return fiber;
}

/**
 * Create a fiber for text content
 *
 * @param content The text content (string, number, or boolean)
 * @returns A text fiber
 */
export function createFiberFromText(content: string | number | boolean): Fiber {
	const textString = String(content);

	const fiber = createFiber(
		TEXT_ELEMENT,
		{
			nodeValue: textString,
			children: [],
		},
		null, // Text nodes don't have keys
	);

	return fiber;
}

/**
 * Create a fiber for a fragment
 *
 * Fragments are special - they don't create DOM nodes,
 * they just group children together.
 *
 * @param children The fragment's children
 * @param key Optional key for reconciliation
 * @returns A fragment fiber
 */
export function createFiberFromFragment(
	children: AnyMiniReactElement[],
	key: string | null,
): Fiber {
	const fiber = createFiber(
		FRAGMENT,
		{
			children,
		},
		key,
	);

	return fiber;
}

/**
 * Create a fiber for a portal
 *
 * Portals render their children into a different DOM container
 * while maintaining the React tree relationship.
 *
 * @param portalElement The portal element
 * @param key Optional key for reconciliation
 * @returns A portal fiber
 */
export function createFiberFromPortal(
	portalElement: AnyMiniReactElement,
	key: string | null,
): Fiber {
	// Type guard for portal
	if (
		typeof portalElement !== "object" ||
		!portalElement ||
		!("props" in portalElement)
	) {
		throw new Error("Invalid portal element");
	}

	const fiber = createFiber(PORTAL, portalElement.props as Props, key);

	return fiber;
}

/**
 * Clone a fiber (used during reconciliation)
 *
 * This is similar to createWorkInProgress but for child fibers
 * that we want to reuse.
 *
 * @param fiber The fiber to clone
 * @param pendingProps New props for the clone
 * @returns A cloned fiber with the new props
 */
export function cloneFiber(fiber: Fiber, pendingProps: Props): Fiber {
	const clone = createWorkInProgress(fiber, pendingProps);

	// Reset sibling and index (will be set by reconciliation)
	clone.index = 0;
	clone.sibling = null;

	return clone;
}

/**
 * Extract the key from props
 *
 * @param props The props object
 * @returns The key string or null
 */
function getKeyFromProps(props: unknown): string | null {
	if (props && typeof props === "object" && "key" in props) {
		const key = (props as Record<string, unknown>).key;
		return key !== undefined && key !== null ? String(key) : null;
	}
	return null;
}

/**
 * Get the key from an element
 *
 * @param element The element
 * @returns The key string or null
 */
export function getElementKey(element: AnyMiniReactElement): string | null {
	// Handle primitives
	if (
		typeof element === "string" ||
		typeof element === "number" ||
		typeof element === "boolean" ||
		element === null ||
		element === undefined
	) {
		return null;
	}

	// Extract key from props
	if (typeof element === "object" && "props" in element) {
		return getKeyFromProps(element.props);
	}

	return null;
}

/**
 * Get props from an element
 *
 * @param element The element
 * @returns The props object
 */
export function getElementProps(element: AnyMiniReactElement): Props {
	// Handle primitives
	if (
		typeof element === "string" ||
		typeof element === "number" ||
		typeof element === "boolean"
	) {
		return { nodeValue: element, children: [] };
	}

	if (element === null || element === undefined) {
		return { children: [] };
	}

	// Extract props from element
	if (typeof element === "object" && "props" in element) {
		return element.props as Props;
	}

	return { children: [] };
}

/**
 * Get the type from an element
 *
 * @param element The element
 * @returns The element type
 */
export function getElementType(
	element: AnyMiniReactElement,
): ElementType | null {
	// Handle primitives
	if (
		typeof element === "string" ||
		typeof element === "number" ||
		typeof element === "boolean"
	) {
		return TEXT_ELEMENT;
	}

	if (element === null || element === undefined) {
		return null;
	}

	// Extract type from element
	if (typeof element === "object" && "type" in element) {
		return element.type as ElementType;
	}

	return null;
}
