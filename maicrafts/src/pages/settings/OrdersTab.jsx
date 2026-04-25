// src/pages/settings/OrdersTab.jsx
import "./css/OrdersTab.css";
import { useState } from "react";
import { 
  FaBox, FaTruck, FaClipboardCheck, FaStar, FaTimesCircle, 
  FaSearch, FaMapMarkerAlt, FaBan, FaArrowLeft,
  FaBoxOpen, FaShippingFast, FaHandHoldingHeart
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

// Import images directly from assets folder
import doll1Img from "../../assets/doll.png";
import doll2Img from "../../assets/doll2.png";
import doll3Img from "../../assets/doll3.png";
import doll4Img from "../../assets/doll4.png";
import doll5Img from "../../assets/doll5.png";
import dollPlaceholder from "../../assets/doll5.png";

// Mock orders data
const MOCK_ORDERS = [
  { 
    id: "#ORD-0021", 
    date: "April 10, 2026",  
    status: "Delivered",  
    total: "850.00",   
    items: "Crochet Bunny Doll",
    qty: 1,
    price: "850.00",
    image: doll1Img,
    customerName: "Maria Santos",
    contactNumber: "+63 912 345 6789",
    address: "123 Mabini Street, Barangay San Antonio, Pasig City, Metro Manila, Philippines 1600",
    orderPlaced: "April 10, 2026 at 2:30 PM",
    preparingToShip: "April 11, 2026 at 9:00 AM",
    orderShipped: "April 12, 2026 at 10:30 AM",
    outForDelivery: "April 13, 2026 at 8:00 AM",
    delivered: "April 13, 2026 at 2:15 PM",
    paymentMethod: "Credit Card",
    deliveryMode: "Standard Delivery (3-5 business days)",
    shippingFee: "50.00"
  },
  { 
    id: "#ORD-0018", 
    date: "March 28, 2026",  
    status: "Processing", 
    total: "1200.00", 
    items: "Custom Crochet Doll",
    qty: 1,
    price: "1200.00",
    image: doll2Img,
    customerName: "Juan Dela Cruz",
    contactNumber: "+63 998 765 4321",
    address: "456 Rizal Avenue, Barangay San Lorenzo, Makati City, Metro Manila, Philippines 1200",
    orderPlaced: "March 28, 2026 at 5:45 PM",
    preparingToShip: "March 29, 2026 at 10:00 AM",
    orderShipped: null,
    outForDelivery: null,
    delivered: null,
    paymentMethod: "GCash",
    deliveryMode: "Express Delivery (1-2 business days)",
    shippingFee: "100.00"
  },
  { 
    id: "#ORD-0014", 
    date: "March 5, 2026",   
    status: "Delivered",  
    total: "430.00",   
    items: "Mini Crochet Doll (x2)",
    qty: 2,
    price: "215.00",
    image: doll3Img,
    customerName: "Anna Rodriguez",
    contactNumber: "+63 917 123 4567",
    address: "789 P. Burgos Street, Barangay Poblacion, Mandaluyong City, Metro Manila, Philippines 1550",
    orderPlaced: "March 5, 2026 at 10:15 AM",
    preparingToShip: "March 6, 2026 at 11:00 AM",
    orderShipped: "March 7, 2026 at 9:30 AM",
    outForDelivery: "March 8, 2026 at 7:00 AM",
    delivered: "March 8, 2026 at 1:45 PM",
    paymentMethod: "Bank Transfer",
    deliveryMode: "Standard Delivery (3-5 business days)",
    shippingFee: "0.00"
  },
  { 
    id: "#ORD-0009", 
    date: "Feb 14, 2026",    
    status: "Cancelled",  
    total: "680.00",   
    items: "Crochet Flower Doll",
    qty: 1,
    price: "680.00",
    image: doll4Img,
    customerName: "Michael Tan",
    contactNumber: "+63 923 456 7890",
    address: "321 E. Rodriguez Avenue, Quezon City, Metro Manila, Philippines 1100",
    orderPlaced: "Feb 14, 2026 at 3:20 PM",
    preparingToShip: null,
    orderShipped: null,
    outForDelivery: null,
    delivered: null,
    paymentMethod: "Credit Card",
    deliveryMode: "Standard Delivery (3-5 business days)",
    shippingFee: "50.00"
  },
  { 
    id: "#ORD-0007", 
    date: "Jan 28, 2026",    
    status: "Delivered",  
    total: "950.00",   
    items: "Crochet Teddy Bear Doll",
    qty: 1,
    price: "950.00",
    image: doll5Img,
    customerName: "Sarah Lee",
    contactNumber: "+63 932 567 8901",
    address: "555 Katipunan Avenue, Loyola Heights, Quezon City, Metro Manila, Philippines 1108",
    orderPlaced: "Jan 28, 2026 at 1:00 PM",
    preparingToShip: "Jan 29, 2026 at 10:30 AM",
    orderShipped: "Jan 30, 2026 at 2:00 PM",
    outForDelivery: "Jan 31, 2026 at 9:00 AM",
    delivered: "Jan 31, 2026 at 4:30 PM",
    paymentMethod: "PayPal",
    deliveryMode: "Express Delivery (1-2 business days)",
    shippingFee: "100.00"
  },
  { 
    id: "#ORD-0005", 
    date: "Jan 15, 2026",    
    status: "Delivered",  
    total: "1500.00",   
    items: "Custom Portrait Doll",
    qty: 1,
    price: "1500.00",
    image: doll2Img,
    customerName: "David Garcia",
    contactNumber: "+63 945 678 9012",
    address: "888 C5 Road, Barangay Ugong, Pasig City, Metro Manila, Philippines 1604",
    orderPlaced: "Jan 15, 2026 at 9:30 AM",
    preparingToShip: "Jan 16, 2026 at 1:00 PM",
    orderShipped: "Jan 17, 2026 at 11:00 AM",
    outForDelivery: "Jan 18, 2026 at 8:30 AM",
    delivered: "Jan 18, 2026 at 3:00 PM",
    paymentMethod: "Credit Card",
    deliveryMode: "Standard Delivery (3-5 business days)",
    shippingFee: "0.00"
  },
  { 
    id: "#ORD-0003", 
    date: "Jan 5, 2026",    
    status: "Cancelled",  
    total: "350.00",   
    items: "Crochet Keychain Doll",
    qty: 1,
    price: "350.00",
    image: doll3Img,
    customerName: "Lisa Wong",
    contactNumber: "+63 956 789 0123",
    address: "777 Boni Avenue, Mandaluyong City, Metro Manila, Philippines 1550",
    orderPlaced: "Jan 5, 2026 at 11:45 AM",
    preparingToShip: null,
    orderShipped: null,
    outForDelivery: null,
    delivered: null,
    paymentMethod: "GCash",
    deliveryMode: "Standard Delivery (3-5 business days)",
    shippingFee: "50.00"
  },
];

const STATUS_COLORS = {
  Delivered: "status--green",
  Processing: "status--amber",
  Cancelled: "status--red",
};

const STATUS_OPTIONS = ["All", "Delivered", "Processing", "Cancelled"];

const OrdersTab = () => {
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
  const navigate = useNavigate();

  const filteredOrders = MOCK_ORDERS.filter(order => {
    const matchesStatus = selectedStatus === "All" || order.status === selectedStatus;
    const matchesSearch = order.items.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusCount = (status) => {
    if (status === "All") return MOCK_ORDERS.length;
    return MOCK_ORDERS.filter(o => o.status === status).length;
  };

  const handleCancelOrder = (order) => {
    setSelectedOrder(order);
    setShowCancelModal(true);
  };

  const handleConfirmCancel = () => {
    if (!cancelReason.trim()) {
      alert("Please provide a reason for cancellation");
      return;
    }
    
    console.log("Cancelling order:", selectedOrder.id, "Reason:", cancelReason);
    setShowCancelModal(false);
    setCancelReason("");
    setSelectedOrder(null);
    alert("Cancellation request submitted successfully! The seller will process your request within a few hours.");
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

  // Calculate which steps are completed based on order status
  const getCompletedSteps = (order) => {
    if (!order) return 0;
    if (order.status === "Cancelled") return 0;
    if (order.status === "Processing") return 2;
    if (order.status === "Delivered") return 4;
    return 1;
  };

  const progressSteps = [
    { label: "Order Placed", icon: <FaBox />, key: "orderPlaced" },
    { label: "Order Shipped", icon: <FaShippingFast />, key: "orderShipped" },
    { label: "Order Received", icon: <FaHandHoldingHeart />, key: "outForDelivery" },
    { label: "To Rate", icon: <FaStar />, key: "delivered" }
  ];

  // Only calculate these when trackingOrder exists
  const completedCount = trackingOrder ? getCompletedSteps(trackingOrder) : 0;
  const progressPercentage = trackingOrder ? (completedCount / 4) * 100 : 0;

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

        {/* Progress Bar with Icons - Modern Design */}
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
            <p className="card-number">{MOCK_ORDERS.length}</p>
          </div>
          <div className="card-icon"><FaBox /></div>
        </div>
        <div className="card">
          <div className="card-info">
            <p className="card-title">To Ship</p>
            <p className="card-number">{MOCK_ORDERS.filter(o => o.status === "Processing").length}</p>
          </div>
          <div className="card-icon"><FaTruck /></div>
        </div>
        <div className="card">
          <div className="card-info">
            <p className="card-title">To Receive</p>
            <p className="card-number">{MOCK_ORDERS.filter(o => o.status === "Delivered").length}</p>
          </div>
          <div className="card-icon"><FaClipboardCheck /></div>
        </div>
        <div className="card">
          <div className="card-info">
            <p className="card-title">To Rate</p>
            <p className="card-number">{MOCK_ORDERS.filter(o => o.status === "Delivered").length}</p>
          </div>
          <div className="card-icon"><FaStar /></div>
        </div>
        <div className="card">
          <div className="card-info">
            <p className="card-title">Canceled</p>
            <p className="card-number">{MOCK_ORDERS.filter(o => o.status === "Cancelled").length}</p>
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
            Showing {filteredOrders.length} of {MOCK_ORDERS.length} orders
          </p>
        </div>
        
        {filteredOrders.length === 0 ? (
          <div className="empty-state">
            <p className="empty-msg">No orders found matching your criteria.</p>
            <button 
              className="clear-filters-btn"
              onClick={() => {
                setSelectedStatus("All");
                setSearchTerm("");
              }}
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="orders-list">
            {filteredOrders.map((o) => (
              <div className="order-row" key={o.id}>
                <div className="order-image">
                  <img 
                    src={o.image} 
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
                  {o.status !== "Cancelled" && o.status !== "Delivered" && (
                    <button 
                      className="action-btn cancel-btn"
                      onClick={() => handleCancelOrder(o)}
                    >
                      <FaBan /> Cancel Order
                    </button>
                  )}
                  <button 
                    className="action-btn track-btn"
                    onClick={() => handleTrackOrder(o)}
                  >
                    <FaMapMarkerAlt /> Track Order
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Cancel Order Modal */}
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
                    src={selectedOrder.image} 
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
      )}
    </div>
  );
};

export default OrdersTab;