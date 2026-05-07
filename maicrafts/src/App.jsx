// App.jsx (under maicrafts folder)
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar.jsx";
import ScrollToTop from "./components/ScrollToTop";
import Footer from "./components/Footer.jsx";
import Home from "./pages/Home.jsx";
import Products from "./pages/Products.jsx";
import ProductDetail from "./pages/ProductDetail.jsx";
import ProductDetail2 from "./pages/ProductDetail2.jsx";
import About from "./pages/About.jsx";
import Contact from "./pages/Contact.jsx";
import CustomizeFormModal from "./pages/CustomizeFormModal.jsx";
import Settings from "./pages/Settings.jsx";
import Cart from "./pages/Cart.jsx";
import Checkout from "./pages/Checkout.jsx";
import Login from "./auth/Login.jsx";
import Signup from "./auth/Signup.jsx";
import EnterCode from "./auth/EnterCode.jsx";
import SetupPassword from "./auth/SetupPassword.jsx";
import AccountCreated from "./auth/AccountCreated.jsx";
import ForgotPasswordEmail from "./auth/ForgotPasswordEmail.jsx";
import ResetPasswordOTP from "./auth/ResetPasswordOTP.jsx";
import SetNewPassword from "./auth/SetNewPassword.jsx";
import "bootstrap/dist/css/bootstrap.min.css";
import ContactAdmin from "./auth/ContactAdmin";
import CookieConsent from './components/CookieConsent';
import PrivacyPolicy from "./pages/PrivacyPolicy";
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentFailed from './pages/PaymentFailed';

const AppContent = () => {
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const location = useLocation();

    // Add this debug line
  console.log('📍 Current path:', location.pathname);

  const authRoutes = [
    '/login', '/signup', '/enter-code', '/setup-password',
    '/account-created', '/forgot-password', '/reset-password-otp', '/set-new-password',
    '/contact-admin', '/privacy-policy'
  ];
  const isAuthRoute = authRoutes.includes(location.pathname);

  useEffect(() => {
    if (location.search === "?customize=true") setIsCustomizeOpen(true);
  }, [location]);

  const closeCustomizeModal = () => {
    setIsCustomizeOpen(false);
    window.history.replaceState({}, "", window.location.pathname);
  };

  return (
    <>
      <ScrollToTop />
      {!isAuthRoute && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/crochet/:id" element={<ProductDetail2 />} />
        <Route path="/about-us" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/enter-code" element={<EnterCode />} />
        <Route path="/setup-password" element={<SetupPassword />} />
        <Route path="/account-created" element={<AccountCreated />} />
        <Route path="/forgot-password" element={<ForgotPasswordEmail />} />
        <Route path="/reset-password-otp" element={<ResetPasswordOTP />} />
        <Route path="/set-new-password" element={<SetNewPassword />} />
       <Route path="/settings" element={<Settings />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
        <Route path="/contact-admin" element={<ContactAdmin />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/payment-failed" element={<PaymentFailed />} />
      </Routes>
      {!isAuthRoute && <Footer />}
      <CustomizeFormModal isOpen={isCustomizeOpen} onClose={closeCustomizeModal} />
      <CookieConsent />
    </>
  );
};

const App = () => (
  <Router>
    <AuthProvider>
      <CartProvider>
        <AppContent />
      </CartProvider>
    </AuthProvider>
  </Router>
);

export default App;