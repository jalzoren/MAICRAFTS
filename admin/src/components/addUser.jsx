import React, { useState, useEffect } from "react";
import { MdVisibility, MdVisibilityOff } from "react-icons/md";
import Swal from 'sweetalert2';
import "./AddUserModal.css";


function AddUser({ onClose, onUserAdded, requestData }) {
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const toUpperCase = (str) => str.toUpperCase();

  const handleLastNameChange = (e) => setLastName(toUpperCase(e.target.value));
  const handleFirstNameChange = (e) => setFirstName(toUpperCase(e.target.value));
  const handleMiddleNameChange = (e) => setMiddleName(toUpperCase(e.target.value));

  const validateForm = () => {
    if (!lastName || !firstName || !email || !role || !password || !confirmPassword) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Please fill in all required fields',
        confirmButtonColor: '#3085d6'
      });
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Email',
        text: 'Please enter a valid email address',
        confirmButtonColor: '#3085d6'
      });
      return false;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      Swal.fire({
        icon: 'warning',
        title: 'Weak Password',
        text: 'Password must contain at least 8 characters, one uppercase, one lowercase, one number and one special character',
        confirmButtonColor: '#3085d6'
      });
      return false;
    }

    if (password !== confirmPassword) {
      Swal.fire({
        icon: 'warning',
        title: 'Password Mismatch',
        text: 'Passwords do not match',
        confirmButtonColor: '#3085d6'
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const result = await Swal.fire({
      title: 'Confirm Add User',
      text: 'Are you sure you want to add this user?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, add it!',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    setLoading(true);

    const newUser = {
      firstName,
      lastName,
      middleName,
      email,
      role,
      password
    };

    try {
      Swal.fire({
        title: 'Creating User...',
        text: 'Please wait',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading()
      });

      const response = await fetch('http://localhost:5000/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to create user');

      Swal.close();
      await Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: 'User has been created successfully.',
        timer: 2000,
        showConfirmButton: false
      });

      onUserAdded(data);
      onClose();
    } catch (err) {
      console.error('Error creating user:', err);
      Swal.close();
      Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: err.message || 'Failed to create user. Please try again.',
        confirmButtonColor: '#3085d6'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (lastName || firstName || email || role || password || confirmPassword || middleName) {
      Swal.fire({
        title: 'Discard Changes?',
        text: 'You have unsaved changes. Are you sure you want to close?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, discard',
        cancelButtonText: 'Stay'
      }).then((result) => {
        if (result.isConfirmed) onClose();
      });
    } else {
      onClose();
    }
  };

  useEffect(() => {
    if (requestData) {
      setFirstName(requestData.first_name || "");
      setMiddleName(requestData.middle_name || "");
      setLastName(requestData.last_name || "");
      setEmail(requestData.email || "");
  
      // FORCE ROLE = seller
      setRole("seller");
  
      // OPTIONAL: auto-focus behavior can be added later
    }
  }, [requestData]);

  return (
    <div className="popup-overlay" onClick={handleCancel}>
      <div className="register-container" onClick={(e) => e.stopPropagation()}>
        <div className="register-header">
          <span className="register-text">ADD NEW USER</span>
          <span className="register-close-btn" onClick={handleCancel}>✕</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="register-form">
            <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '20px' }}>
              * Required fields (First and Last names will be UPPERCASE, email lowercase)
            </div>

            {/* Row 1 - Last Name & First Name */}
            <div className="form-row">
              <div className="input-group">
                <label>First Name <span className="required">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. JUAN"
                  value={firstName}
                  onChange={handleFirstNameChange}
                  style={{ textTransform: 'uppercase' }}
                  required
                />
              </div>

              <div className="input-group">
                <label>Last Name <span className="required">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. DELA CRUZ"
                  value={lastName}
                  onChange={handleLastNameChange}
                  style={{ textTransform: 'uppercase' }}
                  required
                />
              </div>
            </div>

            {/* Row 2 - Middle Name & Email */}
            <div className="form-row">
              <div className="input-group">
                <label>Middle Name</label>
                <input
                  type="text"
                  placeholder="e.g. SMITH"
                  value={middleName}
                  onChange={handleMiddleNameChange}
                  style={{ textTransform: 'uppercase' }}
                />
              </div>

              <div className="input-group">
                <label>Email <span className="required">*</span></label>
                <input
                  type="email"
                  placeholder="e.g user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ textTransform: 'lowercase' }}
                  required
                />
              </div>
            </div>

            {/* Row 3 - Role */}
            <div className="form-row">
              <div className="input-group">
                <label>Role <span className="required">*</span></label>
                <select value={role} onChange={(e) => setRole(e.target.value)} required>
                  <option value="">Select Role</option>
                  <option value="seller">Seller</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
            </div>

            {/* Row 4 - Password Fields */}
            <div className="form-row">
              <div className="input-group">
                <label>Password <span className="required">*</span></label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                  <button 
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <MdVisibilityOff /> : <MdVisibility />}
                  </button>
                </div>
                <small className="helper-text">
                  8+ chars, 1 uppercase, 1 lowercase, 1 number, 1 special
                </small>
              </div>

              <div className="input-group">
                <label>Confirm Password <span className="required">*</span></label>
                <div className="password-input-wrapper">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                  <button 
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <MdVisibilityOff /> : <MdVisibility />}
                  </button>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="form-actions">
              <button
                type="button"
                className="btn cancel"
                onClick={handleCancel}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn add"
                disabled={loading}
              >
                {loading ? 'Adding...' : 'Add User'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddUser;