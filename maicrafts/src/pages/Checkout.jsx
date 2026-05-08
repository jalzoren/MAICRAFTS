// Checkout.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  IoArrowBack, IoImage, IoLocationSharp,
  IoDocumentText,
} from "react-icons/io5";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import "../css/Checkout.css";

// ── Helpers ────────────────────────────────────────────────────────────────
const getSpecRows = (item) => {
  const rows = [];
  if (item.variations?.bundle) {
    const b = item.variations.bundle;
    rows.push({ label: "Bundle", value: `${b.quantity} pcs${b.size ? ` (${b.size})` : ""}` });
  }
  if (item.variations?.color) {
    rows.push({ label: "Color", value: item.variations.color.name });
  }
  if (Array.isArray(item.addOns) && item.addOns.length > 0) {
    const names = item.addOns.map((a) => (typeof a === "object" ? a.name : null)).filter(Boolean);
    if (names.length) rows.push({ label: "Add-ons", value: names.join(", ") });
  }
  rows.push({ label: "Quantity", value: item.quantity });
  return rows;
};

const METRO_MANILA_CITIES = [
  "manila", "quezon city", "makati", "taguig", "pasig", "pasig city", "mandaluyong",
  "san juan", "caloocan", "navotas", "malabon", "valenzuela", "parañaque",
  "paranaque", "pasay", "muntinlupa", "las piñas", "las pinas", "marikina", "pateros"
];

const getShippingFee = (city) => {
  if (!city) return 0;
  const normalizedCity = city.trim().toLowerCase();
  const isMetroManila = METRO_MANILA_CITIES.includes(normalizedCity);
  if (!isMetroManila) return 50;

  if (normalizedCity === 'pasig' || normalizedCity === 'pasig city') return 0;
  return 20;
};


// ✅ Add helper function for auth headers
const getAuthHeaders = () => {
  try {
    const sessionData = sessionStorage.getItem('mc_session');
    if (!sessionData) return {};
    
    const session = JSON.parse(sessionData);
    const token = session.user?.access_token;
    
    if (!token) {
      console.warn('No access token found in session');
      return {};
    }
    
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  } catch (error) {
    console.error('Error getting auth headers:', error);
    return {};
  }
};


