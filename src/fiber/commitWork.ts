/**
 * Commit Work - The Commit Phase of Fiber Rendering
 *
 * This is where we actually apply all the changes to the DOM!
 *
 * The commit phase is:
 * - SYNCHRONOUS - Cannot be interrupted
 * - ATOMIC - All changes applied at once
 * - SIDE-EFFECTFUL - Actually mutates the DOM
 *
 * Phases:
 * 1. Before Mutation - Take snapshots (future: getSnapshotBeforeUpdate)
 * 2. Mutation - Apply all DOM changes ⭐ Core focus
 * 3. Layout - Attach refs, run layout effects
 *
 * After commit, the user sees the updated UI!
 */

import { PORTAL, TEXT_ELEMENT } from "../core/types";
import {
	insertBefore,
	removeChild,
	updateProperties,
	updateTextContent,
} from "./domOperations";
import { Placement, UpdateEffect, hasEffectTag } from "./fiberFlags";
import type { Fiber, FiberRoot, PortalContainer, RefObject } from "./types";

/**
 * Entry point for the commit phase
 *
 * This function commits all the work from the render phase to the actual DOM.
 *
 * @param root The FiberRoot with finishedWork to commit
 */
export function commitRoot(root: FiberRoot): void {
	const finishedWork = root.finishedWork;

	if (finishedWork === null) {
		return;
	}

	// Clear finishedWork before committing
	// (If commit fails, we don't want to retry the same work)
	root.finishedWork = null;

	// Phase 1: Before Mutation
	// TODO Phase 5: getSnapshotBeforeUpdate, schedule passive effects

	// Phase 2: Mutation - Apply all DOM changes
	commitMutationEffects(root, finishedWork);

	// Switch current pointer to the new tree
	// Now the new tree is "committed"
	root.current = finishedWork;

	// Phase 3: Layout - Attach refs, run layout effects
	commitLayoutEffects(finishedWork);
}

/**
 * Mutation Phase - Apply all DOM changes
 *
 * This processes the effect list and applies:
 * - Deletions (remove DOM nodes)
 * - Placements (insert new DOM nodes)
 * - Updates (update DOM properties)
 */
function commitMutationEffects(root: FiberRoot, finishedWork: Fiber): void {
	// Process deletions first (stored on the root and parent fibers)
	commitDeletions(root, finishedWork);

	// Process all effects in the effect list
	let effect = finishedWork.firstEffect;
	while (effect !== null) {
		const effectTag = effect.effectTag;

		// Handle Placement (may have both Placement and Update)
		if (hasEffectTag(effectTag, Placement)) {
			commitPlacement(effect);
		}

		// Handle Update (may have both Placement and Update for moved nodes with prop changes)
		if (hasEffectTag(effectTag, UpdateEffect)) {
			commitUpdate(effect);
		}

		// Clear all effect flags after processing
		effect.effectTag = 0;

		effect = effect.nextEffect;
	}

	// Also process the root fiber itself if it has an effect
	if (hasEffectTag(finishedWork.effectTag, Placement)) {
		commitPlacement(finishedWork);
	}
	if (hasEffectTag(finishedWork.effectTag, UpdateEffect)) {
		commitUpdate(finishedWork);
	}
}

/**
 * Layout Phase - Attach refs and run layout effects
 */
function commitLayoutEffects(finishedWork: Fiber): void {
	// Process all effects in the effect list
	let effect = finishedWork.firstEffect;
	while (effect !== null) {
		// Detach old ref if ref identity changed
		if (effect.alternate && effect.alternate.ref !== effect.ref) {
			commitDetachRef(effect.alternate);
		}

		// Attach refs
		commitAttachRef(effect);

		// Run effects for this fiber
		commitFiberEffects(effect);

		effect = effect.nextEffect;
	}

	// Also process the root fiber itself
	// Detach old ref if ref identity changed
	if (
		finishedWork.alternate &&
		finishedWork.alternate.ref !== finishedWork.ref
	) {
		commitDetachRef(finishedWork.alternate);
	}
	commitAttachRef(finishedWork);
	commitFiberEffects(finishedWork);

	// Recursively process effects for all fibers in tree
	// (effect list might not include all fibers with hooks)
	commitAllEffects(finishedWork);
}

