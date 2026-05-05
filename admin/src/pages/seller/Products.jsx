import React, { useState, useEffect } from 'react';
import { FiEdit2, FiPlusCircle, FiClock, FiTrash2, FiArchive, FiSearch } from 'react-icons/fi';
import { MdOutlineRemoveCircle } from 'react-icons/md';
import { FaBoxes, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import ProductModal from '../../components/sellercomponents/ProductModal';
import StockHistoryModal from '../../components/sellercomponents/StockHistoryModal';
import AddStockModal from '../../components/sellercomponents/AddStockModal';
import Swal from 'sweetalert2';
import '../../css/Products.css';
import { useAuth } from "../../context/AuthContext";

// Helper function to get auth headers
const getAuthHeaders = () => {
  try {
    const sessionData = localStorage.getItem('mc_session');
    if (!sessionData) return {};
    
    const session = JSON.parse(sessionData);
    const token = session.user?.access_token;
    
    if (!token) {
      console.warn('No access token found in session');
      return {};
    }
    
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  } catch (error) {
    console.error('Error getting auth headers:', error);
    return {};
  }
};

// Update fetchProducts to include headers
const fetchProducts = async () => {
  setLoading(true);
  try {
    let url = 'http://localhost:5000/api/products';
    const params = new URLSearchParams();
    if (filters.category && filters.category !== '') params.append('category', filters.category);
    if (filters.status && filters.status !== '') params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);
    if (params.toString()) url += `?${params}`;

    const headers = getAuthHeaders();
    console.log('Request headers:', headers);
    
    const response = await fetch(url, {
      headers: headers
    });
    const data = await response.json();
    
    if (data.success) {
      setProducts(data.data || []);
    }
  } catch (error) {
    console.error('Error fetching products:', error);
  } finally {
    setLoading(false);
  }
};

// Update handleAddProduct to include token in FormData
const handleAddProduct = async (formData) => {
  try {
    const sessionData = localStorage.getItem('mc_session');
    if (!sessionData) {
      throw new Error('No session found. Please login again.');
    }
    
    const session = JSON.parse(sessionData);
    const token = session.user?.access_token;
    
    if (!token) {
      throw new Error('No authentication token found. Please login again.');
    }
    
    console.log('Sending request with token:', token.substring(0, 20) + '...');
    
    const response = await fetch('http://localhost:5000/api/products', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
        // Don't set Content-Type for FormData - browser will set it with boundary
      },
      body: formData
    });
    
    const data = await response.json();
    console.log('Server response:', data);
    
    if (data.success) {
      await fetchProducts();
      await fetchStats();
      Swal.fire({
        title: 'Success!',
        text: 'Product added successfully!',
        icon: 'success',
        confirmButtonColor: '#E6BB71',
        timer: 1500
      });
      return data;
    } else {
      throw new Error(data.error || 'Failed to add product');
    }
  } catch (error) {
    console.error('Error adding product:', error);
    Swal.fire({
      title: 'Error!',
      text: error.message || 'Error adding product',
      icon: 'error',
      confirmButtonColor: '#E6BB71'
    });
    throw error;
  }
};


