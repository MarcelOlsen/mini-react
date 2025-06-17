import { beforeEach, afterEach, describe, expect, test } from "bun:test";
import { createElement, render, useState, useEffect } from "../src/MiniReact";

// TODO: Import createPortal once implemented
// import { createPortal } from "../src/MiniReact";

// Temporary placeholder for createPortal until implemented
function createPortal(_children: unknown, _target: HTMLElement): unknown {
    throw new Error("createPortal not yet implemented");
}

describe("MiniReact Portal Tests", () => {
    let container: HTMLElement;
    let portalTarget: HTMLElement;

    beforeEach(() => {
        container = document.createElement("div");
        container.id = "main-container";
        document.body.appendChild(container);

        portalTarget = document.createElement("div");
        portalTarget.id = "portal-target";
        document.body.appendChild(portalTarget);
    });

    afterEach(() => {
        document.body.removeChild(container);
        document.body.removeChild(portalTarget);
    });

    describe("Basic Portal Functionality", () => {
        test("should render portal content to target container", () => {
            const portalContent = createElement("div", { id: "portal-content" }, "Portal Content");
            const portal = createPortal(portalContent, portalTarget);

            const app = createElement(
                "div",
                null,
                createElement("div", null, "Main Content"),
                portal,
            );

            render(app, container);

            // Main content should be in main container
            expect(container.innerHTML).toBe("<div><div>Main Content</div></div>");

            // Portal content should be in portal target
            expect(portalTarget.innerHTML).toBe('<div id="portal-content">Portal Content</div>');
        });

        test("should render multiple elements through portal", () => {
            const portal = createPortal(
                [
                    createElement("span", null, "First"),
                    createElement("span", null, "Second"),
                ],
                portalTarget,
            );

            render(portal, container);

            expect(portalTarget.innerHTML).toBe("<span>First</span><span>Second</span>");
            expect(container.innerHTML).toBe("");
        });

        test("should render text content through portal", () => {
            const portal = createPortal("Plain text content", portalTarget);

            render(portal, container);

            expect(portalTarget.textContent).toBe("Plain text content");
        });

        test("should render nested components through portal", () => {
            function NestedComponent() {
                return createElement(
                    "div",
                    { className: "nested" },
                    createElement("span", null, "Nested Content"),
                );
            }

            const portal = createPortal(createElement(NestedComponent, null), portalTarget);

            render(portal, container);

            expect(portalTarget.innerHTML).toBe('<div class="nested"><span>Nested Content</span></div>');
        });
    });

    describe("Portal Updates and State Management", () => {
        test("should update portal content when state changes", () => {
            function PortalComponent() {
                const [count, setCount] = useState(0);

                return createElement(
                    "div",
                    null,
                    createElement("button", {
                        onClick: () => setCount(count + 1),
                    }, "Increment"),
                    createPortal(
                        createElement("div", { id: "counter" }, `Count: ${count}`),
                        portalTarget,
                    ),
                );
            }

            render(createElement(PortalComponent, null), container);

            expect(portalTarget.innerHTML).toBe('<div id="counter">Count: 0</div>');

            const button = container.querySelector("button");
            button?.click();

            expect(portalTarget.innerHTML).toBe('<div id="counter">Count: 1</div>');
        });

        test("should handle conditional portal rendering", () => {
            function ConditionalPortal({ showPortal }: { showPortal: boolean }) {
                return createElement(
                    "div",
                    null,
                    createElement("div", null, "Main Content"),
                    showPortal ? createPortal(
                        createElement("div", null, "Portal Content"),
                        portalTarget,
                    ) : null,
                );
            }

            // Initially show portal
            render(createElement(ConditionalPortal, { showPortal: true }), container);
            expect(portalTarget.innerHTML).toBe("<div>Portal Content</div>");

            // Hide portal
            render(createElement(ConditionalPortal, { showPortal: false }), container);
            expect(portalTarget.innerHTML).toBe("");

            // Show portal again
            render(createElement(ConditionalPortal, { showPortal: true }), container);
            expect(portalTarget.innerHTML).toBe("<div>Portal Content</div>");
        });

        test("should handle portal target changes", () => {
            const alternateTarget = document.createElement("div");
            document.body.appendChild(alternateTarget);

            function DynamicPortal({ useAlternate }: { useAlternate: boolean }) {
                const target = useAlternate ? alternateTarget : portalTarget;
                return createPortal(
                    createElement("div", null, "Dynamic Content"),
                    target,
                );
            }

            // Initially render to portalTarget
            render(createElement(DynamicPortal, { useAlternate: false }), container);
            expect(portalTarget.innerHTML).toBe("<div>Dynamic Content</div>");
            expect(alternateTarget.innerHTML).toBe("");

            // Switch to alternateTarget
            render(createElement(DynamicPortal, { useAlternate: true }), container);
            expect(portalTarget.innerHTML).toBe("");
            expect(alternateTarget.innerHTML).toBe("<div>Dynamic Content</div>");

            document.body.removeChild(alternateTarget);
        });
    });

    describe("Multiple Portals", () => {
        test("should handle multiple portals to same target", () => {
            const target2 = document.createElement("div");
            document.body.appendChild(target2);

            const app = createElement(
                "div",
                null,
                createPortal(createElement("div", null, "Portal 1"), portalTarget),
                createPortal(createElement("div", null, "Portal 2"), portalTarget),
                createPortal(createElement("div", null, "Portal 3"), target2),
            );

            render(app, container);

            expect(portalTarget.innerHTML).toBe("<div>Portal 1</div><div>Portal 2</div>");
            expect(target2.innerHTML).toBe("<div>Portal 3</div>");

            document.body.removeChild(target2);
        });

        test("should handle multiple portals to different targets", () => {
            const target2 = document.createElement("div");
            const target3 = document.createElement("div");
            document.body.appendChild(target2);
            document.body.appendChild(target3);

            const app = createElement(
                "div",
                null,
                createPortal(createElement("span", null, "A"), portalTarget),
                createPortal(createElement("span", null, "B"), target2),
                createPortal(createElement("span", null, "C"), target3),
            );

            render(app, container);

            expect(portalTarget.innerHTML).toBe("<span>A</span>");
            expect(target2.innerHTML).toBe("<span>B</span>");
            expect(target3.innerHTML).toBe("<span>C</span>");

            document.body.removeChild(target2);
            document.body.removeChild(target3);
        });
    });

    describe("Nested Portals", () => {
        test("should handle portals within portals", () => {
            const innerTarget = document.createElement("div");
            document.body.appendChild(innerTarget);

            const innerPortal = createPortal(
                createElement("div", { id: "inner" }, "Inner Portal"),
                innerTarget,
            );

            const outerPortal = createPortal(
                createElement(
                    "div",
                    { id: "outer" },
                    createElement("span", null, "Outer Content"),
                    innerPortal,
                ),
                portalTarget,
            );

            render(outerPortal, container);

            expect(portalTarget.innerHTML).toBe('<div id="outer"><span>Outer Content</span></div>');
            expect(innerTarget.innerHTML).toBe('<div id="inner">Inner Portal</div>');

            document.body.removeChild(innerTarget);
        });
    });

    describe("Event Handling", () => {
        test("should bubble events through React tree, not DOM tree", () => {
            const events: string[] = [];

            function ParentComponent() {
                return createElement(
                    "div",
                    {
                        onClick: () => events.push("parent"),
                    },
                    createElement("div", null, "Main Content"),
                    createPortal(
                        createElement(
                            "button",
                            {
                                onClick: () => events.push("portal-button"),
                            },
                            "Portal Button",
                        ),
                        portalTarget,
                    ),
                );
            }

            render(createElement(ParentComponent, null), container);

            const button = portalTarget.querySelector("button");
            button?.click();

            // Event should bubble through React tree: button -> parent
            expect(events).toEqual(["portal-button", "parent"]);
        });

        test("should handle event prevention in portals", () => {
            const events: string[] = [];

            function App() {
                return createElement(
                    "div",
                    {
                        onClick: () => events.push("parent"),
                    },
                    createPortal(
                        createElement(
                            "button",
                            {
                                onClick: (e: Event) => {
                                    events.push("portal-button");
                                    e.stopPropagation();
                                },
                            },
                            "Portal Button",
                        ),
                        portalTarget,
                    ),
                );
            }

            render(createElement(App, null), container);

            const button = portalTarget.querySelector("button");
            button?.click();

            // Event should be stopped, parent should not receive it
            expect(events).toEqual(["portal-button"]);
        });
    });

    describe("Context Propagation", () => {
        test("should propagate context through portals", () => {
            // This test will need Context implementation
            // For now, we'll create a placeholder test structure
            function ContextProvider({ children }: { children: unknown }) {
                // Would use React.createContext and Provider
                return children;
            }

            function ContextConsumer() {
                // Would use useContext hook
                return createElement("div", null, "Context Value");
            }

            const app = createElement(
                ContextProvider,
                { value: "test-value" },
                createElement("div", null, "Main Content"),
                createPortal(
                    createElement(ContextConsumer, null),
                    portalTarget,
                ),
            );

            render(app, container);

            // Context should work through portal
            expect(portalTarget.innerHTML).toBe("<div>Context Value</div>");
        });
    });

    describe("Lifecycle and Effects", () => {
        test("should call effects in portal components", () => {
            const effects: string[] = [];

            function PortalComponent() {
                useEffect(() => {
                    effects.push("mount");
                    return () => effects.push("unmount");
                }, []);

                return createElement("div", null, "Portal Effect Component");
            }

            // Mount
            render(
                createPortal(createElement(PortalComponent, null), portalTarget),
                container,
            );

            expect(effects).toEqual(["mount"]);

            // Unmount
            render(createElement("div", null, "Empty"), container);

            expect(effects).toEqual(["mount", "unmount"]);
        });

        test("should clean up portal content on unmount", () => {
            function PortalApp({ showPortal }: { showPortal: boolean }) {
                return createElement(
                    "div",
                    null,
                    showPortal ? createPortal(
                        createElement("div", null, "Portal Content"),
                        portalTarget,
                    ) : null,
                );
            }

            // Mount with portal
            render(createElement(PortalApp, { showPortal: true }), container);
            expect(portalTarget.innerHTML).toBe("<div>Portal Content</div>");

            // Unmount portal
            render(createElement(PortalApp, { showPortal: false }), container);
            expect(portalTarget.innerHTML).toBe("");
        });
    });

    describe("Edge Cases", () => {
        test("should handle null portal target gracefully", () => {
            expect(() => {
                const portal = createPortal(
                    createElement("div", null, "Content"),
                    null as unknown as HTMLElement,
                );
                render(portal, container);
            }).toThrow("Portal target cannot be null or undefined");
        });

        test("should handle undefined portal target gracefully", () => {
            expect(() => {
                const portal = createPortal(
                    createElement("div", null, "Content"),
                    undefined as unknown as HTMLElement,
                );
                render(portal, container);
            }).toThrow("Portal target cannot be null or undefined");
        });

        test("should handle portal target that is not in DOM", () => {
            const detachedTarget = document.createElement("div");

            const portal = createPortal(
                createElement("div", null, "Content"),
                detachedTarget,
            );

            // Should not throw, but content should be in detached target
            render(portal, container);
            expect(detachedTarget.innerHTML).toBe("<div>Content</div>");
        });

        test("should handle portal with null children", () => {
            const portal = createPortal(null, portalTarget);
            render(portal, container);
            expect(portalTarget.innerHTML).toBe("");
        });

        test("should handle portal with undefined children", () => {
            const portal = createPortal(undefined, portalTarget);
            render(portal, container);
            expect(portalTarget.innerHTML).toBe("");
        });

        test("should handle portal target removal during render", () => {
            const tempTarget = document.createElement("div");
            document.body.appendChild(tempTarget);

            const portal = createPortal(
                createElement("div", null, "Content"),
                tempTarget,
            );

            render(portal, container);
            expect(tempTarget.innerHTML).toBe("<div>Content</div>");

            // Remove target from DOM
            document.body.removeChild(tempTarget);

            // Re-render should handle gracefully
            render(portal, container);
            // Content should still be in the detached target
            expect(tempTarget.innerHTML).toBe("<div>Content</div>");
        });

        test("should handle rapid portal creation and destruction", () => {
            for (let i = 0; i < 100; i++) {
                const portal = createPortal(
                    createElement("div", null, `Content ${i}`),
                    portalTarget,
                );
                render(portal, container);
                expect(portalTarget.innerHTML).toBe(`<div>Content ${i}</div>`);
            }

            render(createElement("div", null, "Done"), container);
            expect(portalTarget.innerHTML).toBe("");
        });
    });

    describe("Performance", () => {
        test("should efficiently update large portal content", () => {
            function LargePortalList({ count }: { count: number }) {
                const items = Array.from({ length: count }, (_, i) =>
                    createElement("div", { key: i }, `Item ${i}`)
                );

                return createPortal(
                    createElement("div", null, ...items),
                    portalTarget,
                );
            }

            // Initial render with 1000 items
            render(createElement(LargePortalList, { count: 1000 }), container);
            expect(portalTarget.children).toHaveLength(1);
            expect(portalTarget.firstElementChild?.children).toHaveLength(1000);

            // Update to 1500 items
            render(createElement(LargePortalList, { count: 1500 }), container);
            expect(portalTarget.firstElementChild?.children).toHaveLength(1500);

            // Update to 500 items
            render(createElement(LargePortalList, { count: 500 }), container);
            expect(portalTarget.firstElementChild?.children).toHaveLength(500);
        });
    });
}); 