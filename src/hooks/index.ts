/* *********** */
/* Hooks API   */
/* *********** */

/**
 * Phase 4: Fiber-based Hooks
 *
 * This file now exports Fiber-based hooks that integrate with the
 * Fiber architecture. The old VDOMInstance-based implementation has
 * been moved to index.ts.backup for reference.
 *
 * All hooks now:
 * - Use the current rendering fiber (set by beginWork)
 * - Store state on the fiber's hooks array
 * - Trigger updates via scheduleUpdateOnFiber
 * - Work with the Fiber work loop and commit phase
 */

// Export all Fiber-based hooks
export {
	useState,
	useReducer,
	useEffect,
	useRef,
	useMemo,
	useCallback,
	scheduleEffect,
	getEffectQueue,
} from "./fiberHooksImpl";

// Re-export hook types
export type {
	StateHook,
	EffectHook,
	ContextHook,
	ReducerHook,
	RefHook,
	MemoHook,
	CallbackHook,
	StateOrEffectHook,
	UseStateHook,
	EffectCallback,
	DependencyList,
	UseEffectHook,
	Reducer,
	ReducerStateWithoutAction,
	ReducerActionWithoutState,
	UseReducerHook,
	MutableRefObject,
	UseRefHook,
} from "./types";

// Export hook context management (used by beginWork)
export {
	setCurrentRenderingFiber,
	getCurrentRenderingFiber,
	setCurrentRenderingFiber as setHookContext, // Backward compatibility alias
} from "../fiber/fiberHooks";
