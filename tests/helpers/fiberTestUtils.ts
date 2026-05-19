import type { createElement } from "@/MiniReact";
import {
	createRoot,
	flushLayoutEffects,
	flushPassiveEffects,
	flushSync,
	updateContainer,
} from "@/fiber";
import type { FiberRoot } from "@/fiber";

const ROOT_ID = "fiber-test-root";

/**
 * Creates a fresh test root with a new container element.
 */
export function createTestRoot(): { container: HTMLElement; root: FiberRoot } {
	document.body.innerHTML = `<div id="${ROOT_ID}"></div>`;
	const container = document.getElementById(ROOT_ID);
	if (!container) {
		throw new Error(`Test setup failed: #${ROOT_ID} not found`);
	}
	const root = createRoot(container);
	return { container, root };
}

/**
 * Renders an element into a fiber root (updateContainer + flushSync).
 */
export function renderFiber(
	element: ReturnType<typeof createElement> | null,
	root: FiberRoot,
): void {
	updateContainer(element, root);
	flushSync();
}

/**
 * Flushes passive effects and waits for async scheduling.
 */
export async function flushEffects(): Promise<void> {
	flushPassiveEffects();
	await new Promise((resolve) => setTimeout(resolve, 10));
}

export { flushLayoutEffects, flushPassiveEffects };
