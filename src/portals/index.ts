/* ************* */
/* Portals       */
/* ************* */

import type { AnyMiniReactElement } from "../core/types";
import { PORTAL, TEXT_ELEMENT } from "../core/types";
import type { PortalElement } from "./types";

/**
 * Creates a portal element that renders its children into a different DOM container
 * @param children The children to render in the portal
 * @param targetContainer The DOM container to render into
 * @returns A portal element
 */
export function createPortal(
	children:
		| AnyMiniReactElement
		| AnyMiniReactElement[]
		| string
		| number
		| null
		| undefined,
	targetContainer: HTMLElement,
): PortalElement {
	if (!targetContainer) {
		throw new Error("Portal target cannot be null or undefined");
	}

	// Normalize children similar to createElement
	const childrenArray = Array.isArray(children) ? children : [children];
	const normalizedChildren = childrenArray
		.flat()
		.filter((child) => child !== null && child !== undefined)
		.map((child) => {
			if (typeof child === "string" || typeof child === "number") {
				return {
					type: TEXT_ELEMENT,
					props: {
						nodeValue: child,
						children: [],
					},
				};
			}
			return child;
		});

	return {
		type: PORTAL,
		props: {
			children: normalizedChildren,
			targetContainer,
		},
	};
}
