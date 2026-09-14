import React, { useEffect } from 'react';

/**
 * ConfirmationModal Component
 * Accessible institutional confirmation dialog for TT_TRACKER timetable replacement.
 */
export default function ConfirmationModal({
  isOpen,
  title = 'Replace Base Timetable',
  message = 'This will replace the current TT_TRACKER base timetable. Continue?',
  confirmText = 'Continue',
  cancelText = 'Cancel',
  isLoading = false,
  loadingMessage = 'Sending timetable to TT_TRACKER...',
  onConfirm,
  onCancel
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onCancel();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-dialog">
        <div className="modal-header">
          <h3 id="modal-title" className="modal-title">
            {title}
          </h3>
          {!isLoading && (
            <button
              type="button"
              className="modal-close-btn"
              onClick={onCancel}
              aria-label="Close dialog"
            >
              &times;
            </button>
          )}
        </div>

        <div className="modal-body">
          <p className="modal-message">{message}</p>
          {isLoading && (
            <div className="modal-loading-indicator">
              <span className="spinner-dot"></span>
              <span className="loading-text">{loadingMessage}</span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn-studio btn-secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className="btn-studio btn-primary"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? loadingMessage : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
