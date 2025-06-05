import { beforeEach, describe, expect, test } from "bun:test";
import { createElement, render, useState } from "../src/MiniReact";

describe("MiniReact.useState Hook", () => {
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

    test("should initialize state with initial value", () => {
        let capturedState: number | undefined;

        const Component = () => {
            const [count] = useState(0);
            capturedState = count;
            return createElement("div", null, String(count));
        };

        render(createElement(Component, null), container);

        expect(capturedState).toBe(0);
        expect(container.textContent).toBe("0");
    });

    test("should initialize state with function", () => {
        let capturedState: number | undefined;

        const Component = () => {
            const [count] = useState(() => 42);
            capturedState = count;
            return createElement("div", null, String(count));
        };

        render(createElement(Component, null), container);

        expect(capturedState).toBe(42);
        expect(container.textContent).toBe("42");
    });

    test("should update state and trigger re-render", async () => {
        let setState: ((value: number) => void) | undefined;

        const Component = () => {
            const [count, setCount] = useState(0);
            setState = setCount;
            return createElement("div", null, String(count));
        };

        render(createElement(Component, null), container);
        expect(container.textContent).toBe("0");

        // Update state
        if (setState) {
            setState(1);
        }

        // Wait for re-render
        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(container.textContent).toBe("1");
    });

    test("should support functional state updates", async () => {
        let setState:
            | ((value: number | ((prev: number) => number)) => void)
            | undefined;

        const Component = () => {
            const [count, setCount] = useState(0);
            setState = setCount;
            return createElement("div", null, String(count));
        };

        render(createElement(Component, null), container);
        expect(container.textContent).toBe("0");

        // Functional update
        if (setState) {
            setState((prev: number) => prev + 1);
        }

        // Wait for re-render
        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(container.textContent).toBe("1");

        // Another functional update
        if (setState) {
            setState((prev: number) => prev * 2);
        }

        // Wait for re-render
        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(container.textContent).toBe("2");
    });

    test("should handle multiple useState hooks in same component", async () => {
        let setCount: ((value: number) => void) | undefined;
        let setName: ((value: string) => void) | undefined;

        const Component = () => {
            const [count, setCountHook] = useState(0);
            const [name, setNameHook] = useState("John");
            setCount = setCountHook;
            setName = setNameHook;

            return createElement("div", null, `${name}: ${count}`);
        };

        render(createElement(Component, null), container);
        expect(container.textContent).toBe("John: 0");

        // Update count
        if (setCount) {
            setCount(5);
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(container.textContent).toBe("John: 5");

        // Update name
        if (setName) {
            setName("Jane");
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(container.textContent).toBe("Jane: 5");
    });

    test("should preserve state across re-renders", async () => {
        let setState: ((value: number) => void) | undefined;
        let triggerRerender: (() => void) | undefined;

        const Component = (props: { trigger?: boolean }) => {
            const [count, setCount] = useState(0);
            const { trigger } = props;
            setState = setCount;

            return createElement("div", null, `count: ${count}, trigger: ${trigger}`);
        };

        const App = () => {
            const [trigger, setTrigger] = useState(false);
            triggerRerender = () => setTrigger((prev: boolean) => !prev);
            return createElement(Component, { trigger });
        };

        render(createElement(App, null), container);
        expect(container.textContent).toBe("count: 0, trigger: false");

        // Update nested component state
        if (setState) {
            setState(10);
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(container.textContent).toBe("count: 10, trigger: false");

        // Trigger parent re-render
        if (triggerRerender) {
            triggerRerender();
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(container.textContent).toBe("count: 10, trigger: true");
    });

    test("should handle state updates with same value (no re-render)", async () => {
        let setState: ((value: number) => void) | undefined;
        let renderCount = 0;

        const Component = () => {
            renderCount++;
            const [count, setCount] = useState(0);
            setState = setCount;
            return createElement("div", null, String(count));
        };

        render(createElement(Component, null), container);
        expect(renderCount).toBe(1);

        // Set same value
        if (setState) {
            setState(0);
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(renderCount).toBe(1); // Should not re-render
    });

    test("should handle complex state objects", async () => {
        interface User {
            name: string;
            age: number;
        }

        let setUser: ((value: User | ((prev: User) => User)) => void) | undefined;

        const Component = () => {
            const [user, setUserHook] = useState<User>({
                name: "John",
                age: 25,
            });
            setUser = setUserHook;
            return createElement(
                "div",
                null,
                `${user.name} is ${user.age} years old`,
            );
        };

        render(createElement(Component, null), container);
        expect(container.textContent).toBe("John is 25 years old");

        // Update entire object
        if (setUser) {
            setUser({ name: "Jane", age: 30 });
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(container.textContent).toBe("Jane is 30 years old");

        // Functional update
        if (setUser) {
            setUser((prev: User) => ({ ...prev, age: prev.age + 1 }));
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(container.textContent).toBe("Jane is 31 years old");
    });

    test("should throw error when useState called outside component", () => {
        expect(() => {
            useState(0);
        }).toThrow("useState can only be called inside a functional component");
    });

    test("should handle multiple components with independent state", async () => {
        let setCount1: ((value: number) => void) | undefined;
        let setCount2: ((value: number) => void) | undefined;

        const Counter = ({ id }: { id: string }) => {
            const [count, setCount] = useState(0);

            if (id === "1") setCount1 = setCount;
            if (id === "2") setCount2 = setCount;

            return createElement("div", { id }, `Counter ${id}: ${count}`);
        };

        const App = () => {
            return createElement(
                "div",
                null,
                createElement(Counter, { id: "1" }),
                createElement(Counter, { id: "2" }),
            );
        };

        render(createElement(App, null), container);
        expect(container.textContent).toBe("Counter 1: 0Counter 2: 0");

        // Update first counter
        if (setCount1) {
            setCount1(10);
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(container.textContent).toBe("Counter 1: 10Counter 2: 0");

        // Update second counter
        if (setCount2) {
            setCount2(20);
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(container.textContent).toBe("Counter 1: 10Counter 2: 20");
    });

    test("should handle hook order consistency", async () => {
        let toggleCondition: (() => void) | undefined;
        let setState: ((value: number) => void) | undefined;

        const Component = () => {
            const [condition, setCondition] = useState(true);

            // This should always be the second hook
            const [count, setCount] = useState(0);

            toggleCondition = () => setCondition((prev: boolean) => !prev);
            setState = setCount;

            return createElement(
                "div",
                null,
                `condition: ${condition}, count: ${count}`,
            );
        };

        render(createElement(Component, null), container);
        expect(container.textContent).toBe("condition: true, count: 0");

        // Update count
        if (setState) {
            setState(5);
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(container.textContent).toBe("condition: true, count: 5");

        // Toggle condition
        if (toggleCondition) {
            toggleCondition();
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(container.textContent).toBe("condition: false, count: 5");
    });
});
