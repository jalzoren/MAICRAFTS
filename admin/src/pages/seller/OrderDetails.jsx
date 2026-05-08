import { useState, useEffect } from "react";
// OrderDetails.jsx (Seller Dashboard - Order Details Page)
import { useParams, useNavigate, useLocation } from "react-router-dom";
import "../../css/OrderDetails.css";

const Icon = ({ children }) => (
  <span className="card-icon">{children}</span>
);

const UserIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M20 21a8 8 0 10-16 0" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const ShoppingBagIcon = () => (
    <svg viewBox="0 0 24 24">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  );

const ActionIcon = () => (
  <svg viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" />
    <path d="M8 12h8" />
  </svg>
);

const SummaryIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M3 3h18v18H3z" />
    <path d="M3 9h18" />
  </svg>
);

const ActivityIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M3 12h4l3 8 4-16 3 8h4" />
  </svg>
);

const OrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [order, setOrder] = useState(null);
  const [orderStatus, setOrderStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState(true); // true for Paid, false for Unpaid
  const [loading, setLoading] = useState(true);

  // Sample orders data (in a real app, this would come from an API)
  const ordersData = {
    "ORD-2485": {
      id: "#ORD-2485",
      customerName: "Jerimiah Bitancor",
      customerEmail: "jerimiah@email.com",
      customerPhone: "09123456780",
      customerAddress: "Manila, Philippines",
      itemsList: [
        { name: "Product Name #1", variant: "Var: Red Rose", quantity: 2, price: 12.00, total: 24.00 },
        { name: "Product Name #2", variant: "Var: Color White", quantity: 1, price: 45.00, total: 45.00 }
      ],
      subtotal: 69.00,
      shipping: 25.00,
      total: 94.00,
      status: "Pending",
      payment: "Paid",
      notes: "Please handle with care",
      activities: [
        { title: "Order placed by customer", time: "Today, 10:23 PM", status: "gray" },
        { title: "Payment received", time: "Today, 10:30 PM", status: "gold" }
      ]
    },
    "ORD-2484": {
      id: "#ORD-2484",
      customerName: "Bianca Rain Castillon",
      customerEmail: "bianca@email.com",
      customerPhone: "09123456781",
      customerAddress: "Cebu, Philippines",
      itemsList: [
        { name: "Product Name #2", variant: "Var: Color White", quantity: 1, price: 45.00, total: 45.00 }
      ],
      subtotal: 45.00,
      shipping: 40.50,
      total: 85.50,
      status: "Preparing",
      payment: "Paid",
      notes: "Please deliver before 5PM",
      activities: [
        { title: "Order placed by customer", time: "Yesterday, 08:15 PM", status: "gray" },
        { title: "Payment received", time: "Yesterday, 08:20 PM", status: "gold" },
        { title: "Order is being prepared", time: "Today, 09:00 AM", status: "blue" }
      ]
    },
    "ORD-2483": {
      id: "#ORD-2483",
      customerName: "Laurence Flavier",
      customerEmail: "laurence@email.com",
      customerPhone: "09123456782",
      customerAddress: "Davao, Philippines",
      itemsList: [
        { name: "Product Name #3", variant: "Var: Color Blue", quantity: 3, price: 5.00, total: 15.00 },
        { name: "Product Name #1", variant: "Var: Red Rose", quantity: 1, price: 12.00, total: 12.00 }
      ],
      subtotal: 27.00,
      shipping: 73.20,
      total: 100.20,
      status: "Completed",
      payment: "Paid",
      notes: "Leave at the guardhouse",
      activities: [
        { title: "Order placed by customer", time: "Oct 22, 02:30 PM", status: "gray" },
        { title: "Payment received", time: "Oct 22, 02:35 PM", status: "gold" },
        { title: "Order shipped", time: "Oct 23, 10:00 AM", status: "blue" },
        { title: "Order delivered", time: "Oct 24, 02:00 PM", status: "green" }
      ]
    },
    "ORD-2482": {
      id: "#ORD-2482",
      customerName: "Lyn Czyla Alpuerto",
      customerEmail: "lyn@email.com",
      customerPhone: "09123456783",
      customerAddress: "Rizal, Philippines",
      itemsList: [
        { name: "Product Name #4", variant: "Var: Color Black", quantity: 1, price: 45.00, total: 45.00 }
      ],
      subtotal: 45.00,
      shipping: 0,
      total: 45.00,
      status: "Cancelled",
      payment: "Refunded",
      notes: "Customer requested cancellation",
      activities: [
        { title: "Order placed by customer", time: "Oct 21, 11:00 AM", status: "gray" },
        { title: "Payment received", time: "Oct 21, 11:05 AM", status: "gold" },
        { title: "Order cancelled by customer", time: "Oct 21, 01:00 PM", status: "red" },
        { title: "Payment refunded", time: "Oct 21, 01:30 PM", status: "orange" }
      ]
    },
    "ORD-2481": {
      id: "#ORD-2481",
      customerName: "Neil Adrian Onrubia",
      customerEmail: "neil@email.com",
      customerPhone: "09123456784",
      customerAddress: "Laguna, Philippines",
      itemsList: [
        { name: "Product Name #5", variant: "Var: Premium", quantity: 2, price: 80.00, total: 160.00 },
        { name: "Product Name #1", variant: "Var: Red Rose", quantity: 1, price: 12.00, total: 12.00 }
      ],
      subtotal: 172.00,
      shipping: 38.00,
      total: 210.00,
      status: "Shipped",
      payment: "Paid",
      notes: "Please secure the packaging",
      activities: [
        { title: "Order placed by customer", time: "Oct 21, 09:00 AM", status: "gray" },
        { title: "Payment received", time: "Oct 21, 09:05 AM", status: "gold" },
        { title: "Order is being prepared", time: "Oct 21, 10:00 AM", status: "blue" },
        { title: "Order shipped", time: "Oct 22, 08:00 AM", status: "green" }
      ]
    }
  };

  useEffect(() => {
    // Check if order data was passed via state (from OrderManagement)
    if (location.state?.order) {
      const orderData = location.state.order;
      setOrder(orderData);
      setOrderStatus(orderData.status);
      setPaymentStatus(orderData.payment === "Paid");
    } 
    // Otherwise, fetch by ID from the local data
    else if (id && ordersData[id]) {
      setOrder(ordersData[id]);
      setOrderStatus(ordersData[id].status);
      setPaymentStatus(ordersData[id].payment === "Paid");
    }
    setLoading(false);
  }, [id, location.state]);

  const handleUpdateOrder = () => {
    // In a real app, this would make an API call to update the order
    alert(`Order ${order?.id} updated!\nNew Status: ${orderStatus}\nPayment Status: ${paymentStatus ? "Paid" : "Unpaid"}`);
    // You could also navigate back or show a success message
  };

  const handleReceipt = () => {
    // In a real app, this would generate/download a receipt
    alert(`Generating receipt for ${order?.id}`);
  };

  if (loading) {
    return <div className="order-management">Loading...</div>;
  }

  if (!order) {
    return (
      <div className="order-management">
        <div className="page-header">
          <h1 className="page-header__title">Order Not Found</h1>
          <button onClick={() => navigate("/seller/orders")} className="btn-primary">
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  const totalItems = order.itemsList.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="order-management">

      {/* HEADER */}
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div>
            <h1 className="page-header__title">Order Management</h1>
            <p className="page-header__breadcrumb">
              Seller Dashboard / Order Management / {order.id}
            </p>
          </div>
          <button onClick={() => navigate("/seller/orders")} className="btn-secondary">
            Back to Orders
          </button>
        </div>
      </div>

      {/* GRID */}
      <div className="order-details-grid">

        {/* LEFT */}
        <div className="order-details-left">

          {/* Customer Info */}
          <div className="card-box">
            <div className="card-box__header">
              <Icon><UserIcon /></Icon>
              <span>Customer Information</span>
            </div>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Name</span>
                <span className="info-value">{order.customerName}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Email</span>
                <span className="info-value">{order.customerEmail}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Phone</span>
                <span className="info-value">{order.customerPhone}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Address</span>
                <span className="info-value">{order.customerAddress}</span>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="card-box">
            <div className="card-box__header">
              <Icon><ShoppingBagIcon /></Icon>
              <span>Order Items</span>
            </div>

            <div className="card-box__body">
              {/* TABLE HEADER */}
              <div className="order-table header">
                <span>Product</span>
                <span>Qty</span>
                <span>Price</span>
                <span>Total</span>
              </div>

              {/* ITEMS */}
              {order.itemsList.map((item, index) => (
                <div key={index} className="order-table row">
                  <div className="product-info">
                    <div className="product-image">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                        <line x1="12" y1="18" x2="12" y2="18" strokeWidth="2" />
                      </svg>
                    </div>
                    <div className="product-details">
                      <div className="product-name">{item.name}</div>
                      <div className="product-variant">{item.variant}</div>
                    </div>
                  </div>
                  <span>{item.quantity}</span>
                  <span>₱{item.price.toFixed(2)}</span>
                  <span>₱{item.total.toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* ORDER SUMMARY - Total Items */}
            <div className="order-summary">
              <div className="order-summary__row">
                <span>Total Items:</span>
                <span>{totalItems} {totalItems === 1 ? 'item' : 'items'}</span>
              </div>
            </div>

            {/* NOTES SECTION */}
            <div className="order-notes">
              <div className="order-notes__label">Notes:</div>
              <div className="order-notes__text">
                {order.notes}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="order-details-right">

          {/* Actions */}
          <div className="card-box">
            <div className="card-box__header">
              <Icon><ActionIcon /></Icon>
              <span>Order Actions</span>
            </div>

            <div className="card-box__body">
              {/* Order Status */}
              <div className="form-group">
                <label>Order Status</label>
                <select value={orderStatus} onChange={(e) => setOrderStatus(e.target.value)}>
                  <option>Pending</option>
                  <option>Preparing</option>
                  <option>Shipped</option>
                  <option>Completed</option>
                  <option>Cancelled</option>
                </select>
              </div>

              {/* Payment Status */}
              <div className="form-group">
                <label>Payment Status</label>
                <div className="fake-select with-toggle">
                  <span className="status-text">{paymentStatus ? "Paid" : "Unpaid"}</span>
                  <label className="switch small">
                    <input 
                      type="checkbox" 
                      checked={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>
              
              {/* Buttons */}
              <div className="action-buttons">
                <button className="btn-secondary" onClick={handleReceipt}>Receipt</button>
                <button className="btn-primary" onClick={handleUpdateOrder}>Update</button>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="card-box">
            <div className="card-box__header">
              <Icon><SummaryIcon /></Icon>
              <span>Order Summary</span>
            </div>

            <div className="card-box__body">
              <div className="summary-row">
                <span className="label">Subtotal</span>
                <span className="value gray">₱{order.subtotal.toFixed(2)}</span>
              </div>

              <div className="summary-row">
                <span className="label">Shipping</span>
                <span className="value gray">₱{order.shipping.toFixed(2)}</span>
              </div>

              <div className="summary-divider"></div>

              <div className="summary-row total">
                <span className="label total-label">Total</span>
                <span className="value total-value">₱{order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Activity */}
          <div className="card-box">
            <div className="card-box__header">
              <Icon><ActivityIcon /></Icon>
              <span>Recent Activity</span>
            </div>

            <div className="card-box__body">
              {order.activities.map((activity, index) => (
                <div key={index} className="activity-item">
                  <span className={`dot ${activity.status}`}></span>
                  <div className="activity-content">
                    <p className="activity-title">{activity.title}</p>
                    <span className="activity-time">{activity.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;