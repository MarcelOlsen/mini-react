/* **************** */
/* Child Reconciler */
/* **************** */

/**
 * Implements child reconciliation using sibling linked lists.
 * This is the core algorithm for diffing children in React's fiber architecture.
 */

import {
	type AnyMiniReactElement,
	FRAGMENT,
	type InternalTextElement,
	type MiniReactElement,
	TEXT_ELEMENT,
} from "../core/types";
import type { PortalElement } from "../portals/types";
import { flagsOr } from "./bitwise";
import {
	createFiberFromElement,
	createFiberFromText,
	isSameElementType,
} from "./createFiber";
import {
	ChildDeletion,
	type Fiber,
	type Lanes,
	NoFlags,
	Placement,
	WorkTag,
} from "./types";

// ============================================
// Child Reconciler Factory
// ============================================

/**
 * Creates a child reconciler with the given shouldTrackSideEffects flag.
 * This allows us to skip side effect tracking during initial mount.
 */
export function createChildReconciler(shouldTrackSideEffects: boolean) {
	/**
	 * Deletes a single child fiber.
	 * Marks the fiber for deletion in the parent's deletions array.
	 */
	function deleteChild(returnFiber: Fiber, childToDelete: Fiber): void {
		if (!shouldTrackSideEffects) {
			return;
		}

		const deletions = returnFiber.deletions;
		if (deletions === null) {
			returnFiber.deletions = [childToDelete];
			returnFiber.flags = flagsOr(returnFiber.flags, ChildDeletion);
		} else {
			deletions.push(childToDelete);
		}
	}

	/**
	 * Deletes all remaining children starting from the given child.
	 */
	function deleteRemainingChildren(
		returnFiber: Fiber,
		currentFirstChild: Fiber | null,
	): null {
		if (!shouldTrackSideEffects) {
			return null;
		}

		let childToDelete = currentFirstChild;
		while (childToDelete !== null) {
			deleteChild(returnFiber, childToDelete);
			childToDelete = childToDelete.sibling;
		}
		return null;
	}

	/**
	 * Maps existing children by key for efficient lookup.
	 */
	function mapRemainingChildren(
		currentFirstChild: Fiber,
	): Map<string | number, Fiber> {
		const existingChildren = new Map<string | number, Fiber>();

		let existingChild: Fiber | null = currentFirstChild;
		while (existingChild !== null) {
			if (existingChild.key !== null) {
				existingChildren.set(existingChild.key, existingChild);
			} else {
				existingChildren.set(existingChild.index, existingChild);
			}
			existingChild = existingChild.sibling;
		}

		return existingChildren;
	}

	/**
	 * Reuses an existing fiber with new props.
	 */
	function useFiber(
		fiber: Fiber,
		pendingProps: Record<string, unknown>,
	): Fiber {
		// We use createWorkInProgress which handles the alternate relationship
		const clone = createWorkInProgressFromFiber(fiber, pendingProps);
		clone.index = 0;
		clone.sibling = null;
		return clone;
	}

	/**
	 * Creates a work-in-progress fiber from an existing fiber.
	 * Simplified version for reconciliation.
	 */
	function createWorkInProgressFromFiber(
		current: Fiber,
		pendingProps: Record<string, unknown>,
	): Fiber {
		let workInProgress = current.alternate;

		if (workInProgress === null) {
			// Create new fiber
			workInProgress = {
				tag: current.tag,
				key: current.key,
				elementType: current.elementType,
				type: current.type,
				stateNode: current.stateNode,
				return: null,
				child: null,
				sibling: null,
				index: 0,
				ref: current.ref,
				refCleanup: current.refCleanup,
				pendingProps,
				memoizedProps: null,
				memoizedState: current.memoizedState,
				updateQueue: current.updateQueue,
				dependencies: current.dependencies,
				flags: NoFlags,
				subtreeFlags: NoFlags,
				deletions: null,
				lanes: current.lanes,
				childLanes: current.childLanes,
				alternate: current,
			};
			current.alternate = workInProgress;
		} else {
			workInProgress.pendingProps = pendingProps;
			workInProgress.type = current.type;
			workInProgress.flags = NoFlags;
			workInProgress.subtreeFlags = NoFlags;
			workInProgress.deletions = null;
		}

		workInProgress.childLanes = current.childLanes;
		workInProgress.lanes = current.lanes;
		workInProgress.child = current.child;
		workInProgress.memoizedProps = current.memoizedProps;
		workInProgress.memoizedState = current.memoizedState;
		workInProgress.updateQueue = current.updateQueue;
		workInProgress.dependencies = current.dependencies;

		return workInProgress;
	}

	/**
	 * Places a child fiber at the correct index.
	 * Returns the new lastPlacedIndex.
	 */
	function placeChild(
		newFiber: Fiber,
		lastPlacedIndex: number,
		newIndex: number,
	): number {
		newFiber.index = newIndex;

		if (!shouldTrackSideEffects) {
			// During initial mount, we don't need to track placements
			newFiber.flags = flagsOr(newFiber.flags, Placement);
			return lastPlacedIndex;
		}

		const current = newFiber.alternate;
		if (current !== null) {
			const oldIndex = current.index;
			if (oldIndex < lastPlacedIndex) {
				// This is a move - the item moved right
				newFiber.flags = flagsOr(newFiber.flags, Placement);
				return lastPlacedIndex;
			}
			// This item stayed in place
			return oldIndex;
		}
		// This is an insertion
		newFiber.flags = flagsOr(newFiber.flags, Placement);
		return lastPlacedIndex;
	}

	/**
	 * Marks a fiber as being placed.
	 */
	function placeSingleChild(newFiber: Fiber): Fiber {
		if (shouldTrackSideEffects && newFiber.alternate === null) {
			newFiber.flags = flagsOr(newFiber.flags, Placement);
		}
		return newFiber;
	}

	/**
	 * Updates a fiber from an existing match.
	 */
	function updateElement(
		returnFiber: Fiber,
		current: Fiber | null,
		element: MiniReactElement,
		lanes: Lanes,
	): Fiber {
		const elementType = element.type;

		// Check if we can reuse the existing fiber
		if (current !== null && current.elementType === elementType) {
			// Reuse the existing fiber
			const existing = useFiber(current, element.props);
			existing.return = returnFiber;
			return existing;
		}

		// Create a new fiber
		const created = createFiberFromElement(element, lanes);
		created.return = returnFiber;
		return created;
	}

	/**
	 * Updates a text fiber.
	 */
	function updateTextNode(
		returnFiber: Fiber,
		current: Fiber | null,
		textContent: string | number,
		lanes: Lanes,
	): Fiber {
		if (current === null || current.tag !== WorkTag.HostText) {
			// Create a new text fiber
			const created = createFiberFromText(textContent, lanes);
			created.return = returnFiber;
			return created;
		}
		// Reuse the existing text fiber
		const existing = useFiber(current, { nodeValue: textContent });
		existing.return = returnFiber;
		return existing;
	}

	/**
	 * Updates a slot during reconciliation.
	 * Returns null if the fiber cannot be reused at this position.
	 */
	function updateSlot(
		returnFiber: Fiber,
		oldFiber: Fiber | null,
		newChild: AnyMiniReactElement,
		lanes: Lanes,
	): Fiber | null {
		// Check if keys match
		const key = oldFiber !== null ? oldFiber.key : null;

		// Handle text nodes (strings and numbers)
		if (typeof newChild === "string" || typeof newChild === "number") {
			// Text nodes don't have keys
			if (key !== null) {
				return null;
			}
			return updateTextNode(returnFiber, oldFiber, newChild, lanes);
		}

		// Handle null/undefined/boolean
		if (
			newChild === null ||
			newChild === undefined ||
			typeof newChild === "boolean"
		) {
			return null;
		}

		// Handle objects (elements)
		if (typeof newChild === "object") {
			const newChildObj = newChild as
				| MiniReactElement
				| InternalTextElement
				| PortalElement;

			// Handle text elements
			if ("type" in newChildObj && newChildObj.type === TEXT_ELEMENT) {
				if (key !== null) {
					return null;
				}
				const textElement = newChildObj as InternalTextElement;
				return updateTextNode(
					returnFiber,
					oldFiber,
					textElement.props.nodeValue,
					lanes,
				);
			}

			// Handle regular elements
			if ("type" in newChildObj && "props" in newChildObj) {
				const element = newChildObj as MiniReactElement;
				const newKey = (element.props["key"] as string | null) ?? null;

				if (newKey !== key) {
					return null;
				}

				return updateElement(returnFiber, oldFiber, element, lanes);
			}
		}

		return null;
	}

	/**
	 * Updates from a map of existing children.
	 */
	function updateFromMap(
		existingChildren: Map<string | number, Fiber>,
		returnFiber: Fiber,
		newIdx: number,
		newChild: AnyMiniReactElement,
		lanes: Lanes,
	): Fiber | null {
		// Handle text nodes
		if (typeof newChild === "string" || typeof newChild === "number") {
			const matchedFiber = existingChildren.get(newIdx) ?? null;
			return updateTextNode(returnFiber, matchedFiber, newChild, lanes);
		}

		// Handle null/undefined/boolean
		if (
			newChild === null ||
			newChild === undefined ||
			typeof newChild === "boolean"
		) {
			return null;
		}

		// Handle objects
		if (typeof newChild === "object") {
			const newChildObj = newChild as
				| MiniReactElement
				| InternalTextElement
				| PortalElement;

			// Handle text elements
			if ("type" in newChildObj && newChildObj.type === TEXT_ELEMENT) {
				const matchedFiber = existingChildren.get(newIdx) ?? null;
				const textElement = newChildObj as InternalTextElement;
				return updateTextNode(
					returnFiber,
					matchedFiber,
					textElement.props.nodeValue,
					lanes,
				);
			}

			// Handle regular elements
			if ("type" in newChildObj && "props" in newChildObj) {
				const element = newChildObj as MiniReactElement;
				const key = (element.props["key"] as string | null) ?? null;
				const matchedFiber = existingChildren.get(key ?? newIdx) ?? null;

				const updated = updateElement(
					returnFiber,
					matchedFiber,
					element,
					lanes,
				);

				if (matchedFiber !== null) {
					existingChildren.delete(key ?? newIdx);
				}

				return updated;
			}
		}

		return null;
	}

	/**
	 * Reconciles an array of children.
	 */
	function reconcileChildrenArray(
		returnFiber: Fiber,
		currentFirstChild: Fiber | null,
		newChildren: AnyMiniReactElement[],
		lanes: Lanes,
	): Fiber | null {
		let resultingFirstChild: Fiber | null = null;
		let previousNewFiber: Fiber | null = null;

		let oldFiber = currentFirstChild;
		let lastPlacedIndex = 0;
		let newIdx = 0;

		// First pass: walk both lists, matching by index and key
		for (; oldFiber !== null && newIdx < newChildren.length; newIdx++) {
			if (oldFiber.index > newIdx) {
				// There's a gap in the old list
				oldFiber = null;
			}

			const newFiber = updateSlot(
				returnFiber,
				oldFiber,
				newChildren[newIdx],
				lanes,
			);

			if (newFiber === null) {
				// Keys don't match, break out and use the map
				if (oldFiber === null) {
					oldFiber = currentFirstChild;
				}
				break;
			}

			if (shouldTrackSideEffects) {
				if (oldFiber && newFiber.alternate === null) {
					// We matched the slot but didn't reuse the existing fiber
					deleteChild(returnFiber, oldFiber);
				}
			}

			lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);

			if (previousNewFiber === null) {
				resultingFirstChild = newFiber;
			} else {
				previousNewFiber.sibling = newFiber;
			}
			previousNewFiber = newFiber;

			oldFiber = oldFiber?.sibling ?? null;
		}

		// All new children processed
		if (newIdx === newChildren.length) {
			// Delete remaining old children
			deleteRemainingChildren(returnFiber, oldFiber);
			return resultingFirstChild;
		}

		// No more old children
		if (oldFiber === null) {
			// Create new fibers for remaining children
			for (; newIdx < newChildren.length; newIdx++) {
				const newChild = newChildren[newIdx];
				if (
					newChild === null ||
					newChild === undefined ||
					typeof newChild === "boolean"
				) {
					continue;
				}

				const newFiber = createChild(returnFiber, newChild, lanes);
				if (newFiber === null) {
					continue;
				}

				lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);

				if (previousNewFiber === null) {
					resultingFirstChild = newFiber;
				} else {
					previousNewFiber.sibling = newFiber;
				}
				previousNewFiber = newFiber;
			}
			return resultingFirstChild;
		}

		// Map remaining old children by key
		const existingChildren = mapRemainingChildren(oldFiber);

		// Second pass: match by key from the map
		for (; newIdx < newChildren.length; newIdx++) {
			const newFiber = updateFromMap(
				existingChildren,
				returnFiber,
				newIdx,
				newChildren[newIdx],
				lanes,
			);

			if (newFiber !== null) {
				if (shouldTrackSideEffects) {
					if (newFiber.alternate !== null) {
						// The old fiber was reused, remove from map
						const key = newFiber.key ?? newIdx;
						existingChildren.delete(key);
					}
				}

				lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);

				if (previousNewFiber === null) {
					resultingFirstChild = newFiber;
				} else {
					previousNewFiber.sibling = newFiber;
				}
				previousNewFiber = newFiber;
			}
		}

		// Delete any remaining old children
		if (shouldTrackSideEffects) {
			for (const child of existingChildren.values()) {
				deleteChild(returnFiber, child);
			}
		}

		return resultingFirstChild;
	}

	/**
	 * Creates a child fiber from a new element.
	 */
	function createChild(
		returnFiber: Fiber,
		newChild: AnyMiniReactElement,
		lanes: Lanes,
	): Fiber | null {
		// Handle text nodes
		if (typeof newChild === "string" || typeof newChild === "number") {
			const created = createFiberFromText(newChild, lanes);
			created.return = returnFiber;
			return created;
		}

		// Handle null/undefined/boolean
		if (
			newChild === null ||
			newChild === undefined ||
			typeof newChild === "boolean"
		) {
			return null;
		}

		// Handle objects
		if (typeof newChild === "object") {
			const created = createFiberFromElement(newChild, lanes);
			created.return = returnFiber;
			return created;
		}

		return null;
	}

	/**
	 * Reconciles a single element child.
	 */
	function reconcileSingleElement(
		returnFiber: Fiber,
		currentFirstChild: Fiber | null,
		element: MiniReactElement,
		lanes: Lanes,
	): Fiber {
		const key = (element.props["key"] as string | null) ?? null;
		let child = currentFirstChild;

		// Look for an existing fiber with the same key and type
		while (child !== null) {
			if (child.key === key) {
				if (isSameElementType(element, child)) {
					// Match found - delete siblings and reuse
					deleteRemainingChildren(returnFiber, child.sibling);
					const existing = useFiber(child, element.props);
					existing.return = returnFiber;
					return existing;
				}
				// Key matches but type differs - delete all and create new
				deleteRemainingChildren(returnFiber, child);
				break;
			}
			// Key doesn't match - delete and continue
			deleteChild(returnFiber, child);
			child = child.sibling;
		}

		// No match found - create new fiber
		const created = createFiberFromElement(element, lanes);
		created.return = returnFiber;
		return created;
	}

	/**
	 * Reconciles a single text child.
	 */
	function reconcileSingleTextNode(
		returnFiber: Fiber,
		currentFirstChild: Fiber | null,
		textContent: string | number,
		lanes: Lanes,
	): Fiber {
		// Look for an existing text fiber
		if (
			currentFirstChild !== null &&
			currentFirstChild.tag === WorkTag.HostText
		) {
			// Reuse the existing text fiber
			deleteRemainingChildren(returnFiber, currentFirstChild.sibling);
			const existing = useFiber(currentFirstChild, { nodeValue: textContent });
			existing.return = returnFiber;
			return existing;
		}

		// Delete existing children and create new text fiber
		deleteRemainingChildren(returnFiber, currentFirstChild);
		const created = createFiberFromText(textContent, lanes);
		created.return = returnFiber;
		return created;
	}

	/**
	 * Main reconciliation function.
	 * Reconciles the children of a fiber with new children.
	 */
	function reconcileChildFibers(
		returnFiber: Fiber,
		currentFirstChild: Fiber | null,
		newChildInput: AnyMiniReactElement | AnyMiniReactElement[],
		lanes: Lanes,
	): Fiber | null {
		// Handle fragments at the top level - unwrap fragment children
		let newChild: AnyMiniReactElement | AnyMiniReactElement[] = newChildInput;
		if (
			typeof newChild === "object" &&
			newChild !== null &&
			"type" in newChild &&
			newChild.type === FRAGMENT &&
			(newChild as MiniReactElement).props["key"] === null
		) {
			newChild = (newChild as MiniReactElement).props.children;
		}

		// Handle single object elements
		if (typeof newChild === "object" && newChild !== null) {
			// Handle arrays
			if (Array.isArray(newChild)) {
				return reconcileChildrenArray(
					returnFiber,
					currentFirstChild,
					newChild,
					lanes,
				);
			}

			// Handle text elements
			if ("type" in newChild && newChild.type === TEXT_ELEMENT) {
				const textElement = newChild as InternalTextElement;
				return placeSingleChild(
					reconcileSingleTextNode(
						returnFiber,
						currentFirstChild,
						textElement.props.nodeValue,
						lanes,
					),
				);
			}

			// Handle regular elements
			if ("type" in newChild && "props" in newChild) {
				return placeSingleChild(
					reconcileSingleElement(
						returnFiber,
						currentFirstChild,
						newChild as MiniReactElement,
						lanes,
					),
				);
			}
		}

		// Handle text nodes (strings and numbers)
		if (typeof newChild === "string" || typeof newChild === "number") {
			return placeSingleChild(
				reconcileSingleTextNode(
					returnFiber,
					currentFirstChild,
					newChild,
					lanes,
				),
			);
		}

		// Treat null/undefined/boolean as empty - delete all children
		return deleteRemainingChildren(returnFiber, currentFirstChild);
	}

	return reconcileChildFibers;
}

// ============================================
// Pre-built Reconcilers
// ============================================

/**
 * Reconciler for update phase - tracks side effects.
 */
export const reconcileChildFibers = createChildReconciler(true);

/**
 * Reconciler for mount phase - skips side effect tracking.
 */
export const mountChildFibers = createChildReconciler(false);
