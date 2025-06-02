import { expect, test, describe, beforeEach } from "bun:test";
import { createElement, render } from "../src/MiniReact";

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
});

