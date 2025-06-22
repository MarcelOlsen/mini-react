import { useState, Fragment } from 'mini-react';

function TodoList() {
  const [todos, setTodos] = useState([
    { id: 1, text: 'Learn MiniReact', completed: false },
    { id: 2, text: 'Build something awesome', completed: false },
    { id: 3, text: 'Share with the world', completed: false }
  ]);
  const [newTodo, setNewTodo] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'active', 'completed'

  const addTodo = () => {
    if (newTodo.trim()) {
      const newId = Math.max(...todos.map(t => t.id), 0) + 1;
      setTodos([...todos, {
        id: newId,
        text: newTodo.trim(),
        completed: false
      }]);
      setNewTodo('');
    }
  };

  const toggleTodo = (id) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const deleteTodo = (id) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  const clearCompleted = () => {
    setTodos(todos.filter(todo => !todo.completed));
  };

  // Filter todos based on current filter
  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true; // 'all'
  });

  const activeTodosCount = todos.filter(todo => !todo.completed).length;
  const completedTodosCount = todos.filter(todo => todo.completed).length;

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      addTodo();
    }
  };

  return (
    <div className="todo-list">
      {/* Add new todo */}
      <div className="add-todo">
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="What needs to be done?"
        />
        <button type="button" onClick={addTodo}>
          Add Todo
        </button>
      </div>

      {/* Filter buttons */}
      <div style={{ margin: '15px 0' }}>
        <button
          type="button"
          onClick={() => setFilter('all')}
          style={{
            margin: '0 5px',
            background: filter === 'all' ? '#007bff' : '#f8f9fa',
            color: filter === 'all' ? 'white' : '#212529'
          }}
        >
          All ({todos.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('active')}
          style={{
            margin: '0 5px',
            background: filter === 'active' ? '#007bff' : '#f8f9fa',
            color: filter === 'active' ? 'white' : '#212529'
          }}
        >
          Active ({activeTodosCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter('completed')}
          style={{
            margin: '0 5px',
            background: filter === 'completed' ? '#007bff' : '#f8f9fa',
            color: filter === 'completed' ? 'white' : '#212529'
          }}
        >
          Completed ({completedTodosCount})
        </button>
      </div>

      {/* Todo items - demonstrating key prop for reconciliation */}
      {filteredTodos.length > 0 ? (
        <Fragment>
          {filteredTodos.map(todo => (
            <div
              key={todo.id}
              className={`todo-item ${todo.completed ? 'completed' : ''}`}
            >
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => toggleTodo(todo.id)}
              />
              <span style={{ flex: 1 }}>{todo.text}</span>
              <button
                type="button"
                onClick={() => deleteTodo(todo.id)}
                style={{
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  padding: '5px 10px',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </Fragment>
      ) : (
        <p style={{ textAlign: 'center', color: '#666', fontStyle: 'italic' }}>
          {filter === 'all' 
            ? 'No todos yet. Add one above!' 
            : `No ${filter} todos.`
          }
        </p>
      )}

      {/* Actions */}
      {completedTodosCount > 0 && (
        <div style={{ marginTop: '15px', textAlign: 'center' }}>
          <button
            type="button"
            onClick={clearCompleted}
            style={{
              background: '#ffc107',
              color: '#212529',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Clear Completed ({completedTodosCount})
          </button>
        </div>
      )}

      {/* Summary */}
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
        <strong>Summary:</strong> {activeTodosCount} active, {completedTodosCount} completed, {todos.length} total
      </div>
    </div>
  );
}

export default TodoList; 