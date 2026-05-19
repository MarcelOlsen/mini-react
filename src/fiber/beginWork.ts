/* **************** */
/* Begin Work - Render Phase Entry */
/* **************** */

/**
 * Implements the "begin" phase of fiber reconciliation.
 * This is where we decide what work needs to be done for each fiber.
 */

import type { AnyMiniReactElement, FunctionalComponent } from "../core/types";
import { laneIncludesAny } from "./bitwise";
import { mountChildFibers, reconcileChildFibers } from "./childReconciler";
import { renderWithHooks } from "./fiberHooks";
import type { Fiber, FiberRoot, Lanes } from "./types";
import { NoFlags, NoLanes, WorkTag } from "./types";
import {
	getDidReceiveUpdate,
	markWorkInProgressReceivedUpdate,
} from "./workInProgress";

// ============================================
// Begin Work Entry Point
// ============================================

/**
 * Performs the "begin" phase of work on a fiber.
 * Returns the next fiber to work on (child) or null if done with this branch.
 */
export function beginWork(
	current: Fiber | null,
	workInProgress: Fiber,
	renderLanes: Lanes,
): Fiber | null {
	// Check for bailout opportunity
	if (current !== null) {
		const oldProps = current.memoizedProps;
		const newProps = workInProgress.pendingProps;

		if (oldProps !== newProps) {
			markWorkInProgressReceivedUpdate();
		} else if (!hasScheduledWork(current, renderLanes)) {
			// No pending work - can we bail out?
			return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
		}
	}

	// Reset the lanes since we're about to process this fiber
	workInProgress.lanes = NoLanes;

	// Dispatch to tag-specific handler
	switch (workInProgress.tag) {
		case WorkTag.FunctionComponent:
			return updateFunctionComponent(
				current,
				workInProgress,
				workInProgress.type as FunctionalComponent,
				workInProgress.pendingProps,
				renderLanes,
			);

		case WorkTag.HostRoot:
			return updateHostRoot(current, workInProgress, renderLanes);

		case WorkTag.HostComponent:
			return updateHostComponent(current, workInProgress, renderLanes);

		case WorkTag.HostText:
			return updateHostText(current, workInProgress);

		case WorkTag.Fragment:
			return updateFragment(current, workInProgress, renderLanes);

		case WorkTag.HostPortal:
			return updatePortal(current, workInProgress, renderLanes);

		case WorkTag.ContextProvider:
			return updateContextProvider(current, workInProgress, renderLanes);

		case WorkTag.ContextConsumer:
			return updateContextConsumer(current, workInProgress, renderLanes);

		case WorkTag.MemoComponent:
			return updateMemoComponent(
				current,
				workInProgress,
				workInProgress.type as FunctionalComponent,
				workInProgress.pendingProps,
				renderLanes,
			);

		default:
			throw new Error(`Unknown fiber tag: ${workInProgress.tag}`);
	}
}

// ============================================
// Tag-Specific Update Functions
// ============================================

/**
 * Updates a function component.
 */
function updateFunctionComponent(
	current: Fiber | null,
	workInProgress: Fiber,
	Component: FunctionalComponent,
	nextProps: Record<string, unknown>,
	renderLanes: Lanes,
): Fiber | null {
	// Render the component with hooks support
	const nextChildren = renderWithHooks(
		current,
		workInProgress,
		Component,
		nextProps,
		renderLanes,
	);

	if (current !== null && !getDidReceiveUpdate()) {
		// Bailout - no updates
		return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
	}

	// Reconcile children
	reconcileChildren(current, workInProgress, nextChildren, renderLanes);

	return workInProgress.child;
}

/**
 * Updates the host root fiber.
 */
function updateHostRoot(
	current: Fiber | null,
	workInProgress: Fiber,
	renderLanes: Lanes,
): Fiber | null {
	// Get the pending element from the root
	const root = workInProgress.stateNode as FiberRoot;
	const nextChildren = root.pendingChildren;

	reconcileChildren(current, workInProgress, nextChildren, renderLanes);

	return workInProgress.child;
}

/**
 * Updates a host component (DOM element).
 */
function updateHostComponent(
	current: Fiber | null,
	workInProgress: Fiber,
	renderLanes: Lanes,
): Fiber | null {
	// Get children from props
	const nextProps = workInProgress.pendingProps;
	let nextChildren = nextProps["children"] as AnyMiniReactElement | undefined;

	// Handle text-only children
	if (typeof nextChildren === "string" || typeof nextChildren === "number") {
		// Text content is handled directly, no child fibers
		nextChildren = undefined;
	}

	reconcileChildren(current, workInProgress, nextChildren, renderLanes);

	return workInProgress.child;
}

