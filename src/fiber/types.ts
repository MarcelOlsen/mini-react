/**
 * Fiber Architecture - Type Definitions
 *
 * A Fiber is a unit of work in the reconciliation process.
 * It represents a component instance and contains all the information
 * needed to perform incremental rendering.
 */

import type { AnyMiniReactElement, ElementType } from "../core/types";
import type { StateOrEffectHook } from "../hooks/types";

/**
 * Ref types for fiber
 */
export type RefObject<T> = { current: T };
export type RefCallback<T> = (instance: T | null) => void;
export type Ref = RefObject<unknown> | RefCallback<unknown> | null;

/**
 * Props type for fiber
 * Represents any props object that can be passed to a component
 */
export type Props = {
	children?: AnyMiniReactElement[];
	key?: string | number | null;
	ref?: Ref;
	[key: string]: unknown;
};

/**
 * Effect tags indicate what kind of DOM operation needs to be performed
 * on this fiber during the commit phase.
 * Uses bitwise flags so multiple effects can be combined.
 */
export type EffectTag = number;

/**
 * Priority lanes for concurrent rendering (Phase 15)
 * For now, we'll use a simple number, but this will become
 * a bitmask for sophisticated priority scheduling.
 */
export type Lanes = number;

/**
 * Suspense state for async rendering (Phase 14)
 */
export interface SuspenseState {
	timedOutAt: number;
}

/**
 * Update represents a single state update
 * Updates are stored in a circular linked list in the UpdateQueue
 */
export interface Update<State> {
	/**
	 * The new state value or update function
	 */
	action: State | ((prev: State) => State);

	/**
	 * Next update in the queue (circular linked list)
	 */
	next: Update<State> | null;

	/**
	 * Priority of this update
	 */
	lane: Lanes;
}

/**
 * UpdateQueue manages pending state updates for a fiber
 *
 * This is critical for:
 * - Batching multiple setState calls
 * - Priority-based update processing (concurrent mode)
 * - Ensuring updates apply in correct order
 */
export interface UpdateQueue<State> {
	/**
	 * Pending updates (circular linked list)
	 * The last update points to the first one
	 */
	pending: Update<State> | null;

	/**
	 * The state from the last render
	 */
	lastRenderedState: State;

	/**
	 * The reducer function that processes updates
	 * For useState: (state, action) => action
	 * For useReducer: user's reducer function
	 */
	lastRenderedReducer: (
		state: State,
		action: State | ((prev: State) => State),
	) => State;

	/**
	 * Base state to start applying updates from
	 * Used when updates are skipped due to priority
	 */
	baseState: State;

	/**
	 * First update in the base queue (skipped updates from previous render)
	 */
	firstBaseUpdate: Update<State> | null;

	/**
	 * Last update in the base queue
	 */
	lastBaseUpdate: Update<State> | null;
}

/**
 * Core Fiber data structure
 *
 * The fiber tree is built using a child/sibling/return linked list structure
 * which allows for depth-first traversal without recursion.
 *
 * Example tree structure:
 *
 *     App
 *      |
 *      child
 *      ↓
 *    Header ──sibling──→ Main
 *      |                  |
 *      child              child
 *      ↓                  ↓
 *    Title ──sibling──→ Nav    Article
 *
 * Each fiber has:
 * - return: pointer to parent
 * - child: pointer to first child
 * - sibling: pointer to next sibling
 */
export interface Fiber {
	// ===== IDENTITY =====
	/**
	 * The type of this fiber's element
	 * - string: host component (div, span, etc)
	 * - function: functional component
	 * - symbol: special types (FRAGMENT, PORTAL)
	 * - null: root fiber
	 */
	type: ElementType | null;

	/**
	 * Unique key for reconciliation (from element props)
	 */
	key: string | null;

	// ===== TREE STRUCTURE =====
	/**
	 * Parent fiber (renamed from "parent" to match React's terminology)
	 */
	return: Fiber | null;

	/**
	 * First child fiber
	 */
	child: Fiber | null;

	/**
	 * Next sibling fiber
	 */
	sibling: Fiber | null;

	/**
	 * Index in parent's children array (for reconciliation)
	 */
	index: number;

