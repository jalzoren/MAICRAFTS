import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles = ['admin', 'staff'] }) => {
  const { user, loading } = useAuth();

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="protected-loading">
        <div className="loading-spinner"></div>
        <p>Checking authorization...</p>
      </div>
    );
  }

  // Check if user is authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has required role
  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="unauthorized-container">
        <div className="unauthorized-card">
          <h1>403 - Unauthorized</h1>
          <p>You don't have permission to access this page.</p>
          <p>Your role: <strong>{user.role}</strong></p>
          <p>Required roles: <strong>{allowedRoles.join(', ')}</strong></p>
          <button onClick={() => window.location.href = '/dashboard'} className="back-btn">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // If all checks pass, render the children
  return children;
};

export default ProtectedRoute;