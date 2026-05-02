/* **************** */
/* Type Guards and Assertions */
/* **************** */

/**
 * Type predicates and assertion functions for safe type narrowing.
 * These replace explicit casts with runtime-validated type narrowing.
 */

import type {
	Effect,
	Fiber,
	FiberRoot,
	Flags,
	Hook,
	Lane,
	Lanes,
	PortalStateNode,
	Update,
	UpdateQueue,
} from "./types";
import { NoFlags, NoLanes, WorkTag } from "./types";

// ============================================
// Narrowed Fiber Type Aliases
// ============================================

/**
 * Narrowed fiber type for host components with non-null stateNode.
 */
export type HostComponentFiber = Fiber & {
	tag: typeof WorkTag.HostComponent;
	stateNode: Element;
};

/**
 * Narrowed fiber type for host text with non-null stateNode.
 */
export type HostTextFiber = Fiber & {
	tag: typeof WorkTag.HostText;
	stateNode: Text;
};

/**
 * Narrowed fiber type for host root with non-null stateNode.
 */
export type HostRootFiber = Fiber & {
	tag: typeof WorkTag.HostRoot;
	stateNode: FiberRoot;
};

/**
 * Narrowed fiber type for portal with non-null stateNode.
 */
export type HostPortalFiber = Fiber & {
	tag: typeof WorkTag.HostPortal;
	stateNode: PortalStateNode;
};

// ============================================
// Fiber Tag Type Guards
// ============================================

/**
 * Type guard for host component fibers.
 * Narrows stateNode to Element.
 */
export function isHostComponentFiber(
	fiber: Fiber,
): fiber is HostComponentFiber {
	return fiber.tag === WorkTag.HostComponent && fiber.stateNode !== null;
}

/**
 * Type guard for host text fibers.
 * Narrows stateNode to Text.
 */
export function isHostTextFiber(fiber: Fiber): fiber is HostTextFiber {
	return fiber.tag === WorkTag.HostText && fiber.stateNode !== null;
}

/**
 * Type guard for host root fibers.
 * Narrows stateNode to FiberRoot.
 */
export function isHostRootFiber(fiber: Fiber): fiber is HostRootFiber {
	return fiber.tag === WorkTag.HostRoot && fiber.stateNode !== null;
}

/**
 * Type guard for portal fibers.
 * Narrows stateNode to PortalStateNode.
 */
export function isHostPortalFiber(fiber: Fiber): fiber is HostPortalFiber {
	return fiber.tag === WorkTag.HostPortal && fiber.stateNode !== null;
}

/**
 * Type guard for function component fibers.
 */
export function isFunctionComponentFiber(
	fiber: Fiber,
): fiber is Fiber & { tag: typeof WorkTag.FunctionComponent } {
	return fiber.tag === WorkTag.FunctionComponent;
}

/**
 * Type guard for memo component fibers.
 */
export function isMemoComponentFiber(
	fiber: Fiber,
): fiber is Fiber & { tag: typeof WorkTag.MemoComponent } {
	return fiber.tag === WorkTag.MemoComponent;
}

/**
 * Type guard for fragment fibers.
 */
export function isFragmentFiber(
	fiber: Fiber,
): fiber is Fiber & { tag: typeof WorkTag.Fragment } {
	return fiber.tag === WorkTag.Fragment;
}

/**
 * Type guard for context provider fibers.
 */
export function isContextProviderFiber(
	fiber: Fiber,
): fiber is Fiber & { tag: typeof WorkTag.ContextProvider } {
	return fiber.tag === WorkTag.ContextProvider;
}

/**
 * Type guard for context consumer fibers.
 */
export function isContextConsumerFiber(
	fiber: Fiber,
): fiber is Fiber & { tag: typeof WorkTag.ContextConsumer } {
	return fiber.tag === WorkTag.ContextConsumer;
}

// ============================================
// StateNode Assertions (using `asserts` for type narrowing)
// ============================================

/**
 * Asserts that a fiber is a host component with non-null stateNode.
 * Narrows the type in the calling scope.
 * @throws Error if stateNode is null or fiber is not a host component
 */
export function assertHostComponentFiber(
	fiber: Fiber,
): asserts fiber is HostComponentFiber {
	if (fiber.tag !== WorkTag.HostComponent) {
		throw new Error(`Expected HostComponent fiber, got tag ${fiber.tag}`);
	}
	if (fiber.stateNode === null) {
		throw new Error("HostComponent fiber has null stateNode");
	}
}

/**
 * Asserts that a fiber is a host text with non-null stateNode.
 * Narrows the type in the calling scope.
 * @throws Error if stateNode is null or fiber is not a host text
 */
