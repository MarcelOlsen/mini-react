/* **************** */
/* Fiber Type Definitions */
/* **************** */

import type { AnyMiniReactElement, ElementType } from "../core/types";

// ============================================
// WorkTag - Component type identifiers
// ============================================

/**
 * Work tags identify the type of fiber node.
 * Using const object + satisfies pattern instead of enum.
 */
export const WorkTag = {
	FunctionComponent: 0,
	ClassComponent: 1, // Reserved for future use
	IndeterminateComponent: 2, // Before we know if it's function or class
	HostRoot: 3, // Root of a host tree (e.g., ReactDOM.render)
	HostPortal: 4, // A subtree rendered into a different container
	HostComponent: 5, // DOM elements like 'div', 'span'
	HostText: 6, // Text nodes
	Fragment: 7, // React.Fragment
	Mode: 8, // Reserved for StrictMode, ConcurrentMode
	ContextConsumer: 9,
	ContextProvider: 10,
	ForwardRef: 11, // Reserved for future use
	Profiler: 12, // Reserved for future use
	SuspenseComponent: 13, // Reserved for future use
	MemoComponent: 14, // React.memo wrapped components
	SimpleMemoComponent: 15, // Simplified memo (no custom compare)
	LazyComponent: 16, // React.lazy components
	OffscreenComponent: 17, // Reserved for offscreen rendering
} as const satisfies Record<string, number>;

export type WorkTag = (typeof WorkTag)[keyof typeof WorkTag];

// ============================================
// Branded Types - Type-safe numeric identifiers
// ============================================

/** Branded type for lane bitmask (single lane or multiple lanes) */
declare const LaneBrand: unique symbol;
export type Lane = number & { readonly [LaneBrand]: typeof LaneBrand };
export type Lanes = Lane;

/** Branded type for fiber flags */
declare const FlagsBrand: unique symbol;
export type Flags = number & { readonly [FlagsBrand]: typeof FlagsBrand };

export const createLane = (value: number): Lane => value as Lane;
export const createLanes = (value: number): Lanes => value as Lanes;
export const createFlags = (value: number): Flags => value as Flags;

export const combineFlags = (...flags: Flags[]): Flags =>
	createFlags(flags.reduce((acc, f) => acc | (f as unknown as number), 0));

// ============================================
// Lane Constants - Priority levels
// ============================================

export const NoLane: Lane = createLane(0b0000000000000000000000000000000);
export const NoLanes: Lanes = createLanes(0b0000000000000000000000000000000);

export const SyncLane: Lane = createLane(0b0000000000000000000000000000001);
export const InputContinuousLane: Lane =
	createLane(0b0000000000000000000000000000100);
export const DefaultLane: Lane = createLane(0b0000000000000000000000000010000);
export const TransitionLane1: Lane =
	createLane(0b0000000000000000000000001000000);
export const TransitionLane2: Lane =
	createLane(0b0000000000000000000000010000000);
export const IdleLane: Lane = createLane(0b0100000000000000000000000000000);
export const OffscreenLane: Lane =
	createLane(0b1000000000000000000000000000000);

// ============================================
// Effect Flags - Side effect markers
// ============================================

export const NoFlags: Flags = createFlags(0b0000000000000000000000000000);
export const PerformedWork: Flags = createFlags(0b0000000000000000000000000001);
export const Placement: Flags = createFlags(0b0000000000000000000000000010);
export const UpdateEffect: Flags = createFlags(0b0000000000000000000000000100);
export const ChildDeletion: Flags = createFlags(0b0000000000000000000000010000);
export const ContentReset: Flags = createFlags(0b0000000000000000000000100000);
export const Callback: Flags = createFlags(0b0000000000000000000001000000);
export const DidCapture: Flags = createFlags(0b0000000000000000000010000000);
export const ForceClientRender: Flags =
	createFlags(0b0000000000000000000100000000);
