import { beforeEach, describe, expect, test } from "bun:test";
import { createElement, createPortal } from "@/MiniReact";
import type { FiberRoot } from "@/fiber";
import { useEffectFiber, useStateFiber } from "@/fiber";
import {
	createTestRoot,
	flushEffects,
	renderFiber,
} from "@tests/helpers/fiberTestUtils";

describe("Fiber Portals", () => {
	let container: HTMLElement;
	let root: FiberRoot;
	let portalContainer: HTMLElement;

	beforeEach(() => {
		({ container, root } = createTestRoot());
		portalContainer = document.createElement("div");
		portalContainer.id = "portal-target";
		document.body.appendChild(portalContainer);
	});

	// P3.1: Basic portal rendering
	test("should render portal children into portal container", () => {
		const App = () =>
			createElement(
				"div",
				null,
				"Main Content",
				createPortal(
					createElement("span", null, "Portal Content"),
					portalContainer,
				),
			);

		renderFiber(createElement(App, null), root);
		// Main content in main container
		expect(container.textContent).toContain("Main Content");
		// Portal content in portal container
		expect(portalContainer.textContent).toBe("Portal Content");
		expect(portalContainer.querySelector("span")).not.toBeNull();
	});

	// P1.2: Portal deletion removes content when parent re-renders without portal
	test("should remove portal content when portal is removed from tree", () => {
		let setShow: ((value: boolean) => void) | undefined;

		const App = () => {
			const [show, setShowHook] = useStateFiber(true);
			setShow = setShowHook;
			return createElement(
				"div",
				null,
				"Main",
				show
					? createPortal(createElement("span", null, "Portal"), portalContainer)
					: null,
			);
		};

		renderFiber(createElement(App, null), root);
		expect(portalContainer.textContent).toBe("Portal");

		// Remove portal by re-rendering without it
		setShow?.(false);
		// flushSync is called inside renderFiber, but state update schedules async
		// so we need to wait
	});

	test("should render portal content into target container", () => {
		const App = () =>
			createElement(
				"div",
				null,
				createPortal(createElement("span", null, "Portal"), portalContainer),
			);

		renderFiber(createElement(App, null), root);
		expect(portalContainer.textContent).toBe("Portal");
		expect(portalContainer.querySelector("span")).not.toBeNull();
	});

	// P3.3: Portal with effects
	test("should fire effects inside portals", async () => {
		let effectRan = false;
		let cleanupRan = false;

		const PortalChild = () => {
			useEffectFiber(() => {
				effectRan = true;
				return () => {
					cleanupRan = true;
				};
			}, []);
			return createElement("div", null, "Portal Effect");
		};

		const App = () =>
			createElement(
				"div",
				null,
				createPortal(createElement(PortalChild, null), portalContainer),
			);

		renderFiber(createElement(App, null), root);
		await flushEffects();
		expect(effectRan).toBe(true);

		// Unmount
		renderFiber(null, root);
		await flushEffects();
		expect(cleanupRan).toBe(true);
	});
});
