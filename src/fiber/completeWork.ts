/* **************** */
/* Complete Work - Render Phase Exit */
/* **************** */

/**
 * Implements the "complete" phase of fiber reconciliation.
 * This is where we create DOM nodes and bubble up effects.
 */

import { eventSystem } from "../events/eventSystem";
import {
	createInstance,
	createTextInstance,
	finalizeInitialChildren,
	prepareUpdate,
} from "./commitWork";
import {
	assertTextProps,
	isHostComponentFiber,
	isHostTextFiber,
	isTextProps,
} from "./typeGuards";
import type { Fiber, Lanes } from "./types";
import { NoFlags, Ref, Update, WorkTag, createFlags } from "./types";

// ============================================
// Complete Work Entry Point
// ============================================

/**
 * Performs the "complete" phase of work on a fiber.
 * Called when we're done with a fiber and all its children.
 */
export function completeWork(
	current: Fiber | null,
	workInProgress: Fiber,
	_renderLanes: Lanes,
): Fiber | null {
	const newProps = workInProgress.pendingProps;

	switch (workInProgress.tag) {
		case WorkTag.FunctionComponent:
			bubbleProperties(workInProgress);
			return null;

		case WorkTag.HostRoot: {
			// Update the root's current pointer happens in commit
			bubbleProperties(workInProgress);
			return null;
		}

		case WorkTag.HostComponent: {
			const type = workInProgress.type as string;

			if (current !== null && workInProgress.stateNode !== null) {
				// Update
				updateHostComponent(current, workInProgress, type, newProps);
				// Re-register the WIP fiber with the event system so event handlers
				// pick up the new props
				eventSystem.registerFiber(
					workInProgress,
					workInProgress.stateNode as Node,
				);
			} else {
				// Mount
				if (!newProps) {
					throw new Error("Expected host component props");
				}

				const instance = createInstance(type, newProps, workInProgress);
				appendAllChildren(instance, workInProgress);
				workInProgress.stateNode = instance;

				if (finalizeInitialChildren(instance, type, newProps)) {
					markUpdate(workInProgress);
				}
			}

			bubbleProperties(workInProgress);

			// Handle ref
			if (workInProgress.ref !== null) {
				markRef(workInProgress);
			}

			return null;
		}

		case WorkTag.HostText: {
			const textProps = assertTextProps(workInProgress);
			const newText = textProps.nodeValue;

			if (current !== null && workInProgress.stateNode !== null) {
				// Update
				const oldProps = current.memoizedProps;
				const oldText = isTextProps(oldProps) ? oldProps.nodeValue : undefined;
				if (oldText !== newText) {
					markUpdate(workInProgress);
				}
			} else {
				// Mount
				const textInstance = createTextInstance(newText);
				workInProgress.stateNode = textInstance;

				// Register with event system for fiber-based event handling
				eventSystem.registerFiber(workInProgress, textInstance);
			}

			bubbleProperties(workInProgress);
			return null;
		}

		case WorkTag.Fragment:
			bubbleProperties(workInProgress);
			return null;

		case WorkTag.HostPortal: {
			// Register event delegation for the portal container
			const portalContainer = (
				workInProgress.stateNode as { containerInfo: Element }
			).containerInfo;
			eventSystem.addEventDelegation(portalContainer);
			bubbleProperties(workInProgress);
			return null;
		}

		case WorkTag.ContextProvider:
			bubbleProperties(workInProgress);
			return null;

		case WorkTag.ContextConsumer:
			bubbleProperties(workInProgress);
			return null;

		case WorkTag.MemoComponent:
			bubbleProperties(workInProgress);
			return null;

		default:
			throw new Error(`Unknown fiber tag: ${workInProgress.tag}`);
	}
}

// ============================================
// Host Component Operations
// ============================================

/**
 * Updates a host component.
 */
