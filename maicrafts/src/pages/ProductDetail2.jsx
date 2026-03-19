// src/pages/ProductDetail2.jsx
import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import "../css/ProductDetail2.css";
import { products } from "../data/productsData";
import CheckoutFormModal from "../components/CheckoutFormModal";

const ProductDetail2 = () => {
  const { id } = useParams();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Filter crochet products
  const crochetProducts = products.filter((p) =>
    p.category.toLowerCase().includes("crochet")
  );

  // Selected product
  const product = crochetProducts.find((p) => p.id === id);

  // Hooks BEFORE any conditional
  const thumbnails = product?.images || [product?.img];
  const [selectedImage, setSelectedImage] = useState(thumbnails[0]);
  const [quantity, setQuantity] = useState(1);

  if (!product) {
    return <h2 className="text-center mt-5">Crochet product not found.</h2>;
  }

  const totalPrice = product.price * quantity;

  // Add to cart
  const addToCart = () => {
    let cart = JSON.parse(localStorage.getItem("cart") || "[]");

    const existing = cart.find(
      (item) => item.id === product.id && item.img === selectedImage
    );

    if (existing) {
      existing.qty += quantity;
      existing.total = existing.price * existing.qty;
    } else {
      cart.push({
        key: `${product.id}-${Date.now()}`,
        id: product.id,
        title: product.title,
        price: product.price,
        img: selectedImage,
        qty: quantity,
        total: totalPrice,
      });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cart-updated"));
    alert("Added to cart!");
  };

  // BUY NOW Function
  const buyNow = () => {
    const checkoutItem = [
      {
        id: product.id,
        title: product.title,
        price: product.price,
        img: selectedImage,
        qty: quantity,
        total: totalPrice
      }
    ];

    localStorage.setItem("checkout_item", JSON.stringify(checkoutItem));
    setIsCheckoutOpen(true);
  };

  // Related Products
  const relatedProducts = crochetProducts
    .filter((p) => p.id !== product.id)
    .slice(0, 4);

  return (
    <div className="pd-page">

      <div className="pd-container">
        <div className="pd-breadcrumb">
          Crochet &gt; {product.title}
        </div>

        <div className="pd-main">
          {/* LEFT */}
          <div className="pd-left">
            <div className="pd-image-wrapper">
              <img src={selectedImage} className="pd-main-image" />
            </div>
          </div>

          {/* RIGHT */}
          <div className="pd-right">
            <h1 className="pd-title">{product.title}</h1>
            <h2 className="pd-price">₱ {totalPrice.toFixed(2)}</h2>

            <div className="pd-description-box">
              <h3 className="pd-description-title">Product Description</h3>
              <p className="pd-description-text">{product.description}</p>
            </div>

            {/* Quantity */}
            <div className="pd-quantity-section">
              <label className="pd-label">Quantity</label>

              <div className="pd-quantity-box">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="pd-qty-btn"
                >
                  -
                </button>

                <span className="pd-qty-value">{quantity}</span>

                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="pd-qty-btn"
                >
                  +
                </button>
              </div>
            </div>

            {/* Buttons */}
            <div className="pd-buttons">
              <button className="pd-add-cart" onClick={addToCart}>
                <ShoppingCart size={20} /> Add to Cart
              </button>

              <button className="pd-buy" onClick={buyNow}>
                Buy Now
              </button>
            </div>
          </div>
        </div>

        {/* Related */}
        <div className="pd-related-section">
          <h3 className="pd-related-title">You may also like</h3>

          <div className="pd-related-grid">
            {relatedProducts.map((item) => (
              <Link to={`/crochet/${item.id}`} key={item.id} className="pd-related-card">
                <img src={item.img} className="pd-related-img" />

                <div className="pd-related-info">
                  <p className="pd-related-name">{item.title}</p>
                  <div className="pd-stars">★★★★★</div>

                  <div className="pd-related-footer">
                    <span className="pd-related-price">₱ {item.price}</span>
                    <button className="pd-related-cart-btn">
                      <ShoppingCart size={18} />
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* CHECKOUT MODAL */}
        <CheckoutFormModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          cartItems={JSON.parse(localStorage.getItem("checkout_item") || "[]")}
          totalPrice={totalPrice}
        />

      </div>
    </div>
  );
};

export default ProductDetail2;
