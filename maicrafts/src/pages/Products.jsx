// src/pages/Products.jsx
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import "../css/Products.css";
import FloatingCart from "../components/FloatingCart.jsx";
import { products } from "../data/productsData";

const Products = () => {
  const [sortBy, setSortBy] = useState("Popular");
  const [selectedOccasions, setSelectedOccasions] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  const occasions = ["Valentine's Day", "Mother's Day", "Birthday", "Anniversary", "Graduation", "Christmas"];
  const categories = ["Preserved Flowers", "Crochet Gifts", "Luxury Gifts", "Accessories"];

  const filteredAndSortedProducts = useMemo(() => {
    let filtered = products.filter((product) => {
      const occasionMatch =
        selectedOccasions.length === 0 ||
        selectedOccasions.some((occ) => product.occasion.includes(occ));
  
      const categoryMatch =
        selectedCategories.length === 0 ||
        selectedCategories.includes(product.category);
  
      return occasionMatch && categoryMatch;
    });
  
    if (sortBy === "Price: Low to High") {
      filtered = filtered.sort((a, b) => a.price - b.price);
    } else if (sortBy === "Price: High to Low") {
      filtered = filtered.sort((a, b) => b.price - a.price);
    } else if (sortBy === "Latest") {
      filtered = filtered.sort((a, b) => b.id.localeCompare(a.id));
    } else if (sortBy === "Name: A-Z") {
      filtered = filtered.sort((a, b) => a.id.localeCompare(b.id));
    }
  
    return filtered;
  }, [selectedOccasions, selectedCategories, sortBy]);

  const handleOccasionChange = (occasion) => {
    setSelectedOccasions((prev) =>
      prev.includes(occasion) ? prev.filter((o) => o !== occasion) : [...prev, occasion]
    );
  };

  const handleCategoryChange = (category) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const clearFilters = () => {
    setSelectedOccasions([]);
    setSelectedCategories([]);
  };

  const addToCart = (product) => {
    setCartItems((prevCart) => {
      const existing = prevCart.find((item) => item.id === product.id);

      if (existing) {
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }

      return [...prevCart, { ...product, qty: 1 }];
    });
  };

  const removeItem = (id) => {
    setCartItems((prevCart) => prevCart.filter((item) => item.id !== id));
  };

  const activeFiltersCount = selectedOccasions.length + selectedCategories.length;

  return (
    <>
      {/* HERO SECTION */}

      <section className="hero-wrapper d-flex align-items-center justify-content-center">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="bg-video"
          src="/products.mp4"
        />
        <div className="hero-bg-circle"></div>
        <div className="container hero-inner text-center">
          <div className="row justify-content-end align-items-center">
            <div className="col-md-6 hero-right-content text-md-end text-center">
              <p className="hero-desc lead mb-4">
                Order your Gift Now!
              </p>
           {/* This works perfectly now 
              <Link to="/?customize=true" className="btn hero-btn-primary">
                Customize!
              </Link>*/}
            </div>
          </div>
        </div>
      </section>

      {/* PRODUCTS SECTION */}
      <section className="products-page-wrapper py-5">
        <div className="container-fluid px-4">
          
          {/* Mobile Filter Toggle */}
          <button 
            className="mobile-filter-toggle d-lg-none mb-4"
            onClick={() => setShowFilters(!showFilters)}
          >
            <i className="fas fa-sliders-h me-2"></i>
            Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
          </button>

          <div className="products-layout">
            {/* FILTER SIDEBAR */}
            <aside className={`filter-sidebar-container ${showFilters ? 'show' : ''}`}>
              <div className="filter-sidebar">
                {/* Mobile Close Button */}
                <button 
                  className="filter-mobile-close d-lg-none"
                  onClick={() => setShowFilters(false)}
                >
                  <i className="fas fa-times"></i>
                </button>

                {/* Filter Header */}
                <div className="filter-header">
                  <h4 className="filter-main-title">
                    <i className="fas fa-filter me-2"></i>
                    Filters
                  </h4>
                  {activeFiltersCount > 0 && (
                    <span className="active-count-badge">{activeFiltersCount}</span>
                  )}
                </div>

                {/* Clear All Button */}
                {activeFiltersCount > 0 && (
                  <button className="btn-clear-all" onClick={clearFilters}>
                    Clear All
                  </button>
                )}

                {/* Occasion Filter */}
                <div className="filter-group">
                  <h5 className="filter-group-title">
                    <i className="fas fa-calendar-alt me-2"></i>
                    Occasion
                  </h5>
                  <div className="filter-options">
                    {occasions.map((occ) => (
                      <label key={occ} className="filter-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedOccasions.includes(occ)}
                          onChange={() => handleOccasionChange(occ)}
                        />
                        <span className="checkbox-custom"></span>
                        <span className="filter-label-text">{occ}</span>
                        <span className="filter-item-count">
                          ({products.filter(p => p.occasion.includes(occ)).length})
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Category Filter */}
                <div className="filter-group">
                  <h5 className="filter-group-title">
                    <i className="fas fa-boxes me-2"></i>
                    Category
                  </h5>
                  <div className="filter-options">
                    {categories.map((cat) => (
                      <label key={cat} className="filter-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(cat)}
                          onChange={() => handleCategoryChange(cat)}
                        />
                        <span className="checkbox-custom"></span>
                        <span className="filter-label-text">{cat}</span>
                        <span className="filter-item-count">
                          ({products.filter(p => p.category === cat).length})
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Active Filters Tags */}
                {activeFiltersCount > 0 && (
                  <div className="active-filters-tags">
                    <p className="active-filters-label">Active Filters:</p>
                    <div className="tags-container">
                      {selectedOccasions.map((occ) => (
                        <span key={occ} className="filter-tag">
                          {occ}
                          <button onClick={() => handleOccasionChange(occ)}>
                            <i className="fas fa-times"></i>
                          </button>
                        </span>
                      ))}
                      {selectedCategories.map((cat) => (
                        <span key={cat} className="filter-tag">
                          {cat}
                          <button onClick={() => handleCategoryChange(cat)}>
                            <i className="fas fa-times"></i>
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </aside>

            {/* PRODUCTS MAIN CONTENT */}
            <main className="products-main-content">
              {/* Results Bar */}
              <div className="results-bar">
                <div className="results-info">
                  <h2 className="results-title">
                    All Products 
                    <span className="results-count">({filteredAndSortedProducts.length})</span>
                  </h2>
                </div>

                <div className="sort-container">
                  <label htmlFor="sort-select" className="sort-label">
                    <i className="fas fa-sort me-2"></i>
                    Sort by:
                  </label>
                  <select 
                    id="sort-select"
                    className="sort-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="Popular">Popular</option>
                    <option value="Latest">Latest</option>
                    <option value="Price: Low to High">Price: Low to High</option>
                    <option value="Price: High to Low">Price: High to Low</option>
                    <option value="Name: A-Z">Name: A-Z</option>
                  </select>
                </div>
              </div>

              {/* Products Grid */}
                {filteredAndSortedProducts.length > 0 ? (
                  <div className="products-grid">
                    {filteredAndSortedProducts.map((product) => {
                      // Determine the correct route based on category
                      const isCrochet = product.category.toLowerCase().includes("crochet");
                      const productRoute = isCrochet ? `/crochet/${product.id}` : `/product/${product.id}`;
                      
                      return (
                        <Link
                          key={product.id}
                          to={productRoute}
                          className="product-card"
                        >
                          <div className="product-image-container">
                            <img 
                              src={product.img} 
                              alt={product.title} 
                              className="product-image" 
                              loading="lazy"
                            />
                            <div className="product-hover-overlay">
                              <span className="quick-view-text">
                                <i className="fas fa-eye me-2"></i>
                                Quick View
                              </span>
                            </div>
                          </div>
                          
                          <div className="product-info">
                            <h3 className="product-name">
                              {product.title} {/* Using title instead of ID */}
                            </h3>
                            <div className="product-price-container">
                              <span className="product-price">₱{product.price.toFixed(2)}</span>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <i className="fas fa-search"></i>
                  </div>
                  <h3 className="empty-state-title">No Products Found</h3>
                  <p className="empty-state-text">
                    We couldn't find any products matching your filters.
                  </p>
                  <button className="btn hero-btn-primary" onClick={clearFilters}>
                    Clear All Filters
                  </button>
                </div>
              )}
            </main>
          </div>
        </div>
      </section>

      {/* Backdrop for mobile filter */}
      {showFilters && (
        <div 
          className="filter-backdrop d-lg-none"
          onClick={() => setShowFilters(false)}
        ></div>
      )}

    </>
  );
};

export default Products;