function updateHostComponent(
	current: Fiber,
	workInProgress: Fiber,
	type: string,
	newProps: Record<string, unknown>,
): void {
	const oldProps = current.memoizedProps;

	if (oldProps === newProps) {
		// No change
		return;
	}

	if (!isHostComponentFiber(workInProgress)) {
		throw new Error("Expected HostComponent fiber in updateHostComponent");
	}

	const instance = workInProgress.stateNode;
	const updatePayload = prepareUpdate(instance, type, oldProps ?? {}, newProps);

	if (updatePayload !== null) {
		// Store the update payload for commit phase
		// Note: updatePayload structure differs from UpdateQueue but is stored
		// temporarily here for commit phase processing (follows React's pattern)
		workInProgress.updateQueue =
			updatePayload as unknown as Fiber["updateQueue"];
		markUpdate(workInProgress);
	}
}

/**
 * Appends all children to a parent instance.
 */
function appendAllChildren(parent: Element, workInProgress: Fiber): void {
	let node = workInProgress.child;

	while (node !== null) {
		if (isHostComponentFiber(node) || isHostTextFiber(node)) {
			parent.appendChild(node.stateNode);
		} else if (node.tag === WorkTag.HostPortal) {
			// Portals don't append to parent
		} else if (node.child !== null) {
			// Function components, fragments, etc - go into children
			node.child.return = node;
			node = node.child;
			continue;
		}

		if (node === workInProgress) {
			return;
		}

		while (node.sibling === null) {
			if (node.return === null || node.return === workInProgress) {
				return;
			}
			node = node.return;
		}

		node.sibling.return = node.return;
		node = node.sibling;
	}
}

// ============================================
// Effect Flags
// ============================================

/**
 * Marks a fiber as needing an update.
 */
function markUpdate(workInProgress: Fiber): void {
	workInProgress.flags = createFlags(
		(workInProgress.flags as number) | (Update as number),
	);
}

/**
 * Marks a fiber as having a ref.
 */
function markRef(workInProgress: Fiber): void {
	workInProgress.flags = createFlags(
		(workInProgress.flags as number) | (Ref as number),
	);
}

// ============================================
// Effect Bubbling
// ============================================

/**
 * Bubbles properties (flags and lanes) up from children to parent.
 */
function bubbleProperties(completedWork: Fiber): void {
	let subtreeFlags = NoFlags;
	let child = completedWork.child;

	while (child !== null) {
		subtreeFlags = createFlags(
			(subtreeFlags as number) |
				(child.subtreeFlags as number) |
				(child.flags as number),
		);

		// Also merge child lanes
		completedWork.childLanes = createFlags(
			(completedWork.childLanes as number) |
				(child.lanes as number) |
				(child.childLanes as number),
		) as unknown as Lanes;

		child = child.sibling;
	}

	completedWork.subtreeFlags = createFlags(
		(completedWork.subtreeFlags as number) | (subtreeFlags as number),
	);
}

// ============================================
// Reset Operations
// ============================================

/**
 * Resets the completed work for a new render pass.
 */
export function resetCompleteWork(workInProgress: Fiber): void {
	workInProgress.stateNode = null;
	workInProgress.flags = NoFlags;
	workInProgress.subtreeFlags = NoFlags;
}

// ============================================
// Unwind Operations
// ============================================

/**
 * Unwinds work when an error occurs.
 */
export function unwindWork(
	_current: Fiber | null,
	workInProgress: Fiber,
	_renderLanes: Lanes,
): Fiber | null {
	switch (workInProgress.tag) {
		case WorkTag.HostRoot:
			// Pop root context
			return null;
		case WorkTag.HostComponent:
			// Pop host context
			return null;
		case WorkTag.HostPortal:
			// Pop portal context
			return null;
		case WorkTag.ContextProvider:
			// Pop provider context
			return null;
		default:
			return null;
	}
}

/**
 * Unwinds interrupted work.
 */
export function unwindInterruptedWork(
	_current: Fiber | null,
	interruptedWork: Fiber,
	_renderLanes: Lanes,
): void {
	switch (interruptedWork.tag) {
		case WorkTag.HostRoot:
			break;
		case WorkTag.HostComponent:
			break;
		case WorkTag.HostPortal:
			break;
		case WorkTag.ContextProvider:
			break;
	}
}
