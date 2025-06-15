import { createDomNode, removeDomNode, replaceDomNode } from "./domRenderer";
import { eventSystem } from "./eventSystem";
import type {
	AnyMiniReactElement,
	FunctionalComponent,
	VDOMInstance,
} from "./types";

// Import scheduleEffect to properly schedule cleanup
let scheduleEffectFunction: ((effectFn: () => void) => void) | null = null;

export function setScheduleEffect(
	scheduleEffect: (effectFn: () => void) => void,
): void {
	scheduleEffectFunction = scheduleEffect;
}

/* ********** */
/* Reconciler */
/* ********** */

/**
 * Main reconciliation function that handles creation, updates, and removal of VDOM instances
 *
 * @param parentDom The parent DOM node (can be null during cleanup)
 * @param newElement The new element to reconcile
 * @param oldInstance The existing VDOM instance to reconcile against
 * @returns The resulting VDOM instance (null if removed)
 */
export function reconcile(
	parentDom: Node | null,
	newElement: AnyMiniReactElement | null,
	oldInstance: VDOMInstance | null,
): VDOMInstance | null {
	// Case 1: Element removal - newElement is null but oldInstance exists
	if (newElement == null) {
		if (oldInstance) {
			// Schedule cleanup for all effects before removing (maintain async timing)
			if (oldInstance.hooks && scheduleEffectFunction) {
				for (const hook of oldInstance.hooks) {
					if (hook.type === "effect" && hook.cleanup) {
						const cleanup = hook.cleanup;
						scheduleEffectFunction(() => {
							try {
								cleanup();
							} catch (error) {
								console.error(
									"Error in useEffect cleanup during unmount:",
									error,
								);
							}
						});
					}
				}
			}

			// Recursively clean up child instances - no parent DOM needed for cleanup
			for (const childInstance of oldInstance.childInstances) {
				reconcile(null, null, childInstance);
			}

			// Only handle DOM cleanup if instance has a DOM node
			if (oldInstance.dom) {
				// Unregister from event system before removing
				eventSystem.unregisterInstance(oldInstance);
				removeDomNode(oldInstance.dom);
			}
		}
		return null;
	}

	// Case 2: Initial render - oldInstance is null
	if (oldInstance == null) {
		if (!parentDom) {
			throw new Error("Parent DOM node is required for initial render");
		}
		return createVDOMInstance(parentDom, newElement);
	}

	// Case 3: Type change - recreate everything
	if (!isSameElementType(oldInstance.element, newElement)) {
		if (!parentDom) {
			throw new Error(
				"Parent DOM node is required for type change reconciliation",
			);
		}
		const newInstance = createVDOMInstance(parentDom, newElement);

		// Clean up old instance hooks
		if (oldInstance.hooks && scheduleEffectFunction) {
			for (const hook of oldInstance.hooks) {
				if (hook.type === "effect" && hook.cleanup) {
					const cleanup = hook.cleanup;
					scheduleEffectFunction(() => {
						try {
							cleanup();
						} catch (error) {
							console.error(
								"Error in useEffect cleanup during type change:",
								error,
							);
						}
					});
				}
			}
		}

		if (oldInstance.dom && newInstance.dom) {
			// Unregister old instance and register new one
			eventSystem.unregisterInstance(oldInstance);
			replaceDomNode(oldInstance.dom, newInstance.dom);
		}
		return newInstance;
	}

	// Case 4: Same type - update existing instance
	return updateVDOMInstance(oldInstance, newElement);
}

/**
 * Creates a new VDOM instance and corresponding DOM node for initial render
 *
 * @param parentDom The parent DOM node
 * @param element The element to create a VDOM instance for
 * @returns The VDOM instance
 */
