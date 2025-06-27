import { useReducer, useState } from "mini-react";

// Shopping Cart Reducer
const cartReducer = (state, action) => {
	switch (action.type) {
		case 'ADD_ITEM': {
			const existingItem = state.items.find(item => item.id === action.payload.id);
			if (existingItem) {
				return {
					...state,
					items: state.items.map(item =>
						item.id === action.payload.id
							? { ...item, quantity: item.quantity + 1 }
							: item
					)
				};
			}
			return {
				...state,
				items: [...state.items, { ...action.payload, quantity: 1 }]
			};
		}

		case 'REMOVE_ITEM':
			return {
				...state,
				items: state.items.filter(item => item.id !== action.payload)
			};

		case 'UPDATE_QUANTITY':
			return {
				...state,
				items: state.items.map(item =>
					item.id === action.payload.id
						? { ...item, quantity: Math.max(0, action.payload.quantity) }
						: item
				).filter(item => item.quantity > 0)
			};

		case 'CLEAR_CART':
			return { ...state, items: [] };

		case 'APPLY_DISCOUNT':
			return {
				...state,
				discount: action.payload
			};

		default:
			return state;
	}
};

// Form Reducer
const formReducer = (state, action) => {
	switch (action.type) {
		case 'SET_FIELD':
			return {
				...state,
				values: { ...state.values, [action.field]: action.value },
				errors: { ...state.errors, [action.field]: '' }
			};

		case 'SET_ERROR':
			return {
				...state,
				errors: { ...state.errors, [action.field]: action.error }
			};

		case 'RESET_FORM':
			return {
				values: { name: '', email: '', age: '' },
				errors: {},
				isSubmitting: false
			};

		case 'SET_SUBMITTING':
			return { ...state, isSubmitting: action.payload };

		default:
			return state;
	}
};

