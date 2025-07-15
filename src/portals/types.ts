/* ************* */
/* Portal Types  */
/* ************* */

import type { AnyMiniReactElement } from "../core/types";
import type { PORTAL } from "../core/types";

export interface PortalElement {
	type: typeof PORTAL;
	props: {
		children: AnyMiniReactElement[];
		targetContainer: HTMLElement;
	};
}
