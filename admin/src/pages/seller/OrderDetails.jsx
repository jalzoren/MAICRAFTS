import { useState, useEffect } from "react";
// OrderDetails.jsx (Seller Dashboard - Order Details Page)
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useParams, useNavigate } from "react-router-dom";
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

const OrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [orderStatus, setOrderStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState(true);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);

  const API_BASE_URL = 'http://localhost:5000/api';

 const fetchOrderDetails = async (orderId) => {
  try {
    setLoading(true);
    setError(null);
    const headers = getAuthHeaders();
    
    const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, { headers });
    const data = await response.json();
    
    console.log('API Response:', data);
    
    if (data.success && data.data) {
      const orderData = data.data;
      
      // Try both possible field names
      let itemsArray = orderData.order_items || orderData.items || [];
      
      console.log('Items array found:', itemsArray);
      console.log('Number of items:', itemsArray.length);
      
      // Transform items
      const itemsList = itemsArray.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity || 0,
        price: parseFloat(item.price) || 0,
        total: (item.quantity || 0) * (parseFloat(item.price) || 0)
      }));
      
      console.log('Transformed itemsList:', itemsList);
      
      // Parse address
      let addressString = 'No address provided';
      if (orderData.shipping_address) {
        try {
          let addressData = orderData.shipping_address;
          if (typeof addressData === 'string') {
            if (addressData.startsWith('"') && addressData.endsWith('"')) {
              addressData = JSON.parse(addressData);
            }
            addressData = JSON.parse(addressData);
          }
          const parts = [addressData.street, addressData.barangay, addressData.city, addressData.province].filter(p => p);
          addressString = parts.length > 0 ? parts.join(', ') : 'No address provided';
        } catch (e) {
          console.error('Error parsing address:', e);
        }
      }
      
      // Format dates properly using created_at
      const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      };
      
      const orderPlacedDate = formatDate(orderData.created_at);
      const updatedDate = formatDate(orderData.updated_at);
      
      const transformedOrder = {
        id: orderData.order_number,
        cleanId: orderData.order_id,
        customerName: orderData.customer_name || 'N/A',
        customerEmail: orderData.customer_email || 'N/A',
        customerPhone: orderData.phone_number || 'N/A',
        customerAddress: addressString,
        itemsList: itemsList,
        subtotal: parseFloat(orderData.subtotal) || 0,
        shipping: parseFloat(orderData.shipping_fee) || 0,
        total: parseFloat(orderData.total_amount) || 0,
        status: orderData.order_status || 'pending',
        payment: orderData.payment_status || 'unpaid',
        notes: orderData.special_instructions || 'No special instructions',
        orderPlaced: orderPlacedDate,
        activities: [
          { title: "Order placed by customer", time: orderPlacedDate, status: "gray" },
          ...(orderData.payment_status === 'paid' ? [{ title: "Payment received", time: updatedDate, status: "gold" }] : []),
          ...(orderData.order_status === 'confirmed' ? [{ title: "Order confirmed", time: updatedDate, status: "blue" }] : []),
          ...(orderData.order_status === 'preparing' ? [{ title: "Order is being prepared", time: updatedDate, status: "blue" }] : []),
          ...(orderData.order_status === 'shipped' ? [{ title: "Order shipped", time: updatedDate, status: "green" }] : []),
          ...(orderData.order_status === 'completed' ? [{ title: "Order delivered", time: updatedDate, status: "green" }] : []),
          ...(orderData.order_status === 'cancelled' ? [{ title: "Order cancelled", time: updatedDate, status: "red" }] : [])
        ]
      };
      
      console.log('Final transformed order items count:', transformedOrder.itemsList.length);
      console.log('Order placed date:', transformedOrder.orderPlaced);
      
      setOrder(transformedOrder);
      setOrderStatus(transformedOrder.status);
      setPaymentStatus(transformedOrder.payment === "paid");
    } else {
      setError(data.error || 'Order not found');
    }
  } catch (error) {
    console.error('Error fetching order:', error);
    setError('Failed to fetch order details');
  } finally {
    setLoading(false);
  }
};
  const handleUpdateOrder = async () => {
    if (!order) return;
    
    try {
      setUpdating(true);
      const headers = getAuthHeaders();
      const updateData = {};
      
      if (orderStatus !== order.status) {
        updateData.order_status = orderStatus;
      }
      
      const newPaymentStatus = paymentStatus ? "paid" : "unpaid";
      if (newPaymentStatus !== order.payment) {
        updateData.payment_status = newPaymentStatus;
      }
      
      if (Object.keys(updateData).length === 0) {
        alert("No changes to update");
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/orders/${order.cleanId}/status`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updateData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`Order ${order.id} updated successfully!`);
        await fetchOrderDetails(order.cleanId);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Error updating order');
    } finally {
      setUpdating(false);
    }
  };

  const handleReceipt = () => {
    alert(`Generating receipt for ${order?.id}`);
  };

  useEffect(() => {
    if (id) {
      fetchOrderDetails(id);
    } else {
      setLoading(false);
      setError('No order ID provided');
    }
  }, [id]);

  if (loading) {
    return (
      <div className="order-management">
        <div className="page-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div>
              <h1 className="page-header__title">Order Management</h1>
              <p className="page-header__breadcrumb">Seller Dashboard / Order Management / Loading...</p>
            </div>
            <button onClick={() => navigate("/seller/orders")} className="btn-secondary">Back to Orders</button>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '60px' }}>Loading order details...</div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="order-management">
        <div className="page-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div>
              <h1 className="page-header__title">Order Management</h1>
              <p className="page-header__breadcrumb">Seller Dashboard / Order Management / Error</p>
            </div>
            <button onClick={() => navigate("/seller/orders")} className="btn-primary">Back to Orders</button>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '60px', color: '#e74c3c' }}>
          {error || 'Order not found'}
        </div>
      </div>
    );
  }

  const totalItems = order.itemsList.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const calculatedSubtotal = order.itemsList.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0);
  const displaySubtotal = order.subtotal > 0 ? order.subtotal : calculatedSubtotal;

  return (
    <div className="order-management">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div>
            <h1 className="page-header__title">Order Management</h1>
            <p className="page-header__breadcrumb">Seller Dashboard / Order Management / {order.id}</p>
          </div>
          <button onClick={() => navigate("/seller/orders")} className="btn-secondary">Back to Orders</button>
        </div>
      </div>

      <div className="order-details-grid">
        {/* LEFT COLUMN */}
        <div className="order-details-left">
          {/* Customer Info */}
          <div className="card-box">
            <div className="card-box__header">
              <Icon><UserIcon /></Icon>
              <span>Customer Information</span>
            </div>
            <div className="info-grid">
              <div className="info-item"><span className="info-label">Name</span><span className="info-value">{order.customerName}</span></div>
              <div className="info-item"><span className="info-label">Email</span><span className="info-value">{order.customerEmail}</span></div>
              <div className="info-item"><span className="info-label">Phone</span><span className="info-value">{order.customerPhone}</span></div>
              <div className="info-item"><span className="info-label">Address</span><span className="info-value">{order.customerAddress}</span></div>
            </div>
          </div>

          {/* Order Items */}
          <div className="card-box">
            <div className="card-box__header">
              <Icon><ShoppingBagIcon /></Icon>
              <span>Order Items</span>
            </div>
            <div className="card-box__body">
              <div className="order-table header">
                <span>Product</span>
                <span>Qty</span>
                <span>Price</span>
                <span>Total</span>
              </div>
              {order.itemsList.length > 0 ? (
                order.itemsList.map((item, index) => (
                  <div key={index} className="order-table row">
                    <div className="product-info">
                      <div className="product-image">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                          <line x1="12" y1="18" x2="12" y2="18" strokeWidth="2" />
                        </svg>
                      </div>
                      <div className="product-details">
                        <div className="product-name">Product #{item.product_id?.substring(0, 8)}...</div>
                        <div className="product-variant">Standard</div>
                      </div>
                    </div>
                    <span>{item.quantity}</span>
                    <span>₱{item.price.toFixed(2)}</span>
                    <span>₱{item.total.toFixed(2)}</span>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>No items found for this order</div>
              )}
            </div>
            <div className="order-summary">
              <div className="order-summary__row">
                <span>Total Items:</span>
                <span>{totalItems} {totalItems === 1 ? 'item' : 'items'}</span>
              </div>
            </div>
            <div className="order-notes">
              <div className="order-notes__label">Notes:</div>
              <div className="order-notes__text">{order.notes}</div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="order-details-right">
          {/* Actions */}
          <div className="card-box">
            <div className="card-box__header">
              <Icon><ActionIcon /></Icon>
              <span>Order Actions</span>
            </div>
            <div className="card-box__body">
              <div className="form-group">
                <label>Order Status</label>
                <select value={orderStatus} onChange={(e) => setOrderStatus(e.target.value)} disabled={updating}>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="preparing">Preparing</option>
                  <option value="shipped">Shipped</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="form-group">
                <label>Payment Status</label>
                <div className="fake-select with-toggle">
                  <span className="status-text">{paymentStatus ? "Paid" : "Unpaid"}</span>
                  <label className="switch small">
                    <input type="checkbox" checked={paymentStatus} onChange={(e) => setPaymentStatus(e.target.checked)} disabled={updating} />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>
              <div className="action-buttons">
                <button className="btn-secondary" onClick={handleReceipt} disabled={updating}>Receipt</button>
                <button className="btn-primary" onClick={handleUpdateOrder} disabled={updating}>{updating ? 'Updating...' : 'Update'}</button>
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
              <div className="summary-row"><span className="label">Subtotal</span><span className="value gray">₱{displaySubtotal.toFixed(2)}</span></div>
              <div className="summary-row"><span className="label">Shipping</span><span className="value gray">₱{order.shipping.toFixed(2)}</span></div>
              <div className="summary-divider"></div>
              <div className="summary-row total"><span className="label total-label">Total</span><span className="value total-value">₱{order.total.toFixed(2)}</span></div>
            </div>
          </div>

          {/* Activity 
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
          */}
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;