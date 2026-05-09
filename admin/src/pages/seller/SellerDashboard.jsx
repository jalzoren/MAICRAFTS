// src/pages/seller/SellerDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import '../../css/SellerDashboard.css';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  CartesianGrid
} from 'recharts';

const barColors = ['#C8962A', '#D4A843', '#3D1A00', '#E8B4B8', '#7A1C1C', '#8B0000'];

const SellerDashboard = () => {
  const { user } = useAuth();
  const [now, setNow] = useState(new Date());
  const [stats, setStats] = useState({
    totalOrders: 0,
    pending: 0,
    preparing: 0,
    shipped: 0,
    completed: 0,
    lowStock: 0,
    inStock: 0,
    totalRevenue: 0
  });
  const [lowStockData, setLowStockData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Helper function to get auth headers
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

  // Fetch product stats
  const fetchProductStats = async () => {
    try {
      const headers = getAuthHeaders();
      const response = await fetch('http://localhost:5000/api/products/stats/summary', { headers });
      const data = await response.json();
      
      if (data.success) {
        setStats(prev => ({
          ...prev,
          lowStock: data.data.lowStock || 0,
          inStock: (data.data.totalProducts || 0) - (data.data.lowStock || 0) - (data.data.outOfStock || 0)
        }));
      }
    } catch (error) {
      console.error('Error fetching product stats:', error);
      setMockLowStockData();
    }
  };

  // Fetch low stock products for chart
  const fetchLowStockProducts = async () => {
    try {
      const headers = getAuthHeaders();
      const response = await fetch('http://localhost:5000/api/products/low-stock/list?limit=6', { headers });
      const data = await response.json();
      
      if (data.success && data.data) {
        setLowStockData(data.data);
      } else {
        setMockLowStockData();
      }
    } catch (error) {
      console.error('Error fetching low stock products:', error);
      setMockLowStockData();
    }
  };

  // Fetch order stats
  const fetchOrderStats = async () => {
    try {
      const headers = getAuthHeaders();
      const response = await fetch('http://localhost:5000/api/orders/stats/summary', { headers });
      const data = await response.json();
      
      if (data.success) {
        setStats(prev => ({
          ...prev,
          totalOrders: data.data.totalOrders || 0,
          pending: data.data.pending || 0,
          preparing: data.data.preparing || 0,
          shipped: data.data.shipped || 0,
          completed: data.data.completed || 0
        }));
      }
    } catch (error) {
      console.error('Error fetching order stats:', error);
    }
  };

  // Fetch all orders to calculate monthly revenue and recent orders
  const fetchOrdersForAnalytics = async () => {
    try {
      const headers = getAuthHeaders();
      const response = await fetch('http://localhost:5000/api/orders?limit=100', { headers });
      const data = await response.json();
      
      if (data.success && data.data) {
        const orders = data.data;
        
        // Calculate monthly revenue and orders
        const monthlyMap = new Map();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        
        orders.forEach(order => {
          const orderDate = new Date(order.created_at);
          if (orderDate >= sixMonthsAgo && order.order_status === 'completed') {
            const monthKey = orderDate.toLocaleString('default', { month: 'short' });
            const yearKey = orderDate.getFullYear();
            const key = `${monthKey} ${yearKey}`;
            
            if (!monthlyMap.has(key)) {
              monthlyMap.set(key, { month: monthKey, revenue: 0, orders: 0, fullDate: orderDate });
            }
            const existing = monthlyMap.get(key);
            existing.revenue += parseFloat(order.total_amount || 0);
            existing.orders += 1;
            monthlyMap.set(key, existing);
          }
        });
        
        // Convert to array and sort by date
        let monthlyArray = Array.from(monthlyMap.values());
        monthlyArray.sort((a, b) => a.fullDate - b.fullDate);
        monthlyArray = monthlyArray.slice(-6); // Last 6 months
        
        if (monthlyArray.length > 0) {
          setMonthlyData(monthlyArray);
        } else {
          setMockMonthlyData();
        }
        
        // Get recent orders (last 5)
        const recent = orders.slice(0, 5).map(order => ({
          id: order.order_number,
          customer: order.customer_name,
          amount: order.total_amount,
          status: order.order_status,
          date: new Date(order.created_at).toLocaleDateString()
        }));
        setRecentOrders(recent);
        
        // Calculate total revenue from completed orders
        const totalRevenue = orders
          .filter(order => order.order_status === 'completed')
          .reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0);
        
        setStats(prev => ({
          ...prev,
          totalRevenue: totalRevenue
        }));
      } else {
        setMockMonthlyData();
        setMockRecentOrders();
      }
    } catch (error) {
      console.error('Error fetching orders for analytics:', error);
      setMockMonthlyData();
      setMockRecentOrders();
    }
  };

  // Mock data for demonstration
  const setMockLowStockData = () => {
    setLowStockData([
      { name: "Product A", value: 15 },
      { name: "Product B", value: 28 },
      { name: "Product C", value: 32 },
      { name: "Product D", value: 45 },
      { name: "Product E", value: 8 },
      { name: "Product F", value: 12 }
    ]);
  };

  const setMockMonthlyData = () => {
    setMonthlyData([
      { month: "Jan", revenue: 12500, orders: 145 },
      { month: "Feb", revenue: 15200, orders: 168 },
      { month: "Mar", revenue: 18400, orders: 203 },
      { month: "Apr", revenue: 16800, orders: 187 },
      { month: "May", revenue: 19800, orders: 215 },
      { month: "Jun", revenue: 22500, orders: 242 }
    ]);
  };

  const setMockRecentOrders = () => {
    setRecentOrders([
      { id: "ORD-001", customer: "John Doe", amount: 1250, status: "completed", date: "2024-01-15" },
      { id: "ORD-002", customer: "Jane Smith", amount: 890, status: "shipped", date: "2024-01-14" },
      { id: "ORD-003", customer: "Mike Johnson", amount: 2100, status: "preparing", date: "2024-01-13" },
      { id: "ORD-004", customer: "Sarah Williams", amount: 450, status: "pending", date: "2024-01-12" },
      { id: "ORD-005", customer: "David Brown", amount: 3200, status: "completed", date: "2024-01-11" }
    ]);
  };

  // Initial load
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      await Promise.all([
        fetchProductStats(),
        fetchLowStockProducts(),
        fetchOrderStats(),
        fetchOrdersForAnalytics()
      ]);
      setLoading(false);
    };

    fetchAllData();
  }, []);

  // Update clock
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

  const getUserName = () => {
    if (user?.name) return user.name;
    if (user?.first_name && user?.last_name) return `${user.first_name} ${user.last_name}`;
    if (user?.username) return user.username;
    return 'Seller';
  };

  const getStatusBadgeClass = (status) => {
    switch(status) {
      case 'completed': return 'status-completed';
      case 'shipped': return 'status-shipped';
      case 'preparing': return 'status-preparing';
      case 'pending': return 'status-pending';
      default: return 'status-default';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'completed': return 'Completed';
      case 'shipped': return 'Shipped';
      case 'preparing': return 'Preparing';
      case 'pending': return 'Pending';
      default: return status;
    }
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
          <span className="sd-stat-label">Total Revenue</span>
          <div className="sd-stat-body">
            <div className="sd-stat-icon">💰</div>
            <span className="sd-stat-value">{loading ? '...' : `₱${stats.totalRevenue.toLocaleString()}`}</span>
          </div>
        </div>
        <div className="sd-stat-card">
          <span className="sd-stat-label">Total Orders</span>
          <div className="sd-stat-body">
            <div className="sd-stat-icon">📦</div>
            <span className="sd-stat-value">{loading ? '...' : stats.totalOrders.toLocaleString()}</span>
          </div>
        </div>
        <div className="sd-stat-card">
          <span className="sd-stat-label">Pending Orders</span>
          <div className="sd-stat-body">
            <div className="sd-stat-icon">⏳</div>
            <span className="sd-stat-value">{loading ? '...' : stats.pending.toLocaleString()}</span>
          </div>
        </div>
        <div className="sd-stat-card">
          <span className="sd-stat-label">Low Stock</span>
          <div className="sd-stat-body">
            <div className="sd-stat-icon">⚠️</div>
            <span className="sd-stat-value">{loading ? '...' : stats.lowStock.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Main Chart Card - Line Chart */}
      <div className="sd-main-chart-card">
        <div className="sd-chart-header">
          <span className="sd-chart-title">Monthly Revenue & Orders Overview</span>
          <span className="sd-chart-subtitle">Last 6 months</span>
        </div>
        {monthlyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0d4c3" />
              <XAxis dataKey="month" tick={{ fill: '#5a3e28' }} />
              <YAxis yAxisId="left" tickFormatter={(v) => `₱${v/1000}k`} tick={{ fill: '#5a3e28' }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: '#5a3e28' }} />
              <Tooltip 
                formatter={(value, name) => {
                  if (name === 'revenue') return [`₱${value.toLocaleString()}`, 'Revenue'];
                  return [value, 'Orders'];
                }}
                contentStyle={{
                  background: '#fdf6e8',
                  border: '1px solid #c4a97d',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Line 
                yAxisId="left" 
                type="monotone" 
                dataKey="revenue" 
                stroke="#C8962A" 
                name="revenue" 
                strokeWidth={3}
                dot={{ fill: '#C8962A', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="orders" 
                stroke="#3D1A00" 
                name="orders" 
                strokeWidth={3}
                dot={{ fill: '#3D1A00', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="sd-chart-placeholder">
            <p>No data available for the selected period</p>
          </div>
        )}
      </div>

      {/* Bottom Row */}
      <div className="sd-bottom-row">
        {/* Recent Orders Card */}
        <div className="sd-main-card">
          <div className="sd-chart-header">
            <span className="sd-chart-title">Recent Orders</span>
            <span className="sd-chart-subtitle">Latest transactions</span>
          </div>
          <div className="sd-recent-orders">
            {recentOrders.length > 0 ? (
              <table className="sd-orders-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order, index) => (
                    <tr key={index}>
                      <td className="order-id">{order.id}</td>
                      <td>{order.customer}</td>
                      <td>₱{order.amount.toLocaleString()}</td>
                      <td>
                        <span className={`status-badge ${getStatusBadgeClass(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                      </td>
                      <td>{order.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="sd-placeholder-content">
                <p>No recent orders found</p>
              </div>
            )}
          </div>
        </div>

        {/* Low Stock Alerts Chart */}
        <div className="sd-chart-card">
          <div className="sd-chart-header">
            <span className="sd-chart-title">Low Stock Product Alerts</span>
            <span className="sd-chart-arrow">⚠️</span>
          </div>
          {lowStockData.length > 0 ? (
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
                  width={80}
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
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                  {lowStockData.map((_, index) => (
                    <Cell key={index} fill={barColors[index % barColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="sd-chart-placeholder">
              <p>No low stock products</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SellerDashboard;