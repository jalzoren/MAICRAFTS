// src/App.jsx
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";

// Components
import Navbar from "./components/Navbar.jsx";
import ScrollToTop from "./components/ScrollToTop";
import FloatingCart from "./components/FloatingCart.jsx";
import Footer from "./components/Footer.jsx";

// Pages
import Home from "./pages/Home.jsx";
import Products from "./pages/Products.jsx";
import ProductDetail from "./pages/ProductDetail.jsx";
import ProductDetail2 from "./pages/ProductDetail2.jsx";
import About from "./pages/About.jsx";
import Contact from "./pages/Contact.jsx";
import CustomizeFormModal from "./pages/CustomizeFormModal.jsx";
import Settings from "./pages/Settings.jsx";


import Login from "./auth/Login.jsx";
import Signup from "./auth/Signup.jsx";
import EnterCode from "./auth/EnterCode.jsx";
import SetupPassword from "./auth/SetupPassword.jsx";
import AccountCreated from "./auth/AccountCreated.jsx";
import ForgotPasswordEmail from "./auth/ForgotPasswordEmail.jsx";
import ResetPasswordOTP from "./auth/ResetPasswordOTP.jsx";
import SetNewPassword from "./auth/SetNewPassword.jsx";

import "bootstrap/dist/css/bootstrap.min.css";

// Wrapper component to access location inside Router
const AppContent = () => {
  const [cart, setCart] = useState([]);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const location = useLocation();

  // List of auth routes where navbar should be hidden
  const authRoutes = [
    '/login',
    '/signup',
    '/enter-code',
    '/setup-password',
    '/account-created',
    '/forgot-password',
    '/reset-password-otp',
    '/set-new-password'
  ];

  // Check if current route is an auth route
  const isAuthRoute = authRoutes.includes(location.pathname);

  // Load cart from localStorage
  useEffect(() => {
    const savedCart = JSON.parse(localStorage.getItem("cart") || "[]");
    setCart(savedCart);
  }, []);

  // Listen for cart updates
  useEffect(() => {
    const updateCart = () => {
      const updated = JSON.parse(localStorage.getItem("cart") || "[]");
      setCart(updated);
    };
    window.addEventListener("cart-updated", updateCart);
    return () => window.removeEventListener("cart-updated", updateCart);
  }, []);

  // Auto-open Customize Modal when URL has ?customize=true
  useEffect(() => {
    if (location.search === "?customize=true") {
      setIsCustomizeOpen(true);
    }
  }, [location]);

  const removeItem = (key) => {
    const newCart = cart.filter((item) => item.key !== key);
    localStorage.setItem("cart", JSON.stringify(newCart));
    setCart(newCart);
    window.dispatchEvent(new Event("cart-updated"));
  };

  const closeCustomizeModal = () => {
    setIsCustomizeOpen(false);
    window.history.replaceState({}, "", window.location.pathname);
  };

  return (
    <>
      <ScrollToTop />
      
      {/* Show Navbar only on non-auth routes */}
      {!isAuthRoute && <Navbar />}

      {/* Floating Cart */}
      {/* <FloatingCart cartItems={cart} removeItem={removeItem} /> */}

      {/* ROUTES */}
      <Routes>
        {/* Main Pages */}
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/crochet/:id" element={<ProductDetail2 />} />
        <Route path="/about-us" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/settings" element={<Settings />} />

        {/* Auth Pages */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPasswordEmail />} />
       <Route path="/reset-password-otp" element={<ResetPasswordOTP />} />
        <Route path="/set-new-password" element={<SetNewPassword />} />\



        <Route path="/signup" element={<Signup />} />
        <Route path="/enter-code" element={<EnterCode />} />
        <Route path="/setup-password" element={<SetupPassword />} />
        <Route path="/account-created" element={<AccountCreated />} />


      
      </Routes>

      {/* Show Footer only on non-auth routes */}
      {!isAuthRoute && <Footer />}

      {/* Customize Modal */}
      <CustomizeFormModal
        isOpen={isCustomizeOpen}
        onClose={closeCustomizeModal}
      />
    </>
  );
};

// Main App with Router
const App = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;