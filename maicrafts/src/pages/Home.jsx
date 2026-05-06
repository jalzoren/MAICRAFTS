// maicrafts/src/pages/Home.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "../css/Home.css";
import { products } from "../data/productsData.js";
import { useAuth } from "../context/AuthContext";


const Home = () => {
  const { user, isAuthenticated } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const visibleCount = 3; // ensure 3 per slide

   
  console.log('🏠 Home - Auth State:', { 
    email: user?.email, 
    role: user?.role,
    isAuthenticated 
  });


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

          <div className="carousel-container position-relative">
            <div className="products-grid1">
              {visibleProducts.map((product) => (
                <div key={product.id} className="product-item">
                  <Link to={`/product/${product.id}`} className="home-product-card-link">
                    <div className="home-product-card">
                      <div className="home-img-wrapper">
                        <img src={product.img} alt={product.title} className="home-product-image" loading="lazy" />
                        <div className="home-img-overlay"></div>
                      </div>
                      <div className="home-product-details">
                        <h5 className="home-product-title">
                          {product.id.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                        </h5>
                        <p className="home-product-price">₱{product.price.toFixed(2)}</p>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>

            <button className="carousel-btn prev" onClick={prevSlide} aria-label="Previous products" disabled={currentIndex === 0}></button>
            <button className="carousel-btn next" onClick={nextSlide} aria-label="Next products" disabled={currentIndex + visibleCount >= products.length}></button>

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

          <div className="text-center mt-5">
            <Link to="/products" className="btn-view-all">View All Products</Link>
          </div>
        </div>
      </section>
    </>
  );
};

export default Home;