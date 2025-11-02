/**
 * FiberRoot Management
 *
 * FiberRoot represents the container for a fiber tree.
 * Each ReactDOM.render() call creates one FiberRoot.
 */

import { NoLanes } from "./fiberFlags";
import type { Fiber, FiberRoot } from "./types";

/**
 * WeakMap to track FiberRoots by their container elements
 * WeakMap allows garbage collection when containers are removed
 */
const rootsByContainer = new WeakMap<HTMLElement, FiberRoot>();

/**
 * Create a new FiberRoot for a container element
 *
 * @param containerInfo The DOM element that will contain the React tree
 * @returns A new FiberRoot instance
 */
export function createFiberRoot(containerInfo: HTMLElement): FiberRoot {
	// Create the root fiber (the top of the fiber tree)
	const uninitializedFiber = createHostRootFiber();

	const root: FiberRoot = {
		// Container
		containerInfo,

		// Fiber tree
		current: uninitializedFiber,
		finishedWork: null,

		// Context
		context: null,
		pendingContext: null,

		// Scheduling
		callbackNode: null,
		callbackPriority: 0,

		// Concurrent mode (Phase 15)
		eventTimes: [],
		expirationTimes: [],

		// Effects
		pendingPassiveEffects: [],
	};

	// Link the fiber back to the root
	// This circular reference allows us to find the root from any fiber
	uninitializedFiber.stateNode = root;

	// Store in WeakMap for retrieval
	rootsByContainer.set(containerInfo, root);

	return root;
}

/**
 * Create the root fiber (the fiber at the top of the tree)
 *
 * The root fiber is special:
 * - type is null (it's not a component)
 * - stateNode is the FiberRoot (set by createFiberRoot)
 */
function createHostRootFiber(): Fiber {
	return {
		// Identity
		type: null, // Root has no type
		key: null,

		// Tree structure
		return: null, // Root has no parent
		child: null,
		sibling: null,
		index: 0,

		// Work-in-progress
		alternate: null,
		effectTag: 0, // NoEffect
		nextEffect: null,
		firstEffect: null,
		lastEffect: null,

		// Props and state
		props: {},
		pendingProps: {},
		memoizedProps: null,
		memoizedState: null,

		// Update queue
		updateQueue: null,

		// Refs
		ref: null,

		// DOM
		stateNode: null, // Will be set to FiberRoot by createFiberRoot

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
}

/**
 * Get the FiberRoot for a container element
 *
 * @param container The DOM container element
 * @returns The FiberRoot or null if none exists
 */
export function getFiberRoot(container: HTMLElement): FiberRoot | null {
	return rootsByContainer.get(container) || null;
}

/**
 * Check if a container has a FiberRoot
 *
 * @param container The DOM container element
 * @returns True if the container has a FiberRoot
 */
export function hasFiberRoot(container: HTMLElement): boolean {
	return rootsByContainer.has(container);
}

/**
 * Remove the FiberRoot for a container (cleanup on unmount)
 *
 * @param container The DOM container element
 */
export function deleteFiberRoot(container: HTMLElement): void {
	rootsByContainer.delete(container);
}

/**
 * Walk up from a fiber to find its FiberRoot
 *
 * @param fiber Any fiber in the tree
 * @returns The FiberRoot for this fiber's tree
 */
export function getFiberRootFromFiber(fiber: Fiber): FiberRoot {
	let node = fiber;

	// Walk up to the root fiber
	while (node.return !== null) {
		node = node.return;
	}

	// Root fiber's stateNode is the FiberRoot
	if (
		node.stateNode &&
		typeof node.stateNode === "object" &&
		"containerInfo" in node.stateNode
	) {
		return node.stateNode as FiberRoot;
	}

	throw new Error("Unable to find FiberRoot from fiber");
}

/**
 * Get the root container element from a fiber
 *
 * @param fiber Any fiber in the tree
 * @returns The container HTMLElement
 */
export function getContainerFromFiber(fiber: Fiber): HTMLElement {
	const root = getFiberRootFromFiber(fiber);
	return root.containerInfo;
}

/**
 * Clear the container's content (used during unmount)
 *
 * @param container The DOM container element
 */
export function clearContainer(container: HTMLElement): void {
	container.innerHTML = "";
}
