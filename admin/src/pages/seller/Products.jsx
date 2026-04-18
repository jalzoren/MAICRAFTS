// src/pages/staff/Products.jsx
import React, { useState } from 'react';
import '../../css/Products.css';

/* ── Sample Data ── */
const sampleProducts = [
  {
    id: 'P001',
    image: 'https://via.placeholder.com/56x56/c8a97d/fff?text=🌸',
    name: 'Product Name',
    description: 'Lorem Ipsum Dolor Keme Bum Bum',
    price: 499.0,
    stock: 10,
    status: 'LOW STOCK',
    category: 'Satin Flowers',
  },
];

const Products = () => {
  const [showModal, setShowModal]     = useState(false);
  const [products]                    = useState(sampleProducts);
  const [selectedRows, setSelectedRows] = useState([]);

  /* select-all checkbox */
  const allChecked = products.length > 0 && selectedRows.length === products.length;
  const toggleAll  = () =>
    setSelectedRows(allChecked ? [] : products.map((p) => p.id));
  const toggleRow  = (id) =>
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );

  return (
    <div className="pm-container">
      {/* ── Page Header ── */}
      <div className="pm-page-header">
        <h1 className="pm-title">Product Management</h1>
        <p className="pm-breadcrumb">Seller Dashboard / Product Management</p>
      </div>

      {/* ── Stat Cards ── */}
      <div className="pm-stats-row">
        <div className="pm-stat-card">
          <div className="pm-stat-info">
            <span className="pm-stat-label">TOTAL PRODUCTS</span>
            <span className="pm-stat-value">130</span>
          </div>
          <div className="pm-stat-icon pm-icon-blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 01-8 0"/>
            </svg>
          </div>
        </div>
        <div className="pm-stat-card">
          <div className="pm-stat-info">
            <span className="pm-stat-label">IN STOCK</span>
            <span className="pm-stat-value">100</span>
          </div>
          <div className="pm-stat-icon pm-icon-blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 01-8 0"/>
            </svg>
          </div>
        </div>
        <div className="pm-stat-card">
          <div className="pm-stat-info">
            <span className="pm-stat-label">LOW STOCK</span>
            <span className="pm-stat-value">20</span>
          </div>
          <div className="pm-stat-icon pm-icon-orange">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 01-8 0"/>
            </svg>
          </div>
        </div>
        <div className="pm-stat-card">
          <div className="pm-stat-info">
            <span className="pm-stat-label">OUT OF STOCK</span>
            <span className="pm-stat-value">10</span>
          </div>
          <div className="pm-stat-icon pm-icon-blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 01-8 0"/>
            </svg>
          </div>
        </div>
      </div>

      {/* ── Controls Row ── */}
      <div className="pm-controls">
        <button className="pm-btn-archive">
          <span className="pm-archive-icon">▪</span> Archive
        </button>
        <div className="pm-controls-right">
          <select className="pm-select">
            <option>Category</option>
            <option>Satin Flowers</option>
            <option>Dried Flowers</option>
          </select>
          <select className="pm-select">
            <option>Status</option>
            <option>In Stock</option>
            <option>Low Stock</option>
            <option>Out of Stock</option>
          </select>
          <div className="pm-search-wrap">
            <svg className="pm-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              className="pm-search"
              placeholder="Search by Order ID, Customer Name..."
            />
          </div>
          <button className="pm-btn-add" onClick={() => setShowModal(true)}>
            + Add
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="pm-table-wrap">
        <table className="pm-table">
          <thead>
            <tr className="pm-thead-row">
              <th className="pm-th pm-th-check">
                <input type="checkbox" checked={allChecked} onChange={toggleAll} />
              </th>
              <th className="pm-th">Product ID</th>
              <th className="pm-th">Image</th>
              <th className="pm-th">Name</th>
              <th className="pm-th">Description</th>
              <th className="pm-th">Price</th>
              <th className="pm-th">Stock</th>
              <th className="pm-th">Status</th>
              <th className="pm-th">Category</th>
              <th className="pm-th">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="pm-row">
                <td className="pm-td pm-td-check">
                  <input
                    type="checkbox"
                    checked={selectedRows.includes(p.id)}
                    onChange={() => toggleRow(p.id)}
                  />
                </td>
                <td className="pm-td pm-id">{p.id}</td>
                <td className="pm-td">
                  <img src={p.image} alt={p.name} className="pm-product-img" />
                </td>
                <td className="pm-td">{p.name}</td>
                <td className="pm-td pm-desc">{p.description}</td>
                <td className="pm-td">{p.price.toFixed(2)}</td>
                <td className="pm-td">
                  <div className="pm-stock-ctrl">
                    <button className="pm-stock-btn">+</button>
                    <span className="pm-stock-val">{p.stock}</span>
                    <button className="pm-stock-btn">−</button>
                  </div>
                </td>
                <td className="pm-td">
                  <span className={`pm-badge pm-badge-${p.status.toLowerCase().replace(' ', '-')}`}>
                    {p.status}
                  </span>
                </td>
                <td className="pm-td">{p.category}</td>
                <td className="pm-td">
                  <div className="pm-actions">
                    <button className="pm-action-btn pm-edit" title="Edit">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button className="pm-action-btn pm-delete" title="Delete">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6"/>
                        <path d="M9 6V4h6v2"/>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {/* Empty filler rows */}
            {[...Array(4)].map((_, i) => (
              <tr key={`empty-${i}`} className="pm-row pm-row-empty">
                <td colSpan="10">&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Add Product Modal ── */}
      {showModal && (
        <div className="pm-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="pm-modal" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="pm-modal-header">
              <span className="pm-modal-title">
                <span className="pm-modal-plus">+</span> ADD NEW PRODUCT
              </span>
              <button className="pm-modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            {/* Modal Body */}
            <div className="pm-modal-body">
              <div className="pm-modal-left">
                <div className="pm-field">
                  <label className="pm-label">Name of Product</label>
                  <input type="text" className="pm-input" />
                </div>
                <div className="pm-field">
                  <label className="pm-label">Product Description</label>
                  <textarea className="pm-textarea" rows={4} />
                </div>
                <div className="pm-field">
                  <label className="pm-label">Price</label>
                  <input type="number" className="pm-input" />
                </div>
              </div>

              <div className="pm-modal-right">
                <div className="pm-field">
                  <label className="pm-label">Category of Product</label>
                  <select className="pm-input pm-select-modal">
                    <option value=""></option>
                    <option>Satin Flowers</option>
                    <option>Dried Flowers</option>
                  </select>
                </div>
                <div className="pm-field">
                  <label className="pm-label">Product Image</label>
                  <div className="pm-image-upload">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="pm-img-icon">
                      <rect x="3" y="3" width="18" height="18" rx="2" fill="#1a1a1a"/>
                      <path d="M3 17l5-5 4 4 3-3 6 6" stroke="white" strokeWidth="1.5" fill="none"/>
                      <circle cx="8" cy="8" r="1.5" fill="white"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pm-modal-footer">
              <button className="pm-btn-cancel" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="pm-btn-submit">Add Product</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;