export const Ref: Flags = createFlags(0b0000000000000000001000000000);
export const Snapshot: Flags = createFlags(0b0000000000000000010000000000);
export const Passive: Flags = createFlags(0b0000000000000000100000000000);
export const Hydrating: Flags = createFlags(0b0000000000000001000000000000);
export const Visibility: Flags = createFlags(0b0000000000000010000000000000);
export const StoreConsistency: Flags =
	createFlags(0b0000000000000100000000000000);

// Combined flags for common operations
export const PlacementAndUpdate: Flags = combineFlags(Placement, UpdateEffect);
export const Deletion: Flags = combineFlags(ChildDeletion, Placement);

// Flags that indicate the fiber has work to do in commit phase
export const MutationMask: Flags = combineFlags(
	Placement,
	UpdateEffect,
	ChildDeletion,
	ContentReset,
	Ref,
	Hydrating,
	Visibility,
);

export const LayoutMask: Flags = combineFlags(UpdateEffect, Callback, Ref);

export const PassiveMask: Flags = combineFlags(Passive, ChildDeletion);

// ============================================
// Hook Types for Fiber
// ============================================

/**
 * Effect tag constants for hooks.
 * Using const object pattern.
 */
export const HookEffectTag = {
	NoEffect: 0b0000,
	HasEffect: 0b0001, // Effect needs to run
	Layout: 0b0010, // useLayoutEffect
	Passive: 0b0100, // useEffect
	Insertion: 0b1000, // useInsertionEffect (reserved)
} as const satisfies Record<string, number>;

export type HookEffectTag = number;

/**
 * Type for effect create callbacks.
 * Accepts functions that return a cleanup function or nothing.
 * Two-branch union: the second branch allows `() => void` callbacks
 * (functions with no return value).
 */
export type EffectCreate = (() => (() => void) | undefined) | (() => void);

/**
 * Effect object stored in fiber's updateQueue for effects.
 */
export type Effect = {
	tag: HookEffectTag;
	create: EffectCreate;
	destroy: (() => void) | undefined;
	deps: readonly unknown[] | null;
	next: Effect | null;
};

/**
 * Hook object stored as linked list in fiber.memoizedState.
 */
export type Hook = {
	memoizedState: unknown;
	baseState: unknown;
	baseQueue: Update<unknown> | null;
	queue: UpdateQueue<unknown> | null;
	next: Hook | null;
};

/**
 * Update object for state updates.
 */
export type Update<S> = {
	lane: Lane;
	action: S | ((prevState: S) => S);
	hasEagerState: boolean;
	eagerState: S | null;
	next: Update<S> | null;
};

/**
 * Update queue for a hook.
 */
export type UpdateQueue<S> = {
	pending: Update<S> | null;
	lanes: Lanes;
	dispatch: ((action: S | ((prevState: S) => S)) => void) | null;
	lastRenderedReducer:
		| ((state: S, action: S | ((prevState: S) => S)) => S)
		| null;
	lastRenderedState: S | null;
};

// ============================================
// Portal State Node
// ============================================

/**
 * State node for portal fibers.
 * Contains the container element where portal children are rendered.
 */
export type PortalStateNode = {
	containerInfo: Element;
};

// ============================================
// Fiber Type - Core data structure
// ============================================

/**
 * Fiber represents a unit of work in the React reconciler.
 * It's a node in a linked tree structure that enables:
 * - Incremental rendering (can pause/resume)
 * - Priority-based scheduling via lanes
 * - Double buffering via alternate pointers
 */
