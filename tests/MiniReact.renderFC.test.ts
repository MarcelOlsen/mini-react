import { expect, test, describe, beforeEach, spyOn } from "bun:test";
import { createElement, render } from "../src/MiniReact";
import type { FunctionalComponent, MiniReactElement } from "../src/types";

describe("MiniReact.render with Functional Components", () => {
    let container: HTMLElement;
    const ROOT_ID = "test-root-fc";

    beforeEach(() => {
        document.body.innerHTML = `<div id="${ROOT_ID}"></div>`;
        const foundContainer = document.getElementById(ROOT_ID);
        if (!foundContainer)
            throw new Error(
                `Test setup critical failure: #${ROOT_ID} not found.`,
            );
        container = foundContainer;
    });

    // --- Basic Functional Component Rendering ---

    test("should render a simple functional component returning a host element", () => {
        // This component takes no specific props other than potentially children (which it doesn't use here)
        const MyComponent: FunctionalComponent = () =>
            createElement("div", { id: "inner-div" }, "Hello from FC");

        const element = createElement(MyComponent, null); // Pass null for props
        render(element, container);

        const renderedDiv = container.querySelector("#inner-div");
        expect(renderedDiv).not.toBeNull();
        if (renderedDiv instanceof HTMLElement) {
            expect(renderedDiv.tagName).toBe("DIV");
            expect(renderedDiv.textContent).toBe("Hello from FC");
        }
    });

    test("should pass props to a functional component", () => {
        // This component has specific props: { name: string }
        const Greeting: FunctionalComponent = (props) =>
            createElement(
                "p",
                null,
                `Hello, ${(props as { name: string }).name}!`,
            );

        const element = createElement(Greeting, { name: "Alice" });
        render(element, container);

        const p = container.querySelector("p");
        expect(p).not.toBeNull();
        if (p) {
            expect(p.textContent).toBe("Hello, Alice!");
        }
    });

    test("should pass children to a functional component", () => {
        // This component takes no specific props other than children
        const Layout: FunctionalComponent = (props) =>
            createElement(
                "div",
                { className: "layout" },
                ...(props.children || []),
            );

        const element = createElement(
            Layout,
            null, // No specific props for Layout itself
            createElement("h1", null, "Title"),
            createElement("p", null, "Content"),
        );
        render(element, container);

        const layoutDiv = container.querySelector(".layout");
        expect(layoutDiv).not.toBeNull();
        expect(layoutDiv?.children.length).toBe(2);
        expect(layoutDiv?.querySelector("h1")?.textContent).toBe("Title");
        expect(layoutDiv?.querySelector("p")?.textContent).toBe("Content");
    });

    test("functional component should be called with its props object", () => {
        // Define props type for clarity if needed, or rely on inference
        type MySpyProps = { text: string; id: string };
        const mockFn = (
            props: Record<string, unknown> & { children?: MiniReactElement[] },
        ) => createElement("div", null, (props as MySpyProps).text);
        const spiedComponent = spyOn({ MyComponent: mockFn }, "MyComponent");

        const propsToPass: MySpyProps = { text: "Spy Test", id: "spy-id" };
        const element = createElement(
            spiedComponent as FunctionalComponent,
            propsToPass,
        );
        render(element, container);

        expect(spiedComponent).toHaveBeenCalledTimes(1);
        const expectedProps = { ...propsToPass, children: [] };
        expect(spiedComponent.mock.calls[0][0]).toEqual(expectedProps);

        expect(container.textContent).toBe("Spy Test");
        spiedComponent.mockRestore();
    });

    // --- Edge Cases ---

    test("should handle functional component returning null", () => {
        const NullComponent: FunctionalComponent = () => null;

        const element = createElement(NullComponent, null);
        render(element, container);

        expect(container.innerHTML).toBe("");
        expect(container.childNodes.length).toBe(0);
    });

    test("should handle functional component returning undefined", () => {
        const UndefinedComponent: FunctionalComponent = () =>
            undefined as unknown as null;

        const element = createElement(UndefinedComponent, null);
        render(element, container);

        expect(container.innerHTML).toBe("");
        expect(container.childNodes.length).toBe(0);
    });

    test("should handle functional component with empty props object", () => {
        const EmptyPropsComponent: FunctionalComponent = (props) =>
            createElement(
                "div",
                null,
                `Props keys: ${Object.keys(props).filter((k) => k !== "children").length}`,
            );

        const element = createElement(EmptyPropsComponent, {});
        render(element, container);

        expect(container.textContent).toBe("Props keys: 0");
    });

    test("should handle functional component with complex props", () => {
        type ComplexProps = {
            nested: { deep: { value: string } };
            array: number[];
            boolean: boolean;
            nullValue: null;
            undefinedValue: undefined;
        };

        const ComplexComponent: FunctionalComponent = (props) => {
            const typed = props as ComplexProps;
            return createElement(
                "div",
                { id: "complex" },
                typed.nested.deep.value,
                ` Array: [${typed.array.join(",")}]`,
                ` Boolean: ${typed.boolean}`,
                ` Null: ${typed.nullValue}`,
                ` Undefined: ${typed.undefinedValue}`,
            );
        };

        const complexProps: ComplexProps = {
            nested: { deep: { value: "deep-value" } },
            array: [1, 2, 3],
            boolean: true,
            nullValue: null,
            undefinedValue: undefined,
        };

        const element = createElement(ComplexComponent, complexProps);
        render(element, container);

        expect(container.textContent).toBe(
            "deep-value Array: [1,2,3] Boolean: true Null: null Undefined: undefined",
        );
    });

    test("should handle deeply nested functional components", () => {
        const Level3: FunctionalComponent = (props) =>
            createElement(
                "span",
                { className: "level-3" },
                (props as { value: string }).value,
            );

        const Level2: FunctionalComponent = (props) =>
            createElement(
                "div",
                { className: "level-2" },
                createElement(Level3, {
                    value: (props as { value: string }).value,
                }),
            );

        const Level1: FunctionalComponent = (props) =>
            createElement(
                "section",
                { className: "level-1" },
                createElement(Level2, {
                    value: (props as { value: string }).value,
                }),
            );

        const element = createElement(Level1, { value: "nested-deep" });
        render(element, container);

        const level1 = container.querySelector(".level-1");
        const level2 = level1?.querySelector(".level-2");
        const level3 = level2?.querySelector(".level-3");

        expect(level1).not.toBeNull();
        expect(level2).not.toBeNull();
        expect(level3).not.toBeNull();
        expect(level3?.textContent).toBe("nested-deep");
    });

    // --- Complex Behavior ---

    test("should handle conditional rendering in functional components", () => {
        const ConditionalComponent: FunctionalComponent = (props) => {
            const { show, content } = props as {
                show: boolean;
                content: string;
            };
            return show
                ? createElement("div", { className: "visible" }, content)
                : createElement(
                    "div",
                    { className: "hidden" },
                    "Hidden content",
                );
        };

        // Test with show = true
        let element = createElement(ConditionalComponent, {
            show: true,
            content: "Visible content",
        });
        render(element, container);
        expect(container.querySelector(".visible")).not.toBeNull();
        expect(container.textContent).toBe("Visible content");

        // Test with show = false
        element = createElement(ConditionalComponent, {
            show: false,
            content: "Visible content",
        });
        render(element, container);
        expect(container.querySelector(".hidden")).not.toBeNull();
        expect(container.textContent).toBe("Hidden content");
    });

    test("should handle functional component that transforms children", () => {
        const ListWrapper: FunctionalComponent = (props) => {
            const children = props.children || [];
            return createElement(
                "ul",
                { className: "list" },
                ...children.map((child, index) =>
                    createElement("li", { key: index }, child),
                ),
            );
        };

        const element = createElement(
            ListWrapper,
            null,
            "Item 1",
            "Item 2",
            createElement("strong", null, "Item 3"),
        );
        render(element, container);

        const list = container.querySelector(".list");
        expect(list).not.toBeNull();
        expect(list?.tagName).toBe("UL");
        expect(list?.children.length).toBe(3);
        expect(list?.children[0].textContent).toBe("Item 1");
        expect(list?.children[1].textContent).toBe("Item 2");
        expect(list?.children[2].textContent).toBe("Item 3");
        expect(list?.children[2].querySelector("strong")).not.toBeNull();
    });

    test("should handle functional component with mixed children types", () => {
        const MixedContainer: FunctionalComponent = (props) => {
            return createElement(
                "div",
                { className: "mixed" },
                "Text before",
                ...(props.children || []),
                createElement("hr", null),
                "Text after",
                42,
            );
        };

        const element = createElement(
            MixedContainer,
            null,
            createElement("p", null, "Paragraph"),
            // Note: null and undefined children are typically filtered out during createElement
            createElement("span", null, "Span"),
        );

        render(element, container);

        const container_div = container.querySelector(".mixed");
        expect(container_div).not.toBeNull();
        expect(container_div?.querySelector("p")).not.toBeNull();
        expect(container_div?.querySelector("span")).not.toBeNull();
        expect(container_div?.querySelector("hr")).not.toBeNull();
        expect(container_div?.textContent).toContain("Text before");
        expect(container_div?.textContent).toContain("Text after");
        expect(container_div?.textContent).toContain("42");
        expect(container_div?.textContent).toContain("Paragraph");
        expect(container_div?.textContent).toContain("Span");
    });

    test("should handle functional component with special character props", () => {
        const SpecialCharsComponent: FunctionalComponent = (props) => {
            const typed = props as {
                "data-special": string;
                "aria-label": string;
                emoji: string;
                unicode: string;
            };
            return createElement(
                "div",
                {
                    "data-special": typed["data-special"],
                    "aria-label": typed["aria-label"],
                },
                `${typed.emoji} ${typed.unicode}`,
            );
        };

        const element = createElement(SpecialCharsComponent, {
            "data-special": "special-value",
            "aria-label": "Special character test",
            emoji: "🚀",
            unicode: "Test unicode: ñáéíóú",
        });

        render(element, container);

        const div = container.firstChild as HTMLElement;
        expect(div.getAttribute("data-special")).toBe("special-value");
        expect(div.getAttribute("aria-label")).toBe("Special character test");
        expect(div.textContent).toBe("🚀 Test unicode: ñáéíóú");
    });

    test("should handle functional component returning complex nested structure", () => {
        const ComplexStructure: FunctionalComponent = (props) => {
            const { title, items } = props as {
                title: string;
                items: string[];
            };

            return createElement(
                "article",
                { className: "complex" },
                createElement(
                    "header",
                    null,
                    createElement("h1", null, title),
                    createElement(
                        "nav",
                        null,
                        createElement(
                            "ul",
                            null,
                            ...items.map((item, index) =>
                                createElement(
                                    "li",
                                    { key: index },
                                    createElement(
                                        "a",
                                        { href: `#${item.toLowerCase()}` },
                                        item,
                                    ),
                                ),
                            ),
                        ),
                    ),
                ),
                createElement(
                    "main",
                    null,
                    createElement(
                        "section",
                        { id: "content" },
                        createElement("p", null, "Main content goes here"),
                        createElement(
                            "div",
                            { className: "nested" },
                            createElement("span", null, "Nested span"),
                            createElement("em", null, "Emphasized text"),
                        ),
                    ),
                ),
                createElement("footer", null, "Footer content"),
            );
        };

        const element = createElement(ComplexStructure, {
            title: "Complex Page",
            items: ["Home", "About", "Contact"],
        });

        render(element, container);

        const article = container.querySelector("article.complex");
        expect(article).not.toBeNull();

        // Test header structure
        const header = article?.querySelector("header");
        expect(header?.querySelector("h1")?.textContent).toBe("Complex Page");

        // Test navigation
        const nav = header?.querySelector("nav ul");
        expect(nav?.children.length).toBe(3);
        expect(nav?.children[0].querySelector("a")?.textContent).toBe("Home");
        expect(nav?.children[0].querySelector("a")?.getAttribute("href")).toBe(
            "#home",
        );

        // Test main content
        const main = article?.querySelector("main");
        expect(main?.querySelector("#content p")?.textContent).toBe(
            "Main content goes here",
        );
        expect(main?.querySelector(".nested span")?.textContent).toBe(
            "Nested span",
        );
        expect(main?.querySelector(".nested em")?.textContent).toBe(
            "Emphasized text",
        );

        // Test footer
        expect(article?.querySelector("footer")?.textContent).toBe(
            "Footer content",
        );
    });

    test("should handle functional component with large number of props", () => {
        const ManyPropsComponent: FunctionalComponent = (props) => {
            const propCount = Object.keys(props).filter(
                (k) => k !== "children",
            ).length;
            const propValues = Object.entries(props)
                .filter(([key]) => key !== "children")
                .map(([key, value]) => `${key}:${value}`)
                .join(",");

            return createElement(
                "div",
                null,
                `Count: ${propCount}, Values: ${propValues}`,
            );
        };

        const manyProps: Record<string, unknown> = {};
        for (let i = 0; i < 50; i++) {
            manyProps[`prop${i}`] = `value${i}`;
        }

        const element = createElement(ManyPropsComponent, manyProps);
        render(element, container);

        expect(container.textContent).toContain("Count: 50");
        expect(container.textContent).toContain("prop0:value0");
        expect(container.textContent).toContain("prop49:value49");
    });

    test("should handle functional component returning different types based on props", () => {
        const DynamicComponent: FunctionalComponent = (props) => {
            const { type, content } = props as {
                type: "button" | "link" | "text";
                content: string;
            };

            switch (type) {
                case "button":
                    return createElement("button", { type: "button" }, content);
                case "link":
                    return createElement("a", { href: "#" }, content);
                default:
                    return createElement("span", null, content);
            }
        };

        // Test button type
        let element = createElement(DynamicComponent, {
            type: "button",
            content: "Click me",
        });
        render(element, container);
        expect(container.querySelector("button")).not.toBeNull();
        expect(container.querySelector("button")?.textContent).toBe("Click me");

        // Test link type
        element = createElement(DynamicComponent, {
            type: "link",
            content: "Link text",
        });
        render(element, container);
        expect(container.querySelector("a")).not.toBeNull();
        expect(container.querySelector("a")?.textContent).toBe("Link text");

        // Test text type
        element = createElement(DynamicComponent, {
            type: "text",
            content: "Plain text",
        });
        render(element, container);
        expect(container.querySelector("span")).not.toBeNull();
        expect(container.querySelector("span")?.textContent).toBe("Plain text");
    });
});