/**
 * Updates a host text node.
 */
function updateHostText(
	_current: Fiber | null,
	_workInProgress: Fiber,
): Fiber | null {
	// Text nodes have no children
	return null;
}

/**
 * Updates a fragment.
 */
function updateFragment(
	current: Fiber | null,
	workInProgress: Fiber,
	renderLanes: Lanes,
): Fiber | null {
	const nextChildren = workInProgress.pendingProps[
		"children"
	] as AnyMiniReactElement;
	reconcileChildren(current, workInProgress, nextChildren, renderLanes);
	return workInProgress.child;
}

/**
 * Updates a portal.
 */
function updatePortal(
	current: Fiber | null,
	workInProgress: Fiber,
	renderLanes: Lanes,
): Fiber | null {
	const nextChildren = workInProgress.pendingProps[
		"children"
	] as AnyMiniReactElement;
	reconcileChildren(current, workInProgress, nextChildren, renderLanes);
	return workInProgress.child;
}

/**
 * Updates a context provider.
 */
function updateContextProvider(
	current: Fiber | null,
	workInProgress: Fiber,
	renderLanes: Lanes,
): Fiber | null {
	// Push context value would happen here
	const newProps = workInProgress.pendingProps;
	const children = newProps["children"] as AnyMiniReactElement;

	// Store the value on the fiber
	workInProgress.memoizedProps = newProps;

	reconcileChildren(current, workInProgress, children, renderLanes);
	return workInProgress.child;
}

/**
 * Updates a context consumer.
 */
function updateContextConsumer(
	current: Fiber | null,
	workInProgress: Fiber,
	renderLanes: Lanes,
): Fiber | null {
	// Read context value would happen here
	const newProps = workInProgress.pendingProps;
	const render = newProps["children"] as (
		value: unknown,
	) => AnyMiniReactElement;

	// Get context value - placeholder
	const contextValue = undefined;
	const newChildren = render(contextValue);

	reconcileChildren(current, workInProgress, newChildren, renderLanes);
	return workInProgress.child;
}

/**
 * Updates a memo component.
 */
function updateMemoComponent(
	current: Fiber | null,
	workInProgress: Fiber,
	Component: FunctionalComponent,
	nextProps: Record<string, unknown>,
	renderLanes: Lanes,
): Fiber | null {
	if (current !== null) {
		const prevProps = current.memoizedProps;

		if (prevProps !== null) {
			// Check for custom comparison function from __memo
			const memoInfo = (
				workInProgress.type as unknown as Record<string, unknown>
			)["__memo"] as
				| {
						Component: FunctionalComponent;
						areEqual: (
							prev: Record<string, unknown>,
							next: Record<string, unknown>,
						) => boolean;
				  }
				| undefined;

			const areEqual = memoInfo?.areEqual ?? shallowEqual;
			if (areEqual(prevProps, nextProps)) {
				return bailoutOnAlreadyFinishedWork(
					current,
					workInProgress,
					renderLanes,
				);
			}
		}
	}

	// Get the inner component from __memo or type.type
	const memoInfo = (workInProgress.type as unknown as Record<string, unknown>)[
		"__memo"
	] as { Component: FunctionalComponent } | undefined;
	const type = workInProgress.type as { type?: FunctionalComponent };
	const resolvedType =
		memoInfo?.Component ??
		type.type ??
		(Component as unknown as FunctionalComponent);

	return updateFunctionComponent(
		current,
		workInProgress,
		resolvedType,
		nextProps,
		renderLanes,
	);
}

// ============================================
// Child Reconciliation
// ============================================

/**
 * Reconciles children for a fiber.
 */
function reconcileChildren(
	current: Fiber | null,
	workInProgress: Fiber,
	nextChildren: AnyMiniReactElement | undefined | null,
	renderLanes: Lanes,
): void {
	if (current === null) {
		// Mount: no existing children
		workInProgress.child = mountChildFibers(
			workInProgress,
			null,
			nextChildren ?? null,
			renderLanes,
		);
	} else {
		// Update: reconcile with existing children
		workInProgress.child = reconcileChildFibers(
			workInProgress,
			current.child,
			nextChildren ?? null,
			renderLanes,
		);
	}
}

// ============================================
// Bailout Logic
// ============================================

