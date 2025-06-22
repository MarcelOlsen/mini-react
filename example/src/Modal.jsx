import { createPortal } from 'mini-react';

function Modal({ children, isOpen, onClose }) {
  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    // Close modal when clicking on overlay (not on modal content)
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleEscapeKey = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // This demonstrates how portals work with MiniReact
  // The modal content is rendered outside the normal component hierarchy
  return createPortal(
    <div 
      className="modal-overlay" 
      onClick={handleOverlayClick}
      onKeyDown={handleEscapeKey}
      tabIndex="-1"
      style={{ outline: 'none' }}
    >
      <div className="modal" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <div /> {/* Spacer */}
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '5px',
              borderRadius: '3px'
            }}
            title="Close modal (ESC)"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.getElementById('modal-root') // Portal target
  );
}

export default Modal; 