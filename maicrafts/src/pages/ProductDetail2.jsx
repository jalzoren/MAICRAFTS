// src/pages/ProductDetail2.jsx
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import "../css/ProductDetail2.css";

const ProductDetail2 = () => {
  const { id } = useParams();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [relatedProducts, setRelatedProducts] = useState([]);

  // Fetch product from backend
  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/products/${id}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        // Verify it's a crochet product
        if (data.data.category?.toLowerCase().includes("crochet")) {
          setProduct(data.data);
        } else {
          console.error('Product is not crochet');
        }
      } else {
        console.error('Product not found');
      }
    } catch (err) {
      console.error('Error fetching product:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch related crochet products
  useEffect(() => {
    if (product) {
      fetchRelatedProducts();
    }
  }, [product]);

  const fetchRelatedProducts = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/products');
      const data = await response.json();
      if (data.success) {
        const crochetRelated = data.data
          .filter(p => p.id !== product.id && p.category?.toLowerCase().includes("crochet"))
          .slice(0, 4);
        setRelatedProducts(crochetRelated);
      }
    } catch (err) {
      console.error('Error fetching related products:', err);
    }
  };

  // Get images
  const thumbnails = product?.images && product.images.length > 0 
    ? product.images 
    : [product?.mainImage || product?.image || 'https://via.placeholder.com/500x500?text=🧶'];
  
  const [selectedImage, setSelectedImage] = useState(thumbnails[0]);
  const [quantity, setQuantity] = useState(1);

  if (loading) {
    return <div className="loading-spinner">Loading...</div>;
  }

  if (!product) {
    return <h2 className="text-center mt-5">Crochet product not found.</h2>;
  }

  const totalPrice = product.price * quantity;

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
        title: product.name,
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

  const buyNow = () => {
    const checkoutItem = [{
      id: product.id,
      title: product.name,
      price: product.price,
      img: selectedImage,
      qty: quantity,
      total: totalPrice
    }];

    localStorage.setItem("checkout_item", JSON.stringify(checkoutItem));
    setIsCheckoutOpen(true);
  };

  const handleCheckoutSubmit = async (orderData) => {
    try {
      const completeOrderData = {
        firstName: orderData.firstName || "",
        lastName: orderData.lastName || "",
        email: orderData.email || "",
        message: orderData.message || "No message provided",
        address: orderData.address || "",
        billingMethod: orderData.billingMethod || "",
        cartItems: orderData.cartItems.map(item => ({
          name: item.title,
          quantity: item.qty,
          price: item.price
        })),
        totalPrice: orderData.totalPrice || totalPrice
      };

      const response = await fetch("http://localhost:5000/send-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(completeOrderData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to process order");
      }

      localStorage.removeItem("cart");
      localStorage.removeItem("checkout_item");
      window.dispatchEvent(new Event("cart-updated"));
      return result;

    } catch (error) {
      console.error("Email sending error:", error);
      throw error;
    }
  };

  return (
    <div className="pd-page">
      <div className="pd-container">
        <div className="pd-breadcrumb">
          Crochet &gt; {product.name}
        </div>

        <div className="pd-main">
          {/* LEFT - Images */}
          <div className="pd-left">
            <div className="pd-image-wrapper">
              <img src={selectedImage} className="pd-main-image" alt={product.name} />
            </div>
          </div>

          {/* RIGHT - Info */}
          <div className="pd-right">
            <h1 className="pd-title">{product.name}</h1>
            <h2 className="pd-price">₱ {totalPrice.toFixed(2)}</h2>

            <div className="pd-description-box">
              <h3 className="pd-description-title">Product Description</h3>
              <p className="pd-description-text">{product.description || "No description available."}</p>
            </div>

            {/* Quantity */}
            <div className="pd-quantity-section">
              <label className="pd-label">Quantity</label>
              <div className="pd-quantity-box">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="pd-qty-btn">-</button>
                <span className="pd-qty-value">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} className="pd-qty-btn">+</button>
              </div>
            </div>

            {/* Buttons */}
            <div className="pd-buttons">
              <button className="pd-add-cart" onClick={addToCart}>
                <ShoppingCart size={20} /> Add to Cart
              </button>
              <button className="pd-buy" onClick={buyNow}>Buy Now</button>
            </div>
          </div>
        </div>

        {/* Related Products */}
        <div className="pd-related-section">
          <h3 className="pd-related-title">You may also like</h3>
          <div className="pd-related-grid">
            {relatedProducts.map((item) => (
              <Link to={`/crochet/${item.id}`} key={item.id} className="pd-related-card">
                <img src={item.mainImage || item.image} className="pd-related-img" alt={item.name} />
                <div className="pd-related-info">
                  <p className="pd-related-name">{item.name}</p>
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

        {/* Checkout Modal */}
        <CheckoutFormModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          onSubmit={handleCheckoutSubmit}
          cartItems={JSON.parse(localStorage.getItem("checkout_item") || "[]")}
          totalPrice={totalPrice}
        />
      </div>
    </div>
  );
};

export default ProductDetail2;