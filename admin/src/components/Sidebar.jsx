import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiHome, FiUsers, FiSettings, FiUser, FiPackage, FiShoppingCart, FiBox } from 'react-icons/fi';
import './Sidebar.css';

const Sidebar = () => {
  const { user } = useAuth();

  // Define navigation items based on user role
  const getNavItems = () => {
    if (user?.role === 'admin') {
      return [
        { path: '/admin/dashboard', label: 'Dashboard', icon: FiHome },
        { path: '/admin/users', label: 'User Management', icon: FiUsers },
        { path: '/admin/settings', label: 'System Settings', icon: FiSettings },
      ];
    } else if (user?.role === 'seller') {
      return [
        { path: '/seller/dashboard', label: 'Dashboard', icon: FiHome },
        { path: '/seller/products', label: 'Product Management', icon: FiPackage },
        { path: '/seller/orders', label: 'Order Management', icon: FiShoppingCart },
      ];
    }
    // Default/Staff role
    return [
      { path: '/dashboard', label: 'Dashboard', icon: FiHome },
      { path: '/products', label: 'Products', icon: FiBox },
    ];
  };

  const navItems = getNavItems();

  // Get role display name
  const getRoleDisplay = () => {
    if (user?.role === 'admin') return 'Administrator';
    if (user?.role === 'seller') return 'Seller';
    return 'Staff';
  };

  return (
    <div className="admin-sidebar">
      <div className="admin-sidebar-brand">
        <div className="admin-logo-container">
          <div className="admin-logo-wrapper">
            <img 
              src="/maicrafts_logo.svg" 
              alt="Maicrafts Logo" 
              className="admin-logo"
            />
          </div>
        </div>
        <h1 className="admin-brand-name">Maicrafts</h1>
        <p className="admin-brand-tagline">Let us help you create a gift as unique as your love</p>
      </div>
      
      <hr className="admin-sidebar-divider" />
      
      <nav className="admin-sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => 
              isActive ? 'admin-nav-link active' : 'admin-nav-link'
            }
          >
            <item.icon className="admin-nav-icon" />
            <span className="admin-nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Profile Section at Bottom */}
      <div className="admin-sidebar-profile">
        <div className="admin-profile-content">
          <div className="admin-profile-avatar">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} />
            ) : (
              <FiUser className="admin-profile-icon" />
            )}
          </div>
          <div className="admin-profile-info">
            <div className="admin-profile-name">
              {user?.name || (user?.role === 'admin' ? 'Admin User' : 'Seller User')}
            </div>
            <div className="admin-profile-role">
              {getRoleDisplay()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;