export type Fiber = {
	// === Instance Identity ===

	/** Type identifier (FunctionComponent, HostComponent, etc.) */
	tag: WorkTag;

	/** Unique key for reconciliation (from JSX key prop) */
	key: string | null;

	/**
	 * Element type that created this fiber.
	 * For host components: string ('div', 'span')
	 * For function components: the function itself
	 * For class components: the class constructor
	 */
	elementType: ElementType | null;

	/**
	 * Resolved type after lazy/forwardRef resolution.
	 * Usually same as elementType.
	 */
	type: ElementType | null;

	/**
	 * Local state associated with this fiber.
	 * For host components: the DOM node
	 * For function components: null
	 * For portals: PortalStateNode with container info
	 * TODO(ClassComponent): Add class component instance type to this union
	 * when implementing WorkTag.ClassComponent support.
	 */
	stateNode: Element | Text | FiberRoot | PortalStateNode | null;

	// === Fiber Tree Structure (linked list) ===

	/** Parent fiber (called 'return' because work returns to parent) */
	return: Fiber | null;

	/** First child fiber */
	child: Fiber | null;

	/** Next sibling fiber */
	sibling: Fiber | null;

	/** Position in parent's children for placement */
	index: number;

	// === Ref ===

	/** Ref attached to this fiber (from JSX ref prop) */
	ref: RefObject<unknown> | RefCallback<unknown> | null;

	/** Ref for cleanup (React internal) */
	refCleanup: (() => void) | null;

	// === Props and State ===

	/** Props used to create the output (previous render) */
	memoizedProps: Record<string, unknown> | null;

	/** Incoming props (next render) */
	pendingProps: Record<string, unknown>;

	/**
	 * State from previous render.
	 * For function components: linked list of hooks
	 * For class components: component state
	 * For host root: element to render
	 */
	memoizedState: unknown;

	/**
	 * Queue of state updates and effects.
	 * For function components: effect list
	 * For host root: update queue
	 */
	updateQueue: UpdateQueueType | null;

	// === Context ===

	/** Context dependencies for this fiber */
	dependencies: Dependencies | null;

	// === Effects ===

	/** Bitmask of side effects (Placement, UpdateEffect, etc.) */
	flags: Flags;

	/** Subtree flags (bubbled up from children) */
	subtreeFlags: Flags;

	/** Fibers to delete during commit phase */
	deletions: Fiber[] | null;

	// === Lanes (Priority) ===

	/** Lanes that have pending work on this fiber */
	lanes: Lanes;

	/** Lanes that have pending work in this fiber's subtree */
	childLanes: Lanes;

	// === Double Buffering ===

	/**
	 * Alternate fiber (current <-> workInProgress).
	 * Points to the corresponding fiber in the other tree.
	 */
	alternate: Fiber | null;
};

/**
 * Ref types
 */
export type RefObject<T> = { current: T | null };
export type RefCallback<T> = (instance: T | null) => void;

/**
 * Context dependency tracking
 */
export type ContextDependency<T> = {
	context: MiniReactContext<T>;
	memoizedValue: T;
	next: ContextDependency<unknown> | null;
};

export type Dependencies = {
	lanes: Lanes;
	firstContext: ContextDependency<unknown> | null;
};

/**
 * Update queue types
 */
export type UpdateQueueType = {
	baseState: unknown;
	firstBaseUpdate: Update<unknown> | null;
	lastBaseUpdate: Update<unknown> | null;
	shared: SharedQueue<unknown>;
	effects: Effect[] | null;
};

export type SharedQueue<S> = {
	pending: Update<S> | null;
	lanes: Lanes;
};

// ============================================
// FiberRoot - Root of the entire tree
// ============================================

/**
 * Root tag identifying the type of root.
 */
export const RootTag = {
	LegacyRoot: 0, // ReactDOM.render
	ConcurrentRoot: 1, // ReactDOM.createRoot
} as const satisfies Record<string, number>;

export type RootTag = (typeof RootTag)[keyof typeof RootTag];

/**
 * FiberRoot is the top-level container for a fiber tree.
 * It holds metadata about the entire tree.
 */