export function assertHostTextFiber(
	fiber: Fiber,
): asserts fiber is HostTextFiber {
	if (fiber.tag !== WorkTag.HostText) {
		throw new Error(`Expected HostText fiber, got tag ${fiber.tag}`);
	}
	if (fiber.stateNode === null) {
		throw new Error("HostText fiber has null stateNode");
	}
}

/**
 * Asserts that a fiber is a host root with non-null stateNode.
 * Narrows the type in the calling scope.
 * @throws Error if stateNode is null or fiber is not a host root
 */
export function assertHostRootFiber(
	fiber: Fiber,
): asserts fiber is HostRootFiber {
	if (fiber.tag !== WorkTag.HostRoot) {
		throw new Error(`Expected HostRoot fiber, got tag ${fiber.tag}`);
	}
	if (fiber.stateNode === null) {
		throw new Error("HostRoot fiber has null stateNode");
	}
}

/**
 * Asserts that a fiber is a portal with non-null stateNode.
 * Narrows the type in the calling scope.
 * @throws Error if stateNode is null or fiber is not a portal
 */
export function assertHostPortalFiber(
	fiber: Fiber,
): asserts fiber is HostPortalFiber {
	if (fiber.tag !== WorkTag.HostPortal) {
		throw new Error(`Expected HostPortal fiber, got tag ${fiber.tag}`);
	}
	if (fiber.stateNode === null) {
		throw new Error("HostPortal fiber has null stateNode");
	}
}

/**
 * Gets the stateNode as Element or Text for host fibers.
 * Returns null if not a host fiber or stateNode is null.
 */
export function getHostStateNode(fiber: Fiber): Element | Text | null {
	if (fiber.tag === WorkTag.HostComponent) {
		return fiber.stateNode as Element | null;
	}
	if (fiber.tag === WorkTag.HostText) {
		return fiber.stateNode as Text | null;
	}
	return null;
}

/**
 * Asserts fiber is a host fiber (component or text) with non-null stateNode.
 * Narrows the type in the calling scope.
 * @throws Error if not a host fiber or stateNode is null
 */
export function assertHostFiber(
	fiber: Fiber,
): asserts fiber is HostComponentFiber | HostTextFiber {
	if (fiber.tag !== WorkTag.HostComponent && fiber.tag !== WorkTag.HostText) {
		throw new Error(
			`Expected host fiber (HostComponent or HostText), got tag ${fiber.tag}`,
		);
	}
	if (fiber.stateNode === null) {
		throw new Error("Host fiber has null stateNode");
	}
}

// ============================================
// MemoizedState Type Guards
// ============================================

/**
 * Type guard for hook linked list in memoizedState.
 */
export function isHookState(value: unknown): value is Hook {
	if (value === null || typeof value !== "object") {
		return false;
	}
	const obj = value as Record<string, unknown>;
	return (
		"memoizedState" in obj &&
		"baseState" in obj &&
		"baseQueue" in obj &&
		(obj["baseQueue"] === null || isUpdate(obj["baseQueue"])) &&
		"queue" in obj &&
		(obj["queue"] === null || isUpdateQueue(obj["queue"])) &&
		"next" in obj &&
		(obj["next"] === null || typeof obj["next"] === "object")
	);
}

/**
 * Type guard for effect in memoizedState.
 */
export function isEffectState(value: unknown): value is Effect {
	if (value === null || typeof value !== "object") {
		return false;
	}
	const obj = value as Record<string, unknown>;
	return (
		"tag" in obj &&
		typeof obj["tag"] === "number" &&
		"create" in obj &&
		typeof obj["create"] === "function" &&
		"destroy" in obj &&
		(obj["destroy"] === undefined || typeof obj["destroy"] === "function") &&
		"deps" in obj &&
		(obj["deps"] === null || Array.isArray(obj["deps"])) &&
		"next" in obj &&
		(obj["next"] === null || typeof obj["next"] === "object")
	);
}

/**
 * Asserts that memoizedState is a Hook and returns it.
 * @throws Error if not a valid Hook
 */
export function assertHookState(fiber: Fiber): Hook {
	const state = fiber.memoizedState;
	if (!isHookState(state)) {
		throw new Error("Expected Hook in fiber.memoizedState");
	}
	return state;
}

/**
 * Gets memoized state cast to a specific type, with null check.
 * WARNING: Does not perform runtime validation of T. This is an unchecked cast.
 * Use specific guards like {@link isHookState} or {@link isEffectState} when
 * runtime validation is required.
 */
export function getMemoizedState<T>(fiber: Fiber): T | null {
	return fiber.memoizedState as T | null;
}

/**
 * Asserts memoized state is not null and returns cast to type T.
 * WARNING: Does not perform runtime validation of T. This is an unchecked cast
 * that only verifies non-null. Use specific guards like {@link isHookState} or
 * {@link isEffectState} when runtime shape validation is required.
 * @throws Error if memoizedState is null
 */
