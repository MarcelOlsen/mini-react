import { beforeEach, describe, expect, test } from "bun:test";
import { createElement } from "../src/MiniReact";
import {
	type AnyMiniReactElement,
	type InternalTextElement,
	type MiniReactElement,
	TEXT_ELEMENT,
} from "../src/core/types";
import { reconcile } from "../src/reconciler";

describe("MiniReact.reconciler", () => {
	let container: HTMLElement;
	const ROOT_ID = "test-root";

	beforeEach(() => {
		document.body.innerHTML = `<div id="${ROOT_ID}"></div>`;
		const foundContainer = document.getElementById(ROOT_ID);
		if (!foundContainer) {
			throw new Error(`Test setup failure: #${ROOT_ID} not found.`);
		}
		container = foundContainer;
	});

	describe("Initial Render (oldInstance is null)", () => {
		test("should create a VDOM instance and DOM node for a simple host element", () => {
			const element = createElement("div", { id: "test" }, "Hello");
			const instance = reconcile(container, element, null);

			expect(instance).not.toBeNull();
			if (instance) {
				expect(instance.element).toBe(element);
				expect(instance.dom).not.toBeNull();
				expect(instance.dom?.nodeName).toBe("DIV");
				expect(instance.childInstances).toHaveLength(1);

				// Check that DOM was added to container
				const domElement = container.querySelector("#test");
				expect(domElement).not.toBeNull();
				expect(domElement?.textContent).toBe("Hello");
			}
		});

		test("should recursively create VDOM instances and DOM nodes for children", () => {
			const element = createElement(
				"div",
				{ className: "parent" },
				createElement("p", { id: "child" }, "Child text"),
				createElement("span", null, "Another child"),
			);
			const instance = reconcile(container, element, null);

			expect(instance).not.toBeNull();
			if (instance) {
				expect(instance.childInstances).toHaveLength(2);

				// Check first child (p element)
				const firstChild = instance.childInstances[0];
				expect(firstChild.element.type).toBe("p");
				expect(firstChild.dom?.nodeName).toBe("P");
				expect(firstChild.childInstances).toHaveLength(1); // Text node

				// Check second child (span element)
				const secondChild = instance.childInstances[1];
				expect(secondChild.element.type).toBe("span");
				expect(secondChild.dom?.nodeName).toBe("SPAN");

				// Verify DOM structure
				const parentDiv = container.querySelector(".parent");
				expect(parentDiv).not.toBeNull();
				expect(parentDiv?.children).toHaveLength(2);

				const childP = parentDiv?.querySelector("#child");
				expect(childP?.textContent).toBe("Child text");

				const childSpan = parentDiv?.querySelector("span");
				expect(childSpan?.textContent).toBe("Another child");
			}
		});

		test("should correctly handle text elements", () => {
			const textElement = {
				type: TEXT_ELEMENT,
				props: { nodeValue: "Hello World", children: [] },
			} as InternalTextElement;

			const instance = reconcile(container, textElement, null);

			expect(instance).not.toBeNull();
			if (instance) {
				expect(instance.element).toBe(textElement);
				expect(instance.dom?.nodeType).toBe(Node.TEXT_NODE);
				expect(instance.dom?.nodeValue).toBe("Hello World");
				expect(instance.childInstances).toHaveLength(0);

				// Check DOM
				expect(container.textContent).toBe("Hello World");
			}
		});

		test("should correctly handle functional components", () => {
			const FunctionalComponent = (props: {
				name: string;
				children?: MiniReactElement[];
			}) => {
				return createElement("h1", { id: "greeting" }, `Hello, ${props.name}!`);
			};

			const element = createElement(FunctionalComponent, {
				name: "World",
			});
			const instance = reconcile(container, element, null);

			expect(instance).not.toBeNull();
			if (instance) {
				expect(instance.element).toBe(element);
				expect(instance.childInstances).toHaveLength(1);

				// The functional component should have executed and created an h1
				const childInstance = instance.childInstances[0];
				expect(childInstance.element.type).toBe("h1");
				expect(childInstance.dom?.nodeName).toBe("H1");

				// Check DOM
				const greeting = container.querySelector("#greeting");
				expect(greeting?.textContent).toBe("Hello, World!");
			}
		});

		test("should handle functional component returning null", () => {
			const NullComponent = () => null;
			const element = createElement(NullComponent, {});
			const instance = reconcile(container, element, null);

			expect(instance).not.toBeNull();
			if (instance) {
				expect(instance.dom).toBeNull();
				expect(instance.childInstances).toHaveLength(0);
				expect(container.children).toHaveLength(0);
			}
		});

		test("should verify the structure of returned VDOM Instance", () => {
			const element = createElement(
				"section",
				{ "data-testid": "section" },
				"Content",
			);
			const instance = reconcile(container, element, null);

			expect(instance).not.toBeNull();
			if (instance) {
				// Check instance structure
				expect(instance).toHaveProperty("element");
				expect(instance).toHaveProperty("dom");
				expect(instance).toHaveProperty("childInstances");

				expect(instance.element).toBe(element);
				expect(instance.dom).toBeInstanceOf(HTMLElement);
				expect(Array.isArray(instance.childInstances)).toBe(true);

				// Check that DOM reference is correct
				expect(instance.dom).toBe(
					container.querySelector('[data-testid="section"]'),
				);
			}
		});
	});

	describe("Updates - Element Removal", () => {
		test("should remove DOM when newElement is null and oldInstance exists", () => {
			// First render
			const element = createElement(
				"div",
				{ id: "to-remove" },
				"Will be removed",
			);
			const oldInstance = reconcile(container, element, null);

			expect(container.querySelector("#to-remove")).not.toBeNull();

			// Remove by passing null
			const newInstance = reconcile(container, null, oldInstance);

			expect(newInstance).toBeNull();
			expect(container.querySelector("#to-remove")).toBeNull();
			expect(container.children).toHaveLength(0);
		});

		test("should handle removal of nested elements", () => {
			const element = createElement(
				"div",
				{ id: "parent" },
				createElement("p", { id: "child" }, "Child"),
			);
			const oldInstance = reconcile(container, element, null);

			expect(container.querySelector("#parent")).not.toBeNull();
			expect(container.querySelector("#child")).not.toBeNull();

			const newInstance = reconcile(container, null, oldInstance);

			expect(newInstance).toBeNull();
			expect(container.querySelector("#parent")).toBeNull();
			expect(container.querySelector("#child")).toBeNull();
		});
	});

	describe("Updates - Type Change", () => {
		test("should replace DOM when element type changes", () => {
			// Initial render with div
			const divElement = createElement(
				"div",
				{ id: "changeable" },
				"I am a div",
			);
			const oldInstance = reconcile(container, divElement, null);

			const originalDiv = container.querySelector("#changeable");
			expect(originalDiv?.tagName).toBe("DIV");

			// Update to p element
			const pElement = createElement("p", { id: "changeable" }, "I am a p");
			const newInstance = reconcile(container, pElement, oldInstance);

			expect(newInstance).not.toBeNull();
			if (newInstance) {
				expect(newInstance.element).toBe(pElement);
				expect(newInstance.dom?.nodeName).toBe("P");

				// Verify old DOM was replaced
				const newP = container.querySelector("#changeable");
				expect(newP?.tagName).toBe("P");
				expect(newP?.textContent).toBe("I am a p");
				expect(newP).not.toBe(originalDiv); // Different DOM node
			}
		});

		test("should create new VDOM instance when type changes", () => {
			const spanElement = createElement(
				"span",
				{ className: "original" },
				"Original",
			);
			const oldInstance = reconcile(container, spanElement, null);

			const divElement = createElement(
				"div",
				{ className: "updated" },
				"Updated",
			);
			const newInstance = reconcile(container, divElement, oldInstance);

			expect(newInstance).not.toBe(oldInstance);
			expect(newInstance?.element).toBe(divElement);
			if (oldInstance) {
				expect(newInstance?.element).not.toBe(oldInstance.element);
			}
		});

		test("should handle type change from host element to functional component", () => {
			const hostElement = createElement("h1", {}, "Host Element");
			const oldInstance = reconcile(container, hostElement, null);

			const FuncComponent = () =>
				createElement("h2", {}, "Functional Component");
			const funcElement = createElement(FuncComponent, {});
			const newInstance = reconcile(container, funcElement, oldInstance);

			expect(newInstance).not.toBeNull();
			if (newInstance) {
				expect(container.querySelector("h1")).toBeNull();
				expect(container.querySelector("h2")).not.toBeNull();
				expect(container.textContent).toBe("Functional Component");
			}
		});
	});

	describe("Updates - Same Type (Host Element)", () => {
		test("should reuse existing DOM node for same type", () => {
			const element1 = createElement(
				"div",
				{ id: "same-type" },
				"Original content",
			);
			const oldInstance = reconcile(container, element1, null);

			const originalDom = oldInstance?.dom || null;

			const element2 = createElement(
				"div",
				{ id: "same-type" },
				"Updated content",
			);
			const newInstance = reconcile(container, element2, oldInstance);

			expect(newInstance).not.toBeNull();
			if (newInstance && oldInstance) {
				// Should reuse same DOM node (for now in Phase 3)
				expect(newInstance.dom).toBe(originalDom);
				expect(newInstance.element).toBe(element2);
			}
		});

		test("should update text node content for same type", () => {
			const textElement1 = {
				type: TEXT_ELEMENT,
				props: { nodeValue: "Original text", children: [] },
			} as AnyMiniReactElement;

			const oldInstance = reconcile(container, textElement1, null);
			expect(container.textContent).toBe("Original text");

			const textElement2 = {
				type: TEXT_ELEMENT,
				props: { nodeValue: "Updated text", children: [] },
			} as AnyMiniReactElement;

			const newInstance = reconcile(container, textElement2, oldInstance);

			expect(newInstance).not.toBeNull();
			if (newInstance) {
				expect(container.textContent).toBe("Updated text");
				expect(newInstance.dom?.nodeValue).toBe("Updated text");
			}
		});

		test("should handle children reconciliation naively", () => {
			const element1 = createElement(
				"ul",
				{},
				createElement("li", {}, "Item 1"),
				createElement("li", {}, "Item 2"),
			);
			const oldInstance = reconcile(container, element1, null);

			const element2 = createElement(
				"ul",
				{},
				createElement("li", {}, "Updated Item 1"),
				createElement("li", {}, "Updated Item 2"),
				createElement("li", {}, "New Item 3"),
			);
			const newInstance = reconcile(container, element2, oldInstance);

			expect(newInstance).not.toBeNull();
			if (newInstance) {
				expect(newInstance.childInstances).toHaveLength(3);

				const ul = container.querySelector("ul");
				expect(ul?.children).toHaveLength(3);
				expect(ul?.textContent).toBe("Updated Item 1Updated Item 2New Item 3");
			}
		});
	});

	describe("Updates - Same Type (Functional Component)", () => {
		test("should re-execute functional component and reconcile output", () => {
			let renderCount = 0;
			const CountingComponent = (props: { message: string }) => {
				renderCount++;
				const message = props.message;
				return createElement("div", { "data-render": renderCount }, message);
			};

			const element1 = createElement(CountingComponent, {
				message: "First render",
			});
			const oldInstance = reconcile(container, element1, null);

			expect(renderCount).toBe(1);
			expect(container.textContent).toBe("First render");

			const element2 = createElement(CountingComponent, {
				message: "Second render",
			});
			const newInstance = reconcile(container, element2, oldInstance);

			expect(renderCount).toBe(2);
			expect(container.textContent).toBe("Second render");
			expect(newInstance?.element).toBe(element2);
		});

		test("should handle functional component output type change", () => {
			const ConditionalComponent = (props: { useDiv: boolean }) => {
				const useDiv = props.useDiv;
				return useDiv
					? createElement("div", {}, "I am a div")
					: createElement("span", {}, "I am a span");
			};

			const element1 = createElement(ConditionalComponent, {
				useDiv: true,
			});
			const oldInstance = reconcile(container, element1, null);

			expect(container.querySelector("div")).not.toBeNull();
			expect(container.querySelector("span")).toBeNull();

			const element2 = createElement(ConditionalComponent, {
				useDiv: false,
			});
			const newInstance = reconcile(container, element2, oldInstance);

			expect(container.querySelector("div")).toBeNull();
			expect(container.querySelector("span")).not.toBeNull();
			expect(container.textContent).toBe("I am a span");
			expect(newInstance).not.toBeNull();
		});

		test("should handle functional component returning null after returning element", () => {
			const ConditionalComponent = (props: { show: boolean }) => {
				const show = props.show;
				return show ? createElement("div", {}, "Visible") : null;
			};

			const element1 = createElement(ConditionalComponent, {
				show: true,
			});
			const oldInstance = reconcile(container, element1, null);

			expect(container.textContent).toBe("Visible");

			const element2 = createElement(ConditionalComponent, {
				show: false,
			});
			const newInstance = reconcile(container, element2, oldInstance);

			expect(newInstance).not.toBeNull();
			if (newInstance) {
				expect(newInstance.dom).toBeNull();
				expect(container.children).toHaveLength(0);
			}
		});
	});

	describe("Complex Scenarios", () => {
		test("should handle deeply nested updates", () => {
			const element1 = createElement(
				"div",
				{ id: "root" },
				createElement("section", {}, createElement("p", {}, "Nested content")),
			);
			const oldInstance = reconcile(container, element1, null);

			const element2 = createElement(
				"div",
				{ id: "root" },
				createElement(
					"section",
					{},
					createElement("p", {}, "Updated nested content"),
					createElement("span", {}, "New sibling"),
				),
			);
			const newInstance = reconcile(container, element2, oldInstance);

			expect(newInstance).not.toBeNull();
			const root = container.querySelector("#root");
			expect(root?.querySelector("p")?.textContent).toBe(
				"Updated nested content",
			);
			expect(root?.querySelector("span")?.textContent).toBe("New sibling");
		});

		test("should handle mixed functional and host components", () => {
			const Wrapper = (props: {
				title: string;
				children?: MiniReactElement[];
			}) => {
				const title = props.title;
				const children = props.children || [];
				return createElement(
					"div",
					{ className: "wrapper" },
					createElement("h1", {}, title),
					...children,
				);
			};

			const element1 = createElement(
				Wrapper,
				{ title: "Original Title" },
				createElement("p", {}, "Content"),
			);
			const oldInstance = reconcile(container, element1, null);

			const element2 = createElement(
				Wrapper,
				{ title: "Updated Title" },
				createElement("p", {}, "Updated Content"),
				createElement("footer", {}, "Footer"),
			);
			const newInstance = reconcile(container, element2, oldInstance);

			expect(container.querySelector("h1")?.textContent).toBe("Updated Title");
			expect(container.querySelector("p")?.textContent).toBe("Updated Content");
			expect(container.querySelector("footer")?.textContent).toBe("Footer");
			expect(newInstance).not.toBeNull();
		});
	});
});
