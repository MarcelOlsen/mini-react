import { beforeEach, describe, expect, test } from "bun:test";
import { createElement } from "@/MiniReact";
import type { FiberRoot } from "@/fiber";
import { createTestRoot, renderFiber } from "@tests/helpers/fiberTestUtils";

describe("Fiber Commit Phase", () => {
	let container: HTMLElement;
	let root: FiberRoot;

	beforeEach(() => {
		({ container, root } = createTestRoot());
	});

	// P4.2: Placement through function components
	test("should place DOM nodes through function component wrappers", () => {
		const Wrapper = ({
			children,
		}: { children?: import("../../src/core/types").AnyMiniReactElement[] }) =>
			createElement("div", null, ...(children ?? []));

		renderFiber(
			createElement(Wrapper, null, createElement("span", null, "Wrapped")),
			root,
		);

		expect(container.querySelector("span")).not.toBeNull();
		expect(container.querySelector("span")?.textContent).toBe("Wrapped");
	});

	// P4.3: Text node update
	test("should update text node content", () => {
		renderFiber(createElement("div", null, "hello"), root);
		expect(container.textContent).toBe("hello");

		renderFiber(createElement("div", null, "world"), root);
		expect(container.textContent).toBe("world");
	});

	// P4.4: Property removal on update
	test("should remove properties on update", () => {
		renderFiber(
			createElement("div", { className: "a", id: "test-div" }, "Content"),
			root,
		);
		const div = container.querySelector("#test-div");
		expect(div?.className).toBe("a");

		renderFiber(createElement("div", { id: "test-div" }, "Content"), root);
		const updatedDiv = container.querySelector("#test-div");
		expect(updatedDiv?.className).toBe("");
	});

	// P4.5: Style object updates
	test("should update style object properties", () => {
		renderFiber(
			createElement("div", { id: "styled", style: { color: "red" } }, "Styled"),
			root,
		);
		const div = container.querySelector("#styled") as HTMLElement;
		expect(div?.style.color).toBe("red");

		renderFiber(
			createElement(
				"div",
				{ id: "styled", style: { color: "blue" } },
				"Styled",
			),
			root,
		);
		const updatedDiv = container.querySelector("#styled") as HTMLElement;
		expect(updatedDiv?.style.color).toBe("blue");
	});

	// P4.6: dangerouslySetInnerHTML
	test("should set innerHTML with dangerouslySetInnerHTML", () => {
		renderFiber(
			createElement("div", {
				dangerouslySetInnerHTML: { __html: "<b>bold</b>" },
			}),
			root,
		);
		const div = container.querySelector("div");
		expect(div?.innerHTML).toBe("<b>bold</b>");
		expect(div?.querySelector("b")?.textContent).toBe("bold");
	});

	// P4.7: Controlled input
	test("should set input value and checked properties", () => {
		renderFiber(createElement("input", { type: "text", value: "test" }), root);
		const input = container.querySelector("input") as HTMLInputElement;
		expect(input?.value).toBe("test");

		renderFiber(
			createElement("input", { type: "checkbox", checked: true }),
			root,
		);
		const checkbox = container.querySelector(
			'input[type="checkbox"]',
		) as HTMLInputElement;
		expect(checkbox?.checked).toBe(true);
	});
});
