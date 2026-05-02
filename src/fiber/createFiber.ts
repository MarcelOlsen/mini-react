/* **************** */
/* Fiber Creation Factory */
/* **************** */

import {
	type AnyMiniReactElement,
	FRAGMENT,
	type InternalTextElement,
	type MiniReactElement,
	PORTAL,
	TEXT_ELEMENT,
} from "../core/types";
import type { PortalElement } from "../portals/types";
import {
	type Fiber,
	type FiberRoot,
	type Lane,
	type Lanes,
	NoFlags,
	NoLanes,
	type PortalStateNode,
	type RootTag,
	WorkTag,
} from "./types";

// ============================================
// Fiber Creation Factory
// ============================================

/**
 * Creates a new fiber node with default values.
 * This is the base factory function used by all other fiber creators.
 */
export function createFiber(
	tag: (typeof WorkTag)[keyof typeof WorkTag],
	pendingProps: Record<string, unknown>,
	key: string | null,
	_mode = 0,
): Fiber {
	return {
		// Instance Identity
		tag,
		key,
		elementType: null,
		type: null,
		stateNode: null,

		// Fiber Tree Structure
		return: null,
		child: null,
		sibling: null,
		index: 0,

		// Ref
		ref: null,
		refCleanup: null,

		// Props and State
		pendingProps,
		memoizedProps: null,
		memoizedState: null,
		updateQueue: null,

		// Context
		dependencies: null,

		// Effects
		flags: NoFlags,
		subtreeFlags: NoFlags,
		deletions: null,

		// Lanes
		lanes: NoLanes,
		childLanes: NoLanes,

		// Double buffering
		alternate: null,
	};
}

/**
 * Creates a fiber from a MiniReact element.
 * Handles different element types (host, function, text, portal, fragment).
 */
export function createFiberFromElement(
	element: AnyMiniReactElement,
	lanes: Lanes,
): Fiber {
	// Handle null/undefined/boolean - create placeholder
	if (
		element === null ||
		element === undefined ||
		typeof element === "boolean"
	) {
		return createFiberFromText("", lanes);
	}

	// Handle primitives (string/number) as text
	if (typeof element === "string" || typeof element === "number") {
		return createFiberFromText(element, lanes);
	}

	const elementObj = element as
		| MiniReactElement
		| InternalTextElement
		| PortalElement;

	// Handle text elements
	if ("type" in elementObj && elementObj.type === TEXT_ELEMENT) {
		const textElement = elementObj as InternalTextElement;
		return createFiberFromText(textElement.props.nodeValue, lanes);
	}

	// Handle portals
	if ("type" in elementObj && elementObj.type === PORTAL) {
		const portalElement = elementObj as PortalElement;
		return createFiberFromPortal(portalElement, lanes);
	}

	// Handle regular elements
	const miniReactElement = elementObj as MiniReactElement;
	const type = miniReactElement.type;
	const key = (miniReactElement.props["key"] as string | null) ?? null;

	// Determine the tag based on element type
	let fiberTag: (typeof WorkTag)[keyof typeof WorkTag];

	if (type === FRAGMENT) {
		return createFiberFromFragment(miniReactElement.props.children, lanes, key);
	}

	if (typeof type === "function") {
		// Check if it's a memo component (via $$typeof or __memo)
		if (
			("$$typeof" in type &&
				(type as unknown as { $$typeof: symbol }).$$typeof ===
					Symbol.for("react.memo")) ||
			"__memo" in type
		) {
			fiberTag = WorkTag.MemoComponent;
		} else {
			fiberTag = WorkTag.FunctionComponent;
		}
	} else if (typeof type === "string") {
		fiberTag = WorkTag.HostComponent;
	} else {
		// IndeterminateComponent as fallback
		fiberTag = WorkTag.IndeterminateComponent;
	}

	const fiber = createFiber(fiberTag, miniReactElement.props, key);
	fiber.elementType = type;
	fiber.type = type;
	fiber.lanes = lanes;

	// Extract ref from props and set on fiber
	const ref = miniReactElement.props["ref"];
	if (ref !== undefined && ref !== null) {
		fiber.ref = ref as Fiber["ref"];
	}

	return fiber;
}

/**
 * Creates a fiber for a text node.
 */
export function createFiberFromText(
	content: string | number,
	lanes: Lanes,
): Fiber {
	const fiber = createFiber(WorkTag.HostText, { nodeValue: content }, null);
	fiber.lanes = lanes;
	return fiber;
}

