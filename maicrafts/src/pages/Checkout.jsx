import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { IoImage } from "react-icons/io5";
import { useCart } from "../context/CartContext";
import "../css/Checkout.css";

const Checkout = () => {
  const navigate = useNavigate();
  const { items, totalCount } = useCart();
  const [formData, setFormData] = useState({
    shippingOption: "",
    paymentMethod: "",
    address: "",
    message: "",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleBackClick = () => {
    navigate(-1);
  };

  // Hardcoded demo product data
  const demoProduct = {
    id: "fuzzy-rose-1",
    name: "Giant Fuzzy Crochet Rose",
    image_url: new URL("../assets/flower.png", import.meta.url).href,
    price: 100,
    variation: "Lover",
    size: "Small",
    quantity_of_flower: 3,
    add_ons: "Fairy Lights & Letter",
    quantity: 1,
  };

  const firstItem = demoProduct;
  const addOnsAmount = 20.00;
  const shippingFee = 20.00;
  const subtotal = firstItem ? firstItem.price * firstItem.quantity : 0;
  const totalAmount = subtotal + addOnsAmount + shippingFee;

  return (
    <div className="checkout-container">
      <div className="checkout-wrapper">
        {/* Header */}
        <div className="checkout-header">
          <h1>Your Order</h1>
        </div>

        <div className="checkout-content">
          {/* Left Side - Order Summary */}
          <div className="order-summary">
            {firstItem ? (
              <>
                {/* Product Header */}
                <h2 className="product-title">{firstItem.name}</h2>

                {/* Product Details */}
                <div className="product-details-section">
                  {/* Product Image Placeholder */}
                  <div className="product-image-placeholder">
                    <IoImage size={40} />
                  </div>

                  {/* Product Info */}
                  <div className="product-specs">
                    {firstItem.variation && (
                      <div className="spec-row">
                        <span className="spec-label">Variation</span>
                        <span className="spec-separator">.......................</span>
                        <span className="spec-value">{firstItem.variation}</span>
                      </div>
                    )}
                    {firstItem.size && (
                      <div className="spec-row">
                        <span className="spec-label">Size</span>
                        <span className="spec-separator">.......................</span>
                        <span className="spec-value">{firstItem.size}</span>
                      </div>
                    )}
                    {firstItem.quantity_of_flower && (
                      <div className="spec-row">
                        <span className="spec-label">Quantity of Flower</span>
                        <span className="spec-separator">.......................</span>
                        <span className="spec-value">{firstItem.quantity_of_flower}</span>
                      </div>
                    )}
                    {firstItem.add_ons && (
                      <div className="spec-row">
                        <span className="spec-label">Add Ons</span>
                        <span className="spec-separator">.......................</span>
                        <span className="spec-value">{firstItem.add_ons}</span>
                      </div>
                    )}
                    {firstItem.quantity && (
                      <div className="spec-row">
                        <span className="spec-label">Quantity</span>
                        <span className="spec-separator">.......................</span>
                        <span className="spec-value">{firstItem.quantity}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Totals */}
                <div className="order-totals">
                  {addOnsAmount > 0 && (
                    <div className="total-row">
                      <span className="total-label">Add Ons</span>
                      <span className="total-value">₱ {addOnsAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="total-row">
                    <span className="total-label">Shipping Fee</span>
                    <span className="total-value">₱ {shippingFee.toFixed(2)}</span>
                  </div>
                  <div className="total-row final-total">
                    <span className="total-label">Total Amount</span>
                    <span className="total-value">₱ {totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="no-items">
                <p>No items in your cart</p>
              </div>
            )}
          </div>

          {/* Right Side - Checkout Form */}
          <div className="checkout-form-section">
            <form className="checkout-form">
              {/* Shipping Option */}
              <div className="form-group">
                <label htmlFor="shippingOption" className="form-label">
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
                  <option value="standard">Standard Shipping (3-5 days)</option>
                  <option value="express">Express Shipping (1-2 days)</option>
                  <option value="overnight">Overnight Shipping</option>
                </select>
              </div>

              {/* Payment Method */}
              <div className="form-group">
                <label htmlFor="paymentMethod" className="form-label">
                  Payment Method <span className="required">*</span>
                </label>
                <select
                  id="paymentMethod"
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleInputChange}
                  className="form-control"
                  required
                >
                  <option value="">Select payment method</option>
                  <option value="credit-card">Credit Card</option>
                  <option value="debit-card">Debit Card</option>
                  <option value="gcash">GCash</option>
                  <option value="bank-transfer">Bank Transfer</option>
                </select>
              </div>

              {/* Address */}
              <div className="form-group">
                <label htmlFor="address" className="form-label">
                  Address
                </label>
                <select
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="form-control"
                >
                  <option value="">Select address</option>
                  <option value="home">Home Address</option>
                  <option value="work">Work Address</option>
                  <option value="other">Other Address</option>
                </select>
              </div>

              {/* Message / Note */}
              <div className="form-group">
                <label htmlFor="message" className="form-label">
                  Message Here / Note:
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  className="form-textarea"
                  placeholder="Enter a Message"
                  rows="4"
                />
              </div>

              {/* Place Order Button */}
              <button type="submit" className="place-order-btn">
                Place Order
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
