import { beforeEach, describe, expect, test } from "bun:test";
import { Fragment, createElement, render, useState } from "../src/MiniReact";

describe("MiniReact Fragment Tests", () => {
    let container: HTMLElement;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.appendChild(container);
    });

    describe("Basic Fragment Rendering", () => {
        test("should render fragment with multiple children", () => {
            const element = createElement(
                Fragment,
                null,
                createElement("span", null, "First"),
                createElement("span", null, "Second"),
            );

            render(element, container);

            expect(container.innerHTML).toBe(
                "<span>First</span><span>Second</span>",
            );
        });

        test("should render fragment with text children", () => {
            const element = createElement(
                Fragment,
                null,
                "Hello",
                " ",
                "World",
            );

            render(element, container);

            expect(container.innerHTML).toBe("Hello World");
        });

        test("should render empty fragment", () => {
            const element = createElement(Fragment, null);

            render(element, container);

            expect(container.innerHTML).toBe("");
        });

        test("should render fragment with mixed children types", () => {
            const element = createElement(
                Fragment,
                null,
                "Text",
                createElement("span", null, "Element"),
                42,
            );

            render(element, container);

            expect(container.innerHTML).toBe("Text<span>Element</span>42");
        });
    });

    describe("Nested Fragments", () => {
        test("should render nested fragments", () => {
            const element = createElement(
                Fragment,
                null,
                createElement("div", null, "Before"),
                createElement(
                    Fragment,
                    null,
                    createElement("span", null, "Nested1"),
                    createElement("span", null, "Nested2"),
                ),
                createElement("div", null, "After"),
            );

            render(element, container);

            expect(container.innerHTML).toBe(
                "<div>Before</div><span>Nested1</span><span>Nested2</span><div>After</div>",
            );
        });

        test("should render deeply nested fragments", () => {
            const element = createElement(
                Fragment,
                null,
                createElement(
                    Fragment,
                    null,
                    createElement(
                        Fragment,
                        null,
                        createElement("span", null, "Deep"),
                    ),
                ),
            );

            render(element, container);

            expect(container.innerHTML).toBe("<span>Deep</span>");
        });
    });

    describe("Fragment Updates", () => {
        test("should update fragment children", () => {
            function TestComponent({ items }: { items: string[] }) {
                return createElement(
                    Fragment,
                    null,
                    ...items.map((item) =>
                        createElement("div", { key: item }, item),
                    ),
                );
            }

            // Initial render
            render(createElement(TestComponent, null), container);
            expect(container.innerHTML).toBe("<div>A</div><div>B</div>");

            // Update
            render(createElement(TestComponent, null), container);
            expect(container.innerHTML).toBe(
                "<div>A</div><div>B</div><div>C</div>",
            );
        });

        test("should handle fragment to element replacement", () => {
            // Render fragment first
            render(
                createElement(
                    Fragment,
                    null,
                    createElement("span", null, "A"),
                    createElement("span", null, "B"),
                ),
                container,
            );
            expect(container.innerHTML).toBe("<span>A</span><span>B</span>");

            // Replace with single element
            render(createElement("div", null, "Single"), container);
            expect(container.innerHTML).toBe("<div>Single</div>");
        });

        test("should handle element to fragment replacement", () => {
            // Render single element first
            render(createElement("div", null, "Single"), container);
            expect(container.innerHTML).toBe("<div>Single</div>");

            // Replace with fragment
            render(
                createElement(
                    Fragment,
                    null,
                    createElement("span", null, "A"),
                    createElement("span", null, "B"),
                ),
                container,
            );
            expect(container.innerHTML).toBe("<span>A</span><span>B</span>");
        });
    });

    describe("Fragment with State", () => {
        test("should work with useState in parent component", () => {
            function TestComponent() {
                const [count, setCount] = useState(0);

                return createElement(
                    "div",
                    null,
                    createElement(
                        "button",
                        {
                            onClick: () => setCount(count + 1),
                        },
                        "Increment",
                    ),
                    createElement(
                        Fragment,
                        null,
                        createElement("span", null, "Count: "),
                        createElement("span", null, count.toString()),
                    ),
                );
            }

            render(createElement(TestComponent, null), container);

            const button = container.querySelector("button");
            const spans = container.querySelectorAll("span");

            expect(spans[0].textContent).toBe("Count: ");
            expect(spans[1].textContent).toBe("0");

            // Simulate click
            button?.click();

            expect(spans[1].textContent).toBe("1");
        });
    });

    describe("Fragment with Keys", () => {
        test("should handle keyed children in fragments", () => {
            function TestComponent({ reverse }: { reverse: boolean }) {
                const items = reverse ? ["B", "A"] : ["A", "B"];
                return createElement(
                    Fragment,
                    null,
                    ...items.map((item) =>
                        createElement("div", { key: item }, item),
                    ),
                );
            }

            // Initial render
            render(createElement(TestComponent, { reverse: false }), container);
            expect(container.innerHTML).toBe("<div>A</div><div>B</div>");

            // Reverse order
            render(createElement(TestComponent, { reverse: true }), container);
            expect(container.innerHTML).toBe("<div>B</div><div>A</div>");
        });
    });

    describe("Fragment Edge Cases", () => {
        test("should handle fragment with null/undefined children", () => {
            const element = createElement(
                Fragment,
                null,
                createElement("span", null, "Valid"),
                null,
                undefined,
                createElement("span", null, "Also Valid"),
            );

            render(element, container);

            expect(container.innerHTML).toBe(
                "<span>Valid</span><span>Also Valid</span>",
            );
        });

        test("should handle fragment with conditional children", () => {
            function TestComponent({ showSecond }: { showSecond: boolean }) {
                return createElement(
                    Fragment,
                    null,
                    createElement("div", null, "First"),
                    showSecond ? createElement("div", null, "Second") : null,
                );
            }

            // Show both
            render(
                createElement(TestComponent, { showSecond: true }),
                container,
            );
            expect(container.innerHTML).toBe(
                "<div>First</div><div>Second</div>",
            );

            // Hide second
            render(
                createElement(TestComponent, { showSecond: false }),
                container,
            );
            expect(container.innerHTML).toBe("<div>First</div>");
        });

        test("should handle removing all fragment children", () => {
            function TestComponent({ hasChildren }: { hasChildren: boolean }) {
                return createElement(
                    "div",
                    null,
                    createElement("div", null, "Before"),
                    createElement(
                        Fragment,
                        null,
                        ...(hasChildren
                            ? [createElement("span", null, "Child")]
                            : []),
                    ),
                    createElement("div", null, "After"),
                );
            }

            // With children
            render(
                createElement(TestComponent, { hasChildren: true }),
                container,
            );
            expect(container.innerHTML).toBe(
                "<div><div>Before</div><span>Child</span><div>After</div></div>",
            );

            // Without children
            render(
                createElement(TestComponent, { hasChildren: false }),
                container,
            );
            expect(container.innerHTML).toBe(
                "<div><div>Before</div><div>After</div></div>",
            );
        });
    });

    describe("Fragment Performance", () => {
        test("should efficiently update large fragment lists", () => {
            function TestComponent({ count }: { count: number }) {
                const items = Array.from({ length: count }, (_, i) => i);
                return createElement(
                    Fragment,
                    null,
                    ...items.map((i) =>
                        createElement("div", { key: i }, `Item ${i}`),
                    ),
                );
            }

            // Initial render with 100 items
            render(createElement(TestComponent, { count: 100 }), container);
            expect(container.children).toHaveLength(100);

            // Update to 150 items
            render(createElement(TestComponent, { count: 150 }), container);
            expect(container.children).toHaveLength(150);

            // Update to 50 items
            render(createElement(TestComponent, { count: 50 }), container);
            expect(container.children).toHaveLength(50);
        });
    });
});
