/**
 * Begin Work - Reconciliation for Each Fiber Type
 *
 * beginWork is called during the render phase for each fiber.
 * Its job is to:
 * 1. Reconcile the fiber's children
 * 2. Return the first child (next unit of work)
 *
 * Different fiber types need different handling:
 * - Host components (div, span): Reconcile children
 * - Function components: Call function, reconcile result
 * - Text: No children
 * - Fragment: Reconcile children without wrapper
 * - Portal: Reconcile children to different container
 */

import type { AnyMiniReactElement, FunctionalComponent } from "../core/types";
import { FRAGMENT, PORTAL, TEXT_ELEMENT } from "../core/types";
import { cloneChildFibers } from "./fiberCreation";
import { Deletion } from "./fiberFlags";
import { setCurrentRenderingFiber } from "./fiberHooks";
import { reconcileChildren } from "./reconcileChildren";
import type { Fiber } from "./types";

/**
 * Type for components that might be memoized with React.memo
 */
type MaybeMemoizedComponent<P = Record<string, unknown>> =
	FunctionalComponent<P> & {
		__memo?: {
			areEqual: (prevProps: unknown, nextProps: unknown) => boolean;
		};
	};

/**
 * Begin work on a fiber
 *
 * This is the main entry point for reconciliation.
 * It dispatches to specific handlers based on fiber type.
 *
 * @param current The current (committed) fiber, or null if mounting
 * @param workInProgress The work-in-progress fiber being built
 * @returns The first child fiber, or null if no children
 */
export function beginWork(
	current: Fiber | null,
	workInProgress: Fiber,
): Fiber | null {
	const { type } = workInProgress;

	// Dispatch based on fiber type
	if (typeof type === "string") {
		// Check if it's TEXT_ELEMENT (also a string)
		if (type === TEXT_ELEMENT) {
			return updateHostText(current, workInProgress);
		}
		// Regular host component (div, span, etc)
		return updateHostComponent(current, workInProgress);
	}

	if (typeof type === "function") {
		// Functional component
		return updateFunctionComponent(current, workInProgress);
	}

	if (typeof type === "symbol") {
		// Symbol types: FRAGMENT or PORTAL
		if (type === FRAGMENT) {
			return updateFragment(current, workInProgress);
		}
		if (type === PORTAL) {
			return updatePortal(current, workInProgress);
		}
	}

	if (type === null) {
		// Root fiber
		return updateHostRoot(current, workInProgress);
	}

	throw new Error(`Unknown fiber type: ${String(type)}`);
}

/**
 * Update a host component (div, span, button, etc)
 *
 * Host components are DOM elements. We just need to reconcile their children.
 */
function updateHostComponent(
	current: Fiber | null,
	workInProgress: Fiber,
): Fiber | null {
	const { pendingProps } = workInProgress;
	const children = pendingProps.children || [];

	// Reconcile children
	reconcileChildren(current, workInProgress, children);

	// Return first child
	return workInProgress.child;
}

/**
 * Update a functional component
 *
 * Functional components need to be called to get their children.
 * This is where hooks are executed!
 */
