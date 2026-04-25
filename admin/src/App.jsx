// src/admin/App.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Users from "./pages/admin/Users";
import Dashboard from "./pages/seller/SellerDashboard"; // Seller dashboard
import Products from "./pages/seller/Products"; // Product management
import OrderManagement from "./pages/seller/OrderManagement"; // Order management for seller
import Login from "./auth/Login";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import "./App.css";
import OrderDetails from "./pages/seller/OrderDetails";
import Settings from "./pages/admin/Settings";

// Layout wrapper with authentication
const AppLayout = () => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/" replace />;
  }
  
  return <MainLayout />;
};

function App() {
  return (
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Login />} />
          
          {/* Protected routes with MainLayout */}
          <Route path="/" element={<AppLayout />}>
            {/* Super Admin Routes */}
            <Route path="/admin/dashboard" element={
              <ProtectedRoute allowedRoles={['Super Admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <ProtectedRoute allowedRoles={['Super Admin']}>
                <Users />
              </ProtectedRoute>
            } />

            {/* ✅ Add this */}
            <Route path="/admin/settings" element={
              <ProtectedRoute allowedRoles={['Super Admin']}>
                <Settings />
              </ProtectedRoute>
            } />

            {/* Seller Routes */}
            <Route path="/seller/dashboard" element={
              <ProtectedRoute allowedRoles={['seller']}>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/seller/products" element={
              <ProtectedRoute allowedRoles={['seller']}>
                <Products />
              </ProtectedRoute>
            } />
            <Route path="/seller/orders" element={
              <ProtectedRoute allowedRoles={['seller']}>
                <OrderManagement />
              </ProtectedRoute>
            } />
            <Route path="/seller/orders/:id" element={
              <ProtectedRoute allowedRoles={['seller']}>
                <OrderDetails />
              </ProtectedRoute>
            } />
            
            {/* Default redirect */}
            <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
  );
}

export default App;