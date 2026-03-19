// src/pages/About.jsx
import "../css/About.css";
import { useEffect, useState } from "react";

const About = () => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(true);
  }, []);

  // ALL IMAGES FROM YOUR REAL FOLDER — NO IMPORTS!
  const featuredProducts = [
    {
      id: 1,
      image: "../src/assets/doll.png",
      title: "Rainbow Rose Bouquet",
      price: 799,
      category: "Preserved Flowers",
    },
    {
      id: 2,
      image: "../src/assets/doll2.png",
      title: "24K Gold Dipped Rose",
      price: 1299,
      category: "Luxury Gifts",
    },
    {
      id: 3,
      image: "../src/assets/doll3.png",
      title: "Crochet Hello Kitty",
      price: 100,
      category: "Crochet Gifts",
    },
    {
      id: 4,
      image: "../src/assets/doll6.png",
      title: "Crochet Couple Dolls",
      price: 300,
      category: "Crochet Gifts",
    },
    {
      id: 5,
      image: "../src/assets/flower.png",
      title: "Giant Fuzzy Crochet Rose",
      price: 250,
      category: "Preserved Flowers",
    },
    {
      id: 6,
      image: "../src/assets/flower2.png",
      title: "Deluxe Fuzzy Crochet Rose",
      price: 400,
      category: "Preserved Flowers",
    },
    {
      id: 7,
      image: "../src/assets/doll4.png",
      title: "Crochet Corpse Bride",
      price: 150,
      category: "Crochet Gifts",
    },
    {
      id: 8,
      image: "../src/assets/doll2.png",
      title: "Handmade Crochet Bunny",
      price: 120,
      category: "Crochet Gifts",
    },
  ];

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

          <div className={`bento-grid ${loaded ? "loaded" : ""}`}>
            {featuredProducts.map((product, index) => (
              <div
                key={product.id}
                className={`bento-item bento-${index + 1}`}
                style={{
                  backgroundImage: `url(${product.image})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <div className="bento-overlay">
                  <h3>{product.title}</h3>
                  <p>₱{product.price.toLocaleString()}</p>
                  <span className="bento-tag">
                    {product.category.includes("Crochet") ? "Crochet" : "Bouquet"}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="bento-cta">
            <a href="/products" className="btn-primary">
              Explore All Creations
            </a>
          </div>
        </div>
      </section>
    </>
  );
};

export default About;