/* ***************** */
/* Context API Types */
/* ***************** */

import type { AnyMiniReactElement, FunctionalComponent } from "../core/types";

export interface MiniReactContext<T = unknown> {
	_currentValue: T;
	_defaultValue: T;
	_contextId: symbol;
	Provider: FunctionalComponent<{ value: T; children?: AnyMiniReactElement[] }>;
}

export type UseContextHook = <T>(context: MiniReactContext<T>) => T;
