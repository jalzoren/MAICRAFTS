// src/pages/About.jsx
import "../css/About.css";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const About = () => {
  const [loaded, setLoaded] = useState(false);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoaded(true);
    fetchFeaturedProducts();
  }, []);

  const fetchFeaturedProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:5000/api/products");
      const data = await response.json();
      
      if (data.success) {
        // Take first 8 products for the bento grid, or customize as needed
        const products = data.data.slice(0, 8);
        
        // Map API products to match your bento grid structure
        const mappedProducts = products.map((product, idx) => {
          // Determine category based on product name or use default
          let category = "Handmade";
          if (product.name?.toLowerCase().includes("crochet")) {
            category = "Crochet";
          } else if (product.name?.toLowerCase().includes("rose") || 
                     product.name?.toLowerCase().includes("bouquet") ||
                     product.name?.toLowerCase().includes("flower")) {
            category = "Bouquet";
          } else if (product.name?.toLowerCase().includes("doll")) {
            category = "Crochet";
          }
          
          return {
            id: product.id,
            image: product.mainImage || product.image || "../src/assets/placeholder.png",
            title: product.name || product.title || "Handcrafted Item",
            price: product.price,
            category: category,
          };
        });
        
        setFeaturedProducts(mappedProducts);
      } else {
        setError(data.message || "Failed to fetch products");
        // Fallback to static products if API fails
        setFeaturedProducts(getFallbackProducts());
      }
    } catch (err) {
      console.error("Error fetching products:", err);
      setError("Network error. Using fallback products.");
      // Fallback to static products if API fails
      setFeaturedProducts(getFallbackProducts());
    } finally {
      setLoading(false);
    }
  };

  // Fallback static products in case API fails
  const getFallbackProducts = () => {
    return [
      {
        id: 1,
        image: "../src/assets/doll.png",
        title: "Rainbow Rose Bouquet",
        price: 799,
        category: "Bouquet",
      },
      {
        id: 2,
        image: "../src/assets/doll2.png",
        title: "24K Gold Dipped Rose",
        price: 1299,
        category: "Bouquet",
      },
      {
        id: 3,
        image: "../src/assets/doll3.png",
        title: "Crochet Hello Kitty",
        price: 100,
        category: "Crochet",
      },
      {
        id: 4,
        image: "../src/assets/doll6.png",
        title: "Crochet Couple Dolls",
        price: 300,
        category: "Crochet",
      },
      {
        id: 5,
        image: "../src/assets/flower.png",
        title: "Giant Fuzzy Crochet Rose",
        price: 250,
        category: "Bouquet",
      },
      {
        id: 6,
        image: "../src/assets/flower2.png",
        title: "Deluxe Fuzzy Crochet Rose",
        price: 400,
        category: "Bouquet",
      },
      {
        id: 7,
        image: "../src/assets/doll4.png",
        title: "Crochet Corpse Bride",
        price: 150,
        category: "Crochet",
      },
      {
        id: 8,
        image: "../src/assets/doll2.png",
        title: "Handmade Crochet Bunny",
        price: 120,
        category: "Crochet",
      },
    ];
  };

  return (
    <>
      {/* Mission & Vision */}
      <section className="mission-vision">
        <div className="mission">
          <h2>Our Mission</h2>
          <p>
            To create handcrafted products that are both useful and beautiful.
            We aim to provide customers with high-quality items that exceed
            expectations and offer personalized services so every order feels
            special and meaningful.
          </p>
        </div>

        <div className="center-arch">
          <video
            src="/maicraftss.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="arch-video"
          />
          <div className="arch-overlay">
            <span>Maicrafts</span>
          </div>
        </div>

        <div className="vision">
          <h2>Our Vision</h2>
          <p>
            To become a well-known Filipino name recognized for handmade products
            that reflect creativity and quality — inspiring greater appreciation
            for handmade crafts across the Philippines.
          </p>
        </div>
      </section>

      {/* OUR WORK – BENTO GRID (FINALLY 100% WORKING) */}
      <section className="our-work">
        <div className="container">
          <h2 className="section-title">Our Work</h2>
          <p className="section-subtitle">
            Every piece is handcrafted with love, passion, and attention to detail.
          </p>

          {loading ? (
            <div className="loading-spinner">
              <div className="spinner-border text-warning" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-3">Loading our creations...</p>
            </div>
          ) : error && featuredProducts.length === 0 ? (
            <div className="error-message">
              <p className="text-warning">{error}</p>
              <button 
                className="btn-retry" 
                onClick={fetchFeaturedProducts}
              >
                Try Again
              </button>
            </div>
          ) : (
            <div className={`bento-grid ${loaded ? "loaded" : ""}`}>
              {featuredProducts.map((product, index) => (
                <Link
                  key={product.id}
                  to={`/product/${product.id}`}
                  className={`bento-item bento-${index + 1}`}
                  style={{
                    backgroundImage: `url(${product.image})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    textDecoration: "none",
                  }}
                >
                  <div className="bento-overlay">
                    <h3>{product.title}</h3>
                    <p>₱{product.price.toLocaleString()}</p>
                    <span className="bento-tag">
                      {product.category}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="bento-cta">
            <Link to="/products" className="btn-primary">
              Explore All Creations
            </Link>
          </div>
        </div>
      </section>
    </>
  );
};

export default About;