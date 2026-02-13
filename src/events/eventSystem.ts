/* ************ */
/* Event System */
/* ************ */

import type { Fiber } from "../fiber/types";
import { WorkTag } from "../fiber/types";
import {
	type EventHandler,
	type InternalSyntheticEvent,
	MINI_REACT_EVENT_TO_NATIVE_EVENT,
	type MiniReactEventName,
	type NativeEventName,
	type SyntheticEvent,
} from "./types";

/**
 * Events that need to be captured in the capture phase for proper handling
 */
const CAPTURE_EVENTS = new Set<NativeEventName>([
	"focus",
	"blur",
	"scroll",
	"load",
	"error",
]);

/**
 * Events that should use passive listeners for better performance
 */
const PASSIVE_EVENTS = new Set<NativeEventName>([
	"wheel",
	"touchstart",
	"touchmove",
]);

/**
 * Creates a synthetic event wrapper around a native DOM event.
 * This provides MiniReact-compatible event handling with normalized behavior.
 *
 * @param nativeEvent - The native DOM event to wrap
 * @returns A synthetic event with MiniReact-compatible interface
 */
function createSyntheticEvent(nativeEvent: Event): SyntheticEvent {
	let defaultPrevented = false;
	let propagationStopped = false;
	let immediatePropagationStopped = false;

	const syntheticEvent: SyntheticEvent = {
		nativeEvent,
		target: nativeEvent.target as Element,
		currentTarget: nativeEvent.currentTarget as Element,
		type: nativeEvent.type,
		bubbles: nativeEvent.bubbles,
		cancelable: nativeEvent.cancelable,
		get defaultPrevented() {
			return defaultPrevented || nativeEvent.defaultPrevented;
		},
		eventPhase: nativeEvent.eventPhase,
		isTrusted: nativeEvent.isTrusted,
		timeStamp: nativeEvent.timeStamp,

		preventDefault() {
			defaultPrevented = true;
			nativeEvent.preventDefault();
		},

		stopPropagation() {
			propagationStopped = true;
			nativeEvent.stopPropagation();
		},

		stopImmediatePropagation() {
			immediatePropagationStopped = true;
			propagationStopped = true;
			nativeEvent.stopImmediatePropagation();
		},
	};

	// Add internal getters for propagation state (used by event system)
	Object.defineProperty(syntheticEvent, "_propagationStopped", {
		get: () => propagationStopped,
		enumerable: false,
	});
	Object.defineProperty(syntheticEvent, "_immediatePropagationStopped", {
		get: () => immediatePropagationStopped,
		enumerable: false,
	});

	return syntheticEvent;
}

/**
 * Core event system class that implements the MiniReact event system.
 *
 * This system uses a single event listener on the root container to handle
 * all events, then routes them to the appropriate handlers based on the
 * event target and fiber tree structure.
 *
 * Features:
 * - Event delegation for performance
 * - Synthetic event creation
 * - Capture and bubble phase handling
 * - Automatic event listener registration
 * - Memory leak prevention through proper cleanup
 */
class EventSystem {
	/** The root DOM container where events are delegated from */
	private rootContainer: Element | null = null;

	/** Set of native event types that have been registered for delegation */
	private registeredEvents = new Set<NativeEventName>();

	/** Maps Fiber nodes to their corresponding DOM nodes */
	private fiberToNode = new WeakMap<Fiber, Node>();

	/** Maps DOM nodes to their corresponding Fiber nodes */
	private nodeToFiber = new WeakMap<Node, Fiber>();

	/** Cached bound handler function to ensure same reference for add/remove event listeners */
	private boundHandleDelegatedEvent: (event: Event) => void;

	/** Set of portal containers that need event delegation */
	private portalContainers = new Set<Element>();

	constructor() {
		// Cache the bound handler function once to ensure consistent reference
		this.boundHandleDelegatedEvent = this.handleDelegatedEvent.bind(this);
	}

	/**
	 * Initializes the event system with a root container element.
	 * If a different container was previously used, cleans up the old one first.
	 *
	 * @param container - The root DOM element to attach event listeners to
	 */
	initialize(container: Element): void {
		// If we already have a root container, clean up first
		if (this.rootContainer && this.rootContainer !== container) {
			this.cleanup();
		}
		this.rootContainer = container;
	}

	/**
	 * Enables fiber-based event handling mode.
	 * Kept for API compatibility with createRoot.
	 */
	enableFiberMode(): void {
		// No-op: fiber mode is now the only mode
	}