const Products = () => {
  const auth = useAuth();
  const user = auth?.user;
  const [showModal, setShowModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    category: '',
    status: '',
    search: ''
  });
  const [stats, setStats] = useState({
    total: 0,
    inStock: 0,
    lowStock: 0,
    outOfStock: 0
  });
  const [stockHistory, setStockHistory] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchProducts();
    fetchStats();
    fetchCategories();
  }, [filters]);

  // Update your fetch calls to include headers
  const fetchProducts = async () => {
    setLoading(true);
    try {
      let url = 'http://localhost:5000/api/products';
      const params = new URLSearchParams();
      if (filters.category && filters.category !== '') params.append('category', filters.category);
      if (filters.status && filters.status !== '') params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      if (params.toString()) url += `?${params}`;
  
      const headers = getAuthHeaders();
      console.log('Request headers:', headers);
      
      const response = await fetch(url, {
        headers: headers
      });
      const data = await response.json();
      
      if (data.success) {
        setProducts(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
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

  const fetchCategories = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/categories');
      const data = await response.json();
      if (data.success && data.data) {
        setCategories(data.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };


  // Update handleAddProduct to include auth token
// Update handleAddProduct to include token in FormData
const handleAddProduct = async (formData) => {
  try {
    const sessionData = localStorage.getItem('mc_session');
    if (!sessionData) {
      throw new Error('No session found. Please login again.');
    }
    
    const session = JSON.parse(sessionData);
    const token = session.user?.access_token;
    
    if (!token) {
      throw new Error('No authentication token found. Please login again.');
    }
    
    console.log('Sending request with token:', token.substring(0, 20) + '...');
    
    const response = await fetch('http://localhost:5000/api/products', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
        // Don't set Content-Type for FormData - browser will set it with boundary
      },
      body: formData
    });
    
    const data = await response.json();
    console.log('Server response:', data);
    
    if (data.success) {
      await fetchProducts();
      await fetchStats();
      Swal.fire({
        title: 'Success!',
        text: 'Product added successfully!',
        icon: 'success',
        confirmButtonColor: '#E6BB71',
        timer: 1500
      });
      return data;
    } else {
      throw new Error(data.error || 'Failed to add product');
    }
  } catch (error) {
    console.error('Error adding product:', error);
    Swal.fire({
      title: 'Error!',
      text: error.message || 'Error adding product',
      icon: 'error',
      confirmButtonColor: '#E6BB71'
    });
    throw error;
  }
};

  const handleEditProduct = async (productId, formData) => {
    try {
      const response = await fetch(`http://localhost:5000/api/products/${productId}`, {
        method: 'PUT',
        body: formData
      });
      const data = await response.json();

      if (data.success) {
        await fetchProducts();
        await fetchStats();
        Swal.fire({
          title: 'Success!',
          text: 'Product updated successfully!',
          icon: 'success',
          confirmButtonColor: '#E6BB71',
          timer: 1500
        });
        return data;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error updating product:', error);
      Swal.fire({
        title: 'Error!',
        text: 'Error updating product',
        icon: 'error',
        confirmButtonColor: '#E6BB71'
      });
      throw error;
    }
  };

  const updateStock = async (productId, change, reason = '') => {
    try {
      console.log('Updating stock for product:', productId, 'Change:', change);
      
      const response = await fetch(`http://localhost:5000/api/products/${productId}/stock`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ change, reason })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Stock update response:', data);
      
      if (data.success) {
        // Force refresh products to get updated stock
        await fetchProducts();
        await fetchStats();
        return true;
      }
      throw new Error(data.error || 'Failed to update stock');
    } catch (error) {
      console.error('Error updating stock:', error);
      throw error;
    }
  };

  const handleDeleteProduct = async (productId) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'You won\'t be able to revert this!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#E6BB71',
      confirmButtonText: 'Yes, delete it!'
    });
    
    if (!result.isConfirmed) return;
    
    try {
      const response = await fetch(`http://localhost:5000/api/products/${productId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        await fetchProducts();
        await fetchStats();
        Swal.fire({
          title: 'Deleted!',
          text: 'Product deleted successfully!',
          icon: 'success',
          confirmButtonColor: '#E6BB71',
          timer: 1500
        });
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      Swal.fire({
        title: 'Error!',
        text: 'Error deleting product',
        icon: 'error',
        confirmButtonColor: '#E6BB71'
      });
    }
  };

  const handleArchive = async () => {
    if (selectedRows.length === 0) {
      Swal.fire({
        title: 'No Selection',
        text: 'Please select products to archive',
        icon: 'warning',
        confirmButtonColor: '#E6BB71'
      });
      return;
    }
    
    const result = await Swal.fire({
      title: 'Archive Products?',
      text: `Archive ${selectedRows.length} product(s)?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#E6BB71',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, archive them!'
    });
    
    if (!result.isConfirmed) return;
    
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
        Swal.fire({
          title: 'Archived!',
          text: 'Products archived successfully!',
          icon: 'success',
          confirmButtonColor: '#E6BB71',
          timer: 1500
        });
      }
    } catch (error) {
      console.error('Error archiving products:', error);
      Swal.fire({
        title: 'Error!',
        text: 'Error archiving products',
        icon: 'error',
        confirmButtonColor: '#E6BB71'
      });
    }
  };

  const fetchStockHistory = async (productId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/products/${productId}/stock-history`);
      const data = await response.json();
      if (data.success) {
        setStockHistory(data.data);
        setShowHistoryModal(true);
      }
    } catch (error) {
      console.error('Error fetching stock history:', error);
      Swal.fire({
        title: 'Error!',
        text: 'Error fetching stock history',
        icon: 'error',
        confirmButtonColor: '#E6BB71'
      });
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = (e) => {
    setFilters(prev => ({ ...prev, search: e.target.value }));
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      status: '',
      search: ''
    });
  };

  const allChecked = products.length > 0 && selectedRows.length === products.length;
  const toggleAll = () => setSelectedRows(allChecked ? [] : products.map(p => p.id));
  const toggleRow = (id) => setSelectedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);

  const getStatusBadgeClass = (status) => {
    switch(status) {
      case 'IN STOCK':
        return 'pm-badge-in-stock';
      case 'LOW STOCK':
        return 'pm-badge-low-stock';
      case 'OUT OF STOCK':
        return 'pm-badge-out-of-stock';
      default:
        return 'pm-badge-in-stock';
    }
  };

  const handleAddStockSubmit = async ({ quantity, reason }) => {
    try {
      await updateStock(selectedProduct.id, quantity, reason);
      Swal.fire({
        title: 'Success!',
        text: `Added ${quantity} stock successfully!`,
        icon: 'success',
        confirmButtonColor: '#E6BB71',
        timer: 1500
      });
      setShowAddStockModal(false);
      setSelectedProduct(null);
    } catch (error) {
      console.error('Error in handleAddStockSubmit:', error);
      Swal.fire({
        title: 'Error!',
        text: error.message || 'Error adding stock. Please try again.',
        icon: 'error',
        confirmButtonColor: '#E6BB71'
      });
    }
  };

  return (
    <div className="pm-container">
      <div className="pm-page-header">
        <h1 className="pm-title">Product Management</h1>
        <p className="pm-breadcrumb">Dashboard / Product Management</p>
      </div>

      <div className="pm-stats-row">
        <div className="pm-stat-card">
          <div className="pm-stat-info">
            <span className="pm-stat-label">TOTAL PRODUCTS</span>
            <span className="pm-stat-value">{stats.total}</span>
          </div>
          <div className="pm-stat-icon pm-icon-blue">
            <FaBoxes size={22} />
          </div>
        </div>
        <div className="pm-stat-card">
          <div className="pm-stat-info">
            <span className="pm-stat-label">IN STOCK</span>
            <span className="pm-stat-value">{stats.inStock}</span>
          </div>
          <div className="pm-stat-icon pm-icon-green">
            <FaCheckCircle size={22} />
          </div>
        </div>
        <div className="pm-stat-card">
          <div className="pm-stat-info">
            <span className="pm-stat-label">LOW STOCK</span>
            <span className="pm-stat-value">{stats.lowStock}</span>
          </div>
          <div className="pm-stat-icon pm-icon-orange">
            <FaExclamationTriangle size={22} />
          </div>
        </div>
        <div className="pm-stat-card">
          <div className="pm-stat-info">
            <span className="pm-stat-label">OUT OF STOCK</span>
            <span className="pm-stat-value">{stats.outOfStock}</span>
          </div>
          <div className="pm-stat-icon pm-icon-red">
            <MdOutlineRemoveCircle size={22} />
          </div>
        </div>
      </div>

      <div className="pm-controls">
        <button className="pm-btn-archive" onClick={handleArchive}>
          <FiArchive size={16} />
          <span>Archive Selected ({selectedRows.length})</span>
        </button>
        <div className="pm-controls-right">
        <select 
          className="pm-select" 
          value={filters.category} 
          onChange={(e) => handleFilterChange('category', e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat.name} value={cat.name}>
              {cat.name} ({cat.count})
            </option>
          ))}
        </select>
          
          <select 
            className="pm-select" 
            value={filters.status} 
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="">All Status</option>
            <option value="IN STOCK">In Stock</option>
            <option value="LOW STOCK">Low Stock</option>
            <option value="OUT OF STOCK">Out of Stock</option>
          </select>
          
          <div className="pm-search-wrap">
            <FiSearch className="pm-search-icon" size={16} />
            <input 
              type="text" 
              className="pm-search" 
              placeholder="Search by name, ID or description..." 
              value={filters.search} 
              onChange={handleSearch} 
            />
          </div>
          
          {(filters.category || filters.status || filters.search) && (
            <button className="pm-btn-clear" onClick={clearFilters}>
              Clear Filters
            </button>
          )}
          
          <button className="pm-btn-add" onClick={() => {
            setSelectedProduct(null);
            setShowModal(true);
          }}>
            + Add New Product
          </button>
        </div>
      </div>

      <div className="pm-table-wrap">
        {loading ? (
          <div className="pm-loading-state">
            <div className="pm-spinner"></div>
            <p>Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="pm-empty-state">
            <p>No products found</p>
            <button className="pm-btn-add" onClick={() => {
              setSelectedProduct(null);
              setShowModal(true);
            }}>+ Add Your First Product</button>
          </div>
        ) : (
          <table className="pm-table">
            <thead>
              <tr className="pm-thead-row">
                <th className="pm-th pm-th-check">
                  <input type="checkbox" checked={allChecked} onChange={toggleAll} />
                </th>
                <th className="pm-th">ID</th>
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
              {products.map((product) => (
                <tr key={product.id} className="pm-row">
                  <td className="pm-td pm-td-check">
                    <input 
                      type="checkbox" 
                      checked={selectedRows.includes(product.id)} 
                      onChange={() => toggleRow(product.id)} 
                    />
                  </td>
                  <td className="pm-td pm-id">{product.id?.slice(0, 8)}...</td>
                  <td className="pm-td">
                    <img 
                      src={product.mainImage || product.image} 
                      alt={product.name} 
                      className="pm-product-img" 
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/120x120/c8a97d/fff?text=🌸';
                      }}
                    />
                  </td>
                  <td className="pm-td">{product.name}</td>
                  <td className="pm-td pm-desc">{product.description?.substring(0, 60) || '—'}</td>
                  <td className="pm-td">₱{Number(product.price).toFixed(2)}</td>
                  <td className="pm-td">
                    <div className="pm-stock-display">
                      {product.stock}
                    </div>
                  </td>
                  <td className="pm-td">
                    <span className={`pm-badge ${getStatusBadgeClass(product.status)}`}>
                      {product.status}
                    </span>
                  </td>
                  <td className="pm-td">{product.category}</td>
                  <td className="pm-td">
                    <div className="pm-actions">
                      <button 
                        className="pm-action-btn pm-edit" 
                        title="Edit Product" 
                        onClick={() => {
                          setSelectedProduct(product);
                          setShowModal(true);
                        }}
                      >
                        <FiEdit2 size={16} />
                      </button>
                      <button 
                        className="pm-action-btn pm-add-stock" 
                        title="Add Stock" 
                        onClick={() => {
                          setSelectedProduct(product);
                          setShowAddStockModal(true);
                        }}
                      >
                        <FiPlusCircle size={16} />
                      </button>
                      <button 
                        className="pm-action-btn pm-history" 
                        title="View Stock History" 
                        onClick={() => {
                          setSelectedProduct(product);
                          fetchStockHistory(product.id);
                        }}
                      >
                        <FiClock size={16} />
                      </button>
                      <button 
                        className="pm-action-btn pm-delete" 
                        title="Delete Product" 
                        onClick={() => handleDeleteProduct(product.id)}
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ProductModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedProduct(null);
        }}
        onSubmit={(formData) => {
          if (selectedProduct) {
            return handleEditProduct(selectedProduct.id, formData);
          } else {
            return handleAddProduct(formData);
          }
        }}
        product={selectedProduct}
        isEditing={!!selectedProduct}
      />

      <StockHistoryModal
        isOpen={showHistoryModal}
        onClose={() => {
          setShowHistoryModal(false);
          setSelectedProduct(null);
          setStockHistory([]);
        }}
        history={stockHistory}
        productName={selectedProduct?.name}
      />

      <AddStockModal
        isOpen={showAddStockModal}
        onClose={() => {
          setShowAddStockModal(false);
          setSelectedProduct(null);
        }}
        onSubmit={handleAddStockSubmit}
        productName={selectedProduct?.name}
      />
    </div>
  );
};

export default Products;