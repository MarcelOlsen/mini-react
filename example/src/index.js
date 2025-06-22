import { render } from "mini-react";
import App from "./App";

// Mount the app to the DOM
const rootElement = document.getElementById("root");

if (rootElement) {
  render(<App />, rootElement);
} else {
  console.error(
    'Root element not found! Make sure you have a div with id="root" in your HTML.'
  );
}
