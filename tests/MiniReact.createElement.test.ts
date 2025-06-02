import { expect, test, describe } from "bun:test";
import { createElement, TEXT_ELEMENT } from "../src/MiniReact";

describe("MiniReact.createElement", () => {
    test("should create an element with type and props", () => {
        const el = createElement("div", { id: "foo" });
        expect(el.type).toBe("div");
        // When no children are passed, props.children should be an empty array
        expect(el.props).toEqual({ id: "foo", children: [] });
    });

    test("should correctly place and wrap primitive children in props", () => {
        const spanChild = createElement("span", null, "World");
        const el = createElement("div", null, "Hello", spanChild, 123);

        expect(el.props.children).toEqual([
            {
                type: TEXT_ELEMENT,
                props: { nodeValue: "Hello", children: [] },
            },
            {
                type: "span",
                props: {
                    children: [
                        {
                            type: TEXT_ELEMENT,
                            props: { nodeValue: "World", children: [] },
                        },
                    ],
                },
            },
            {
                type: TEXT_ELEMENT,
                props: { nodeValue: 123, children: [] },
            },
        ]);
    });

    test("should handle null props gracefully", () => {
        const el = createElement("p", null, "Just text");
        expect(el.type).toBe("p");
        expect(el.props.children).toEqual([
            {
                type: TEXT_ELEMENT,
                props: { nodeValue: "Just text", children: [] },
            },
        ]);
        // Check that other props are not present if null was passed for configProps
        // (excluding 'children' which is always present)
        const propKeys = Object.keys(el.props).filter((k) => k !== "children");
        expect(propKeys.length).toBe(0);
    });
});