export function assertMemoizedState<T>(fiber: Fiber): T {
	if (fiber.memoizedState === null) {
		throw new Error("fiber.memoizedState is null");
	}
	return fiber.memoizedState as T;
}

// ============================================
// Props Type Guards
// ============================================

/**
 * Type for text element props.
 */
export type TextProps = { nodeValue: string | number };

/**
 * Type guard for text props.
 */
export function isTextProps(props: unknown): props is TextProps {
	if (props === null || typeof props !== "object") {
		return false;
	}
	const nv = (props as Record<string, unknown>)["nodeValue"];
	return typeof nv === "string" || typeof nv === "number";
}

/**
 * Gets props as a record, with null handling.
 */
export function getPropsAsRecord(fiber: Fiber): Record<string, unknown> | null {
	const props = fiber.pendingProps ?? fiber.memoizedProps;
	if (props === null || typeof props !== "object") {
		return null;
	}
	return props as Record<string, unknown>;
}

/**
 * Asserts props are not null and returns as Record.
 * @throws Error if props are null
 */
export function assertPropsAsRecord(fiber: Fiber): Record<string, unknown> {
	const props = getPropsAsRecord(fiber);
	if (props === null) {
		throw new Error("Fiber props are null");
	}
	return props;
}

/**
 * Asserts text props and returns them.
 * @throws Error if not text props
 */
export function assertTextProps(fiber: Fiber): TextProps {
	const props = fiber.pendingProps ?? fiber.memoizedProps;
	if (!isTextProps(props)) {
		const source =
			fiber.pendingProps != null ? "pendingProps" : "memoizedProps";
		throw new Error(`Expected TextProps in fiber.${source}`);
	}
	return props;
}

// ============================================
// Update Type Guards
// ============================================

/**
 * Type guard for Update.
 */
export function isUpdate<S>(value: unknown): value is Update<S> {
	if (value === null || typeof value !== "object") {
		return false;
	}
	const obj = value as Record<string, unknown>;
	return (
		"lane" in obj &&
		typeof obj["lane"] === "number" &&
		"action" in obj &&
		"hasEagerState" in obj &&
		typeof obj["hasEagerState"] === "boolean" &&
		"eagerState" in obj &&
		"next" in obj &&
		(obj["next"] === null || typeof obj["next"] === "object")
	);
}

// ============================================
// Update Queue Type Guards
// ============================================

/**
 * Type guard for UpdateQueue.
 */
export function isUpdateQueue<S>(value: unknown): value is UpdateQueue<S> {
	if (value === null || typeof value !== "object") {
		return false;
	}
	const obj = value as Record<string, unknown>;
	return (
		"pending" in obj &&
		(obj["pending"] === null || isUpdate(obj["pending"])) &&
		"lanes" in obj &&
		typeof obj["lanes"] === "number" &&
		"dispatch" in obj &&
		(obj["dispatch"] === null || typeof obj["dispatch"] === "function") &&
		"lastRenderedReducer" in obj &&
		(obj["lastRenderedReducer"] === null ||
			typeof obj["lastRenderedReducer"] === "function") &&
		"lastRenderedState" in obj
	);
}

/**
 * Asserts update queue is not null and returns it.
 * @throws Error if updateQueue is null
 */
export function assertUpdateQueue<S>(hook: unknown): UpdateQueue<S> {
	if (!isUpdateQueue<S>(hook)) {
		throw new Error("Hook queue is not a valid UpdateQueue");
	}
	return hook;
}

// ============================================
// Branded Type Helpers — delegate to bitwise.ts
// ============================================

import { flagsIncludes, flagsOr, laneIncludes } from "./bitwise";

/** Checks if lanes include a specific lane. */
export const lanesIncludeLane = laneIncludes;

/** Checks if lanes are empty. */
export function isLanesEmpty(lanes: Lanes | Lane): boolean {
	return lanes === NoLanes;
}

/** Checks if flags include a specific flag. */
export const flagsInclude = flagsIncludes;

/** Merges flags. */
export const mergeFlags = flagsOr;

/** Checks if flags are empty. */
export function isFlagsEmpty(flags: Flags): boolean {
	return flags === NoFlags;
}

// ============================================
// DOM Type Guards
// ============================================

/**
 * Type guard for Element.
 */
export function isElement(node: Node | null): node is Element {
	if (node === null) return false;
	return typeof Node !== "undefined" && node.nodeType === Node.ELEMENT_NODE;
}

/**
 * Type guard for Text node.
 */
export function isTextNode(node: Node): node is Text {
	return typeof Node !== "undefined" && node.nodeType === Node.TEXT_NODE;
}

/**
 * Type guard for HTMLElement.
 */
export function isHTMLElement(node: Node): node is HTMLElement {
	return typeof HTMLElement !== "undefined" && node instanceof HTMLElement;
}

