/* **************** */
/* Resumability - Fiber Serialization */
/* **************** */

/**
 * Implements fiber tree serialization for resumability.
 * Enables SSR hydration and state persistence.
 */

import type { Fiber, FiberRoot } from "./types";
import { NoFlags, NoLanes, type WorkTag } from "./types";

// ============================================
// Serialized Types
// ============================================

/**
 * Serialized representation of a fiber node.
 * Contains only the data needed to reconstruct the fiber tree.
 */
export type SerializedFiber = {
	/** The fiber tag (WorkTag) */
	tag: number;
	/** Element key for reconciliation */
	key: string | null;
	/** Element type (tag name or function reference key) */
	type: string | null;
	/** Fiber index in sibling list */
	index: number;
	/** Pending props (excluding functions) */
	pendingProps: Record<string, unknown> | null;
	/** Memoized state (for hooks) */
	memoizedState: unknown;
	/** Child fibers */
	children: SerializedFiber[];
};

/**
 * Serialized representation of a fiber root.
 */
export type SerializedFiberRoot = {
	/** Version for compatibility checking */
	version: number;
	/** Timestamp of serialization */
	timestamp: number;
	/** The root fiber tree */
	root: SerializedFiber;
	/** Pending lanes */
	pendingLanes: number;
};

// ============================================
// Serialization Version
// ============================================

const SERIALIZATION_VERSION = 1;

// ============================================
// Serialization Functions
// ============================================

/**
 * Serializes a fiber tree for storage or transfer.
 * Excludes non-serializable data like DOM nodes and functions.
 *
 * @param root - The FiberRoot to serialize
 * @returns Serialized fiber root
 */
export function serializeFiberTree(root: FiberRoot): SerializedFiberRoot {
	const serializedRoot = serializeFiber(root.current);

	return {
		version: SERIALIZATION_VERSION,
		timestamp: Date.now(),
		root: serializedRoot,
		pendingLanes: root.pendingLanes as number,
	};
}

/**
 * Serializes a single fiber node and its children.
 *
 * @param fiber - The fiber to serialize
 * @returns Serialized fiber
 */
function serializeFiber(fiber: Fiber): SerializedFiber {
	// Serialize children
	const children: SerializedFiber[] = [];
	let child = fiber.child;
	while (child !== null) {
		children.push(serializeFiber(child));
		child = child.sibling;
	}

	// Filter props to remove non-serializable values
	const serializableProps = filterSerializableProps(fiber.pendingProps);

	// Serialize memoized state (for hooks)
	const serializableState = serializeHookState(fiber.memoizedState);

	return {
		tag: fiber.tag,
		key: fiber.key,
		type: getSerializableType(fiber),
		index: fiber.index,
		pendingProps: serializableProps,
		memoizedState: serializableState,
		children,
	};
}

/**
 * Filters props to only include serializable values.
 * Removes functions, symbols, and other non-JSON-serializable types.
 *
 * @param props - The props object to filter
 * @returns Serializable props
 */
function filterSerializableProps(
	props: Record<string, unknown> | null,
): Record<string, unknown> | null {
	if (props === null) {
		return null;
	}

	const result: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(props)) {
		// Skip children (handled separately in fiber tree)
		if (key === "children") {
			continue;
		}

		// Skip functions and symbols
		if (typeof value === "function" || typeof value === "symbol") {
			continue;
		}

		// Skip non-serializable objects (DOM nodes, etc.)
		if (value instanceof Node || value instanceof Event) {
			continue;
		}

		// Handle arrays
		if (Array.isArray(value)) {
			const serializedArray = value.filter(
				(item) => typeof item !== "function" && typeof item !== "symbol",
			);
			if (serializedArray.length > 0) {
				result[key] = serializedArray;
			}
			continue;
		}

		// Handle nested objects
		if (typeof value === "object" && value !== null) {
			const serializedObj = filterSerializableProps(
				value as Record<string, unknown>,
			);
			if (serializedObj !== null && Object.keys(serializedObj).length > 0) {
				result[key] = serializedObj;
			}
			continue;
		}

		// Include primitives
		result[key] = value;
	}

	return Object.keys(result).length > 0 ? result : null;
}

