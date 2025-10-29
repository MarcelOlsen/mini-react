/**
 * Complete Work - Create and Update DOM Nodes
 *
 * completeWork is called after beginWork and all children are processed.
 * Its job is to:
 * 1. Create DOM nodes for new fibers (PLACEMENT)
 * 2. Mark existing fibers for updates (UPDATE)
 * 3. Prepare fibers for the commit phase
 *
 * IMPORTANT: This function creates/updates DOM nodes but does NOT insert them!
 * Insertion happens in the commit phase (Phase 4).
 *
 * This separation is key to Fiber's architecture:
 * - Render phase (here): Can be paused, discarded, restarted
 * - Commit phase: Synchronous, atomic, always completes
 */

import {
	type ElementType,
	FRAGMENT,
	type JSXElementType,
	PORTAL,
	TEXT_ELEMENT,
} from "../core/types";
import type { VDOMInstance } from "../core/types";
import { eventSystem } from "../events";
import { setInitialProperties } from "./domOperations";
import { Placement, UpdateEffect } from "./fiberFlags";
import type { Fiber } from "./types";

/**
 * Complete work on a fiber
 *
 * This is called when a fiber and all its children have been processed.
 *
 * @param current The current (committed) fiber
 * @param workInProgress The work-in-progress fiber
 */
export function completeWork(
	current: Fiber | null,
	workInProgress: Fiber,
): void {
	const { type } = workInProgress;

	if (typeof type === "string") {
		// Check if it's TEXT_ELEMENT (also a string)
		if (type === TEXT_ELEMENT) {
			completeHostText(current, workInProgress);
			return;
		}
		// Regular host component (div, span, etc)
		completeHostComponent(current, workInProgress);
	} else if (typeof type === "symbol") {
		// Symbol types: FRAGMENT or PORTAL
		if (type === FRAGMENT) {
			completeFragment(current, workInProgress);
		} else if (type === PORTAL) {
			completePortal(current, workInProgress);
		}
	} else if (typeof type === "function") {
		// Functional component (no DOM node)
		completeFunctionComponent(current, workInProgress);
	} else if (type === null) {
		// Root fiber (no DOM node)
		completeHostRoot(current, workInProgress);
	}
}

/**
 * Complete a host component (div, span, button, etc)
 */
function completeHostComponent(
	current: Fiber | null,
	workInProgress: Fiber,
): void {
	const { pendingProps } = workInProgress;

	if (current !== null && workInProgress.stateNode !== null) {
		// UPDATE: Fiber already has a DOM node
		// Check if props changed (shallow comparison)
		const oldProps = current.memoizedProps;
		const newProps = pendingProps;

		// Check if props actually changed
		// Exclude 'children' from comparison since they're reconciled separately
		let hasChanged = false;
		if (oldProps !== newProps) {
			// Compare prop keys (excluding children)
			const oldKeys = oldProps
				? Object.keys(oldProps).filter((k) => k !== "children")
				: [];
			const newKeys = Object.keys(newProps).filter((k) => k !== "children");

			if (oldKeys.length !== newKeys.length) {
				hasChanged = true;
			} else {
				for (const key of newKeys) {
					if (oldProps?.[key] !== newProps[key]) {
						hasChanged = true;
						break;
					}
				}
			}
		}

		if (hasChanged) {
			// Props changed - mark for update
			workInProgress.effectTag = UpdateEffect;
		}
		// Note: We don't update the DOM here!
		// That happens in commit phase (Phase 4)
	} else {
		// PLACEMENT: Create new DOM node
		const instance = createDOMElement(
			workInProgress.type as string,
			pendingProps,
		);

		// Append all children to this DOM node
		// Children have already been processed by beginWork
		appendAllChildren(instance, workInProgress);

		// Save the DOM node
		workInProgress.stateNode = instance;

		// Mark for placement (needs to be inserted into parent)
		workInProgress.effectTag = Placement;
	}

	// Save memoized props for future comparisons
	workInProgress.memoizedProps = pendingProps;

	// Register with event system
	registerFiberWithEventSystem(workInProgress);
}

/**
 * Complete a text node
 */
function completeHostText(current: Fiber | null, workInProgress: Fiber): void {
	const { pendingProps } = workInProgress;
	const textContent = String(pendingProps?.nodeValue ?? "");

	if (current !== null && workInProgress.stateNode !== null) {
		// UPDATE: Check if text changed
		const oldText = String(current.memoizedProps?.nodeValue ?? "");
		const newText = textContent;
		if (oldText !== newText) {
			workInProgress.effectTag = UpdateEffect;
		} else {
		}
	} else {
		// PLACEMENT: Create new text node
		const textInstance = document.createTextNode(textContent);
		workInProgress.stateNode = textInstance;
		workInProgress.effectTag = Placement;
	}

	// Save memoized props for future comparisons
	workInProgress.memoizedProps = pendingProps;

	// Register with event system
	registerFiberWithEventSystem(workInProgress);
}

/**
 * Complete a fragment
 *
 * Fragments don't create DOM nodes - they just group children.
 */
function completeFragment(_current: Fiber | null, workInProgress: Fiber): void {
	// Fragments have no DOM node
	workInProgress.stateNode = null;
	// No effect tag needed (unless we add/remove children, handled by children themselves)

	// Save memoized props for future comparisons
	workInProgress.memoizedProps = workInProgress.pendingProps;
}

/**
 * Complete a portal
 *
 * Portals render to a different container, so they don't have a DOM node
 * in the parent tree. But we need to store the container for the commit phase.
 */
