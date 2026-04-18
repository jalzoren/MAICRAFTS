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

const OrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="order-management">

      {/* HEADER */}
      <div className="page-header">
        <h1 className="page-header__title">Order Management</h1>
        <p className="page-header__breadcrumb">
          Seller Dashboard / Order Management / {id}
        </p>
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
                <span className="info-value">John Doe</span>
            </div>

            <div className="info-item">
                <span className="info-label">Email</span>
                <span className="info-value">john@email.com</span>
            </div>

            <div className="info-item">
                <span className="info-label">Phone</span>
                <span className="info-value">09123456789</span>
            </div>

            <div className="info-item">
                <span className="info-label">Address</span>
                <span className="info-value">Rizal, Philippines</span>
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

                {/* ITEM 1 - iPhone 13 */}
                <div className="order-table row">
                <div className="product-info">
                    <div className="product-image">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                        <line x1="12" y1="18" x2="12" y2="18" strokeWidth="2" />
                    </svg>
                    </div>
                    <div className="product-details">
                    <div className="product-name">Product Name #1</div>
                    <div className="product-variant">Var: Red Rose </div>
                    </div>
                </div>
                <span>2</span>
                <span>₱12.00</span>
                <span>₱24.00</span>
                </div>

                {/* ITEM 2 - AirPods Pro */}
                <div className="order-table row">
                <div className="product-info">
                    <div className="product-image">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M9 18V9a6 6 0 0 1 12 0v9" />
                        <path d="M9 12h12" />
                        <circle cx="21" cy="15" r="3" />
                        <circle cx="3" cy="15" r="3" />
                        <path d="M3 15V9a6 6 0 0 1 12 0" />
                    </svg>
                    </div>
                    <div className="product-details">
                    <div className="product-name">Product Name #2</div>
                    <div className="product-variant">Var: Color White</div>
                    </div>
                </div>
                <span>1</span>
                <span>₱45.00</span>
                <span>₱45.00</span>
                </div>

                {/* ITEM 3 - USB-C Cable */}
                <div className="order-table row">
                <div className="product-info">
                    <div className="product-image">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                        <circle cx="12" cy="12" r="3" />
                    </svg>
                    </div>
                    <div className="product-details">
                    <div className="product-name">Product Name #3</div>
                    <div className="product-variant">Var: Color Blue</div>
                    </div>
                </div>
                <span>3</span>
                <span>₱5.00</span>
                <span>₱15.00</span>
                </div>
            </div>

              {/* ORDER SUMMARY - Total Items */}
                <div className="order-summary">
                <div className="order-summary__row">
                    <span>Total Items:</span>
                    <span>6 items</span>
                </div>
                </div>

                {/* NOTES SECTION */}
                <div className="order-notes">
                <div className="order-notes__label">Notes:</div>
                <div className="order-notes__text">
                    Please secure the packaging of my order. Thank you.
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
                <select>
                    <option>Confirmed</option>
                    <option>Preparing</option>
                    <option>Shipped</option>
                    <option>Cancelled</option>
                </select>
                </div>

                {/* Payment Status with Toggle */}
               {/* Payment Status */}
                <div className="form-group">
                <label>Payment Status</label>

                <div className="fake-select with-toggle">
                    <span className="status-text">Paid</span>

                    <label className="switch small">
                    <input type="checkbox" defaultChecked />
                    <span className="slider"></span>
                    </label>
                </div>
                </div>
                {/* Buttons */}
                <div className="action-buttons">
                <button className="btn-secondary">View Receipt</button>
                <button className="btn-primary">Update</button>
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
              <p>Total: ₱145.00</p>
              <p>Status: Pending</p>
            </div>
          </div>

          {/* Activity */}
          <div className="card-box">
            <div className="card-box__header">
              <Icon><ActivityIcon /></Icon>
              <span>Recent Activity</span>
            </div>
            <div className="card-box__body">
              <p>Order created</p>
              <p>Payment received</p>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};

export default OrderDetails;