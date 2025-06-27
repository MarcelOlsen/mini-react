import { createContext, useContext, useEffect, useState } from "mini-react";
import Counter from "./Counter";
import Modal from "./Modal";
import TodoList from "./TodoList";
import RefDemo from "./RefDemo";
import ReducerDemo from "./ReducerDemo";

// Create a theme context
const ThemeContext = createContext("light");

function ThemedButton({ children, onClick }) {
	const theme = useContext(ThemeContext);
	return (
		<button type="button" className={`btn-${theme}`} onClick={onClick}>
			{children}
		</button>
	);
}

function App() {
	const [theme, setTheme] = useState("light");
	const [showModal, setShowModal] = useState(false);
	const [message, setMessage] = useState("Welcome to MiniReact!");

	// Demo useEffect
	useEffect(() => {
		console.log("App mounted with theme:", theme);

		return () => {
			console.log("App effect cleanup");
		};
	}, [theme]);

	const toggleTheme = () => {
		setTheme((current) => (current === "light" ? "dark" : "light"));
	};

	return (
		<ThemeContext.Provider value={theme}>
			<div className="app">
				<header>
					<h1>🚀 MiniReact JSX Demo</h1>
					<p>{message}</p>
					<p style={{ fontSize: "0.9em", color: "#666", fontStyle: "italic" }}>
						Comprehensive demonstration of all MiniReact hooks and features
					</p>
				</header>

				{/* Theme toggle with context */}
				<section>
					<h2>Theme System (useContext Hook)</h2>
					<p>
						Current theme: <strong>{theme}</strong>
					</p>
					<ThemedButton onClick={toggleTheme}>
						Switch to {theme === "light" ? "Dark" : "Light"} Theme
					</ThemedButton>
				</section>

				{/* Counter component */}
				<section>
					<h2>Counter (useState & useEffect Hooks)</h2>
					<Counter />
				</section>

				{/* useRef demonstrations */}
				<section>
					<h2>useRef Hook Demonstrations</h2>
					<RefDemo />
				</section>

				{/* useReducer demonstrations */}
				<section>
					<h2>useReducer Hook Demonstrations</h2>
					<ReducerDemo />
				</section>

				{/* Conditional rendering */}
				<section>
					<h2>Conditional Rendering & Fragments</h2>
					{theme === "dark" ? (
						<>
							<p>🌙 Dark theme is enabled!</p>
							<p>Multiple elements in a fragment</p>
						</>
					) : (
						<p>☀️ Light theme is active</p>
					)}
				</section>

				{/* Todo list with dynamic rendering */}
				<section>
					<h2>Todo List (Dynamic Lists & Keys)</h2>
					<TodoList />
				</section>

				{/* Portal example */}
				<section>
					<h2>Modal (Portal Example)</h2>
					<button type="button" onClick={() => setShowModal(true)}>
						Open Modal
					</button>

					<Modal isOpen={showModal} onClose={() => setShowModal(false)}>
						<h3>Portal Modal</h3>
						<p>This modal is rendered using a portal!</p>
						<p>It appears outside the normal DOM hierarchy.</p>
						<button type="button" onClick={() => setShowModal(false)}>
							Close
						</button>
					</Modal>
				</section>

				{/* Event handling example */}
				<section>
					<h2>Event Handling</h2>
					<input
						type="text"
						value={message}
						onChange={(e) => setMessage(e.target.value)}
						placeholder="Update the message..."
					/>
					<p>You typed: {message}</p>
				</section>

				<footer>
					<p>
						<em>
							Built with MiniReact - A minimal React implementation with full
							JSX support including useState, useEffect, useContext, useRef, and useReducer hooks!
						</em>
					</p>
				</footer>
			</div>
		</ThemeContext.Provider>
	);
}

export default App;
