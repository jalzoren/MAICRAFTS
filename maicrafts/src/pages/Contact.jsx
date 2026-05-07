import "../css/Contact.css";
import {
  FaInstagram,
  FaFacebookF,
  FaTiktok,
  FaEnvelope,
  FaPhoneAlt,
  FaMapMarkerAlt,
} from "react-icons/fa";

const Contact = () => {
  // Social media and contact links
  const contactLinks = {
    instagram: "https://instagram.com/maicrafts.ph",
    facebook: "https://facebook.com/maicrafts.ph",
    tiktok: "https://tiktok.com/@maicrafts.ph_",
    email: "mailto:maicrafts.ph@gmail.com",
    phone: "tel:+639771791089",
    maps: "https://maps.google.com/?q=123+Orchid+St.,+Villa+Eusebio,+San+Miguel,+Pasig+City,+Philippines",
  };

  const handleSocialClick = (e, url) => {
    e.preventDefault();
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleEmailClick = (e) => {
    e.preventDefault();
    window.location.href = contactLinks.email;
  };

  const handlePhoneClick = (e) => {
    e.preventDefault();
    window.location.href = contactLinks.phone;
  };

  const handleMapsClick = (e) => {
    e.preventDefault();
    window.open(contactLinks.maps, "_blank", "noopener,noreferrer");
  };

  return (
    <div>
      <section className="contact-section">
        <h2>Contact Us</h2>

        <p className="contact-paragraph">
          For inquiries, custom orders, collaborations, or product requests,
          feel free to reach out to us anytime through our official social
          media pages or send us a message. We're always happy to assist you.
        </p>

        {/* 2 Columns × 3 Rows Grid */}
        <div className="contact-grid">
          {/* Instagram */}
          <div 
            className="contact-card clickable" 
            onClick={(e) => handleSocialClick(e, contactLinks.instagram)}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                handleSocialClick(e, contactLinks.instagram);
              }
            }}
          >
            <FaInstagram className="icon" />
            <span>@maicrafts.ph</span>
          </div>

          {/* Email */}
          <div 
            className="contact-card clickable" 
            onClick={handleEmailClick}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                handleEmailClick(e);
              }
            }}
          >
            <FaEnvelope className="icon" />
            <span>maicrafts.ph@gmail.com</span>
          </div>

          {/* Facebook */}
          <div 
            className="contact-card clickable" 
            onClick={(e) => handleSocialClick(e, contactLinks.facebook)}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                handleSocialClick(e, contactLinks.facebook);
              }
            }}
          >
            <FaFacebookF className="icon" />
            <span>maicrafts.ph</span>
          </div>

          {/* Phone */}
          <div 
            className="contact-card clickable" 
            onClick={handlePhoneClick}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                handlePhoneClick(e);
              }
            }}
          >
            <FaPhoneAlt className="icon" />
            <span>0977 179 1089</span>
          </div>

          {/* TikTok */}
          <div 
            className="contact-card clickable" 
            onClick={(e) => handleSocialClick(e, contactLinks.tiktok)}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                handleSocialClick(e, contactLinks.tiktok);
              }
            }}
          >
            <FaTiktok className="icon" />
            <span>@maicrafts.ph_</span>
          </div>

          {/* Maps Location */}
          <div 
            className="contact-card clickable" 
            onClick={handleMapsClick}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                handleMapsClick(e);
              }
            }}
          >
            <FaMapMarkerAlt className="icon" />
            <span>
              123 Orchid St., Villa Eusebio, San Miguel, Pasig City, Philippines
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;