/**
 * Recursively process effects for all fibers in the tree
 */
function commitAllEffects(fiber: Fiber): void {
	// Process this fiber's effects
	commitFiberEffects(fiber);

	// Process children
	let child = fiber.child;
	while (child !== null) {
		commitAllEffects(child);
		child = child.sibling;
	}
}

/**
 * Commit effects for a single fiber
 */
function commitFiberEffects(fiber: Fiber): void {
	const hooks = fiber.hooks;
	if (!hooks) {
		return;
	}

	for (const hook of hooks) {
		if (hook.type === "effect") {
			// Only run if dependencies changed or first run
			if (hook.needsRun) {
				// Run cleanup from previous effect if it exists
				if (hook.cleanup) {
					try {
						hook.cleanup();
					} catch (error) {
						console.error("Error in effect cleanup:", error);
					}
					hook.cleanup = undefined;
				}

				// Run the effect
				try {
					const cleanupFunction = hook.callback();
					if (typeof cleanupFunction === "function") {
						hook.cleanup = cleanupFunction;
					}
				} catch (error) {
					console.error("Error in effect callback:", error);
				}

				hook.hasRun = true;
				hook.needsRun = false;
			}
		}
	}
}

/**
 * Unmount effects when fiber is being deleted
 */
function commitUnmountEffects(fiber: Fiber): void {
	// Run cleanups for this fiber
	const hooks = fiber.hooks;
	if (hooks) {
		for (const hook of hooks) {
			if (hook.type === "effect" && hook.cleanup) {
				try {
					hook.cleanup();
				} catch (error) {
					console.error("Error in effect cleanup on unmount:", error);
				}
			}
		}
	}

	// Recursively unmount children's effects
	let child = fiber.child;
	while (child !== null) {
		commitUnmountEffects(child);
		child = child.sibling;
	}
}

// ============================================================================
// Placement - Insert DOM nodes
// ============================================================================

/**
 * Commit a PLACEMENT effect
 *
 * This inserts a fiber's DOM node into the parent at the correct position.
 *
 * Challenges:
 * - Parent might be a component/fragment (no DOM node)
 * - Need to find correct insertion point among siblings
 * - Handle portals (different container)
 */
function commitPlacement(fiber: Fiber): void {
	// Find the parent DOM node (skip components/fragments)
	const parentFiber = getHostParent(fiber);

	if (parentFiber === null) {
		// No parent found (shouldn't happen for valid trees)
		return;
	}

	// Get the parent DOM node
	let parent: Node;
	if (parentFiber.type === PORTAL) {
		// Portal - use its target container
		parent = (parentFiber.stateNode as PortalContainer).containerInfo;
	} else if (parentFiber.type === null) {
		// Root fiber - get container from FiberRoot
		parent = (parentFiber.stateNode as FiberRoot).containerInfo;
	} else {
		// Regular host component - use its DOM node
		parent = parentFiber.stateNode as Node;
	}

	// Find the DOM node to insert before (for correct ordering)
	const before = getHostSibling(fiber);

	// Insert the fiber's DOM node(s) into the parent
	insertOrAppendPlacementNode(fiber, before, parent);
}

/**
 * Find the nearest parent fiber with a DOM node
 */
function getHostParent(fiber: Fiber): Fiber | null {
	let parent = fiber.return;

	while (parent !== null) {
		if (isHostFiber(parent)) {
			return parent;
		}
		parent = parent.return;
	}

	return null;
}

/**
 * Check if a fiber is a host fiber (has a DOM node or container)
 */
function isHostFiber(fiber: Fiber): boolean {
	const type = fiber.type;
	// Check for string types (host elements like 'div', 'span', and TEXT_ELEMENT)
	if (typeof type === "string") {
		return true;
	}
	// Check for null (root fiber)
	if (type === null) {
		return true;
	}
	// Check for PORTAL (has a target container)
	if (type === PORTAL) {
		return true;
	}
	return false;
}