	/**
	 * Adds event delegation to a container (for portals)
	 * This allows portal containers to delegate events to the main event system
	 *
	 * @param container - The container to add event delegation to
	 */
	addEventDelegation(container: Element): void {
		// Track this portal container
		this.portalContainers.add(container);

		// Add event listeners to this container for all registered events
		for (const eventName of this.registeredEvents) {
			const eventOptions = this.getEventOptions(eventName);
			container.addEventListener(
				eventName,
				this.boundHandleDelegatedEvent,
				eventOptions,
			);
		}
	}

	/**
	 * Registers a Fiber with its corresponding DOM node.
	 * This creates the mapping needed for fiber-based event delegation.
	 *
	 * @param fiber - The Fiber to register
	 * @param domNode - The DOM node associated with the fiber
	 */
	registerFiber(fiber: Fiber, domNode: Node): void {
		this.fiberToNode.set(fiber, domNode);
		if (domNode) {
			this.nodeToFiber.set(domNode, fiber);
		}
	}

	/**
	 * Unregisters a Fiber and removes its DOM node mapping.
	 * Should be called when fibers are deleted to prevent memory leaks.
	 *
	 * @param fiber - The Fiber to unregister
	 */
	unregisterFiber(fiber: Fiber): void {
		const domNode = this.fiberToNode.get(fiber);
		if (domNode) {
			this.nodeToFiber.delete(domNode);
		}
		this.fiberToNode.delete(fiber);
	}

	/**
	 * Ensures that an event listener is attached for the specified native event type.
	 * Uses event delegation by attaching a single listener to the root container.
	 */
	private ensureEventListener(nativeEventName: NativeEventName): void {
		if (!this.registeredEvents.has(nativeEventName)) {
			const eventOptions = this.getEventOptions(nativeEventName);

			// Add to root container
			if (this.rootContainer) {
				this.rootContainer.addEventListener(
					nativeEventName,
					this.boundHandleDelegatedEvent,
					eventOptions,
				);
			}

			// Add to all portal containers
			for (const portalContainer of this.portalContainers) {
				portalContainer.addEventListener(
					nativeEventName,
					this.boundHandleDelegatedEvent,
					eventOptions,
				);
			}

			this.registeredEvents.add(nativeEventName);
		}
	}

	/**
	 * Determines the appropriate event listener options for a given event type.
	 */
	private getEventOptions(
		eventName: NativeEventName,
	): boolean | AddEventListenerOptions {
		if (CAPTURE_EVENTS.has(eventName)) {
			return { capture: true };
		}
		if (PASSIVE_EVENTS.has(eventName)) {
			return { passive: true };
		}
		return false;
	}

	/**
	 * Main event delegation handler that processes all delegated events.
	 * Creates synthetic events and routes them through the proper capture/bubble phases.
	 */
	private handleDelegatedEvent(nativeEvent: Event): void {
		const target = nativeEvent.target as Node;
		if (!target) return;

		const syntheticEvent = createSyntheticEvent(nativeEvent);

		const reactEventName = this.getReactEventName(
			nativeEvent.type as NativeEventName,
		);
		if (!reactEventName) return;

		const eventPath = this.getEventPathFiber(target);

		const eventHandlers = this.collectEventHandlersFiber(
			eventPath,
			reactEventName,
		);

		this.executeEventHandlersFiber(eventHandlers, syntheticEvent);
	}

	/**
	 * Builds the event path for a given target node using fiber tree structure.
	 * For portal children, follows React component hierarchy instead of DOM.
	 */
	private getEventPathFiber(target: Node): Fiber[] {
		const path: Fiber[] = [];
		let currentNode: Node | null = target;

		while (currentNode) {
			const fiber = this.nodeToFiber.get(currentNode);
			if (fiber) {
				path.unshift(fiber);

				const portalParent = this.findPortalParentFiber(fiber);
				if (portalParent) {
					path.unshift(portalParent);

					let reactParent = portalParent.return;
					while (reactParent) {
						if (
							reactParent.tag === WorkTag.HostComponent ||
							reactParent.tag === WorkTag.FunctionComponent
						) {
							path.unshift(reactParent);
						}
						reactParent = reactParent.return;
					}
					break;
				}
			}

			currentNode = currentNode.parentNode;

			if (!this.rootContainer?.contains(currentNode) && !fiber) {
				break;
			}
		}

		return path;
	}

