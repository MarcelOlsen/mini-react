/**
 * Fiber Architecture - Main Exports
 *
 * This module implements React's Fiber architecture for incremental rendering,
 * error boundaries, and concurrent features.
 */

// Types
export type {
	Fiber,
	FiberRoot,
	EffectTag,
	Lanes,
	SuspenseState,
	Props,
	Ref,
	RefObject,
	RefCallback,
	Update,
	UpdateQueue,
} from "./types";
export {
	isFiber,
	isFiberHostComponent,
	isFiberFunctionComponent,
	isFiberText,
	isFiberFragment,
	isFiberPortal,
	isFiberRoot,
	fiberHasEffect,
	fiberHasChildEffects,
	isSameType,
	isSameElementType,
	fiberNeedsRef,
} from "./types";

// Flags
export {
	NoEffect,
	Placement,
	UpdateEffect,
	Deletion,
	NoLanes,
	SyncLane,
	InputLane,
	DefaultLane,
	TransitionLane,
	RetryLane,
	IdleLane,
	isEffectTagMutation,
	hasEffectTag,
	includesSomeLane,
	mergeLanes,
	removeLanes,
	isSubsetOfLanes,
	getHighestPriorityLane,
	includesSyncLane,
} from "./fiberFlags";

// FiberRoot
export {
	createFiberRoot,
	getFiberRoot,
	hasFiberRoot,
	deleteFiberRoot,
	getFiberRootFromFiber,
	getContainerFromFiber,
	clearContainer,
} from "./fiberRoot";

// Fiber Creation
export {
	createFiber,
	createWorkInProgress,
	createFiberFromElement,
	createFiberFromText,
	createFiberFromFragment,
	createFiberFromPortal,
	cloneFiber,
	getElementKey,
	getElementProps,
	getElementType,
} from "./fiberCreation";

// Work Loop
export {
	scheduleUpdateOnFiber,
	getCurrentFiber,
	getCurrentRoot,
} from "./workLoop";

// Reconciliation
export { reconcileChildren } from "./reconcileChildren";

// Begin Work
export { beginWork } from "./beginWork";

// Complete Work
export { completeWork } from "./completeWork";

// Commit Work
export { commitRoot } from "./commitWork";

// Hooks
export {
	setCurrentRenderingFiber,
	getCurrentRenderingFiber,
	createUpdateQueue,
	enqueueUpdate,
	dispatchSetState,
	processUpdateQueue,
	dispatchReducerAction,
	processReducerQueue,
	areDepsEqual,
} from "./fiberHooks";