function completePortal(_current: Fiber | null, workInProgress: Fiber): void {
	// Store the portal target container in stateNode
	// This is used in the commit phase to insert children into the correct container
	const targetContainer = workInProgress.pendingProps.targetContainer;

	// Always update the stateNode to reflect the current target container
	// This handles both initial creation and container changes
	workInProgress.stateNode = {
		containerInfo: targetContainer as HTMLElement,
	};

	// Add event delegation for the portal container
	// This allows events in portals to bubble through the React tree
	if (targetContainer) {
		eventSystem.addEventDelegation(targetContainer as Element);
	}

	// Children are rendered to the portal's target container

	// Save memoized props for future comparisons
	workInProgress.memoizedProps = workInProgress.pendingProps;
}

/**
 * Complete a functional component
 *
 * Functional components don't create DOM nodes - they return elements.
 */
function completeFunctionComponent(
	_current: Fiber | null,
	workInProgress: Fiber,
): void {
	// Functional components have no DOM node
	workInProgress.stateNode = null;

	// Save memoized props for future comparisons
	workInProgress.memoizedProps = workInProgress.pendingProps;
}

/**
 * Complete the root fiber
 */
function completeHostRoot(_current: Fiber | null, workInProgress: Fiber): void {
	// Root fiber's stateNode is the FiberRoot, already set
	// No effect tag needed for root

	// Save memoized props for future comparisons
	workInProgress.memoizedProps = workInProgress.pendingProps;
}

/**
 * Create a DOM element
 *
 * This creates the element and sets its initial properties.
 * The element will be inserted into the DOM during commit phase.
 */
function createDOMElement(
	type: string,
	props: Record<string, unknown>,
): HTMLElement {
	const element = document.createElement(type);

	// Set initial properties
	// This is safe to do during render phase because the element
	// isn't in the DOM yet, so it doesn't cause visual updates
	setInitialProperties(element, props);

	return element;
}

/**
 * Cache of fiber to VDOMInstance mappings
 * This ensures we reuse the same VDOMInstance object for event system lookups
 */
const fiberToInstanceCache = new WeakMap<Fiber, VDOMInstance>();

/**
 * Create a VDOMInstance adapter from a Fiber
 * This allows the event system to work with Fibers
 */
function fiberToVDOMInstance(fiber: Fiber): VDOMInstance {
	// Check cache first to ensure we return the same instance object
	let instance = fiberToInstanceCache.get(fiber);

	if (instance) {
		// Update mutable properties to keep them in sync
		// @ts-expect-error - Fiber Props type is compatible but TypeScript requires explicit children property
		instance.element.props = (fiber.memoizedProps ||
			fiber.pendingProps) as Record<string, unknown>;
		instance.dom = fiber.stateNode as Node;
		instance.hooks = fiber.hooks ?? undefined;
		instance.hookCursor = fiber.hookCursor;
		instance.contextValues = fiber.contextValues ?? undefined;

		// Update parent relationship
		if (fiber.return) {
			instance.parent = fiberToVDOMInstance(fiber.return);
		} else {
			instance.parent = undefined;
		}

		return instance;
	}

	// Create new instance if not cached
	instance = {
		element: {
			type: fiber.type as ElementType,
			props: (fiber.memoizedProps || fiber.pendingProps) as Record<
				string,
				unknown
			>,
		} as JSXElementType,
		dom: fiber.stateNode as Node,
		childInstances: [], // Not needed for event system
		parent: undefined, // Will be set below if parent exists
		hooks: fiber.hooks ?? undefined,
		hookCursor: fiber.hookCursor,
		contextValues: fiber.contextValues ?? undefined,
	};

	// Cache this instance
	fiberToInstanceCache.set(fiber, instance);

	// Set up parent relationship using cached instances
	if (fiber.return) {
		instance.parent = fiberToVDOMInstance(fiber.return);
	}

	return instance;
}

/**
 * Register a fiber with the event system
 * This is called after creating/updating DOM nodes
 */
function registerFiberWithEventSystem(fiber: Fiber): void {
	// Only register host components and text nodes (things with DOM nodes)
	if (fiber.stateNode && typeof fiber.type === "string") {
		const vdomInstance = fiberToVDOMInstance(fiber);
		const domNode = fiber.stateNode as Node;
		eventSystem.registerInstance(vdomInstance, domNode);

		// Ensure event listeners are set up for any event handlers in props
		const props = fiber.memoizedProps || fiber.pendingProps;
		if (props && typeof props === "object") {
			eventSystem.hasEventHandlers(props as Record<string, unknown>);
		}
	}
}

/**
 * Append all children's DOM nodes to this parent DOM node
 *
 * This is tricky because:
 * - Some children are host components (have DOM nodes)
 * - Some are functional components (don't have DOM nodes)
 * - Some are fragments (multiple DOM nodes)
 * - Some are portals (render elsewhere)
 *
 * We need to find all the actual DOM nodes in the subtree.
 */
function appendAllChildren(parent: Node, workInProgress: Fiber): void {
	let node = workInProgress.child;

	while (node !== null) {
		if (node.stateNode !== null && typeof node.type === "string") {
			// Host component or TEXT_ELEMENT - append its DOM node
			parent.appendChild(node.stateNode as Node);
		} else if (node.type === FRAGMENT) {
			// Fragment - append its children's DOM nodes
			appendAllChildren(parent, node);
		} else if (node.type === PORTAL) {
			// Portal - don't append (renders to different container)
		} else {
			// Functional component - find its DOM nodes by walking children
			if (node.child !== null) {
				node.child.return = node;
				node = node.child;
				continue;
			}
		}

		// Done with this node, move to sibling or return to parent
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