function createVDOMInstance(
	parentDom: Node,
	element: AnyMiniReactElement,
): VDOMInstance {
	const { type, props } = element;

	// Handle functional components
	if (typeof type === "function") {
		// Create instance first to establish hook context
		const instance: VDOMInstance = {
			element,
			dom: null,
			childInstances: [],
			hooks: [], // Initialize hooks array
		};

		// Set hook context before calling component
		setCurrentRenderInstance(instance);
		const childElement = (type as FunctionalComponent)(props);
		setCurrentRenderInstance(null); // Clear context after call

		const childInstance = childElement
			? createVDOMInstance(parentDom, childElement)
			: null;

		instance.dom = childInstance?.dom || null;
		instance.childInstances = childInstance ? [childInstance] : [];

		// Don't register functional components with event system
		// They don't have their own DOM nodes and shouldn't be in the event path

		return instance;
	}

	// Handle host elements (including text elements)
	const domNode = createDomNode(element);
	const childInstances: VDOMInstance[] = [];

	// Create the instance
	const instance: VDOMInstance = {
		element,
		dom: domNode,
		childInstances: [],
	};

	// Register with event system for host elements
	eventSystem.registerInstance(instance, domNode);

	// Check if this element has event handlers that need delegation
	eventSystem.hasEventHandlers(props as Record<string, unknown>);

	// Process children
	for (const child of props.children) {
		const childInstance = createVDOMInstance(domNode, child);
		childInstances.push(childInstance);
		if (childInstance.dom) {
			domNode.appendChild(childInstance.dom);
		}
	}

	// Update instance with children
	instance.childInstances = childInstances;

	// Append to parent
	parentDom.appendChild(domNode);

	return instance;
}

/**
 * Updates an existing VDOM instance with a new element (same type)
 *
 * @param instance The existing VDOM instance
 * @param newElement The new element to update the VDOM instance with
 * @returns The updated VDOM instance
 */
function updateVDOMInstance(
	instance: VDOMInstance,
	newElement: AnyMiniReactElement,
): VDOMInstance {
	const { type, props } = newElement;

	// Handle functional components - re-execute and reconcile output
	if (typeof type === "function") {
		// Set hook context before calling component
		setCurrentRenderInstance(instance);
		const newChildElement = (type as FunctionalComponent)(props);
		setCurrentRenderInstance(null); // Clear context after call

		const oldChildInstance = instance.childInstances[0] || null;

		// Find the correct parent node to reconcile in
		let parentNode: Node | null = null;
		if (oldChildInstance?.dom?.parentNode) {
			parentNode = oldChildInstance.dom.parentNode;
		} else if (instance.dom?.parentNode) {
			parentNode = instance.dom.parentNode;
		}

		if (!parentNode) {
			throw new Error(
				"Unable to find parent node for functional component reconciliation",
			);
		}

		// Special case: if component was rendering something but now returns null,
		// we need to clean up the functional component's effects
		if (oldChildInstance && newChildElement === null) {
			// Schedule cleanup for the functional component's hooks when it stops rendering
			if (instance.hooks && scheduleEffectFunction) {
				for (const hook of instance.hooks) {
					if (hook.type === "effect" && hook.cleanup) {
						const cleanup = hook.cleanup;
						scheduleEffectFunction(() => {
							try {
								cleanup();
							} catch (error) {
								console.error(
									"Error in useEffect cleanup during null return:",
									error,
								);
							}
						});
						hook.cleanup = undefined;
						hook.hasRun = false; // Reset for potential future re-renders
					}
				}
			}
		}

		const newChildInstance = reconcile(
			parentNode,
			newChildElement,
			oldChildInstance,
		);

		// Update the existing instance in-place instead of creating a new one
		// This preserves the event system mappings and other references
		instance.element = newElement;
		instance.dom = newChildInstance?.dom || null;
		instance.childInstances = newChildInstance ? [newChildInstance] : [];
		// hooks are already preserved on the instance

		return instance;
	}

	// Handle host elements - use efficient prop diffing
	const oldProps = instance.element.props as Record<string, unknown>;
	instance.element = newElement;

	// For host elements, update only changed DOM attributes using diffProps
	if (instance.dom && instance.dom.nodeType === Node.ELEMENT_NODE) {
		const domElement = instance.dom as Element;
		const newProps = props as Record<string, unknown>;

		// Use efficient prop diffing instead of naive clear-and-set approach
		diffProps(domElement, oldProps, newProps);
	}

	// For now, we'll just update the DOM node if it's a text element
	if (instance.dom && instance.dom.nodeType === Node.TEXT_NODE) {
		instance.dom.nodeValue = String(props.nodeValue);
	}

	// Efficient children reconciliation with key-based diffing
	if (instance.dom) {
		instance.childInstances = reconcileChildren(
			instance.dom,
			instance.childInstances,
			props.children,
		);
	}

	return instance;
}

