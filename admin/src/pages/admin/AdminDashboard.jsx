import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FiUsers, FiPackage, FiShoppingCart, FiDollarSign, FiAlertTriangle } from 'react-icons/fi';
import '../../css/Dashboard.css';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [stats, setStats] = useState({
    totalOrders: 1000,
    lowStock: 1000,
    inStock: 1000,
  });

  const [lowStockProducts, setLowStockProducts] = useState([
    { id: 1, name: 'Product 1', stock: 5, percentage: 10 },
    { id: 2, name: 'Product 2', stock: 12, percentage: 30 },
    { id: 3, name: 'Product 3', stock: 8, percentage: 20 },
    { id: 4, name: 'Product 4', stock: 3, percentage: 8 },
    { id: 5, name: 'Product 5', stock: 15, percentage: 40 },
    { id: 6, name: 'Product 6', stock: 25, percentage: 65 },
  ]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    return `${day}/${month}/${year}`;
  };

  // FIXED: Use 'long' instead of 'uppercase', then convert to uppercase
  const getDayOfWeek = (date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
  };

  const formatTime = (date) => {
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  const StatCard = ({ title, value }) => (
    <div className="stat-card-simple">
      <h3 className="stat-card-title">{title}</h3>
      <p className="stat-card-value">{value.toLocaleString()}</p>
    </div>
  );

  return (
    <div className="admin-dashboard">
      {/* Header with Date and Time */}
      <div className="dashboard-header">
        <div className="header-left">
          <h1 className="dashboard-title">Dashboard</h1>
        </div>
        <div className="header-right">
          <div className="datetime-display">
            <div className="date-section">
              <span className="date-number">{formatDate(currentTime)}</span>
              <span className="date-day">{getDayOfWeek(currentTime)}</span>
            </div>
            <div className="time-section">
              <span className="time-value">{formatTime(currentTime)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Welcome Section */}
      <div className="welcome-section">
        <h2 className="welcome-message">Welcome Back, {user?.name || 'Lorem'}!</h2>
      </div>

      {/* Simple Stats Grid - 3 cards as shown in picture */}
      <div className="stats-grid-simple">
        <StatCard title="Total Orders" value={stats.totalOrders} />
        <StatCard title="Low Stock" value={stats.lowStock} />
        <StatCard title="In Stock" value={stats.inStock} />
      </div>

      {/* Low Stock Product Alerts */}
      <div className="lowstock-section">
        <div className="section-header">
          <h3 className="section-title">
            <FiAlertTriangle className="section-icon" />
            Low Stock Product Alerts
          </h3>
        </div>
        <div className="lowstock-list">
          {lowStockProducts.map((product) => (
            <div key={product.id} className="lowstock-item">
              <div className="product-info">
                <span className="product-name">{product.name}</span>
                <span className="product-stock">{product.stock} units left</span>
              </div>
              <div className="progress-bar-container">
                <div 
                  className="progress-bar-fill"
                  style={{ width: `${product.percentage}%` }}
                >
                  <span className="progress-percentage">{product.percentage}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default AdminDashboard;