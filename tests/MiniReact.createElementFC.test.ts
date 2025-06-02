import { expect, test, describe } from "bun:test";
import { createElement } from "../src/MiniReact";
import type {
    FunctionalComponent,
    MiniReactElement,
    InternalTextElement,
} from "../src/types";
import { TEXT_ELEMENT } from "../src/types";

describe("MiniReact.createElement with Functional Components", () => {
    const MyComponent: FunctionalComponent = (props) =>
        createElement("div", props, "Component Content");
    const MySimpleComponent: FunctionalComponent = () =>
        createElement("span", null, "Simple");

    // --- Basic Functional Component Creation ---

    test("should create an element with a function type and props", () => {
        const props = { id: "component-id", "data-value": 123 };
        const element = createElement(MyComponent, props);

        expect(typeof element.type).toBe("function");
        expect(element.type).toBe(MyComponent);
        expect(element.props.id).toBe("component-id");
        expect(element.props["data-value"]).toBe(123);
        expect(element.props.children).toEqual([]); // No children passed directly here
    });

    test("should pass children to a functional component element", () => {
        const childElement = createElement("p", null, "Child paragraph");
        const element = createElement(
            MyComponent,
            { id: "parent" },
            "Text Child",
            childElement,
        );

        expect(typeof element.type).toBe("function");
        expect(element.props.id).toBe("parent");
        // createElement should wrap primitives for children array
        expect(element.props.children.length).toBe(2);
        const firstChild = element.props.children[0] as InternalTextElement;
        expect(firstChild.type).toBe(TEXT_ELEMENT);
        expect(firstChild.props.nodeValue).toBe("Text Child");
        expect(element.props.children[1]).toBe(childElement);
    });

    test("should handle functional components with no props", () => {
        const element = createElement(MySimpleComponent, null);
        expect(typeof element.type).toBe("function");
        expect(element.type).toBe(MySimpleComponent);
        expect(Object.keys(element.props).sort()).toEqual(["children"].sort()); // Only children prop
        expect(element.props.children).toEqual([]);
    });

    // --- Edge Cases ---

    test("should handle functional component creation with null props", () => {
        const element = createElement(MyComponent, null);

        expect(typeof element.type).toBe("function");
        expect(element.type).toBe(MyComponent);
        expect(element.props.children).toEqual([]);

        // Should only have children property when props is null
        const propKeys = Object.keys(element.props);
        expect(propKeys).toEqual(["children"]);
    });

    test("should handle functional component creation with undefined props", () => {
        const element = createElement(MyComponent, undefined as unknown as Record<string, unknown> | null);

        expect(typeof element.type).toBe("function");
        expect(element.type).toBe(MyComponent);
        expect(element.props.children).toEqual([]);

        // Should only have children property when props is undefined
        const propKeys = Object.keys(element.props);
        expect(propKeys).toEqual(["children"]);
    });

    test("should handle functional component with empty props object", () => {
        const element = createElement(MyComponent, {});

        expect(typeof element.type).toBe("function");
        expect(element.props.children).toEqual([]);

        // Should only have children property when props is empty object
        const propKeys = Object.keys(element.props);
        expect(propKeys).toEqual(["children"]);
    });

    test("should handle functional component with complex nested props", () => {
        const complexProps = {
            id: "complex-id",
            nested: {
                deep: {
                    value: "deep-value",
                    array: [1, 2, 3],
                },
            },
            callback: () => "callback-result",
            nullValue: null,
            undefinedValue: undefined,
            booleanValue: true,
            numberValue: 42,
        };

        const element = createElement(MyComponent, complexProps);

        expect(typeof element.type).toBe("function");
        expect(element.props.id).toBe("complex-id");
        expect(element.props.nested).toEqual(complexProps.nested);
        expect(element.props.callback).toBe(complexProps.callback);
        expect(element.props.nullValue).toBe(null);
        expect(element.props.undefinedValue).toBe(undefined);
        expect(element.props.booleanValue).toBe(true);
        expect(element.props.numberValue).toBe(42);
        expect(element.props.children).toEqual([]);
    });

    test("should handle functional component with special character props", () => {
        const specialProps = {
            "data-testid": "special-test",
            "aria-label": "Special label",
            "custom:prop": "custom-value",
            "prop-with-dashes": "dash-value",
            prop_with_underscores: "underscore-value",
            "prop.with.dots": "dot-value",
        };

        const element = createElement(MyComponent, specialProps);

        expect(element.props["data-testid"]).toBe("special-test");
        expect(element.props["aria-label"]).toBe("Special label");
        expect(element.props["custom:prop"]).toBe("custom-value");
        expect(element.props["prop-with-dashes"]).toBe("dash-value");
        expect(element.props.prop_with_underscores).toBe("underscore-value");
        expect(element.props["prop.with.dots"]).toBe("dot-value");
    });

    test("should handle functional component with mixed children types", () => {
        const childElement = createElement("span", null, "Span child");
        const element = createElement(
            MyComponent,
            { id: "mixed-parent" },
            "String child",
            42, // Number child
            childElement,
            // Note: null and undefined children are handled differently in actual usage
        );

        expect(element.props.children.length).toBe(3);

        // Check string child
        const stringChild = element.props.children[0] as InternalTextElement;
        expect(stringChild.type).toBe(TEXT_ELEMENT);
        expect(stringChild.props.nodeValue).toBe("String child");

        // Check number child
        const numberChild = element.props.children[1] as InternalTextElement;
        expect(numberChild.type).toBe(TEXT_ELEMENT);
        expect(numberChild.props.nodeValue).toBe(42);

        // Check element child
        expect(element.props.children[2]).toBe(childElement);
    });

    test("should handle functional component with deeply nested children", () => {
        const deepChild = createElement("em", null, "Deep text");
        const nestedChild = createElement("strong", null, deepChild);
        const parentChild = createElement(
            "p",
            null,
            "Paragraph with ",
            nestedChild,
        );

        const element = createElement(MyComponent, null, parentChild);

        expect(element.props.children.length).toBe(1);
        expect(element.props.children[0]).toBe(parentChild);

        // Verify the nested structure is preserved
        const pElement = element.props.children[0] as MiniReactElement;
        expect(pElement.type).toBe("p");
        expect(pElement.props.children.length).toBe(2);

        const strongElement = pElement.props.children[1] as MiniReactElement;
        expect(strongElement.type).toBe("strong");
        expect(strongElement.props.children.length).toBe(1);
        expect(strongElement.props.children[0]).toBe(deepChild);
    });

    test("should handle functional component with large number of children", () => {
        const children = [];
        for (let i = 0; i < 100; i++) {
            children.push(`Child ${i}`);
        }

        const element = createElement(MyComponent, null, ...children);

        expect(element.props.children.length).toBe(100);

        // Check first child
        const firstChild = element.props.children[0] as InternalTextElement;
        expect(firstChild.type).toBe(TEXT_ELEMENT);
        expect(firstChild.props.nodeValue).toBe("Child 0");

        // Check last child
        const lastChild = element.props.children[99] as InternalTextElement;
        expect(lastChild.type).toBe(TEXT_ELEMENT);
        expect(lastChild.props.nodeValue).toBe("Child 99");
    });

    // --- Complex Behavior ---

    test("should handle functional component with props that override built-in properties", () => {
        const propsWithBuiltins = {
            type: "custom-type", // This shouldn't affect the actual component type
            props: "custom-props", // This is just a regular prop
            children: "custom-children", // This will be overridden by actual children
            customToString: "custom-toString", // Renamed to avoid conflict
            customValueOf: "custom-valueOf", // Renamed to avoid conflict
        };

        const element = createElement(
            MyComponent,
            propsWithBuiltins,
            "Real child",
        );

        // The actual type should still be the functional component
        expect(typeof element.type).toBe("function");
        expect(element.type).toBe(MyComponent);

        // Custom props should be preserved
        expect(element.props.type).toBe("custom-type");
        expect(element.props.props).toBe("custom-props");
        expect(element.props.customToString).toBe("custom-toString");
        expect(element.props.customValueOf).toBe("custom-valueOf");

        // But actual children should override the "children" prop
        expect(element.props.children.length).toBe(1);
        const child = element.props.children[0] as InternalTextElement;
        expect(child.props.nodeValue).toBe("Real child");
    });

    test("should handle functional component with array and object props", () => {
        const arrayProp = [1, "two", { three: 3 }, [4, 5]];
        const objectProp = {
            nested: { value: "nested" },
            array: [1, 2, 3],
            fn: () => "function",
        };

        const element = createElement(MyComponent, {
            arrayProp,
            objectProp,
            id: "array-object-test",
        });

        // Cast to access the specific props we know exist
        const typedProps = element.props as typeof element.props & {
            arrayProp: typeof arrayProp;
            objectProp: typeof objectProp;
        };

        expect(typedProps.arrayProp).toBe(arrayProp);
        expect(typedProps.arrayProp[0]).toBe(1);
        expect(typedProps.arrayProp[1]).toBe("two");
        expect(typedProps.arrayProp[2]).toEqual({ three: 3 });
        expect(typedProps.arrayProp[3]).toEqual([4, 5]);

        expect(typedProps.objectProp).toBe(objectProp);
        expect(typedProps.objectProp.nested.value).toBe("nested");
        expect(typedProps.objectProp.array).toEqual([1, 2, 3]);
        expect(typeof typedProps.objectProp.fn).toBe("function");
    });

    test("should preserve functional component reference integrity", () => {
        const ComponentA: FunctionalComponent = () =>
            createElement("div", null, "A");
        const ComponentB: FunctionalComponent = () =>
            createElement("div", null, "B");

        const elementA1 = createElement(ComponentA, { id: "a1" });
        const elementA2 = createElement(ComponentA, { id: "a2" });
        const elementB = createElement(ComponentB, { id: "b" });

        // Same component should have same reference
        expect(elementA1.type).toBe(elementA2.type);
        expect(elementA1.type).toBe(ComponentA);
        expect(elementA2.type).toBe(ComponentA);

        // Different components should have different references
        expect(elementA1.type).not.toBe(elementB.type);
        expect(elementB.type).toBe(ComponentB);
    });

    test("should handle functional component with function props", () => {
        const clickHandler = () => "clicked";
        const asyncHandler = async () => "async result";
        const generatorFn = function* () {
            yield 1;
            yield 2;
        };

        const element = createElement(MyComponent, {
            onClick: clickHandler,
            onAsync: asyncHandler,
            generator: generatorFn,
            arrowFn: (x: number) => x * 2,
            namedFn: function namedFunction() {
                return "named";
            },
        });

        // Cast to access the specific props we know exist
        const typedProps = element.props as typeof element.props & {
            onClick: typeof clickHandler;
            onAsync: typeof asyncHandler;
            generator: typeof generatorFn;
            arrowFn: (x: number) => number;
            namedFn: () => string;
        };

        expect(typeof typedProps.onClick).toBe("function");
        expect(typedProps.onClick).toBe(clickHandler);
        expect(typedProps.onClick()).toBe("clicked");

        expect(typeof typedProps.onAsync).toBe("function");
        expect(typedProps.onAsync).toBe(asyncHandler);

        expect(typeof typedProps.generator).toBe("function");
        expect(typedProps.generator).toBe(generatorFn);

        expect(typeof typedProps.arrowFn).toBe("function");
        expect(typedProps.arrowFn(5)).toBe(10);

        expect(typeof typedProps.namedFn).toBe("function");
        expect(typedProps.namedFn()).toBe("named");
    });

    test("should handle functional component with symbol props", () => {
        const sym1 = Symbol("test-symbol");
        const sym2 = Symbol.for("global-symbol");

        const element = createElement(MyComponent, {
            [sym1]: "symbol-value-1",
            [sym2]: "symbol-value-2",
            regularProp: "regular-value",
        } as Record<string | symbol, unknown>);

        // Cast to access symbol properties
        const propsWithSymbols = element.props as Record<
            string | symbol,
            unknown
        >;
        expect(propsWithSymbols[sym1]).toBe("symbol-value-1");
        expect(propsWithSymbols[sym2]).toBe("symbol-value-2");
        expect(
            (element.props as unknown as { regularProp: string }).regularProp,
        ).toBe("regular-value");
    });

    test("should handle functional component creation with no arguments except type", () => {
        const MinimalComponent: FunctionalComponent = () =>
            createElement("div", null);

        const element = createElement(MinimalComponent, null);

        expect(typeof element.type).toBe("function");
        expect(element.type).toBe(MinimalComponent);
        expect(element.props.children).toEqual([]);

        // Should only have children property
        const propKeys = Object.keys(element.props);
        expect(propKeys).toEqual(["children"]);
    });

    test("should handle functional component with extremely nested props", () => {
        const deeplyNested = {
            level1: {
                level2: {
                    level3: {
                        level4: {
                            level5: {
                                value: "deep-value",
                                array: [{ nested: "in-array" }],
                            },
                        },
                    },
                },
            },
        };

        const element = createElement(MyComponent, { deep: deeplyNested });

        // Cast to access the deep prop
        const typedProps = element.props as typeof element.props & {
            deep: typeof deeplyNested;
        };

        expect(typedProps.deep.level1.level2.level3.level4.level5.value).toBe(
            "deep-value",
        );
        expect(
            typedProps.deep.level1.level2.level3.level4.level5.array[0].nested,
        ).toBe("in-array");
    });
});