/**
 * Type guard for HTMLInputElement.
 */
export function isHTMLInputElement(
	element: Element,
): element is HTMLInputElement {
	return (
		typeof HTMLInputElement !== "undefined" &&
		element instanceof HTMLInputElement
	);
}

/**
 * Asserts a node is an Element.
 * Narrows the type in the calling scope.
 * @throws Error if node is not an Element
 */
export function assertElement(node: Node): asserts node is Element {
	if (!isElement(node)) {
		throw new Error(`Expected Element, got nodeType ${node.nodeType}`);
	}
}

/**
 * Asserts a node is a Text node.
 * Narrows the type in the calling scope.
 * @throws Error if node is not a Text node
 */
export function assertTextNode(node: Node): asserts node is Text {
	if (!isTextNode(node)) {
		throw new Error(`Expected Text node, got nodeType ${node.nodeType}`);
	}
}

// ============================================
// FiberRoot Type Guards
// ============================================

/**
 * Type guard for FiberRoot.
 */
export function isFiberRoot(value: unknown): value is FiberRoot {
	if (value === null || typeof value !== "object") {
		return false;
	}
	const obj = value as Record<string, unknown>;
	return (
		obj["containerInfo"] !== null &&
		typeof obj["containerInfo"] === "object" &&
		obj["current"] !== null &&
		typeof obj["current"] === "object" &&
		typeof obj["pendingLanes"] === "number"
	);
}

/**
 * Asserts a value is a FiberRoot.
 * Narrows the type in the calling scope.
 * @throws Error if not a FiberRoot
 */
export function assertFiberRoot(value: unknown): asserts value is FiberRoot {
	if (!isFiberRoot(value)) {
		throw new Error("Expected FiberRoot");
	}
}

// ============================================
// Fiber Type Guards
// ============================================

/**
 * Type guard for Fiber with non-null return.
 */
export function hasFiberParent(
	fiber: Fiber,
): fiber is Fiber & { return: Fiber } {
	return fiber.return !== null;
}

/**
 * Type guard for Fiber with non-null child.
 */
export function hasFiberChild(fiber: Fiber): fiber is Fiber & { child: Fiber } {
	return fiber.child !== null;
}

/**
 * Type guard for Fiber with non-null sibling.
 */
export function hasFiberSibling(
	fiber: Fiber,
): fiber is Fiber & { sibling: Fiber } {
	return fiber.sibling !== null;
}

/**
 * Type guard for Fiber with non-null alternate.
 */
export function hasFiberAlternate(
	fiber: Fiber,
): fiber is Fiber & { alternate: Fiber } {
	return fiber.alternate !== null;
}

/**
 * Asserts fiber has a parent and returns it.
 * @throws Error if fiber.return is null
 */
export function assertFiberParent(fiber: Fiber): Fiber {
	if (fiber.return === null) {
		throw new Error("Fiber has no parent");
	}
	return fiber.return;
}

// ============================================
// Safe Property Access
// ============================================

const UNSAFE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/**
 * Safely sets a dynamic property on an object.
 * Rejects prototype-polluting keys (__proto__, constructor, prototype).
 * Use this instead of `(obj as unknown as Record<string, unknown>)[key] = value`
 */
export function setDynamicProperty(
	obj: object,
	key: string,
	value: unknown,
): void {
	if (UNSAFE_KEYS.has(key)) {
		throw new Error(`Refusing to set unsafe property "${key}"`);
	}
	(obj as Record<string, unknown>)[key] = value;
}

/**
 * Safely gets a dynamic property from an object.
 * Rejects prototype-polluting keys (__proto__, constructor, prototype).
 */
export function getDynamicProperty<T>(obj: object, key: string): T | undefined {
	if (UNSAFE_KEYS.has(key)) {
		throw new Error(`Refusing to access unsafe property "${key}"`);
	}
	return (obj as Record<string, unknown>)[key] as T | undefined;
}

// ============================================
// Component Type Guards
// ============================================

/**
 * Type for a memo component with $$typeof symbol.
 */
export type MemoComponent = {
	$$typeof: symbol;
	type: unknown;
	compare: ((prev: unknown, next: unknown) => boolean) | null;
};

/**
 * Type guard for memo components.
 */
export function isMemoComponent(value: unknown): value is MemoComponent {
	if (value === null || typeof value !== "object") {
		return false;
	}
	const obj = value as Record<string, unknown>;
	return (
		"$$typeof" in obj &&
		typeof obj["$$typeof"] === "symbol" &&
		"type" in obj &&
		obj["type"] !== undefined &&
		(typeof obj["compare"] === "function" || obj["compare"] === null)
	);
}

/**
 * Type guard for function component type.
 */
export function isFunctionType(
	type: unknown,
): type is (props: Record<string, unknown>) => unknown {
	return typeof type === "function";
}
