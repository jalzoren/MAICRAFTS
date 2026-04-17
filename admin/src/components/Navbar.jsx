import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiBell } from 'react-icons/fi';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Sample notifications - you can replace with real data
  const notifications = [
    { id: 1, title: 'New user registered', time: '5 min ago', read: false },
    { id: 2, title: 'Order #12345 completed', time: '1 hour ago', read: false },
    { id: 3, title: 'System update available', time: '3 hours ago', read: true },
    { id: 4, title: 'New message from support', time: '1 day ago', read: true },
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  const handleNotificationClick = (id) => {
    // Handle notification click
    console.log('Notification clicked:', id);
    setShowNotifications(false);
  };

  return (
    <div className="navbar">
      <div className="navbar-left">
        <h3>ADMIN DASHBOARD</h3>
      </div>
      
      <div className="navbar-right">
        {/* Notification Bell */}
        <div className="notification-container">
          <button 
            className={`notification-bell ${showNotifications ? 'active' : ''}`}
            onClick={toggleNotifications}
          >
            <FiBell className="bell-icon" />
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount}</span>
            )}
          </button>

          {/* Notification Dropdown */}
          {showNotifications && (
            <div className="notification-dropdown">
              <div className="notification-header">
                <h4>Notifications</h4>
                <button className="mark-all-read">Mark all as read</button>
              </div>
              <div className="notification-list">
                {notifications.length > 0 ? (
                  notifications.map(notification => (
                    <div 
                      key={notification.id}
                      className={`notification-item ${!notification.read ? 'unread' : ''}`}
                      onClick={() => handleNotificationClick(notification.id)}
                    >
                      <div className="notification-content">
                        <div className="notification-title">{notification.title}</div>
                        <div className="notification-time">{notification.time}</div>
                      </div>
                      {!notification.read && <div className="notification-dot"></div>}
                    </div>
                  ))
                ) : (
                  <div className="no-notifications">No notifications</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Navbar;