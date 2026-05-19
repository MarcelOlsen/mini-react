/* **************** */
/* Fiber Module Exports */
/* **************** */

// Types
export {
	// WorkTag
	WorkTag,
	type WorkTag as WorkTagType,
	// Branded types
	type Lane,
	type Lanes,
	type Flags,
	createLane,
	createLanes,
	createFlags,
	// Lane constants
	NoLane,
	NoLanes,
	SyncLane,
	InputContinuousLane,
	DefaultLane,
	TransitionLane1,
	TransitionLane2,
	IdleLane,
	OffscreenLane,
	// Flag constants
	NoFlags,
	PerformedWork,
	Placement,
	UpdateEffect as UpdateFlag,
	ChildDeletion,
	ContentReset,
	Callback,
	DidCapture,
	ForceClientRender,
	Ref,
	Snapshot,
	Passive,
	Hydrating,
	Visibility,
	StoreConsistency,
	PlacementAndUpdate,
	Deletion,
	MutationMask,
	LayoutMask,
	PassiveMask,
	// Hook effect tags
	HookEffectTag,
	type HookEffectTag as HookEffectTagType,
	// Core types
	type Effect,
	type Hook,
	type Update,
	type UpdateQueue,
	type Fiber,
	type FiberRoot,
	type PortalStateNode,
	type RefObject,
	type RefCallback,
	type ContextDependency,
	type Dependencies,
	type UpdateQueueType,
	type SharedQueue,
	// Root tag
	RootTag,
	type RootTag as RootTagType,
	// Utility types
	type FiberOfTag,
	type FiberPropsFor,
	type StateNodeFor,
	type MiniReactContext,
	// Type guards
	isHostFiber,
	isFunctionComponent,
	isHostRoot,
	isPortal,
} from "./types";

// Fiber creation
export {
	createFiber,
	createFiberFromElement,
	createFiberFromText,
	createFiberFromFragment,
	createFiberFromPortal,
	createHostRootFiber,
	createFiberRoot,
	createWorkInProgress,
	resetWorkInProgress,
	isTextElement,
	isPortalElement,
	isFragmentElement,
	getElementKey,
	isSameElementType,
	cloneFiber,
} from "./createFiber";

// Child reconciliation
export {
	createChildReconciler,
	reconcileChildFibers,
	mountChildFibers,
} from "./childReconciler";

// Fiber utilities
export {
	// Tree traversal
	getNextFiber,
	completeUnitOfWork,
	// Host parent/sibling finding
	findHostParent,
	getHostParentNode,
	findHostSibling,
	// State helpers
	getStateNode,
	getFirstHostChild,
	collectHostChildren,
	// Root finding
	findFiberRoot,
	findPortalContainer,
	// Debug utilities
	getFiberDebugName,
	printFiberTree,
} from "./fiberUtils";

// Effect list
export {
	type FunctionComponentUpdateQueue,
	type CollectedEffects,
	type EffectInstance,
	createEffect,
	createEffectToFiber,
	collectEffects,
	runPassiveEffectCleanups,
	runPassiveEffectCreates,
	runLayoutEffectCleanups,
	runLayoutEffectCreates,
	areHookInputsEqual,
	collectDeletionEffects,
	markFiberWithPassiveEffect,
	doesFiberHavePassiveEffects,
	schedulePassiveEffects,
	flushPassiveEffects,
} from "./effectList";

// Commit work
export {
	commitPlacement,
	commitUpdate,
	commitDeletion,
	commitAttachRef,
	commitDetachRef,
	createInstance,
	createTextInstance,
	appendChild,
	appendChildToContainer,
	insertBefore,
	removeChild,
	finalizeInitialChildren,
	prepareUpdate,
} from "./commitWork";

// Commit root
export {
	commitRoot,
	flushLayoutEffects,
	commitUnmountEffects,
	prepareForCommit,
	resetAfterCommit,
	commitDeletions,
} from "./commitRoot";

// Work in progress tree
export {
	getWorkInProgress,
	setWorkInProgress,
	getWorkInProgressRoot,
	setWorkInProgressRoot,
	getWorkInProgressRootRenderLanes,
	setWorkInProgressRootRenderLanes,
	prepareFreshStack,
	createWorkInProgressFiber,
	resetWorkInProgressFiber,
	cloneChildFibers,
	finishConcurrentRender,
	commitTreeSwap,
	checkIfWorkInProgressReceivedUpdate,
	markWorkInProgressReceivedUpdate,
	resetDidReceiveUpdate,
	getDidReceiveUpdate,
	getWorkInProgressDebugInfo,
} from "./workInProgress";

// Begin work
export { beginWork } from "./beginWork";

// Complete work
export {
	completeWork,
	resetCompleteWork,
	unwindWork,
	unwindInterruptedWork,
} from "./completeWork";

