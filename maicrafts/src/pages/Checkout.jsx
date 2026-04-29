import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { IoArrowBack, IoImage, IoCard, IoLocationSharp, IoDocumentText, IoWallet, IoCash } from "react-icons/io5";
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
          <div className="breadcrumb">
                <button className="back-button" onClick={handleBackClick} title="Go back">
                  <IoArrowBack size={12} />
                </button>
                <div className="main-breadcrumb">
                  <p>Cart</p>
                  <p className="breadcrumb-separator">&gt;</p>
                  <p className="breadcrumb-current">{firstItem?.name}</p>
                </div>
          </div>
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
              <div className="form-row-half">
                <div className="form-group">
                  <label htmlFor="shippingOption" className="form-label">
                    <IoLocationSharp className="form-icon" />
                    Shipping Option <span className="required">*</span>
                    Outside the Metro Manila area will be charged an additional delivery fee. 
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
              </div>

              {/* Payment Method - Icon Buttons */}
              <div className="form-group">
                <label className="form-label">
                  <IoCard className="form-icon" />
                  Payment Method <span className="required">*</span>
                </label>
                <div className="payment-options">
                  <button
                    type="button"
                    className={`payment-btn ${formData.paymentMethod === "gcash" ? "active" : ""}`}
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        paymentMethod: "gcash",
                      }))
                    }
                  >
                    <IoWallet size={24} />
                    <span>GCash</span>
                  </button>
                  <button
                    type="button"
                    className={`payment-btn ${formData.paymentMethod === "maya" ? "active" : ""}`}
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        paymentMethod: "maya",
                      }))
                    }
                  >
                    <IoCash size={24} />
                    <span>Maya</span>
                  </button>
                  <button
                    type="button"
                    className={`payment-btn ${formData.paymentMethod === "cod" ? "active" : ""}`}
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        paymentMethod: "cod",
                      }))
                    }
                  >
                    <IoCard size={24} />
                    <span>COD</span>
                  </button>
                </div>
              </div>

              {/* Address */}
              <div className="form-group">
                <label htmlFor="address" className="form-label">
                  <IoLocationSharp className="form-icon" />
                  Delivery Address
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
                  <IoDocumentText className="form-icon" />
                  Special Instructions
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  className="form-textarea"
                  placeholder="Add any special requests or delivery notes..."
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
