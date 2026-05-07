import React, { useEffect, useState } from "react";
import "../../css/EditProfileModal.css";

const getInitialFormValues = (user) => ({
  firstName: user?.firstName || user?.first_name || "",
  lastName: user?.lastName || user?.last_name || "",
  middleName: user?.middleName || user?.middle_name || "",
  email: user?.email || "",
  phone: user?.phone || user?.contact_number || "",
});

const EditProfileModal = ({ isOpen, onClose, user, onSave }) => {
  const [formValues, setFormValues] = useState(() => getInitialFormValues(user));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isOpen) return;
    setFormValues(getInitialFormValues(user));
    setErrors({});
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const nextErrors = {};
    if (!formValues.firstName.trim()) {
      nextErrors.firstName = "First name is required.";
    }
    if (!formValues.lastName.trim()) {
      nextErrors.lastName = "Last name is required.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validateForm()) return;
    if (onSave) {
      onSave(formValues);
    }
    onClose();
  };

  return (
    <div className="ep-modal-overlay" onClick={onClose}>
      <div className="ep-modal" onClick={(event) => event.stopPropagation()}>
        <div className="ep-modal-header">
          <h2 className="ep-modal-title">Edit Profile</h2>
          <button className="ep-modal-close" type="button" onClick={onClose} aria-label="Close">x</button>
        </div>
        <form className="ep-modal-body" onSubmit={handleSubmit}>
          <div className="ep-modal-grid">
            <div className="ep-modal-field ep-modal-field--span-2">
              <label className="ep-modal-label" htmlFor="firstName">First Name *</label>
              <input
                className={`ep-modal-input${errors.firstName ? " ep-modal-input--error" : ""}`}
                type="text"
                id="firstName"
                name="firstName"
                value={formValues.firstName}
                onChange={handleChange}
                placeholder="Enter your first name"
                aria-invalid={Boolean(errors.firstName)}
              />
              {errors.firstName && <span className="ep-modal-error">{errors.firstName}</span>}
            </div>

            <div className="ep-modal-field ep-modal-field--span-2">
              <label className="ep-modal-label" htmlFor="lastName">Last Name *</label>
              <input
                className={`ep-modal-input${errors.lastName ? " ep-modal-input--error" : ""}`}
                type="text"
                id="lastName"
                name="lastName"
                value={formValues.lastName}
                onChange={handleChange}
                placeholder="Enter your last name"
                aria-invalid={Boolean(errors.lastName)}
              />
              {errors.lastName && <span className="ep-modal-error">{errors.lastName}</span>}
            </div>

            <div className="ep-modal-field ep-modal-field--span-2">
              <label className="ep-modal-label" htmlFor="middleName">Middle Name</label>
              <input
                className="ep-modal-input"
                type="text"
                id="middleName"
                name="middleName"
                value={formValues.middleName}
                onChange={handleChange}
                placeholder="Enter your middle name"
              />
            </div>

            <div className="ep-modal-field ep-modal-field--span-4">
              <label className="ep-modal-label" htmlFor="email">Email</label>
              <input
                className="ep-modal-input"
                type="email"
                id="email"
                name="email"
                value={formValues.email}
                readOnly
                aria-readonly="true"
                placeholder="Enter your email"
              />
            </div>

            <div className="ep-modal-field ep-modal-field--span-2">
              <label className="ep-modal-label" htmlFor="phone">Phone Number</label>
              <input
                className="ep-modal-input"
                type="tel"
                id="phone"
                name="phone"
                value={formValues.phone}
                onChange={handleChange}
                placeholder="09XXXXXXXXX"
              />
            </div>
          </div>

          <div className="ep-modal-footer">
            <button className="ep-modal-btn ep-modal-btn--ghost" type="button" onClick={onClose}>Cancel</button>
            <button className="ep-modal-btn" type="submit">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfileModal;
