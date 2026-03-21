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
  console.log("\n=========================================");
  console.log("📥 Login attempt received");
  console.log("Request body:", req.body);

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
      console.log("❌ Invalid credentials for:", username);
      return res.status(401).json({ message: "Invalid email or password" });
    }

    console.log("✅ Credentials valid for:", username);

    // 2️⃣ Fetch user profile from public.users
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', username)
      .single();

    if (userError || !user) {
      console.error("❌ User profile not found:", userError);
      return res.status(500).json({ message: "User profile missing" });
    }

    // 3️⃣ Check if 2FA is already enabled
    if (user.is_2fa_enabled && user.secret_key) {
      console.log("🔐 User has existing 2FA setup");
      tempSetup[username] = user.secret_key;

      return res.json({
        requiresOTP: true,
        isSetup: false,
        message: "Enter your Google Authenticator code",
      });
    }

    // 4️⃣ First time 2FA setup
    console.log("🆕 First time user - generating QR code");
    const secret = speakeasy.generateSecret({ name: `MAICRAFTS (${username})` });
    tempSetup[username] = secret.base32;
    console.log("🔑 Generated secret:", secret.base32);

    const qrCode = await QRCode.toDataURL(secret.otpauth_url);
    console.log("📱 QR Code generated");

    res.json({
      requiresOTP: true,
      isSetup: true,
      qrCode: qrCode,
      message: "Scan this QR code with Google Authenticator",
    });

  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }

  console.log("=========================================\n");
});

// -------------------------
// VERIFY OTP ENDPOINT
// -------------------------
router.post("/verify-otp", async (req, res) => {
  console.log("\n=========================================");
  console.log("🔍🔍🔍 OTP VERIFICATION RECEIVED 🔍🔍🔍");
  console.log("Request body:", req.body);

  const username = req.body.username?.trim().toLowerCase();
  const otp = req.body.otp?.trim();

  if (!username || !otp) {
    return res.status(400).json({ message: "Username and OTP are required" });
  }

  // 1️⃣ Get secret from temp storage
  const secret = tempSetup[username];
  if (!secret) {
    console.log("❌ No session found for user:", username);
    return res.status(400).json({ message: "No OTP session found. Please login again." });
  }

  // 2️⃣ Check if setup or login mode
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('is_2fa_enabled')
    .eq('email', username)
    .single();

  if (userError || !user) {
    console.error("❌ User fetch failed:", userError);
    return res.status(500).json({ message: "User fetch failed" });
  }

  const isSetup = !(user.is_2fa_enabled);
  console.log("Is setup mode:", isSetup);

  // 3️⃣ Verify OTP (STRICT mode)
  const verified = speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: otp,
    window: 0, // only current 30-second window
  });

  console.log("Verification result:", verified ? "✅ SUCCESS" : "❌ FAILED");

  if (!verified) {
    return res.status(400).json({ message: "Invalid or expired OTP code. Please try again." });
  }

  // 4️⃣ Save secret if this is first-time setup
  if (isSetup) {
    console.log("💾 Saving secret permanently for user:", username);

    const { error: updateError } = await supabase
      .from('users')
      .update({
        secret_key: secret,
        is_2fa_enabled: true,
        two_fa_enabled_at: new Date().toISOString(),
      })
      .eq('email', username);

    if (updateError) {
      console.error("❌ Error saving 2FA secret:", updateError);
      return res.status(500).json({ message: "Failed to save 2FA secret", error: updateError.message });
    }

    delete tempSetup[username];
    console.log("✅ 2FA setup complete for:", username);

    return res.json({
      message: "Setup successful! You can now login with Google Authenticator.",
      setupComplete: true,
    });
  }

  // 5️⃣ Normal login
  delete tempSetup[username];
  console.log("🎉 Login successful for:", username);

  res.json({ message: "Login successful" });
  console.log("=========================================\n");
});

export default router;