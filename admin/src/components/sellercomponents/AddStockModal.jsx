// AddStockModal.js
import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import '../../css/AddStockModal.css';

const AddStockModal = ({ isOpen, onClose, onSubmit, productName }) => {
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setQuantity('');
      setReason('');
      setLoading(false);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!quantity || parseInt(quantity) <= 0) {
      Swal.fire({
        title: 'Invalid Quantity',
        text: 'Please enter a valid quantity greater than 0',
        icon: 'warning',
        confirmButtonColor: '#E6BB71'
      });
      return;
    }
    
    setLoading(true);
    try {
      await onSubmit({ quantity: parseInt(quantity), reason });
      setQuantity('');
      setReason('');
    } catch (error) {
      console.error('Error adding stock:', error);
      Swal.fire({
        title: 'Error!',
        text: error.message || 'Failed to add stock',
        icon: 'error',
        confirmButtonColor: '#E6BB71'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      handleSubmit();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="addstock-modal-overlay" onClick={onClose}>
      <div className="addstock-modal" onClick={(e) => e.stopPropagation()}>
        <div className="addstock-modal-header">
          <h3>Add Stock - {productName || 'Product'}</h3>
          <button className="addstock-close-btn" onClick={onClose}>✕</button>
        </div>
        
        <div className="addstock-modal-body">
          <div className="addstock-form-group">
            <label>Quantity to Add *</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter quantity"
              min="1"
              step="1"
              autoFocus
              disabled={loading}
            />
          </div>
          
          <div className="addstock-form-group">
            <label>Reason (Optional)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Why are you adding stock? (e.g., Restock, New shipment, etc.)"
              rows="3"
              disabled={loading}
            />
            <small className="reason-hint">This will appear in stock history for tracking purposes</small>
          </div>
        </div>
        
        <div className="addstock-modal-footer">
          <button className="addstock-cancel-btn" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="addstock-submit-btn" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Adding Stock...' : 'Add Stock'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddStockModal;