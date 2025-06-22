import { beforeEach, describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import {
    Fragment,
    jsx,
    jsxDEV,
    jsxs,
    render,
    useState,
} from "../src/MiniReact";
import type { FunctionalComponent, MiniReactElement } from "../src/types";

let window: Window;
let document: Document;
let container: HTMLElement;

beforeEach(() => {
    window = new Window();
    document = window.document as unknown as Document;
    global.document = document;
    global.window = window as unknown as Window & typeof globalThis;

    container = document.createElement("div");
    document.body.appendChild(container);
});

describe("JSX Runtime Functions", () => {
    test("jsx() creates elements correctly", () => {
        const element = jsx("div", { id: "test" }) as MiniReactElement;

        expect(element.type).toBe("div");
        expect((element.props as Record<string, unknown>).id).toBe("test");
        expect(element.props.children).toEqual([]);
    });

    test("jsx() handles children prop", () => {
        const child = jsx("span", null);
        const element = jsx("div", { children: child });

        expect(element.props.children).toEqual([child]);
    });

    test("jsx() handles array of children", () => {
        const child1 = jsx("span", null);
        const child2 = jsx("p", null);
        const element = jsx("div", { children: [child1, child2] });

        expect(element.props.children).toEqual([child1, child2]);
    });

    test("jsx() handles key prop", () => {
        const element = jsx("div", { id: "test" }, "my-key") as MiniReactElement;

        expect((element.props as Record<string, unknown>).key).toBe("my-key");
        expect((element.props as Record<string, unknown>).id).toBe("test");
    });

    test("jsxs() works identically to jsx()", () => {
        const elementJsx = jsx("div", { id: "test" });
        const elementJsxs = jsxs("div", { id: "test" });

        expect(elementJsx).toEqual(elementJsxs);
    });

    test("jsxDEV() creates elements with debug info", () => {
        const source = { fileName: "test.tsx", lineNumber: 42, columnNumber: 10 };
        const element = jsx("div", { id: "test" }, "key") as MiniReactElement;
        const elementWithSource = jsxDEV("div", { id: "test" }, "key", false, source);

        expect(element.type).toBe("div");
        expect((element.props as Record<string, unknown>).id).toBe("test");
        expect((element.props as Record<string, unknown>).key).toBe("key");

        // Test that jsxDEV creates similar structure
        expect(elementWithSource.type).toBe("div");
        expect((elementWithSource as unknown as Record<string, unknown>).__source).toEqual(source);
    });

    test("jsx() handles null props", () => {
        const element = jsx("div", null);

        expect(element.type).toBe("div");
        expect(element.props.children).toEqual([]);
    });

    test("jsx() handles text children in props", () => {
        const element = jsx("div", { children: "Hello World" });

        expect(element.props.children).toEqual([{
            type: "TEXT_ELEMENT",
            props: {
                nodeValue: "Hello World",
                children: [],
            },
        }]);
    });

    test("jsx() handles number children in props", () => {
        const element = jsx("div", { children: 42 });

        expect(element.props.children).toEqual([{
            type: "TEXT_ELEMENT",
            props: {
                nodeValue: 42,
                children: [],
            },
        }]);
    });
});

describe("JSX Fragment Support", () => {
    test("Fragment renders multiple children without wrapper", () => {
        const fragmentElement = jsx(Fragment, {
            children: [
                jsx("span", { children: "Hello" }),
                jsx("span", { children: "World" }),
            ],
        });

        render(fragmentElement, container);

        expect(container.children.length).toBe(2);
        expect(container.children[0].tagName).toBe("SPAN");
        expect(container.children[0].textContent).toBe("Hello");
        expect(container.children[1].tagName).toBe("SPAN");
        expect(container.children[1].textContent).toBe("World");
    });

    test("Fragment with single child", () => {
        const fragmentElement = jsx(Fragment, {
            children: jsx("div", { children: "Single child" }),
        });

        render(fragmentElement, container);

        expect(container.children.length).toBe(1);
        expect(container.children[0].tagName).toBe("DIV");
        expect(container.children[0].textContent).toBe("Single child");
    });

    test("Fragment with no children", () => {
        const fragmentElement = jsx(Fragment, { children: [] });

        render(fragmentElement, container);

        expect(container.children.length).toBe(0);
        expect(container.textContent).toBe("");
    });

    test("Fragment with mixed content", () => {
        const fragmentElement = jsx(Fragment, {
            children: [
                "Text node",
                jsx("span", { children: "Element" }),
                42,
            ],
        });

        render(fragmentElement, container);

        expect(container.childNodes.length).toBe(3);
        expect(container.childNodes[0].textContent).toBe("Text node");
        expect(container.childNodes[1].textContent).toBe("Element");
        expect(container.childNodes[2].textContent).toBe("42");
    });
});

describe("JSX with Functional Components", () => {
    test("jsx() with functional components", () => {
        const Greeting: FunctionalComponent<{ name: string }> = ({ name }) => {
            return jsx("h1", { children: `Hello, ${name}!` });
        };

        const element = jsx(Greeting, { name: "JSX" });

        render(element, container);

        expect(container.children.length).toBe(1);
        expect(container.children[0].tagName).toBe("H1");
        expect(container.children[0].textContent).toBe("Hello, JSX!");
    });

    test("jsx() with component children", () => {
        const Button: FunctionalComponent<{ children?: unknown }> = ({ children }) => {
            return jsx("button", { children });
        };

        const App = () => jsx(Button, { children: "Click me" });

        render(jsx(App, null), container);

        expect(container.children.length).toBe(1);
        expect(container.children[0].tagName).toBe("BUTTON");
        expect(container.children[0].textContent).toBe("Click me");
    });

    test("jsx() with nested components", () => {
        const Card: FunctionalComponent<{ title: string; children?: unknown }> = ({
            title,
            children
        }) => {
            return jsx("div", {
                className: "card",
                children: [
                    jsx("h2", { children: title }),
                    jsx("div", { className: "content", children }),
                ],
            });
        };

        const Content = () => jsx("p", { children: "Card content" });

        const app = jsx(Card, {
            title: "My Card",
            children: jsx(Content, null),
        });

        render(app, container);

        const card = container.children[0] as HTMLElement;
        expect(card.className).toBe("card");
        expect(card.children.length).toBe(2);
        expect(card.children[0].tagName).toBe("H2");
        expect(card.children[0].textContent).toBe("My Card");
        expect(card.children[1].className).toBe("content");
        expect(card.children[1].children[0].tagName).toBe("P");
        expect(card.children[1].children[0].textContent).toBe("Card content");
    });
});

describe("JSX with Hooks", () => {
    test("jsx() with useState hook", () => {
        const Counter = () => {
            const [count, setCount] = useState(0);

            return jsx("div", {
                children: [
                    jsx("span", { children: `Count: ${count}` }),
                    jsx("button", {
                        onClick: () => setCount(count + 1),
                        children: "Increment",
                    }),
                ],
            });
        };

        render(jsx(Counter, null), container);

        const span = container.querySelector("span");
        const button = container.querySelector("button");

        expect(span?.textContent).toBe("Count: 0");

        // Simulate click
        button?.click();

        expect(span?.textContent).toBe("Count: 1");
    });

    test("jsx() with multiple state updates", () => {
        const MultiState = () => {
            const [name, setName] = useState("Anonymous");
            const [age, setAge] = useState(0);

            return jsx("div", {
                children: [
                    jsx("p", { children: `Name: ${name}` }),
                    jsx("p", { children: `Age: ${age}` }),
                    jsx("button", {
                        onClick: () => setName("John"),
                        children: "Set Name",
                    }),
                    jsx("button", {
                        onClick: () => setAge(25),
                        children: "Set Age",
                    }),
                ],
            });
        };

        render(jsx(MultiState, null), container);

        const nameP = container.children[0].children[0] as HTMLElement;
        const ageP = container.children[0].children[1] as HTMLElement;
        const nameButton = container.children[0].children[2] as HTMLElement;
        const ageButton = container.children[0].children[3] as HTMLElement;

        expect(nameP.textContent).toBe("Name: Anonymous");
        expect(ageP.textContent).toBe("Age: 0");

        nameButton.click();
        expect(nameP.textContent).toBe("Name: John");

        ageButton.click();
        expect(ageP.textContent).toBe("Age: 25");
    });
});

describe("JSX Props Handling", () => {
    test("jsx() handles boolean props", () => {
        const element = jsx("input", { type: "checkbox", checked: true, disabled: false });

        render(element, container);

        const input = container.children[0] as HTMLInputElement;
        expect(input.type).toBe("checkbox");
        expect(input.checked).toBe(true);
        expect(input.disabled).toBe(false);
    });

    test("jsx() handles event handlers", () => {
        let clicked = false;
        const handleClick = () => { clicked = true; };

        const element = jsx("button", {
            onClick: handleClick,
            children: "Click me"
        });

        render(element, container);

        const button = container.children[0] as HTMLElement;
        button.click();

        expect(clicked).toBe(true);
    });

    test("jsx() handles className prop", () => {
        const element = jsx("div", { className: "my-class" });

        render(element, container);

        const div = container.children[0] as HTMLElement;
        expect(div.className).toBe("my-class");
    });

    test("jsx() handles style prop as string", () => {
        const element = jsx("div", { style: "color: red; background: blue;" });

        render(element, container);

        const div = container.children[0] as HTMLElement;
        expect(div.getAttribute("style")).toBe("color: red; background: blue;");
    });
});

describe("JSX Error Handling", () => {
    test("jsx() handles null/undefined children gracefully", () => {
        const element = jsx("div", { children: [null, undefined, "text"] });

        render(element, container);

        expect(container.children.length).toBe(1);
        expect(container.children[0].textContent).toBe("text");
    });

    test("jsx() handles empty children array", () => {
        const element = jsx("div", { children: [] });

        render(element, container);

        expect(container.children.length).toBe(1);
        expect(container.children[0].children.length).toBe(0);
    });

    test("jsx() handles component returning null", () => {
        const NullComponent = () => null;
        const element = jsx(NullComponent, null);

        render(element, container);

        expect(container.children.length).toBe(0);
        expect(container.textContent).toBe("");
    });
});

describe("JSX Performance and Edge Cases", () => {
    test("jsx() handles large number of children", () => {
        const children = Array.from({ length: 100 }, (_, i) =>
            jsx("span", { key: i, children: `Item ${i}` })
        );

        const element = jsx("div", { children });

        render(element, container);

        expect(container.children.length).toBe(1);
        expect(container.children[0].children.length).toBe(100);
        expect(container.children[0].children[0].textContent).toBe("Item 0");
        expect(container.children[0].children[99].textContent).toBe("Item 99");
    });

    test("jsx() maintains referential equality for same inputs", () => {
        const props = { id: "test" };
        const element1 = jsx("div", props);
        const element2 = jsx("div", props);

        // Elements should have the same structure but be different objects
        expect(element1).not.toBe(element2);
        expect(element1.type).toBe(element2.type);
        expect((element1.props as Record<string, unknown>).id).toBe((element2.props as Record<string, unknown>).id);
    });

    test("jsxDEV() handles all parameters correctly", () => {
        const source = { fileName: "test.tsx", lineNumber: 1, columnNumber: 1 };
        const element = jsxDEV("div", { id: "test" }, "key", true, source, {});

        expect(element.type).toBe("div");
        expect((element.props as Record<string, unknown>).id).toBe("test");
        expect((element.props as Record<string, unknown>).key).toBe("key");
        expect((element as unknown as Record<string, unknown>).__source).toEqual(source);
    });
}); 