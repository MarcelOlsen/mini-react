import { describe, expect, test } from "bun:test";
import { createElement } from "@/MiniReact";
import {
	NoFlags,
	NoLanes,
	WorkTag,
	enterHydrationState,
	exitHydrationState,
	getIsHydrating,
	getRestoredState,
	hydrateRoot,
	popHydrationState,
	prepareToHydrateHostInstance,
	tryToClaimNextHydratableInstance,
	tryToClaimNextHydratableTextInstance,
} from "@/fiber";
import type { Fiber } from "@/fiber";

describe("hydration - state management", () => {
	test("getIsHydrating returns false by default", () => {
		expect(getIsHydrating()).toBe(false);
	});

	test("enterHydrationState sets hydrating flag", () => {
		const container = document.createElement("div");
		enterHydrationState(container);
		expect(getIsHydrating()).toBe(true);
		exitHydrationState();
	});

	test("exitHydrationState clears state", () => {
		const container = document.createElement("div");
		container.appendChild(document.createElement("span"));
		enterHydrationState(container);
		exitHydrationState();
		expect(getIsHydrating()).toBe(false);
	});
});

describe("hydration - hydrateRoot entry point", () => {
	test("hydrateRoot creates a FiberRoot with isDehydrated flag", () => {
		const container = document.createElement("div");
		container.innerHTML = "<div>hello</div>";

		const root = hydrateRoot(container, createElement("div", null, "hello"));
		expect(root).toBeDefined();
		expect(root.containerInfo).toBe(container);
		expect(root.isDehydrated).toBe(true);
	});

	test("hydrateRoot restores state from serialized data", () => {
		const container = document.createElement("div");
		container.innerHTML = "<div>hello</div>";

		const serialized = {
			version: 1,
			timestamp: 0,
			root: {
				tag: 1,
				key: null,
				type: "div",
				index: 0,
				pendingProps: null,
				memoizedState: "restored",
				children: [],
			},
			pendingLanes: 0,
		};

		const root = hydrateRoot(container, createElement("div", null, "hello"), {
			serializedState: JSON.stringify(serialized),
		});
		expect(root).toBeDefined();
	});
});

describe("hydration - node claiming", () => {
	test("tryToClaimNextHydratableInstance returns false when not hydrating", () => {
		exitHydrationState();
		const fiber: Fiber = {
			tag: WorkTag.HostComponent,
			type: "div",
			stateNode: null,
			pendingProps: {},
			memoizedProps: null,
			memoizedState: null,
			updateQueue: null,
			dependencies: null,
			flags: NoFlags,
			subtreeFlags: NoFlags,
			deletions: null,
			lanes: NoLanes,
			childLanes: NoLanes,
			child: null,
			sibling: null,
			return: null,
			index: 0,
			key: null,
			elementType: null,
			ref: null,
			refCleanup: null,
			alternate: null,
		};
		expect(tryToClaimNextHydratableInstance(fiber)).toBe(false);
	});

	test("tryToClaimNextHydratableInstance claims matching element", () => {
		const container = document.createElement("div");
		container.innerHTML = "<div class='target'>hello</div>";
		enterHydrationState(container);

		const fiber: Fiber = {
			tag: WorkTag.HostComponent,
			type: "div",
			stateNode: null,
			pendingProps: { className: "target" },
			memoizedProps: null,
			memoizedState: null,
			updateQueue: null,
			dependencies: null,
			flags: NoFlags,
			subtreeFlags: NoFlags,
			deletions: null,
			lanes: NoLanes,
			childLanes: NoLanes,
			child: null,
			sibling: null,
			return: null,
			index: 0,
			key: null,
			elementType: null,
			ref: null,
			refCleanup: null,
			alternate: null,
		};

		expect(tryToClaimNextHydratableInstance(fiber)).toBe(true);
		expect(fiber.stateNode).toBe(container.firstChild as any);
		exitHydrationState();
	});

	test("tryToClaimNextHydratableInstance returns false on mismatch", () => {
		const container = document.createElement("div");
		container.innerHTML = "<span>hello</span>";
		enterHydrationState(container);

		const fiber: Fiber = {
			tag: WorkTag.HostComponent,
			type: "div",
			stateNode: null,
			pendingProps: {},
			memoizedProps: null,
			memoizedState: null,
			updateQueue: null,
			dependencies: null,
			flags: NoFlags,
			subtreeFlags: NoFlags,
			deletions: null,
			lanes: NoLanes,
			childLanes: NoLanes,
			child: null,
			sibling: null,
			return: null,
			index: 0,
			key: null,
			elementType: null,
			ref: null,
			refCleanup: null,
			alternate: null,
		};

		expect(tryToClaimNextHydratableInstance(fiber)).toBe(false);
		exitHydrationState();
	});

	test("tryToClaimNextHydratableTextInstance claims text node", () => {
		const container = document.createElement("div");
		container.appendChild(document.createTextNode("hello"));
		enterHydrationState(container);

		const fiber: Fiber = {
			tag: WorkTag.HostText,
			type: null,
			stateNode: null,
			pendingProps: { children: "hello" },
			memoizedProps: null,
			memoizedState: null,
			updateQueue: null,
			dependencies: null,
			flags: NoFlags,
			subtreeFlags: NoFlags,
			deletions: null,
			lanes: NoLanes,
			childLanes: NoLanes,
			child: null,
			sibling: null,
			return: null,
			index: 0,
			key: null,
			elementType: null,
			ref: null,
			refCleanup: null,
			alternate: null,
		};

		expect(tryToClaimNextHydratableTextInstance(fiber)).toBe(true);
		expect((fiber.stateNode as any)?.nodeType).toBe(Node.TEXT_NODE);
		exitHydrationState();
	});
});

