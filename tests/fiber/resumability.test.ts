import { describe, expect, test } from "bun:test";
import { createElement } from "@/MiniReact";
import {
	type SerializedFiber,
	type SerializedFiberRoot,
	createFiberFromSerialized,
	dehydrateRoot,
	extractComponentState,
	parseSerializedRoot,
	serializeFiberTree,
} from "@/fiber";
import { createRoot, flushSync, updateContainer } from "@/fiber";

describe("resumability - serialization round-trip", () => {
	test("serializeFiberTree produces valid structure", () => {
		const container = document.createElement("div");
		const root = createRoot(container);
		updateContainer(createElement("div", null, "Hello"), root);
		flushSync();

		const serialized = serializeFiberTree(root);
		expect(serialized.version).toBe(1);
		expect(typeof serialized.timestamp).toBe("number");
		expect(serialized.root).toBeDefined();
		expect(typeof serialized.pendingLanes).toBe("number");
	});

	test("dehydrateRoot produces valid JSON", () => {
		const container = document.createElement("div");
		const root = createRoot(container);
		updateContainer(createElement("span", null, "test"), root);
		flushSync();

		const json = dehydrateRoot(root);
		expect(typeof json).toBe("string");
		const parsed = JSON.parse(json);
		expect(parsed.version).toBe(1);
		expect(parsed.root).toBeDefined();
	});

	test("parseSerializedRoot round-trips", () => {
		const container = document.createElement("div");
		const root = createRoot(container);
		updateContainer(createElement("p", null, "content"), root);
		flushSync();

		const json = dehydrateRoot(root);
		const parsed = parseSerializedRoot(json);
		expect(parsed).not.toBeNull();
		expect(parsed?.version).toBe(1);
		expect(parsed?.root).toBeDefined();
	});

	test("parseSerializedRoot returns null for invalid JSON", () => {
		expect(parseSerializedRoot("not json")).toBeNull();
	});

	test("parseSerializedRoot returns null for wrong version", () => {
		const json = JSON.stringify({
			version: 999,
			timestamp: 0,
			root: {},
			pendingLanes: 0,
		});
		expect(parseSerializedRoot(json)).toBeNull();
	});

	test("extractComponentState extracts memoized state", () => {
		const serialized = {
			version: 1,
			timestamp: 0,
			root: {
				tag: 1,
				key: null,
				type: "div",
				index: 0,
				pendingProps: null,
				memoizedState: { count: 42 },
				children: [],
			},
			pendingLanes: 0,
		};
		const stateMap = extractComponentState(
			serialized as unknown as SerializedFiberRoot,
		);
		expect(stateMap.get("root/0")).toEqual({ count: 42 });
	});
});

describe("resumability - createFiberFromSerialized", () => {
	test("reconstructs basic fiber tree", () => {
		const serialized = {
			tag: 1,
			key: null,
			type: "div",
			index: 0,
			pendingProps: { className: "foo" },
			memoizedState: null,
			children: [
				{
					tag: 2,
					key: null,
					type: null,
					index: 0,
					pendingProps: null,
					memoizedState: "hello",
					children: [],
				},
			],
		};

		const fiber = createFiberFromSerialized(
			serialized as unknown as SerializedFiber,
		);
		expect(fiber.tag).toBe(1);
		expect(fiber.type).toBe("div");
		expect(fiber.pendingProps).toEqual({ className: "foo" });
		expect(fiber.child).not.toBeNull();
		expect(fiber.child?.tag).toBe(2);
		expect(fiber.child?.memoizedState).toBe("hello");
		expect(fiber.child?.return).toBe(fiber);
	});

	test("reconstructs nested children with siblings", () => {
		const serialized = {
			tag: 1,
			key: null,
			type: "div",
			index: 0,
			pendingProps: null,
			memoizedState: null,
			children: [
				{
					tag: 2,
					key: null,
					type: null,
					index: 0,
					pendingProps: null,
					memoizedState: "a",
					children: [],
				},
				{
					tag: 2,
					key: null,
					type: null,
					index: 1,
					pendingProps: null,
					memoizedState: "b",
					children: [],
				},
			],
		};

		const fiber = createFiberFromSerialized(
			serialized as unknown as SerializedFiber,
		);
		expect(fiber.child?.memoizedState).toBe("a");
		expect(fiber.child?.sibling?.memoizedState).toBe("b");
	});

	test("deserializes hook state marker", () => {
		const serialized = {
			tag: 1,
			key: null,
			type: "div",
			index: 0,
			pendingProps: null,
			memoizedState: { __hooks__: [42, "hello", null] },
			children: [],
		};

		const fiber = createFiberFromSerialized(
			serialized as unknown as SerializedFiber,
		);
		expect(fiber.memoizedState).not.toBeNull();
		const firstHook = fiber.memoizedState as {
			memoizedState: unknown;
			next: { memoizedState: unknown; next: { memoizedState: unknown } };
		};
		expect(firstHook.memoizedState).toBe(42);
		expect(firstHook.next.memoizedState).toBe("hello");
		expect(firstHook.next.next.memoizedState).toBeNull();
	});

	test("deserializes typed hook values", () => {
		const serialized = {
			tag: 1,
			key: null,
			type: "div",
			index: 0,
			pendingProps: null,
			memoizedState: {
				__hooks__: [
					{ __type__: "ref", value: "dom-id" },
					{ __type__: "memoized", value: 10, deps: [1, 2] },
					{ __type__: "function" },
				],
			},
			children: [],
		};

		const fiber = createFiberFromSerialized(
			serialized as unknown as SerializedFiber,
		);
		const firstHook = fiber.memoizedState as {
			memoizedState: unknown;
			next: { memoizedState: unknown; next: { memoizedState: unknown } };
		};
		expect(firstHook.memoizedState).toEqual({ current: "dom-id" });
		expect(firstHook.next.memoizedState).toEqual([10, [1, 2]]);
		expect(typeof firstHook.next.next.memoizedState).toBe("function");
	});
});
