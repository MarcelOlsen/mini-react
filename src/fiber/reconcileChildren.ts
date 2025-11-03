/**
 * Child Reconciliation - The Core of Fiber's Diffing Algorithm
 *
 * This is where the magic happens! This function:
 * 1. Compares old children (current) with new children (elements)
 * 2. Decides which fibers to reuse, update, or delete
 * 3. Creates new fibers for new elements
 * 4. Marks old fibers for deletion
 * 5. Uses keys for efficient list reconciliation
 *
 * Key Insights:
 * - Reuse fibers when type and key match (UPDATE)
 * - Create new fibers for new elements (PLACEMENT)
 * - Mark old fibers for deletion (DELETION)
 * - Key-based reconciliation allows efficient reordering
 */

import type { AnyMiniReactElement } from "../core/types";
import { TEXT_ELEMENT } from "../core/types";
import {
	createFiberFromElement,
	createWorkInProgress,
	getElementKey,
	getElementType,
} from "./fiberCreation";
import { Deletion, Placement, UpdateEffect, hasEffectTag } from "./fiberFlags";
import type { Fiber } from "./types";
import { isSameElementType } from "./types";

/**
 * Normalize children to a flat array of elements
 *
 * This function:
 * - Flattens nested arrays recursively
 * - Converts primitives (string, number) to text elements
 * - Filters out null/undefined/boolean
 */
function normalizeChildren(
	children: AnyMiniReactElement | AnyMiniReactElement[],
): AnyMiniReactElement[] {
	const result: AnyMiniReactElement[] = [];

	const childrenArray = Array.isArray(children) ? children : [children];

	for (const child of childrenArray) {
		// Skip null, undefined, and booleans
		if (child === null || child === undefined || typeof child === "boolean") {
			continue;
		}

		// Recursively flatten nested arrays
		if (Array.isArray(child)) {
			result.push(...normalizeChildren(child));
			continue;
		}

		// Convert primitives to text elements
		if (typeof child === "string" || typeof child === "number") {
			result.push({
				type: TEXT_ELEMENT,
				props: { nodeValue: child, children: [] },
			});
			continue;
		}

		// Regular element - add as is
		result.push(child);
	}

	return result;
}

/**
 * Reconcile children for a fiber
 *
 * This is the main entry point for child reconciliation.
 * It handles both mount (current === null) and update (current !== null) cases.
 *
 * @param current The current (committed) fiber
 * @param workInProgress The work-in-progress fiber being built
 * @param newChildren The new children elements
 */
export function reconcileChildren(
	current: Fiber | null,
	workInProgress: Fiber,
	newChildren: AnyMiniReactElement | AnyMiniReactElement[],
): void {
	// Normalize children: flatten arrays and convert primitives to text elements
	const elements = normalizeChildren(newChildren);

	if (current === null) {
		// MOUNT: No previous children, create all new fibers
		workInProgress.child = mountChildFibers(workInProgress, elements);
	} else {
		// UPDATE: Diff against previous children
		workInProgress.child = reconcileChildFibers(
			workInProgress,
			current.child,
			elements,
		);
	}
}

/**
 * Mount (create) child fibers
 *
 * When mounting, we don't have previous children to compare against.
 * We just create new fibers for all elements.
 */
function mountChildFibers(
	returnFiber: Fiber,
	newChildren: AnyMiniReactElement[],
): Fiber | null {
	if (newChildren.length === 0) {
		return null;
	}

	let previousNewFiber: Fiber | null = null;
	let resultingFirstChild: Fiber | null = null;

	for (let i = 0; i < newChildren.length; i++) {
		const element = newChildren[i];
		const newFiber = createFiberFromElement(element);

		// Skip null elements (valid "render nothing" case)
		if (newFiber === null) {
			continue;
		}

		// Set relationships
		newFiber.return = returnFiber;
		newFiber.index = i;

		// Mark for placement (needs to be inserted into DOM)
		newFiber.effectTag = Placement;

		// Build sibling chain
		if (i === 0) {
			resultingFirstChild = newFiber;
		} else if (previousNewFiber !== null) {
			previousNewFiber.sibling = newFiber;
		}

		previousNewFiber = newFiber;
	}

	return resultingFirstChild;
}

/**
 * Reconcile (diff) child fibers
 *
 * This is the heart of the reconciliation algorithm.
 * It compares old children with new children and decides what to do.
 */
function reconcileChildFibers(
	returnFiber: Fiber,
	currentFirstChild: Fiber | null,
	newChildren: AnyMiniReactElement[],
): Fiber | null {
	if (newChildren.length === 0) {
		// No new children - delete all old children
		return deleteRemainingChildren(returnFiber, currentFirstChild);
	}

	if (newChildren.length === 1) {
		// Single child - optimized path
		return reconcileSingleElement(
			returnFiber,
			currentFirstChild,
			newChildren[0],
		);
	}

	// Multiple children - full reconciliation with key-based diffing
	return reconcileChildrenArray(returnFiber, currentFirstChild, newChildren);
}

/**
 * Reconcile a single element
 *
 * When there's only one new child, we can optimize by:
 * 1. Finding a matching old child (same key and type)
 * 2. Reusing it if found
 * 3. Deleting all other old children
 */
