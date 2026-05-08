// src/pages/settings/OrdersTab.jsx
import "./css/OrdersTab.css";
import { useEffect, useState } from "react";
import { 
  FaBox, FaTruck, FaClipboardCheck, FaStar, FaTimesCircle, 
  FaSearch, FaMapMarkerAlt, FaBan, FaArrowLeft,
  FaBoxOpen, FaShippingFast, FaHandHoldingHeart
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const dollPlaceholder = "https://via.placeholder.com/70?text=🌸";

const STATUS_COLORS = {
  Delivered: "status--green",
  Processing: "status--amber",
  Cancelled: "status--red",
};

const STATUS_OPTIONS = ["All", "Delivered", "Processing", "Cancelled"];

const OrdersTab = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [view, setView] = useState("list");
  const [trackingOrder, setTrackingOrder] = useState(null);
  const [showRateModal, setShowRateModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");

  // Fetch orders from API when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchOrders();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/orders/user/${user.id}`);
      const result = await response.json();
      if (result.success) {
        setOrders(result.data);
      } else {
        setError(result.error);
        // Fallback to empty array
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

  // Compute counts from real orders
  const totalOrders = orders.length;
  const processingOrders = orders.filter(o => o.status === "Processing").length;
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

  const handleCancelOrder = (order) => {
    setSelectedOrder(order);
    setShowCancelModal(true);
  };

  const handleConfirmCancel = async () => {
    if (!cancelReason.trim()) {
      alert("Please provide a reason for cancellation");
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:5000/api/orders/${selectedOrder.order_id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason })
      });
      const result = await response.json();
      if (result.success) {
        alert("Cancellation request submitted successfully!");
        setShowCancelModal(false);
        setCancelReason("");
        setSelectedOrder(null);
        fetchOrders(); // refresh list
      } else {
        alert(result.error);
      }
    } catch (error) {
      console.error('Cancel error:', error);
      alert("Failed to cancel order. Please try again.");
    }
  };

  const handleTrackOrder = (order) => {
    setTrackingOrder(order);
    setView("track");
  };

  const handleBackToList = () => {
    setView("list");
    setTrackingOrder(null);
  };

  const handleRateNow = () => {
    setShowRateModal(true);
  };

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
    if (status === 'cancelled') return 0;
    if (status === 'processing') return 1;
    if (status === 'shipped') return 2;
    if (status === 'delivered') return 4;
    return 0;
  };

  const progressSteps = [
    { label: "Order Placed", icon: <FaBox />, key: "orderPlaced" },
    { label: "Order Shipped", icon: <FaShippingFast />, key: "orderShipped" },
    { label: "Order Received", icon: <FaHandHoldingHeart />, key: "outForDelivery" },
    { label: "To Rate", icon: <FaStar />, key: "delivered" }
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
        {/* Header */}
        <div className="tracking-header">
          <button className="back-btn" onClick={handleBackToList}>
            <FaArrowLeft /> Back to Orders
          </button>
          <h1 className="tracking-title">Track Your Order</h1>
          <p className="tracking-order-id">Order ID: {trackingOrder.id}</p>
        </div>

        {/* Progress Bar */}
        <div className="progress-container">
          <div className="progress-steps-modern">
            {progressSteps.map((step, index) => {
              const isCompleted = index < completedCount;
              const isActive = index === completedCount - 1 && completedCount > 0 && completedCount < 4;
              
              return (
                <div key={index} className={`step-modern ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}>
                  <div className="step-circle-modern">
                    {step.icon}
                  </div>
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

        {/* Action Buttons */}
        {trackingOrder.status === "Delivered" && (
          <div className="tracking-action-buttons">
            <button className="rate-now-btn" onClick={handleRateNow}>
              <FaStar /> Rate Now
            </button>
            <button className="buy-again-btn" onClick={handleBuyAgain}>
              <FaBoxOpen /> Buy Again
            </button>
          </div>
        )}

        {/* Delivery Address Section */}
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
              <div className="info-row">
                <span className="info-label">Order placed:</span>
                <span className="info-value">{trackingOrder.orderPlaced || "Pending"}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Preparing to ship:</span>
                <span className="info-value">{trackingOrder.preparingToShip || "Pending"}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Order shipped out:</span>
                <span className="info-value">{trackingOrder.orderShipped || "Pending"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Product Section */}
        <div className="product-section">
          <div className="product-grid">
            <div className="product-left">
              <img 
                src={trackingOrder.image} 
                alt={trackingOrder.items}
                className="track-product-image"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = dollPlaceholder;
                }}
              />
            </div>
            <div className="product-right">
              <h4 className="product-name">{trackingOrder.items}</h4>
              <p className="product-qty">Quantity: x{trackingOrder.qty}</p>
              <p className="product-price">₱{parseFloat(trackingOrder.price).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Order Summary Section */}
        <div className="summary-section">
          <div className="summary-right">
            <div className="summary-row">
              <span>Shipping Fee:</span>
              <span>₱{parseFloat(trackingOrder.shippingFee).toLocaleString()}</span>
            </div>
            <div className="summary-row">
              <span>Product Price:</span>
              <span>₱{parseFloat(trackingOrder.total).toLocaleString()}</span>
            </div>
            <div className="summary-row total">
              <span>Order Total:</span>
              <span>₱{(parseFloat(trackingOrder.total) + parseFloat(trackingOrder.shippingFee)).toLocaleString()}</span>
            </div>
            <div className="summary-row">
              <span>Payment Method:</span>
              <span>{trackingOrder.paymentMethod}</span>
            </div>
            <div className="summary-row">
              <span>Mode of Delivery:</span>
              <span>{trackingOrder.deliveryMode}</span>
            </div>
          </div>
        </div>

        {/* Rate Modal */}
        {showRateModal && (
          <div className="modal-overlay" onClick={() => setShowRateModal(false)}>
            <div className="modal-content rate-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Rate Your Product</h2>
                <button className="modal-close" onClick={() => setShowRateModal(false)}>×</button>
              </div>
              
              <div className="modal-body">
                <div className="rate-product-info">
                  <img 
                    src={trackingOrder.image} 
                    alt={trackingOrder.items}
                    className="rate-product-image"
                  />
                  <div className="rate-product-details">
                    <h4>{trackingOrder.items}</h4>
                    <p>Order ID: {trackingOrder.id}</p>
                  </div>
                </div>

                <div className="rating-section">
                  <label className="rating-label">Your Rating</label>
                  <div className="stars-container">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <FaStar
                        key={star}
                        className={`star-icon ${star <= (hoverRating || rating) ? "filled" : ""}`}
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                      />
                    ))}
                  </div>
                  <p className="rating-text">
                    {rating === 1 && "Very Poor"}
                    {rating === 2 && "Poor"}
                    {rating === 3 && "Average"}
                    {rating === 4 && "Good"}
                    {rating === 5 && "Excellent!"}
                  </p>
                </div>

                <div className="review-section">
                  <label htmlFor="review" className="review-label">Write a Review (Optional)</label>
                  <textarea
                    id="review"
                    className="review-textarea"
                    rows="4"
                    placeholder="Share your experience with this product..."
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                  ></textarea>
                </div>
              </div>
              
              <div className="modal-footer">
                <button 
                  className="cancel-btn-secondary"
                  onClick={() => {
                    setShowRateModal(false);
                    setRating(0);
                    setReviewText("");
                  }}
                >
                  Cancel
                </button>
                <button 
                  className="submit-rating-btn"
                  onClick={handleSubmitRating}
                >
                  Submit Rating
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render orders list
  return (
    <div className="tab-content">
      {/* Cards Section */}
      <div className="cards-section">
        <div className="card">
          <div className="card-info">
            <p className="card-title">Total Orders</p>
            <p className="card-number">{totalOrders}</p>
          </div>
          <div className="card-icon"><FaBox /></div>
        </div>
        <div className="card">
          <div className="card-info">
            <p className="card-title">To Ship</p>
            <p className="card-number">{processingOrders}</p>
          </div>
          <div className="card-icon"><FaTruck /></div>
        </div>
        <div className="card">
          <div className="card-info">
            <p className="card-title">To Receive</p>
            <p className="card-number">{deliveredOrders}</p>
          </div>
          <div className="card-icon"><FaClipboardCheck /></div>
        </div>
        <div className="card">
          <div className="card-info">
            <p className="card-title">To Rate</p>
            <p className="card-number">{deliveredOrders}</p>
          </div>
          <div className="card-icon"><FaStar /></div>
        </div>
        <div className="card">
          <div className="card-info">
            <p className="card-title">Canceled</p>
            <p className="card-number">{cancelledOrders}</p>
          </div>
          <div className="card-icon"><FaTimesCircle /></div>
        </div>
      </div>

      {/* Filter and Search Section */}
      <div className="filter-search-section">
        <div className="filter-buttons">
          {STATUS_OPTIONS.map(status => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`filter-btn ${selectedStatus === status ? "active" : ""}`}
            >
              {status}
              <span className="filter-count">{getStatusCount(status)}</span>
            </button>
          ))}
        </div>
        
        <div className="search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search by product name or order ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button 
              className="search-clear"
              onClick={() => setSearchTerm("")}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Orders Section */}
      <section className="orders-section">
        <div className="section-header">
          <h2 className="section-heading">Order History</h2>
          <p className="order-count-display">
            Showing {filteredOrders.length} of {totalOrders} orders
          </p>
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
              <button 
                className="clear-filters-btn"
                onClick={() => {
                  setSelectedStatus("All");
                  setSearchTerm("");
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
        
        {!error && filteredOrders.length > 0 && (
          <div className="orders-list">
            {filteredOrders.map((o) => (
              <div className="order-row" key={o.id}>
                <div className="order-image">
                  <img 
                    src={o.image || dollPlaceholder} 
                    alt={o.items}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = dollPlaceholder;
                    }}
                  />
                </div>
                
                <div className="order-details">
                  <div className="order-meta">
                    <span className="order-id">{o.id}</span>
                    <span className="order-date">{o.date}</span>
                  </div>
                  <p className="order-items">{o.items}</p>
                  <div className="order-footer">
                    <span className={`order-status ${STATUS_COLORS[o.status] || ""}`}>
                      {o.status}
                    </span>
                    <span className="order-total">₱{parseFloat(o.total).toLocaleString()}</span>
                  </div>
                </div>
                
                <div className="order-actions">
                  <button className="action-btn track-btn" onClick={() => handleTrackOrder(o)}>
                    <FaMapMarkerAlt /> Track Order
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Cancel Order Modal 
      {showCancelModal && selectedOrder && (
        <div className="modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Cancel Order Request</h2>
              <button className="modal-close" onClick={() => setShowCancelModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="cancel-order-details">
                <div className="cancel-product-info">
                  <img 
                    src={selectedOrder.image || dollPlaceholder} 
                    alt={selectedOrder.items}
                    className="cancel-product-image"
                  />
                  <div className="cancel-product-details">
                    <h4>{selectedOrder.items}</h4>
                    <p className="product-meta">Order ID: {selectedOrder.id}</p>
                    <p className="product-meta">Date: {selectedOrder.date}</p>
                  </div>
                </div>
                
                <div className="order-summary">
                  <div className="summary-row">
                    <span>Quantity:</span>
                    <span>x{selectedOrder.qty}</span>
                  </div>
                  <div className="summary-row">
                    <span>Price per item:</span>
                    <span>₱{parseFloat(selectedOrder.price).toLocaleString()}</span>
                  </div>
                  <div className="summary-row total-row">
                    <span>Total Amount:</span>
                    <span>₱{parseFloat(selectedOrder.total).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="cancel-reason-section">
                <label htmlFor="cancelReason" className="cancel-reason-label">
                  Reason for Cancellation <span className="required">*</span>
                </label>
                <textarea
                  id="cancelReason"
                  className="cancel-reason-textarea"
                  rows="4"
                  placeholder="Please tell us why you want to cancel this order..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                ></textarea>
                <div className="cancel-note">
                  <p className="note-text">
                    This will take a few hours. Wait for the response from the seller.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="cancel-btn-secondary"
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelReason("");
                }}
              >
                Cancel
              </button>
              <button 
                className="submit-btn-primary"
                onClick={handleConfirmCancel}
              >
                Send Request
              </button>
            </div>
          </div>
        </div>
      )} */}
    </div>
  );
};

export default OrdersTab;