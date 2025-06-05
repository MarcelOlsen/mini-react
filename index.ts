export { createElement, render } from "./src/MiniReact";
export type {
	FunctionalComponent,
	MiniReactElement,
	AnyMiniReactElement,
} from "./src/types";

const hello = () => {
	console.log("Hello via Bun!");
};

export default hello;
