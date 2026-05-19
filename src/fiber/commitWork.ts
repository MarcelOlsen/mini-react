/* **************** */
/* Commit Work - DOM Mutations */
/* **************** */

/**
 * Implements the DOM mutation operations for the commit phase.
 * These functions perform actual DOM manipulations based on fiber flags.
 */

import { eventSystem } from "../events/eventSystem";
import type { FunctionComponentUpdateQueue } from "./effectList";
import {
	collectHostChildren,
	findHostParent,
	findHostSibling,
	getHostParentNode,
} from "./fiberUtils";
import {
	isHTMLInputElement,
	isHostComponentFiber,
	isHostPortalFiber,
	isHostTextFiber,
	isTextProps,
} from "./typeGuards";
import type { Effect, Fiber, FiberRoot } from "./types";
import { WorkTag } from "./types";

// ============================================
// Placement (Insertion)
// ============================================

/**
 * Commits a placement (insertion) for a fiber.
 * Inserts the fiber's host node into the DOM.
 */
export function commitPlacement(finishedWork: Fiber): void {
	const parentFiber = findHostParent(finishedWork);
	if (parentFiber === null) {
		return;
	}

	const parentNode = getHostParentNode(finishedWork);
	if (parentNode === null) {
		return;
	}

	// Find the sibling to insert before
	// Optimization: during initial mount of the entire tree (parent also has no
	// alternate), all siblings have Placement flag so findHostSibling returns null.
	// But when inserting new fibers during an update, we must find the correct position.
	const parentIsMount = parentFiber.alternate === null;
	const isFullMount = finishedWork.alternate === null && parentIsMount;
	const before = isFullMount ? null : findHostSibling(finishedWork);

	// Insert the node(s)
	insertOrAppendPlacementNode(finishedWork, before, parentNode);
}

/**
 * Inserts or appends a fiber's host nodes into the parent.
 */
function insertOrAppendPlacementNode(
	node: Fiber,
	before: Element | Text | null,
	parent: Element,
): void {
	if (isHostComponentFiber(node) || isHostTextFiber(node)) {
		const stateNode = node.stateNode;
		if (before !== null) {
			parent.insertBefore(stateNode, before);
		} else {
			parent.appendChild(stateNode);
		}
	} else if (isHostPortalFiber(node)) {
		// Portals manage their own container
	} else if (node.child !== null) {
		// For function components, traverse children
		let child: Fiber | null = node.child;
		while (child !== null) {
			insertOrAppendPlacementNode(child, before, parent);
			child = child.sibling;
		}
	}
}

// ============================================
// Update
// ============================================

/**
 * Commits an update for a fiber.
 * Updates the DOM node's properties.
 */
export function commitUpdate(finishedWork: Fiber): void {
	if (isHostComponentFiber(finishedWork)) {
		const instance = finishedWork.stateNode;
		const newProps = finishedWork.memoizedProps;
		const oldProps = finishedWork.alternate?.memoizedProps ?? null;

		if (newProps !== null) {
			updateDomProperties(instance, oldProps, newProps);
		}
		return;
	}

	if (isHostTextFiber(finishedWork)) {
		const textInstance = finishedWork.stateNode;
		const props = finishedWork.memoizedProps;
		const newText = isTextProps(props) ? props.nodeValue : "";
		textInstance.nodeValue = String(newText);
	}
}

/**
 * Updates DOM properties on an element.
 */
function updateDomProperties(
	dom: Element,
	prevProps: Record<string, unknown> | null,
	nextProps: Record<string, unknown>,
): void {
	// Remove old properties
	if (prevProps !== null) {
		for (const name of Object.keys(prevProps)) {
			if (name === "children" || name === "key" || name === "ref") {
				continue;
			}
			if (!(name in nextProps)) {
				removeDomProperty(dom, name, prevProps[name]);
			}
		}
	}

	// Add/update new properties
	for (const name of Object.keys(nextProps)) {
		if (name === "children" || name === "key" || name === "ref") {
			continue;
		}
		const prevValue = prevProps?.[name];
		const nextValue = nextProps[name];

		if (prevValue !== nextValue) {
			setDomProperty(dom, name, nextValue);
		}
	}
}

/**
 * Sets a property on a DOM element.
 */
function setDomProperty(dom: Element, name: string, value: unknown): void {
	if (name.startsWith("on")) {
		// Event handlers are managed by the event delegation system
		// Do NOT set them as DOM properties (would cause double firing)
		return;
	}
	if (name === "style") {
		if (dom instanceof HTMLElement) {
			if (typeof value === "object" && value !== null) {
				Object.assign(dom.style, value);
			} else if (typeof value === "string") {
				dom.style.cssText = value;
			}
		}
	} else if (name === "className") {
		dom.setAttribute("class", String(value));
	} else if (name === "htmlFor") {
		dom.setAttribute("for", String(value));
	} else if (name === "value" && isHTMLInputElement(dom)) {
		dom.value = String(value ?? "");
		// Also set the attribute for consistency with getAttribute
		dom.setAttribute("value", String(value ?? ""));
	} else if (name === "checked" && isHTMLInputElement(dom)) {
		dom.checked = Boolean(value);
	} else if (name === "dangerouslySetInnerHTML") {
		if (isDangerouslySetInnerHTML(value)) {
			dom.innerHTML = value.__html;
		}
	} else if (value === true) {
		dom.setAttribute(name, "");
	} else if (value === false || value === null || value === undefined) {
		dom.removeAttribute(name);
	} else {
		dom.setAttribute(name, String(value));
	}
}

