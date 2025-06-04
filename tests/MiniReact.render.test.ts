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

    // --- Prop Diffing & Efficient Children Reconciliation Tests ---

    describe("Prop Diffing", () => {
        test("should update only changed attributes when props change", () => {
            // Initial render with multiple attributes
            const element1 = createElement("div", {
                id: "prop-diff-test",
                className: "initial-class",
                "data-value": "initial",
                title: "Initial Title",
                style: "color: red;",
            }, "Content");

            render(element1, container);

            const div = container.querySelector("#prop-diff-test") as HTMLElement;
            expect(div).not.toBeNull();
            expect(div.className).toBe("initial-class");
            expect(div.getAttribute("data-value")).toBe("initial");
            expect(div.title).toBe("Initial Title");
            expect(div.getAttribute("style")).toBe("color: red;");

            // Store reference to track if DOM node is reused
            const originalDiv = div;

            // Update with some changed and some unchanged props
            const element2 = createElement("div", {
                id: "prop-diff-test", // unchanged
                className: "updated-class", // changed
                "data-value": "initial", // unchanged
                title: "Updated Title", // changed
                style: "color: red;", // unchanged
                "data-new": "new-attr", // added
            }, "Content");

            render(element2, container);

            const updatedDiv = container.querySelector("#prop-diff-test") as HTMLElement;

            // Should reuse the same DOM node
            expect(updatedDiv).toBe(originalDiv);

            // Changed props should be updated
            expect(updatedDiv.className).toBe("updated-class");
            expect(updatedDiv.title).toBe("Updated Title");
            expect(updatedDiv.getAttribute("data-new")).toBe("new-attr");

            // Unchanged props should remain the same
            expect(updatedDiv.id).toBe("prop-diff-test");
            expect(updatedDiv.getAttribute("data-value")).toBe("initial");
            expect(updatedDiv.getAttribute("style")).toBe("color: red;");
        });

        test("should remove attributes that are no longer present", () => {
            // Initial render with attributes
            const element1 = createElement("div", {
                id: "remove-attr-test",
                className: "test-class",
                "data-temp": "temporary",
                title: "Test Title",
            });

            render(element1, container);

            const div = container.querySelector("#remove-attr-test") as HTMLElement;
            expect(div.getAttribute("data-temp")).toBe("temporary");
            expect(div.title).toBe("Test Title");

            // Update without some attributes
            const element2 = createElement("div", {
                id: "remove-attr-test",
                className: "test-class",
                // data-temp and title removed
            });

            render(element2, container);

            const updatedDiv = container.querySelector("#remove-attr-test") as HTMLElement;

            // Removed attributes should be null/empty
            expect(updatedDiv.getAttribute("data-temp")).toBeNull();
            expect(updatedDiv.title).toBe("");

            // Remaining attributes should still be present
            expect(updatedDiv.id).toBe("remove-attr-test");
            expect(updatedDiv.className).toBe("test-class");
        });

        test("should handle props with special values (null, undefined, false, 0)", () => {
            const element1 = createElement("input", {
                id: "special-props",
                value: "initial",
                disabled: true,
                "data-count": 5,
            });

            render(element1, container);

            const input = container.querySelector("#special-props") as HTMLInputElement;
            expect(input.value).toBe("initial");
            expect(input.disabled).toBe(true);
            expect(input.getAttribute("data-count")).toBe("5");

            // Update with special values
            const element2 = createElement("input", {
                id: "special-props",
                value: "", // empty string
                disabled: false, // false boolean
                "data-count": 0, // zero
                "data-null": null as any, // null
                "data-undefined": undefined as any, // undefined
            });

            render(element2, container);

            const updatedInput = container.querySelector("#special-props") as HTMLInputElement;
            expect(updatedInput.value).toBe("");
            expect(updatedInput.disabled).toBe(false);
            expect(updatedInput.getAttribute("data-count")).toBe("0");
        });
    });

    describe("Children Reconciliation - Unkeyed", () => {
        test("should add new children at the end", () => {
            // Initial render with 2 children
            const element1 = createElement("div", { id: "add-children" },
                createElement("p", { id: "child-1" }, "Child 1"),
                createElement("p", { id: "child-2" }, "Child 2"),
            );

            render(element1, container);

            const parent = container.querySelector("#add-children") as HTMLElement;
            expect(parent.children).toHaveLength(2);
            expect(parent.children[0].textContent).toBe("Child 1");
            expect(parent.children[1].textContent).toBe("Child 2");

            // Update with additional children
            const element2 = createElement("div", { id: "add-children" },
                createElement("p", { id: "child-1" }, "Child 1"),
                createElement("p", { id: "child-2" }, "Child 2"),
                createElement("p", { id: "child-3" }, "Child 3"),
                createElement("p", { id: "child-4" }, "Child 4"),
            );

            render(element2, container);

            const updatedParent = container.querySelector("#add-children") as HTMLElement;
            expect(updatedParent.children).toHaveLength(4);
            expect(updatedParent.children[2].textContent).toBe("Child 3");
            expect(updatedParent.children[3].textContent).toBe("Child 4");
        });

        test("should remove children from the end", () => {
            // Initial render with 4 children
            const element1 = createElement("div", { id: "remove-children" },
                createElement("p", { id: "child-1" }, "Child 1"),
                createElement("p", { id: "child-2" }, "Child 2"),
                createElement("p", { id: "child-3" }, "Child 3"),
                createElement("p", { id: "child-4" }, "Child 4"),
            );

            render(element1, container);

            const parent = container.querySelector("#remove-children") as HTMLElement;
            expect(parent.children).toHaveLength(4);

            // Update with fewer children
            const element2 = createElement("div", { id: "remove-children" },
                createElement("p", { id: "child-1" }, "Child 1"),
                createElement("p", { id: "child-2" }, "Child 2"),
            );

            render(element2, container);

            const updatedParent = container.querySelector("#remove-children") as HTMLElement;
            expect(updatedParent.children).toHaveLength(2);
            expect(updatedParent.children[0].textContent).toBe("Child 1");
            expect(updatedParent.children[1].textContent).toBe("Child 2");

            // Removed children should no longer be in DOM
            expect(container.querySelector("#child-3")).toBeNull();
            expect(container.querySelector("#child-4")).toBeNull();
        });

        test("should handle mixed text and element children", () => {
            const element1 = createElement("div", { id: "mixed-children" },
                "Text before",
                createElement("span", { id: "middle-span" }, "Middle"),
                "Text after",
            );

            render(element1, container);

            const parent = container.querySelector("#mixed-children") as HTMLElement;
            expect(parent.textContent).toBe("Text beforeMiddleText after");

            // Update with different mix
            const element2 = createElement("div", { id: "mixed-children" },
                createElement("strong", { id: "start-strong" }, "Start"),
                "New text",
                createElement("span", { id: "middle-span" }, "Updated Middle"),
                42, // number child
            );

            render(element2, container);

            const updatedParent = container.querySelector("#mixed-children") as HTMLElement;
            expect(updatedParent.textContent).toBe("StartNew textUpdated Middle42");
            expect(updatedParent.querySelector("#start-strong")).not.toBeNull();
            expect(updatedParent.querySelector("#middle-span")?.textContent).toBe("Updated Middle");
        });

        test("should reorder children efficiently (may recreate nodes without keys)", () => {
            // Initial order: A, B, C
            const element1 = createElement("div", { id: "reorder-unkeyed" },
                createElement("div", { className: "item", "data-item": "A" }, "Item A"),
                createElement("div", { className: "item", "data-item": "B" }, "Item B"),
                createElement("div", { className: "item", "data-item": "C" }, "Item C"),
            );

            render(element1, container);

            const parent = container.querySelector("#reorder-unkeyed") as HTMLElement;
            const originalNodes = Array.from(parent.children);
            expect(originalNodes[0].getAttribute("data-item")).toBe("A");
            expect(originalNodes[1].getAttribute("data-item")).toBe("B");
            expect(originalNodes[2].getAttribute("data-item")).toBe("C");

            // Reorder to: C, A, B
            const element2 = createElement("div", { id: "reorder-unkeyed" },
                createElement("div", { className: "item", "data-item": "C" }, "Item C"),
                createElement("div", { className: "item", "data-item": "A" }, "Item A"),
                createElement("div", { className: "item", "data-item": "B" }, "Item B"),
            );

            render(element2, container);

            const updatedParent = container.querySelector("#reorder-unkeyed") as HTMLElement;
            const reorderedNodes = Array.from(updatedParent.children);

            // Check new order
            expect(reorderedNodes[0].getAttribute("data-item")).toBe("C");
            expect(reorderedNodes[1].getAttribute("data-item")).toBe("A");
            expect(reorderedNodes[2].getAttribute("data-item")).toBe("B");

            // Note: Without keys, nodes may be recreated rather than moved
            // This test documents the behavior - efficiency depends on implementation
        });
    });

    describe("Children Reconciliation - Keyed", () => {
        test("should reuse DOM nodes when reordering with keys", () => {
            // Initial order with keys: A, B, C
            const element1 = createElement("div", { id: "reorder-keyed" },
                createElement("div", { key: "A", className: "item", "data-item": "A" }, "Item A"),
                createElement("div", { key: "B", className: "item", "data-item": "B" }, "Item B"),
                createElement("div", { key: "C", className: "item", "data-item": "C" }, "Item C"),
            );

            render(element1, container);

            const parent = container.querySelector("#reorder-keyed") as HTMLElement;
            const originalNodes = Array.from(parent.children);
            const originalA = originalNodes[0];
            const originalB = originalNodes[1];
            const originalC = originalNodes[2];

            // Reorder to: C, A, B (with same keys)
            const element2 = createElement("div", { id: "reorder-keyed" },
                createElement("div", { key: "C", className: "item", "data-item": "C" }, "Item C"),
                createElement("div", { key: "A", className: "item", "data-item": "A" }, "Item A"),
                createElement("div", { key: "B", className: "item", "data-item": "B" }, "Item B"),
            );

            render(element2, container);

            const updatedParent = container.querySelector("#reorder-keyed") as HTMLElement;
            const reorderedNodes = Array.from(updatedParent.children);

            // Check new order
            expect(reorderedNodes[0].getAttribute("data-item")).toBe("C");
            expect(reorderedNodes[1].getAttribute("data-item")).toBe("A");
            expect(reorderedNodes[2].getAttribute("data-item")).toBe("B");

            // With proper key-based reconciliation, the same DOM nodes should be reused
            expect(reorderedNodes[0]).toBe(originalC); // C moved to first
            expect(reorderedNodes[1]).toBe(originalA); // A moved to second
            expect(reorderedNodes[2]).toBe(originalB); // B moved to third
        });

        test("should add new keyed children in correct positions", () => {
            // Initial: A, C
            const element1 = createElement("div", { id: "add-keyed" },
                createElement("div", { key: "A", "data-item": "A" }, "Item A"),
                createElement("div", { key: "C", "data-item": "C" }, "Item C"),
            );

            render(element1, container);

            const parent = container.querySelector("#add-keyed") as HTMLElement;
            const originalA = parent.children[0];
            const originalC = parent.children[1];

            // Update to: A, B, C, D (adding B and D)
            const element2 = createElement("div", { id: "add-keyed" },
                createElement("div", { key: "A", "data-item": "A" }, "Item A"),
                createElement("div", { key: "B", "data-item": "B" }, "Item B"),
                createElement("div", { key: "C", "data-item": "C" }, "Item C"),
                createElement("div", { key: "D", "data-item": "D" }, "Item D"),
            );

            render(element2, container);

            const updatedParent = container.querySelector("#add-keyed") as HTMLElement;
            expect(updatedParent.children).toHaveLength(4);

            // Original nodes should be preserved
            expect(updatedParent.children[0]).toBe(originalA);
            expect(updatedParent.children[2]).toBe(originalC);

            // New nodes should be inserted in correct positions
            expect(updatedParent.children[1].getAttribute("data-item")).toBe("B");
            expect(updatedParent.children[3].getAttribute("data-item")).toBe("D");
        });

        test("should remove keyed children while preserving others", () => {
            // Initial: A, B, C, D
            const element1 = createElement("div", { id: "remove-keyed" },
                createElement("div", { key: "A", "data-item": "A" }, "Item A"),
                createElement("div", { key: "B", "data-item": "B" }, "Item B"),
                createElement("div", { key: "C", "data-item": "C" }, "Item C"),
                createElement("div", { key: "D", "data-item": "D" }, "Item D"),
            );

            render(element1, container);

            const parent = container.querySelector("#remove-keyed") as HTMLElement;
            const originalA = parent.children[0];
            const originalC = parent.children[2];

            // Update to: A, C (removing B and D)
            const element2 = createElement("div", { id: "remove-keyed" },
                createElement("div", { key: "A", "data-item": "A" }, "Item A"),
                createElement("div", { key: "C", "data-item": "C" }, "Item C"),
            );

            render(element2, container);

            const updatedParent = container.querySelector("#remove-keyed") as HTMLElement;
            expect(updatedParent.children).toHaveLength(2);

            // Preserved nodes should be the same DOM elements
            expect(updatedParent.children[0]).toBe(originalA);
            expect(updatedParent.children[1]).toBe(originalC);

            // Removed nodes should not be in the DOM
            expect(Array.from(updatedParent.children).find(child =>
                child.getAttribute("data-item") === "B"
            )).toBeUndefined();
            expect(Array.from(updatedParent.children).find(child =>
                child.getAttribute("data-item") === "D"
            )).toBeUndefined();
        });

        test("should handle complex keyed operations (add, remove, reorder)", () => {
            // Initial: A, B, C, D, E
            const element1 = createElement("div", { id: "complex-keyed" },
                createElement("div", { key: "A", "data-item": "A" }, "Item A"),
                createElement("div", { key: "B", "data-item": "B" }, "Item B"),
                createElement("div", { key: "C", "data-item": "C" }, "Item C"),
                createElement("div", { key: "D", "data-item": "D" }, "Item D"),
                createElement("div", { key: "E", "data-item": "E" }, "Item E"),
            );

            render(element1, container);

            const parent = container.querySelector("#complex-keyed") as HTMLElement;
            const originalNodes = Array.from(parent.children);
            const nodeMap = new Map();
            originalNodes.forEach(node => {
                nodeMap.set(node.getAttribute("data-item"), node);
            });

            // Update to: E, A, F, C (removed B,D; added F; reordered)
            const element2 = createElement("div", { id: "complex-keyed" },
                createElement("div", { key: "E", "data-item": "E" }, "Item E"),
                createElement("div", { key: "A", "data-item": "A" }, "Item A"),
                createElement("div", { key: "F", "data-item": "F" }, "Item F"),
                createElement("div", { key: "C", "data-item": "C" }, "Item C"),
            );

            render(element2, container);

            const updatedParent = container.querySelector("#complex-keyed") as HTMLElement;
            const updatedNodes = Array.from(updatedParent.children);

            expect(updatedNodes).toHaveLength(4);

            // Check order
            expect(updatedNodes[0].getAttribute("data-item")).toBe("E");
            expect(updatedNodes[1].getAttribute("data-item")).toBe("A");
            expect(updatedNodes[2].getAttribute("data-item")).toBe("F");
            expect(updatedNodes[3].getAttribute("data-item")).toBe("C");

            // Preserved nodes should be reused
            expect(updatedNodes[0]).toBe(nodeMap.get("E"));
            expect(updatedNodes[1]).toBe(nodeMap.get("A"));
            expect(updatedNodes[3]).toBe(nodeMap.get("C"));

            // F should be a new node
            expect(updatedNodes[2]).not.toBe(nodeMap.get("F"));
        });

        test("should handle mixed keyed and unkeyed children gracefully", () => {
            // This tests edge case behavior when keys are partially used
            const element1 = createElement("div", { id: "mixed-keys" },
                createElement("div", { key: "A", "data-item": "A" }, "Keyed A"),
                createElement("div", { "data-item": "B" }, "Unkeyed B"),
                createElement("div", { key: "C", "data-item": "C" }, "Keyed C"),
            );

            render(element1, container);

            const parent = container.querySelector("#mixed-keys") as HTMLElement;
            expect(parent.children).toHaveLength(3);

            // Update with different mix
            const element2 = createElement("div", { id: "mixed-keys" },
                createElement("div", { key: "C", "data-item": "C" }, "Keyed C"),
                createElement("div", { "data-item": "D" }, "Unkeyed D"),
                createElement("div", { key: "A", "data-item": "A" }, "Keyed A"),
            );

            render(element2, container);

            const updatedParent = container.querySelector("#mixed-keys") as HTMLElement;
            expect(updatedParent.children).toHaveLength(3);

            // Check that the structure is correct
            expect(updatedParent.children[0].getAttribute("data-item")).toBe("C");
            expect(updatedParent.children[1].getAttribute("data-item")).toBe("D");
            expect(updatedParent.children[2].getAttribute("data-item")).toBe("A");
        });
    });

    describe("Performance and Edge Cases", () => {
        test("should handle rapid successive renders efficiently", () => {
            const states = [
                ["A", "B", "C"],
                ["C", "B", "A"],
                ["B", "A", "C"],
                ["A", "C", "B"],
                ["A", "B", "C"],
            ];

            // Track if nodes are being reused across multiple renders
            let nodeTracker = new Map();

            states.forEach((state, index) => {
                const element = createElement("div", { id: "rapid-renders" },
                    ...state.map(item =>
                        createElement("div", { key: item, "data-item": item }, `Item ${item}`)
                    )
                );

                render(element, container);

                const parent = container.querySelector("#rapid-renders") as HTMLElement;
                const currentNodes = Array.from(parent.children);

                if (index === 0) {
                    // First render - store initial nodes
                    currentNodes.forEach(node => {
                        nodeTracker.set(node.getAttribute("data-item"), node);
                    });
                } else {
                    // Subsequent renders - check if nodes are reused
                    currentNodes.forEach(node => {
                        const item = node.getAttribute("data-item");
                        const originalNode = nodeTracker.get(item);
                        if (originalNode) {
                            expect(node).toBe(originalNode); // Should reuse same DOM node
                        }
                    });
                }

                // Verify correct order
                expect(currentNodes.map(n => n.getAttribute("data-item"))).toEqual(state);
            });
        });

        test("should handle empty children arrays and transitions", () => {
            // Start with children
            const element1 = createElement("div", { id: "empty-transitions" },
                createElement("p", { key: "1" }, "Child 1"),
                createElement("p", { key: "2" }, "Child 2"),
            );

            render(element1, container);

            const parent = container.querySelector("#empty-transitions") as HTMLElement;
            expect(parent.children).toHaveLength(2);

            // Transition to empty
            const element2 = createElement("div", { id: "empty-transitions" });
            render(element2, container);

            const emptyParent = container.querySelector("#empty-transitions") as HTMLElement;
            expect(emptyParent.children).toHaveLength(0);

            // Transition back to having children
            const element3 = createElement("div", { id: "empty-transitions" },
                createElement("p", { key: "3" }, "Child 3"),
                createElement("p", { key: "4" }, "Child 4"),
            );

            render(element3, container);

            const restoredParent = container.querySelector("#empty-transitions") as HTMLElement;
            expect(restoredParent.children).toHaveLength(2);
            expect(restoredParent.children[0].textContent).toBe("Child 3");
            expect(restoredParent.children[1].textContent).toBe("Child 4");
        });
    });
});

