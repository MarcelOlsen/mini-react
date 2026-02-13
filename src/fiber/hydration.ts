/* **************** */
/* Hydration - SSR Rehydration */
/* **************** */

/**
 * Implements SSR hydration for the fiber architecture.
 * Attaches event handlers and reconciles with existing DOM.
 */

import type { AnyMiniReactElement } from "../core/types";
import { eventSystem } from "../events/eventSystem";
import {
	type SerializedFiberRoot,
	createFiberFromSerialized,
	parseSerializedRoot,
} from "./resumability";
import type { Fiber, FiberRoot, Lane } from "./types";
import { NoFlags, NoLanes, SyncLane, WorkTag, createLanes } from "./types";
import { scheduleUpdateOnFiber } from "./workLoop";

// ============================================
// Hydration Options
// ============================================

/**
 * Options for hydrating a root.
 */
export type HydrateRootOptions = {
	/** Called when hydration produces a mismatch */
	onRecoverableError?: (error: Error) => void;
	/** Serialized state to restore */
	serializedState?: string;
	/** Whether to suppress hydration mismatch warnings in development */
	suppressHydrationWarning?: boolean;
};

// ============================================
// Hydration State
// ============================================

/**
 * Whether we're currently hydrating.
 */
let isHydrating = false;

/**
 * The current hydration target node.
 */
let hydrationTargetNode: Node | null = null;

/**
 * Stack of hydration nodes for nested elements.
 */
const hydrationNodeStack: Node[] = [];

// ============================================
// Hydration Entry Points
// ============================================

/**
 * Creates a hydrating fiber root.
 * Attaches to existing server-rendered DOM.
 *
 * @param container - The container with server-rendered content
 * @param element - The React element to hydrate
 * @param options - Hydration options
 * @returns The fiber root
 */
export function hydrateRoot(
	container: Element,
	element: AnyMiniReactElement,
	options?: HydrateRootOptions,
): FiberRoot {
	// Initialize event system
	eventSystem.initialize(container);
	eventSystem.enableFiberMode();

	// Create the root fiber
	const hostRootFiber: Fiber = {
		tag: WorkTag.HostRoot,
		key: null,
		elementType: null,
		type: null,
		stateNode: null,
		return: null,
		child: null,
		sibling: null,
		index: 0,
		ref: null,
		refCleanup: null,
		pendingProps: { children: element },
		memoizedProps: null,
		memoizedState: null,
		updateQueue: null,
		dependencies: null,
		flags: NoFlags,
		subtreeFlags: NoFlags,
		deletions: null,
		lanes: NoLanes,
		childLanes: NoLanes,
		alternate: null,
	};

	// Create the FiberRoot
	const root: FiberRoot = {
		tag: 1, // HydrationRoot
		containerInfo: container,
		current: hostRootFiber,
		finishedWork: null,
		pendingChildren: element,
		pendingLanes: NoLanes,
		suspendedLanes: NoLanes,
		pingedLanes: NoLanes,
		expiredLanes: NoLanes,
		finishedLanes: NoLanes,
		callbackNode: null,
		callbackPriority: 0 as Lane,
		expirationTimes: new Map(),
		isDehydrated: true,
		mutableSourceEagerHydrationData: null,
	};

	// Link them
	hostRootFiber.stateNode = root;

	// Restore state if provided
	if (options?.serializedState) {
		const serialized = parseSerializedRoot(options.serializedState);
		if (serialized !== null) {
			restoreStateFromSerialized(root, serialized);
		}
	}

	// Schedule hydration
	root.pendingLanes = createLanes(
		(root.pendingLanes as number) | (SyncLane as number),
	);
	scheduleUpdateOnFiber(root, hostRootFiber, SyncLane);

	return root;
}

/**
 * Restores state from serialized data.
 *
 * @param root - The fiber root
 * @param serialized - The serialized state
 */
function restoreStateFromSerialized(
	_root: FiberRoot,
	serialized: SerializedFiberRoot,
): void {
	// Create a fiber structure from serialized data
	// This will be used to restore hook state during hydration
	const restoredFiber = createFiberFromSerialized(serialized.root);

	// Store for later use during hydration
	hydrationStateMap.set("root", restoredFiber);
}

/**
 * Map for storing restored state during hydration.
 */
const hydrationStateMap = new Map<string, Fiber>();

// ============================================
// Hydration Phase
// ============================================

/**
 * Enters hydration mode.
 *
 * @param container - The container to hydrate
 */
export function enterHydrationState(container: Element): void {
	isHydrating = true;
	hydrationTargetNode = container.firstChild;
}

/**
 * Exits hydration mode.
 */
export function exitHydrationState(): void {
	isHydrating = false;
	hydrationTargetNode = null;
	hydrationNodeStack.length = 0;
	hydrationStateMap.clear();
}

/**
 * Checks if we're currently hydrating.
 */
export function getIsHydrating(): boolean {
	return isHydrating;
}

// ============================================
// Hydration Reconciliation
// ============================================

/**
 * Attempts to hydrate a fiber with an existing DOM node.
 *
 * @param fiber - The fiber to hydrate
 * @returns true if hydration succeeded, false otherwise
 */
export function tryToClaimNextHydratableInstance(fiber: Fiber): boolean {
	if (!isHydrating) {
		return false;
	}

	if (hydrationTargetNode === null) {
		// No more nodes to hydrate
		return false;
	}

	const instance = hydrationTargetNode;

	// Check if the node matches the fiber
	if (!canHydrateInstance(fiber, instance)) {
		// Mismatch - need to insert a new node
		warnOnHydrationMismatch(fiber, instance);
		return false;
	}

	// Claim this node (cast to Element since we verified it's an element node)
	fiber.stateNode = instance as Element;

	// Register with event system
	eventSystem.registerFiber(fiber, instance);

	// Register event handlers if the fiber has props
	if (fiber.pendingProps) {
		eventSystem.hasEventHandlers(fiber.pendingProps as Record<string, unknown>);
	}

	// Move to next sibling for next hydration
	hydrationTargetNode = instance.nextSibling;

	return true;
}