/**
 * Find the next host sibling for correct insertion order
 *
 * This is complex because siblings might be components/fragments
 * that don't have DOM nodes themselves.
 */
function getHostSibling(fiber: Fiber): Node | null {
	let node: Fiber | null = fiber;

	siblings: while (true) {
		// Move to the next sibling
		while (node.sibling === null) {
			if (node.return === null || isHostFiber(node.return)) {
				// Reached the end, no more siblings
				return null;
			}
			node = node.return;
		}

		node = node.sibling;

		// Skip over components/fragments to find a host node
		while (!isHostFiber(node)) {
			// If this is a placement, skip it (it's also being inserted)
			if (hasEffectTag(node.effectTag, Placement)) {
				continue siblings;
			}

			// Go into children to find host nodes
			if (node.child === null) {
				continue siblings;
			}

			node = node.child;
		}

		// Found a host sibling!
		// But if it's also being placed, keep looking
		if (!hasEffectTag(node.effectTag, Placement)) {
			return node.stateNode as Node;
		}
	}
}

/**
 * Insert or append a fiber's DOM node(s) into the parent
 *
 * Handles:
 * - Host components (have DOM nodes)
 * - Components (no DOM, recurse to children)
 * - Fragments (no DOM, insert all children)
 * - Text nodes
 */
function insertOrAppendPlacementNode(
	fiber: Fiber,
	before: Node | null,
	parent: Node,
): void {
	const type = fiber.type;

	// Check typeof first to satisfy TypeScript
	if (typeof type === "string") {
		// Host component or TEXT_ELEMENT - insert its DOM node
		const stateNode = fiber.stateNode as Node;
		if (stateNode) {
			insertBefore(parent, stateNode, before);
		}
		return;
	}

	if (typeof type === "symbol") {
		if (type === PORTAL) {
			// Portals render to a different container
			// Get the portal's target container and place children there
			const portalContainer = (fiber.stateNode as PortalContainer | null)
				?.containerInfo;
			if (portalContainer) {
				let child = fiber.child;
				while (child !== null) {
					insertOrAppendPlacementNode(child, null, portalContainer);
					child = child.sibling;
				}
			}
			return;
		}
	}

	// Component or fragment - recursively insert children
	let child = fiber.child;
	while (child !== null) {
		insertOrAppendPlacementNode(child, before, parent);
		child = child.sibling;
	}
}

// ============================================================================
// Update - Update DOM properties
// ============================================================================

/**
 * Commit an UPDATE effect
 *
 * This updates the DOM properties of an existing element.
 */
function commitUpdate(fiber: Fiber): void {
	const type = fiber.type;

	// TEXT_ELEMENT is a string constant
	if (type === TEXT_ELEMENT) {
		// Text node - update text content
		const textInstance = fiber.stateNode as Text;
		const newText = String(fiber.memoizedProps?.nodeValue ?? "");

		updateTextContent(textInstance, newText);
		return;
	}

	// Check typeof for regular host components
	if (typeof type === "string") {
		// Host component - update properties
		const instance = fiber.stateNode as Element;
		const oldProps = fiber.alternate?.memoizedProps ?? {};
		const newProps = fiber.memoizedProps ?? {};

		updateProperties(instance, oldProps, newProps);
		return;
	}

	// Components and fragments don't have DOM nodes to update
}

// ============================================================================
// Deletion - Remove DOM nodes
// ============================================================================

/**
 * Process all deletion effects
 *
 * Deletions are stored on parent fibers in the `deletions` array.
 */
function commitDeletions(_root: FiberRoot, finishedWork: Fiber): void {
	// Process deletions from the entire tree
	processDeletions(finishedWork);
}

/**
 * Recursively process deletions in the tree
 */
function processDeletions(fiber: Fiber): void {
	// Process this fiber's deletions
	if (fiber.deletions && fiber.deletions.length > 0) {
		for (const deletion of fiber.deletions) {
			commitDeletion(deletion);
		}
		// Clear the deletions array
		fiber.deletions = [];
	}

	// Recursively process children
	let child = fiber.child;
	while (child !== null) {
		processDeletions(child);
		child = child.sibling;
	}
}

