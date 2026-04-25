// src/pages/seller/Products.jsx
import React, { useState, useEffect } from 'react';
import '../../css/Products.css';

const Products = () => {
  const [showModal, setShowModal] = useState(false);
  const [products, setProducts] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    category: 'Category',
    status: 'Status',
    search: ''
  });
  const [stats, setStats] = useState({
    total: 0,
    inStock: 0,
    lowStock: 0,
    outOfStock: 0
  });
  
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    stock: 0
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchStats();
  }, [filters]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      let url = 'http://localhost:5000/api/products';
      const params = new URLSearchParams();
      if (filters.category && filters.category !== 'Category') params.append('category', filters.category);
      if (filters.status && filters.status !== 'Status') params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      if (params.toString()) url += `?${params}`;

      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setProducts(data.data || []);
        updateStats(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      alert('Cannot connect to backend server');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/products/stats/summary');
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const updateStats = (productsData) => {
    const total = productsData.length;
    const inStock = productsData.filter(p => p.status === 'IN STOCK').length;
    const lowStock = productsData.filter(p => p.status === 'LOW STOCK').length;
    const outOfStock = productsData.filter(p => p.status === 'OUT OF STOCK').length;
    setStats({ total, inStock, lowStock, outOfStock });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        alert('Please upload a valid image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleAddProduct = async () => {
    if (!newProduct.name.trim()) {
      alert('Please enter product name');
      return;
    }
    if (!newProduct.price || newProduct.price <= 0) {
      alert('Please enter valid price');
      return;
    }
    if (!newProduct.category) {
      alert('Please select a category');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('name', newProduct.name.trim());
      formData.append('description', newProduct.description.trim());
      formData.append('price', newProduct.price);
      formData.append('stock', newProduct.stock || 0);
      formData.append('category', newProduct.category);
      if (imageFile) formData.append('image', imageFile);

      const response = await fetch('http://localhost:5000/api/products', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();

      if (data.success) {
        await fetchProducts();
        await fetchStats();
        resetForm();
        setShowModal(false);
        alert('Product added successfully!');
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Error adding product');
    } finally {
      setUploading(false);
    }
  };

  const updateStock = async (productId, currentStock, change) => {
    const newStock = Math.max(0, currentStock + change);
    try {
      const response = await fetch(`http://localhost:5000/api/products/${productId}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ change })
      });
      const data = await response.json();
      if (data.success) {
        await fetchProducts();
        await fetchStats();
      }
    } catch (error) {
      console.error('Error updating stock:', error);
      alert('Error updating stock');
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      const response = await fetch(`http://localhost:5000/api/products/${productId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        await fetchProducts();
        await fetchStats();
        alert('Product deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Error deleting product');
    }
  };

  const handleArchive = async () => {
    if (selectedRows.length === 0) {
      alert('Please select products to archive');
      return;
    }
    if (!window.confirm(`Archive ${selectedRows.length} product(s)?`)) return;
    try {
      const response = await fetch('http://localhost:5000/api/products/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: selectedRows })
      });
      const data = await response.json();
      if (data.success) {
        await fetchProducts();
        await fetchStats();
        setSelectedRows([]);
        alert('Products archived successfully!');
      }
    } catch (error) {
      console.error('Error archiving products:', error);
      alert('Error archiving products');
    }
  };

  const resetForm = () => {
    setNewProduct({ name: '', description: '', price: '', category: '', stock: 0 });
    setImageFile(null);
    setImagePreview(null);
  };

  const handleFilterChange = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));
  const handleSearch = (e) => setFilters(prev => ({ ...prev, search: e.target.value }));

  const allChecked = products.length > 0 && selectedRows.length === products.length;
  const toggleAll = () => setSelectedRows(allChecked ? [] : products.map(p => p.id));
  const toggleRow = (id) => setSelectedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);

  return (
    <div className="pm-container">
      <div className="pm-page-header">
        <h1 className="pm-title">Product Management</h1>
        <p className="pm-breadcrumb">Seller Dashboard / Product Management</p>
      </div>

      <div className="pm-stats-row">
        <div className="pm-stat-card">
          <div className="pm-stat-info">
            <span className="pm-stat-label">TOTAL PRODUCTS</span>
            <span className="pm-stat-value">{stats.total}</span>
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
            <span className="pm-stat-value">{stats.inStock}</span>
          </div>
          <div className="pm-stat-icon pm-icon-green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          </div>
        </div>
        <div className="pm-stat-card">
          <div className="pm-stat-info">
            <span className="pm-stat-label">LOW STOCK</span>
            <span className="pm-stat-value">{stats.lowStock}</span>
          </div>
          <div className="pm-stat-icon pm-icon-orange">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 8v4l3 3M12 16h.01"/>
              <circle cx="12" cy="12" r="10"/>
            </svg>
          </div>
        </div>
        <div className="pm-stat-card">
          <div className="pm-stat-info">
            <span className="pm-stat-label">OUT OF STOCK</span>
            <span className="pm-stat-value">{stats.outOfStock}</span>
          </div>
          <div className="pm-stat-icon pm-icon-red">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
        </div>
      </div>

      <div className="pm-controls">
        <button className="pm-btn-archive" onClick={handleArchive}>
          <span className="pm-archive-icon">▪</span> Archive ({selectedRows.length})
        </button>
        <div className="pm-controls-right">
          <select className="pm-select" value={filters.category} onChange={(e) => handleFilterChange('category', e.target.value)}>
            <option>Category</option>
            <option>Satin Flowers</option>
            <option>Dried Flowers</option>
            <option>Fresh Flowers</option>
            <option>Bouquets</option>
          </select>
          <select className="pm-select" value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)}>
            <option>Status</option>
            <option>IN STOCK</option>
            <option>LOW STOCK</option>
            <option>OUT OF STOCK</option>
          </select>
          <div className="pm-search-wrap">
            <svg className="pm-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" className="pm-search" placeholder="Search by Name, ID or Description..." value={filters.search} onChange={handleSearch} />
          </div>
          <button className="pm-btn-add" onClick={() => setShowModal(true)}>+ Add</button>
        </div>
      </div>

      <div className="pm-table-wrap">
        {loading ? (
          <div className="pm-loading">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="pm-empty">No products found</div>
        ) : (
          <table className="pm-table">
            <thead>
              <tr>
                <th className="pm-th pm-th-check"><input type="checkbox" checked={allChecked} onChange={toggleAll} /></th>
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
                <tr key={p.id}>
                  <td className="pm-td pm-td-check"><input type="checkbox" checked={selectedRows.includes(p.id)} onChange={() => toggleRow(p.id)} /></td>
                  <td className="pm-td pm-id">{p.id?.slice(0, 8)}...</td>
                  <td className="pm-td"><img src={p.image} alt={p.name} className="pm-product-img" /></td>
                  <td className="pm-td">{p.name}</td>
                  <td className="pm-td pm-desc">{p.description || '—'}</td>
                  <td className="pm-td">₱{p.price?.toFixed(2)}</td>
                  <td className="pm-td">
                    <div className="pm-stock-ctrl">
                      <button className="pm-stock-btn" onClick={() => updateStock(p.id, p.stock, 1)}>+</button>
                      <span className="pm-stock-val">{p.stock}</span>
                      <button className="pm-stock-btn" onClick={() => updateStock(p.id, p.stock, -1)}>−</button>
                    </div>
                  </td>
                  <td className="pm-td">
                    <span className={`pm-badge pm-badge-${p.status?.toLowerCase().replace(' ', '-')}`}>{p.status}</span>
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
                      <button className="pm-action-btn pm-delete" title="Delete" onClick={() => handleDeleteProduct(p.id)}>
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
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="pm-modal-overlay" onClick={() => { resetForm(); setShowModal(false); }}>
          <div className="pm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pm-modal-header">
              <span className="pm-modal-title"><span className="pm-modal-plus">+</span> ADD NEW PRODUCT</span>
              <button className="pm-modal-close" onClick={() => { resetForm(); setShowModal(false); }}>✕</button>
            </div>
            <div className="pm-modal-body">
              <div className="pm-modal-left">
                <div className="pm-field">
                  <label className="pm-label">Name of Product *</label>
                  <input type="text" className="pm-input" placeholder="Enter product name" value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} />
                </div>
                <div className="pm-field">
                  <label className="pm-label">Product Description</label>
                  <textarea className="pm-textarea" rows={4} placeholder="Enter product description" value={newProduct.description} onChange={(e) => setNewProduct({...newProduct, description: e.target.value})} />
                </div>
                <div className="pm-field">
                  <label className="pm-label">Price (₱) *</label>
                  <input type="number" className="pm-input" placeholder="0.00" step="0.01" value={newProduct.price} onChange={(e) => setNewProduct({...newProduct, price: e.target.value})} />
                </div>
                <div className="pm-field">
                  <label className="pm-label">Initial Stock</label>
                  <input type="number" className="pm-input" placeholder="0" value={newProduct.stock} onChange={(e) => setNewProduct({...newProduct, stock: e.target.value})} />
                </div>
              </div>
              <div className="pm-modal-right">
                <div className="pm-field">
                  <label className="pm-label">Category of Product *</label>
                  <select className="pm-input pm-select-modal" value={newProduct.category} onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}>
                    <option value="">Select Category</option>
                    <option>Satin Flowers</option>
                    <option>Dried Flowers</option>
                    <option>Fresh Flowers</option>
                    <option>Bouquets</option>
                  </select>
                </div>
                <div className="pm-field">
                  <label className="pm-label">Product Image</label>
                  <div className="pm-image-upload" onClick={() => document.getElementById('imageInput').click()}>
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="pm-image-preview" />
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" fill="currentColor" className="pm-img-icon">
                          <rect x="3" y="3" width="18" height="18" rx="2" fill="#1a1a1a"/>
                          <path d="M3 17l5-5 4 4 3-3 6 6" stroke="white" strokeWidth="1.5" fill="none"/>
                          <circle cx="8" cy="8" r="1.5" fill="white"/>
                        </svg>
                        <span className="pm-upload-text">Click to upload image</span>
                        <span className="pm-upload-hint">JPEG, PNG, WEBP, GIF (max 5MB)</span>
                      </>
                    )}
                    <input id="imageInput" type="file" accept="image/jpeg,image/jpg,image/png,image/webp,image/gif" style={{ display: 'none' }} onChange={handleImageChange} />
                  </div>
                </div>
              </div>
            </div>
            <div className="pm-modal-footer">
              <button className="pm-btn-cancel" onClick={() => { resetForm(); setShowModal(false); }}>Cancel</button>
              <button className="pm-btn-submit" onClick={handleAddProduct} disabled={uploading}>{uploading ? 'Adding Product...' : 'Add Product'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;