// Hook context function - will be set by MiniReact module
let setCurrentRenderInstance: (instance: VDOMInstance | null) => void =
	() => {};

/**
 * Sets the hook context function from MiniReact module
 * @param fn The setCurrentRenderInstance function
 */
export function setHookContext(
	fn: (instance: VDOMInstance | null) => void,
): void {
	setCurrentRenderInstance = fn;
}

/**
 * Checks if two elements have the same type for reconciliation purposes
 *
 * @param oldElement The old element
 * @param newElement The new element
 * @returns True if the elements have the same type, false otherwise
 */
function isSameElementType(
	oldElement: AnyMiniReactElement,
	newElement: AnyMiniReactElement,
): boolean {
	return oldElement.type === newElement.type;
}

/**
 * Efficiently diffs props and applies only the necessary DOM updates
 *
 * @param domElement The DOM element to update
 * @param oldProps The previous props
 * @param newProps The new props
 * @param instance The VDOM instance (for event system registration)
 */
function diffProps(
	domElement: Element,
	oldProps: Record<string, unknown>,
	newProps: Record<string, unknown>,
): void {
	// Create sets of old and new prop keys (excluding children)
	const oldKeys = new Set(
		Object.keys(oldProps).filter((key) => key !== "children"),
	);
	const newKeys = new Set(
		Object.keys(newProps).filter((key) => key !== "children"),
	);

	// Remove attributes that are no longer present
	for (const key of oldKeys) {
		if (!newKeys.has(key)) {
			removeAttribute(domElement, key);
		}
	}

	// Add or update attributes
	for (const key of newKeys) {
		const oldValue = oldProps[key];
		const newValue = newProps[key];

		// Only update if the value has actually changed
		if (oldValue !== newValue) {
			setAttribute(domElement, key, newValue);
		}
	}

	// Check if this element has event handlers that need delegation
	eventSystem.hasEventHandlers(newProps);
}

/**
 * Sets an attribute on a DOM element with proper handling for special cases
 *
 * @param domElement The DOM element
 * @param key The attribute key
 * @param value The attribute value
 */
function setAttribute(domElement: Element, key: string, value: unknown): void {
	if (key === "className") {
		domElement.setAttribute("class", String(value));
	} else if (key.startsWith("on") && typeof value === "function") {
		// Event handling is now managed by the event system
		// No need to attach individual listeners here
	} else if (typeof value === "boolean") {
		// Handle boolean attributes specially
		if (value) {
			domElement.setAttribute(key, "");
		} else {
			// Remove the attribute when boolean value is false
			domElement.removeAttribute(key);
		}
	} else if (value !== undefined && value !== null) {
		// Handle all other non-null, non-undefined values
		domElement.setAttribute(key, String(value));
	} else {
		// Remove attribute for null/undefined values
		domElement.removeAttribute(key);
	}
}

/**
 * Removes an attribute from a DOM element with proper handling for special cases
 *
 * @param domElement The DOM element
 * @param key The attribute key
 */
function removeAttribute(domElement: Element, key: string): void {
	if (key === "className") {
		domElement.removeAttribute("class");
	} else {
		domElement.removeAttribute(key);
	}
}

