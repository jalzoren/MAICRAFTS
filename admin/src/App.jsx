import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Users from "./pages/admin/Users";
import Dashboard from "./pages/seller/SellerDashboard";
import Products from "./pages/seller/Products";
import OrderManagement from "./pages/seller/OrderManagement";
import SellerProfile from "./pages/seller/SellerProfile";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import OrderDetails from "./pages/seller/OrderDetails";
import Settings from "./pages/admin/Settings";
import AdminAuditLogs from "./pages/admin/AdminAuditLogs";
import "./App.css";

const SessionHandler = () => {
  const { setUserFromUrl } = useAuth();
  const location = useLocation();
  const [processed, setProcessed] = useState(false);

  useEffect(() => {
    if (processed) return;
    
    const params = new URLSearchParams(location.search);
    const sessionParam = params.get("session");
    const tokenParam = params.get("token");
    
    console.log('========== ADMIN SESSION HANDLER ==========');
    
    if (sessionParam) {
      try {
        const user = JSON.parse(decodeURIComponent(sessionParam));
        console.log('✅ User received:', user.email);
        
        // CHANGE: Use sessionStorage instead of localStorage
        const session = {
          user: {
            ...user,
            access_token: tokenParam || 'from-url-token'
          },
          loginAt: new Date().toISOString()
        };
        
        sessionStorage.setItem('mc_session', JSON.stringify(session));
        console.log('✅ Session saved to sessionStorage');
        
        setUserFromUrl(user, tokenParam);
        setProcessed(true);
        
        // Clear URL and reload
        window.history.replaceState({}, '', location.pathname);
        
        setTimeout(() => {
          window.location.reload();
        }, 100);
        
      } catch (err) {
        console.error('Failed to parse session:', err);
        setProcessed(true);
      }
    } else {
      setProcessed(true);
    }
  }, [location, processed, setUserFromUrl]);

  return null;
};

const AppLayout = () => {
  const { user, loading, sessionReady } = useAuth();

  if (!sessionReady || loading) return <div className="loading-spinner">Loading...</div>;
  if (!user) {
    window.location.href = "http://localhost:5173/login";
    return null;
  }
  return <MainLayout />;
};

function App() {
  return (
    <AuthProvider>
      <SessionHandler />
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route path="/admin/dashboard" element={
            <ProtectedRoute allowedRoles={["super_admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute allowedRoles={["super_admin"]}>
              <Users />
            </ProtectedRoute>
          } />
          <Route path="/admin/settings" element={
            <ProtectedRoute allowedRoles={["super_admin"]}>
              <Settings />
            </ProtectedRoute>
          } />
          <Route
            path="/admin/audit-logs"
            element={
              <ProtectedRoute allowedRoles={["super_admin"]}>
                <AdminAuditLogs />
              </ProtectedRoute>
            }
          />
          <Route path="/seller/dashboard" element={
            <ProtectedRoute allowedRoles={["seller"]}>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/seller/products" element={
            <ProtectedRoute allowedRoles={["seller"]}>
              <Products />
            </ProtectedRoute>
          } />
          <Route path="/seller/orders" element={
            <ProtectedRoute allowedRoles={["seller"]}>
              <OrderManagement />
            </ProtectedRoute>
          } />
          <Route path="/seller/orders/:id" element={
            <ProtectedRoute allowedRoles={["seller"]}>
              <OrderDetails />
            </ProtectedRoute>
          } />
          <Route path="/seller/profile" element={
            <ProtectedRoute allowedRoles={["seller"]}>
              <SellerProfile />
            </ProtectedRoute>
          } />
          <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;