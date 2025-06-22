import { useState, useEffect } from 'mini-react';

function Counter() {
  const [count, setCount] = useState(0);
  const [step, setStep] = useState(1);

  // Demo useEffect with dependency array
  useEffect(() => {
    console.log(`Counter value changed to: ${count}`);
  }, [count]);

  // Demo useEffect for cleanup
  useEffect(() => {
    const interval = setInterval(() => {
      console.log(`Current count: ${count}, step: ${step}`);
    }, 5000);

    return () => {
      clearInterval(interval);
      console.log('Counter interval cleared');
    };
  }, [count, step]);

  const increment = () => setCount(count + step);
  const decrement = () => setCount(count - step);
  const reset = () => setCount(0);

  return (
    <div className="counter">
      <h3>Count: {count}</h3>
      
      <div>
        <label>
          Step: 
          <input
            type="number"
            value={step}
            onChange={(e) => setStep(Number(e.target.value) || 1)}
            min="1"
            style={{ marginLeft: '8px', width: '60px' }}
          />
        </label>
      </div>
      
      <div style={{ marginTop: '15px' }}>
        <button type="button" onClick={decrement}>
          - {step}
        </button>
        
        <button type="button" onClick={reset} style={{ margin: '0 10px' }}>
          Reset
        </button>
        
        <button type="button" onClick={increment}>
          + {step}
        </button>
      </div>

      {/* Conditional rendering based on count */}
      {count > 10 ? (
        <p style={{ color: 'orange', marginTop: '10px' }}>
          🔥 You're on fire! Count is above 10!
        </p>
      ) : null}
      
      {count < 0 ? (
        <p style={{ color: 'red', marginTop: '10px' }}>
          📉 Negative territory!
        </p>
      ) : null}
      
      {count === 0 ? (
        <p style={{ color: 'blue', marginTop: '10px' }}>
          🎯 Back to zero!
        </p>
      ) : null}
    </div>
  );
}

export default Counter; 