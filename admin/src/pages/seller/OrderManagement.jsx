// OrderManagement.jsx (Seller Dashboard - Order Management Page)
import React, { useState, useEffect } from "react";
import "../../css/OrderManagement.css";
import { useNavigate } from "react-router-dom";
import { 
  FiShoppingBag, 
  FiClock, 
  FiBriefcase, 
  FiTruck, 
  FiCheckCircle, 
  FiXCircle, 
  FiSearch, 
  FiChevronDown,
  FiEye
} from "react-icons/fi";

// Stat Card Component
const StatCard = ({ label, value, icon: Icon, iconClass }) => (
  <div className="stat-card">
    <div className="stat-card__content">
      <span className="stat-card__label">{label}</span>
      <span className="stat-card__value">{value.toLocaleString()}</span>
    </div>
    <div className={`stat-card__icon ${iconClass}`}>
      <Icon size={24} />
    </div>
  </div>
);

// Status Badge Component
const StatusBadge = ({ status }) => {
  const getStatusClass = (status) => {
    const statusMap = {
      'pending': 'pending',
      'preparing': 'preparing',
      'shipped': 'shipped',
      'completed': 'completed'
    };
    return statusMap[status?.toLowerCase()] || 'pending';
  };

  const getDisplayStatus = (status) => {
    const displayMap = {
      'pending': 'Pending',
      'preparing': 'Preparing',
      'shipped': 'Shipped',
      'completed': 'Completed'
    };
    return displayMap[status?.toLowerCase()] || status;
  };

  return (
    <span className={`status-badge status-badge--${getStatusClass(status)}`}>
      {getDisplayStatus(status)}
    </span>
  );
};

// Payment Status Component
const PaymentStatus = ({ status }) => {
  const getDisplayStatus = (status) => {
    const displayMap = {
      'paid': 'Paid',
      'unpaid': 'Unpaid',
      'refunded': 'Refunded'
    };
    return displayMap[status?.toLowerCase()] || 'Unpaid';
  };

  const getStatusClass = (status) => {
    const classMap = {
      'paid': 'paid',
      'unpaid': 'unpaid',
      'refunded': 'refunded'
    };
    return classMap[status?.toLowerCase()] || 'unpaid';
  };

  return (
    <span className={`payment-status payment-status--${getStatusClass(status)}`}>
      <span className="payment-status__dot" />
      {getDisplayStatus(status)}
    </span>
  );
};

