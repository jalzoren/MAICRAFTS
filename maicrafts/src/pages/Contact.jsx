import "../css/Contact.css";
import {
  FaInstagram,
  FaFacebookF,
  FaTiktok,
  FaEnvelope,
  FaPhoneAlt,
  FaMapMarkerAlt,
} from "react-icons/fa";
import FloatingCart from "../components/FloatingCart.jsx";

const Contact = () => {
  return (
    
    <div>

    <section className="contact-section">
      <h2>Contact Us</h2>

      <p className="contact-paragraph">
        For inquiries, custom orders, collaborations, or product requests,
        feel free to reach out to us anytime through our official social
        media pages or send us a message. We’re always happy to assist you.
      </p>

      {/* 2 Columns × 3 Rows Grid */}
      <div className="contact-grid">
        <div className="contact-card">
          <FaInstagram className="icon" />
          <span>maicrafts.ph</span>
        </div>
        <div className="contact-card">
          <FaEnvelope className="icon" />
          <span>maicrafts.ph@gmail.com</span>
        </div>
        <div className="contact-card">
          <FaFacebookF className="icon" />
          <span>maicrafts.ph</span>
        </div>
        <div className="contact-card">
          <FaPhoneAlt className="icon" />
          <span>09771791089</span>
        </div>
        <div className="contact-card">
          <FaTiktok className="icon" />
          <span>maicrafts.ph_</span>
        </div>
        <div className="contact-card">
          <FaMapMarkerAlt className="icon" />
          <span>
            123 Orchid St., Villa Eusebio, San Miguel, Pasig City,
            Philippines
          </span>
        </div>
      </div>

      {/* Gallery Placeholder */}
      <div className="work-gallery1">
        <span>Gallery / Projects Placeholder</span>
      </div>

    </section>

    </div>
  );
};

export default Contact;
