// Checkout.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  IoArrowBack, IoImage, IoCard, IoLocationSharp,
  IoDocumentText, IoWallet, IoCash,
} from "react-icons/io5";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import "../css/Checkout.css";

// ── Helpers ────────────────────────────────────────────────────────────────

// Converts a checkout item's variation/addOn data into displayable spec rows
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

// ── Component ──────────────────────────────────────────────────────────────

const Checkout = () => {
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  const [checkoutItems, setCheckoutItems] = useState([]);
  const [formData, setFormData] = useState({
    shippingOption: "",
    paymentMethod:  "",
    address:        "",
    message:        "",
  });
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // Read items set by either ProductDetail "Buy Now" or Cart "Check Out"
  useEffect(() => {
    try {
      const raw = localStorage.getItem("checkout_items");
      setCheckoutItems(raw ? JSON.parse(raw) : []);
    } catch {
      setCheckoutItems([]);
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Shipping fee only applies when delivery is chosen
  const shippingFee = formData.shippingOption === "delivery" ? 20 : 0;
  const subtotal    = checkoutItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const totalAmount = subtotal + shippingFee;

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!formData.shippingOption) { alert("Please select a shipping option."); return; }
    if (!formData.paymentMethod)  { alert("Please select a payment method.");  return; }

    setIsPlacingOrder(true);
    try {
      // Prepare order data including user session
      const orderData = {
        user_id: user?.id || null,
        user_email: user?.email || null,
        shipping_option: formData.shippingOption,
        payment_method: formData.paymentMethod,
        address: formData.address || null,
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

      // TODO: POST order to /api/orders
      console.log('Order data:', orderData);
      
      alert("Order placed successfully! 🎉");
      localStorage.removeItem("checkout_items");
      await clearCart();
      navigate("/");
    } catch (error) {
      console.error('Error placing order:', error);
      alert("Failed to place order. Please try again.");
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

          {/* ── Left: Order Summary ──────────────────────────────── */}
          <div className="order-summary">
            {checkoutItems.length > 0 ? (
              <>
                {checkoutItems.map((item, idx) => (
                  <div key={`${item.product_id}-${idx}`} className="checkout-item">
                    <h2 className="product-title">{item.name}</h2>

                    <div className="product-details-section">
                      <div className="product-image-placeholder">
                        {item.image_url
                          ? <img src={item.image_url} alt={item.name}
                              style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }} />
                          : <IoImage size={40} />
                        }
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
                        : formData.shippingOption === "pickup"
                          ? "Free (Pickup)"
                          : "Select shipping option"}
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

          {/* ── Right: Checkout Form ─────────────────────────────── */}
          <div className="checkout-form-section">
            <form className="checkout-form" onSubmit={handlePlaceOrder}>

              {/* Shipping Option */}
              <div className="form-group">
                <label htmlFor="shippingOption" className="form-label">
                  <IoLocationSharp className="form-icon" />
                  Shipping Option <span className="required">*</span>
                  <small style={{ display: "block", fontWeight: "normal", marginTop: 2 }}>
                    Outside Metro Manila will be charged an additional delivery fee.
                  </small>
                </label>
                <select id="shippingOption" name="shippingOption"
                  value={formData.shippingOption} onChange={handleInputChange}
                  className="form-control" required>
                  <option value="">Select shipping option</option>
                  <option value="pickup">Pick Up</option>
                  <option value="delivery">Delivery</option>
                </select>
              </div>

              {/* Payment Method */}
              <div className="form-group">
                <label className="form-label">
                  <IoCard className="form-icon" />
                  Payment Method <span className="required">*</span>
                </label>
                <div className="payment-options">
                  {[
                    { value: "gcash", label: "GCash", Icon: IoWallet },
                    { value: "maya",  label: "Maya",  Icon: IoCash   },
                    { value: "cod",   label: "COD",   Icon: IoCard   },
                  ].map(({ value, label, Icon }) => (
                    <button key={value} type="button"
                      className={`payment-btn ${formData.paymentMethod === value ? "active" : ""}`}
                      onClick={() => setFormData((p) => ({ ...p, paymentMethod: value }))}>
                      <Icon size={24} /><span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Delivery Address — only shown when delivery is selected */}
              {formData.shippingOption === "delivery" && (
                <div className="form-group">
                  <label htmlFor="address" className="form-label">
                    <IoLocationSharp className="form-icon" />
                    Delivery Address
                  </label>
                  <select id="address" name="address"
                    value={formData.address} onChange={handleInputChange}
                    className="form-control">
                    <option value="">Select address</option>
                    <option value="home">Home Address</option>
                    <option value="work">Work Address</option>
                    <option value="other">Other Address</option>
                  </select>
                </div>
              )}

              {/* Special Instructions */}
              <div className="form-group">
                <label htmlFor="message" className="form-label">
                  <IoDocumentText className="form-icon" />
                  Special Instructions
                </label>
                <textarea id="message" name="message"
                  value={formData.message} onChange={handleInputChange}
                  className="form-textarea" rows="4"
                  placeholder="Add any special requests or delivery notes..." />
              </div>

              <button type="submit" className="place-order-btn"
                disabled={checkoutItems.length === 0 || isPlacingOrder}>
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