// Helper function to get auth headers
const getAuthHeaders = () => {
  try {
    const sessionData = sessionStorage.getItem('mc_session');
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

const OrderManagement = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [orderStats, setOrderStats] = useState({
    totalOrders: 0,
    pending: 0,
    preparing: 0,
    shipped: 0,
    completed: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPayment, setFilterPayment] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [showPaymentDropdown, setShowPaymentDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const ordersPerPage = 5;

  const API_BASE_URL = 'http://localhost:5000/api';

  // Format date function - uses database created_at
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid date:', dateString);
        return 'N/A';
      }
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
  };

  // Fetch order stats from API
  const fetchOrderStats = async () => {
    try {
      const headers = getAuthHeaders();
      const response = await fetch('http://localhost:5000/api/orders/orders/stats/summary', { headers });
      const data = await response.json();
      if (data.success && data.data) {
        setOrderStats({
          totalOrders: data.data.totalOrders || 0,
          pending: (data.data.pending || 0),
          preparing: data.data.preparing || 0,
          shipped: data.data.shipped || 0,
          completed: data.data.completed || 0
        });
      }
    } catch (error) {
      console.error('Error fetching order stats:', error);
    }
  };


  // Fetch orders from API
  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const headers = getAuthHeaders();
      const response = await fetch('http://localhost:5000/api/orders/orders', { headers });
      const data = await response.json();
      
      if (data.success && data.data) {
        // Transform orders to match component structure
        const transformedOrders = data.data.map(order => ({
          id: order.order_number,
          cleanId: order.order_id,
          customerName: order.customer_name,
          date: new Date(order.created_at).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          }),
          items: 0, // Will be updated when we fetch items
          totalAmount: order.total_amount,
          status: order.order_status,
          payment: order.payment_status,
          customerEmail: order.customer_email,
          customerPhone: order.phone_number || 'N/A',
          customerAddress: order.shipping_address ? 
            `${order.shipping_address.street || ''}, ${order.shipping_address.city || ''}` : 'N/A',
          notes: order.special_instructions || 'No special instructions',
          shipping: order.shipping_fee
        }));
        
        // Fetch order items count for each order
        const ordersWithItems = await Promise.all(
          transformedOrders.map(async (order) => {
            try {
              const itemsResponse = await fetch(`http://localhost:5000/api/orders/orders/${order.cleanId}`, { headers });
              const itemsData = await itemsResponse.json();
              return {
                ...order,
                items: itemsData.data?.items?.length || 0
              };
            } catch (error) {
              return { ...order, items: 0 };
            }
          })
        );
        
        setOrders(ordersWithItems);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('Network error. Please make sure the server is running on port 5000');
    } finally {
      setLoading(false);
    }
  };

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPayment = filterPayment === "All" || 
      order.payment === filterPayment.toLowerCase();
    
    const matchesStatus = filterStatus === "All" || 
      order.status === filterStatus.toLowerCase();
    
    return matchesSearch && matchesPayment && matchesStatus;
  });

  // Pagination
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

  const handleViewDetails = (order) => {
    navigate(`/seller/orders/${order.cleanId}`, { state: { order } });
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterChange = (type, value) => {
    if (type === 'payment') {
      setFilterPayment(value);
      setShowPaymentDropdown(false);
    } else {
      setFilterStatus(value);
      setShowStatusDropdown(false);
    }
    setCurrentPage(1);
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchOrderStats(),
        fetchOrders()
      ]);
    };
    loadData();
  }, []);

    // Helper to toggle selection of a single order
  const toggleSelectOrder = (orderId) => {
    setSelectedOrderIds(prev =>
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  // Helper to select/deselect all on current page
  const toggleSelectAll = () => {
    if (selectedOrderIds.length === currentOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(currentOrders.map(order => order.cleanId));
    }
  };

  // Bulk update handler
  const handleBulkStatusUpdate = async (newStatus) => {
    if (selectedOrderIds.length === 0) {
      alert('Please select at least one order');
      return;
    }
    if (!window.confirm(`Update ${selectedOrderIds.length} order(s) to "${newStatus}"?`)) return;

    setBulkUpdating(true);
    try {
      const headers = getAuthHeaders();
      const response = await fetch('http://localhost:5000/api/orders/bulk-status', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          order_ids: selectedOrderIds,
          order_status: newStatus.toLowerCase()
        })
      });
      const data = await response.json();
      if (data.success) {
        alert(data.message);
        setSelectedOrderIds([]);
        fetchOrders();   // refresh list
        fetchOrderStats(); // refresh stats
      } else {
        alert(data.error || 'Bulk update failed');
      }
    } catch (error) {
      console.error('Bulk update error:', error);
      alert('Failed to update orders');
    } finally {
      setBulkUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="order-management">
        <div className="page-header">
          <h1 className="page-header__title">Order Management</h1>
          <p className="page-header__breadcrumb">Seller Dashboard / Order Management</p>
        </div>
        <div className="loading-spinner">Loading orders...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="order-management">
        <div className="page-header">
          <h1 className="page-header__title">Order Management</h1>
          <p className="page-header__breadcrumb">Seller Dashboard / Order Management</p>
        </div>
        <div className="error-message">
          <p>{error}</p>
          <p style={{ fontSize: '14px', marginTop: '10px' }}>
            Make sure your backend server is running on port 5000
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="order-management">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-header__title">Order Management</h1>
        <p className="page-header__breadcrumb">Seller Dashboard / Order Management</p>
      </div>

      {/* Stat Cards */}
      <div className="stat-cards">
        <StatCard
          label="TOTAL ORDERS"
          value={orderStats.totalOrders}
          icon={FiShoppingBag}
          iconClass="stat-card__icon--blue"
        />
        <StatCard
          label="PENDING"
          value={orderStats.pending}
          icon={FiClock}
          iconClass="stat-card__icon--yellow"
        />
        <StatCard
          label="PREPARING"
          value={orderStats.preparing}
          icon={FiBriefcase}
          iconClass="stat-card__icon--purple"
        />
        <StatCard
          label="SHIPPED"
          value={orderStats.shipped}
          icon={FiTruck}
          iconClass="stat-card__icon--orange"
        />
        <StatCard
          label="COMPLETED"
          value={orderStats.completed}
          icon={FiCheckCircle}
          iconClass="stat-card__icon--green"
        />
      </div>

      {/* Filters & Search */}
      <div className="filters-bar">
        <div className="filters-bar__dropdowns">
          <div className="dropdown-container">
            <button 
              className="dropdown-btn"
              onClick={() => setShowPaymentDropdown(!showPaymentDropdown)}
            >
              Payment: {filterPayment}
              <span className="dropdown-btn__icon"><FiChevronDown /></span>
            </button>
            {showPaymentDropdown && (
              <div className="dropdown-menu">
                <div onClick={() => handleFilterChange('payment', 'All')}>All</div>
                <div onClick={() => handleFilterChange('payment', 'paid')}>Paid</div>
                <div onClick={() => handleFilterChange('payment', 'refunded')}>Refunded</div>
                <div onClick={() => handleFilterChange('payment', 'unpaid')}>Unpaid</div>
              </div>
            )}
          </div>
          <div className="dropdown-container">
            <button 
              className="dropdown-btn"
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            >
              Status: {filterStatus}
              <span className="dropdown-btn__icon"><FiChevronDown /></span>
            </button>
            {showStatusDropdown && (
              <div className="dropdown-menu">
                <div onClick={() => handleFilterChange('status', 'All')}>All</div>
                <div onClick={() => handleFilterChange('status', 'Pending')}>Pending</div>
                <div onClick={() => handleFilterChange('status', 'Confirmed')}>Confirmed</div>
                <div onClick={() => handleFilterChange('status', 'Preparing')}>Preparing</div>
                <div onClick={() => handleFilterChange('status', 'Shipped')}>Shipped</div>
                <div onClick={() => handleFilterChange('status', 'Completed')}>Completed</div>
                <div onClick={() => handleFilterChange('status', 'Cancelled')}>Cancelled</div>
              </div>
            )}
          </div>
        </div>
        <div className="search-box">
          <span className="search-box__icon"><FiSearch /></span>
          <input
            type="text"
            className="search-box__input"
            placeholder="Search by Order ID, Customer Name..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="table-wrapper">
        <table className="orders-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selectedOrderIds.length === currentOrders.length && currentOrders.length > 0}
                  onChange={toggleSelectAll}
                />
              </th>
              <th>ORDER NO.</th>
              <th>CUSTOMER NAME</th>
              <th>DATE</th>
              <th>QUANTITY</th>
              <th>TOTAL AMOUNT</th>
              <th>STATUS</th>
              <th>PAYMENT</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {currentOrders.map((order) => (
              <tr key={order.id}>
                <td className="order-id">{order.id}</td>
                <td className="customer-name">{order.customerName}</td>
                <td className="order-date">{order.date}</td>
                <td className="order-items">{order.items} {order.items === 1 ? 'Item' : 'Items'}</td>
                <td className="order-amount">₱{order.totalAmount?.toFixed(2)}</td>
                <td><StatusBadge status={order.status} /></td>
                <td><PaymentStatus status={order.payment} /></td>
                <td>
                  <button
                    className="view-details-btn"
                    onClick={() => handleViewDetails(order)}
                  >
                    View Details
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filteredOrders.length > 0 && totalPages > 1 && (
        <div className="pagination">
          <button 
            className="pagination__btn pagination__btn--nav"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          {[...Array(totalPages)].map((_, index) => (
            <button
              key={index}
              className={`pagination__btn ${currentPage === index + 1 ? 'pagination__btn--active' : ''}`}
              onClick={() => setCurrentPage(index + 1)}
            >
              {index + 1}
            </button>
          ))}
          <button 
            className="pagination__btn pagination__btn--nav"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}

      <div className="bulk-actions">
        <button
          className="btn-primary"
          onClick={() => handleBulkStatusUpdate('preparing')}
          disabled={selectedOrderIds.length === 0 || bulkUpdating}
        >
          {bulkUpdating ? 'Updating...' : 'Mark Selected as Preparing'}
        </button>
        {/* Optionally add similar buttons for shipped/completed */}
      </div>
    </div>
  );
};

export default OrderManagement;