function reconcileSingleElement(
	returnFiber: Fiber,
	currentFirstChild: Fiber | null,
	element: AnyMiniReactElement,
): Fiber | null {
	const key = getElementKey(element);
	const elementType = getElementType(element);
	let child = currentFirstChild;

	// Search through old children for a match
	while (child !== null) {
		// Skip deleted fibers - they should not be reused
		if (hasEffectTag(child.effectTag, Deletion)) {
			child = child.sibling;
			continue;
		}

		// Check if we can reuse this fiber
		if (child.key === key) {
			// Key matches - check type
			if (isSameElementType(child.type, elementType)) {
				// MATCH! Reuse this fiber
				// Delete all siblings (we only have one new child)
				deleteRemainingChildren(returnFiber, child.sibling);

				// Create work-in-progress from existing fiber
				const existing = createWorkInProgress(
					child,
					element && typeof element === "object" && "props" in element
						? (element.props as Record<string, unknown>)
						: {},
				);

				existing.return = returnFiber;
				existing.index = 0;

				// Clear sibling pointer since we're only returning one child
				// (siblings were deleted above)
				existing.sibling = null;

				// Update, not placement
				existing.effectTag = UpdateEffect;

				return existing;
			}
			// Key matches but type changed - can't reuse
			// Delete this and all siblings
			deleteRemainingChildren(returnFiber, child);
			break;
		}
		// Key doesn't match - delete this child and keep looking
		deleteChild(returnFiber, child);

		child = child.sibling;
	}

	// No match found - create new fiber
	const newFiber = createFiberFromElement(element);

	// Handle null element (valid "render nothing" case)
	if (newFiber === null) {
		return null;
	}

	newFiber.return = returnFiber;
	newFiber.index = 0;
	newFiber.effectTag = Placement;

	return newFiber;
}

/**
 * Reconcile an array of children
 *
 * This is the full reconciliation algorithm with key-based diffing.
 * It's more complex but handles all cases: reordering, additions, deletions.
 */
function reconcileChildrenArray(
	returnFiber: Fiber,
	currentFirstChild: Fiber | null,
	newChildren: AnyMiniReactElement[],
): Fiber | null {
	// Check if we have any keyed children in new or old lists
	const hasKeyedChildren =
		newChildren.some((el) => getElementKey(el) !== null) ||
		(currentFirstChild !== null && hasAnyKeyedChild(currentFirstChild));

	// Build a map of old children by key and track all children by position
	const { keyedChildren, allChildren } =
		mapRemainingChildren(currentFirstChild);

	let resultingFirstChild: Fiber | null = null;
	let previousNewFiber: Fiber | null = null;
	let lastPlacedIndex = 0; // Track last seen index from old list

	// Track which children were reused so we can delete the rest
	const reusedChildren = new Set<Fiber>();

	for (let newIdx = 0; newIdx < newChildren.length; newIdx++) {
		const element = newChildren[newIdx];
		const key = getElementKey(element);
		let newFiber: Fiber | null = null;

		if (key !== null) {
			// Keyed child - look up in the map
			newFiber = updateSlot(
				returnFiber,
				keyedChildren,
				element,
				key,
				lastPlacedIndex,
			);
		} else if (!hasKeyedChildren) {
			// Unkeyed child AND no keyed children in list - match by position and type
			const oldFiber = allChildren[newIdx];
			if (
				oldFiber &&
				oldFiber.key === null &&
				isSameElementType(oldFiber.type, getElementType(element))
			) {
				// Match by position and type - reuse the fiber
				newFiber = createWorkInProgress(
					oldFiber,
					element && typeof element === "object" && "props" in element
						? (element.props as Record<string, unknown>)
						: {},
				);
				newFiber.sibling = null;
				newFiber.effectTag = UpdateEffect;
				reusedChildren.add(oldFiber);
			} else {
				// No match - create new fiber
				newFiber = createFiberFromElement(element);
				if (newFiber !== null) {
					newFiber.effectTag = Placement;
				}
			}
		} else {
			// Unkeyed child BUT there are keyed children - create fresh
			// (mixing keys and no keys makes position unreliable)
			newFiber = createFiberFromElement(element);
			if (newFiber !== null) {
				newFiber.effectTag = Placement;
			}
		}

		if (newFiber === null) {
			continue;
		}

		// Track reused fibers
		if (newFiber.alternate !== null) {
			reusedChildren.add(newFiber.alternate);

			// Update lastPlacedIndex if this is a reused fiber
			const oldIndex = newFiber.alternate.index;
			if (oldIndex >= lastPlacedIndex) {
				lastPlacedIndex = oldIndex;
			} else {
				// Fiber moved - mark for placement
				newFiber.effectTag = Placement;
			}
		}

		// Set index and return pointer
		newFiber.index = newIdx;
		newFiber.return = returnFiber;

		// Build sibling chain
		if (newIdx === 0) {
			resultingFirstChild = newFiber;
		} else if (previousNewFiber !== null) {
			previousNewFiber.sibling = newFiber;
		}

		previousNewFiber = newFiber;
	}

	// Delete any old children that weren't reused (both keyed and unkeyed)
	for (const child of allChildren) {
		if (!reusedChildren.has(child)) {
			// Skip if already marked for deletion to avoid double-enqueuing
			if (hasEffectTag(child.effectTag, Deletion)) {
				continue;
			}
			deleteChild(returnFiber, child);
		}
	}

	return resultingFirstChild;
}