	// ===== WORK-IN-PROGRESS / CURRENT =====
	/**
	 * Mirror fiber in the alternate tree
	 * - During render: current.alternate = work-in-progress
	 * - After commit: trees are swapped
	 *
	 * This double-buffering allows us to:
	 * - Compare old vs new props/state during reconciliation
	 * - Discard work-in-progress on error
	 * - Implement time-slicing (pause/resume rendering)
	 */
	alternate: Fiber | null;

	/**
	 * What DOM operation needs to happen to this fiber?
	 * - PLACEMENT: Insert into DOM
	 * - UPDATE: Update existing DOM node
	 * - DELETION: Remove from DOM
	 * - null: No DOM change needed
	 */
	effectTag: EffectTag;

	/**
	 * Linked list of fibers with side effects
	 * Used during commit phase to efficiently apply all changes
	 */
	nextEffect: Fiber | null;

	/**
	 * First effect in this fiber's subtree
	 */
	firstEffect: Fiber | null;

	/**
	 * Last effect in this fiber's subtree
	 */
	lastEffect: Fiber | null;

	// ===== STATE & PROPS =====
	/**
	 * Current props (what's being rendered in this work-in-progress)
	 */
	props: Props;

	/**
	 * New props passed to this fiber (during render phase)
	 */
	pendingProps: Props;

	/**
	 * Props from the last committed render
	 */
	memoizedProps: Props | null;

	/**
	 * State from the last committed render
	 * For class components: this.state
	 * For hooks: first hook's state
	 */
	memoizedState: unknown;

	/**
	 * Update queue for state updates
	 *
	 * This queue manages all pending setState/dispatch calls for this fiber.
	 * Critical for:
	 * - Batching multiple state updates
	 * - Processing updates in correct order
	 * - Priority-based update scheduling (concurrent mode)
	 */
	updateQueue: UpdateQueue<unknown> | null;

	// ===== REFS =====
	/**
	 * Ref attached to this fiber
	 *
	 * Can be:
	 * - RefObject from useRef/createRef: { current: any }
	 * - Callback ref: (instance) => void
	 * - null
	 *
	 * Refs are attached during commit phase, not render phase.
	 */
	ref: Ref;

	// ===== DOM =====
	/**
	 * The actual DOM node (or FiberRoot for root fiber)
	 * Renamed from "dom" to match React's terminology
	 *
	 * - Host components: HTMLElement or Text
	 * - Functional components: null (they don't have DOM nodes)
	 * - Fragments: null (no wrapper element)
	 * - Portals: PortalContainer instance
	 * - Root fiber: FiberRoot instance
	 */
	stateNode: Node | FiberRoot | PortalContainer | null;

	// ===== HOOKS =====
	/**
	 * Array of hooks for this fiber (useState, useEffect, etc)
	 * Only functional components have hooks
	 */
	hooks: StateOrEffectHook<unknown>[] | null;

	/**
	 * Current position in hooks array during render
	 * Reset to 0 at the start of each render
	 */
	hookCursor: number;

	// ===== CONTEXT =====
	/**
	 * Context values provided by this fiber (if it's a Provider)
	 */
	contextValues: Map<symbol, unknown> | null;

	// ===== ERROR HANDLING (Phase 7) =====
	/**
	 * Nearest error boundary fiber in the tree
	 * Cached for quick error handling
	 */
	errorBoundary: Fiber | null;

	// ===== SUSPENSE (Phase 14) =====
	/**
	 * Suspense-related state for async rendering
	 * null if this fiber is not suspended
	 */
	suspenseState: SuspenseState | null;

	// ===== CONCURRENT MODE (Phase 15) =====
	/**
	 * Priority lanes for this fiber's work
	 * Determines when this work should be processed
	 */
	lanes: Lanes;

	/**
	 * Aggregate of child priority lanes
	 * Used to skip subtrees with no pending work
	 */
	childLanes: Lanes;

	// ===== CALLBACKS (Phase 7+) =====
	/**
	 * Queue of callbacks to run during commit phase
	 * Used for error boundaries' componentDidCatch, etc
	 */
	callbackQueue?: Array<() => void>;

	// ===== DELETION TRACKING =====
	/**
	 * List of child fibers that need to be deleted
	 * Collected during reconciliation, processed during commit
	 */
	deletions?: Fiber[];
}