// Work loop
export {
	scheduleUpdateOnFiber,
	performSyncWorkOnRoot,
	createRoot,
	updateContainer,
	flushSync,
	flushPassiveEffectsImpl,
	isRendering,
	isCommitting,
	handleError,
} from "./workLoop";

// Scheduler
export {
	Priority,
	type Priority as PriorityType,
	getCurrentTime,
	shouldYield,
	shouldYieldForPriority,
	scheduleCallback,
	cancelCallback,
	getCurrentPriorityLevel,
	runWithPriority,
	lanesToSchedulerPriority,
	schedulerPriorityToLane,
	setWorkInProgressConcurrent,
	isWorkInProgressConcurrent,
	requestEventTime,
	requestUpdateLane,
	scheduleIdleCallback,
	cancelIdleCallback,
	flushWork,
} from "./scheduler";

// Lanes (priority system)
export {
	NonIdleLanes,
	TransitionLanes,
	UpdateLanes,
	mergeLanes,
	removeLanes,
	intersectLanes,
	includesLane,
	includesAnyLanes,
	includesOnlyNonUrgentLanes,
	includesBlockingLane,
	isLaneEmpty,
	getHighestPriorityLane,
	getHighestPriorityLanes,
	isSubsetOfLanes,
	getLanePriority,
	getLanesLabel,
	getNextLanes,
	markRootUpdated,
	markRootFinished,
	markRootSuspended,
	markRootPinged,
	markRootExpired,
	scheduleUpdateOnFiber as scheduleLaneUpdateOnFiber,
	fiberHasWork,
	fiberSubtreeHasWork,
	resetFiberLanes,
	requestEventTime as requestLaneEventTime,
	setCurrentEventTime,
	clearCurrentEventTime,
	requestUpdateLane as requestLaneUpdate,
	claimNextTransitionLane,
	entangleLanes,
	getEntangledLanes,
	addEntangledLanes,
	formatLanes,
	logLanes,
} from "./lanes";

// Fiber hooks
export {
	renderWithHooks,
	useStateFiber,
	useReducerFiber,
	useEffectFiber,
	useLayoutEffectFiber,
	useRefFiber,
	useMemoFiber,
	useCallbackFiber,
	useContextFiber,
	getCurrentlyRenderingFiber,
	isRenderingHooks,
} from "./fiberHooks";

// Resumability (serialization/deserialization)
export {
	type SerializedFiber,
	type SerializedFiberRoot,
	serializeFiberTree,
	dehydrateRoot,
	parseSerializedRoot,
	extractComponentState,
	createFiberFromSerialized,
} from "./resumability";

// Hydration (SSR)
export {
	type HydrateRootOptions,
	hydrateRoot,
	enterHydrationState,
	exitHydrationState,
	getIsHydrating,
	tryToClaimNextHydratableInstance,
	tryToClaimNextHydratableTextInstance,
	prepareToHydrateHostInstance,
	popHydrationState,
	getRestoredState,
} from "./hydration";

// Type Guards and Assertions
export {
	// Fiber tag type guards
	isHostComponentFiber,
	isHostTextFiber,
	isHostRootFiber,
	isHostPortalFiber,
	isFunctionComponentFiber,
	isMemoComponentFiber,
	isFragmentFiber,
	isContextProviderFiber,
	isContextConsumerFiber,
	// Narrowed fiber types
	type HostComponentFiber,
	type HostTextFiber,
	type HostRootFiber,
	type HostPortalFiber,
	// StateNode assertions (use asserts syntax for type narrowing)
	assertHostComponentFiber,
	assertHostTextFiber,
	assertHostRootFiber,
	assertHostPortalFiber,
	getHostStateNode,
	assertHostFiber,
	// MemoizedState helpers
	isHookState,
	isEffectState,
	assertHookState,
	getMemoizedState,
	assertMemoizedState,
	// Props helpers
	type TextProps,
	isTextProps,
	getPropsAsRecord,
	assertPropsAsRecord,
	assertTextProps,
	// Update queue helpers
	isUpdateQueue,
	assertUpdateQueue,
	// Branded type helpers
	lanesIncludeLane,
	isLanesEmpty,
	// DOM type guards
	isElement,
	isTextNode,
	isHTMLElement,
	isHTMLInputElement,
	assertElement,
	assertTextNode,
	// FiberRoot helpers
	isFiberRoot,
	assertFiberRoot,
	// Fiber navigation helpers
	hasFiberParent,
	hasFiberChild,
	hasFiberSibling,
	hasFiberAlternate,
	assertFiberParent,
	// Property access helpers
	setDynamicProperty,
	getDynamicProperty,
	// Component type guards
	type MemoComponent,
	isMemoComponent,
	isFunctionType,
} from "./typeGuards";
