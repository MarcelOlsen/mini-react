import { beforeEach, describe, expect, test } from "bun:test";
import { createElement, render, useRef, useState } from "../src/MiniReact";

describe("MiniReact.useRef Hook", () => {
    let container: HTMLElement;
    const ROOT_ID = "test-root";

    beforeEach(() => {
        document.body.innerHTML = `<div id="${ROOT_ID}"></div>`;
        const foundContainer = document.getElementById(ROOT_ID);
        if (!foundContainer) {
            throw new Error(
                `Test setup critical failure: #${ROOT_ID} not found in happy-dom environment.`,
            );
        }
        container = foundContainer;
    });

    test("should initialize ref with initial value", () => {
        let capturedRef: { current: number } | undefined;

        const Component = () => {
            const ref = useRef(42);
            capturedRef = ref;
            return createElement("div", null, String(ref.current));
        };

        render(createElement(Component, null), container);

        expect(capturedRef).toBeDefined();
        expect(capturedRef?.current).toBe(42);
        expect(container.textContent).toBe("42");
    });

    test("should persist ref value across re-renders", async () => {
        let ref: { current: number } | undefined;
        let setState: ((value: number) => void) | undefined;

        const Component = () => {
            const [count, setCount] = useState(0);
            const refValue = useRef(100);
            ref = refValue;
            setState = setCount;

            return createElement("div", null, `count: ${count}, ref: ${refValue.current}`);
        };

        render(createElement(Component, null), container);
        expect(container.textContent).toBe("count: 0, ref: 100");

        // Trigger re-render by updating state
        if (setState) {
            setState(1);
        }

        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(container.textContent).toBe("count: 1, ref: 100");
        expect(ref?.current).toBe(100); // Ref should persist
    });

    test("should allow mutation of ref.current without triggering re-render", async () => {
        let ref: { current: number } | undefined;
        let renderCount = 0;

        const Component = () => {
            renderCount++;
            const refValue = useRef(0);
            ref = refValue;

            return createElement("div", null, String(refValue.current));
        };

        render(createElement(Component, null), container);
        expect(renderCount).toBe(1);
        expect(container.textContent).toBe("0");

        // Mutate ref.current - should NOT trigger re-render
        if (ref) {
            ref.current = 99;
        }

        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(renderCount).toBe(1); // Should still be 1 - no re-render
        expect(ref?.current).toBe(99); // Mutation should persist
        expect(container.textContent).toBe("0"); // DOM should not update
    });

    test("should handle multiple useRef hooks in same component", async () => {
        let ref1: { current: string } | undefined;
        let ref2: { current: number } | undefined;
        let setState: ((value: boolean) => void) | undefined;

        const Component = () => {
            const [toggle, setToggle] = useState(false);
            const stringRef = useRef("hello");
            const numberRef = useRef(42);

            ref1 = stringRef;
            ref2 = numberRef;
            setState = setToggle;

            return createElement("div", null, `${stringRef.current}-${numberRef.current}-${toggle}`);
        };

        render(createElement(Component, null), container);
        expect(container.textContent).toBe("hello-42-false");

        // Mutate refs
        if (ref1 && ref2) {
            ref1.current = "world";
            ref2.current = 100;
        }

        // Trigger re-render
        if (setState) {
            setState(true);
        }

        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(container.textContent).toBe("world-100-true");
        expect(ref1?.current).toBe("world");
        expect(ref2?.current).toBe(100);
    });

    test("should handle complex objects as ref values", async () => {
        interface ComplexObject {
            name: string;
            count: number;
            items: string[];
        }

        let ref: { current: ComplexObject } | undefined;
        let setState: ((value: number) => void) | undefined;

        const Component = () => {
            const [, setRenderTrigger] = useState(0);
            const objectRef = useRef<ComplexObject>({
                name: "test",
                count: 0,
                items: ["a", "b"],
            });

            ref = objectRef;
            setState = setRenderTrigger;

            return createElement(
                "div",
                null,
                `${objectRef.current.name}-${objectRef.current.count}-${objectRef.current.items.length}`
            );
        };

        render(createElement(Component, null), container);
        expect(container.textContent).toBe("test-0-2");

        // Mutate complex object
        if (ref) {
            ref.current.name = "updated";
            ref.current.count = 5;
            ref.current.items.push("c");
        }

        // Trigger re-render
        if (setState) {
            setState(1);
        }

        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(container.textContent).toBe("updated-5-3");
        expect(ref?.current.name).toBe("updated");
        expect(ref?.current.count).toBe(5);
        expect(ref?.current.items).toEqual(["a", "b", "c"]);
    });

    test("should handle null and undefined as ref values", () => {
        let nullRef: { current: null } | undefined;
        let undefinedRef: { current: undefined } | undefined;

        const Component = () => {
            const ref1 = useRef(null);
            const ref2 = useRef(undefined);
            nullRef = ref1;
            undefinedRef = ref2;

            return createElement("div", null, `${ref1.current}-${ref2.current}`);
        };

        render(createElement(Component, null), container);

        expect(nullRef?.current).toBe(null);
        expect(undefinedRef?.current).toBe(undefined);
        expect(container.textContent).toBe("null-undefined");
    });

    test("should simulate DOM element reference pattern", async () => {
        // Simulate a DOM element reference pattern
        let elementRef: { current: HTMLElement | null } | undefined;
        let setState: ((value: boolean) => void) | undefined;

        const Component = () => {
            const [mounted, setMounted] = useState(true);
            const divRef = useRef<HTMLElement | null>(null);
            elementRef = divRef;
            setState = setMounted;

            // Simulate setting the ref to a DOM element
            if (mounted && container.firstChild) {
                divRef.current = container.firstChild as HTMLElement;
            }

            return createElement("div", null, mounted ? "mounted" : "unmounted");
        };

        render(createElement(Component, null), container);
        expect(container.textContent).toBe("mounted");

        // Simulate setting the ref to the actual DOM element
        if (elementRef) {
            elementRef.current = container.firstChild as HTMLElement;
        }

        expect(elementRef?.current).toBe(container.firstChild as HTMLElement);

        // Trigger re-render
        if (setState) {
            setState(false);
        }

        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(container.textContent).toBe("unmounted");
        expect(elementRef?.current).toBe(container.firstChild as HTMLElement); // Ref should persist
    });

    test("should handle function refs", async () => {
        let functionRef: { current: (() => string) | null } | undefined;
        let setState: ((value: number) => void) | undefined;

        const Component = () => {
            const [count, setCount] = useState(0);
            const funcRef = useRef<(() => string) | null>(null);
            functionRef = funcRef;
            setState = setCount;

            // Set a function in the ref
            funcRef.current = () => `Hello from function! Count: ${count}`;

            const result = funcRef.current ? funcRef.current() : "No function";
            return createElement("div", null, result);
        };

        render(createElement(Component, null), container);
        expect(container.textContent).toBe("Hello from function! Count: 0");

        // Trigger re-render
        if (setState) {
            setState(1);
        }

        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(container.textContent).toBe("Hello from function! Count: 1");
        expect(functionRef?.current).toBeDefined();
        expect(typeof functionRef?.current).toBe("function");
    });

    test("should preserve ref identity across re-renders", async () => {
        const refs: { current: number }[] = [];
        let setState: ((value: number) => void) | undefined;

        const Component = () => {
            const [count, setCount] = useState(0);
            const ref = useRef(42);
            refs.push(ref);
            setState = setCount;

            return createElement("div", null, String(count));
        };

        render(createElement(Component, null), container);
        expect(refs.length).toBe(1);

        // Trigger re-render
        if (setState) {
            setState(1);
        }

        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(refs.length).toBe(2);

        // The ref object should be the same instance across re-renders
        expect(refs[0]).toBe(refs[1]);
        expect(refs[0]?.current).toBe(42);
        expect(refs[1]?.current).toBe(42);
    });

    test("should throw error when called outside functional component", () => {
        expect(() => {
            useRef(0);
        }).toThrow("useRef must be called inside a functional component");
    });

    test("should work with nested components", async () => {
        let parentRef: { current: string } | undefined;
        let childRef: { current: number } | undefined;
        let setState: ((value: boolean) => void) | undefined;

        const Child = ({ value }: { value: string }) => {
            const numberRef = useRef(100);
            childRef = numberRef;

            return createElement("span", null, `${value}-${numberRef.current}`);
        };

        const Parent = () => {
            const [toggle, setToggle] = useState(false);
            const stringRef = useRef("parent");
            parentRef = stringRef;
            setState = setToggle;

            return createElement(
                "div",
                null,
                stringRef.current,
                "-",
                createElement(Child, { value: toggle ? "toggled" : "normal" })
            );
        };

        render(createElement(Parent, null), container);
        expect(container.textContent).toBe("parent-normal-100");

        // Mutate parent ref
        if (parentRef) {
            parentRef.current = "updated";
        }

        // Mutate child ref
        if (childRef) {
            childRef.current = 200;
        }

        // Trigger re-render
        if (setState) {
            setState(true);
        }

        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(container.textContent).toBe("updated-toggled-200");
        expect(parentRef?.current).toBe("updated");
        expect(childRef?.current).toBe(200);
    });

    test("should handle concurrent ref updates", async () => {
        let ref: { current: number } | undefined;
        let setState: ((value: number) => void) | undefined;

        const Component = () => {
            const [renderCount, setRenderCount] = useState(0);
            const counterRef = useRef(0);
            ref = counterRef;
            setState = setRenderCount;

            return createElement("div", null, `renders: ${renderCount}, ref: ${counterRef.current}`);
        };

        render(createElement(Component, null), container);
        expect(container.textContent).toBe("renders: 0, ref: 0");

        // Multiple rapid ref mutations
        if (ref) {
            ref.current = 1;
            ref.current = 2;
            ref.current = 3;
        }

        // Trigger re-render after mutations
        if (setState) {
            setState(1);
        }

        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(container.textContent).toBe("renders: 1, ref: 3");
        expect(ref?.current).toBe(3);
    });
}); 