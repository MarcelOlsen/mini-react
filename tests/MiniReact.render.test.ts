import { expect, test, describe, beforeEach } from "bun:test";
import { render, createElement } from "../src/MiniReact";

describe("MiniReact.render", () => {
    let container: HTMLElement;
    const ROOT_ID = "test-root";

    beforeEach(() => {
        // Ensure a clean body for each test if previous tests manipulated it broadly
        document.body.innerHTML = `<div id="${ROOT_ID}"></div>`;
        const foundContainer = document.getElementById(ROOT_ID);
        if (!foundContainer) {
            throw new Error(
                `Test setup critical failure: #${ROOT_ID} not found in happy-dom environment.`,
            );
        }
        container = foundContainer;
    });

    test("should render a simple host element with text content", () => {
        const element = createElement("h1", { id: "title" }, "Hello World");
        render(element, container);

        const h1 = container.querySelector("#title");
        expect(h1).not.toBeNull();
        if (h1) {
            expect(h1.tagName).toBe("H1");
            expect(h1.textContent).toBe("Hello World");
        }
    });

    test("should render an element with various attributes", () => {
        const element = createElement("input", {
            type: "text",
            id: "username",
            className: "form-input active",
            placeholder: "Enter username",
            "data-testid": "user-input",
        });
        render(element, container);

        const input = container.querySelector(
            "#username",
        ) as HTMLInputElement | null;
        expect(input).not.toBeNull();
        if (input) {
            expect(input.tagName).toBe("INPUT");
            expect(input.type).toBe("text");
            expect(input.className).toBe("form-input active");
            expect(input.placeholder).toBe("Enter username");
            expect(input.getAttribute("data-testid")).toBe("user-input");
        }
            });

            test("should render nested host elements", () => {
        const element = createElement(
            "div",
            { className: "parent" },
            createElement("p", { id: "child-p" }, "I am a child"),
            createElement("span", null, "Another child"),
        );
        render(element, container);

        const parentDiv = container.querySelector(".parent");
        expect(parentDiv).not.toBeNull();

        const childP = parentDiv?.querySelector("#child-p");
        expect(childP).not.toBeNull();
        if (childP) {
            expect(childP.tagName).toBe("P");
            expect(childP.textContent).toBe("I am a child");
        }

        const childSpan = parentDiv?.querySelector("span");
        expect(childSpan).not.toBeNull();
        if (childSpan) {
            expect(childSpan.textContent).toBe("Another child");
        }
    });

    test("should render elements with mixed element and text children", () => {
        const element = createElement(
            "div",
            null,
            "Text before, ",
            createElement("strong", null, "bold text"),
            ", text after.",
        );
        render(element, container);
        expect(container.firstChild?.textContent).toBe(
            "Text before, bold text, text after.",
        );
    });

    test("should render number children as text", () => {
        const element = createElement("p", null, "Count: ", 0, " items.");
        render(element, container);
        expect(container.firstChild?.textContent).toBe("Count: 0 items.");
    });

    // --- Edge Cases & Special Values ---

    test("should clear the container when rendering a null element", () => {
        // First render something
        const element = createElement("div", {}, "Initial content");
        render(element, container);
        expect(container.textContent).toBe("Initial content");

        // Then render null to clear
        render(null, container);
        expect(container.innerHTML).toBe("");
        expect(container.firstChild).toBeNull();
    });

    test("should clear the container when rendering an undefined element", () => {
        // First render something
        const element = createElement("div", {}, "Initial content");
        render(element, container);
        expect(container.textContent).toBe("Initial content");

        // Then render undefined to clear
        render(undefined, container);
        expect(container.innerHTML).toBe("");
    });

    test("should render an element with no props (null)", () => {
        const element = createElement("div", null, "No props");
        render(element, container);
        const div = container.firstChild as HTMLElement;
        expect(div).not.toBeNull();
        expect(div.tagName).toBe("DIV");
        expect(div.textContent).toBe("No props");
        expect(div.attributes.length).toBe(0); // Or 1 if happy-dom adds something by default
    });

    test("should render an element with empty props object", () => {
        const element = createElement("div", {}, "Empty props");
        render(element, container);
        const div = container.firstChild as HTMLElement;
        expect(div).not.toBeNull();
        expect(div.textContent).toBe("Empty props");
        expect(div.attributes.length).toBe(0);
    });

    test("should render an element with no children", () => {
        const element = createElement("hr", { id: "divider" });
        render(element, container);
        const hr = container.querySelector("#divider");
        expect(hr).not.toBeNull();
        if (hr) {
            expect(hr.tagName).toBe("HR");
            expect(hr.childNodes.length).toBe(0);
        }
    });

    test("should render an element with an empty children array", () => {
        const element = createElement("div", { id: "empty-children" }, ...[]);
        render(element, container);
        const div = container.querySelector("#empty-children");
        expect(div).not.toBeNull();
        if (div) {
            expect(div.childNodes.length).toBe(0);
        }
    });

    test("should render an element with children that are null or undefined (should be skipped)", () => {
        const element = createElement(
            "div",
            null,
            "Before",
            // biome-ignore lint/suspicious/noExplicitAny: A null child (cast to 'any' to satisfy TypeScript)
            null as any,
            "Between",
            // biome-ignore lint/suspicious/noExplicitAny: An undefined child (cast to 'any')
            undefined as any,
            "After",
        );

        render(element, container);

        expect(container.firstChild?.textContent).toBe(
            "BeforenullBetweenundefinedAfter",
        );
    });

    test("should handle props with empty string values", () => {
        const element = createElement("input", { id: "test", value: "" });
        render(element, container);
        const input = container.querySelector(
            "#test",
        ) as HTMLInputElement | null;
        expect(input).not.toBeNull();
        if (input) {
            expect(input.value).toBe("");
            expect(input.getAttribute("value")).toBe("");
        }
    });

    test("should handle props with numeric values (converted to string for attributes)", () => {
        const element = createElement("div", {
            "data-count": 5,
            id: "num-prop",
        });
        render(element, container);
        const div = container.querySelector("#num-prop");
        expect(div).not.toBeNull();
        if (div) {
            expect(div.getAttribute("data-count")).toBe("5");
        }
    });

    // --- New tests for Phase 3 reconciliation ---

    describe("Reconciliation and rootInstance management", () => {
        test("should correctly initialize rootInstance on first render", () => {
            const element = createElement("div", { id: "first-render" }, "First");
            render(element, container);

            const firstDiv = container.querySelector("#first-render");
            expect(firstDiv).not.toBeNull();
            expect(firstDiv?.textContent).toBe("First");
        });

        test("should trigger reconciliation process on subsequent renders", () => {
            // Initial render
            const element1 = createElement("div", { id: "changeable" }, "Original");
            render(element1, container);

            const originalDiv = container.querySelector("#changeable");
            expect(originalDiv?.textContent).toBe("Original");

            // Update render - same type should reuse DOM node
            const element2 = createElement("div", { id: "changeable" }, "Updated");
            render(element2, container);

            const updatedDiv = container.querySelector("#changeable");
            expect(updatedDiv?.textContent).toBe("Updated");
            // In our naive implementation, it should be the same DOM node
            expect(updatedDiv).toBe(originalDiv);
        });

        test("should handle element type changes through reconciliation", () => {
            // Initial render with div
            const divElement = createElement("div", { id: "type-change" }, "I am a div");
            render(divElement, container);

            const originalElement = container.querySelector("#type-change");
            expect(originalElement?.tagName).toBe("DIV");

            // Update to p element - should replace DOM
            const pElement = createElement("p", { id: "type-change" }, "I am a p");
            render(pElement, container);

            const newElement = container.querySelector("#type-change");
            expect(newElement?.tagName).toBe("P");
            expect(newElement?.textContent).toBe("I am a p");
            expect(newElement).not.toBe(originalElement); // Different DOM node
        });

        test("should handle multiple renders maintaining rootInstance consistency", () => {
            // Render sequence: div -> p -> span
            const elements = [
                createElement("div", { className: "render-1" }, "Render 1"),
                createElement("p", { className: "render-2" }, "Render 2"),
                createElement("span", { className: "render-3" }, "Render 3"),
            ];

            elements.forEach((element, index) => {
                render(element, container);

                const renderedElement = container.querySelector(`.render-${index + 1}`);
                expect(renderedElement).not.toBeNull();
                expect(renderedElement?.textContent).toBe(`Render ${index + 1}`);

                // Only one element should be in the container
                expect(container.children).toHaveLength(1);
            });
        });

        test("should handle functional component updates through reconciliation", () => {
            const Component: import("../src/types").FunctionalComponent = (props) => {
                const message = (props as { message: string }).message;
                return createElement("h1", { id: "component-output" }, message);
            };

            // Initial render
            const element1 = createElement(Component, { message: "Hello" });
            render(element1, container);

            expect(container.querySelector("#component-output")?.textContent).toBe("Hello");

            // Update render - should re-execute component
            const element2 = createElement(Component, { message: "Goodbye" });
            render(element2, container);

            expect(container.querySelector("#component-output")?.textContent).toBe("Goodbye");
        });

        test("should handle clearing and re-rendering", () => {
            // Initial render
            const element = createElement("div", {}, "Initial");
            render(element, container);
            expect(container.textContent).toBe("Initial");

            // Clear
            render(null, container);
            expect(container.children).toHaveLength(0);

            // Re-render
            const newElement = createElement("p", {}, "New content");
            render(newElement, container);
            expect(container.querySelector("p")?.textContent).toBe("New content");
                });
            });
        });

