import { createDomNode, removeDomNode, replaceDomNode } from "./domRenderer";
import { eventSystem } from "./eventSystem";
import type {
	AnyMiniReactElement,
	FunctionalComponent,
	VDOMInstance,
} from "./types";
import { FRAGMENT } from "./types";

// Import scheduleEffect to properly schedule cleanup
let scheduleEffectFunction: ((effectFn: () => void) => void) | null = null;
// Context management functions
let pushContextFunction:
	| ((contextValues: Map<symbol, unknown>) => void)
	| null = null;
let popContextFunction: (() => void) | null = null;

export function setScheduleEffect(
	scheduleEffect: (effectFn: () => void) => void,
): void {
	scheduleEffectFunction = scheduleEffect;
}

export function setContextHooks(
	pushContext: (contextValues: Map<symbol, unknown>) => void,
	popContext: () => void,
): void {
	pushContextFunction = pushContext;
	popContextFunction = popContext;
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

		// Handle DOM cleanup - fragments need special handling
		if (oldInstance.element.type === FRAGMENT) {
			// For fragments, recursively clean up all children
			for (const childInstance of oldInstance.childInstances) {
				reconcile(null, null, childInstance);
			}
		} else if (oldInstance.dom && newInstance.dom) {
			// For regular elements, replace the DOM node
			eventSystem.unregisterInstance(oldInstance);
			replaceDomNode(oldInstance.dom, newInstance.dom);
		} else if (oldInstance.dom) {
			// If old instance had DOM but new doesn't, just remove old
			eventSystem.unregisterInstance(oldInstance);
			removeDomNode(oldInstance.dom);
		}

		return newInstance;
	}

	// Case 4: Same type - update existing instance
	return updateVDOMInstance(oldInstance, newElement);
}

/**
 * Creates a new VDOM instance for the given element and attaches it to the parent DOM
 *
 * @param parentDom The parent DOM node
 * @param element The element to create an instance for
 * @returns The created VDOM instance
 */
function createVDOMInstance(
	parentDom: Node,
	element: AnyMiniReactElement,
): VDOMInstance {
	const { type, props } = element;

	// Handle fragments
	if (type === FRAGMENT) {
		const instance: VDOMInstance = {
			element,
			dom: null, // Fragments don't have their own DOM node
			childInstances: [],
			rootContainer: parentDom.nodeType === Node.ELEMENT_NODE ? parentDom as HTMLElement : undefined,
		};

		// Use reconcileChildren to handle fragment children properly
		// This will ensure correct ordering through reorderDomNodes
		instance.childInstances = reconcileChildren(
			parentDom,
			[],
			props.children,
			instance,
		);

		return instance;
	}

	// Handle functional components
	if (typeof type === "function") {
		// Create the instance
		const instance: VDOMInstance = {
			element,
			dom: null,
			childInstances: [],
			hooks: [], // Initialize hooks array
			rootContainer: parentDom.nodeType === Node.ELEMENT_NODE ? parentDom as HTMLElement : undefined,
		};

		// Set hook context before calling component
		setCurrentRenderInstance(instance);

		let childElement: AnyMiniReactElement | null;
		try {
			childElement = (type as FunctionalComponent)(props);
		} finally {
			setCurrentRenderInstance(null); // always reset
		}
		// Check if this component is a context provider (has contextValues)
		// and push context BEFORE reconciling children
		let contextWasPushed = false;
		if (instance.contextValues && pushContextFunction) {
			pushContextFunction(instance.contextValues);
			contextWasPushed = true;
		}

		let childInstance: VDOMInstance | null = null;
		try {
			childInstance = childElement
				? createVDOMInstance(parentDom, childElement)
				: null;
		} finally {
			// Pop context AFTER reconciling children - ensure this happens even on exceptions
			if (contextWasPushed && popContextFunction) {
				popContextFunction();
			}
		}

		if (childInstance) {
			childInstance.parent = instance; // Set parent reference for functional component child
		}

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
		rootContainer: parentDom.nodeType === Node.ELEMENT_NODE ? parentDom as HTMLElement : undefined,
	};

	// Register with event system for host elements
	eventSystem.registerInstance(instance, domNode);

	// Check if this element has event handlers that need delegation
	eventSystem.hasEventHandlers(props as Record<string, unknown>);

	// Process children
	for (const child of props.children) {
		const childInstance = createVDOMInstance(domNode, child);
		childInstance.parent = instance; // Set parent reference
		childInstances.push(childInstance);

		// Handle DOM insertion based on child type
		if (childInstance.element.type === FRAGMENT) {
			// For fragments, append all their DOM children
			for (const fragChild of childInstance.childInstances) {
				if (fragChild.dom) {
					domNode.appendChild(fragChild.dom);
				}
			}
		} else if (childInstance.dom) {
			// For regular elements, append the DOM node
			domNode.appendChild(childInstance.dom);
		}
	}

	// Update instance with children
	instance.childInstances = childInstances;

	// Append to parent
	parentDom.appendChild(domNode);

	return instance;
}