// ── Component ──────────────────────────────────────────────────────────────
const Checkout = () => {
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  const [checkoutItems, setCheckoutItems] = useState([]);
  const [formData, setFormData] = useState({
    shippingOption: "",
    selectedAddressId: "",
    message: "",
  });
  const [addresses, setAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // Read items from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("checkout_items");
      setCheckoutItems(raw ? JSON.parse(raw) : []);
    } catch {
      setCheckoutItems([]);
    }
  }, []);

  // Fetch user addresses when logged in
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchAddresses();
    }
  }, [isAuthenticated, user?.id]);

  const fetchAddresses = async () => {
    setLoadingAddresses(true);
    try {
      const headers = getAuthHeaders(); 
      const res = await fetch(`http://localhost:5000/api/address/${user.id}`, { headers });
      const data = await res.json();
      if (res.ok) {
        setAddresses(data.addresses || []);
        // Auto-select default address
        const defaultAddr = data.addresses?.find(addr => addr.is_default);
        if (defaultAddr) {
          setFormData(prev => ({ ...prev, selectedAddressId: defaultAddr.address_id }));
        }
      }
    } catch (err) {
      console.error("Failed to fetch addresses:", err);
    } finally {
      setLoadingAddresses(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const selectedAddress = addresses.find(addr => addr.address_id === formData.selectedAddressId);
  const shippingFee = formData.shippingOption === "delivery" && selectedAddress
    ? getShippingFee(selectedAddress.city)
    : 0;
  const subtotal = checkoutItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const totalAmount = subtotal + shippingFee;

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!formData.shippingOption) {
      alert("Please select a shipping option.");
      return;
    }
    if (formData.shippingOption === "delivery" && !formData.selectedAddressId) {
      alert("Please select a delivery address.");
      return;
    }

    setIsPlacingOrder(true);
    try {
      const headers = getAuthHeaders();
      // 1. Create order in your database
      const orderData = {
        user_id: user?.id || null,
        user_email: user?.email || null,
        shipping_option: formData.shippingOption,
        address_id: formData.selectedAddressId || null,
        address: selectedAddress ? {
          street: selectedAddress.home_address,
          barangay: selectedAddress.barangay,
          city: selectedAddress.city,
          province: selectedAddress.province,
          postalCode: selectedAddress.postal_code,
          region: selectedAddress.region,
        } : null,
        special_instructions: formData.message || null,
        items: checkoutItems.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
          variations: item.variations || {},
          addOns: item.addOns || [],
        })),
        subtotal: subtotal,
        shipping_fee: shippingFee,
        total_amount: totalAmount,
      };

      const orderResponse = await fetch('http://localhost:5000/api/orders', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(orderData),
      });
      const orderResult = await orderResponse.json();
      if (!orderResult.success) throw new Error('Failed to create order');
      const orderId = orderResult.order_id;

      // 2. Initiate PayMongo checkout session
      const successUrl = `${window.location.origin}/payment-success?order_id=${orderId}`;
      const failedUrl = `${window.location.origin}/payment-failed?order_id=${orderId}`;

      const paymentRes = await fetch('http://localhost:5000/api/payment/create-checkout-session', {
        method: 'POST',
        headers: headers, 
        body: JSON.stringify({
          amount: totalAmount,
          order_id: orderId,
          success_url: successUrl,
          failed_url: failedUrl,
        }),
      });
      const paymentData = await paymentRes.json();
      if (!paymentData.success) throw new Error('Payment initialization failed');

      // Redirect to PayMongo hosted page
      window.location.href = paymentData.checkout_url;
    } catch (error) {
      console.error('Checkout error:', error);
      alert(error.message);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <div className="checkout-container">
      <div className="checkout-wrapper">
        {/* Header */}
        <div className="checkout-header">
          <h1>Your Order</h1>
          <div className="breadcrumb">
            <button className="back-button" onClick={() => navigate(-1)} title="Go back">
              <IoArrowBack size={12} />
            </button>
            <div className="main-breadcrumb">
              <p>Cart</p>
              <p className="breadcrumb-separator">&gt;</p>
              <p className="breadcrumb-current">Checkout</p>
            </div>
          </div>
        </div>

        <div className="checkout-content">
          {/* Left: Order Summary */}
          <div className="order-summary">
            {checkoutItems.length > 0 ? (
              <>
                {checkoutItems.map((item, idx) => (
                  <div key={`${item.product_id}-${idx}`} className="checkout-item">
                    <h2 className="product-title">{item.name}</h2>
                    <div className="product-details-section">
                      <div className="product-image-placeholder">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }}
                          />
                        ) : (
                          <IoImage size={40} />
                        )}
                      </div>
                      <div className="product-specs">
                        {getSpecRows(item).map((row, i) => (
                          <div className="spec-row" key={i}>
                            <span className="spec-label">{row.label}</span>
                            <span className="spec-separator">.......................</span>
                            <span className="spec-value">{row.value}</span>
                          </div>
                        ))}
                        <div className="spec-row">
                          <span className="spec-label">Item Total</span>
                          <span className="spec-separator">.......................</span>
                          <span className="spec-value">₱{(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    {idx < checkoutItems.length - 1 && <hr className="item-divider" />}
                  </div>
                ))}

                {/* Totals */}
                <div className="order-totals">
                  <div className="total-row">
                    <span className="total-label">Subtotal</span>
                    <span className="total-value">₱{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="total-row">
                    <span className="total-label">Shipping Fee</span>
                    <span className="total-value">
                      {formData.shippingOption === "delivery"
                        ? `₱${shippingFee.toFixed(2)}`
                        : "Free (Pickup)"}
                    </span>
                  </div>
                  <div className="total-row final-total">
                    <span className="total-label"><strong>Total Amount</strong></span>
                    <span className="total-value"><strong>₱{totalAmount.toFixed(2)}</strong></span>
                  </div>
                </div>
              </>
            ) : (
              <div className="no-items"><p>No items selected for checkout.</p></div>
            )}
          </div>

          {/* Right: Checkout Form */}
          <div className="checkout-form-section">
            <form className="checkout-form" onSubmit={handlePlaceOrder}>
              {/* Shipping Option */}
              <div className="form-group">
                <label htmlFor="shippingOption" className="form-label">
                  <IoLocationSharp className="form-icon" />
                  Shipping Option <span className="required">*</span>
                </label>
                <select
                  id="shippingOption"
                  name="shippingOption"
                  value={formData.shippingOption}
                  onChange={handleInputChange}
                  className="form-control"
                  required
                >
                  <option value="">Select shipping option</option>
                  <option value="pickup">Pick Up</option>
                  <option value="delivery">Delivery</option>
                </select>
              </div>

              {/* Delivery Address – only for delivery */}
              {formData.shippingOption === "delivery" && (
                <div className="form-group">
                  <label htmlFor="selectedAddressId" className="form-label">
                    <IoLocationSharp className="form-icon" />
                    Delivery Address <span className="required">*</span>
                  </label>
                  {loadingAddresses ? (
                    <p>Loading your addresses...</p>
                  ) : addresses.length === 0 ? (
                    <div className="address-warning">
                      <p>You have no saved addresses.</p>
                      <button
                        type="button"
                        className="btn-link"
                        onClick={() => navigate("/settings")}
                      >
                        Add an address in Settings
                      </button>
                    </div>
                  ) : (
                    <>
                      <select
                        id="selectedAddressId"
                        name="selectedAddressId"
                        value={formData.selectedAddressId}
                        onChange={handleInputChange}
                        className="form-control"
                        required
                      >
                        <option value="">Select an address</option>
                        {addresses.map(addr => (
                          <option key={addr.address_id} value={addr.address_id}>
                            {addr.home_address}, {addr.barangay}, {addr.city}, {addr.province}
                            {addr.is_default && " (Default)"}
                          </option>
                        ))}
                      </select>
                      {selectedAddress && (
                        <div className="selected-address-details">
                          <p><strong>Full Address:</strong></p>
                          <p>{selectedAddress.home_address}</p>
                          <p>{selectedAddress.barangay}, {selectedAddress.city}</p>
                          <p>{selectedAddress.province}, {selectedAddress.region}</p>
                          {selectedAddress.postal_code && <p>Postal Code: {selectedAddress.postal_code}</p>}
                          <p className="shipping-note">
                            Shipping fee for <strong>{selectedAddress.city}</strong>:
                            {getShippingFee(selectedAddress.city) === 0
                              ? " ₱0"
                              : getShippingFee(selectedAddress.city) === 20
                              ? " ₱20 (Metro Manila, outside Pasig)"
                              : " ₱50 (outside Metro Manila)"}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Special Instructions */}
              <div className="form-group">
                <label htmlFor="message" className="form-label">
                  <IoDocumentText className="form-icon" />
                  Special Instructions
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  className="form-textarea"
                  rows="4"
                  placeholder="Add any special requests or delivery notes..."
                />
              </div>

              <button
                type="submit"
                className="place-order-btn"
                disabled={checkoutItems.length === 0 || isPlacingOrder}
              >
                {isPlacingOrder ? "Processing..." : "Place Order"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;