	/**
	 * Finds if a given fiber is a child of a portal by walking up the fiber tree.
	 */
	private findPortalParentFiber(fiber: Fiber): Fiber | null {
		let current = fiber.return;
		while (current) {
			if (current.tag === WorkTag.HostPortal) {
				return current;
			}
			current = current.return;
		}
		return null;
	}

	/**
	 * Collects all event handlers for a given MiniReact event name along the fiber path.
	 */
	private collectEventHandlersFiber(
		eventPath: Fiber[],
		reactEventName: MiniReactEventName,
	): Array<{
		fiber: Fiber;
		handler: EventHandler;
		capture?: boolean;
	}> {
		const handlers: Array<{
			fiber: Fiber;
			handler: EventHandler;
			capture?: boolean;
		}> = [];

		for (const fiber of eventPath) {
			const props = (fiber.pendingProps ?? fiber.memoizedProps) as Record<
				string,
				unknown
			> | null;
			if (!props) continue;

			const captureEventName = `${reactEventName}Capture`;
			if (
				props[captureEventName] &&
				typeof props[captureEventName] === "function"
			) {
				handlers.push({
					fiber,
					handler: props[captureEventName] as EventHandler,
					capture: true,
				});
			}

			if (
				props[reactEventName] &&
				typeof props[reactEventName] === "function"
			) {
				handlers.push({
					fiber,
					handler: props[reactEventName] as EventHandler,
					capture: false,
				});
			}
		}

		return handlers;
	}

	/**
	 * Executes collected fiber event handlers in the proper order (capture then bubble).
	 */
	private executeEventHandlersFiber(
		eventHandlers: Array<{
			fiber: Fiber;
			handler: EventHandler;
			capture?: boolean;
		}>,
		syntheticEvent: SyntheticEvent,
	): void {
		const internalEvent = syntheticEvent as InternalSyntheticEvent;

		// Execute capture handlers first (in capture order)
		for (const { fiber, handler, capture } of eventHandlers) {
			if (capture) {
				const domNode = this.fiberToNode.get(fiber);
				if (domNode) {
					syntheticEvent.currentTarget = domNode as Element;
					handler(syntheticEvent);

					if (internalEvent._immediatePropagationStopped) {
						return;
					}
				}
			}
		}

		if (internalEvent._propagationStopped) {
			return;
		}

		// Execute bubble handlers in reverse order (bubble up from target)
		const bubbleHandlers = eventHandlers.filter((h) => !h.capture).reverse();
		for (const { fiber, handler } of bubbleHandlers) {
			const domNode = this.fiberToNode.get(fiber);
			if (domNode) {
				syntheticEvent.currentTarget = domNode as Element;
				handler(syntheticEvent);

				if (internalEvent._immediatePropagationStopped) {
					return;
				}
				if (internalEvent._propagationStopped) {
					return;
				}
			}
		}
	}

	/**
	 * Converts a native DOM event name to its corresponding MiniReact event name.
	 */
	private getReactEventName(
		nativeEventName: NativeEventName,
	): MiniReactEventName | null {
		for (const [reactName, nativeName] of Object.entries(
			MINI_REACT_EVENT_TO_NATIVE_EVENT,
		)) {
			if (nativeName === nativeEventName) {
				return reactName as MiniReactEventName;
			}
		}
		return null;
	}

	/**
	 * Checks if an element's props contain event handlers that need delegation.
	 * Automatically registers event listeners for any found event handlers.
	 */
	hasEventHandlers(props: Record<string, unknown>): boolean {
		let hasHandlers = false;
		for (const propName of Object.keys(props)) {
			if (propName.startsWith("on") && typeof props[propName] === "function") {
				const reactEventName = propName as MiniReactEventName;
				const nativeEventName =
					MINI_REACT_EVENT_TO_NATIVE_EVENT[reactEventName];
				if (nativeEventName) {
					this.ensureEventListener(nativeEventName);
					hasHandlers = true;
				}
			}
		}
		return hasHandlers;
	}

	/**
	 * Cleans up the event system by removing all event listeners and clearing mappings.
	 */
	cleanup(): void {
		if (this.rootContainer) {
			for (const eventName of this.registeredEvents) {
				this.rootContainer.removeEventListener(
					eventName,
					this.boundHandleDelegatedEvent,
				);
			}
		}
		this.registeredEvents.clear();
		this.fiberToNode = new WeakMap();
		this.nodeToFiber = new WeakMap();
		this.rootContainer = null;
	}
}

/**
 * Global singleton instance of the event system.
 */
export const eventSystem = new EventSystem();