/**
 * Portal stateNode structure
 * Stores the target container for portal rendering
 */
export interface PortalContainer {
	containerInfo: HTMLElement;
}

/**
 * FiberRoot represents the container for a fiber tree
 * One FiberRoot per ReactDOM.render() call
 */
export interface FiberRoot {
	/**
	 * The DOM container element (e.g., document.getElementById('root'))
	 */
	containerInfo: HTMLElement;

	/**
	 * The root fiber of the current (committed) tree
	 */
	current: Fiber;

	/**
	 * The work-in-progress root that will be committed
	 * Set during render phase, committed during commit phase
	 */
	finishedWork: Fiber | null;

	/**
	 * Current context stack
	 */
	context: Map<symbol, unknown> | null;

	/**
	 * Pending context changes
	 */
	pendingContext: Map<symbol, unknown> | null;

	/**
	 * Callback scheduled for this root (for async rendering)
	 */
	callbackNode: unknown;

	/**
	 * Priority of the callback
	 */
	callbackPriority: number;

	/**
	 * Timestamps for concurrent mode (Phase 15)
	 */
	eventTimes: number[];

	/**
	 * Expiration times for concurrent mode (Phase 15)
	 */
	expirationTimes: number[];

	/**
	 * Pending passive effects (useEffect) to run after commit
	 */
	pendingPassiveEffects?: Fiber[];
}

/**
 * Type guard to check if a value is a Fiber
 */
export function isFiber(value: unknown): value is Fiber {
	return (
		value !== null &&
		typeof value === "object" &&
		"type" in value &&
		"props" in value &&
		"return" in value &&
		"child" in value &&
		"sibling" in value
	);
}

/**
 * Type guard to check if a fiber represents a host component (DOM element)
 */
export function isFiberHostComponent(fiber: Fiber): boolean {
	return typeof fiber.type === "string";
}

/**
 * Type guard to check if a fiber represents a functional component
 */
export function isFiberFunctionComponent(fiber: Fiber): boolean {
	return typeof fiber.type === "function";
}

/**
 * Type guard to check if a fiber represents text content
 */
export function isFiberText(fiber: Fiber): boolean {
	return fiber.type === "TEXT_ELEMENT";
}

/**
 * Type guard to check if a fiber represents a fragment
 */
export function isFiberFragment(fiber: Fiber): boolean {
	// Import FRAGMENT symbol when needed
	return (
		typeof fiber.type === "symbol" &&
		fiber.type.toString() === "Symbol(react.fragment)"
	);
}

/**
 * Type guard to check if a fiber represents a portal
 */
export function isFiberPortal(fiber: Fiber): boolean {
	// Import PORTAL symbol when needed
	return (
		typeof fiber.type === "symbol" &&
		fiber.type.toString() === "Symbol(react.portal)"
	);
}

/**
 * Type guard to check if a fiber is the root fiber
 */
export function isFiberRoot(fiber: Fiber): boolean {
	return fiber.type === null && fiber.stateNode !== null;
}

/**
 * Check if a fiber has any effects (needs commit work)
 */
export function fiberHasEffect(fiber: Fiber): boolean {
	return fiber.effectTag !== 0;
}

/**
 * Check if a fiber has any child effects
 */
export function fiberHasChildEffects(fiber: Fiber): boolean {
	return fiber.firstEffect !== null;
}

/**
 * Check if two fibers have the same type (can be updated in place)
 *
 * This is critical for reconciliation - fibers with the same type
 * can reuse their DOM nodes and just update props/children.
 */
export function isSameType(
	fiber1: Fiber | null,
	fiber2: Fiber | null,
): boolean {
	if (fiber1 === null || fiber2 === null) {
		return false;
	}

	// Type must match
	if (fiber1.type !== fiber2.type) {
		return false;
	}

	// Key must match (or both be null)
	if (fiber1.key !== fiber2.key) {
		return false;
	}

	return true;
}

/**
 * Check if two element types are the same
 */
export function isSameElementType(
	type1: ElementType | null,
	type2: ElementType | null,
): boolean {
	return type1 === type2;
}

/**
 * Check if a fiber needs ref attachment
 */
export function fiberNeedsRef(fiber: Fiber): boolean {
	return fiber.ref !== null && typeof fiber.type === "string";
}
