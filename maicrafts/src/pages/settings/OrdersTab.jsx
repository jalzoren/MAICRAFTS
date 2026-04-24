import "./css/OrdersTab.css";

// TODO: replace with real fetch from /api/orders/:userId
const MOCK_ORDERS = [
  { id: "#ORD-0021", date: "April 10, 2026",  status: "Delivered",  total: "₱850.00",   items: "Crochet Bunny Plush" },
  { id: "#ORD-0018", date: "March 28, 2026",  status: "Processing", total: "₱1,200.00", items: "Custom Pet Portrait" },
  { id: "#ORD-0014", date: "March 5, 2026",   status: "Delivered",  total: "₱430.00",   items: "Mini Crochet Keychain (x2)" },
  { id: "#ORD-0009", date: "Feb 14, 2026",    status: "Cancelled",  total: "₱680.00",   items: "Crochet Bouquet" },
];

const STATUS_COLORS = {
  Delivered:  "status--green",
  Processing: "status--amber",
  Cancelled:  "status--red",
};

const OrdersTab = () => (
  <div className="tab-content">
    <section className="settings-section">
      <h2 className="section-heading">Order History</h2>
      {MOCK_ORDERS.length === 0 ? (
        <p className="empty-msg">You have no orders yet.</p>
      ) : (
        <div className="orders-list">
          {MOCK_ORDERS.map((o) => (
            <div className="order-row" key={o.id}>
              <div className="order-meta">
                <span className="order-id">{o.id}</span>
                <span className="order-date">{o.date}</span>
              </div>
              <p className="order-items">{o.items}</p>
              <div className="order-footer">
                <span className={`order-status ${STATUS_COLORS[o.status] || ""}`}>
                  {o.status}
                </span>
                <span className="order-total">{o.total}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  </div>
);

export default OrdersTab;