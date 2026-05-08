// src/pages/settings/OrdersTab.jsx
import "./css/OrdersTab.css";
import { useEffect, useState, useRef } from "react";
import {
  FaBox, FaTruck, FaClipboardCheck, FaStar, FaTimesCircle, FaCheckCircle,
  FaSearch, FaMapMarkerAlt, FaArrowLeft,
  FaBoxOpen, FaShippingFast, FaHandHoldingHeart
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const dollPlaceholder = "https://via.placeholder.com/70?text=🌸";

const STATUS_COLORS = {
  "Order Placed": "status--amber",
  "Preparing": "status--amber",
  "Shipped": "status--amber",
  "Delivered": "status--green",
  "Cancelled": "status--red",
};

const STATUS_OPTIONS = ["All", "Order Placed", "Preparing", "Shipped", "Delivered", "Cancelled"];

const OrdersTab = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [view, setView] = useState("list");
  const [trackingOrder, setTrackingOrder] = useState(null);
  const [showRateModal, setShowRateModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");

  const pollingInterval = useRef(null);

  const getAuthHeaders = () => {
    try {
      const sessionData = sessionStorage.getItem('mc_session');
      if (!sessionData) return {};
      const session = JSON.parse(sessionData);
      const token = session.user?.access_token;
      if (!token) return {};
      return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
    } catch (error) {
      console.error('Error getting auth headers:', error);
      return {};
    }
  };

  const fetchOrders = async () => {
    if (!isAuthenticated || !user?.id) return;
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`http://localhost:5000/api/orders/user/${user.id}`, { headers });
      const result = await response.json();
      if (result.success) {
        setOrders(result.data);
        setError(null);
      } else {
        setError(result.error);
        setOrders([]);
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError(err.message);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchOrders();
      pollingInterval.current = setInterval(() => {
        fetchOrders();
      }, 60000);
    } else {
      setLoading(false);
    }
    return () => {
      if (pollingInterval.current) clearInterval(pollingInterval.current);
    };
  }, [isAuthenticated, user?.id]);

  // Counts using order.status
  const totalOrders = orders.length;
  const orderPlacedOrders = orders.filter(o => o.status === "Order Placed").length;
  const preparingOrders = orders.filter(o => o.status === "Preparing").length;
  const shippedOrders = orders.filter(o => o.status === "Shipped").length;
  const deliveredOrders = orders.filter(o => o.status === "Delivered").length;
  const cancelledOrders = orders.filter(o => o.status === "Cancelled").length;

  const filteredOrders = orders.filter(order => {
    const matchesStatus = selectedStatus === "All" || order.status === selectedStatus;
    const matchesSearch = order.items?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.id?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusCount = (status) => {
    if (status === "All") return orders.length;
    return orders.filter(o => o.status === status).length;
  };

  const handleTrackOrder = (order) => {
    setTrackingOrder(order);
    setView("track");
  };

  const handleConfirmReceipt = async (order) => {
  if (!window.confirm(`Confirm receipt of order ${order.id}?`)) return;
  try {
    const headers = getAuthHeaders();
    const response = await fetch(`http://localhost:5000/api/orders/${order.order_id}/confirm-receipt`, {
      method: 'POST',
      headers,
    });
    const result = await response.json();
    if (result.success) {
      alert('Thank you for confirming!');
      fetchOrders(); // refresh list
    } else {
      alert(result.error);
    }
  } catch (err) {
    console.error('Confirmation error:', err);
    alert('Failed to confirm receipt');
  }
};

  const handleBackToList = () => {
    setView("list");
    setTrackingOrder(null);
  };

  const handleRateNow = () => setShowRateModal(true);

  const handleSubmitRating = () => {
    if (rating === 0) {
      alert("Please select a rating");
      return;
    }
    console.log("Rating submitted:", rating, "Review:", reviewText);
    setShowRateModal(false);
    setRating(0);
    setReviewText("");
    alert("Thank you for your rating!");
  };

  const handleBuyAgain = () => {
    alert("Product added to cart! Redirecting to checkout...");
  };

  const getCompletedSteps = (order) => {
    if (!order) return 0;
    const status = order.status?.toLowerCase();
    if (status === 'order placed') return 1;
    if (status === 'preparing') return 2;
    if (status === 'shipped') return 3;
    if (status === 'delivered') return 4;
    return 0;
  };

  const progressSteps = [
    { label: "Order Placed", icon: <FaBox />, key: "orderPlaced" },
    { label: "Preparing", icon: <FaShippingFast />, key: "preparingToShip" },
    { label: "Shipped", icon: <FaTruck />, key: "orderShipped" },
    { label: "Delivered", icon: <FaHandHoldingHeart />, key: "delivered" }
  ];

  const completedCount = trackingOrder ? getCompletedSteps(trackingOrder) : 0;
  const progressPercentage = trackingOrder ? (completedCount / 4) * 100 : 0;

  if (loading) {
    return (
      <div className="tab-content">
        <div style={{ textAlign: "center", padding: "2rem" }}>Loading orders...</div>
      </div>
    );
  }

  if (view === "track" && trackingOrder) {
    return (
      <div className="tracking-page">
        <div className="tracking-header">
          <button className="back-btn" onClick={handleBackToList}>
            <FaArrowLeft /> Back to Orders
          </button>
          <h1 className="tracking-title">Track Your Order</h1>
          <p className="tracking-order-id">Order ID: {trackingOrder.id}</p>
        </div>

        <div className="progress-container">
          <div className="progress-steps-modern">
            {progressSteps.map((step, index) => {
              const isCompleted = index < completedCount;
              const isActive = index === completedCount - 1 && completedCount > 0 && completedCount < 4;
              return (
                <div key={index} className={`step-modern ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}>
                  <div className="step-circle-modern">{step.icon}</div>
                  <div className="step-label-modern">{step.label}</div>
                  <div className="step-date-modern">
                    {trackingOrder[step.key] ? trackingOrder[step.key].split(" at ")[0] : "Pending"}
                  </div>
                  {index < progressSteps.length - 1 && (
                    <div className={`step-line-modern ${isCompleted ? 'completed' : ''}`}></div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="progress-bar-bg">
            <div className="progress-bar-fill" style={{ width: `${progressPercentage}%` }}></div>
          </div>
        </div>

        {trackingOrder.displayStatus === "Delivered" && (
          <div className="tracking-action-buttons">
            <button className="rate-now-btn" onClick={handleRateNow}><FaStar /> Rate Now</button>
            <button className="buy-again-btn" onClick={handleBuyAgain}><FaBoxOpen /> Buy Again</button>
          </div>
        )}

        <div className="delivery-section">
          <h3 className="section-subtitle">Delivery Address</h3>
          <div className="delivery-grid">
            <div className="delivery-left">
              <p className="customer-name">{trackingOrder.customerName}</p>
              <p className="contact-number">📞 {trackingOrder.contactNumber}</p>
              <p className="address">{trackingOrder.address}</p>
              {trackingOrder.specialInstructions && (
                <div className="info-row">
                  <span className="info-label">Special Instructions:</span>
                  <span className="info-value">{trackingOrder.specialInstructions}</span>
                </div>
              )}
            </div>
            <div className="delivery-right">
              <div className="info-row"><span className="info-label">Order placed:</span><span className="info-value">{trackingOrder.orderPlaced || "Pending"}</span></div>
              <div className="info-row"><span className="info-label">Preparing to ship:</span><span className="info-value">{trackingOrder.preparingToShip || "Pending"}</span></div>
              <div className="info-row"><span className="info-label">Order shipped out:</span><span className="info-value">{trackingOrder.orderShipped || "Pending"}</span></div>
              {trackingOrder.orderShipped && trackingOrder.status !== 'Delivered' && (
                <div className="info-row">
                  <span className="info-label">Estimated arrival:</span>
                  <span className="info-value">{trackingOrder.eta || "Calculating..."}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="product-section">
          <div className="product-grid">
            <div className="product-left">
              <img src={trackingOrder.image || dollPlaceholder} alt={trackingOrder.items} className="track-product-image" />
            </div>
            <div className="product-right">
              <h4 className="product-name">{trackingOrder.items}</h4>
              <p className="product-qty">Quantity: x{trackingOrder.qty}</p>
              <p className="product-price">₱{parseFloat(trackingOrder.price).toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="summary-section">
          <div className="summary-right">
            <div className="summary-row"><span>Shipping Fee:</span><span>₱{parseFloat(trackingOrder.shippingFee).toLocaleString()}</span></div>
            <div className="summary-row"><span>Product Price:</span><span>₱{parseFloat(trackingOrder.total).toLocaleString()}</span></div>
            <div className="summary-row total"><span>Order Total:</span><span>₱{(parseFloat(trackingOrder.total) + parseFloat(trackingOrder.shippingFee)).toLocaleString()}</span></div>
            <div className="summary-row"><span>Payment Method:</span><span>{trackingOrder.paymentMethod}</span></div>
            <div className="summary-row"><span>Mode of Delivery:</span><span>{trackingOrder.deliveryMode}</span></div>
          </div>
        </div>

        {showRateModal && (
          <div className="modal-overlay" onClick={() => setShowRateModal(false)}>
            <div className="modal-content rate-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header"><h2>Rate Your Product</h2><button className="modal-close" onClick={() => setShowRateModal(false)}>×</button></div>
              <div className="modal-body">
                <div className="rate-product-info">
                  <img src={trackingOrder.image || dollPlaceholder} alt={trackingOrder.items} className="rate-product-image" />
                  <div className="rate-product-details"><h4>{trackingOrder.items}</h4><p>Order ID: {trackingOrder.id}</p></div>
                </div>
                <div className="rating-section">
                  <label className="rating-label">Your Rating</label>
                  <div className="stars-container">
                    {[1,2,3,4,5].map(star => (
                      <FaStar key={star} className={`star-icon ${star <= (hoverRating || rating) ? "filled" : ""}`}
                        onClick={() => setRating(star)} onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)} />
                    ))}
                  </div>
                  <p className="rating-text">{rating === 1 && "Very Poor"}{rating === 2 && "Poor"}{rating === 3 && "Average"}{rating === 4 && "Good"}{rating === 5 && "Excellent!"}</p>
                </div>
                <div className="review-section">
                  <label htmlFor="review" className="review-label">Write a Review (Optional)</label>
                  <textarea id="review" className="review-textarea" rows="4" placeholder="Share your experience..." value={reviewText} onChange={(e) => setReviewText(e.target.value)}></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button className="cancel-btn-secondary" onClick={() => { setShowRateModal(false); setRating(0); setReviewText(""); }}>Cancel</button>
                <button className="submit-rating-btn" onClick={handleSubmitRating}>Submit Rating</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="tab-content">
      <div className="cards-section">
        <div className="card"><div className="card-info"><p className="card-title">Total Orders</p><p className="card-number">{totalOrders}</p></div><div className="card-icon"><FaBox /></div></div>
        <div className="card"><div className="card-info"><p className="card-title">Order Placed</p><p className="card-number">{orderPlacedOrders}</p></div><div className="card-icon"><FaBox /></div></div>
        <div className="card"><div className="card-info"><p className="card-title">Preparing</p><p className="card-number">{preparingOrders}</p></div><div className="card-icon"><FaTruck /></div></div>
        <div className="card"><div className="card-info"><p className="card-title">Shipped</p><p className="card-number">{shippedOrders}</p></div><div className="card-icon"><FaTruck /></div></div>
        <div className="card"><div className="card-info"><p className="card-title">Delivered</p><p className="card-number">{deliveredOrders}</p></div><div className="card-icon"><FaClipboardCheck /></div></div>
      </div>

      <div className="filter-search-section">
        <div className="filter-buttons">
          {STATUS_OPTIONS.map(status => (
            <button key={status} onClick={() => setSelectedStatus(status)} className={`filter-btn ${selectedStatus === status ? "active" : ""}`}>
              {status} <span className="filter-count">{getStatusCount(status)}</span>
            </button>
          ))}
        </div>
        <div className="search-box">
          <FaSearch className="search-icon" />
          <input type="text" placeholder="Search by product name or order ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input" />
          {searchTerm && <button className="search-clear" onClick={() => setSearchTerm("")}>×</button>}
        </div>
      </div>

      <section className="orders-section">
        <div className="section-header">
          <h2 className="section-heading">Order History</h2>
          <p className="order-count-display">Showing {filteredOrders.length} of {totalOrders} orders</p>
        </div>
        {error && (
          <div className="empty-state">
            <p className="empty-msg">Error loading orders: {error}</p>
            <button className="clear-filters-btn" onClick={fetchOrders}>Retry</button>
          </div>
        )}
        {!error && filteredOrders.length === 0 && (
          <div className="empty-state">
            <p className="empty-msg">No orders found matching your criteria.</p>
            {(selectedStatus !== "All" || searchTerm) && (
              <button className="clear-filters-btn" onClick={() => { setSelectedStatus("All"); setSearchTerm(""); }}>Clear Filters</button>
            )}
          </div>
        )}
        {!error && filteredOrders.length > 0 && (
          <div className="orders-list">
            {filteredOrders.map((o) => (
              <div className="order-row" key={o.id}>
                <div className="order-image">
                  <img src={o.image || dollPlaceholder} alt={o.items} onError={(e) => { e.target.onerror = null; e.target.src = dollPlaceholder; }} />
                </div>
                <div className="order-details">
                  <div className="order-meta"><span className="order-id">{o.id}</span><span className="order-date">{o.date}</span></div>
                  <p className="order-items">{o.items}</p>
                  <div className="order-footer">
                    <span className={`order-status ${STATUS_COLORS[o.status] || ""}`}>{o.status}</span>
                    <span className="order-total">₱{parseFloat(o.total).toLocaleString()}</span>
                  </div>
                </div>
                <div className="order-actions">
                  <button className="action-btn track-btn" onClick={() => handleTrackOrder(o)}><FaMapMarkerAlt /> Track Order</button>
                </div>
                  {o.status === "Delivered" && !o.customerConfirmedAt && (
                    <button
                      className="action-btn confirm-receipt-btn"
                      onClick={() => handleConfirmReceipt(o)}
                    >
                      <FaCheckCircle /> Order Received
                    </button>
                  )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default OrdersTab;