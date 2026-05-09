import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import EditProfileModal from "../../components/sellercomponents/EditProfileModal";
import PayoutDetailsModal from "../../components/sellercomponents/PayoutDetailsModal";
import "../../css/SellerProfile.css";

const buildDisplayName = (user) => {
	if (!user) return "Seller";
	if (user.name) return user.name;
	if (user.full_name) return user.full_name;

	const first = user.firstName || user.first_name;
	const last = user.lastName || user.last_name;
	const combined = [first, last].filter(Boolean).join(" ");
	if (combined) return combined;

	return user.email || "Seller";
};

const getInitials = (label) => {
	if (!label) return "S";
	const parts = label.trim().split(/\s+/).filter(Boolean);
	const initials = parts.map((part) => part[0]).join("");
	return initials.slice(0, 2).toUpperCase();
};

const SellerProfile = () => {
	const { user, refreshUser } = useAuth();
	const displayName = buildDisplayName(user);
	const initials = getInitials(displayName);
	const avatarUrl = user?.avatar || user?.profile_url;
	const emailValue = user?.email || "";
	const phoneValue = user?.phone || user?.contact_number || "";
	const hasContact = Boolean(emailValue || phoneValue);
	const [isEditOpen, setIsEditOpen] = useState(false);
	const [isPayoutOpen, setIsPayoutOpen] = useState(false);

	const openEditModal = () => {
		setIsEditOpen(true);
	};

	const closeEditModal = () => {
		setIsEditOpen(false);
	};

	const openPayoutModal = () => {
		setIsPayoutOpen(true);
	};

	const closePayoutModal = () => {
		setIsPayoutOpen(false);
	};
	
	const handleProfileUpdate = () => {
		// Refresh user data in context
		if (refreshUser) {
			refreshUser();
		}
	};

	return (
		<div className="seller-profile">
			<div className="sp-header">
				<div className="sp-header-content">
					<div className="sp-avatar" aria-hidden="true">
						{avatarUrl ? (
							<img src={avatarUrl} alt={displayName} />
						) : (
							<span className="sp-avatar-initials">{initials}</span>
						)}
					</div>
					<div className="sp-identity">
						<span className="sp-eyebrow">My Profile</span>
						<h1 className="sp-name">{displayName}</h1>
						{hasContact && (
							<div className="sp-contact">
								{emailValue && <span className="sp-contact-item">{emailValue}</span>}
								{emailValue && phoneValue && (
									<span className="sp-contact-divider" aria-hidden="true">•</span>
								)}
								{phoneValue && <span className="sp-contact-item">{phoneValue}</span>}
							</div>
						)}
					</div>
					<div className="sp-header-actions">
						<button className="sp-btn sp-btn--ghost" type="button" onClick={openEditModal}>Edit Profile</button>
					</div>
				</div>
			</div>

			<div className="sp-grid">
				<div className="sp-stack">
					<section className="sp-card" style={{ "--i": 4 }}>
						<div className="sp-card-header">
							<h2 className="sp-card-title">Payout Information</h2>
							<span className="sp-card-subtitle">This is where you receive your earnings</span>
						</div>
						<div className="sp-card-body">
							<div className="sp-field">
								<span className="sp-field-label">E-Wallet</span>
								<span className="sp-field-value">Gcash, Maya</span>
							</div>
							<div className="sp-field">
								<span className="sp-field-label">Account Number</span>
								<span className="sp-field-value">*******4821</span>
							</div>
							<button className="sp-link-btn" type="button" onClick={openPayoutModal}>Update payout details</button>
						</div>
					</section>

				</div>
			</div>

			<EditProfileModal
				isOpen={isEditOpen}
				onClose={closeEditModal}
				user={user}
				onProfileUpdate={handleProfileUpdate}
			/>

			<PayoutDetailsModal
				isOpen={isPayoutOpen}
				onClose={closePayoutModal}
			/>
		</div>
	);
};

export default SellerProfile;