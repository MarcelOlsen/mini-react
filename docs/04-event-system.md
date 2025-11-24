# Event System

## Overview

The event system handles all user interactions in MiniReact. Instead of attaching event listeners directly to DOM elements (which gets expensive with thousands of elements), we use event delegation - a single listener at the root handles everything and routes events to the appropriate handlers.

**Location**: `src/events/eventSystem.ts`

## Why Event Delegation?

Consider a list with 1000 items, each with an onClick handler. Naive approach would attach 1000 event listeners. Event delegation attaches just 1 listener to the container and figures out which item was clicked.

Benefits:

- **Memory efficient**: One listener instead of thousands
- **Dynamic content**: Works automatically for elements added/removed dynamically
- **Consistent behavior**: All events handled the same way
- **Portal support**: Events can bubble through React tree even if DOM tree is different

## Architecture

The event system has a few key pieces:

**Event Registration**: Lazily register event listeners when handlers are first used

**Synthetic Events**: Wrap native events with a React-compatible interface

**Event Path Construction**: Build the path from target to root through the React tree

**Event Dispatch**: Execute handlers in capture and bubble phases

## The EventSystem Class

We have a singleton instance that manages everything:

```typescript
class EventSystem {
  private rootContainer: Element | null = null
  private registeredEvents = new Set<NativeEventName>()
  private instanceToNode = new WeakMap<VDOMInstance, Node>()
  private nodeToInstance = new WeakMap<Node, VDOMInstance>()
  private boundHandleDelegatedEvent: (event: Event) => void
  private portalContainers = new Set<Element>()

  constructor() {
    this.boundHandleDelegatedEvent = this.handleDelegatedEvent.bind(this)
  }
}
```

The `boundHandleDelegatedEvent` is cached so we can add/remove the exact same function reference.

## Initialization

When `render()` is called, we initialize the event system:

```typescript
initialize(container: Element): void {
  if (this.rootContainer && this.rootContainer !== container) {
    this.cleanup()
  }
  this.rootContainer = container
}
```

Pretty simple - just remember which container we're using. If it changes, clean up the old one first.

## Instance Registration

As fibers are completed, they register with the event system:

```typescript
registerInstance(instance: VDOMInstance, domNode: Node): void {
  this.instanceToNode.set(instance, domNode)
  if (domNode) {
    this.nodeToInstance.set(domNode, instance)
  }
}
```

These WeakMaps create bidirectional mapping between React instances and DOM nodes. We need this to build the event path.

Using WeakMaps is important - when a fiber is garbage collected, these entries are automatically removed.

## Lazy Event Registration

We only register event listeners when they're actually needed:

```typescript
hasEventHandlers(props: Record<string, unknown>): boolean {
  let hasHandlers = false

  for (const propName of Object.keys(props)) {
    if (propName.startsWith('on') && typeof props[propName] === 'function') {
      const reactEventName = propName as MiniReactEventName
      const nativeEventName = MINI_REACT_EVENT_TO_NATIVE_EVENT[reactEventName]

      if (nativeEventName) {
        this.ensureEventListener(nativeEventName)
        hasHandlers = true
      }
    }
  }

  return hasHandlers
}
```

This is called during complete work. If a fiber has event handlers, we ensure the corresponding native event listener is registered.

```typescript
private ensureEventListener(nativeEventName: NativeEventName): void {
  if (!this.registeredEvents.has(nativeEventName)) {
    const eventOptions = this.getEventOptions(nativeEventName)

    // Add to root container
    if (this.rootContainer) {
      this.rootContainer.addEventListener(
        nativeEventName,
        this.boundHandleDelegatedEvent,
        eventOptions
      )
    }

    // Add to all portal containers
    for (const portalContainer of this.portalContainers) {
      portalContainer.addEventListener(
        nativeEventName,
        this.boundHandleDelegatedEvent,
        eventOptions
      )
    }

    this.registeredEvents.add(nativeEventName)
  }
}
```

Some events need special handling:

```typescript
private getEventOptions(eventName: NativeEventName): boolean | AddEventListenerOptions {
  // Capture phase for focus/blur/scroll/load/error
  if (CAPTURE_EVENTS.has(eventName)) {
    return { capture: true }
  }

  // Passive for wheel/touch (better scroll performance)
  if (PASSIVE_EVENTS.has(eventName)) {
    return { passive: true }
  }

  return false
}
```

## Synthetic Events

When a native event fires, we wrap it in a synthetic event:

