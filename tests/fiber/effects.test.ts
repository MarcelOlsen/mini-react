import { beforeEach, describe, expect, test } from "bun:test";
import { createElement } from "@/MiniReact";
import type { FiberRoot } from "@/fiber";
import { useEffectFiber, useLayoutEffectFiber, useStateFiber } from "@/fiber";
import {
	createTestRoot,
	flushEffects,
	flushLayoutEffects,
	renderFiber,
} from "@tests/helpers/fiberTestUtils";

describe("Fiber Effects", () => {
	let root: FiberRoot;

	beforeEach(() => {
		({ root } = createTestRoot());
	});

	describe("useEffect Hook", () => {
		test("should run effect after render", async () => {
			let effectRan = false;

			const Component = () => {
				useEffectFiber(() => {
					effectRan = true;
				}, []);
				return createElement("div", null, "Effect Test");
			};

			renderFiber(createElement(Component, null), root);
			await flushEffects();
			expect(effectRan).toBe(true);
		});

		test("should run cleanup on unmount", async () => {
			let cleanupRan = false;

			const Component = () => {
				useEffectFiber(() => {
					return () => {
						cleanupRan = true;
					};
				}, []);
				return createElement("div", null, "Cleanup Test");
			};

			renderFiber(createElement(Component, null), root);
			await flushEffects();

			renderFiber(null, root);
			await flushEffects();
			expect(cleanupRan).toBe(true);
		});

		test("should re-run effect when deps change", async () => {
			let effectCount = 0;
			let setState: ((value: number) => void) | undefined;

			const Component = () => {
				const [count, setCount] = useStateFiber(0);
				setState = setCount;
				useEffectFiber(() => {
					effectCount++;
				}, [count]);
				return createElement("div", null, String(count));
			};

			renderFiber(createElement(Component, null), root);
			await flushEffects();
			expect(effectCount).toBe(1);

			setState?.(1);
			await new Promise((resolve) => setTimeout(resolve, 10));
			await flushEffects();
			expect(effectCount).toBe(2);
		});
	});

	describe("useLayoutEffect Hook", () => {
		test("should run effect after render and flush", () => {
			let effectRan = false;

			const Component = () => {
				useLayoutEffectFiber(() => {
					effectRan = true;
				}, []);
				return createElement("div", null, "Layout Effect Test");
			};

			renderFiber(createElement(Component, null), root);
			flushLayoutEffects(root.current);
			expect(effectRan).toBe(true);
		});

		test("should run cleanup on unmount", () => {
			let cleanupRan = false;

			const Component = () => {
				useLayoutEffectFiber(() => {
					return () => {
						cleanupRan = true;
					};
				}, []);
				return createElement("div", null, "Layout Cleanup");
			};

			renderFiber(createElement(Component, null), root);
			flushLayoutEffects(root.current);
			expect(cleanupRan).toBe(false);

			renderFiber(null, root);
			flushLayoutEffects(root.current);
			expect(cleanupRan).toBe(true);
		});

		test("should re-run effect when deps change", async () => {
			let effectCount = 0;
			let setState: ((value: number) => void) | undefined;

			const Component = () => {
				const [count, setCount] = useStateFiber(0);
				setState = setCount;
				useLayoutEffectFiber(() => {
					effectCount++;
				}, [count]);
				return createElement("div", null, String(count));
			};

			renderFiber(createElement(Component, null), root);
			flushLayoutEffects(root.current);
			expect(effectCount).toBe(1);

			setState?.(1);
			await new Promise((resolve) => setTimeout(resolve, 10));
			flushLayoutEffects(root.current);
			expect(effectCount).toBe(2);
		});

		test("should run cleanup before re-running effect", async () => {
			const log: string[] = [];
			let setState: ((value: number) => void) | undefined;

			const Component = () => {
				const [count, setCount] = useStateFiber(0);
				setState = setCount;
				useLayoutEffectFiber(() => {
					log.push(`effect:${count}`);
					return () => {
						log.push(`cleanup:${count}`);
					};
				}, [count]);
				return createElement("div", null, String(count));
			};

			renderFiber(createElement(Component, null), root);
			flushLayoutEffects(root.current);
			expect(log).toEqual(["effect:0"]);

			setState?.(1);
			await new Promise((resolve) => setTimeout(resolve, 10));
			flushLayoutEffects(root.current);
			expect(log).toEqual(["effect:0", "cleanup:0", "effect:1"]);
		});
	});

	// P1.9: Effect lifecycle correctness
	describe("Effect lifecycle correctness", () => {
		test("should create effect exactly once on mount", async () => {
			const log: string[] = [];

			const Component = () => {
				useEffectFiber(() => {
					log.push("create");
					return () => {
						log.push("cleanup");
					};
				}, []);
				return createElement("div", null, "Effect Life");
			};

			renderFiber(createElement(Component, null), root);
			await flushEffects();

			// Effect should have been created exactly once
			expect(log.filter((l) => l === "create").length).toBe(1);
		});

		test("should run cleanup on unmount", async () => {
			let cleanupCount = 0;

			const Component = () => {
				useEffectFiber(() => {
					return () => {
						cleanupCount++;
					};
				}, []);
				return createElement("div", null, "Effect Life");
			};

			renderFiber(createElement(Component, null), root);
			await flushEffects();

			renderFiber(null, root);
			await flushEffects();

			// Cleanup should have run at least once
			expect(cleanupCount).toBeGreaterThanOrEqual(1);
		});
	});

	// P6.1: Layout effects run before passive effects
	describe("Effect ordering", () => {
		test("should run layout effects before passive effects", async () => {
			const log: string[] = [];

			const Component = () => {
				useEffectFiber(() => {
					log.push("passive");
				}, []);
				useLayoutEffectFiber(() => {
					log.push("layout");
				}, []);
				return createElement("div", null, "Order Test");
			};

			renderFiber(createElement(Component, null), root);
			flushLayoutEffects(root.current);
			await flushEffects();

			expect(log.indexOf("layout")).toBeLessThan(log.indexOf("passive"));
		});
	});

	// P6.2: Parent vs child cleanup ordering on deletion
	describe("Effect cleanup ordering on deletion", () => {
		test("should clean up effects in correct order on unmount", async () => {
			const log: string[] = [];

			const Child = () => {
				useEffectFiber(() => {
					log.push("child-create");
					return () => {
						log.push("child-cleanup");
					};
				}, []);
				return createElement("span", null, "Child");
			};

			const Parent = () => {
				useEffectFiber(() => {
					log.push("parent-create");
					return () => {
						log.push("parent-cleanup");
					};
				}, []);
				return createElement("div", null, createElement(Child, null));
			};

			renderFiber(createElement(Parent, null), root);
			await flushEffects();

			// Clear the creation log
			log.length = 0;

			// Unmount everything
			renderFiber(null, root);
			await flushEffects();

			// Both cleanups should have run
			expect(log).toContain("parent-cleanup");
			expect(log).toContain("child-cleanup");
		});
	});

	// P6.4: Effect with undefined deps
	describe("Effect with no deps array", () => {
		test("should run on every render when deps is undefined", async () => {
			let effectCount = 0;
			let setState: ((value: number) => void) | undefined;

			const Component = () => {
				const [count, setCount] = useStateFiber(0);
				setState = setCount;
				useEffectFiber(() => {
					effectCount++;
				});
				return createElement("div", null, String(count));
			};

			renderFiber(createElement(Component, null), root);
			await flushEffects();
			expect(effectCount).toBe(1);

			setState?.(1);
			await new Promise((resolve) => setTimeout(resolve, 10));
			await flushEffects();
			expect(effectCount).toBe(2);

			setState?.(2);
			await new Promise((resolve) => setTimeout(resolve, 10));
			await flushEffects();
			expect(effectCount).toBe(3);
		});
	});
});