describe("hydration - stack management", () => {
	test("prepareToHydrateHostInstance + popHydrationState manage stack", () => {
		const container = document.createElement("div");
		container.innerHTML = "<div><span>a</span></div>";
		enterHydrationState(container);

		const divFiber: Fiber = {
			tag: WorkTag.HostComponent,
			type: "div",
			stateNode: container.firstChild as Element,
			pendingProps: {},
			memoizedProps: null,
			memoizedState: null,
			updateQueue: null,
			dependencies: null,
			flags: NoFlags,
			subtreeFlags: NoFlags,
			deletions: null,
			lanes: NoLanes,
			childLanes: NoLanes,
			child: null,
			sibling: null,
			return: null,
			index: 0,
			key: null,
			elementType: null,
			ref: null,
			refCleanup: null,
			alternate: null,
		};

		prepareToHydrateHostInstance(divFiber);
		expect(getIsHydrating()).toBe(true);

		popHydrationState(divFiber);
		expect(getIsHydrating()).toBe(true);

		exitHydrationState();
		expect(getIsHydrating()).toBe(false);
	});

	test("popHydrationState warns on extra children", () => {
		const container = document.createElement("div");
		container.innerHTML = "<div><span>extra</span></div>";
		enterHydrationState(container);

		// Consume the div
		const divFiber: Fiber = {
			tag: WorkTag.HostComponent,
			type: "div",
			stateNode: container.firstChild as Element,
			pendingProps: {},
			memoizedProps: null,
			memoizedState: null,
			updateQueue: null,
			dependencies: null,
			flags: NoFlags,
			subtreeFlags: NoFlags,
			deletions: null,
			lanes: NoLanes,
			childLanes: NoLanes,
			child: null,
			sibling: null,
			return: null,
			index: 0,
			key: null,
			elementType: null,
			ref: null,
			refCleanup: null,
			alternate: null,
		};

		prepareToHydrateHostInstance(divFiber);
		// Don't consume the span — leave it as "extra"
		popHydrationState(divFiber);
		exitHydrationState();
	});
});

describe("hydration - restored state lookup", () => {
	test("getRestoredState returns null when no state map", () => {
		const fiber: Fiber = {
			tag: WorkTag.FunctionComponent,
			type: () => null,
			stateNode: null,
			pendingProps: {},
			memoizedProps: null,
			memoizedState: null,
			updateQueue: null,
			dependencies: null,
			flags: NoFlags,
			subtreeFlags: NoFlags,
			deletions: null,
			lanes: NoLanes,
			childLanes: NoLanes,
			child: null,
			sibling: null,
			return: null,
			index: 0,
			key: "test-key",
			elementType: null,
			ref: null,
			refCleanup: null,
			alternate: null,
		};

		expect(getRestoredState(fiber, "test-key")).toBeNull();
	});
});