```typescript
function createSyntheticEvent(nativeEvent: Event): SyntheticEvent {
  let defaultPrevented = false
  let propagationStopped = false
  let immediatePropagationStopped = false

  const syntheticEvent: SyntheticEvent = {
    nativeEvent,
    target: nativeEvent.target as Element,
    currentTarget: nativeEvent.currentTarget as Element,
    type: nativeEvent.type,
    bubbles: nativeEvent.bubbles,
    cancelable: nativeEvent.cancelable,

    get defaultPrevented() {
      return defaultPrevented || nativeEvent.defaultPrevented
    },

    eventPhase: nativeEvent.eventPhase,
    isTrusted: nativeEvent.isTrusted,
    timeStamp: nativeEvent.timeStamp,

    preventDefault() {
      defaultPrevented = true
      nativeEvent.preventDefault()
    },

    stopPropagation() {
      propagationStopped = true
      nativeEvent.stopPropagation()
    },

    stopImmediatePropagation() {
      immediatePropagationStopped = true
      propagationStopped = true
      nativeEvent.stopImmediatePropagation()
    }
  }

  // Add internal getters for propagation state
  Object.defineProperty(syntheticEvent, '_propagationStopped', {
    get: () => propagationStopped,
    enumerable: false
  })

  Object.defineProperty(syntheticEvent, '_immediatePropagationStopped', {
    get: () => immediatePropagationStopped,
    enumerable: false
  })

  return syntheticEvent
}
```

The synthetic event:

- Wraps the native event
- Provides a consistent interface across browsers
- Tracks propagation state
- Delegates methods to the native event

We use closures to track `defaultPrevented`, `propagationStopped`, etc. This lets us check these flags even after the event has been handled.

## Event Path Construction

This is where portal support gets interesting. When an event fires, we need to build the path from the target to the root through the React tree, not the DOM tree.

```typescript
private getEventPath(target: Node): VDOMInstance[] {
  const path: VDOMInstance[] = []
  let currentNode: Node | null = target

  while (currentNode) {
    const instance = this.nodeToInstance.get(currentNode)

    if (instance) {
      path.unshift(instance) // Add to beginning (capture order)

      // Check if this is inside a portal
      const portalParent = this.findPortalParent(instance)
      if (portalParent) {
        // Add portal and continue up React tree
        path.unshift(portalParent)

        // Walk up React parent chain
        let reactParent = portalParent.parent
        while (reactParent) {
          path.unshift(reactParent)
          reactParent = reactParent.parent
        }
        break // Done with DOM traversal
      }
    }

    currentNode = currentNode.parentNode

    // Stop if we've left the main container
    if (!this.rootContainer?.contains(currentNode) && !instance) {
      break
    }
  }

  return path
}
```

The algorithm:

1. Start at the event target
2. Walk up the DOM tree
3. For each DOM node, find its React instance
4. If the instance is inside a portal, stop DOM traversal and switch to React tree traversal
5. Continue until we reach the root

```typescript
private findPortalParent(instance: VDOMInstance): VDOMInstance | null {
  let current = instance.parent

  while (current) {
    if (current.element.type === PORTAL) {
      return current
    }
    current = current.parent
  }

  return null
}
```

This is crucial for portals. Even though the portal child renders to a different DOM container, events still bubble through the React tree.

Example:

```tsx
<div onClick={handleParent}>
  <div>Regular content</div>
  <Portal target={otherContainer}>
    <button onClick={handleButton}>Click me</button>
  </Portal>
</div>
```

When the button is clicked:
- DOM path: button -> otherContainer
- React path: button -> portal -> div

The event bubbles through the React path, so `handleParent` gets called even though the button is in a different DOM container.

## Collecting Event Handlers

Once we have the event path, we collect all relevant handlers:

```typescript
private collectEventHandlers(
  eventPath: VDOMInstance[],
  reactEventName: MiniReactEventName
): Array<{ instance: VDOMInstance; handler: EventHandler; capture?: boolean }> {
  const handlers = []

  for (const instance of eventPath) {
    const props = instance.element.props as Record<string, unknown>

    // Check for capture handler (e.g., onClickCapture)
    const captureEventName = `${reactEventName}Capture`
    if (props[captureEventName] && typeof props[captureEventName] === 'function') {
      handlers.push({
        instance,
        handler: props[captureEventName] as EventHandler,
        capture: true
      })
    }

    // Check for bubble handler (e.g., onClick)
    if (props[reactEventName] && typeof props[reactEventName] === 'function') {
      handlers.push({
        instance,
        handler: props[reactEventName] as EventHandler,
        capture: false
      })
    }
  }

  return handlers
}
```

We collect both capture and bubble handlers. Capture handlers have names like `onClickCapture`.

## Executing Handlers

Handlers execute in two phases, just like native DOM events:

```typescript
private executeEventHandlers(
  eventHandlers: Array<{ instance: VDOMInstance; handler: EventHandler; capture?: boolean }>,
  syntheticEvent: SyntheticEvent
): void {
  const internalEvent = syntheticEvent as InternalSyntheticEvent

  // Capture phase (root to target)
  for (const { instance, handler, capture } of eventHandlers) {
    if (capture) {
      const domNode = this.instanceToNode.get(instance)
      if (domNode) {
        syntheticEvent.currentTarget = domNode as Element
        handler(syntheticEvent)

        if (internalEvent._immediatePropagationStopped) {
          return
        }
      }
    }
  }

  // Stop if propagation was stopped during capture
  if (internalEvent._propagationStopped) {
    return
  }

  // Bubble phase (target to root)
  const bubbleHandlers = eventHandlers.filter(h => !h.capture).reverse()
  for (const { instance, handler } of bubbleHandlers) {
    const domNode = this.instanceToNode.get(instance)
    if (domNode) {
      syntheticEvent.currentTarget = domNode as Element
      handler(syntheticEvent)

      if (internalEvent._immediatePropagationStopped) {
        return
      }
      if (internalEvent._propagationStopped) {
        return
      }
    }
  }
}
```

Note that we update `currentTarget` for each handler. This is important - `target` is always the element that triggered the event, but `currentTarget` is the element whose handler is currently executing.

## Portal Support

Portals need event delegation too:

```typescript
addEventDelegation(container: Element): void {
  this.portalContainers.add(container)

  // Add all already-registered events to this container
  for (const eventName of this.registeredEvents) {
    const eventOptions = this.getEventOptions(eventName)
    container.addEventListener(
      eventName,
      this.boundHandleDelegatedEvent,
      eventOptions
    )
  }
}
```

When a portal is created, we call this to register the portal's target container. Now events in the portal container get caught and routed through the React tree.

## Event Name Mapping

We map React event names to native event names:

```typescript
const MINI_REACT_EVENT_TO_NATIVE_EVENT = {
  onClick: 'click',
  onMouseDown: 'mousedown',
  onMouseUp: 'mouseup',
  onKeyDown: 'keydown',
  onKeyUp: 'keyup',
  onChange: 'change',
  onInput: 'input',
  onSubmit: 'submit',
  onFocus: 'focus',
  onBlur: 'blur',
  // ... etc
} as const
```

This lets us use React-style event names in JSX while listening to native events.

## Cleanup

When unmounting or changing containers:

```typescript
cleanup(): void {
  if (this.rootContainer) {
    for (const eventName of this.registeredEvents) {
      this.rootContainer.removeEventListener(
        eventName,
        this.boundHandleDelegatedEvent
      )
    }
  }

  // Remove event listeners from all portal containers
  for (const portalContainer of this.portalContainers) {
    for (const eventName of this.registeredEvents) {
      portalContainer.removeEventListener(
        eventName,
        this.boundHandleDelegatedEvent
      )
    }
  }

  this.registeredEvents.clear()
  this.portalContainers.clear()
  this.instanceToNode = new WeakMap()
  this.nodeToInstance = new WeakMap()
  this.rootContainer = null
}
```

Important to clean up event listeners to avoid memory leaks.

## Performance Considerations

The event system is designed to be fast:

**Lazy Registration**: Only register events that are actually used

**Single Listener**: One listener per event type, not per element

**WeakMaps**: Automatic cleanup when fibers are garbage collected

**Cached Handler**: The bound handler function is created once and reused

**Event Pooling**: Could add in the future - reuse synthetic event objects

## Edge Cases

**Stopped Propagation**: We check propagation flags between each handler

**Immediate Propagation**: Also stops subsequent handlers on the same element

**Portal Events**: Build React path instead of DOM path

**Capture Events**: Focus/blur/scroll need capture phase

**Passive Events**: Touch/wheel benefit from passive listeners for scroll performance

## Debugging

If events aren't working:

1. Check if the event listener was registered (look at `this.registeredEvents`)
2. Verify the instance mapping exists (check `nodeToInstance`)
3. Look at the event path (log in `getEventPath`)
4. Check if handlers are being collected (log in `collectEventHandlers`)
5. Verify handlers are executing (log in `executeEventHandlers`)

Add logging to the main handler:

```typescript
private handleDelegatedEvent(nativeEvent: Event): void {
  console.log('Event:', nativeEvent.type, 'Target:', nativeEvent.target)
  // ... rest of function
}
```

## Comparison to Direct Handlers

Why not just use `element.addEventListener`?

**Direct handlers:**
- Simple to understand
- More memory (one closure per element)
- Harder to remove correctly
- No automatic cleanup

**Event delegation:**
- One handler for all elements
- Less memory usage
- Automatic cleanup when elements removed
- Consistent behavior across the app
- Portal support built-in

The delegation approach scales much better.

## Future Enhancements

Some ideas for improving the event system:

**Event Pooling**: Reuse synthetic event objects to reduce allocations

**Priority Events**: Make some events (like input) higher priority

**Replay**: Queue events that fire during render and replay after commit

**More Event Types**: Add support for more specialized events

**Better DevTools**: Track which handlers are registered and why

## Summary

The event system provides:

- Efficient event delegation with one listener per type
- Synthetic events with a consistent interface
- Correct event bubbling through React tree (even with portals)
- Lazy registration (only listen to events that are used)
- Proper cleanup to avoid memory leaks

It's a key part of making MiniReact feel like React while keeping performance good.
