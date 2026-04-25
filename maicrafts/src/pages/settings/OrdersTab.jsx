import "./css/OrdersTab.css";
import { useState } from "react";
import { FaBox, FaTruck, FaClipboardCheck, FaStar, FaTimesCircle, FaSearch } from "react-icons/fa";

// Import images directly from assets folder
import doll1Img from "../../assets/doll.png";
import doll2Img from "../../assets/doll2.png";
import doll3Img from "../../assets/doll3.png";
import doll4Img from "../../assets/doll4.png";
import doll5Img from "../../assets/doll5.png";
import dollPlaceholder from "../../assets/doll5.png";

// TODO: replace with real fetch from /api/orders/:userId
const MOCK_ORDERS = [
  { 
    id: "#ORD-0021", 
    date: "April 10, 2026",  
    status: "Delivered",  
    total: "₱850.00",   
    items: "Crochet Bunny Doll",
    image: doll1Img
  },
  { 
    id: "#ORD-0018", 
    date: "March 28, 2026",  
    status: "Processing", 
    total: "₱1,200.00", 
    items: "Custom Crochet Doll",
    image: doll2Img
  },
  { 
    id: "#ORD-0014", 
    date: "March 5, 2026",   
    status: "Delivered",  
    total: "₱430.00",   
    items: "Mini Crochet Doll (x2)",
    image: doll3Img
  },
  { 
    id: "#ORD-0009", 
    date: "Feb 14, 2026",    
    status: "Cancelled",  
    total: "₱680.00",   
    items: "Crochet Flower Doll",
    image: doll4Img
  },
  { 
    id: "#ORD-0007", 
    date: "Jan 28, 2026",    
    status: "Delivered",  
    total: "₱950.00",   
    items: "Crochet Teddy Bear Doll",
    image: doll5Img
  },
  { 
    id: "#ORD-0005", 
    date: "Jan 15, 2026",    
    status: "Delivered",  
    total: "₱1,500.00",   
    items: "Custom Portrait Doll",
    image: doll2Img
  },
  { 
    id: "#ORD-0003", 
    date: "Jan 5, 2026",    
    status: "Cancelled",  
    total: "₱350.00",   
    items: "Crochet Keychain Doll",
    image: doll3Img
  },
];

const STATUS_COLORS = {
  Delivered:  "status--green",
  Processing: "status--amber",
  Cancelled:  "status--red",
};

const STATUS_OPTIONS = ["All", "Delivered", "Processing", "Cancelled"];

const OrdersTab = () => {
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  // Filter orders based on status and search term
  const filteredOrders = MOCK_ORDERS.filter(order => {
    const matchesStatus = selectedStatus === "All" || order.status === selectedStatus;
    const matchesSearch = order.items.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Get counts for each status
  const getStatusCount = (status) => {
    if (status === "All") return MOCK_ORDERS.length;
    return MOCK_ORDERS.filter(o => o.status === status).length;
  };

  return (
    <div className="tab-content">
      {/* Cards Section with dynamic counts */}
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
                {/* Product Image */}
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
                
                {/* Order Details */}
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
                    <span className="order-total">{o.total}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default OrdersTab;