// src/pages/ProductDetail.jsx
import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import "../css/ProductDetail.css";

const ProductDetail = () => {
  const { id } = useParams();
  
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [flowerQty, setFlowerQty] = useState("5 Flowers");
  const [size, setSize] = useState("Small");
  const [addOns, setAddOns] = useState("");
  const [basePrice, setBasePrice] = useState(0);
  const [isLoading, setIsLoading] = useState(true); // Keep this but don't show white screen

  useEffect(() => {
    fetchProduct();
  }, [id]);

  useEffect(() => {
    if (product) {
      fetchRelatedProducts();
    }
  }, [product]);


  useEffect(() => {
    if (product && product.images && product.images.length > 0 && !selectedImage) {
      setSelectedImage(product.mainImage || product.images[0]);
    } else if (product && !selectedImage) {
      setSelectedImage(product.mainImage || product.image || 'https://via.placeholder.com/500x500?text=🌸');
    }
  }, [product, selectedImage]);

  const fetchProduct = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/products/${id}`);
      const data = await response.json();
      
      if (data.success) {
        setProduct(data.data);
      } else {
        console.error('Product not found');
      }
    } catch (err) {
      console.error('Error fetching product:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRelatedProducts = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/products');
      const data = await response.json();
      if (data.success) {
        const related = data.data
          .filter(p => p.id !== product.id && p.category === product.category)
          .slice(0, 3);
        setRelatedProducts(related);
      }
    } catch (err) {
      console.error('Error fetching related products:', err);
    }
  };


  // Show nothing while loading - but keep old page behind
  if (!product) {
    return null;
  }

  const thumbnails = product.images && product.images.length > 0 
    ? product.images 
    : [product.mainImage || product.image || 'https://via.placeholder.com/500x500?text=🌸'];

  return (
    <div className="product-detail-page">
      <div className="container">
        <div className="breadcrumb">
          <Link to="/">Home</Link> › <Link to="/products">Products</Link> › {product.name}
        </div>

        <div className="main-content">
          <div className="image-section">
            <div className="main-image-wrapper">
              <img src={selectedImage} alt={product.name} className="main-image" />
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

          <div className="info-section">
            <h1 className="product-title">{product.name}</h1>
            <h2 className="product-price">Total: ₱{totalPrice.toFixed(2)}</h2>

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

            <div className="section">
              <label className="label">Select your add ons</label>
              <select value={addOns} onChange={(e) => setAddOns(e.target.value)} className="select">
                <option value="">None</option>
                <option>Greeting Card (+₱50)</option>
                <option>Chocolate Box (+₱250)</option>
                <option>Teddy Bear (+₱350)</option>
              </select>
            </div>

            <div className="section">
              <label className="label">Quantity</label>
              <div className="quantity-controls">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
                <span>{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)}>+</button>
              </div>
            </div>

            <div className="total-section">
              <div className="total">Total: ₱{totalPrice.toFixed(2)}</div>
              <div className="button-group">
                <button className="btn-add-cart" onClick={addToCart}>
                  <ShoppingCart size={20} /> Add to Cart
                </button>
                <button
                  className="btn-buy-now"
                  onClick={() => {
                    const checkoutItem = [{
                      key: `${product.id}-${size}-${flowerQty}-${addOns || "none"}`,
                      id: product.id,
                      title: product.name,
                      price: unitPrice,
                      img: selectedImage,
                      qty: quantity,
                      flowerQty,
                      size,
                      addOns,
                      total: totalPrice,
                    }];
                    localStorage.setItem("checkout_item", JSON.stringify(checkoutItem));
                    setIsCheckoutOpen(true);
                  }}
                >
                  Buy Now
                </button>
              </div>
            </div>

            <div className="policy-links">
              <a href="#">Payment Policy</a> • <a href="#">Delivery Policy</a>
            </div>
          </div>
        </div>

        <div className="description-section">
          <h3>Product Description</h3>
          <p>{product.description || "No description available."}</p>
        </div>

        <div className="related-section">
          <h3>You may also like</h3>
          <div className="related-grid">
            {relatedProducts.map((item) => (
              <Link to={`/product/${item.id}`} key={item.id} className="related-card">
                <img src={item.mainImage || item.image} alt={item.name} />
                <div className="related-info">
                  <p className="related-title">{item.name}</p>
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
      </div>
    </div>
  );
};

export default ProductDetail;