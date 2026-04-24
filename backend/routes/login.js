// login.js
import express from 'express';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import supabase from '../supabaseClient.js';

const router = express.Router();
const tempSetup = {}; // temporary storage for 2FA secrets

// -------------------------
// LOGIN ENDPOINT
// -------------------------
router.post("/", async (req, res) => {
  // Trim and normalize inputs
  const username = req.body.username?.trim().toLowerCase();
  const password = req.body.password?.trim();

  if (!username || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    // 1️⃣ Authenticate using Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: username,
      password: password,
    });

    if (authError || !authData?.user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // 2️⃣ Fetch user profile from public.users
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', username)
      .single();

    if (userError || !user) {
      return res.status(500).json({ message: "User profile missing" });
    }

    // 3️⃣ CHECK IF USER IS VERIFIED - ONLY PREVENT UNVERIFIED USERS
    if (!user.is_verified) {
      return res.status(403).json({ 
        message: "Please verify your email address first. Check your email for the verification link.",
        requiresVerification: true
      });
    }

    // 4️⃣ Check if 2FA is already enabled
    if (user.is_2fa_enabled && user.secret_key) {
      tempSetup[username] = user.secret_key;

      return res.json({
        requiresOTP: true,
        isSetup: false,
        message: "Enter your Google Authenticator code",
      });
    }

    // 5️⃣ First time 2FA setup (for verified users with no 2FA)
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

  // 1️⃣ Get secret from temp storage
  const secret = tempSetup[username];
  if (!secret) {
    return res.status(400).json({ message: "No OTP session found. Please login again." });
  }

  // 2️⃣ Check if setup or login mode and verify user is verified
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('is_2fa_enabled, is_verified')
    .eq('email', username)
    .single();

  if (userError || !user) {
    return res.status(500).json({ message: "User fetch failed" });
  }

  // Double-check user is verified
  if (!user.is_verified) {
    return res.status(403).json({ 
      message: "Please verify your email first" 
    });
  }

  const isSetup = !(user.is_2fa_enabled);

  // 3️⃣ Verify OTP (STRICT mode - window 0)
  const verified = speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: otp,
    window: 0, // only current 30-second window
  });

  if (!verified) {
    return res.status(400).json({ message: "Invalid or expired OTP code. Please try again." });
  }

  // 4️⃣ Save secret if this is first-time setup
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

    // FETCH AND RETURN user data after setup
    const { data: userData } = await supabase
      .from('users')
      .select('id, first_name, last_name, middle_name, email, contact_number')
      .eq('email', username)
      .single();

    return res.json({
      message: "Setup successful! Google Authenticator is now connected.",
      setupComplete: true,
      user: _buildUserPayload(userData),
    });
  }

  // 5️⃣ Normal login — fetch and return user data
  delete tempSetup[username];

  const { data: userData } = await supabase
    .from('users')
    .select('id, first_name, last_name, middle_name, email, contact_number')
    .eq('email', username)
    .single();

  res.json({
    message: "Login successful",
    user: _buildUserPayload(userData),
  });
});

// ─────────────────────────────
// Helper: shape the user object
// ─────────────────────────────
function _buildUserPayload(userData) {
  if (!userData) return null;
  return {
    id:        userData.id,
    name:      [userData.first_name, userData.last_name].filter(Boolean).join(" ") || null,
    firstName: userData.first_name || null,
    lastName:  userData.last_name || null,
    email:     userData.email,
    phone:     userData.contact_number || null,
    avatar:    null, 
  };
}

export default router;