/**
 * Type guard for dangerouslySetInnerHTML value.
 */
function isDangerouslySetInnerHTML(
	value: unknown,
): value is { __html: string } {
	return (
		value !== null &&
		typeof value === "object" &&
		"__html" in value &&
		typeof (value as { __html: unknown }).__html === "string"
	);
}

/**
 * Removes a property from a DOM element.
 */
function removeDomProperty(dom: Element, name: string, _value: unknown): void {
	if (name.startsWith("on")) {
		// Event handlers are managed by the event delegation system
		// No need to remove from DOM
		return;
	}
	if (name === "style") {
		if (dom instanceof HTMLElement) {
			dom.style.cssText = "";
		}
	} else if (name === "className") {
		dom.removeAttribute("class");
	} else if (name === "htmlFor") {
		dom.removeAttribute("for");
	} else if (name === "value" && isHTMLInputElement(dom)) {
		dom.value = "";
	} else if (name === "checked" && isHTMLInputElement(dom)) {
		dom.checked = false;
	} else {
		dom.removeAttribute(name);
	}
}

// ============================================
// Deletion
// ============================================

/**
 * Collects host children from inside a portal.
 * Unlike collectHostChildren, this starts from the portal's child fiber
 * and collects host nodes without skipping the portal itself.
 */
function collectPortalHostChildren(portalFiber: Fiber): (Element | Text)[] {
	const children: (Element | Text)[] = [];
	let node: Fiber | null = portalFiber.child;

	if (node === null) {
		return children;
	}

	while (true) {
		if (isHostComponentFiber(node) || isHostTextFiber(node)) {
			children.push(node.stateNode);
		} else if (isHostPortalFiber(node)) {
			// Skip nested portals - they manage their own DOM
		} else if (node.child !== null) {
			node = node.child;
			continue;
		}

		// Go back to portal fiber means we're done
		if (node === portalFiber.child && node.sibling === null) {
			break;
		}

		while (node.sibling === null) {
			if (node.return === null || node.return === portalFiber) {
				return children;
			}
			node = node.return;
		}

		node = node.sibling;
	}

	return children;
}

/**
 * Commits a deletion for a fiber.
 * Removes the fiber's host nodes from the DOM.
 */
export function commitDeletion(
	finishedRoot: FiberRoot,
	current: Fiber,
	_renderPriorityLevel: number,
): void {
	// Handle portal deletion specially - portal children are in a different container
	if (isHostPortalFiber(current)) {
		const portalContainer = current.stateNode.containerInfo;
		// Remove all portal children from the portal container
		commitNestedUnmounts(finishedRoot, current);
		// For portals, we need to collect children differently since collectHostChildren
		// skips portal subtrees. We collect from the portal's children directly.
		const hostNodes = collectPortalHostChildren(current);
		for (const node of hostNodes) {
			if (node.parentNode === portalContainer) {
				portalContainer.removeChild(node);
			}
		}
		detachFiberMutation(current);
		return;
	}

	// Get the parent node
	const parentNode = getHostParentNode(current);
	if (parentNode === null) {
		return;
	}

	// Remove all host children
	commitNestedUnmounts(finishedRoot, current);

	// Remove from DOM
	const hostNodes = collectHostChildren(current);
	for (const node of hostNodes) {
		if (node.parentNode === parentNode) {
			parentNode.removeChild(node);
		}
	}

	// Detach the fiber
	detachFiberMutation(current);
}

/**
 * Recursively unmounts nested components.
 */
function commitNestedUnmounts(finishedRoot: FiberRoot, root: Fiber): void {
	let node: Fiber | null = root;

	while (true) {
		commitUnmount(finishedRoot, node);

		if (node.child !== null && node.tag !== WorkTag.HostPortal) {
			node = node.child;
			continue;
		}

		if (node === root) {
			return;
		}

		while (node.sibling === null) {
			if (node.return === null || node.return === root) {
				return;
			}
			node = node.return;
		}

		node = node.sibling;
	}
}

/**
 * Unmounts a single fiber (cleanup refs and effects).
 */
