/**
 * Comprehensive tests for falsy value rendering
 *
 * Tests cover:
 * - Rendering 0, empty string, false, null, undefined
 * - Conditional rendering patterns
 * - Arrays with falsy values
 * - Switching between falsy and truthy values
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { render } from "../src/MiniReact";

describe("MiniReact.FalsyValues - Comprehensive", () => {
	let container: HTMLElement;

	beforeEach(() => {
		container = document.createElement("div");
		document.body.appendChild(container);
	});

	afterEach(() => {
		if (container?.parentNode) {
			container.parentNode.removeChild(container);
		}
	});

	describe("Rendering Number 0", () => {
		test("should render 0 as text content", () => {
			render({ type: "div", props: { children: [0] } }, container);

			expect(container.textContent).toBe("0");
		});

		test("should render 0 in nested structure", () => {
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
		});

		test("should handle switching from 0 to another number", () => {
			render({ type: "div", props: { children: [0] } }, container);
			expect(container.textContent).toBe("0");

			render({ type: "div", props: { children: [42] } }, container);
			expect(container.textContent).toBe("42");
		});

		test("should handle switching from truthy to 0", () => {
			render({ type: "div", props: { children: ["hello"] } }, container);
			expect(container.textContent).toBe("hello");

			render({ type: "div", props: { children: [0] } }, container);
			expect(container.textContent).toBe("0");
		});

		test("should render multiple zeros", () => {
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
		});

		test("should render 0 in array with other values", () => {
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
		});
	});

	describe("Rendering Empty String", () => {
		test("should render empty string", () => {
			render({ type: "div", props: { children: [""] } }, container);

			expect(container.textContent).toBe("");
			expect(container.childNodes.length).toBeGreaterThan(0);
		});

		test("should handle switching from empty string to content", () => {
			render({ type: "div", props: { children: [""] } }, container);
			expect(container.textContent).toBe("");

			render({ type: "div", props: { children: ["hello"] } }, container);
			expect(container.textContent).toBe("hello");
		});

		test("should handle switching from content to empty string", () => {
			render({ type: "div", props: { children: ["hello"] } }, container);
			expect(container.textContent).toBe("hello");

			render({ type: "div", props: { children: [""] } }, container);
			expect(container.textContent).toBe("");
		});

		test("should render empty string as prop value", () => {
			render({ type: "input", props: { value: "", children: [] } }, container);

			const input = container.querySelector("input");
			expect(input?.value).toBe("");
		});

		test("should render empty string in array", () => {
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
		});
	});

	describe("Rendering Boolean False", () => {
		test("should not render false as text content", () => {
			render({ type: "div", props: { children: [false] } }, container);

			expect(container.textContent).toBe("");
		});

		test("should handle conditional rendering with false", () => {
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
		});

		test("should handle switching from false to true (both render nothing)", () => {
			render({ type: "div", props: { children: [false] } }, container);
			expect(container.textContent).toBe("");

			render({ type: "div", props: { children: [true] } }, container);
			// true also doesn't render as text (React behavior)
			expect(container.textContent).toBe("");
		});

		test("should use false as prop value", () => {
			render(
				{ type: "input", props: { disabled: false, children: [] } },
				container,
			);

			const input = container.querySelector("input");
			expect(input?.disabled).toBe(false);
		});
	});

	describe("Rendering Null", () => {
		test("should render nothing for null", () => {
			render(null, container);

			expect(container.textContent).toBe("");
			expect(container.childNodes.length).toBe(0);
		});

		test("should handle null in children array", () => {
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
		});

		test("should handle switching from element to null", () => {
			render({ type: "div", props: { children: ["content"] } }, container);
			expect(container.textContent).toBe("content");

			render(null, container);
			expect(container.textContent).toBe("");
			expect(container.childNodes.length).toBe(0);
		});

		test("should handle switching from null to element", () => {
			render(null, container);
			expect(container.textContent).toBe("");

			render({ type: "div", props: { children: ["content"] } }, container);
			expect(container.textContent).toBe("content");
		});

		test("should handle nested null values", () => {
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
		});
	});

	describe("Rendering Undefined", () => {
		test("should render nothing for undefined", () => {
			render(undefined, container);

			expect(container.textContent).toBe("");
			expect(container.childNodes.length).toBe(0);
		});

		test("should handle undefined in children array", () => {
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
		});

		test("should handle switching from element to undefined", () => {
			render({ type: "div", props: { children: ["content"] } }, container);
			expect(container.textContent).toBe("content");

			render(undefined, container);
			expect(container.textContent).toBe("");
		});
	});

	describe("Mixed Falsy Values", () => {
		test("should handle array with multiple falsy types", () => {
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
		});

		test("should handle switching between different falsy values", () => {
			render({ type: "div", props: { children: [0] } }, container);
			expect(container.textContent).toBe("0");

			render({ type: "div", props: { children: [""] } }, container);
			expect(container.textContent).toBe("");

			render({ type: "div", props: { children: [false] } }, container);
			expect(container.textContent).toBe("");

			render({ type: "div", props: { children: [null] } }, container);
			expect(container.textContent).toBe("");
		});

		test("should handle elements with falsy props", () => {
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
		});
	});

	describe("Conditional Rendering Patterns", () => {
		test("should handle logical AND with falsy left side", () => {
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
		});

		test("should handle ternary with falsy values", () => {
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
		});

		test("should handle nested conditionals with falsy values", () => {
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
		});
	});

	describe("Edge Cases", () => {
		test("should handle NaN", () => {
			render({ type: "div", props: { children: [Number.NaN] } }, container);

			expect(container.textContent).toBe("NaN");
		});

		test("should handle -0", () => {
			render({ type: "div", props: { children: [-0] } }, container);

			expect(container.textContent).toBe("0");
		});

		test("should handle very small numbers", () => {
			render({ type: "div", props: { children: [0.0000001] } }, container);

			// JavaScript may use scientific notation for very small numbers
			expect(container.textContent).toMatch(/1e-7|0\.0000001/);
		});

		test("should handle empty array", () => {
			render({ type: "div", props: { children: [] } }, container);

			expect(container.textContent).toBe("");
		});

		test("should handle array of only falsy values", () => {
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
		});

		test("should preserve whitespace-only strings", () => {
			render({ type: "div", props: { children: ["   "] } }, container);

			expect(container.textContent).toBe("   ");
		});

		test("should handle newline and tab characters", () => {
			render({ type: "div", props: { children: ["\n\t"] } }, container);

			expect(container.textContent).toBe("\n\t");
		});
	});
});
