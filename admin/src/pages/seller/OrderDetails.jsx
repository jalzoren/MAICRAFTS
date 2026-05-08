import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../../css/OrderDetails.css";

const OrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [orderStatus, setOrderStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Helper to get auth headers
  const getAuthHeaders = () => {
    const sessionData = sessionStorage.getItem('mc_session');
    if (!sessionData) return {};
    const session = JSON.parse(sessionData);
    const token = session.user?.access_token;
    return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : {};
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`http://localhost:5000/api/orders/${id}`, { headers });
      const data = await response.json();
      if (data.success) {
        const orderData = data.data;
        setOrder(orderData);
        setOrderStatus(orderData.order_status);
        setPaymentStatus(orderData.payment_status === 'paid');
      } else {
        alert('Order not found');
        navigate('/seller/orders');
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      alert('Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrder = async () => {
    setUpdating(true);
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`http://localhost:5000/api/orders/${id}/status`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          order_status: orderStatus,
          payment_status: paymentStatus ? 'paid' : 'unpaid',
        }),
      });
      const data = await response.json();
      if (data.success) {
        alert('Order updated successfully');
        fetchOrder(); // refresh
      } else {
        alert(data.error || 'Update failed');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Failed to update order');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div className="order-management">Loading order details...</div>;
  if (!order) return <div className="order-management">Order not found</div>;

  // Helper to display address
  const getAddressString = (addr) => {
    if (!addr) return 'No address';
    if (typeof addr === 'string') {
      try { addr = JSON.parse(addr); } catch(e) { return addr; }
    }
    return `${addr.street || ''}, ${addr.barangay || ''}, ${addr.city || ''}, ${addr.province || ''}`.replace(/^,|, ,/g, '').trim();
  };

  return (
    <div className="order-management">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-header__title">Order Details</h1>
            <p className="page-header__breadcrumb">Seller Dashboard / Order Management / {order.order_number}</p>
          </div>
          <button onClick={() => navigate('/seller/orders')} className="btn-secondary">Back to Orders</button>
        </div>
      </div>

      <div className="order-details-grid">
        {/* LEFT COLUMN */}
        <div className="order-details-left">
          {/* Customer Info */}
          <div className="card-box">
            <div className="card-box__header">Customer Information</div>
            <div className="card-box__body">
              <div className="info-grid">
                <div><strong>Name:</strong> {order.customer_name}</div>
                <div><strong>Email:</strong> {order.customer_email}</div>
                <div><strong>Phone:</strong> {order.phone_number || 'N/A'}</div>
                <div><strong>Address:</strong> {getAddressString(order.shipping_address)}</div>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="card-box">
            <div className="card-box__header">Order Items</div>
            <div className="card-box__body">
              {/* We need to fetch order_items separately. For simplicity, assume order.items exists. 
                  You can also fetch via another API or include in the order object. 
                  Here we'll use order.items from database (if included in select) */}
              {order.items && order.items.length > 0 ? (
                  <table style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <th>Image</th>
                          <th>Product</th>
                          <th>Qty</th>
                          <th>Price</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                    <tbody>
                      {order.items.map((item, idx) => (
                        <tr key={idx}>
                          <td>
                            <img
                              src={item.product?.main_image || item.product?.image || 'https://via.placeholder.com/40?text=🌸'}
                              alt={item.product?.name}
                              style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                              onError={(e) => { e.target.src = 'https://via.placeholder.com/40?text=🌸'; }}
                            />
                          </td>
                          <td>{item.product?.name || 'Product'}</td>
                          <td>{item.quantity}</td>
                          <td>₱{Number(item.price).toFixed(2)}</td>
                          <td>₱{(item.price * item.quantity).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <p>No items found</p>}
            </div>
          </div>

          {/* Special Instructions */}
          {order.special_instructions && (
            <div className="card-box">
              <div className="card-box__header">Special Instructions</div>
              <div className="card-box__body">{order.special_instructions}</div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="order-details-right">
          {/* Order Actions */}
          <div className="card-box">
            <div className="card-box__header">Order Actions</div>
            <div className="card-box__body">
              <div className="form-group">
                <label>Order Status</label>
                  <div className="status-buttons">
                    {['pending', 'preparing', 'shipped', 'completed'].map((status) => (
                      <button
                        key={status}
                        className={`status-btn ${orderStatus === status ? 'active' : ''}`}
                        onClick={() => setOrderStatus(status)}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    ))}
                  </div>
              </div>
              <div className="action-buttons">
                <button className="btn-secondary" onClick={() => window.print()}>Receipt</button>
                <button className="btn-primary" onClick={handleUpdateOrder} disabled={updating}>
                  {updating ? 'Updating...' : 'Update'}
                </button>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="card-box">
            <div className="card-box__header">Order Summary</div>
            <div className="card-box__body">
              <div className="summary-row"><span>Subtotal:</span><span>₱{Number(order.subtotal).toFixed(2)}</span></div>
              <div className="summary-row"><span>Shipping:</span><span>₱{Number(order.shipping_fee).toFixed(2)}</span></div>
              <div className="summary-divider"></div>
              <div className="summary-row total"><span>Total:</span><span>₱{Number(order.total_amount).toFixed(2)}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;