function commitUnmount(_finishedRoot: FiberRoot, current: Fiber): void {
	// Clean up ref
	const ref = current.ref;
	if (ref !== null) {
		if (typeof ref === "function") {
			try {
				ref(null);
			} catch (error) {
				console.error("Error in ref cleanup:", error);
			}
		} else if ("current" in ref) {
			ref.current = null;
		}
	}

	// Run effect cleanups for function components
	if (current.tag === WorkTag.FunctionComponent) {
		const updateQueue =
			current.updateQueue as FunctionComponentUpdateQueue | null;
		if (updateQueue !== null && updateQueue.lastEffect !== null) {
			const lastEffect = updateQueue.lastEffect;
			const firstEffect = lastEffect.next;
			if (firstEffect !== null) {
				let effect: Effect | null = firstEffect;
				do {
					const destroy = effect.destroy;
					if (destroy !== undefined) {
						try {
							destroy();
						} catch (error) {
							console.error("Error in effect cleanup during unmount:", error);
						}
					}
					effect = effect.next;
				} while (effect !== null && effect !== firstEffect);
			}
		}
	}

	// Unregister from event system
	if (isHostComponentFiber(current) || isHostTextFiber(current)) {
		eventSystem.unregisterFiber(current);
	}
}

/**
 * Detaches a fiber from the tree (for GC).
 */
function detachFiberMutation(fiber: Fiber): void {
	// Clear the alternate
	const alternate = fiber.alternate;
	if (alternate !== null) {
		alternate.return = null;
	}
	fiber.return = null;
}

// ============================================
// Ref Operations
// ============================================

/**
 * Attaches a ref to a fiber's state node.
 */
export function commitAttachRef(finishedWork: Fiber): void {
	const ref = finishedWork.ref;
	if (ref === null) {
		return;
	}

	const instance = finishedWork.stateNode;
	if (instance === null) {
		return;
	}

	if (typeof ref === "function") {
		const refValue = isHostComponentFiber(finishedWork)
			? finishedWork.stateNode
			: instance;
		ref(refValue as Element | null);
	} else if ("current" in ref) {
		(ref as { current: unknown }).current = instance;
	}
}

/**
 * Detaches a ref from a fiber's state node.
 */
export function commitDetachRef(current: Fiber): void {
	const ref = current.ref;
	if (ref === null) {
		return;
	}

	if (typeof ref === "function") {
		ref(null);
	} else if ("current" in ref) {
		ref.current = null;
	}
}

// ============================================
// DOM Node Creation
// ============================================

/**
 * Creates a DOM node for a host component fiber.
 */
export function createInstance(
	type: string,
	props: Record<string, unknown>,
	internalInstanceHandle: Fiber,
): Element {
	const domElement = document.createElement(type);

	// Apply initial properties
	for (const name of Object.keys(props)) {
		if (name === "children" || name === "key" || name === "ref") {
			continue;
		}
		setDomProperty(domElement, name, props[name]);
	}

	// Register with event system for fiber-based event handling
	eventSystem.registerFiber(internalInstanceHandle, domElement);

	// Check for event handlers and register them
	eventSystem.hasEventHandlers(props);

	return domElement;
}

/**
 * Creates a text node.
 */
export function createTextInstance(text: string | number): Text {
	return document.createTextNode(String(text));
}

/**
 * Appends a child to a parent DOM node.
 */
export function appendChild(parent: Element, child: Element | Text): void {
	parent.appendChild(child);
}

/**
 * Appends children to the initial render.
 */
export function appendChildToContainer(
	container: Element,
	child: Element | Text,
): void {
	container.appendChild(child);
}

/**
 * Inserts a child before a sibling.
 */
export function insertBefore(
	parent: Element,
	child: Element | Text,
	before: Element | Text,
): void {
	parent.insertBefore(child, before);
}

/**
 * Removes a child from a parent.
 */
export function removeChild(parent: Element, child: Element | Text): void {
	parent.removeChild(child);
}

// ============================================
// Finalize Operations
// ============================================

/**
 * Finalizes initial children for a host component.
 * Called during complete phase to handle text content.
 */
export function finalizeInitialChildren(
	_domElement: Element,
	type: string,
	props: Record<string, unknown>,
): boolean {
	// Check if we need to auto-focus
	if (
		type === "button" ||
		type === "input" ||
		type === "select" ||
		type === "textarea"
	) {
		if (props["autoFocus"]) {
			return true;
		}
	}
	return false;
}

/**
 * Prepares an update for a host component.
 * Returns the update payload or null if no update needed.
 */
export function prepareUpdate(
	_domElement: Element,
	_type: string,
	oldProps: Record<string, unknown>,
	newProps: Record<string, unknown>,
): Record<string, unknown>[] | null {
	// Check if any props changed
	let hasChanges = false;
	const updatePayload: Record<string, unknown>[] = [];

	for (const key of Object.keys(newProps)) {
		if (key === "children" || key === "key") {
			continue;
		}
		if (oldProps[key] !== newProps[key]) {
			hasChanges = true;
			updatePayload.push({ [key]: newProps[key] });
		}
	}

	for (const key of Object.keys(oldProps)) {
		if (key === "children" || key === "key") {
			continue;
		}
		if (!(key in newProps)) {
			hasChanges = true;
			updatePayload.push({ [key]: null });
		}
	}

	return hasChanges ? updatePayload : null;
}
