// maicrafts/src/components/ProtectedRoute.jsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Wraps any route that requires the user to be logged in.
 * Preserves the intended destination so Login can redirect back after auth.
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isAuthReady } = useAuth();
  const location = useLocation();

  // Don't flash the login page while localStorage is still being read
  if (!isAuthReady) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
        <span>Loading...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;