/**
 * Commit a DELETION effect
 *
 * This removes a fiber's DOM node from the parent.
 */
function commitDeletion(fiber: Fiber): void {
	// Run effect cleanups before removing
	commitUnmountEffects(fiber);

	// Detach ref
	commitDetachRef(fiber);

	// Special case: if this fiber IS a portal, unmount its children from portal target
	if (fiber.type === PORTAL) {
		const portalContainer = (fiber.stateNode as PortalContainer | null)
			?.containerInfo;
		if (portalContainer) {
			// Remove all children that were rendered by this portal
			// We can't rely on fiber.child.stateNode because it may be stale
			// Instead, remove all nodes in the container
			// NOTE: This assumes each portal has its own dedicated container
			// For shared containers, this would need more sophisticated tracking
			for (const node of Array.from(portalContainer.childNodes)) {
				portalContainer.removeChild(node);
			}
		}
		return;
	}

	// Find the parent DOM node
	const parentFiber = getHostParent(fiber);
	if (parentFiber === null) {
		return;
	}

	// Get the parent DOM node
	let parent: Node;
	if (parentFiber.type === PORTAL) {
		// Portal - use its target container
		parent = (parentFiber.stateNode as PortalContainer).containerInfo;
	} else if (parentFiber.type === null) {
		// Root fiber - get container from FiberRoot
		parent = (parentFiber.stateNode as FiberRoot).containerInfo;
	} else {
		// Regular host component - use its DOM node
		parent = parentFiber.stateNode as Node;
	}

	// Remove the DOM node(s)
	unmountHostComponents(fiber, parent);

	// TODO Phase 5: Call componentWillUnmount, cleanup effects
}

/**
 * Unmount host components and remove their DOM nodes
 */
function unmountHostComponents(fiber: Fiber, parent: Node): void {
	const type = fiber.type;

	// Check typeof first to satisfy TypeScript
	if (typeof type === "string") {
		// Host component or TEXT_ELEMENT - remove its DOM node
		const node = fiber.stateNode as Node;
		// Try to remove from actual parent if connected
		if (node?.parentNode) {
			removeChild(node.parentNode, node);
		} else if (node && parent?.contains?.(node)) {
			// Fallback: if parent contains this node, remove it
			removeChild(parent, node);
		}
		return;
	}

	if (typeof type === "symbol") {
		if (type === PORTAL) {
			// Portal - recursively unmount all children from portal container
			const portalContainer = (fiber.stateNode as PortalContainer | null)
				?.containerInfo;
			if (portalContainer) {
				let child = fiber.child;
				while (child !== null) {
					unmountHostComponents(child, portalContainer);
					child = child.sibling;
				}
			}
			return;
		}
	}

	// Component or fragment - recursively unmount children
	let child = fiber.child;
	while (child !== null) {
		unmountHostComponents(child, parent);
		child = child.sibling;
	}
}

// ============================================================================
// Ref Handling
// ============================================================================

/**
 * Attach a ref to a fiber's DOM node or component instance
 */
function commitAttachRef(fiber: Fiber): void {
	const ref = fiber.ref;

	if (ref === null || ref === undefined) {
		return;
	}

	const instance = fiber.stateNode;

	// Call ref callback or set ref.current
	if (typeof ref === "function") {
		ref(instance);
	} else if (typeof ref === "object" && ref !== null) {
		(ref as RefObject<unknown>).current = instance;
	}
}

/**
 * Detach a ref from a fiber
 */
function commitDetachRef(fiber: Fiber): void {
	const ref = fiber.ref;

	if (ref === null || ref === undefined) {
		return;
	}

	// Clear the ref
	if (typeof ref === "function") {
		ref(null);
	} else if (typeof ref === "object" && ref !== null) {
		(ref as RefObject<unknown>).current = null;
	}

	// Clear the ref field to prevent re-attachment
	fiber.ref = null;
}