// Hook context function - will be set by MiniReact module
let setCurrentRenderInstance: (instance: VDOMInstance | null) => void =
	() => { };

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
	if (key === "key") {
		// Keys are used internally for reconciliation and should not be set as DOM attributes
		return;
	}
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
 * @param parentInstance The parent VDOM instance (optional)
 * @returns The updated child instances
 */
function reconcileChildren(
	parentDom: Node,
	oldChildInstances: VDOMInstance[],
	newChildElements: AnyMiniReactElement[],
	parentInstance?: VDOMInstance,
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
			// Set parent reference for the new child instance
			newChildInstance.parent = parentInstance;
			// Inherit rootContainer if child doesn't have one
			if (!newChildInstance.rootContainer && parentInstance?.rootContainer) {
				newChildInstance.rootContainer = parentInstance.rootContainer;
			}
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
	// Collect all DOM nodes that should be in this parent, in order
	const targetDomNodes: Node[] = [];

	function collectDomNodes(instances: VDOMInstance[]): void {
		for (const instance of instances) {
			if (instance.dom && instance.dom.parentNode === parentDom) {
				targetDomNodes.push(instance.dom);
			} else if (instance.element.type === FRAGMENT) {
				// For fragments, collect their children's DOM nodes
				collectDomNodes(instance.childInstances);
			}
		}
	}

	collectDomNodes(childInstances);

	// Now reorder the DOM nodes to match the target order
	let currentDomChild = parentDom.firstChild;
	for (const targetNode of targetDomNodes) {
		if (currentDomChild !== targetNode) {
			parentDom.insertBefore(targetNode, currentDomChild);
		}
		currentDomChild = targetNode.nextSibling;
	}
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

	// Handle fragments - update children directly
	if (type === FRAGMENT) {
		// Update the element reference
		instance.element = newElement;

		// Find the parent DOM node to reconcile children into
		let parentNode: Node | null = null;

		// Strategy 1: Check if parent instance has DOM
		if (instance.parent?.dom) {
			parentNode = instance.parent.dom;
		}
		// Strategy 2: Check if any existing child has a parent DOM
		else if (instance.childInstances[0]?.dom?.parentNode) {
			parentNode = instance.childInstances[0].dom.parentNode;
		}
		// Strategy 3: Check other children for parent DOM
		else {
			for (const child of instance.childInstances) {
				if (child.dom?.parentNode) {
					parentNode = child.dom.parentNode;
					break;
				}
			}
		}

		// Strategy 4: Walk up parent tree to find DOM node
		if (!parentNode) {
			let currentParent = instance.parent;
			while (currentParent && !parentNode) {
				if (currentParent.dom) {
					parentNode = currentParent.dom;
					break;
				}
				// For fragments, check if any child has a DOM node we can use
				if (currentParent.element.type === FRAGMENT) {
					for (const childInstance of currentParent.childInstances) {
						if (childInstance.dom?.parentNode) {
							parentNode = childInstance.dom.parentNode;
							break;
						}
					}
					if (parentNode) break;
				}
				currentParent = currentParent.parent;
			}
		}

		if (!parentNode) {
			throw new Error(
				"Unable to find parent node for fragment reconciliation",
			);
		}

		// Reconcile fragment children directly with parent DOM
		instance.childInstances = reconcileChildren(
			parentNode,
			instance.childInstances,
			props.children,
			instance,
		);

		return instance;
	}

	// Handle functional components - re-execute and reconcile output
	if (typeof type === "function") {
		// Set hook context before calling component
		setCurrentRenderInstance(instance);

		const childElement = (type as FunctionalComponent)(props);

		setCurrentRenderInstance(null); // Clear context after call

		const oldChildInstance = instance.childInstances[0] || null;

		// Find the correct parent node to reconcile in
		let parentNode: Node | null = null;

		// Strategy 1: Check if old child has a parent DOM node
		if (oldChildInstance?.dom?.parentNode) {
			parentNode = oldChildInstance.dom.parentNode;
		}
		// Strategy 2: Check if this instance has a DOM parent
		else if (instance.dom?.parentNode) {
			parentNode = instance.dom.parentNode;
		}
		// Strategy 3: Walk up the parent tree to find a DOM node
		else {
			let currentParent = instance.parent;
			while (currentParent && !parentNode) {
				if (currentParent.dom) {
					parentNode = currentParent.dom;
					break;
				}
				// For fragments, check if any child has a DOM node we can use
				if (currentParent.element.type === FRAGMENT) {
					for (const childInstance of currentParent.childInstances) {
						if (childInstance.dom?.parentNode) {
							parentNode = childInstance.dom.parentNode;
							break;
						}
					}
					if (parentNode) break;
				}
				currentParent = currentParent.parent;
			}
		}

		// Strategy 4: Check siblings for DOM parents
		if (!parentNode && instance.parent) {
			for (const sibling of instance.parent.childInstances) {
				if (sibling !== instance && sibling.dom?.parentNode) {
					parentNode = sibling.dom.parentNode;
					break;
				}
			}
		}

		// Strategy 5: If still no parent, try to find root container
		if (!parentNode) {
			// Walk up to find the root container by checking if this instance is a root
			let currentInstance: VDOMInstance | undefined = instance;
			while (currentInstance?.parent) {
				currentInstance = currentInstance.parent;
			}
			// Check if any child of root has a DOM node
			if (currentInstance?.childInstances) {
				for (const child of currentInstance.childInstances) {
					if (child.dom?.parentNode) {
						parentNode = child.dom.parentNode;
						break;
					}
				}
			}
			// If we found a root instance, check if it has a rootContainer
			if (!parentNode && currentInstance?.rootContainer) {
				parentNode = currentInstance.rootContainer;
			}
		}

		// Strategy 6: Use instance's own rootContainer as last resort
		if (!parentNode && instance.rootContainer) {
			parentNode = instance.rootContainer;
		}

		if (!parentNode) {
			throw new Error(
				"Unable to find parent node for functional component reconciliation",
			);
		}

		// Special case: if component was rendering something but now returns null,
		// we need to clean up the functional component's effects
		if (oldChildInstance && childElement === null) {
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

		// Check if this component is a context provider (has contextValues)
		// and push context BEFORE reconciling children
		let contextWasPushed = false;
		if (instance.contextValues && pushContextFunction) {
			pushContextFunction(instance.contextValues);
			contextWasPushed = true;
		}

		let childInstance: VDOMInstance | null = null;
		try {
			childInstance = reconcile(parentNode, childElement, oldChildInstance);
			if (childInstance) {
				childInstance.parent = instance;
			}
		} finally {
			// Pop context AFTER reconciling children - ensure this happens even on exceptions
			if (contextWasPushed && popContextFunction) {
				popContextFunction();
			}
		}

		// Update the existing instance in-place instead of creating a new one
		// This preserves the event system mappings and other references
		instance.element = newElement;
		instance.dom = childInstance?.dom || null;
		instance.childInstances = childInstance ? [childInstance] : [];

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
			instance,
		);
	}

	return instance;
}
