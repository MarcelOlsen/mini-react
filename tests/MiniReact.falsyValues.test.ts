/**
 * Comprehensive tests for falsy value rendering
 *
 * Tests cover:
 * - Rendering 0, empty string, false, null, undefined
 * - Conditional rendering patterns
 * - Arrays with falsy values
 * - Switching between falsy and truthy values
 */

import { describe, expect, test } from "bun:test";
import { render } from "../src/MiniReact";

describe("MiniReact.FalsyValues - Comprehensive", () => {
	let container: HTMLElement;

	function setup() {
		container = document.createElement("div");
		document.body.appendChild(container);
	}

	function teardown() {
		document.body.removeChild(container);
	}

	describe("Rendering Number 0", () => {
		test("should render 0 as text content", () => {
			setup();
			render({ type: "div", props: { children: [0] } }, container);

			expect(container.textContent).toBe("0");
			teardown();
		});

		test("should render 0 in nested structure", () => {
			setup();
			render(
				{
					type: "div",
					props: {
						children: [{ type: "span", props: { children: [0] } }],
					},
				},
				container,
			);

			expect(container.querySelector("span")?.textContent).toBe("0");
			teardown();
		});

		test("should handle switching from 0 to another number", () => {
			setup();
			render({ type: "div", props: { children: [0] } }, container);
			expect(container.textContent).toBe("0");

			render({ type: "div", props: { children: [42] } }, container);
			expect(container.textContent).toBe("42");
			teardown();
		});

		test("should handle switching from truthy to 0", () => {
			setup();
			render({ type: "div", props: { children: ["hello"] } }, container);
			expect(container.textContent).toBe("hello");

			render({ type: "div", props: { children: [0] } }, container);
			expect(container.textContent).toBe("0");
			teardown();
		});

		test("should render multiple zeros", () => {
			setup();
			render(
				{
					type: "div",
					props: {
						children: [0, 0, 0],
					},
				},
				container,
			);

			expect(container.textContent).toBe("000");
			teardown();
		});

		test("should render 0 in array with other values", () => {
			setup();
			render(
				{
					type: "div",
					props: {
						children: ["count: ", 0],
					},
				},
				container,
			);

			expect(container.textContent).toBe("count: 0");
			teardown();
		});
	});

	describe("Rendering Empty String", () => {
		test("should render empty string", () => {
			setup();
			render({ type: "div", props: { children: [""] } }, container);

			expect(container.textContent).toBe("");
			expect(container.childNodes.length).toBeGreaterThan(0);
			teardown();
		});

		test("should handle switching from empty string to content", () => {
			setup();
			render({ type: "div", props: { children: [""] } }, container);
			expect(container.textContent).toBe("");

			render({ type: "div", props: { children: ["hello"] } }, container);
			expect(container.textContent).toBe("hello");
			teardown();
		});

		test("should handle switching from content to empty string", () => {
			setup();
			render({ type: "div", props: { children: ["hello"] } }, container);
			expect(container.textContent).toBe("hello");

			render({ type: "div", props: { children: [""] } }, container);
			expect(container.textContent).toBe("");
			teardown();
		});

		test("should render empty string as prop value", () => {
			setup();
			render({ type: "input", props: { value: "", children: [] } }, container);

			const input = container.querySelector("input");
			expect(input?.value).toBe("");
			teardown();
		});

		test("should render empty string in array", () => {
			setup();
			render(
				{
					type: "div",
					props: {
						children: ["start", "", "end"],
					},
				},
				container,
			);

			expect(container.textContent).toBe("startend");
			teardown();
		});
	});

	describe("Rendering Boolean False", () => {
		test("should not render false as text content", () => {
			setup();
			render({ type: "div", props: { children: [false] } }, container);

			expect(container.textContent).toBe("");
			teardown();
		});

		test("should handle conditional rendering with false", () => {
			setup();
			render(
				{
					type: "div",
					props: {
						children: [
							false,
							{ type: "span", props: { children: ["visible"] } },
						],
					},
				},
				container,
			);

			expect(container.textContent).toBe("visible");
			expect(container.querySelector("span")).not.toBeNull();
			teardown();
		});

		test("should handle switching from false to true (both render nothing)", () => {
			setup();
			render({ type: "div", props: { children: [false] } }, container);
			expect(container.textContent).toBe("");

			render({ type: "div", props: { children: [true] } }, container);
			// true also doesn't render as text (React behavior)
			expect(container.textContent).toBe("");
			teardown();
		});

		test("should use false as prop value", () => {
			setup();
			render(
				{ type: "input", props: { disabled: false, children: [] } },
				container,
			);

			const input = container.querySelector("input");
			expect(input?.disabled).toBe(false);
			teardown();
		});
	});

	describe("Rendering Null", () => {
		test("should render nothing for null", () => {
			setup();
			render(null, container);

			expect(container.textContent).toBe("");
			expect(container.childNodes.length).toBe(0);
			teardown();
		});

		test("should handle null in children array", () => {
			setup();
			render(
				{
					type: "div",
					props: {
						children: ["before", null, "after"],
					},
				},
				container,
			);

			expect(container.textContent).toBe("beforeafter");
			teardown();
		});

		test("should handle switching from element to null", () => {
			setup();
			render({ type: "div", props: { children: ["content"] } }, container);
			expect(container.textContent).toBe("content");

			render(null, container);
			expect(container.textContent).toBe("");
			expect(container.childNodes.length).toBe(0);
			teardown();
		});

		test("should handle switching from null to element", () => {
			setup();
			render(null, container);
			expect(container.textContent).toBe("");

			render({ type: "div", props: { children: ["content"] } }, container);
			expect(container.textContent).toBe("content");
			teardown();
		});

		test("should handle nested null values", () => {
			setup();
			render(
				{
					type: "div",
					props: {
						children: [{ type: "span", props: { children: [null] } }, "text"],
					},
				},
				container,
			);

			expect(container.textContent).toBe("text");
			expect(container.querySelector("span")).not.toBeNull();
			teardown();
		});
	});

	describe("Rendering Undefined", () => {
		test("should render nothing for undefined", () => {
			setup();
			render(undefined, container);

			expect(container.textContent).toBe("");
			expect(container.childNodes.length).toBe(0);
			teardown();
		});

		test("should handle undefined in children array", () => {
			setup();
			render(
				{
					type: "div",
					props: {
						children: ["before", undefined, "after"],
					},
				},
				container,
			);

			expect(container.textContent).toBe("beforeafter");
			teardown();
		});

		test("should handle switching from element to undefined", () => {
			setup();
			render({ type: "div", props: { children: ["content"] } }, container);
			expect(container.textContent).toBe("content");

			render(undefined, container);
			expect(container.textContent).toBe("");
			teardown();
		});
	});

	describe("Mixed Falsy Values", () => {
		test("should handle array with multiple falsy types", () => {
			setup();
			render(
				{
					type: "div",
					props: {
						children: [0, "", false, null, undefined, "text"],
					},
				},
				container,
			);

			// 0 and "" render, false/null/undefined don't
			expect(container.textContent).toBe("0text");
			teardown();
		});

		test("should handle switching between different falsy values", () => {
			setup();
			render({ type: "div", props: { children: [0] } }, container);
			expect(container.textContent).toBe("0");

			render({ type: "div", props: { children: [""] } }, container);
			expect(container.textContent).toBe("");

			render({ type: "div", props: { children: [false] } }, container);
			expect(container.textContent).toBe("");

			render({ type: "div", props: { children: [null] } }, container);
			expect(container.textContent).toBe("");

			teardown();
		});

		test("should handle elements with falsy props", () => {
			setup();
			render(
				{
					type: "div",
					props: {
						id: "",
						"data-count": 0,
						"data-flag": false,
						children: [],
					},
				},
				container,
			);

			const div = container.querySelector("div");
			expect(div?.getAttribute("id")).toBe("");
			expect(div?.getAttribute("data-count")).toBe("0");
			// false removes the attribute (doesn't set it)
			expect(div?.getAttribute("data-flag")).toBeNull();
			teardown();
		});
	});

	describe("Conditional Rendering Patterns", () => {
		test("should handle logical AND with falsy left side", () => {
			setup();
			render(
				{
					type: "div",
					props: {
						children: [
							false,
							{ type: "span", props: { children: ["never shown"] } },
						],
					},
				},
				container,
			);

			expect(container.querySelector("span")).not.toBeNull();
			teardown();
		});

		test("should handle ternary with falsy values", () => {
			setup();
			// Simulating: condition ? 0 : "fallback"
			render(
				{
					type: "div",
					props: {
						children: [0],
					},
				},
				container,
			);

			expect(container.textContent).toBe("0");

			render(
				{
					type: "div",
					props: {
						children: ["fallback"],
					},
				},
				container,
			);

			expect(container.textContent).toBe("fallback");
			teardown();
		});

		test("should handle nested conditionals with falsy values", () => {
			setup();
			render(
				{
					type: "div",
					props: {
						children: [
							{
								type: "div",
								props: {
									children: [
										false,
										{
											type: "span",
											props: {
												children: [0],
											},
										},
									],
								},
							},
						],
					},
				},
				container,
			);

			expect(container.querySelector("span")?.textContent).toBe("0");
			teardown();
		});
	});

	describe("Edge Cases", () => {
		test("should handle NaN", () => {
			setup();
			render({ type: "div", props: { children: [Number.NaN] } }, container);

			expect(container.textContent).toBe("NaN");
			teardown();
		});

		test("should handle -0", () => {
			setup();
			render({ type: "div", props: { children: [-0] } }, container);

			expect(container.textContent).toBe("0");
			teardown();
		});

		test("should handle very small numbers", () => {
			setup();
			render({ type: "div", props: { children: [0.0000001] } }, container);

			// JavaScript may use scientific notation for very small numbers
			expect(container.textContent).toMatch(/1e-7|0\.0000001/);
			teardown();
		});

		test("should handle empty array", () => {
			setup();
			render({ type: "div", props: { children: [] } }, container);

			expect(container.textContent).toBe("");
			teardown();
		});

		test("should handle array of only falsy values", () => {
			setup();
			render(
				{
					type: "div",
					props: {
						children: [false, null, undefined],
					},
				},
				container,
			);

			expect(container.textContent).toBe("");
			teardown();
		});

		test("should preserve whitespace-only strings", () => {
			setup();
			render({ type: "div", props: { children: ["   "] } }, container);

			expect(container.textContent).toBe("   ");
			teardown();
		});

		test("should handle newline and tab characters", () => {
			setup();
			render({ type: "div", props: { children: ["\n\t"] } }, container);

			expect(container.textContent).toBe("\n\t");
			teardown();
		});
	});
});
