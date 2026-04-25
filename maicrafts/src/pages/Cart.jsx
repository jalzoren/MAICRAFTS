import React from "react";
import { useCart } from "../context/CartContext";
import { useNavigate } from "react-router-dom";
import "../css/Cart.css";

const Cart = () => {
  const { items, totalCount, totalAmount } = useCart();
  const navigate = useNavigate();

  // Sample products for "You may also like" section
  const relatedProducts = [
    { id: 1, name: "Product", price: 159, image: "/placeholder-product.jpg", rating: 4 },
    { id: 2, name: "Product", price: 159, image: "/placeholder-product.jpg", rating: 5 },
    { id: 3, name: "Product", price: 159, image: "/placeholder-product.jpg", rating: 4 },
    { id: 4, name: "Product", price: 159, image: "/placeholder-product.jpg", rating: 5 },
  ];

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmount = subtotal * 0.2; // 20% discount
  const total = subtotal - discountAmount;

  return (
    <div className="cart-container">
      <div className="cart-wrapper">
        {/* Cart Header */}
        <div className="cart-header">
          <h1>My Cart ({totalCount} items)</h1>
        </div>

        {/* Cart Items Table */}
        <div className="cart-items-section">
          <table className="cart-table">
            <thead>
              <tr>
                <th className="checkbox-col"></th>
                <th className="item-col">Item</th>
                <th className="price-col">Price</th>
                <th className="quantity-col">Quantity</th>
                <th className="total-col">Total</th>
                <th className="action-col"></th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map((item) => (
                  <tr key={item.product_id} className="cart-item-row">
                    <td className="checkbox-col">
                      <input type="checkbox" className="item-checkbox" />
                    </td>
                    <td className="item-col">
                      <div className="item-details">
                        <img src={item.image_url} alt={item.name} className="item-image" />
                        <span className="item-name">{item.name}</span>
                      </div>
                    </td>
                    <td className="price-col">
                      <span className="price-value">₱ {item.price.toFixed(2)}</span>
                    </td>
                    <td className="quantity-col">
                      <div className="quantity-control">
                        <button className="qty-btn qty-minus">−</button>
                        <input type="text" value={item.quantity} className="qty-input" readOnly />
                        <button className="qty-btn qty-plus">+</button>
                      </div>
                    </td>
                    <td className="total-col">
                      <span className="item-total">₱ {(item.price * item.quantity).toFixed(2)}</span>
                    </td>
                    <td className="action-col">
                      <button className="remove-btn">×</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="empty-cart">
                    Your cart is empty
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Cart Summary */}
        <div className="cart-summary">
          <div className="discount-voucher">
            <p>Discount Voucher: 20% off</p>
          </div>
          <div className="cart-totals">
            <div className="total-row">
              <span>Total:</span>
              <span className="total-amount">₱ {total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Checkout Button */}
        <div className="checkout-section">
          <button 
            className="checkout-btn"
            onClick={() => navigate("/checkout")}
          >
            Check Out ({totalCount})
          </button>
        </div>
      </div>

      {/* You May Also Like Section */}
      <div className="related-section">
        <h2>You may also like</h2>
        <div className="related-products">
          {relatedProducts.map((product) => (
            <div key={product.id} className="product-card">
              <div className="product-image">
                <img src={product.image} alt={product.name} />
              </div>
              <div className="product-info">
                <p className="product-name">{product.name}</p>
                <div className="product-rating">
                  {"★".repeat(product.rating)}{"☆".repeat(5 - product.rating)}
                </div>
                <div className="product-footer">
                  <span className="product-price">₱ {product.price.toFixed(2)}</span>
                  <button className="product-cart-btn">🛒</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Cart;
