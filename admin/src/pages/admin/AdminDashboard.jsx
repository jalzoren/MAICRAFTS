// src/pages/admin/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  FiUsers,
  FiPackage,
  FiShoppingCart,
  FiDollarSign,
  FiAlertTriangle,
  FiTrendingUp,
  FiTrendingDown,
  FiRefreshCw,
  FiCheckCircle,
  FiClock
} from 'react-icons/fi';
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
  CartesianGrid,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import '../../css/Dashboard.css';

const barColors = ['#E6BB71', '#D4A843', '#462C14', '#C8962A', '#7A1C1C', '#8B0000'];

const AdminDashboard = () => {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalProducts: 0,
    totalUsers: 0,
    totalRevenue: 0,
    lowStock: 0,
    outOfStock: 0,
    pendingOrders: 0,
    preparingOrders: 0,
    shippedOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0
  });

  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [revenueData, setRevenueData] = useState({
    daily: 0,
    weekly: 0,
    monthly: 0,
    percentageChange: 0
  });

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

  // Fetch all dashboard data from your backend
  const fetchDashboardData = async () => {
    try {
      const headers = getAuthHeaders();
      
      // Fetch all data in parallel
      const [
        productStatsRes,
        lowStockRes,
        orderStatsRes,
        userStatsRes,
        ordersRes,
        categoryRes
      ] = await Promise.all([
        fetch('http://localhost:5000/api/products/stats/summary', { headers }),
        fetch('http://localhost:5000/api/products/low-stock/list?limit=6', { headers }),
        fetch('http://localhost:5000/api/orders/stats/summary', { headers }),
        fetch('http://localhost:5000/api/admin/users/stats', { headers }),
        fetch('http://localhost:5000/api/orders?limit=200', { headers }),
        fetch('http://localhost:5000/api/products/categories/distribution', { headers })
      ]);

      // Parse responses
      const productStats = await productStatsRes.json();
      const lowStockData = await lowStockRes.json();
      const orderStats = await orderStatsRes.json();
      const userStats = await userStatsRes.json();
      const ordersData = await ordersRes.json();
      const categoryDataRes = await categoryRes.json();

      // Update product stats
      if (productStats.success) {
        setStats(prev => ({
          ...prev,
          totalProducts: productStats.data.totalProducts || 0,
          lowStock: productStats.data.lowStock || 0,
          outOfStock: productStats.data.outOfStock || 0
        }));
      }

      // Update low stock products
      if (lowStockData.success && lowStockData.data) {
        const formattedLowStock = lowStockData.data.map(product => ({
          id: product.id,
          name: product.name,
          stock: product.stock_quantity,
          reorderLevel: product.reorder_level,
          percentage: Math.min((product.stock_quantity / product.reorder_level) * 100, 100),
          value: Math.min((product.stock_quantity / product.reorder_level) * 100, 100)
        }));
        setLowStockProducts(formattedLowStock);
      }

      // Update order stats
      if (orderStats.success) {
        setStats(prev => ({
          ...prev,
          totalOrders: orderStats.data.totalOrders || 0,
          pendingOrders: orderStats.data.pending || 0,
          preparingOrders: orderStats.data.preparing || 0,
          shippedOrders: orderStats.data.shipped || 0,
          completedOrders: orderStats.data.completed || 0,
          cancelledOrders: orderStats.data.cancelled || 0
        }));
      }

      // Update user stats
      if (userStats.success) {
        setStats(prev => ({
          ...prev,
          totalUsers: userStats.data.totalUsers || 0
        }));
      }

      // Process orders for analytics and recent orders
      if (ordersData.success && ordersData.data) {
        const orders = ordersData.data;
        
        // Process monthly data (last 6 months)
        const monthlyMap = new Map();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        
        orders.forEach(order => {
          const orderDate = new Date(order.created_at);
          if (orderDate >= sixMonthsAgo && order.order_status === 'completed') {
            const monthKey = orderDate.toLocaleString('default', { month: 'short' });
            
            if (!monthlyMap.has(monthKey)) {
              monthlyMap.set(monthKey, { 
                month: monthKey, 
                revenue: 0, 
                orders: 0, 
                fullDate: orderDate 
              });
            }
            const existing = monthlyMap.get(monthKey);
            existing.revenue += parseFloat(order.total_amount || 0);
            existing.orders += 1;
            monthlyMap.set(monthKey, existing);
          }
        });
        
        let monthlyArray = Array.from(monthlyMap.values());
        monthlyArray.sort((a, b) => a.fullDate - b.fullDate);
        monthlyArray = monthlyArray.slice(-6);
        setMonthlyData(monthlyArray);
        
        // Get recent orders (last 10)
        const recent = orders.slice(0, 10).map(order => ({
          id: order.order_number || order.id,
          customer: order.customer_name || 'Guest',
          amount: order.total_amount,
          status: order.order_status,
          date: new Date(order.created_at).toLocaleDateString()
        }));
        setRecentOrders(recent);
        
        // Calculate total revenue from completed orders
        const totalRevenue = orders
          .filter(order => order.order_status === 'completed')
          .reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0);
        
        // Calculate revenue for different periods
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        const todaysOrders = orders.filter(o => 
          new Date(o.created_at) >= today && o.order_status === 'completed'
        );
        const weeklyOrders = orders.filter(o => 
          new Date(o.created_at) >= weekAgo && o.order_status === 'completed'
        );
        const monthlyOrdersList = orders.filter(o => 
          new Date(o.created_at) >= monthAgo && o.order_status === 'completed'
        );
        
        const dailyRevenue = todaysOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
        const weeklyRevenue = weeklyOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
        const monthlyRevenueVal = monthlyOrdersList.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
        
        // Calculate percentage change
        const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
        const previousWeekOrders = orders.filter(o => {
          const orderDate = new Date(o.created_at);
          return orderDate >= twoWeeksAgo && orderDate < weekAgo && o.order_status === 'completed';
        });
        const previousWeekRevenue = previousWeekOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
        
        const percentageChange = previousWeekRevenue === 0 
          ? weeklyRevenue > 0 ? 100 : 0
          : ((weeklyRevenue - previousWeekRevenue) / previousWeekRevenue) * 100;
        
        setStats(prev => ({
          ...prev,
          totalRevenue: totalRevenue
        }));
        
        setRevenueData({
          daily: dailyRevenue,
          weekly: weeklyRevenue,
          monthly: monthlyRevenueVal,
          percentageChange
        });
      }

      // Update category distribution
      if (categoryDataRes.success && categoryDataRes.data) {
        setCategoryData(categoryDataRes.data);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Update clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    await fetchDashboardData();
  };

  const formatDate = (date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    return `${day}/${month}/${year}`;
  };

  const getDayOfWeek = (date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
  };

  const formatTime = (date) => {
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes}:${seconds} ${ampm}`;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getStatusBadgeClass = (status) => {
    switch(status?.toLowerCase()) {
      case 'completed': return 'status-completed';
      case 'shipped': return 'status-shipped';
      case 'preparing': return 'status-preparing';
      case 'pending': return 'status-pending';
      case 'cancelled': return 'status-cancelled';
      default: return 'status-default';
    }
  };

  const getStatusText = (status) => {
    switch(status?.toLowerCase()) {
      case 'completed': return 'Completed';
      case 'shipped': return 'Shipped';
      case 'preparing': return 'Preparing';
      case 'pending': return 'Pending';
      case 'cancelled': return 'Cancelled';
      default: return status || 'Unknown';
    }
  };

  const getUserName = () => {
    if (user?.name) return user.name;
    if (user?.first_name && user?.last_name) return `${user.first_name} ${user.last_name}`;
    if (user?.username) return user.username;
    if (user?.email) return user.email.split('@')[0];
    return 'Admin';
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <div className="error-container">
          <FiAlertTriangle size={48} color="#e74c3c" />
          <h3>Error Loading Dashboard</h3>
          <p>{error}</p>
          <button onClick={handleRefresh} className="retry-button">
            <FiRefreshCw /> Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-left">
          <div className="header-title-section">
            <span className="dashboard-label">Dashboard</span>
            <h1 className="dashboard-welcome">Welcome Back, {getUserName()}!</h1>
          </div>
          <button 
            className="refresh-button" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <FiRefreshCw className={refreshing ? 'spinning' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        <div className="admin-clock">
          <div className="clock-date">
            <span className="day-name">{getDayOfWeek(currentTime)}</span>
            <span className="date-nums">{formatDate(currentTime)}</span>
          </div>
          <span className="time-value">{formatTime(currentTime)}</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid-simple">
        <div className="stat-card-simple">
          <h3 className="stat-card-title">Total Revenue</h3>
          <p className="stat-card-value">{formatCurrency(stats.totalRevenue)}</p>
        </div>
        <div className="stat-card-simple">
          <h3 className="stat-card-title">Total Orders</h3>
          <p className="stat-card-value">{stats.totalOrders.toLocaleString()}</p>
        </div>
        <div className="stat-card-simple">
          <h3 className="stat-card-title">Total Products</h3>
          <p className="stat-card-value">{stats.totalProducts.toLocaleString()}</p>
        </div>
       
      </div>

      {/* Secondary Stats */}
      <div className="stats-grid-secondary">
        <div className="stat-card-small">
          <div className="stat-small-header">
            <FiClock className="stat-small-icon" />
            <span>Pending Orders</span>
          </div>
          <div className="stat-small-value">{stats.pendingOrders}</div>
        </div>
        <div className="stat-card-small">
          <div className="stat-small-header">
            <FiPackage className="stat-small-icon" />
            <span>Preparing</span>
          </div>
          <div className="stat-small-value">{stats.preparingOrders}</div>
        </div>
        <div className="stat-card-small">
          <div className="stat-small-header">
            <FiTrendingUp className="stat-small-icon" />
            <span>Shipped</span>
          </div>
          <div className="stat-small-value">{stats.shippedOrders}</div>
        </div>
        <div className="stat-card-small">
          <div className="stat-small-header">
            <FiCheckCircle className="stat-small-icon" />
            <span>Completed</span>
          </div>
          <div className="stat-small-value">{stats.completedOrders}</div>
        </div>
        <div className="stat-card-small">
          <div className="stat-small-header">
            <FiAlertTriangle className="stat-small-icon" />
            <span>Low Stock</span>
          </div>
          <div className="stat-small-value low-stock">{stats.lowStock}</div>
        </div>
        <div className="stat-card-small">
          <div className="stat-small-header">
            <FiTrendingDown className="stat-small-icon" />
            <span>Revenue Trend</span>
          </div>
          <div className="stat-small-value">
            {revenueData.percentageChange >= 0 ? (
              <span className="trend-up">
                <FiTrendingUp /> +{revenueData.percentageChange.toFixed(1)}%
              </span>
            ) : (
              <span className="trend-down">
                <FiTrendingDown /> {revenueData.percentageChange.toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Revenue Summary Cards */}
      <div className="revenue-summary">
        <div className="section-header">
          <h3 className="section-title">Revenue Overview</h3>
        </div>
        <div className="revenue-cards">
          <div className="revenue-card">
            <div className="revenue-label">Today</div>
            <div className="revenue-amount">{formatCurrency(revenueData.daily)}</div>
          </div>
          <div className="revenue-card">
            <div className="revenue-label">This Week</div>
            <div className="revenue-amount">{formatCurrency(revenueData.weekly)}</div>
          </div>
          <div className="revenue-card">
            <div className="revenue-label">This Month</div>
            <div className="revenue-amount">{formatCurrency(revenueData.monthly)}</div>
          </div>
        </div>
      </div>

      {/* Low Stock Product Alerts */}
      {lowStockProducts.length > 0 && (
        <div className="lowstock-section">
          <div className="section-header">
            <h3 className="section-title">
              <FiAlertTriangle className="section-icon" />
              Low Stock Product Alerts ({lowStockProducts.length})
            </h3>
          </div>
          <div className="lowstock-list">
            {lowStockProducts.map((product) => (
              <div key={product.id} className="lowstock-item">
                <div className="product-info">
                  <div>
                    <span className="product-name">{product.name}</span>
                    <span className="product-stock-detail">
                      Stock: {product.stock} units | Reorder at: {product.reorderLevel}
                    </span>
                  </div>
                  <span className="stock-warning-badge">
                    {product.stock === 0 ? 'Out of Stock' : 'Low Stock'}
                  </span>
                </div>
                <div className="progress-bar-container">
                  <div 
                    className="progress-bar-fill"
                    style={{ 
                      width: `${product.percentage}%`,
                      backgroundColor: product.stock === 0 ? '#e74c3c' : 'var(--ad-primary)'
                    }}
                  >
                    <span className="progress-percentage">{Math.round(product.percentage)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Orders */}
      {recentOrders.length > 0 && (
        <div className="recent-orders-section">
          <div className="section-header">
            <h3 className="section-title">Recent Orders</h3>
          </div>
          <div className="orders-table-container">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order, index) => (
                  <tr key={index}>
                    <td className="order-id">{order.id}</td>
                    <td>{order.customer}</td>
                    <td>{order.date}</td>
                    <td>{formatCurrency(order.amount)}</td>
                    <td>
                      <span className={`status-badge ${getStatusBadgeClass(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;