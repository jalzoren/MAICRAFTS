import React from 'react';
import '../../css/StockHistoryModal.css';

const StockHistoryModal = ({ isOpen, onClose, history, productName }) => {
  if (!isOpen) return null;

  return (
    <div className="history-modal-overlay" onClick={onClose}>
      <div className="history-modal" onClick={(e) => e.stopPropagation()}>
        <div className="history-modal-header">
          <h3>Stock History - {productName || 'Product'}</h3>
          <button className="history-close-btn" onClick={onClose}>✕</button>
        </div>
        
        <div className="history-modal-body">
          {history.length === 0 ? (
            <div className="history-empty-state">
              <p>No stock history found for this product.</p>
            </div>
          ) : (
            <div className="history-table-container">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Quantity Change</th>
                    <th>Running Total</th>
                    <th>Reason</th>
                    <th>Admin</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((record, index) => (
                    <tr key={record.id || index}>
                      <td>{new Date(record.date).toLocaleString()}</td>
                      <td className={record.quantityChange > 0 ? 'positive-change' : 'negative-change'}>
                        {record.quantityChange > 0 ? `+${record.quantityChange}` : record.quantityChange}
                      </td>
                      <td>{record.runningTotal}</td>
                      <td>{record.reason || 'Stock adjustment'}</td>
                      <td>{record.admin || 'System'}</td>
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