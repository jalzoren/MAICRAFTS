// src/pages/ProductDetail.jsx
import { useState, useEffect, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { useCart } from "../context/CartContext";
import {
  parseVariations,
  parseAddOns,
  calculateTotalPrice,
  calculateUnitPrice,
  formatBundleLabel,
  hasVariations,
  hasAddOns,
} from "../utils/productVariations";
import "../css/ProductDetail.css";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [quantity, setQuantity] = useState(1);

  // ── New shape: { bundle: bundleObj|null, color: colorObj|null }
  const [selectedVariations, setSelectedVariations] = useState({ bundle: null, color: null });
  const [selectedAddOns, setSelectedAddOns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Normalize images from product (handles arrays, json-strings, single-string values)
  const getImagesArray = (prod) => {
    if (!prod) return [];
    let imgs = prod.images ?? prod.images;
    if (Array.isArray(imgs)) return imgs;
    if (typeof imgs === 'string') {
      const raw = imgs.trim();
      if (!raw) return [];
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
        if (parsed) return [parsed];
      } catch (e) {
        return [raw];
      }
    }
    if (imgs) return [imgs];
    return [];
  };

  useEffect(() => { fetchProduct(); }, [id]);

  // ── Initialize selected variations once product loads ──────────────────────
  useEffect(() => {
    if (product) {
      fetchRelatedProducts();
      const parsedVars = parseVariations(product.variations);

      // Pre-select the first bundle and first color if they exist
      setSelectedVariations({
        bundle: parsedVars.bundles[0] || null,
        color:  parsedVars.colors[0]  || null,
      });
    }
  }, [product]);

  useEffect(() => {
    if (product) {
      const imgs = getImagesArray(product);
      setSelectedImage(
        product.mainImage ||
        (imgs.length > 0 ? imgs[0] : null) ||
        product.image ||
        "https://via.placeholder.com/500x500?text=🌸"
      );
    }
  }, [product]);

  const fetchProduct = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/products/${id}`);
      const data = await response.json();
      if (data.success) setProduct(data.data);
      else console.error("Product not found");
    } catch (err) {
      console.error("Error fetching product:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRelatedProducts = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/products");
      const data = await response.json();
      if (data.success) {
        const related = data.data
          .filter((p) => p.id !== product.id && p.category === product.category)
          .slice(0, 3);
        setRelatedProducts(related);
      }
    } catch (err) {
      console.error("Error fetching related products:", err);
    }
  };

  // ── Memoised derived data ──────────────────────────────────────────────────
  const parsedAddOns = useMemo(() => parseAddOns(product?.add_ons || []), [product]);

  const variationsData = useMemo(
    () => parseVariations(product?.variations || []),
    [product?.variations]
  );

  const unitPrice = useMemo(
    () => calculateUnitPrice(product?.price || 0, selectedVariations, selectedAddOns, parsedAddOns),
    [product?.price, selectedVariations, selectedAddOns, parsedAddOns]
  );

  const totalPrice = useMemo(() => unitPrice * quantity, [unitPrice, quantity]);

  // ── Cart / Buy Now ─────────────────────────────────────────────────────────
  const handleAddToCart = async () => {
    if (!product) return;
    try {
      const cartItem = {
        product_id: product.id,
        name: product.name,
        price: unitPrice,
        quantity,
        image_url: selectedImage,
        note: JSON.stringify({
          variations: selectedVariations,
          addOns: parsedAddOns.filter(a => selectedAddOns.includes(a.id)),
        }),
      };
      await addItem(cartItem, quantity);
      alert("Product added to cart!");
    } catch (err) {
      console.error("Error adding to cart:", err);
      alert("Failed to add product to cart");
    }
  };

  const handleBuyNow = () => {
    if (!product) return;
    const checkoutItems = [{
      product_id: product.id,
      name: product.name,
      price: unitPrice,
      quantity,
      image_url: selectedImage,
      variations: selectedVariations,
      addOns: selectedAddOns,
      total: totalPrice,
    }];
    localStorage.setItem("checkout_items", JSON.stringify(checkoutItems));
    navigate("/checkout");
  };

  // ── Thumbnails ─────────────────────────────────────────────────────────────
  const thumbnails = (() => {
    const imgs = getImagesArray(product);
    return imgs.length > 0
      ? imgs
      : [product?.mainImage || product?.image || "https://via.placeholder.com/500x500?text=🌸"];
  })();

  if (isLoading) {
    return (
      <div className="product-detail-page">
        <div className="container loading-state"><p>Loading product...</p></div>
      </div>
    );
  }

  return (
    <div className="product-detail-page">
      <div className="container">
        {/* Breadcrumb */}
        <div className="breadcrumb">
          <Link to="/">Home</Link> › <Link to="/products">Products</Link> ›{" "}
          {product?.name || "Product"}
        </div>

        {product ? (
          <div className="main-content">

            {/* ── Image Gallery ───────────────────────────────────────── */}
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

            {/* ── Product Info ─────────────────────────────────────────── */}
            <div className="info-section">
              <h1 className="product-title">{product.name}</h1>
              <h2 className="product-price">₱{unitPrice.toFixed(2)}</h2>
              <p className="product-stock">
                Stock: {product.stock > 0 ? `${product.stock} available` : "Out of Stock"}
              </p>

              {/* ── Bundle Variations ──────────────────────────────────── */}
              {variationsData.bundles.length > 0 && (
                <div className="section">
                  <label className="label">Bundle</label>
                  <select
                    className="select"
                    value={selectedVariations.bundle?.id || ""}
                    onChange={(e) => {
                      const selected = variationsData.bundles.find(b => b.id === e.target.value);
                      setSelectedVariations(prev => ({ ...prev, bundle: selected || null }));
                    }}
                  >
                    <option value="">Select a bundle</option>
                    {variationsData.bundles.map(bundle => (
                      <option key={bundle.id} value={bundle.id}>
                        {formatBundleLabel(bundle)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* ── Color Variations ───────────────────────────────────── */}
              {variationsData.colors.length > 0 && (
                <div className="section">
                  <label className="label">
                    Color
                    {selectedVariations.color && (
                      <span className="selected-color-label"> — {selectedVariations.color.name}</span>
                    )}
                  </label>
                  <div className="color-swatches">
                    {variationsData.colors.map(color => (
                      <button
                        key={color.id}
                        type="button"
                        className={`color-swatch ${selectedVariations.color?.id === color.id ? "color-swatch--active" : ""}`}
                        style={{ backgroundColor: color.hex || "#ccc" }}
                        title={color.name}
                        onClick={() =>
                          setSelectedVariations(prev => ({ ...prev, color }))
                        }
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ── Add-Ons ────────────────────────────────────────────── */}
              {parsedAddOns.length > 0 && (
                <div className="section">
                  <label className="label">Add-ons</label>
                  <div className="addons-list">
                    {parsedAddOns.map(addon => (
                      <label key={addon.id} className="addon-item">
                        <input
                          type="checkbox"
                          checked={selectedAddOns.includes(addon.id)}
                          onChange={() =>
                            setSelectedAddOns(prev =>
                              prev.includes(addon.id)
                                ? prev.filter(i => i !== addon.id)
                                : [...prev, addon.id]
                            )
                          }
                        />
                        <span className="addon-name">{addon.name}</span>
                        <span className="addon-price">(+₱{addon.price.toFixed(2)})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Quantity ───────────────────────────────────────────── */}
              <div className="section">
                <label className="label">Quantity</label>
                <div className="quantity-controls">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button>
                  <span>{quantity}</span>
                  <button onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}>+</button>
                </div>
              </div>

              {/* ── Price Summary ──────────────────────────────────────── */}
              <div className="total-section">
                <div className="price-breakdown">
                  <div className="price-row">
                    <span>Unit Price:</span>
                    <span>₱{unitPrice.toFixed(2)}</span>
                  </div>
                  <div className="price-row">
                    <span>Quantity:</span>
                    <span>x {quantity}</span>
                  </div>
                  <div className="price-row total">
                    <span>Total:</span>
                    <span>₱{totalPrice.toFixed(2)}</span>
                  </div>
                </div>

                <div className="button-group">
                  <button
                    className="btn-add-cart"
                    onClick={handleAddToCart}
                    disabled={product.stock === 0}
                  >
                    <ShoppingCart size={20} /> Add to Cart
                  </button>
                  <button
                    className="btn-buy-now"
                    onClick={handleBuyNow}
                    disabled={product.stock === 0}
                  >
                    Buy Now
                  </button>
                </div>
              </div>

              <div className="policy-links">
                <a href="/payment-policy">Payment Policy</a> •{" "}
                <a href="/delivery-policy">Delivery Policy</a>
              </div>
            </div>
          </div>
        ) : (
          <div className="loading-state"><p>Product not found.</p></div>
        )}

        {/* ── Description ─────────────────────────────────────────────────── */}
        <div className="description-section">
          <h3>Product Description</h3>
          <p>{product?.description || "No description available."}</p>
        </div>

        {/* ── Related Products ─────────────────────────────────────────────── */}
        {relatedProducts.length > 0 && (
          <div className="related-section">
            <h3>You may also like</h3>
            <div className="related-grid">
              {relatedProducts.map(item => (
                <Link to={`/product/${item.id}`} key={item.id} className="related-card">
                  <img src={item.mainImage || item.image} alt={item.name} />
                  <div className="related-info">
                    <p className="related-title">{item.name}</p>
                    <div className="stars">★★★★★</div>
                    <div className="related-footer">
                      <span className="related-price">₱{Number(item.price).toFixed(2)}</span>
                      <button className="related-cart-btn" onClick={e => e.preventDefault()}>
                        <ShoppingCart size={18} />
                      </button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetail;