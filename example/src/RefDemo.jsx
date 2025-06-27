import { useRef, useState, useEffect } from "mini-react";

function RefDemo() {
	// DOM reference example
	const inputRef = useRef(null);
	const buttonRef = useRef(null);
	
	// Mutable value example (persists across re-renders without causing re-renders)
	const renderCountRef = useRef(0);
	const previousValueRef = useRef("");
	
	// State to trigger re-renders
	const [inputValue, setInputValue] = useState("");
	const [focusCount, setFocusCount] = useState(0);

	// Track render count using useRef
	useEffect(() => {
		renderCountRef.current += 1;
	});

	// Store previous value using useRef
	useEffect(() => {
		previousValueRef.current = inputValue;
	});

	const focusInput = () => {
		if (inputRef.current) {
			inputRef.current.focus();
			setFocusCount(prev => prev + 1);
		}
	};

	const clearInput = () => {
		if (inputRef.current) {
			inputRef.current.value = "";
			setInputValue("");
			inputRef.current.focus();
		}
	};

	const handleInputChange = (e) => {
		setInputValue(e.target.value);
	};

	return (
		<div className="ref-demo">
			<h3>useRef Hook Demonstrations</h3>
			
			{/* DOM Reference Example */}
			<div style={{ marginBottom: "20px", padding: "15px", border: "1px solid #ccc", borderRadius: "5px" }}>
				<h4>1. DOM References</h4>
				<p>Use useRef to directly access DOM elements:</p>
				
				<input
					ref={inputRef}
					type="text"
					value={inputValue}
					onChange={handleInputChange}
					placeholder="Type something..."
					style={{ marginRight: "10px", padding: "5px" }}
				/>
				
				<button
					ref={buttonRef}
					type="button"
					onClick={focusInput}
					style={{ marginRight: "10px", padding: "5px 10px" }}
				>
					Focus Input
				</button>
				
				<button
					type="button"
					onClick={clearInput}
					style={{ padding: "5px 10px" }}
				>
					Clear & Focus
				</button>
				
				<p>Focus button clicked: <strong>{focusCount}</strong> times</p>
			</div>

			{/* Mutable Value Example */}
			<div style={{ marginBottom: "20px", padding: "15px", border: "1px solid #ccc", borderRadius: "5px" }}>
				<h4>2. Mutable Values (No Re-render)</h4>
				<p>Use useRef to store values that persist across renders without causing re-renders:</p>
				
				<p>Component has rendered: <strong>{renderCountRef.current}</strong> times</p>
				<p>Current value: <strong>"{inputValue}"</strong></p>
				<p>Previous value: <strong>"{previousValueRef.current}"</strong></p>
				
				<p style={{ fontSize: "0.9em", color: "#666", fontStyle: "italic" }}>
					Note: The render count and previous value are stored in useRef, 
					so updating them doesn't trigger re-renders!
				</p>
			</div>

			{/* Demonstration of useRef vs useState */}
			<div style={{ padding: "15px", border: "1px solid #ccc", borderRadius: "5px" }}>
				<h4>3. useRef vs useState Comparison</h4>
				<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
					<div>
						<h5>✅ useRef characteristics:</h5>
						<ul style={{ fontSize: "0.9em" }}>
							<li>Mutable .current property</li>
							<li>Persists across re-renders</li>
							<li>Does NOT trigger re-renders when changed</li>
							<li>Good for DOM references</li>
							<li>Good for storing mutable values</li>
						</ul>
					</div>
					<div>
						<h5>🔄 useState characteristics:</h5>
						<ul style={{ fontSize: "0.9em" }}>
							<li>Immutable state value</li>
							<li>Persists across re-renders</li>
							<li>DOES trigger re-renders when changed</li>
							<li>Good for UI state</li>
							<li>Good for reactive data</li>
						</ul>
					</div>
				</div>
			</div>
		</div>
	);
}

export default RefDemo; 