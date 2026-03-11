/* **************** */
/* Fiber Utilities */
/* **************** */

/**
 * Utility functions for fiber tree traversal and host operations.
 */

import {
	flagsInclude,
	getHostStateNode,
	isHostComponentFiber,
	isHostPortalFiber,
	isHostRootFiber,
	isHostTextFiber,
} from "./typeGuards";
import type { Fiber, FiberRoot } from "./types";
import { Placement, WorkTag } from "./types";

// ============================================
// Tree Traversal
// ============================================

/**
 * Gets the next fiber in a DFS traversal.
 * Returns the child, then sibling, then uncle, etc.
 */
export function getNextFiber(fiber: Fiber, root: Fiber): Fiber | null {
	// First, try to go down to a child
	if (fiber.child !== null) {
		return fiber.child;
	}

	// No child, try siblings and then uncles
	let current: Fiber | null = fiber;
	while (current !== null) {
		if (current === root) {
			// We've traversed the entire tree
			return null;
		}

		if (current.sibling !== null) {
			return current.sibling;
		}

		// Go up to parent
		current = current.return;
	}

	return null;
}

/**
 * Gets the next fiber in DFS order for complete phase.
 * Traverses siblings before returning to parent.
 */
export function completeUnitOfWork(unitOfWork: Fiber): Fiber | null {
	let completedWork: Fiber | null = unitOfWork;

	while (completedWork !== null) {
		// Check if there's a sibling to process
		const sibling = completedWork.sibling;
		if (sibling !== null) {
			return sibling;
		}

		// Return to parent
		completedWork = completedWork.return;
	}

	return null;
}

// ============================================
// Host Parent/Sibling Finding
// ============================================

/**
 * Finds the nearest host parent fiber.
 * Walks up the tree until it finds a HostComponent, HostRoot, or HostPortal.
 */
export function findHostParent(fiber: Fiber): Fiber | null {
	let parent = fiber.return;

	while (parent !== null) {
		if (
			parent.tag === WorkTag.HostComponent ||
			parent.tag === WorkTag.HostRoot ||
			parent.tag === WorkTag.HostPortal
		) {
			return parent;
		}
		parent = parent.return;
	}

	return null;
}

/**
 * Gets the host parent DOM node for a fiber.
 * Returns the actual DOM element where children should be appended.
 */
export function getHostParentNode(fiber: Fiber): Element | null {
	const hostParentFiber = findHostParent(fiber);

	if (hostParentFiber === null) {
		return null;
	}

	if (isHostComponentFiber(hostParentFiber)) {
		return hostParentFiber.stateNode;
	}

	if (isHostRootFiber(hostParentFiber)) {
		return hostParentFiber.stateNode.containerInfo;
	}

	if (isHostPortalFiber(hostParentFiber)) {
		return hostParentFiber.stateNode.containerInfo;
	}

	return null;
}

/**
 * Finds the next host sibling for placement.
 * This is needed to know where to insertBefore().
 *
 * We need to find the next sibling that is a host node.
 * This might not be an immediate sibling if there are function components.
 */
export function findHostSibling(fiber: Fiber): Element | Text | null {
	let node: Fiber | null = fiber;

	findSibling: while (true) {
		// Walk up until we find a sibling
		while (node.sibling === null) {
			if (node.return === null || isHostParent(node.return)) {
				// We're at the root or a host parent, no sibling found
				return null;
			}
			node = node.return;
		}

		node = node.sibling;

		// Walk down to find a host node
		while (!isHostComponentFiber(node) && !isHostTextFiber(node)) {
			// If this is a placement, we can't use it as a sibling
			if (flagsInclude(node.flags, Placement)) {
				continue findSibling;
			}

			// Portals are not part of the regular flow
			if (isHostPortalFiber(node)) {
				continue findSibling;
			}

			// No child, continue searching siblings
			if (node.child === null) {
				continue findSibling;
			}

			// Go down into the child
			node = node.child;
		}

		// Found a host node
		// Check if it's a placement - if so, we can't use it
		if (!flagsInclude(node.flags, Placement)) {
			return node.stateNode;
		}
	}
}

/**
 * Checks if a fiber is a host parent (can contain DOM children).
 */
