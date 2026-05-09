import React, { useState, useEffect } from "react";
import "../../css/EditProfileModal.css";

const getAuthHeaders = () => {
	try {
		const sessionData = sessionStorage.getItem('mc_session');
		if (!sessionData) return {};
		
		const session = JSON.parse(sessionData);
		const token = session.user?.access_token;
		
		if (!token) {
			console.warn('No access token found in session');
			return {};
		}
		
		return {
			'Authorization': `Bearer ${token}`,
			'Content-Type': 'application/json'
		};
	} catch (error) {
		console.error('Error getting auth headers:', error);
		return {};
	}
};

const API_BASE_URL = window.env?.REACT_APP_API_URL || 'http://localhost:5000/api';

const EditProfileModal = ({ isOpen, onClose, user, onProfileUpdate }) => {
	const [activeTab, setActiveTab] = useState("profile");
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState({ type: "", text: "" });
	
	// Personal Information State
	const [personalInfo, setPersonalInfo] = useState({
		first_name: "",
		last_name: "",
		middle_name: "",
		contact_number: "",
		email: ""
	});
	
	// Password Change State
	const [passwordData, setPasswordData] = useState({
		current_password: "",
		new_password: "",
		confirm_password: ""
	});
	
	// Password validation state
	const [passwordValidation, setPasswordValidation] = useState({
		length: false,
		uppercase: false,
		lowercase: false,
		number: false,
		special: false
	});

	// Fetch user profile when modal opens
	useEffect(() => {
		if (isOpen && user?.id) {
			fetchUserProfile();
		}
	}, [isOpen, user?.id]);

	const fetchUserProfile = async () => {
		try {
			setLoading(true);
			const headers = getAuthHeaders();
			const response = await fetch(`${API_BASE_URL}/users/${user.id}`, {
				method: 'GET',
				headers: headers
			});

			if (!response.ok) {
				throw new Error('Failed to fetch user profile');
			}

			const data = await response.json();
			if (data.user) {
				setPersonalInfo({
					first_name: data.user.first_name || "",
					last_name: data.user.last_name || "",
					middle_name: data.user.middle_name || "",
					contact_number: data.user.contact_number || "",
					email: data.user.email || user.email || ""
				});
			}
		} catch (error) {
			console.error('Error fetching profile:', error);
		} finally {
			setLoading(false);
		}
	};

	const handlePersonalInfoUpdate = async (e) => {
		e.preventDefault();
		setMessage({ type: "", text: "" });
		
		try {
			setLoading(true);
			const headers = getAuthHeaders();
			const response = await fetch(`${API_BASE_URL}/users/${user.id}`, {
				method: 'PUT',
				headers: headers,
				body: JSON.stringify({
					first_name: personalInfo.first_name,
					last_name: personalInfo.last_name,
					middle_name: personalInfo.middle_name,
					contact_number: personalInfo.contact_number
				})
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || 'Failed to update profile');
			}

			const data = await response.json();
			
			setMessage({ type: "success", text: "Profile updated successfully!" });
			
			// Update local storage session with new user data
			const sessionData = sessionStorage.getItem('mc_session');
			if (sessionData) {
				const session = JSON.parse(sessionData);
				session.user = {
					...session.user,
					first_name: personalInfo.first_name,
					last_name: personalInfo.last_name,
					contact_number: personalInfo.contact_number
				};
				sessionStorage.setItem('mc_session', JSON.stringify(session));
			}
			
			// Callback to refresh parent component
			if (onProfileUpdate) {
				onProfileUpdate();
			}
			
			setTimeout(() => {
				setMessage({ type: "", text: "" });
			}, 3000);
			
		} catch (error) {
			console.error('Error updating profile:', error);
			setMessage({ type: "error", text: error.message });
		} finally {
			setLoading(false);
		}
	};

	// Validate password strength
	const validatePassword = (password) => {
		setPasswordValidation({
			length: password.length >= 12,
			uppercase: /[A-Z]/.test(password),
			lowercase: /[a-z]/.test(password),
			number: /\d/.test(password),
			special: /[@$!%*?&]/.test(password)
		});
	};

	const handleNewPasswordChange = (e) => {
		const newPassword = e.target.value;
		setPasswordData({ ...passwordData, new_password: newPassword });
		validatePassword(newPassword);
	};

	const handlePasswordChange = async (e) => {
		e.preventDefault();
		setMessage({ type: "", text: "" });
		
		// Validation
		if (passwordData.new_password !== passwordData.confirm_password) {
			setMessage({ type: "error", text: "New passwords do not match!" });
			return;
		}
		
		// Check all password requirements
		if (!passwordValidation.length || !passwordValidation.uppercase || 
		    !passwordValidation.lowercase || !passwordValidation.number || 
		    !passwordValidation.special) {
			setMessage({ type: "error", text: "Please meet all password requirements!" });
			return;
		}
		
		if (!passwordData.current_password) {
			setMessage({ type: "error", text: "Please enter your current password!" });
			return;
		}

		try {
			setLoading(true);
			const headers = getAuthHeaders();
			
			// FIXED: Changed from /auth/change-password to /change-password
			const response = await fetch(`${API_BASE_URL}/change-password`, {
				method: 'POST',
				headers: headers,
				body: JSON.stringify({
					current_password: passwordData.current_password,
					new_password: passwordData.new_password
				})
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || data.error || 'Failed to change password');
			}

			setMessage({ type: "success", text: "Password changed successfully! Please login again." });
			
			// Clear password fields
			setPasswordData({
				current_password: "",
				new_password: "",
				confirm_password: ""
			});
			
			// Reset validation
			setPasswordValidation({
				length: false,
				uppercase: false,
				lowercase: false,
				number: false,
				special: false
			});
			
			// Close modal after 2 seconds
			setTimeout(() => {
				handleClose();
			}, 2000);
			
		} catch (error) {
			console.error('Error changing password:', error);
			setMessage({ type: "error", text: error.message });
		} finally {
			setLoading(false);
		}
	};

	const resetModal = () => {
		setMessage({ type: "", text: "" });
		setActiveTab("profile");
		setPasswordData({
			current_password: "",
			new_password: "",
			confirm_password: ""
		});
		setPasswordValidation({
			length: false,
			uppercase: false,
			lowercase: false,
			number: false,
			special: false
		});
	};

	const handleClose = () => {
		resetModal();
		onClose();
	};

	if (!isOpen) return null;

	return (
		<div className="modal-overlay" onClick={handleClose}>
			<div className="modal-container" onClick={(e) => e.stopPropagation()}>
				<div className="modal-header">
					<h2>Edit Profile</h2>
					<button className="modal-close" onClick={handleClose}>×</button>
				</div>

				<div className="modal-tabs">
					<button 
						className={`modal-tab ${activeTab === "profile" ? "active" : ""}`}
						onClick={() => setActiveTab("profile")}
					>
						<span className="modal-tab-icon"></span>
						Profile Information
					</button>
					<button 
						className={`modal-tab ${activeTab === "password" ? "active" : ""}`}
						onClick={() => setActiveTab("password")}
					>
						<span className="modal-tab-icon"></span>
						Change Password
					</button>
				</div>

				<div className="modal-body">
					{message.type === "success" && (
						<div className="modal-alert modal-alert-success">{message.text}</div>
					)}
					{message.type === "error" && (
						<div className="modal-alert modal-alert-error">{message.text}</div>
					)}

					{activeTab === "profile" && (
						<form onSubmit={handlePersonalInfoUpdate}>
							<div className="form-group">
								<label>First Name *</label>
								<input
									type="text"
									value={personalInfo.first_name}
									onChange={(e) => setPersonalInfo({...personalInfo, first_name: e.target.value})}
									required
									disabled={loading}
									placeholder="Enter your first name"
								/>
							</div>

							<div className="form-group">
								<label>Middle Name</label>
								<input
									type="text"
									value={personalInfo.middle_name}
									onChange={(e) => setPersonalInfo({...personalInfo, middle_name: e.target.value})}
									disabled={loading}
									placeholder="Enter your middle name"
								/>
							</div>

							<div className="form-group">
								<label>Last Name *</label>
								<input
									type="text"
									value={personalInfo.last_name}
									onChange={(e) => setPersonalInfo({...personalInfo, last_name: e.target.value})}
									required
									disabled={loading}
									placeholder="Enter your last name"
								/>
							</div>

							<div className="form-group">
								<label>Email Address</label>
								<input
									type="email"
									value={personalInfo.email}
									disabled
									className="disabled-input"
								/>
								<small>Email cannot be changed</small>
							</div>

							<div className="form-group">
								<label>Contact Number</label>
								<input
									type="tel"
									value={personalInfo.contact_number}
									onChange={(e) => setPersonalInfo({...personalInfo, contact_number: e.target.value})}
									placeholder="+63 XXX XXX XXXX"
									disabled={loading}
								/>
							</div>

							<div className="modal-actions">
								<button type="button" className="btn-secondary" onClick={handleClose}>
									Cancel
								</button>
								<button type="submit" className="btn-primary" disabled={loading}>
									{loading ? "Saving..." : "Save Changes"}
								</button>
							</div>
						</form>
					)}

					{activeTab === "password" && (
						<form onSubmit={handlePasswordChange}>
							<div className="form-group">
								<label>Current Password *</label>
								<input
									type="password"
									value={passwordData.current_password}
									onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})}
									required
									placeholder="Enter your current password"
									disabled={loading}
								/>
							</div>

							<div className="form-group">
								<label>New Password *</label>
								<input
									type="password"
									value={passwordData.new_password}
									onChange={handleNewPasswordChange}
									required
									placeholder="Enter new password"
									disabled={loading}
								/>
							</div>

							<div className="form-group">
								<label>Confirm New Password *</label>
								<input
									type="password"
									value={passwordData.confirm_password}
									onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})}
									required
									placeholder="Confirm your new password"
									disabled={loading}
								/>
							</div>

							<div className="password-hints">
								<p>Password requirements:</p>
								<ul>
									<li className={passwordValidation.length ? "valid" : "invalid"}>
										{passwordValidation.length ? "✓" : "○"} At least 12 characters
									</li>
									<li className={passwordValidation.uppercase ? "valid" : "invalid"}>
										{passwordValidation.uppercase ? "✓" : "○"} At least 1 uppercase letter
									</li>
									<li className={passwordValidation.lowercase ? "valid" : "invalid"}>
										{passwordValidation.lowercase ? "✓" : "○"} At least 1 lowercase letter
									</li>
									<li className={passwordValidation.number ? "valid" : "invalid"}>
										{passwordValidation.number ? "✓" : "○"} At least 1 number
									</li>
									<li className={passwordValidation.special ? "valid" : "invalid"}>
										{passwordValidation.special ? "✓" : "○"} At least 1 special character (@$!%*?&)
									</li>
								</ul>
							</div>

							<div className="modal-actions">
								<button type="button" className="btn-secondary" onClick={handleClose}>
									Cancel
								</button>
								<button type="submit" className="btn-primary" disabled={loading}>
									{loading ? "Updating..." : "Update Password"}
								</button>
							</div>
						</form>
					)}
				</div>
			</div>
		</div>
	);
};

export default EditProfileModal;