/**
 * Gets a serializable type identifier for a fiber.
 *
 * @param fiber - The fiber to get type for
 * @returns Serializable type string or null
 */
function getSerializableType(fiber: Fiber): string | null {
	if (fiber.type === null) {
		return null;
	}

	// Host components use their tag name
	if (typeof fiber.type === "string") {
		return fiber.type;
	}

	// Function components - use name or generate ID
	if (typeof fiber.type === "function") {
		return fiber.type.name || "__anonymous__";
	}

	// Symbols (Fragment, Portal, etc.)
	if (typeof fiber.type === "symbol") {
		return fiber.type.toString();
	}

	return null;
}

/**
 * Serializes hook state from a fiber.
 * Handles the linked list structure of hooks.
 *
 * @param memoizedState - The hook state to serialize
 * @returns Serializable state
 */
function serializeHookState(memoizedState: unknown): unknown {
	if (memoizedState === null || memoizedState === undefined) {
		return null;
	}

	// Check if this is a hook linked list (has memoizedState and next properties)
	if (
		typeof memoizedState === "object" &&
		"memoizedState" in (memoizedState as Record<string, unknown>) &&
		"next" in (memoizedState as Record<string, unknown>)
	) {
		const hooks: unknown[] = [];
		let current = memoizedState as { memoizedState: unknown; next: unknown };

		while (current !== null) {
			// Serialize each hook's state
			const hookState = serializeHookValue(current.memoizedState);
			hooks.push(hookState);
			current = current.next as { memoizedState: unknown; next: unknown };
		}

		return { __hooks__: hooks };
	}

	// Simple value
	return serializeHookValue(memoizedState);
}

/**
 * Serializes a single hook value.
 *
 * @param value - The value to serialize
 * @returns Serializable value
 */
function serializeHookValue(value: unknown): unknown {
	if (value === null || value === undefined) {
		return null;
	}

	// Skip functions
	if (typeof value === "function") {
		return { __type__: "function" };
	}

	// Handle refs
	if (
		typeof value === "object" &&
		"current" in (value as Record<string, unknown>)
	) {
		const refValue = (value as { current: unknown }).current;
		// Don't serialize DOM refs
		if (refValue instanceof Node) {
			return { __type__: "ref", value: null };
		}
		return { __type__: "ref", value: serializeHookValue(refValue) };
	}

	// Handle arrays (like useMemo/useCallback deps)
	if (Array.isArray(value)) {
		// Check if it's a [value, deps] tuple
		if (value.length === 2 && Array.isArray(value[1])) {
			return {
				__type__: "memoized",
				value: serializeHookValue(value[0]),
				deps: value[1].map(serializeHookValue),
			};
		}
		return value.map(serializeHookValue);
	}

	// Handle effects (skip - they'll be re-run on hydration)
	if (
		typeof value === "object" &&
		"tag" in (value as Record<string, unknown>) &&
		"create" in (value as Record<string, unknown>)
	) {
		return { __type__: "effect" };
	}

	// Primitives and plain objects
	if (typeof value === "object") {
		try {
			// Test if it's JSON serializable
			JSON.stringify(value);
			return value;
		} catch {
			return { __type__: "unserializable" };
		}
	}

	return value;
}

// ============================================
// JSON Conversion
// ============================================

/**
 * Converts a fiber root to a JSON string.
 *
 * @param root - The FiberRoot to convert
 * @returns JSON string
 */
export function dehydrateRoot(root: FiberRoot): string {
	const serialized = serializeFiberTree(root);
	return JSON.stringify(serialized);
}

/**
 * Parses a serialized fiber root from JSON.
 *
 * @param json - The JSON string to parse
 * @returns Serialized fiber root or null if invalid
 */
export function parseSerializedRoot(json: string): SerializedFiberRoot | null {
	try {
		const parsed = JSON.parse(json) as SerializedFiberRoot;

		// Version check
		if (parsed.version !== SERIALIZATION_VERSION) {
			console.warn(
				`Serialization version mismatch: expected ${SERIALIZATION_VERSION}, got ${parsed.version}`,
			);
			return null;
		}

		return parsed;
	} catch (error) {
		console.error("Failed to parse serialized fiber root:", error);
		return null;
	}
}

// ============================================
// State Extraction
// ============================================

