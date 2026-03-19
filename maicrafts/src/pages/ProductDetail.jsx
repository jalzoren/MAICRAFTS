// src/pages/ProductDetail.jsx
import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import "../css/ProductDetail.css";
import { products } from "../data/productsData";
import CheckoutFormModal from "../components/CheckoutFormModal";

const ProductDetail = () => {
  const { id } = useParams();

  // Find product
  const product = products.find((p) => p.id === id);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  if (!product) {
    return <h2 className="text-center mt-5">Product not found.</h2>;
  }

  // Thumbnails
  const thumbnails = product.images || [product.img];

  // States with default values
  const [selectedImage, setSelectedImage] = useState(thumbnails[0]);
  const [quantity, setQuantity] = useState(1);
  const [flowerQty, setFlowerQty] = useState("5 Flowers");
  const [size, setSize] = useState("Small");
  const [addOns, setAddOns] = useState("");
  const [basePrice, setBasePrice] = useState(product.price); // Initialize with product price

  // Multiplier for different flower quantities
  // Assuming product.price is for 5 flowers
  const flowerMultipliers = {
    "5 Flowers": 1.0,    // Base price (100%)
    "12 Flowers": 2.0,   // 2x for 12 flowers
    "24 Flowers": 3.5,   // 3.5x for 24 flowers
    "50 Flowers": 6.5    // 6.5x for 50 flowers
  };

  // Multiplier for different sizes
  const sizeMultipliers = {
    "Small": 1.0,
    "Medium": 1.5,
    "Large": 2.0
  };

  // Calculate base price based on size and flower quantity
  useEffect(() => {
    if (size && flowerQty) {
      // Start with the product's base price (for 5 flowers, small size)
      const basePriceFor5Flowers = product.price;
      
      // Apply flower quantity multiplier
      const flowerMultiplier = flowerMultipliers[flowerQty] || 1;
      let calculatedPrice = basePriceFor5Flowers * flowerMultiplier;
      
      // Apply size multiplier
      const sizeMultiplier = sizeMultipliers[size] || 1;
      calculatedPrice = calculatedPrice * sizeMultiplier;
      
      // Round to nearest whole number
      setBasePrice(Math.round(calculatedPrice));
    }
  }, [size, flowerQty, product.price]);

  const getAddOnPrice = () => {
    if (addOns.includes("₱50")) return 50;
    if (addOns.includes("₱250")) return 250;
    if (addOns.includes("₱350")) return 350;
    return 0;
  };

  // Calculate total price
  const unitPrice = basePrice + getAddOnPrice();
  const totalPrice = unitPrice * quantity;

  const addToCart = () => {
    let cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const uniqueKey = `${product.id}-${size}-${flowerQty}-${addOns || "none"}`;
    const finalPrice = basePrice + getAddOnPrice();
    const existingIndex = cart.findIndex((item) => item.key === uniqueKey);

    if (existingIndex !== -1) {
      cart[existingIndex].qty += quantity;
      cart[existingIndex].total = finalPrice * cart[existingIndex].qty;
    } else {
      cart.push({
        key: uniqueKey,
        id: product.id,
        title: product.title,
        price: finalPrice,
        img: selectedImage,
        qty: quantity,
        flowerQty,
        size,
        addOns,
        total: finalPrice * quantity,
      });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cart-updated"));
    alert("Added to cart!");
  };

  // Related products
  const relatedProducts = products
    .filter((p) => p.id !== product.id)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  // Calculate price breakdown for display
  const getBreakdownDetails = () => {
    const baseFor5 = product.price;
    const flowerMultiplier = flowerMultipliers[flowerQty] || 1;
    const sizeMultiplier = sizeMultipliers[size] || 1;
    
    const flowerPrice = baseFor5 * flowerMultiplier;
    const finalWithSize = flowerPrice * sizeMultiplier;
    
    return {
      baseFor5,
      flowerMultiplier,
      sizeMultiplier,
      flowerPrice,
      finalWithSize: Math.round(finalWithSize)
    };
  };

  
  const breakdown = getBreakdownDetails();

// Remove your current handleFormSubmit function and replace it with:

const handleCheckoutSubmit = async (orderData) => {
  try {
    console.log("📤 Received order data from modal:", orderData);
    
    // Check if cartItems exists in orderData
    if (!orderData.cartItems) {
      console.error("❌ cartItems is missing from orderData!");
      throw new Error("Cart items missing");
    }
    
    // Prepare order data for backend
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
        price: item.price,
        flowerQty: item.flowerQty,
        size: item.size,
        addOns: item.addOns
      })),
      totalPrice: orderData.totalPrice || totalPrice
    };

    console.log("📤 Sending to backend:", completeOrderData);

    // Send to backend
    const response = await fetch("http://localhost:5000/send-order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(completeOrderData),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Failed to process order");
    }

    // Clear cart after successful order
    localStorage.removeItem("cart");
    localStorage.removeItem("checkout_item");
    window.dispatchEvent(new Event("cart-updated"));

    return result;

  } catch (error) {
    console.error("❌ Email sending error:", error);
    throw error;
  }
};

  return (
    
    <div className="product-detail-page">

      <div className="container">
        {/* Breadcrumb */}
        <div className="breadcrumb">
          <Link to="/">Home</Link> › <Link to="/products">Products</Link> › {product.title}
        </div>

        {/* Main Content */}
        <div className="main-content">
          {/* Left: Images */}
          <div className="image-section">
            <div className="main-image-wrapper">
              <img src={selectedImage} alt="Product" className="main-image" />
            </div>
            <div className="thumbnails">
              {thumbnails.map((thumb, idx) => (
                <div
                  key={idx}
                  className={`thumbnail ${selectedImage === thumb ? "active" : ""}`}
                  onClick={() => setSelectedImage(thumb)}
                >
                  <img src={thumb} alt={`View ${idx + 1}`} />
                </div>
              ))}
            </div>
          </div>

          {/* Right: Info */}
          <div className="info-section">
            <h1 className="product-title">{product.title}</h1>
            <h2 className="product-price">Total: ₱{totalPrice.toFixed(2)}</h2>

            {/* Flower Qty + Size */}
            <div className="row">
              <div className="half">
                <label className="label">Quantity of Flower</label>
                <select
                  value={flowerQty}
                  onChange={(e) => setFlowerQty(e.target.value)}
                  className="select"
                >
                  <option value="5 Flowers">5 Flowers - ₱{Math.round(product.price).toFixed(2)}</option>
                  <option value="12 Flowers">12 Flowers - ₱{Math.round(product.price * 2).toFixed(2)}</option>
                  <option value="24 Flowers">24 Flowers - ₱{Math.round(product.price * 3.5).toFixed(2)}</option>
                  <option value="50 Flowers">50 Flowers - ₱{Math.round(product.price * 6.5).toFixed(2)}</option>
                </select>
              </div>

              <div className="half">
                <label className="label">Size</label>
                <select 
                  value={size} 
                  onChange={(e) => setSize(e.target.value)} 
                  className="select"
                >
                  <option value="Small">Small</option>
                  <option value="Medium">Medium</option>
                  <option value="Large">Large</option>
                </select>
              </div>
            </div>

            {/* Add-ons */}
            <div className="section">
              <label className="label">Select your add ons</label>
              <select value={addOns} onChange={(e) => setAddOns(e.target.value)} className="select">
                <option value="">None</option>
                <option>Greeting Card (+₱50)</option>
                <option>Chocolate Box (+₱250)</option>
                <option>Teddy Bear (+₱350)</option>
              </select>
            </div>

            {/* Quantity */}
            <div className="section">
              <label className="label">Quantity</label>
              <div className="quantity-controls">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
                <span>{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)}>+</button>
              </div>
            </div>

            {/* Total + Buttons */}
            <div className="total-section">
              <div className="total">Total: ₱{totalPrice.toFixed(2)}</div>

              <div className="button-group">
                <button className="btn-add-cart" onClick={addToCart}>
                  <ShoppingCart size={20} /> Add to Cart
                </button>

                {/* BUY NOW */}
                <button
                  className="btn-buy-now"
                  onClick={() => {
                    const checkoutItem = [
                      {
                        key: `${product.id}-${size}-${flowerQty}-${addOns || "none"}`,
                        id: product.id,
                        title: product.title,
                        price: unitPrice,
                        img: selectedImage,
                        qty: quantity,
                        flowerQty,
                        size,
                        addOns,
                        total: totalPrice,
                      },
                    ];                    

                    localStorage.setItem("checkout_item", JSON.stringify(checkoutItem));
                    setIsCheckoutOpen(true);
                  }}
                >
                  Buy Now
                </button>
              </div>
            </div>

            {/* Policy */}
            <div className="policy-links">
              <a href="#">Payment Policy</a> • <a href="#">Delivery Policy</a>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="description-section">
          <h3>Product Description</h3>
          <p>{product.description}</p>
        </div>

        {/* Related */}
        <div className="related-section">
          <h3>You may also like</h3>
          <div className="related-grid">
            {relatedProducts.map((item) => (
              <Link to={`/product/${item.id}`} key={item.id} className="related-card">
                <img src={item.img} alt={item.title} />
                <div className="related-info">
                  <p className="related-title">{item.title}</p>
                  <div className="stars">★★★★★</div>
                  <div className="related-footer">
                    <span className="related-price">₱{item.price}</span>
                    <button className="related-cart-btn">
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

export default ProductDetail;