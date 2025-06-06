import { beforeEach, describe, expect, test, afterEach } from "bun:test";
import { createElement, render, useState } from "../src/MiniReact";
import type { FunctionalComponent, SyntheticEvent } from "../src/MiniReact";

describe("MiniReact.events", () => {
    let container: HTMLElement;

    beforeEach(() => {
        // Create a fresh container for each test
        container = document.createElement("div");
        document.body.appendChild(container);
    });

    afterEach(() => {
        // Clean up the container and any event listeners
        if (container?.parentNode) {
            container.parentNode.removeChild(container);
        }
    });

    describe("Basic Event Handling", () => {
        test("should handle onClick events", () => {
            let clicked = false;
            const handleClick = () => {
                clicked = true;
            };

            const button = createElement(
                "button",
                { onClick: handleClick },
                "Click me",
            );
            render(button, container);

            const buttonElement = container.querySelector("button");
            expect(buttonElement).not.toBeNull();

            // Simulate click
            buttonElement?.click();
            expect(clicked).toBe(true);
        });

        test("should handle multiple event types on same element", () => {
            let clickCount = 0;
            let mouseDownCount = 0;
            let mouseUpCount = 0;

            const element = createElement(
                "div",
                {
                    onClick: () => clickCount++,
                    onMouseDown: () => mouseDownCount++,
                    onMouseUp: () => mouseUpCount++,
                },
                "Interactive div",
            );

            render(element, container);

            const divElement = container.querySelector("div");
            expect(divElement).not.toBeNull();

            // Simulate events
            divElement?.click();
            expect(clickCount).toBe(1);

            const mouseDownEvent = new MouseEvent("mousedown", {
                bubbles: true,
            });
            divElement?.dispatchEvent(mouseDownEvent);
            expect(mouseDownCount).toBe(1);

            const mouseUpEvent = new MouseEvent("mouseup", { bubbles: true });
            divElement?.dispatchEvent(mouseUpEvent);
            expect(mouseUpCount).toBe(1);
        });

        test("should pass synthetic event to handlers", () => {
            let capturedEvent: SyntheticEvent | undefined;

            const handleClick = (event: SyntheticEvent) => {
                capturedEvent = event;
            };

            const button = createElement(
                "button",
                { onClick: handleClick },
                "Click me",
            );
            render(button, container);

            const buttonElement = container.querySelector("button");
            buttonElement?.click();

            if (capturedEvent) {
                expect(capturedEvent).not.toBeNull();
                expect(capturedEvent.type).toBe("click");
                if (buttonElement) {
                    expect(capturedEvent.target).toBe(buttonElement);
                    expect(capturedEvent.currentTarget).toBe(buttonElement);
                }
                expect(typeof capturedEvent.preventDefault).toBe("function");
                expect(typeof capturedEvent.stopPropagation).toBe("function");
            }
        });

        test("should handle form events", () => {
            let inputValue = "";
            let formSubmitted = false;

            const handleChange = (event: SyntheticEvent<HTMLInputElement>) => {
                inputValue = event.target.value;
            };

            const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
                event.preventDefault();
                formSubmitted = true;
            };

            const form = createElement(
                "form",
                { onSubmit: handleSubmit },
                createElement("input", {
                    type: "text",
                    onChange: handleChange,
                    value: "test",
                }),
                createElement("button", { type: "submit" }, "Submit"),
            );

            render(form, container);

            const inputElement = container.querySelector(
                "input",
            ) as HTMLInputElement;
            const formElement = container.querySelector(
                "form",
            ) as HTMLFormElement;

            // Simulate input change
            inputElement.value = "new value";
            const changeEvent = new Event("change", { bubbles: true });
            inputElement.dispatchEvent(changeEvent);
            expect(inputValue).toBe("new value");

            // Simulate form submission
            formElement.dispatchEvent(new Event("submit", { bubbles: true }));
            expect(formSubmitted).toBe(true);
        });
    });

    describe("Event Bubbling and Delegation", () => {
        test("should handle event bubbling correctly", () => {
            const eventOrder: string[] = [];

            const handleParentClick = () => {
                eventOrder.push("parent");
            };

            const handleChildClick = () => {
                eventOrder.push("child");
            };

            const app = createElement(
                "div",
                { onClick: handleParentClick },
                createElement(
                    "button",
                    { onClick: handleChildClick },
                    "Child Button",
                ),
            );

            render(app, container);

            const button = container.querySelector("button");
            button?.click();

            // Child handler should execute first, then parent (bubbling)
            expect(eventOrder).toEqual(["child", "parent"]);
        });

        test("should stop propagation when requested", () => {
            const eventOrder: string[] = [];

            const handleParentClick = () => {
                eventOrder.push("parent");
            };

            const handleChildClick = (event: SyntheticEvent) => {
                event.stopPropagation();
                eventOrder.push("child");
            };

            const app = createElement(
                "div",
                { onClick: handleParentClick },
                createElement(
                    "button",
                    { onClick: handleChildClick },
                    "Child Button",
                ),
            );

            render(app, container);

            const button = container.querySelector("button");
            button?.click();

            // Only child handler should execute
            expect(eventOrder).toEqual(["child"]);
        });

        test("should handle capture phase events", () => {
            const eventOrder: string[] = [];

            const handleParentCapture = () => {
                eventOrder.push("parent-capture");
            };

            const handleParentBubble = () => {
                eventOrder.push("parent-bubble");
            };

            const handleChildClick = () => {
                eventOrder.push("child");
            };

            const app = createElement(
                "div",
                {
                    onClickCapture: handleParentCapture,
                    onClick: handleParentBubble,
                },
                createElement(
                    "button",
                    { onClick: handleChildClick },
                    "Child Button",
                ),
            );

            render(app, container);

            const button = container.querySelector("button");
            button?.click();

            // Capture should happen first, then target, then bubbling
            expect(eventOrder).toEqual([
                "parent-capture",
                "child",
                "parent-bubble",
            ]);
        });

        test("should handle event delegation for dynamically added elements", () => {
            let clickedItem = "";

            const handleListClick = (event: SyntheticEvent) => {
                const target = event.target as HTMLElement;
                if (target.tagName === "LI") {
                    clickedItem = target.textContent || "";
                }
            };

            const list = createElement(
                "ul",
                { onClick: handleListClick },
                createElement("li", {}, "Item 1"),
                createElement("li", {}, "Item 2"),
                createElement("li", {}, "Item 3"),
            );

            render(list, container);

            // Click on second item
            const secondItem = container.querySelectorAll("li")[1];
            secondItem?.click();

            expect(clickedItem).toBe("Item 2");
        });
    });

    describe("Event System Integration", () => {
        test("should work with useState hook", () => {
            const Counter: FunctionalComponent = () => {
                const [count, setCount] = useState(0);

                const increment = () => {
                    setCount((prev) => prev + 1);
                };

                return createElement(
                    "div",
                    {},
                    createElement("span", {}, `Count: ${count}`),
                    createElement(
                        "button",
                        { onClick: increment },
                        "Increment",
                    ),
                );
            };

            render(createElement(Counter, {}), container);

            const span = container.querySelector("span");
            const button = container.querySelector("button");

            expect(span?.textContent).toBe("Count: 0");

            // Click button to increment
            button?.click();
            expect(span?.textContent).toBe("Count: 1");

            // Click again
            button?.click();
            expect(span?.textContent).toBe("Count: 2");
        });

        test("should handle events on functional components", () => {
            let buttonClicked = false;

            const Button: FunctionalComponent<{ onClick: () => void }> = ({
                onClick,
            }) => {
                return createElement("button", { onClick }, "Click me");
            };

            const handleClick = () => {
                buttonClicked = true;
            };

            render(createElement(Button, { onClick: handleClick }), container);

            const button = container.querySelector("button");
            button?.click();

            expect(buttonClicked).toBe(true);
        });

        test("should handle keyboard events", () => {
            let keyPressed = "";

            const handleKeyDown = (event: SyntheticEvent) => {
                keyPressed = (event.nativeEvent as KeyboardEvent).key;
            };

            const input = createElement("input", {
                type: "text",
                onKeyDown: handleKeyDown,
            });

            render(input, container);

            const inputElement = container.querySelector("input");
            const keyEvent = new KeyboardEvent("keydown", {
                key: "Enter",
                bubbles: true,
            });

            inputElement?.dispatchEvent(keyEvent);
            expect(keyPressed).toBe("Enter");
        });

        test("should prevent default behavior", () => {
            let defaultPrevented = false;

            const handleSubmit = (event: SyntheticEvent) => {
                event.preventDefault();
                defaultPrevented = event.defaultPrevented;
            };

            const form = createElement(
                "form",
                { onSubmit: handleSubmit },
                createElement("button", { type: "submit" }, "Submit"),
            );

            render(form, container);

            const formElement = container.querySelector("form");
            const submitEvent = new Event("submit", {
                bubbles: true,
                cancelable: true,
            });

            formElement?.dispatchEvent(submitEvent);
            expect(defaultPrevented).toBe(true);
        });
    });

    describe("Event Cleanup and Memory Management", () => {
        test("should not leak event handlers when components unmount", () => {
            let clickCount = 0;

            const handleClick = () => {
                clickCount++;
            };

            // Render with event handler
            const button = createElement(
                "button",
                { onClick: handleClick },
                "Click",
            );
            render(button, container);

            const buttonElement = container.querySelector("button");
            buttonElement?.click();
            expect(clickCount).toBe(1);

            // Unmount by rendering null
            render(null, container);
            expect(container.children.length).toBe(0);

            // Create a new button with same handler and verify it still works
            render(button, container);
            const newButtonElement = container.querySelector("button");
            newButtonElement?.click();
            expect(clickCount).toBe(2);
        });

        test("should handle event handler updates correctly", () => {
            let message = "";

            const createHandler = (msg: string) => () => {
                message = msg;
            };

            // Initial render
            const button1 = createElement(
                "button",
                {
                    onClick: createHandler("first"),
                },
                "Click",
            );
            render(button1, container);

            const buttonElement = container.querySelector("button");
            buttonElement?.click();
            expect(message).toBe("first");

            // Update with new handler
            const button2 = createElement(
                "button",
                {
                    onClick: createHandler("second"),
                },
                "Click",
            );
            render(button2, container);

            buttonElement?.click();
            expect(message).toBe("second");
        });
    });

    describe("Complex Event Scenarios", () => {
        test("should handle nested components with events", () => {
            const eventLog: string[] = [];

            const ChildComponent: FunctionalComponent<{ id: string }> = ({
                id,
            }) => {
                return createElement(
                    "div",
                    {
                        onClick: () => eventLog.push(`child-${id}`),
                    },
                    `Child ${id}`,
                );
            };

            const ParentComponent: FunctionalComponent = () => {
                return createElement(
                    "div",
                    {
                        onClick: () => eventLog.push("parent"),
                    },
                    createElement(ChildComponent, { id: "1" }),
                    createElement(ChildComponent, { id: "2" }),
                );
            };

            render(createElement(ParentComponent, {}), container);

            // Click on first child
            const firstChild = container.querySelectorAll("div")[1]; // Skip parent div
            firstChild?.click();

            expect(eventLog).toEqual(["child-1", "parent"]);
        });

        test("should handle rapid event firing", () => {
            let clickCount = 0;

            const handleClick = () => {
                clickCount++;
            };

            const button = createElement(
                "button",
                { onClick: handleClick },
                "Rapid Click",
            );
            render(button, container);

            const buttonElement = container.querySelector("button");

            // Fire multiple rapid clicks
            for (let i = 0; i < 10; i++) {
                buttonElement?.click();
            }

            expect(clickCount).toBe(10);
        });

        test("should handle event target correctly in delegation", () => {
            let clickedElement: Element | null = null;

            const handleClick = (event: SyntheticEvent) => {
                clickedElement = event.target as HTMLElement;
            };

            const container_div = createElement(
                "div",
                { onClick: handleClick },
                createElement("span", {}, "Clickable span"),
                createElement("button", {}, "Clickable button"),
                createElement(
                    "p",
                    {},
                    createElement("strong", {}, "Nested strong"),
                ),
            );

            render(container_div, container);

            // Click on span
            const span = container.querySelector("span");
            if (span) {
                span.click();
                expect(clickedElement).not.toBeNull();
                if (clickedElement) {
                    expect(clickedElement as Element).toEqual(span);
                }
            }

            // Click on nested strong element
            const strong = container.querySelector("strong");
            if (strong) {
                strong.click();
                expect(clickedElement).not.toBeNull();
                if (clickedElement) {
                    expect(clickedElement as Element).toEqual(strong);
                }
            }
        });
    });
});