/**
 * Creates a fiber for a fragment.
 */
export function createFiberFromFragment(
	children: AnyMiniReactElement[] | undefined,
	lanes: Lanes,
	key: string | null,
): Fiber {
	const fiber = createFiber(
		WorkTag.Fragment,
		{ children: children ?? [] },
		key,
	);
	fiber.elementType = FRAGMENT;
	fiber.type = FRAGMENT;
	fiber.lanes = lanes;
	return fiber;
}

/**
 * Creates a fiber for a portal.
 */
export function createFiberFromPortal(
	portal: PortalElement,
	lanes: Lanes,
): Fiber {
	const fiber = createFiber(
		WorkTag.HostPortal,
		{
			children: portal.props.children,
			containerInfo: portal.props.targetContainer,
		},
		null,
	);
	fiber.elementType = PORTAL;
	fiber.type = PORTAL;

	const portalStateNode: PortalStateNode = {
		containerInfo: portal.props.targetContainer,
	};
	fiber.stateNode = portalStateNode;

	fiber.lanes = lanes;
	return fiber;
}

/**
 * Creates the root fiber for a host tree.
 * This is the fiber that represents the container element.
 */
export function createHostRootFiber(
	_tag: (typeof RootTag)[keyof typeof RootTag],
): Fiber {
	const fiber = createFiber(WorkTag.HostRoot, {}, null);
	fiber.elementType = null;
	fiber.type = null;
	return fiber;
}

/**
 * Creates a FiberRoot which wraps the host root fiber.
 * The FiberRoot is the top-level container that manages the entire tree.
 */
export function createFiberRoot(
	containerInfo: Element,
	tag: (typeof RootTag)[keyof typeof RootTag],
	initialChildren: AnyMiniReactElement | null,
): FiberRoot {
	const root: FiberRoot = {
		tag,
		containerInfo,
		current: null as unknown as Fiber, // Will be set below
		finishedWork: null,
		pendingChildren: initialChildren,

		// Scheduling
		pendingLanes: NoLanes,
		suspendedLanes: NoLanes,
		pingedLanes: NoLanes,
		expiredLanes: NoLanes,
		finishedLanes: NoLanes,

		// Callbacks
		callbackNode: null,
		callbackPriority: 0 as Lane,

		// Timing
		expirationTimes: new Map(),

		// Hydration
		isDehydrated: false,
		mutableSourceEagerHydrationData: null,
	};

	// Create the initial host root fiber
	const uninitializedFiber = createHostRootFiber(tag);
	root.current = uninitializedFiber;
	uninitializedFiber.stateNode = root;

	// Initialize the update queue for the root
	initializeUpdateQueue(uninitializedFiber);

	return root;
}

/**
 * Initialize the update queue for a fiber.
 * Used primarily for the host root fiber.
 */
function initializeUpdateQueue(fiber: Fiber): void {
	fiber.updateQueue = {
		baseState: fiber.memoizedState,
		firstBaseUpdate: null,
		lastBaseUpdate: null,
		shared: {
			pending: null,
			lanes: NoLanes,
		},
		effects: null,
	};
}

/**
 * Creates a work-in-progress fiber from the current fiber.
 * Reuses the alternate if it exists (double buffering).
 */
export function createWorkInProgress(
	current: Fiber,
	pendingProps: Record<string, unknown>,
): Fiber {
	let workInProgress = current.alternate;

	if (workInProgress === null) {
		// No existing alternate, create a new fiber
		workInProgress = createFiber(current.tag, pendingProps, current.key);
		workInProgress.elementType = current.elementType;
		workInProgress.type = current.type;
		workInProgress.stateNode = current.stateNode;

		// Set up the alternate links
		workInProgress.alternate = current;
		current.alternate = workInProgress;
	} else {
		// Reuse the existing alternate
		workInProgress.pendingProps = pendingProps;
		workInProgress.type = current.type;

		// Reset effect flags
		workInProgress.flags = NoFlags;
		workInProgress.subtreeFlags = NoFlags;
		workInProgress.deletions = null;
	}

	// Copy from current
	workInProgress.childLanes = current.childLanes;
	workInProgress.lanes = current.lanes;

	workInProgress.child = current.child;
	workInProgress.memoizedProps = current.memoizedProps;
	workInProgress.memoizedState = current.memoizedState;
	workInProgress.updateQueue = current.updateQueue;

	workInProgress.dependencies = current.dependencies;

	workInProgress.sibling = current.sibling;
	workInProgress.index = current.index;
	workInProgress.ref = current.ref;
	workInProgress.refCleanup = current.refCleanup;

	return workInProgress;
}

