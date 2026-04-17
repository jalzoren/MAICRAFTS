// src/pages/staff/Dashboard.jsx (Seller Dashboard)
import React from 'react';
import '../../css/Dashboard.css';

const SellerDashboard = () => {
  return (
    <div className="dashboard-container">
      <h1>Seller Dashboard</h1>
      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>Total Products</h3>
          <p>0</p>
        </div>
        <div className="stat-card">
          <h3>Total Orders</h3>
          <p>0</p>
        </div>
        <div className="stat-card">
          <h3>Pending Orders</h3>
          <p>0</p>
        </div>
        <div className="stat-card">
          <h3>Revenue</h3>
          <p>$0</p>
        </div>
      </div>
    </div>
  );
};

export default SellerDashboard;