/**
 * Checks if a fiber has scheduled work at the given lanes.
 */
function hasScheduledWork(fiber: Fiber, lanes: Lanes): boolean {
	return laneIncludesAny(fiber.lanes, lanes);
}

/**
 * Bails out of work when there's nothing to do.
 */
function bailoutOnAlreadyFinishedWork(
	current: Fiber | null,
	workInProgress: Fiber,
	renderLanes: Lanes,
): Fiber | null {
	// Check if children have work
	if (!hasScheduledWorkInChildren(workInProgress, renderLanes)) {
		// No work in the entire subtree
		return null;
	}

	// Clone child fibers
	cloneChildFibersIfNeeded(current, workInProgress);

	return workInProgress.child;
}

/**
 * Checks if any children have scheduled work.
 */
function hasScheduledWorkInChildren(fiber: Fiber, lanes: Lanes): boolean {
	return laneIncludesAny(fiber.childLanes, lanes);
}

/**
 * Clones child fibers when bailing out.
 * This creates WIP versions of children so they can be processed.
 */
function cloneChildFibersIfNeeded(
	_current: Fiber | null,
	workInProgress: Fiber,
): void {
	if (workInProgress.child === null) {
		return;
	}

	// workInProgress.child currently points to current's children.
	// We need to create WIP clones so the work loop can process them.
	let currentChild: Fiber | null = workInProgress.child;
	let prevNewFiber: Fiber | null = null;
	let firstNewFiber: Fiber | null = null;

	while (currentChild !== null) {
		// Create WIP clone of this child
		let newFiber = currentChild.alternate;
		if (newFiber === null) {
			// Create new WIP fiber
			newFiber = {
				tag: currentChild.tag,
				key: currentChild.key,
				elementType: currentChild.elementType,
				type: currentChild.type,
				stateNode: currentChild.stateNode,
				return: workInProgress,
				child: currentChild.child,
				sibling: null,
				index: currentChild.index,
				ref: currentChild.ref,
				refCleanup: currentChild.refCleanup,
				pendingProps: currentChild.memoizedProps ?? {},
				memoizedProps: currentChild.memoizedProps,
				memoizedState: currentChild.memoizedState,
				updateQueue: currentChild.updateQueue,
				dependencies: currentChild.dependencies,
				flags: NoFlags,
				subtreeFlags: NoFlags,
				deletions: null,
				lanes: currentChild.lanes,
				childLanes: currentChild.childLanes,
				alternate: currentChild,
			};
			currentChild.alternate = newFiber;
		} else {
			// Reuse existing WIP fiber
			newFiber.pendingProps = currentChild.memoizedProps ?? {};
			newFiber.type = currentChild.type;
			newFiber.flags = NoFlags;
			newFiber.subtreeFlags = NoFlags;
			newFiber.deletions = null;
			newFiber.return = workInProgress;
			newFiber.child = currentChild.child;
			newFiber.memoizedProps = currentChild.memoizedProps;
			newFiber.memoizedState = currentChild.memoizedState;
			newFiber.updateQueue = currentChild.updateQueue;
			newFiber.lanes = currentChild.lanes;
			newFiber.childLanes = currentChild.childLanes;
		}

		if (prevNewFiber === null) {
			firstNewFiber = newFiber;
		} else {
			prevNewFiber.sibling = newFiber;
		}
		prevNewFiber = newFiber;
		currentChild = currentChild.sibling;
	}

	workInProgress.child = firstNewFiber;
}

// ============================================
// Utility Functions
// ============================================

/**
 * Shallow equality check for props.
 * Handles the special case of empty children arrays that are always
 * new references from createElement.
 */
function shallowEqual(
	objA: Record<string, unknown>,
	objB: Record<string, unknown>,
): boolean {
	if (objA === objB) {
		return true;
	}

	const keysA = Object.keys(objA);
	const keysB = Object.keys(objB);

	if (keysA.length !== keysB.length) {
		return false;
	}

	for (const key of keysA) {
		if (!Object.prototype.hasOwnProperty.call(objB, key)) {
			return false;
		}

		const valA = objA[key];
		const valB = objB[key];

		if (valA !== valB) {
			// Treat two empty arrays as equal (createElement always creates new children arrays)
			if (
				Array.isArray(valA) &&
				Array.isArray(valB) &&
				valA.length === 0 &&
				valB.length === 0
			) {
				continue;
			}
			return false;
		}
	}

	return true;
}
