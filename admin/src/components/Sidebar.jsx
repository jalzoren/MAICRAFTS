// src/admin/components/Sidebar.jsx
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiHome, FiUsers, FiSettings, FiUser, FiPackage, FiShoppingCart, FiBox, FiLogOut } from 'react-icons/fi';
import Swal from 'sweetalert2';
import './Sidebar.css';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const getNavItems = () => {
    if (user?.role?.toLowerCase() === 'super_admin') {
      return [
        { path: '/admin/dashboard', label: 'Dashboard', icon: FiHome },
        { path: '/admin/users', label: 'User Management', icon: FiUsers },
        { path: '/admin/settings', label: 'System Settings', icon: FiSettings },
        { path: '/admin/audit-logs', label: 'Audit Logs', icon: FiBox }, 
      ];
    } else if (user?.role?.toLowerCase() === 'seller') {
      return [
        { path: '/seller/dashboard', label: 'Dashboard', icon: FiHome },
        { path: '/seller/products', label: 'Product Management', icon: FiPackage },
        { path: '/seller/orders', label: 'Order Management', icon: FiShoppingCart },
      ];
    }
    return [];
  };

  const navItems = getNavItems();

  // Get role display name
  const getRoleDisplay = () => {
    const role = user?.role?.toLowerCase();
    if (role === 'super_admin') return 'Super Admin';
    if (role === 'seller') return 'Seller';
    return 'Staff';
  };

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You will be logged out of your account",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, logout',
      cancelButtonText: 'Cancel',
      background: '#fff',
      customClass: {
        popup: 'swal-popup',
        title: 'swal-title',
        confirmButton: 'swal-confirm-btn',
        cancelButton: 'swal-cancel-btn'
      }
    });

    if (result.isConfirmed) {
      logout();
      navigate('/');
      await Swal.fire({
        title: 'Logged Out!',
        text: 'You have been successfully logged out',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
        background: '#fff'
      });
    }
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
        <div className="admin-profile-content" onClick={handleLogout} style={{ cursor: 'pointer' }}>
          <div className="admin-profile-avatar">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} />
            ) : (
              <FiUser className="admin-profile-icon" />
            )}
          </div>
          <div className="admin-profile-info">
            <div className="admin-profile-name">
              {user?.name || (user?.role === 'Super Admin' ? 'Super Admin' : 'Seller User')}
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