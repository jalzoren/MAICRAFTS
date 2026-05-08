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
  FiChevronDown 
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
      'confirmed': 'pending',
      'preparing': 'preparing',
      'shipped': 'shipped',
      'completed': 'completed',
      'cancelled': 'cancelled'
    };
    return statusMap[status?.toLowerCase()] || 'pending';
  };

  const getDisplayStatus = (status) => {
    const displayMap = {
      'pending': 'Pending',
      'confirmed': 'Confirmed',
      'preparing': 'Preparing',
      'shipped': 'Shipped',
      'completed': 'Completed',
      'cancelled': 'Cancelled'
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

  return (
    <span className={`payment-status payment-status--${status?.toLowerCase() || 'unpaid'}`}>
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
    confirmed: 0,
    preparing: 0,
    shipped: 0,
    completed: 0,
    cancelled: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPayment, setFilterPayment] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [showPaymentDropdown, setShowPaymentDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 5;

  // Fetch order stats from API
  const fetchOrderStats = async () => {
    try {
      const headers = getAuthHeaders();
      const response = await fetch('http://localhost:5000/api/orders/orders/stats/summary', { headers });
      const data = await response.json();
      
      if (data.success && data.data) {
        setOrderStats({
          totalOrders: data.data.totalOrders || 0,
          pending: (data.data.pending || 0) + (data.data.confirmed || 0),
          confirmed: data.data.confirmed || 0,
          preparing: data.data.preparing || 0,
          shipped: data.data.shipped || 0,
          completed: data.data.completed || 0,
          cancelled: data.data.cancelled || 0
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
      (filterPayment === "Paid" && order.payment === "paid") ||
      (filterPayment === "Refunded" && order.payment === "refunded") ||
      (filterPayment === "Pending" && (order.payment === "unpaid" || order.payment === "pending"));
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
        <StatCard
          label="CANCELLED"
          value={orderStats.cancelled}
          icon={FiXCircle}
          iconClass="stat-card__icon--red"
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
              Payment Status: {filterPayment}
              <span className="dropdown-btn__icon"><FiChevronDown /></span>
            </button>
            {showPaymentDropdown && (
              <div className="dropdown-menu">
                <div onClick={() => handleFilterChange('payment', 'All')}>All</div>
                <div onClick={() => handleFilterChange('payment', 'Paid')}>Paid</div>
                <div onClick={() => handleFilterChange('payment', 'Refunded')}>Refunded</div>
                <div onClick={() => handleFilterChange('payment', 'Pending')}>Pending</div>
              </div>
            )}
          </div>
          <div className="dropdown-container">
            <button 
              className="dropdown-btn"
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            >
              Order Status: {filterStatus}
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
              <th>ORDER NO.</th>
              <th>CUSTOMER NAME</th>
              <th>DATE</th>
              <th>ITEMS</th>
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
            ))}
          </tbody>
        </table>
        {filteredOrders.length === 0 && (
          <div className="no-results">No orders found</div>
        )}
      </div>

      {/* Pagination */}
      {filteredOrders.length > 0 && (
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
    </div>
  );
};

export default OrderManagement;