import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Users from "./pages/admin/Users";
import Dashboard from "./pages/seller/SellerDashboard";
import Products from "./pages/seller/Products";
import OrderManagement from "./pages/seller/OrderManagement";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import OrderDetails from "./pages/seller/OrderDetails";
import Settings from "./pages/admin/Settings";
import "./App.css";

const SessionHandler = () => {
  const { setUserFromUrl } = useAuth();
  const location = useLocation();
  const [urlProcessed, setUrlProcessed] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sessionParam = params.get("session");
    if (sessionParam && !urlProcessed) {
      try {
        const user = JSON.parse(decodeURIComponent(sessionParam));
        console.log("✅ Session received from URL:", user);
        setUserFromUrl(user);
        window.history.replaceState({}, "", location.pathname);
        setUrlProcessed(true);
      } catch (err) {
        console.error("Failed to parse session:", err);
        setUrlProcessed(true);
      }
    } else if (!sessionParam) {
      setUrlProcessed(true);
    }
  }, [setUserFromUrl, urlProcessed]);

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
          <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;