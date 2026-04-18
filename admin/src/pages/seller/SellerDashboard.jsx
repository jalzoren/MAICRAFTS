// src/pages/staff/SellerDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext'; // Add this import
import '../../css/SellerDashboard.css';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const lowStockData = [
  { name: 'Product 1', value: 95 },
  { name: 'Product 2', value: 60 },
  { name: 'Product 3', value: 75 },
  { name: 'Product 4', value: 55 },
  { name: 'Product 5', value: 45 },
  { name: 'Product 6', value: 100 },
];

const barColors = ['#C8962A', '#D4A843', '#3D1A00', '#E8B4B8', '#7A1C1C', '#8B0000'];

const SellerDashboard = () => {
  const { user } = useAuth(); // Get user from auth
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2);
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  // Get user's name (prefer name, then first_name + last_name, then username, then fallback)
  const getUserName = () => {
    if (user?.name) return user.name;
    if (user?.first_name && user?.last_name) return `${user.first_name} ${user.last_name}`;
    if (user?.username) return user.username;
    return 'Seller';
  };

  return (
    <div className="sd-container">
      {/* Header */}
      <div className="sd-header">
        <div className="sd-header-left">
          <span className="sd-label">Dashboard</span>
          <h1 className="sd-welcome">Welcome Back, {getUserName()}!</h1>
        </div>
        <div className="sd-clock">
          <div className="sd-clock-date">
            <span className="sd-day-name">{dayName}</span>
            <span className="sd-date-nums">
              {day} / {month} / {year}
            </span>
          </div>
          <span className="sd-time">{timeStr}</span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="sd-stats-row">
        <div className="sd-stat-card">
          <span className="sd-stat-label">Total Orders</span>
          <div className="sd-stat-body">
            <div className="sd-stat-icon" />
            <span className="sd-stat-value">1,000</span>
          </div>
        </div>
        <div className="sd-stat-card">
          <span className="sd-stat-label">Low Stock</span>
          <div className="sd-stat-body">
            <div className="sd-stat-icon" />
            <span className="sd-stat-value">1,000</span>
          </div>
        </div>
        <div className="sd-stat-card">
          <span className="sd-stat-label">In Stock</span>
          <div className="sd-stat-body">
            <div className="sd-stat-icon" />
            <span className="sd-stat-value">1,000</span>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="sd-bottom-row">
        {/* Large placeholder card */}
        <div className="sd-main-card" />

        {/* Low Stock Alerts Chart */}
        <div className="sd-chart-card">
          <div className="sd-chart-header">
            <span className="sd-chart-title">Low Stock Product Alerts</span>
            <span className="sd-chart-arrow">↗</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              layout="vertical"
              data={lowStockData}
              margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
            >
              <XAxis
                type="number"
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 11, fill: '#5a3e28' }}
                axisLine={{ stroke: '#c4a97d' }}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={64}
                tick={{ fontSize: 12, fill: '#3D1A00' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(v) => [`${v}%`, 'Stock Level']}
                contentStyle={{
                  background: '#fdf6e8',
                  border: '1px solid #c4a97d',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
                {lowStockData.map((_, index) => (
                  <Cell key={index} fill={barColors[index % barColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default SellerDashboard;