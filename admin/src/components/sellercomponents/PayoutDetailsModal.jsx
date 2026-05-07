import React, { useEffect, useState } from "react";
import "../../css/PayoutDetailsModal.css";

const payoutOptions = [
  { value: "", label: "Select e-wallet" },
  { value: "Gcash", label: "Gcash" },
  { value: "Maya", label: "Maya" },
];

const PayoutDetailsModal = ({ isOpen, onClose, onSave, initialValues }) => {
  const [formValues, setFormValues] = useState({
    wallet: initialValues?.wallet || "",
    accountNumber: initialValues?.accountNumber || "",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isOpen) return;
    setFormValues({
      wallet: initialValues?.wallet || "",
      accountNumber: initialValues?.accountNumber || "",
    });
    setErrors({});
  }, [isOpen, initialValues]);

  if (!isOpen) return null;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const nextErrors = {};
    if (!formValues.wallet) {
      nextErrors.wallet = "Please select an e-wallet.";
    }
    if (!formValues.accountNumber.trim()) {
      nextErrors.accountNumber = "Account number is required.";
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
    <div className="pd-modal-overlay" onClick={onClose}>
      <div className="pd-modal" onClick={(event) => event.stopPropagation()}>
        <div className="pd-modal-header">
          <h2 className="pd-modal-title">Update Payout Details</h2>
          <button className="pd-modal-close" type="button" onClick={onClose} aria-label="Close">x</button>
        </div>
        <form className="pd-modal-body" onSubmit={handleSubmit}>
          <div className="pd-modal-grid">
            <div className="pd-modal-field pd-modal-field--span-2">
              <label className="pd-modal-label" htmlFor="wallet">E-Wallet *</label>
              <select
                className={`pd-modal-input${errors.wallet ? " pd-modal-input--error" : ""}`}
                id="wallet"
                name="wallet"
                value={formValues.wallet}
                onChange={handleChange}
                aria-invalid={Boolean(errors.wallet)}
              >
                {payoutOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.wallet && <span className="pd-modal-error">{errors.wallet}</span>}
            </div>

            <div className="pd-modal-field pd-modal-field--span-4">
              <label className="pd-modal-label" htmlFor="accountNumber">Account Number *</label>
              <input
                className={`pd-modal-input${errors.accountNumber ? " pd-modal-input--error" : ""}`}
                type="text"
                id="accountNumber"
                name="accountNumber"
                value={formValues.accountNumber}
                onChange={handleChange}
                placeholder="Enter your account number"
                aria-invalid={Boolean(errors.accountNumber)}
              />
              {errors.accountNumber && <span className="pd-modal-error">{errors.accountNumber}</span>}
            </div>
          </div>

          <div className="pd-modal-footer">
            <button className="pd-modal-btn pd-modal-btn--ghost" type="button" onClick={onClose}>Cancel</button>
            <button className="pd-modal-btn" type="submit">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PayoutDetailsModal;
