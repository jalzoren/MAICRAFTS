// login.js - COMPLETE & FIXED
import express from 'express';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import supabase from '../supabaseClient.js';

const router = express.Router();
const tempSetup = {};

// -------------------------
// LOGIN ENDPOINT
// -------------------------
router.post("/", async (req, res) => {
  const username = req.body.username?.trim().toLowerCase();
  const password = req.body.password?.trim();

  if (!username || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: username,
      password: password,
    });

    if (authError || !authData?.user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (userError || !user) {
      console.error('User profile missing for ID:', authData.user.id);
      return res.status(500).json({ message: "User profile missing" });
    }

    if (!user.is_verified) {
      return res.status(403).json({
        message: "Please verify your email address first. Check your email for the verification link.",
        requiresVerification: true
      });
    }

    if (user.is_2fa_enabled && user.secret_key) {
      tempSetup[username] = user.secret_key;
      return res.json({
        requiresOTP: true,
        isSetup: false,
        message: "Enter your Google Authenticator code",
      });
    }

    const secret = speakeasy.generateSecret({ name: `MAICRAFTS (${username})` });
    tempSetup[username] = secret.base32;
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      requiresOTP: true,
      isSetup: true,
      qrCode: qrCode,
      message: "Scan this QR code with Google Authenticator",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// -------------------------
// VERIFY OTP ENDPOINT
// -------------------------
router.post("/verify-otp", async (req, res) => {
  const username = req.body.username?.trim().toLowerCase();
  const otp = req.body.otp?.trim();

  if (!username || !otp) {
    return res.status(400).json({ message: "Username and OTP are required" });
  }

  const secret = tempSetup[username];
  if (!secret) {
    return res.status(400).json({ message: "No OTP session found. Please login again." });
  }

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('is_2fa_enabled, is_verified, role')
    .eq('email', username)
    .single();

  if (userError || !user) {
    return res.status(500).json({ message: "User fetch failed" });
  }

  if (!user.is_verified) {
    return res.status(403).json({ message: "Please verify your email first" });
  }

  const isSetup = !(user.is_2fa_enabled);
  
  // First, verify with window: 0
  let verified = speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: otp,
    window: 0,
  });

  // If not verified, check if it's a time sync issue
  if (!verified) {
    // Try with window 1 to see if code is valid but slightly delayed
    const checkWithWindow = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: otp,
      window: 1,
    });

    if (checkWithWindow) {
      // Code is valid but has time drift
      return res.status(400).json({ 
        message: "Code expired. Please generate a NEW code in Google Authenticator and try again immediately.",
        hint: "The code you entered was valid but submitted too late. Open Google Authenticator and enter the CURRENT 6-digit code."
      });
    } else {
      // Completely invalid code
      return res.status(400).json({ 
        message: "Invalid OTP code. Please check your Google Authenticator and enter the correct 6-digit code.",
        hint: "Make sure you're entering the current code from Google Authenticator"
      });
    }
  }

  if (isSetup) {
    const { error: updateError } = await supabase
      .from('users')
      .update({
        secret_key: secret,
        is_2fa_enabled: true,
        two_fa_enabled_at: new Date().toISOString(),
      })
      .eq('email', username);

    if (updateError) {
      return res.status(500).json({ message: "Failed to save 2FA secret", error: updateError.message });
    }
    delete tempSetup[username];

    const { data: userData } = await supabase
      .from('users')
      .select('id, first_name, last_name, middle_name, email, contact_number, role')
      .eq('email', username)
      .single();

    return res.json({
      message: "Setup successful! Google Authenticator is now connected.",
      setupComplete: true,
      user: _buildUserPayload(userData),
    });
  }

  delete tempSetup[username];
  const { data: userData } = await supabase
    .from('users')
    .select('id, first_name, last_name, middle_name, email, contact_number, role')
    .eq('email', username)
    .single();

  res.json({
    message: "Login successful",
    user: _buildUserPayload(userData),
  });
});

// Helper: builds consistent user object with role
function _buildUserPayload(userData) {
  if (!userData) return null;
  return {
    id:        userData.id,
    name:      [userData.first_name, userData.last_name].filter(Boolean).join(" ") || null,
    firstName: userData.first_name || null,
    lastName:  userData.last_name || null,
    email:     userData.email,
    phone:     userData.contact_number || null,
    avatar:    userData.profile_url || null,
    role:      userData.role || "customer",
  };
}

export default router;