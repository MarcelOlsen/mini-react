// Core functionality
export {
	createElement,
	render,
	useState,
	useEffect,
	useReducer,
	useRef,
	useContext,
	createContext,
	createPortal,
	Fragment,
} from "./src/MiniReact";

// JSX Runtime exports for automatic JSX transform
export { jsx, jsxs, jsxDEV } from "./src/MiniReact";

// Types
export * from "./src/core/types";
export type { SyntheticEvent, MiniReactContext } from "./src/MiniReact";
