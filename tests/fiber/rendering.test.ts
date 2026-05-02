import { beforeEach, describe, expect, test } from "bun:test";
import { createElement } from "@/MiniReact";
import type { FiberRoot } from "@/fiber";
import { createTestRoot, renderFiber } from "@tests/helpers/fiberTestUtils";

describe("Fiber Rendering", () => {
	let container: HTMLElement;
	let root: FiberRoot;

	beforeEach(() => {
		({ container, root } = createTestRoot());
	});

	describe("Basic Rendering", () => {
		test("should render a simple element", () => {
			renderFiber(createElement("div", null, "Hello Fiber"), root);
			expect(container.textContent).toBe("Hello Fiber");
		});

		test("should render nested elements", () => {
			renderFiber(
				createElement(
					"div",
					null,
					createElement("span", null, "Child 1"),
					createElement("span", null, "Child 2"),
				),
				root,
			);
			expect(container.textContent).toBe("Child 1Child 2");
			expect(container.querySelectorAll("span").length).toBe(2);
		});

		test("should render with attributes", () => {
			renderFiber(
				createElement(
					"div",
					{ id: "test", className: "fiber-class" },
					"Content",
				),
				root,
			);
			const div = container.querySelector("div");
			expect(div?.id).toBe("test");
			expect(div?.className).toBe("fiber-class");
		});

		test("should update content on re-render", () => {
			renderFiber(createElement("div", null, "First"), root);
			expect(container.textContent).toBe("First");

			renderFiber(createElement("div", null, "Second"), root);
			expect(container.textContent).toBe("Second");
		});

		test("should unmount when rendering null", () => {
			renderFiber(createElement("div", null, "Content"), root);
			expect(container.textContent).toBe("Content");

			renderFiber(null, root);
			expect(container.textContent).toBe("");
		});
	});

	describe("Function Components", () => {
		test("should render a function component", () => {
			const Component = () => createElement("div", null, "Function Component");
			renderFiber(createElement(Component, null), root);
			expect(container.textContent).toBe("Function Component");
		});

		test("should pass props to function component", () => {
			const Greeting = ({ name }: { name: string }) =>
				createElement("div", null, `Hello, ${name}!`);
			renderFiber(createElement(Greeting, { name: "Fiber" }), root);
			expect(container.textContent).toBe("Hello, Fiber!");
		});

		test("should handle nested function components", () => {
			const Inner = ({ text }: { text: string }) =>
				createElement("span", null, text);
			const Outer = () =>
				createElement("div", null, createElement(Inner, { text: "Nested" }));
			renderFiber(createElement(Outer, null), root);
			expect(container.textContent).toBe("Nested");
		});
	});
});
