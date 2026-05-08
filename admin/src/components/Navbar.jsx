import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getDashboardTitle = () => {
    if (user?.role === 'super_admin') {  
      return 'SUPER ADMIN DASHBOARD';
    } else if (user?.role === 'seller') {
      return 'SELLER DASHBOARD';
    }
    return 'DASHBOARD';
  };

  return (
    <div className="navbar">
      <div className="navbar-left">
        <h3>{getDashboardTitle()}</h3>
      </div>
      
      <div className="navbar-right">
        {/* Add any other navbar items here if needed */}
      </div>
    </div>
  );
};

export default Navbar;