function isHostParent(fiber: Fiber): boolean {
	return (
		fiber.tag === WorkTag.HostComponent ||
		fiber.tag === WorkTag.HostRoot ||
		fiber.tag === WorkTag.HostPortal
	);
}

// ============================================
// Fiber State Helpers
// ============================================

/**
 * Gets the state node (DOM element) for a fiber.
 * Returns null for non-host fibers.
 */
export function getStateNode(fiber: Fiber): Element | Text | null {
	return getHostStateNode(fiber);
}

/**
 * Gets the first host child of a fiber.
 * Traverses down through function components.
 */
export function getFirstHostChild(fiber: Fiber): Element | Text | null {
	let child: Fiber | null = fiber.child;

	while (child !== null) {
		if (isHostComponentFiber(child) || isHostTextFiber(child)) {
			return child.stateNode;
		}

		if (isHostPortalFiber(child)) {
			// Skip portals
			child = child.sibling;
			continue;
		}

		if (child.child !== null) {
			// Go deeper
			child = child.child;
			continue;
		}

		// No host child found in this branch, try sibling
		while (child !== null && child.sibling === null) {
			if (child.return === null || child.return === fiber) {
				return null;
			}
			child = child.return;
		}

		child = child?.sibling ?? null;
	}

	return null;
}

/**
 * Collects all host children of a fiber.
 * Used for removal operations.
 */
export function collectHostChildren(fiber: Fiber): (Element | Text)[] {
	const children: (Element | Text)[] = [];
	let node: Fiber | null = fiber;

	while (true) {
		if (isHostComponentFiber(node) || isHostTextFiber(node)) {
			children.push(node.stateNode);
		} else if (isHostPortalFiber(node)) {
			// Skip portal subtrees - they manage their own DOM
		} else if (node.child !== null) {
			node = node.child;
			continue;
		}

		if (node === fiber) {
			return children;
		}

		while (node.sibling === null) {
			if (node.return === null || node.return === fiber) {
				return children;
			}
			node = node.return;
		}

		node = node.sibling;
	}
}

// ============================================
// Root Finding
// ============================================

/**
 * Finds the FiberRoot from any fiber in the tree.
 */
export function findFiberRoot(fiber: Fiber): FiberRoot | null {
	let current: Fiber | null = fiber;

	while (current !== null) {
		if (isHostRootFiber(current)) {
			return current.stateNode;
		}
		current = current.return;
	}

	return null;
}

/**
 * Finds the nearest portal container from a fiber.
 * Returns null if not inside a portal.
 */
export function findPortalContainer(fiber: Fiber): Element | null {
	let current: Fiber | null = fiber;

	while (current !== null) {
		if (isHostPortalFiber(current)) {
			return current.stateNode.containerInfo;
		}
		current = current.return;
	}

	return null;
}

// ============================================
// Debug Utilities
// ============================================

/**
 * Gets a debug name for a fiber.
 */
export function getFiberDebugName(fiber: Fiber): string {
	switch (fiber.tag) {
		case WorkTag.FunctionComponent:
			return typeof fiber.type === "function"
				? fiber.type.name || "Anonymous"
				: "FunctionComponent";
		case WorkTag.HostRoot:
			return "HostRoot";
		case WorkTag.HostComponent:
			return typeof fiber.type === "string" ? fiber.type : "HostComponent";
		case WorkTag.HostText:
			return "HostText";
		case WorkTag.Fragment:
			return "Fragment";
		case WorkTag.HostPortal:
			return "Portal";
		case WorkTag.ContextProvider:
			return "ContextProvider";
		case WorkTag.ContextConsumer:
			return "ContextConsumer";
		case WorkTag.MemoComponent:
			return "Memo";
		default:
			return `Unknown(${fiber.tag})`;
	}
}

/**
 * Prints a fiber tree for debugging.
 */
export function printFiberTree(fiber: Fiber, indent = 0): void {
	const prefix = "  ".repeat(indent);
	const name = getFiberDebugName(fiber);
	const key = fiber.key ? ` key="${fiber.key}"` : "";
	console.log(`${prefix}${name}${key}`);

	let child = fiber.child;
	while (child !== null) {
		printFiberTree(child, indent + 1);
		child = child.sibling;
	}
}