/**
 * Attempts to hydrate a text fiber.
 *
 * @param fiber - The text fiber to hydrate
 * @returns true if hydration succeeded, false otherwise
 */
export function tryToClaimNextHydratableTextInstance(fiber: Fiber): boolean {
	if (!isHydrating) {
		return false;
	}

	if (hydrationTargetNode === null) {
		return false;
	}

	const instance = hydrationTargetNode;

	// Must be a text node
	if (instance.nodeType !== Node.TEXT_NODE) {
		return false;
	}

	// Claim this node (cast to Text since we verified it's a text node)
	fiber.stateNode = instance as Text;

	// Register with event system
	eventSystem.registerFiber(fiber, instance);

	// Move to next sibling
	hydrationTargetNode = instance.nextSibling;

	return true;
}

/**
 * Checks if an existing DOM node can be used for a fiber.
 *
 * @param fiber - The fiber to check
 * @param instance - The DOM node to check against
 * @returns true if the node matches the fiber
 */
function canHydrateInstance(fiber: Fiber, instance: Node): boolean {
	switch (fiber.tag) {
		case WorkTag.HostComponent: {
			if (instance.nodeType !== Node.ELEMENT_NODE) {
				return false;
			}
			const element = instance as Element;
			const type = fiber.type as string;
			return element.nodeName.toLowerCase() === type.toLowerCase();
		}

		case WorkTag.HostText: {
			return instance.nodeType === Node.TEXT_NODE;
		}

		default:
			return false;
	}
}

/**
 * Prepares to hydrate children of a fiber.
 *
 * @param fiber - The parent fiber
 */
export function prepareToHydrateHostInstance(fiber: Fiber): void {
	if (!isHydrating) {
		return;
	}

	const instance = fiber.stateNode as Element;
	if (instance === null) {
		return;
	}

	// Push current target to stack
	if (hydrationTargetNode !== null) {
		hydrationNodeStack.push(hydrationTargetNode);
	}

	// Set target to first child
	hydrationTargetNode = instance.firstChild;
}

/**
 * Completes hydration of a fiber's children.
 *
 * @param fiber - The parent fiber
 */
export function popHydrationState(fiber: Fiber): void {
	if (!isHydrating) {
		return;
	}

	// Check for extra children that weren't hydrated
	if (hydrationTargetNode !== null) {
		warnOnExtraChildren(fiber, hydrationTargetNode);
	}

	// Pop from stack
	if (hydrationNodeStack.length > 0) {
		hydrationTargetNode = hydrationNodeStack.pop() ?? null;
	} else {
		hydrationTargetNode = null;
	}
}

// ============================================
// Hydration Warnings
// ============================================

/**
 * Warns when there's a hydration mismatch.
 */
function warnOnHydrationMismatch(fiber: Fiber, instance: Node): void {
	if (process.env.NODE_ENV !== "production") {
		const fiberType =
			fiber.type !== null ? String(fiber.type) : `tag:${fiber.tag}`;
		const instanceType =
			instance.nodeType === Node.ELEMENT_NODE
				? (instance as Element).tagName.toLowerCase()
				: `#${instance.nodeType}`;

		console.warn(
			`Hydration mismatch: Expected ${fiberType} but found ${instanceType}`,
		);
	}
}

/**
 * Warns when there are extra children not in the fiber tree.
 */
function warnOnExtraChildren(fiber: Fiber, _node: Node): void {
	if (process.env.NODE_ENV !== "production") {
		const parentType =
			fiber.type !== null ? String(fiber.type) : `tag:${fiber.tag}`;
		console.warn(
			`Hydration: Found extra child node in ${parentType}. Server rendered more nodes than expected.`,
		);
	}
}

// ============================================
// State Restoration
// ============================================

/**
 * Gets restored state for a fiber during hydration.
 *
 * @param fiber - The fiber to get state for
 * @param key - The component key
 * @returns Restored memoized state or null
 */
export function getRestoredState(
	fiber: Fiber,
	key: string | null,
): unknown | null {
	const restoredRoot = hydrationStateMap.get("root");
	if (restoredRoot === null || restoredRoot === undefined) {
		return null;
	}

	// Find matching fiber in restored tree
	const match = findMatchingFiber(restoredRoot, fiber, key);
	if (match !== null) {
		return match.memoizedState;
	}

	return null;
}

/**
 * Finds a matching fiber in the restored tree.
 *
 * @param restoredFiber - The restored fiber tree
 * @param targetFiber - The fiber to match
 * @param key - The component key
 * @returns Matching fiber or null
 */
function findMatchingFiber(
	restoredFiber: Fiber,
	targetFiber: Fiber,
	key: string | null,
): Fiber | null {
	// Check if this fiber matches
	if (
		restoredFiber.tag === targetFiber.tag &&
		restoredFiber.key === key &&
		restoredFiber.type === targetFiber.type
	) {
		return restoredFiber;
	}

	// Search children
	let child = restoredFiber.child;
	while (child !== null) {
		const match = findMatchingFiber(child, targetFiber, key);
		if (match !== null) {
			return match;
		}
		child = child.sibling;
	}

	return null;
}

// ============================================
// Exports
// ============================================

export { isHydrating, hydrationTargetNode };