/**
 * Reset a work-in-progress fiber for a fresh render.
 * Called when we bail out but still need to propagate work.
 */
export function resetWorkInProgress(
	workInProgress: Fiber,
	_renderLanes: Lanes,
): Fiber {
	// Reset flags but keep the alternate relationship
	workInProgress.flags = NoFlags;
	workInProgress.subtreeFlags = NoFlags;
	workInProgress.deletions = null;

	// Reset child pointers, we're about to re-reconcile
	workInProgress.child = null;
	workInProgress.memoizedState = null;
	workInProgress.updateQueue = null;

	return workInProgress;
}

// ============================================
// Utility Functions
// ============================================

/**
 * Check if an element is a text element.
 */
export function isTextElement(
	element: AnyMiniReactElement,
): element is InternalTextElement {
	return (
		element !== null &&
		typeof element === "object" &&
		"type" in element &&
		element.type === TEXT_ELEMENT
	);
}

/**
 * Check if an element is a portal element.
 */
export function isPortalElement(
	element: AnyMiniReactElement,
): element is PortalElement {
	return (
		element !== null &&
		typeof element === "object" &&
		"type" in element &&
		element.type === PORTAL
	);
}

/**
 * Check if an element is a fragment element.
 */
export function isFragmentElement(
	element: AnyMiniReactElement,
): element is MiniReactElement & { type: typeof FRAGMENT } {
	return (
		element !== null &&
		typeof element === "object" &&
		"type" in element &&
		element.type === FRAGMENT
	);
}

/**
 * Get the key from a MiniReact element.
 */
export function getElementKey(element: AnyMiniReactElement): string | null {
	if (
		element !== null &&
		typeof element === "object" &&
		"props" in element &&
		typeof element.props === "object" &&
		element.props !== null
	) {
		return (
			((element.props as Record<string, unknown>)["key"] as string | null) ??
			null
		);
	}
	return null;
}

/**
 * Check if two elements have the same type (for reconciliation).
 */
export function isSameElementType(
	element: AnyMiniReactElement,
	fiber: Fiber,
): boolean {
	if (element === null || element === undefined) {
		return false;
	}

	// Handle primitives
	if (typeof element === "string" || typeof element === "number") {
		return fiber.tag === WorkTag.HostText;
	}

	if (typeof element === "boolean") {
		return false;
	}

	const elementObj = element as
		| MiniReactElement
		| InternalTextElement
		| PortalElement;

	// Handle text elements
	if ("type" in elementObj && elementObj.type === TEXT_ELEMENT) {
		return fiber.tag === WorkTag.HostText;
	}

	// Handle portals - must also match container
	if ("type" in elementObj && elementObj.type === PORTAL) {
		if (fiber.tag !== WorkTag.HostPortal) {
			return false;
		}
		const portalElement = elementObj as PortalElement;
		const fiberContainer = (
			fiber.stateNode as { containerInfo: Element } | null
		)?.containerInfo;
		return fiberContainer === portalElement.props.targetContainer;
	}

	// Handle fragments
	if ("type" in elementObj && elementObj.type === FRAGMENT) {
		return fiber.tag === WorkTag.Fragment;
	}

	// Handle regular elements
	if ("type" in elementObj) {
		return fiber.elementType === elementObj.type;
	}

	return false;
}

/**
 * Clone a fiber and its children for bailout.
 */
export function cloneFiber(
	fiber: Fiber,
	pendingProps: Record<string, unknown>,
): Fiber {
	const clone = createFiber(fiber.tag, pendingProps, fiber.key);
	clone.elementType = fiber.elementType;
	clone.type = fiber.type;
	clone.stateNode = fiber.stateNode;
	clone.return = fiber.return;
	clone.child = fiber.child;
	clone.sibling = fiber.sibling;
	clone.index = fiber.index;
	clone.ref = fiber.ref;
	clone.refCleanup = fiber.refCleanup;
	clone.memoizedProps = fiber.memoizedProps;
	clone.memoizedState = fiber.memoizedState;
	clone.updateQueue = fiber.updateQueue;
	clone.dependencies = fiber.dependencies;
	clone.flags = fiber.flags;
	clone.subtreeFlags = fiber.subtreeFlags;
	clone.deletions = fiber.deletions;
	clone.lanes = fiber.lanes;
	clone.childLanes = fiber.childLanes;
	clone.alternate = fiber.alternate;
	return clone;
}
