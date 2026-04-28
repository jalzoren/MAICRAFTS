// admin/src/components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="loading-spinner">Loading...</div>;
  }
  
  if (!user) {
    window.location.href = 'http://localhost:5173/login';
    return null;
  }
  
  // Check role access
  if (allowedRoles.length > 0) {
    const userRole = user.role?.toLowerCase();
    const hasAccess = allowedRoles.some(role => 
      role.toLowerCase() === userRole
    );
    
    if (!hasAccess) {
      return <Navigate to="/unauthorized" replace />;
    }
  }
  
  return children;
};

export default ProtectedRoute;