function updateFunctionComponent(
	current: Fiber | null,
	workInProgress: Fiber,
): Fiber | null {
	const { type, pendingProps } = workInProgress;
	const Component = type as MaybeMemoizedComponent;

	// Check if component is memoized (React.memo)
	const memoData = Component.__memo;
	if (memoData && current !== null) {
		// Component is memoized - check if props changed
		const prevProps = current.memoizedProps || {};
		const nextProps = pendingProps;

		// Use custom comparison or shallow equal
		const areEqual = memoData.areEqual;
		const propsEqual = areEqual(prevProps, nextProps);

		if (propsEqual) {
			// Props are equal - bail out completely
			// Reuse the entire child tree from current

			// Clone the entire child list (including all siblings) to ensure
			// the work-in-progress tree is properly isolated from the current tree
			cloneChildFibers(current, workInProgress);

			// Copy memoized props to prevent future comparisons from failing
			workInProgress.memoizedProps = current.memoizedProps;

			// Copy hooks state without re-running them
			workInProgress.hooks = current.hooks;
			workInProgress.hookCursor = current.hookCursor;

			// Don't mark any effect - we're fully reusing
			// (effects will be propagated from children)

			// Return the child to continue reconciliation on children
			// but don't re-render this component
			return workInProgress.child;
		}
	}

	// Set hook context before calling component
	setCurrentRenderingFiber(workInProgress);

	// Call the component function
	let children: AnyMiniReactElement | null;
	try {
		children = Component(pendingProps);
	} finally {
		// Clear hook context after component returns
		setCurrentRenderingFiber(null);
	}

	// Clean up hooks that were not called in this render
	// This happens when a component returns early (e.g., return null before calling hooks)
	if (workInProgress.hooks && workInProgress.hooks.length > 0) {
		const usedHookCount = workInProgress.hookCursor || 0;
		const totalHookCount = workInProgress.hooks.length;

		// If we have hooks that weren't used (cursor didn't reach them), clean them up
		if (usedHookCount < totalHookCount) {
			for (let i = usedHookCount; i < totalHookCount; i++) {
				const hook = workInProgress.hooks[i];
				if (hook.type === "effect" && hook.cleanup) {
					try {
						hook.cleanup();
					} catch (error) {
						console.error("Error in effect cleanup:", error);
					}
				}
			}
			// Remove unused hooks from the array
			workInProgress.hooks = workInProgress.hooks.slice(0, usedHookCount);
		}
	}

	// Reconcile the single child (components return one element)
	reconcileChildren(current, workInProgress, children ? [children] : []);

	// Return first child
	return workInProgress.child;
}

/**
 * Update a text node
 *
 * Text nodes have no children, so we just return null.
 */
function updateHostText(
	_current: Fiber | null,
	_workInProgress: Fiber,
): Fiber | null {
	// Text nodes have no children
	return null;
}

/**
 * Update a fragment
 *
 * Fragments are just containers for children - they don't create DOM nodes.
 */
function updateFragment(
	current: Fiber | null,
	workInProgress: Fiber,
): Fiber | null {
	const { pendingProps } = workInProgress;
	const children = pendingProps.children || [];

	// Reconcile children directly (no wrapper element)
	reconcileChildren(current, workInProgress, children);

	return workInProgress.child;
}

/**
 * Update a portal
 *
 * Portals render children into a different DOM container,
 * but maintain the React tree relationship.
 */
function updatePortal(
	current: Fiber | null,
	workInProgress: Fiber,
): Fiber | null {
	const { pendingProps } = workInProgress;
	const children = pendingProps.children || [];

	// Check if the portal target container changed
	if (current !== null) {
		const oldContainer = current.pendingProps?.targetContainer;
		const newContainer = pendingProps.targetContainer;

		if (oldContainer !== newContainer) {
			// Container changed - mark all old children for deletion
			// and force recreation of children in new container
			if (current.child !== null) {
				workInProgress.deletions = workInProgress.deletions || [];
				let child: Fiber | null = current.child;
				while (child !== null) {
					// Mark for deletion and clear effect pointers
					child.effectTag = Deletion;
					child.nextEffect = null;
					child.firstEffect = null;
					child.lastEffect = null;

					workInProgress.deletions.push(child);
					child = child.sibling;
				}
			}
			// Don't pass current to reconcileChildren to force new placements
			reconcileChildren(null, workInProgress, children);
			return workInProgress.child;
		}
	}

	// Normal reconciliation when container hasn't changed
	reconcileChildren(current, workInProgress, children);

	return workInProgress.child;
}

/**
 * Update the host root
 *
 * The root fiber is special - it has no type, but it has children.
 */
function updateHostRoot(
	current: Fiber | null,
	workInProgress: Fiber,
): Fiber | null {
	const { pendingProps } = workInProgress;
	const children = pendingProps.children || [];

	// Reconcile root's children
	reconcileChildren(current, workInProgress, children);

	return workInProgress.child;
}
