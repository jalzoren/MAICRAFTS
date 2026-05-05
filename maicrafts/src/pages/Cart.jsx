// Cart.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { useCart } from "../context/CartContext";
import "../css/Cart.css";

// ── Helpers ────────────────────────────────────────────────────────────────

const parseNote = (note) => {
  if (!note) return null;
  try { return typeof note === "string" ? JSON.parse(note) : note; }
  catch { return null; }
};

// Shows bundle, color and add-on details stored inside the cart item's note field
const VariationDetails = ({ note }) => {
  const parsed = parseNote(note);
  if (!parsed) return null;

  const { variations, addOns } = parsed;
  const tags = [];

  if (variations?.bundle) {
    const b = variations.bundle;
    tags.push({ key: "bundle", text: `${b.quantity} pcs${b.size ? ` · ${b.size}` : ""}` });
  }
  if (variations?.color) {
    tags.push({ key: "color", text: variations.color.name, hex: variations.color.hex });
  }
  if (Array.isArray(addOns) && addOns.length > 0) {
    const names = addOns.map((a) => (typeof a === "object" ? a.name : null)).filter(Boolean);
    if (names.length) tags.push({ key: "addons", text: `+ ${names.join(", ")}` });
  }

  if (!tags.length) return null;

  return (
    <div className="item-variation-details">
      {tags.map(({ key, text, hex }) => (
        <span key={key} className="variation-tag">
          {hex && (
            <span
              className="color-dot"
              style={{ background: hex, display: "inline-block", width: 10, height: 10,
                       borderRadius: "50%", border: "1px solid #ccc", marginRight: 4,
                       verticalAlign: "middle" }}
            />
          )}
          {text}
        </span>
      ))}
    </div>
  );
};

// ── Component ──────────────────────────────────────────────────────────────

const Cart = () => {
  const { items, totalCount, removeItem, updateQuantity } = useCart();
  const navigate = useNavigate();
  const [relatedProducts, setRelatedProducts] = useState([]);

  // Fetch real products for "You may also like"
  useEffect(() => {
    const fetchRelated = async () => {
      try {
        const res  = await fetch("http://localhost:5000/api/products");
        const data = await res.json();
        if (data.success) {
          const cartIds = new Set(items.map((i) => i.product_id));
          setRelatedProducts(data.data.filter((p) => !cartIds.has(p.id)).slice(0, 4));
        }
      } catch (err) {
        console.error("Failed to fetch related products:", err);
      }
    };
    fetchRelated();
  }, [items]);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const handleCheckout = () => {
    // Normalise items and pass to Checkout via localStorage
    const checkoutItems = items.map((item) => {
      const parsed = parseNote(item.note);
      return {
        ...item,
        variations: parsed?.variations || {},
        addOns:     parsed?.addOns     || [],
        total:      item.price * item.quantity,
      };
    });
    localStorage.setItem("checkout_items", JSON.stringify(checkoutItems));
    navigate("/checkout");
  };

  return (
    <div className="cart-container">
      <div className="cart-wrapper">

        <div className="cart-header">
          <h1>My Cart ({totalCount} items)</h1>
        </div>

        {/* ── Items Table ──────────────────────────────────────────── */}
        <div className="cart-items-section">
          <table className="cart-table">
            <thead>
              <tr>
                <th className="item-col">Item</th>
                <th className="price-col">Price</th>
                <th className="quantity-col">Quantity</th>
                <th className="total-col">Total</th>
                <th className="action-col"></th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map((item, idx) => (
                  <tr key={`${item.product_id}-${idx}`} className="cart-item-row">
                    <td className="item-col">
                      <div className="item-details">
                        <img
                          src={item.image_url || "https://via.placeholder.com/80?text=🌸"}
                          alt={item.name}
                          className="item-image"
                        />
                        <div className="item-text">
                          <span className="item-name">{item.name}</span>
                          <VariationDetails note={item.note} />
                        </div>
                      </div>
                    </td>
                    <td className="price-col">
                      <span className="price-value">₱{item.price.toFixed(2)}</span>
                    </td>
                    <td className="quantity-col">
                      <div className="quantity-control">
                        <button
                          className="qty-btn qty-minus"
                          onClick={() => updateQuantity(item.product_id, item.quantity - 1, item.note)}
                        >−</button>
                        <input type="text" value={item.quantity} className="qty-input" readOnly />
                        <button
                          className="qty-btn qty-plus"
                          onClick={() => updateQuantity(item.product_id, item.quantity + 1, item.note)}
                        >+</button>
                      </div>
                    </td>
                    <td className="total-col">
                      <span className="item-total">₱{(item.price * item.quantity).toFixed(2)}</span>
                    </td>
                    <td className="action-col">
                      <button
                        className="remove-btn"
                        title="Remove item"
                        onClick={() => removeItem(item.product_id, item.note)}
                      >×</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="empty-cart">
                    <p>Your cart is empty.</p>
                    <Link to="/products" className="continue-shopping-link">Continue Shopping →</Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Summary + Checkout ───────────────────────────────────── */}
        {items.length > 0 && (
          <>
            <div className="cart-summary">
              <div className="cart-totals">
                <div className="total-row">
                  <span>Subtotal:</span>
                  <span className="total-amount">₱{subtotal.toFixed(2)}</span>
                </div>
                <div className="total-row">
                  <span>Shipping:</span>
                  <span className="total-amount">Calculated at checkout</span>
                </div>
                <div className="total-row final">
                  <span><strong>Total:</strong></span>
                  <span className="total-amount"><strong>₱{subtotal.toFixed(2)}</strong></span>
                </div>
              </div>
            </div>
            <div className="checkout-section">
              <button className="checkout-btn" onClick={handleCheckout}>
                Check Out ({totalCount})
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Related Products ─────────────────────────────────────────── */}
      {relatedProducts.length > 0 && (
        <div className="related-section">
          <h2>You may also like</h2>
          <div className="related-products">
            {relatedProducts.map((product) => (
              <Link
                to={`/product/${product.id}`}
                key={product.id}
                className="product-card"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <img
                  src={product.mainImage || product.image}
                  alt={product.name}
                  className="product-image"
                />
                <div className="product-info">
                  <p className="product-name">{product.name}</p>
                  <div className="product-rating">★★★★★</div>
                  <div className="product-footer">
                    <span className="product-price">₱{Number(product.price).toFixed(2)}</span>
                    <button className="product-cart-btn" onClick={(e) => e.preventDefault()}>
                      <ShoppingCart size={16} />
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;