/**
 * Extracts component state from a serialized fiber tree.
 * Useful for debugging or state inspection.
 *
 * @param serialized - The serialized fiber root
 * @returns Map of component keys to their state
 */
export function extractComponentState(
	serialized: SerializedFiberRoot,
): Map<string, unknown> {
	const stateMap = new Map<string, unknown>();

	function extractFromFiber(fiber: SerializedFiber, path: string): void {
		const componentPath =
			fiber.key !== null ? `${path}/${fiber.key}` : `${path}/${fiber.index}`;

		if (fiber.memoizedState !== null) {
			stateMap.set(componentPath, fiber.memoizedState);
		}

		fiber.children.forEach((child, index) => {
			extractFromFiber(child, `${componentPath}[${index}]`);
		});
	}

	extractFromFiber(serialized.root, "root");
	return stateMap;
}

// ============================================
// Deserialization Utilities
// ============================================

/**
 * Creates a minimal fiber structure from serialized data.
 * This is used during hydration to restore state.
 *
 * @param serialized - The serialized fiber
 * @returns Partial fiber structure
 */
export function createFiberFromSerialized(serialized: SerializedFiber): Fiber {
	const fiber: Fiber = {
		tag: serialized.tag as WorkTag,
		key: serialized.key,
		elementType: serialized.type,
		type: serialized.type,
		stateNode: null,
		return: null,
		child: null,
		sibling: null,
		index: serialized.index,
		ref: null,
		refCleanup: null,
		pendingProps: serialized.pendingProps ?? {},
		memoizedProps: serialized.pendingProps,
		memoizedState: deserializeHookState(serialized.memoizedState),
		updateQueue: null,
		dependencies: null,
		flags: NoFlags,
		subtreeFlags: NoFlags,
		deletions: null,
		lanes: NoLanes,
		childLanes: NoLanes,
		alternate: null,
	};

	// Reconstruct children
	let previousChild: Fiber | null = null;
	for (const childSerialized of serialized.children) {
		const child = createFiberFromSerialized(childSerialized);
		child.return = fiber;

		if (previousChild === null) {
			fiber.child = child;
		} else {
			previousChild.sibling = child;
		}
		previousChild = child;
	}

	return fiber;
}

/**
 * Deserializes hook state back to usable form.
 *
 * @param serialized - The serialized state
 * @returns Deserialized state
 */
function deserializeHookState(serialized: unknown): unknown {
	if (serialized === null || serialized === undefined) {
		return null;
	}

	// Handle hooks array marker
	if (
		typeof serialized === "object" &&
		"__hooks__" in (serialized as Record<string, unknown>)
	) {
		const hooks = (serialized as { __hooks__: unknown[] }).__hooks__;
		// Reconstruct hook linked list
		let first: { memoizedState: unknown; next: unknown } | null = null;
		let previous: { memoizedState: unknown; next: unknown } | null = null;

		for (const hookState of hooks) {
			const hook = {
				memoizedState: deserializeHookValue(hookState),
				baseState: null,
				baseQueue: null,
				queue: null,
				next: null,
			};

			if (first === null) {
				first = hook;
			}
			if (previous !== null) {
				previous.next = hook;
			}
			previous = hook;
		}

		return first;
	}

	return deserializeHookValue(serialized);
}

/**
 * Deserializes a single hook value.
 *
 * @param serialized - The serialized value
 * @returns Deserialized value
 */
function deserializeHookValue(serialized: unknown): unknown {
	if (serialized === null || serialized === undefined) {
		return null;
	}

	if (typeof serialized !== "object") {
		return serialized;
	}

	const obj = serialized as Record<string, unknown>;

	// Handle typed markers
	if ("__type__" in obj) {
		switch (obj["__type__"]) {
			case "function":
				// Can't restore functions - return a no-op
				return () => {};
			case "ref":
				return { current: obj["value"] };
			case "memoized":
				return [
					deserializeHookValue(obj["value"]),
					(obj["deps"] as unknown[]).map(deserializeHookValue),
				];
			case "effect":
				// Effects will be re-run on mount
				return null;
			case "unserializable":
				return null;
		}
	}

	// Handle arrays
	if (Array.isArray(serialized)) {
		return serialized.map(deserializeHookValue);
	}

	// Plain objects
	return serialized;
}
