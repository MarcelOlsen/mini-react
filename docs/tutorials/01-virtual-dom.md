# Tutorial 1: The Virtual DOM

## What Problem Does It Solve?

Modifying the DOM directly is slow. When you change an element's text, the browser may need to:
1. Re-calculate styles for that element
2. Re-calculate layout for the whole page
3. Re-paint affected pixels

These operations are called "reflows" and "repaints." If you change 100 elements in a loop, the browser does this 100 times.

## The Solution: Batch Everything

The Virtual DOM is a JavaScript object representation of what the real DOM should look like. Here's the core idea:

```
1. Build a virtual tree (JavaScript objects) — fast
2. Diff it with the previous virtual tree (also JS objects) — fast
3. Apply only the minimal set of changes to the real DOM — slow, but only once
```

## What is a Virtual Element?

In MiniReact, a virtual element is a plain JavaScript object with `type` and `props`:

```typescript
const element = createElement("h1", { id: "title" }, "Hello");

// What element actually is:
{
  type: "h1",
  props: {
    id: "title",
    children: ["Hello"]
  }
}
```

**`createElement`** is just a function that builds this object. It:
1. Normalizes children (strings become text nodes, nulls filtered out)
2. Returns an object with `type` and `props`

## Text Nodes

Text in the DOM is special. MiniReact defines a `TEXT_ELEMENT` constant:

```typescript
const TEXT_ELEMENT = "TEXT_ELEMENT";

// A text node looks like:
{
  type: TEXT_ELEMENT,
  props: {
    nodeValue: "Hello",
    children: []
  }
}
}
```

## Children Are an Array of More Elements

Elements nest:

```typescript
const element = createElement("div", { className: "card" },
  createElement("h1", null, "Title"),
  createElement("p", null, "Content")
);

// Result:
{
  type: "div",
  props: {
    className: "card",
    children: [
      { type: "h1", props: { children: [
        { type: TEXT_ELEMENT, props: { nodeValue: "Title" } }
      ] }},
      { type: "p", props: { children: [
        { type: TEXT_ELEMENT, props: { nodeValue: "Content" } }
      ] }}
    ]
  }
}
```

This is a **tree** of JavaScript objects. No DOM yet.

## Exercise

Without using code, draw the virtual tree for:

```typescript
createElement("ul", null,
  createElement("li", { key: 1 }, "Apple"),
  createElement("li", { key: 2 }, "Banana")
)
```

## Key Takeaways

1. **Virtual DOM = JavaScript objects** representing DOM structure
2. **`createElement` builds these objects** — fast, no DOM work
3. **Text nodes** are special elements with `TEXT_ELEMENT` type
4. **Children can be:** strings (auto-converted to text), numbers, other elements, or null
5. **At this stage there is NO DOM** — we're just building a data structure

In the next tutorial we'll see how to turn this virtual tree into real DOM nodes.