/**
 * Check if a sibling chain has any keyed children
 */
function hasAnyKeyedChild(firstChild: Fiber): boolean {
	let child: Fiber | null = firstChild;
	while (child !== null) {
		if (child.key !== null) {
			return true;
		}
		child = child.sibling;
	}
	return false;
}

/**
 * Update a slot in the children array
 *
 * Tries to reuse an existing fiber if possible.
 */
function updateSlot(
	returnFiber: Fiber,
	existingChildren: Map<string | number, Fiber>,
	element: AnyMiniReactElement,
	key: string | number,
	lastPlacedIndex: number,
): Fiber | null {
	// Handle null/undefined elements - they don't create fibers
	if (element === null || element === undefined) {
		// If there was a fiber at this position, it should be deleted
		const matchedFiber = existingChildren.get(key);
		if (matchedFiber !== undefined) {
			existingChildren.delete(key);
			deleteChild(returnFiber, matchedFiber);
		}
		return null;
	}

	const matchedFiber = existingChildren.get(key);
	const elementType = getElementType(element);

	if (matchedFiber !== undefined) {
		// Found a fiber with matching key - check if types match
		if (isSameElementType(matchedFiber.type, elementType)) {
			// Can reuse!
			existingChildren.delete(key);

			const updated = createWorkInProgress(
				matchedFiber,
				element && typeof element === "object" && "props" in element
					? (element.props as Record<string, unknown>)
					: {},
			);

			updated.sibling = null;

			// Check if fiber needs to be moved
			// If oldIndex < lastPlacedIndex, it moved backward and needs Placement
			const oldIndex = matchedFiber.index;
			if (oldIndex < lastPlacedIndex) {
				// Needs to be moved
				updated.effectTag = Placement;
			} else {
				// In correct position, just update
				updated.effectTag = UpdateEffect;
			}

			return updated;
		}
		// Type changed - can't reuse
		// Delete the old fiber and create a new one
		existingChildren.delete(key);
		deleteChild(returnFiber, matchedFiber);
	}

	// No match or type changed - create new fiber
	const newFiber = createFiberFromElement(element);

	// Handle null element (valid "render nothing" case)
	if (newFiber === null) {
		return null;
	}

	newFiber.effectTag = Placement;

	return newFiber;
}

/**
 * Build a map of existing children by key
 * Also returns a list of all children (including unkeyed) for deletion tracking
 */
function mapRemainingChildren(currentFirstChild: Fiber | null): {
	keyedChildren: Map<string | number, Fiber>;
	allChildren: Fiber[];
} {
	const keyedChildren = new Map<string | number, Fiber>();
	const allChildren: Fiber[] = [];

	let existingChild = currentFirstChild;

	while (existingChild !== null) {
		// Skip fibers that were deleted in a previous render
		// Deleted fibers should not be reused
		if (!hasEffectTag(existingChild.effectTag, Deletion)) {
			// Only add keyed children to the map for matching
			if (existingChild.key !== null) {
				keyedChildren.set(existingChild.key, existingChild);
			}
			// Track all children for deletion
			allChildren.push(existingChild);
		}

		existingChild = existingChild.sibling;
	}

	return { keyedChildren, allChildren };
}

/**
 * Mark a child for deletion
 */
function deleteChild(returnFiber: Fiber, childToDelete: Fiber): void {
	// Mark fiber for deletion
	childToDelete.effectTag = Deletion;

	// Clear effect pointers to prevent stale chains
	// This ensures the deleted fiber doesn't keep pointing to old neighbors
	// which could resurrect stale effect chains or cause memory leaks
	childToDelete.nextEffect = null;
	childToDelete.firstEffect = null;
	childToDelete.lastEffect = null;

	// Add to parent's deletion list
	if (!returnFiber.deletions) {
		returnFiber.deletions = [];
	}
	returnFiber.deletions.push(childToDelete);

	// Also add to effect list for commit phase
	if (returnFiber.lastEffect !== null) {
		returnFiber.lastEffect.nextEffect = childToDelete;
		returnFiber.lastEffect = childToDelete;
	} else {
		returnFiber.firstEffect = childToDelete;
		returnFiber.lastEffect = childToDelete;
	}
}

/**
 * Mark all remaining children for deletion
 */
function deleteRemainingChildren(
	returnFiber: Fiber,
	currentFirstChild: Fiber | null,
): null {
	let childToDelete = currentFirstChild;

	while (childToDelete !== null) {
		// Skip if already marked for deletion to avoid double-enqueuing
		if (!hasEffectTag(childToDelete.effectTag, Deletion)) {
			deleteChild(returnFiber, childToDelete);
		}
		childToDelete = childToDelete.sibling;
	}

	return null;
}
