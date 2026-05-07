// maicrafts/src/pages/Home.jsx
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "../css/Home.css";
import { useAuth } from "../context/AuthContext";

const Home = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const visibleCount = 3; // ensure 3 per slide

  console.log('🏠 Home - Auth State:', { 
    email: user?.email, 
    role: user?.role,
    isAuthenticated 
  });

  // Fetch products from backend
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await fetch("http://localhost:5000/api/products");
        const data = await response.json();
        
        if (data.success) {
          setProducts(data.data);
        } else {
          setError(data.message || "Failed to fetch products");
        }
      } catch (err) {
        console.error("Error fetching products:", err);
        setError("Network error. Please check your connection.");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const prevSlide = () => {
    setCurrentIndex((prev) =>
      prev === 0 ? Math.max(0, products.length - visibleCount) : Math.max(0, prev - visibleCount)
    );
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => {
      const nextIndex = prev + visibleCount;
      return nextIndex >= products.length ? 0 : nextIndex;
    });
  };

  const goToSlide = (index) => {
    setCurrentIndex(index * visibleCount);
  };

  const pages = Math.ceil(products.length / visibleCount);
  const visibleProducts = products.slice(currentIndex, currentIndex + visibleCount);

  // Handle category click - navigate to products page with category filter
  const handleCategoryClick = (category) => {
    navigate(`/products?category=${encodeURIComponent(category)}`);
  };

  // Loading state
  if (loading) {
    return (
      <>
        <section className="hero-section">
          <video autoPlay muted loop playsInline className="bg-video" src="/counter1.mp4" />
          <div className="circular-gradient-bg"></div>
          <div className="container hero-content py-5">
            <div className="row justify-content-center">
              <div className="header-section col-lg-10 col-xl-8">
                <h1 className="featured-title display-4 fw-bold mb-4 lh-1">
                  Your Vision<br />
                  <span className="text-accent">Artfully Made</span>
                </h1>
                <p className="featured-desc lead mb-5 fs-5 col-12 col-md-10 col-lg-8 mx-auto opacity-90">
                  Let us help you create a gift as unique as your love
                </p>
                <div className="cta-container">
                  <Link to="/products" className="btn-primary-custom">Explore Products</Link>
                  <Link to="/about-us" className="btn-outline-custom">Learn Our Story</Link>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section id="products" className="featured-prod py-5 py-md-7">
          <div className="container">
            <div className="section-title mb-5 mb-md-6">
              <h2 className="prod-title display-1 text-center m-0">Featured Products</h2>
            </div>
            <div className="text-center py-5">
              <div className="spinner-border text-warning" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-3 text-light">Loading products...</p>
            </div>
          </div>
        </section>
      </>
    );
  }

  // Error state
  if (error) {
    return (
      <>
        <section className="hero-section">
          <video autoPlay muted loop playsInline className="bg-video" src="/counter1.mp4" />
          <div className="circular-gradient-bg"></div>
          <div className="container hero-content py-5">
            <div className="row justify-content-center">
              <div className="header-section col-lg-10 col-xl-8">
                <h1 className="featured-title display-4 fw-bold mb-4 lh-1">
                  Your Vision<br />
                  <span className="text-accent">Artfully Made</span>
                </h1>
                <p className="featured-desc lead mb-5 fs-5 col-12 col-md-10 col-lg-8 mx-auto opacity-90">
                  Let us help you create a gift as unique as your love
                </p>
                <div className="cta-container">
                  <Link to="/products" className="btn-primary-custom">Explore Products</Link>
                  <Link to="/about-us" className="btn-outline-custom">Learn Our Story</Link>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section id="products" className="featured-prod py-5 py-md-7">
          <div className="container">
            <div className="section-title mb-5 mb-md-6">
              <h2 className="prod-title display-1 text-center m-0">Featured Products</h2>
            </div>
            <div className="alert alert-warning text-center mx-auto" style={{ maxWidth: "500px" }}>
              <p className="mb-0">{error}</p>
              <button 
                className="btn btn-outline-warning mt-3"
                onClick={() => window.location.reload()}
              >
                Try Again
              </button>
            </div>
          </div>
        </section>
      </>
    );
  }

  // Calculate category counts from actual products
  const categoryCounts = {
    'Dried Flowers': products.filter(p => p.category?.toLowerCase() === 'dried flowers' || p.category?.toLowerCase() === 'dried').length,
    'Satin Flowers': products.filter(p => p.category?.toLowerCase() === 'satin flowers' || p.category?.toLowerCase() === 'satin').length,
    'Bouquets': products.filter(p => p.category?.toLowerCase() === 'bouquets' || p.category?.toLowerCase() === 'bouquet').length,
    'Fresh Flowers': products.filter(p => p.category?.toLowerCase() === 'fresh flowers' || p.category?.toLowerCase() === 'fresh').length,
  };

  return (
    <>
      {/* Hero Section */}
      <section className="hero-section">
        <video autoPlay muted loop playsInline className="bg-video" src="/counter1.mp4" />
        <div className="circular-gradient-bg"></div>
        <div className="container hero-content py-5">
          <div className="row justify-content-center">
            <div className="header-section col-lg-10 col-xl-8">
              <h1 className="featured-title display-4 fw-bold mb-4 lh-1">
                Your Vision<br />
                <span className="text-accent">Artfully Made</span>
              </h1>
              <p className="featured-desc lead mb-5 fs-5 col-12 col-md-10 col-lg-8 mx-auto opacity-90">
                Let us help you create a gift as unique as your love
              </p>
              <div className="cta-container">
                <Link to="/products" className="btn-primary-custom">Explore Products</Link>
                <Link to="/about-us" className="btn-outline-custom">Learn Our Story</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="categories-section">
        <div className="container">
          <h2 className="section-title-categories">Shop by Category</h2>
          <div className="categories-grid">
            {/* Dried Flowers */}
            <div 
              className="category-card"
              onClick={() => handleCategoryClick('Dried Flowers')}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleCategoryClick('Dried Flowers');
                }
              }}
            >
              <div className="category-image dried-bg"></div>
              <div className="category-overlay">
                <h3>Dried Flowers</h3>
                <p>({categoryCounts['Dried Flowers']})</p>
              </div>
            </div>

            {/* Satin Flowers */}
            <div 
              className="category-card"
              onClick={() => handleCategoryClick('Satin Flowers')}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleCategoryClick('Satin Flowers');
                }
              }}
            >
              <div className="category-image satin-bg"></div>
              <div className="category-overlay">
                <h3>Satin Flowers</h3>
                <p>({categoryCounts['Satin Flowers']})</p>
              </div>
            </div>

            {/* Bouquets */}
            <div 
              className="category-card"
              onClick={() => handleCategoryClick('Bouquets')}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleCategoryClick('Bouquets');
                }
              }}
            >
              <div className="category-image bouquets-bg"></div>
              <div className="category-overlay">
                <h3>Bouquets</h3>
                <p>({categoryCounts['Bouquets']})</p>
              </div>
            </div>

            {/* Fresh Flowers */}
            <div 
              className="category-card"
              onClick={() => handleCategoryClick('Fresh Flowers')}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleCategoryClick('Fresh Flowers');
                }
              }}
            >
              <div className="category-image fresh-bg"></div>
              <div className="category-overlay">
                <h3>Fresh Flowers</h3>
                <p>({categoryCounts['Fresh Flowers']})</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section id="products" className="featured-prod py-5 py-md-7">
        <div className="container">
          <div className="section-title mb-5 mb-md-6">
            <h2 className="prod-title display-1 text-center m-0">Featured Products</h2>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-5">
              <p className="text-light">No products available at the moment.</p>
            </div>
          ) : (
            <div className="carousel-container position-relative">
              <div className="products-grid1">
                {visibleProducts.map((product) => (
                  <div key={product.id} className="product-item">
                    <Link to={`/product/${product.id}`} className="home-product-card-link">
                      <div className="home-product-card">
                        <div className="home-img-wrapper">
                          <img 
                            src={product.mainImage || product.image || "https://via.placeholder.com/300?text=Product"} 
                            alt={product.name} 
                            className="home-product-image" 
                            loading="lazy" 
                          />
                          <div className="home-img-overlay"></div>
                        </div>
                        <div className="home-product-details">
                          <h5 className="home-product-title">
                            {product.name || product.title}
                          </h5>
                          <div className="product-rating">
                            ★★★★★ <span>({Math.floor(Math.random() * 50) + 10})</span>
                          </div>
                          <p className="home-product-price">₱{Number(product.price).toFixed(2)}</p>
                          <button className="quick-add-btn" onClick={(e) => e.preventDefault()}>
                            Quick View
                          </button>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>

              {products.length > visibleCount && (
                <>
                  <button 
                    className="carousel-btn prev" 
                    onClick={prevSlide} 
                    aria-label="Previous products" 
                    disabled={currentIndex === 0}
                  ></button>
                  <button 
                    className="carousel-btn next" 
                    onClick={nextSlide} 
                    aria-label="Next products" 
                    disabled={currentIndex + visibleCount >= products.length}
                  ></button>
                </>
              )}

              <div className="carousel-dots text-center mt-4">
                {Array.from({ length: pages }).map((_, index) => (
                  <span
                    key={index}
                    className={`dot ${Math.floor(currentIndex / visibleCount) === index ? "active" : ""}`}
                    onClick={() => goToSlide(index)}
                    role="button"
                    tabIndex={0}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" || e.key === " ") goToSlide(index);
                    }}
                    aria-label={`Go to page ${index + 1}`}
                  ></span>
                ))}
              </div>
            </div>
          )}

          <div className="text-center mt-5">
            <Link to="/products" className="btn-view-all">View All Products</Link>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials-section">
        <div className="container">
          <h2 className="c-title">What Our Customers Say</h2>
          <div className="testimonials-grid">
            <div className="testimonial-card">
              <div className="testimonial-stars">★★★★★</div>
              <p>"Absolutely beautiful craftsmanship! The crochet bouquet exceeded my expectations. Will definitely order again!"</p>
              <div className="testimonial-author">
                <strong>Maria R.</strong>
                <span>Verified Buyer</span>
              </div>
            </div>
            <div className="testimonial-card">
              <div className="testimonial-stars">★★★★★</div>
              <p>"The attention to detail is incredible. My girlfriend loved her custom doll. Thank you Maicrafts!"</p>
              <div className="testimonial-author">
                <strong>James L.</strong>
                <span>Verified Buyer</span>
              </div>
            </div>
            <div className="testimonial-card">
              <div className="testimonial-stars">★★★★★</div>
              <p>"Fast shipping and great customer service. The product arrived carefully packaged and in perfect condition."</p>
              <div className="testimonial-author">
                <strong>Sarah C.</strong>
                <span>Verified Buyer</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="newsletter-section">
        <div className="container">
          <div className="newsletter-content">
            <h2>Subscribe to Our Newsletter</h2>
            <p>Get 10% off your first order and stay updated with our latest collections and exclusive offers!</p>
            <form className="newsletter-form" onSubmit={(e) => e.preventDefault()}>
              <input type="email" placeholder="Enter your email address" required />
              <button type="submit">Subscribe</button>
            </form>
            <p className="newsletter-note">No spam. Unsubscribe anytime.</p>
          </div>
        </div>
      </section>
    </>
  );
};

export default Home;