function ReducerDemo() {
	// Shopping Cart using useReducer
	const [cartState, cartDispatch] = useReducer(cartReducer, {
		items: [],
		discount: 0
	});

	// Form using useReducer
	const [formState, formDispatch] = useReducer(formReducer, {
		values: { name: '', email: '', age: '' },
		errors: {},
		isSubmitting: false
	});

	// Simple counter for comparison
	const [simpleCount, setSimpleCount] = useState(0);

	// Available products
	const products = [
		{ id: 1, name: 'JavaScript Book', price: 29.99 },
		{ id: 2, name: 'React Course', price: 99.99 },
		{ id: 3, name: 'Coffee Mug', price: 12.99 },
		{ id: 4, name: 'Laptop Sticker', price: 4.99 }
	];

	// Cart calculations
	const subtotal = cartState.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
	const discountAmount = subtotal * (cartState.discount / 100);
	const total = subtotal - discountAmount;

	// Cart actions
	const addToCart = (product) => {
		cartDispatch({ type: 'ADD_ITEM', payload: product });
	};

	const removeFromCart = (productId) => {
		cartDispatch({ type: 'REMOVE_ITEM', payload: productId });
	};

	const updateQuantity = (productId, quantity) => {
		cartDispatch({ type: 'UPDATE_QUANTITY', payload: { id: productId, quantity } });
	};

	const clearCart = () => {
		cartDispatch({ type: 'CLEAR_CART' });
	};

	const applyDiscount = (discount) => {
		cartDispatch({ type: 'APPLY_DISCOUNT', payload: discount });
	};

	// Form actions
	const updateField = (field, value) => {
		formDispatch({ type: 'SET_FIELD', field, value });
	};

	const validateForm = () => {
		const { name, email, age } = formState.values;
		let isValid = true;

		if (!name.trim()) {
			formDispatch({ type: 'SET_ERROR', field: 'name', error: 'Name is required' });
			isValid = false;
		}

		if (!email.trim()) {
			formDispatch({ type: 'SET_ERROR', field: 'email', error: 'Email is required' });
			isValid = false;
		} else if (!/\S+@\S+\.\S+/.test(email)) {
			formDispatch({ type: 'SET_ERROR', field: 'email', error: 'Email is invalid' });
			isValid = false;
		}

		if (!age || age < 1 || age > 120) {
			formDispatch({ type: 'SET_ERROR', field: 'age', error: 'Age must be between 1 and 120' });
			isValid = false;
		}

		return isValid;
	};

	const submitForm = () => {
		if (validateForm()) {
			formDispatch({ type: 'SET_SUBMITTING', payload: true });
			// Simulate API call
			setTimeout(() => {
				alert('Form submitted successfully!');
				formDispatch({ type: 'RESET_FORM' });
			}, 1000);
		}
	};

	return (
		<div className="reducer-demo">
			<h3>useReducer Hook Demonstrations</h3>

			{/* Simple Counter vs Complex State Comparison */}
			<div style={{ marginBottom: "30px", padding: "15px", border: "1px solid #ccc", borderRadius: "5px" }}>
				<h4>useState vs useReducer Comparison</h4>
				<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
					<div>
						<h5>Simple State (useState)</h5>
						<p>Count: <strong>{simpleCount}</strong></p>
						<button type="button" onClick={() => setSimpleCount(simpleCount + 1)}>
							Increment
						</button>
						<button type="button" onClick={() => setSimpleCount(simpleCount - 1)} style={{ marginLeft: "10px" }}>
							Decrement
						</button>
					</div>
					<div>
						<h5>Complex State (useReducer)</h5>
						<p>Cart items: <strong>{cartState.items.length}</strong></p>
						<p>Total: <strong>${total.toFixed(2)}</strong></p>
						<p style={{ fontSize: "0.9em", color: "#666" }}>
							Managing multiple related state values with complex update logic
						</p>
					</div>
				</div>
			</div>

			{/* Shopping Cart Example */}
			<div style={{ marginBottom: "30px", padding: "15px", border: "1px solid #ccc", borderRadius: "5px" }}>
				<h4>1. Shopping Cart (Complex State Management)</h4>
				
				{/* Products */}
				<div style={{ marginBottom: "20px" }}>
					<h5>Available Products:</h5>
					<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px" }}>
						{products.map(product => (
							<div key={product.id} style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "3px" }}>
								<div><strong>{product.name}</strong></div>
								<div>${product.price}</div>
								<button 
									type="button" 
									onClick={() => addToCart(product)}
									style={{ marginTop: "5px", padding: "5px 10px" }}
								>
									Add to Cart
								</button>
							</div>
						))}
					</div>
				</div>

				{/* Cart */}
				<div style={{ marginBottom: "20px" }}>
					<h5>Shopping Cart:</h5>
					{cartState.items.length > 0 ? (
						<div>
							{cartState.items.map(item => (
								<div key={item.id} style={{ display: "flex", alignItems: "center", padding: "5px 0", borderBottom: "1px solid #eee" }}>
									<span style={{ flex: 1 }}>{item.name}</span>
									<span style={{ margin: "0 10px" }}>${item.price}</span>
									<input
										type="number"
										value={item.quantity}
										onChange={(e) => updateQuantity(item.id, Number.parseInt(e.target.value, 10) || 0)}
										style={{ width: "60px", margin: "0 10px" }}
										min="0"
									/>
									<button 
										type="button" 
										onClick={() => removeFromCart(item.id)}
										style={{ background: "#dc3545", color: "white", border: "none", padding: "5px 10px" }}
									>
										Remove
									</button>
								</div>
							))}
							
							<div style={{ marginTop: "15px", padding: "10px", backgroundColor: "#f8f9fa" }}>
								<div>Subtotal: ${subtotal.toFixed(2)}</div>
								{cartState.discount > 0 && <div>Discount ({cartState.discount}%): -${discountAmount.toFixed(2)}</div>}
								<div><strong>Total: ${total.toFixed(2)}</strong></div>
							</div>

							<div style={{ marginTop: "10px" }}>
								<button type="button" onClick={() => applyDiscount(10)} style={{ marginRight: "10px" }}>
									Apply 10% Discount
								</button>
								<button type="button" onClick={() => applyDiscount(0)} style={{ marginRight: "10px" }}>
									Remove Discount
								</button>
								<button type="button" onClick={clearCart} style={{ background: "#dc3545", color: "white" }}>
									Clear Cart
								</button>
							</div>
						</div>
					) : (
						<p style={{ fontStyle: "italic", color: "#666" }}>Your cart is empty</p>
					)}
				</div>
			</div>

			{/* Form Example */}
			<div style={{ padding: "15px", border: "1px solid #ccc", borderRadius: "5px" }}>
				<h4>2. Form with Validation (Complex State Updates)</h4>
				
				<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
					<div>
						<div style={{ marginBottom: "15px" }}>
							<label>
								Name:
								<input
									type="text"
									value={formState.values.name}
									onChange={(e) => updateField('name', e.target.value)}
									style={{ 
										display: "block", 
										width: "100%", 
										padding: "5px", 
										marginTop: "5px",
										borderColor: formState.errors.name ? "#dc3545" : "#ccc"
									}}
								/>
								{formState.errors.name && (
									<span style={{ color: "#dc3545", fontSize: "0.8em" }}>{formState.errors.name}</span>
								)}
							</label>
						</div>

						<div style={{ marginBottom: "15px" }}>
							<label>
								Email:
								<input
									type="email"
									value={formState.values.email}
									onChange={(e) => updateField('email', e.target.value)}
									style={{ 
										display: "block", 
										width: "100%", 
										padding: "5px", 
										marginTop: "5px",
										borderColor: formState.errors.email ? "#dc3545" : "#ccc"
									}}
								/>
								{formState.errors.email && (
									<span style={{ color: "#dc3545", fontSize: "0.8em" }}>{formState.errors.email}</span>
								)}
							</label>
						</div>

						<div style={{ marginBottom: "15px" }}>
							<label>
								Age:
								<input
									type="number"
									value={formState.values.age}
									onChange={(e) => updateField('age', Number.parseInt(e.target.value, 10) || '')}
									style={{ 
										display: "block", 
										width: "100%", 
										padding: "5px", 
										marginTop: "5px",
										borderColor: formState.errors.age ? "#dc3545" : "#ccc"
									}}
								/>
								{formState.errors.age && (
									<span style={{ color: "#dc3545", fontSize: "0.8em" }}>{formState.errors.age}</span>
								)}
							</label>
						</div>

						<button
							type="button"
							onClick={submitForm}
							disabled={formState.isSubmitting}
							style={{ 
								padding: "10px 20px", 
								marginRight: "10px",
								backgroundColor: formState.isSubmitting ? "#ccc" : "#007bff",
								color: "white",
								border: "none"
							}}
						>
							{formState.isSubmitting ? 'Submitting...' : 'Submit'}
						</button>

						<button
							type="button"
							onClick={() => formDispatch({ type: 'RESET_FORM' })}
							style={{ padding: "10px 20px" }}
						>
							Reset
						</button>
					</div>

					<div>
						<h5>Form State Debug:</h5>
						<pre style={{ 
							backgroundColor: "#f8f9fa", 
							padding: "10px", 
							fontSize: "0.8em",
							borderRadius: "3px",
							overflow: "auto"
						}}>
							{JSON.stringify({
								values: formState.values,
								errors: formState.errors,
								isSubmitting: formState.isSubmitting
							}, null, 2)}
						</pre>
					</div>
				</div>
			</div>
		</div>
	);
}

export default ReducerDemo; 