/**
 * Efficiently reconciles children using key-based diffing and DOM node reuse
 *
 * @param parentDom The parent DOM node
 * @param oldChildInstances The existing child VDOM instances
 * @param newChildElements The new child elements to render
 * @returns The updated child instances
 */
function reconcileChildren(
	parentDom: Node,
	oldChildInstances: VDOMInstance[],
	newChildElements: AnyMiniReactElement[],
): VDOMInstance[] {
	// Separate keyed and unkeyed children
	const oldKeyed = new Map<string, VDOMInstance>();
	const oldUnkeyed: VDOMInstance[] = [];
	const newKeyed = new Map<string, AnyMiniReactElement>();
	const newUnkeyed: AnyMiniReactElement[] = [];

	// Categorize old children by key
	for (const oldChild of oldChildInstances) {
		const key = getElementKey(oldChild.element);
		if (key !== null) {
			oldKeyed.set(key, oldChild);
		} else {
			oldUnkeyed.push(oldChild);
		}
	}

	// Categorize new children by key
	for (const newChild of newChildElements) {
		const key = getElementKey(newChild);
		if (key !== null) {
			newKeyed.set(key, newChild);
		} else {
			newUnkeyed.push(newChild);
		}
	}

	const newChildInstances: VDOMInstance[] = [];
	let unkeyedIndex = 0;

	// Process new children in order
	for (let i = 0; i < newChildElements.length; i++) {
		const newChild = newChildElements[i];
		const key = getElementKey(newChild);
		let newChildInstance: VDOMInstance | null = null;

		if (key !== null) {
			// Handle keyed child
			const oldChildInstance = oldKeyed.get(key) || null;
			newChildInstance = reconcile(parentDom, newChild, oldChildInstance);

			// Remove from oldKeyed so we know it's been processed
			if (oldChildInstance) {
				oldKeyed.delete(key);
			}
		} else {
			// Handle unkeyed child - match with next available unkeyed old child
			const oldChildInstance = oldUnkeyed[unkeyedIndex] || null;
			newChildInstance = reconcile(parentDom, newChild, oldChildInstance);
			unkeyedIndex++;
		}

		if (newChildInstance) {
			newChildInstances.push(newChildInstance);
		}
	}

	// Remove any remaining old keyed children that weren't reused
	for (const [, oldChild] of oldKeyed) {
		if (oldChild.dom) {
			eventSystem.unregisterInstance(oldChild);
			removeDomNode(oldChild.dom);
		}
	}

	// Remove any remaining old unkeyed children that weren't reused
	for (let i = unkeyedIndex; i < oldUnkeyed.length; i++) {
		const oldChild = oldUnkeyed[i];
		if (oldChild.dom) {
			eventSystem.unregisterInstance(oldChild);
			removeDomNode(oldChild.dom);
		}
	}

	// Ensure DOM nodes are in correct order
	reorderDomNodes(parentDom, newChildInstances);

	return newChildInstances;
}

/**
 * Extracts the key from an element, returning null if no key is present
 *
 * @param element The element to get the key from
 * @returns The key string or null
 */
function getElementKey(element: AnyMiniReactElement): string | null {
	const key = (element.props as Record<string, unknown>).key;
	return key !== undefined && key !== null ? String(key) : null;
}

/**
 * Reorders DOM nodes to match the order of VDOM instances
 *
 * @param parentDom The parent DOM node
 * @param childInstances The child instances in the desired order
 */
function reorderDomNodes(
	parentDom: Node,
	childInstances: VDOMInstance[],
): void {
	let currentDomChild = parentDom.firstChild;

	for (const childInstance of childInstances) {
		if (childInstance.dom) {
			// If this DOM node is not in the correct position, move it
			if (currentDomChild !== childInstance.dom) {
				parentDom.insertBefore(childInstance.dom, currentDomChild);
			}
			currentDomChild = childInstance.dom.nextSibling;
		}
	}
}