export type FiberRoot = {
	/** Type of root (Legacy or Concurrent) */
	tag: RootTag;

	/** DOM container element */
	containerInfo: Element;

	/** Current fiber tree (what's on screen) */
	current: Fiber;

	/** Fiber that's been completed and ready to commit */
	finishedWork: Fiber | null;

	/** Element passed to render() */
	pendingChildren: AnyMiniReactElement | null;

	// === Scheduling ===

	/** Lanes with pending work */
	pendingLanes: Lanes;

	/** Lanes that were suspended */
	suspendedLanes: Lanes;

	/** Lanes that were pinged (resumed) */
	pingedLanes: Lanes;

	/** Lanes that have expired and must be rendered synchronously */
	expiredLanes: Lanes;

	/** Lanes currently being rendered */
	finishedLanes: Lanes;

	// === Callbacks ===

	/** Callbacks to run after commit */
	callbackNode: unknown;

	/** Priority of the scheduled callback */
	callbackPriority: Lane;

	// === Timing ===

	/** Time at which to retry a suspended render */
	expirationTimes: Map<Lane, number>;

	// === Hydration ===

	/** For hydration: whether we're currently hydrating */
	isDehydrated: boolean;

	/** Mutable source tracking for hydration */
	mutableSourceEagerHydrationData: unknown[] | null;
};

// ============================================
// Type Utilities
// ============================================

/**
 * Extract fiber for a specific tag (narrowing utility).
 */
export type FiberOfTag<T extends WorkTag> = Fiber & { tag: T };

/**
 * Props type for specific fiber tags.
 */
export type FiberPropsFor<T extends WorkTag> =
	T extends typeof WorkTag.HostComponent
		? Record<string, unknown> & { children?: AnyMiniReactElement[] }
		: T extends typeof WorkTag.HostText
			? { nodeValue: string | number }
			: T extends typeof WorkTag.FunctionComponent
				? Record<string, unknown> & { children?: AnyMiniReactElement[] }
				: Record<string, unknown>;

/**
 * StateNode type for specific fiber tags.
 */
export type StateNodeFor<T extends WorkTag> =
	T extends typeof WorkTag.HostComponent
		? Element
		: T extends typeof WorkTag.HostText
			? Text
			: T extends typeof WorkTag.HostRoot
				? FiberRoot
				: T extends typeof WorkTag.HostPortal
					? PortalStateNode
					: null;

// ============================================
// Context Import (type-only to avoid circular dependency)
// ============================================

import type { MiniReactContext } from "../context/types";
export type { MiniReactContext };

// ============================================
// Helper Type Guards
// ============================================

/**
 * Check if a fiber represents a DOM element or text node.
 * Use this when you need to perform DOM operations on fiber.stateNode.
 */
export function isDOMFiber(
	fiber: Fiber,
): fiber is Fiber & { stateNode: Element | Text } {
	return fiber.tag === WorkTag.HostComponent || fiber.tag === WorkTag.HostText;
}

/**
 * Check if a fiber is a host fiber (DOM element, text node, or host root).
 */
export function isHostFiber(fiber: Fiber): boolean {
	return (
		fiber.tag === WorkTag.HostComponent ||
		fiber.tag === WorkTag.HostText ||
		fiber.tag === WorkTag.HostRoot
	);
}

/**
 * Check if a fiber is a function component.
 */
export function isFunctionComponent(
	fiber: Fiber,
): fiber is Fiber & { tag: typeof WorkTag.FunctionComponent } {
	return fiber.tag === WorkTag.FunctionComponent;
}

/**
 * Check if a fiber is the host root.
 */
export function isHostRoot(
	fiber: Fiber,
): fiber is Fiber & { tag: typeof WorkTag.HostRoot; stateNode: FiberRoot } {
	return fiber.tag === WorkTag.HostRoot;
}

/**
 * Check if a fiber is a portal.
 */
export function isPortal(fiber: Fiber): fiber is Fiber & {
	tag: typeof WorkTag.HostPortal;
	stateNode: PortalStateNode;
} {
	return fiber.tag === WorkTag.HostPortal;
}
