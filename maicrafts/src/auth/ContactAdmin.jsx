import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiUser, FiMail, FiMessageSquare} from "react-icons/fi";
import Swal from "sweetalert2";
import "../auth/css/Signup.css";

const ContactAdmin = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    email: "",
    message: ""
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/api/contact-admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      // ✅ SUCCESS ALERT (fixed)
      Swal.fire({
        icon: "success",
        title: "Request Sent!",
        text: "Your seller access request has been submitted successfully.",
        confirmButtonColor: "#4b2e16"
      }).then(() => {
        navigate("/signup");
      });

    } catch (error) {
      console.error(error);

      // ❌ ERROR ALERT
      Swal.fire({
        icon: "error",
        title: "Failed",
        text: error.message || "Please try again later.",
        confirmButtonColor: "#4b2e16"
      });

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-page">

      {/* Background Video */}
      <video autoPlay muted loop playsInline className="signup-bg-video">
        <source src="/counter1.mp4" type="video/mp4" />
      </video>

      <div className="signup-gradient-overlay"></div>

      <div className="signup-container">
        <div className="signup-wrapper">

          {/* Logo */}
          <div className="logo-section">
            <h1 className="logo">MAICRAFTS</h1>
          </div>

          {/* Title */}
          <h2 className="signup-title">CONTACT ADMIN</h2>
          <p className="signup-subtitle">
            Request access for seller account
          </p>

          {/* FORM */}
          <form className="signup-form" onSubmit={handleSubmit}>

            {/* First Name */}
            <div className="form-group">
              <label className="form-label">First Name</label>
              <div className="input-wrapper">
                <FiUser className="input-icon" />
                <input
                  type="text"
                  name="first_name"
                  placeholder="e.g. Juan"
                  value={form.first_name}
                  onChange={handleChange}
                  className="input-field icon-input"
                  required
                />
              </div>
            </div>

            {/* Middle Name */}
            <div className="form-group">
              <label className="form-label">Middle Name</label>
              <div className="input-wrapper">
                <FiUser className="input-icon" />
                <input
                  type="text"
                  placeholder="e.g. Cruz"
                  name="middle_name"
                  value={form.middle_name}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>
            </div>

            {/* Last Name */}
            <div className="form-group">
              <label className="form-label">Last Name</label>
              <div className="input-wrapper">
              <FiUser className="input-icon" />
                <input
                  type="text"
                  placeholder="e.g. Cruz"
                  name="last_name"
                  value={form.last_name}
                  onChange={handleChange}
                  className="input-field"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-wrapper">
                <FiMail className="input-icon" />
                <input
                  type="email"
                  name="email"
                  placeholder="your@email.com"
                  value={form.email}
                  onChange={handleChange}
                  className="input-field"
                  required
                />
              </div>
            </div>

            {/* Message */}
            <div className="form-group">
              <label className="form-label">Message</label>
              <div className="input-wrapper" style={{ height: "80px" }}>
                <FiMessageSquare className="input-icon" />
                <textarea
                  name="message"
                  placeholder="Why do you need seller/staff access?"
                  value={form.message}
                  onChange={handleChange}
                  className="input-field"
                  style={{
                    resize: "none",
                    paddingTop: "10px",
                    height: "80px"
                  }}
                  required
                />
              </div>
            </div>

            {/* Submit */}
            <button type="submit" className="signup-btn" disabled={loading}>
              {loading ? "Sending..." : "SEND REQUEST"}
            </button>

            {/* Back */}
            <button
              type="button"
              className="back-to-login-btn"
              onClick={() => navigate("/signup")}
            >
              BACK
            </button>

          </form>

        </div>
      </div>
    </div>
  );
};

export default ContactAdmin;