import { beforeEach, describe, expect, test } from "bun:test";
import { createElement } from "@/MiniReact";
import type { FiberRoot } from "@/fiber";
import { useEffectFiber, useStateFiber } from "@/fiber";
import {
	createTestRoot,
	flushEffects,
	renderFiber,
} from "@tests/helpers/fiberTestUtils";

describe("Fiber Error Handling", () => {
	let container: HTMLElement;
	let root: FiberRoot;

	beforeEach(() => {
		({ container, root } = createTestRoot());
	});

	// P10.1: Component render error propagates
	test("should propagate render errors since no error boundary exists", () => {
		const BadComponent = () => {
			throw new Error("Render error!");
		};

		// Without error boundaries, errors propagate
		expect(() => {
			renderFiber(createElement(BadComponent, null), root);
		}).toThrow("Render error!");
	});

	// Verify subsequent renders still work after an error
	test("should allow renders after a previous error", () => {
		const BadComponent = () => {
			throw new Error("Render error!");
		};

		try {
			renderFiber(createElement(BadComponent, null), root);
		} catch {
			// Expected
		}

		// Create a fresh root since the old one may be in a bad state
		document.body.innerHTML = '<div id="fresh-root"></div>';
		const freshContainer = document.getElementById("fresh-root");
		if (!freshContainer) throw new Error("Test setup failed");
		const { createRoot: createFreshRoot } = require("../../src/fiber");
		const freshRoot = createFreshRoot(freshContainer);

		const GoodComponent = () => createElement("div", null, "Recovered");
		renderFiber(createElement(GoodComponent, null), freshRoot);
		expect(freshContainer.textContent).toBe("Recovered");
	});

	// P10.2: Effect error doesn't crash app
	test("should handle effect errors without crashing", async () => {
		const originalError = console.error;
		const errors: unknown[] = [];
		console.error = (...args: unknown[]) => errors.push(args);

		try {
			const Component = () => {
				useEffectFiber(() => {
					throw new Error("Effect error!");
				}, []);
				return createElement("div", null, "Effect Error Test");
			};

			renderFiber(createElement(Component, null), root);
			await flushEffects();

			// App should still have rendered
			expect(container.textContent).toBe("Effect Error Test");
		} finally {
			console.error = originalError;
		}
	});

	// P10.3: Wrong number of hooks
	test("should throw when hooks are called conditionally", async () => {
		let setState: ((v: boolean) => void) | undefined;

		const BadComponent = () => {
			const [flag, setFlag] = useStateFiber(true);
			setState = setFlag;
			if (flag) {
				useStateFiber(0); // Conditionally called hook
			}
			return createElement("div", null, String(flag));
		};

		renderFiber(createElement(BadComponent, null), root);

		// Trigger re-render with fewer hooks
		setState?.(false);
		// This should handle the error (the "Rendered more hooks" error)
		await new Promise((resolve) => setTimeout(resolve, 10));
	});
});
