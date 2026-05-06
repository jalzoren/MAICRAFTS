// StockHistoryModal.js
import React from 'react';
import '../../css/StockHistoryModal.css';

const StockHistoryModal = ({ isOpen, onClose, history, productName }) => {
  if (!isOpen) return null;

  // Safely handle history data - ensure it's an array
  const historyArray = Array.isArray(history) ? history : [];
  
  // Debug log the incoming data
  React.useEffect(() => {
    if (historyArray.length > 0) {
      console.log('📜 Stock History Modal Data:', historyArray);
      console.log('First record:', historyArray[0]);
    }
  }, [historyArray]);
  
  const formatDateTime = (dateString) => {
    try {
      if (!dateString) {
        console.warn('No date string provided');
        return 'N/A';
      }
      
      // Handle ISO string or timestamp
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid date:', dateString);
        return `Invalid: ${dateString}`;
      }
      
      return date.toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Error formatting date:', error, dateString);
      return 'Format Error';
    }
  };

  return (
    <div className="history-modal-overlay" onClick={onClose}>
      <div className="history-modal" onClick={(e) => e.stopPropagation()}>
        <div className="history-modal-header">
          <h3>Stock History Ledger - {productName || 'Product'}</h3>
          <button className="history-close-btn" onClick={onClose}>✕</button>
        </div>
        
        <div className="history-modal-body">
          {!historyArray || historyArray.length === 0 ? (
            <div className="history-empty-state">
              <p>No stock history found for this product.</p>
            </div>
          ) : (
            <div className="history-table-container">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Quantity Change</th>
                    <th>Running Total</th>
                    <th>Reason</th>
                    <th>By</th>
                  </tr>
                </thead>
                <tbody>
                  {historyArray.map((record, index) => (
                    <tr key={record.id || index} className={record.quantityChange > 0 ? 'history-row-positive' : 'history-row-negative'}>
                      <td className="history-date">{formatDateTime(record.date)}</td>
                      <td className={`history-change ${record.quantityChange > 0 ? 'positive-change' : 'negative-change'}`}>
                        {record.quantityChange > 0 ? `+${record.quantityChange}` : record.quantityChange}
                      </td>
                      <td className="history-running-total">
                        <strong>{record.runningTotal}</strong>
                      </td>
                      <td className="history-reason">{record.reason || 'Stock adjustment'}</td>
                      <td className="history-admin">{record.admin || 'System'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockHistoryModal;