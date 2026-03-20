import express from 'express';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import supabase from '../supabaseClient.js';

const router = express.Router();
const tempSetup = {};

// Login endpoint
router.post("/", async (req, res) => {
  console.log("\n=========================================");
  console.log("📥 Login attempt received");
  console.log("Request body:", req.body);
  const { username, password } = req.body;

  try {
    // Use Supabase Auth to verify password
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: username,
      password: password,
    });

    if (authError) {
      console.log("❌ Invalid credentials for:", username);
      return res.status(401).json({ message: "Invalid email or password" });
    }

    console.log("✅ Credentials valid for:", username);

    // Get user from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', username)
      .single();

    // If 2FA is already enabled
    if (user && user.is_2fa_enabled === true && user.secret_key) {
      console.log("🔐 User has existing 2FA setup");
      
      // Store the existing secret for OTP verification
      tempSetup[username] = user.secret_key;
      
      return res.json({ 
        requiresOTP: true,
        isSetup: false,
        message: "Enter your Google Authenticator code"
      });
    } 
    // First time - setup 2FA
    else {
      console.log("🆕 First time user - generating QR code");
      const secret = speakeasy.generateSecret({
        name: `MAICRAFTS (${username})`
      });
      
      tempSetup[username] = secret.base32;
      console.log("🔑 Generated secret:", secret.base32);
      
      const qrCode = await QRCode.toDataURL(secret.otpauth_url);
      console.log("📱 QR Code generated");
      
      res.json({
        requiresOTP: true,
        isSetup: true,
        qrCode: qrCode,
        message: "Scan this QR code with Google Authenticator"
      });
    }
    
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
  console.log("=========================================\n");
});

// Verify OTP endpoint - STRICT MODE (only current 30-second window)
router.post("/verify-otp", async (req, res) => {
  console.log("\n=========================================");
  console.log("🔍🔍🔍 OTP VERIFICATION RECEIVED 🔍🔍🔍");
  console.log("Request body:", req.body);
  
  const { username, otp } = req.body;

  // Get the secret from temp storage
  const secret = tempSetup[username];
  
  if (!secret) {
    console.log("❌ No session found for user:", username);
    return res.status(400).json({ message: "No OTP session found. Please login again." });
  }

  // Check if this is setup or login
  const { data: user } = await supabase
    .from('users')
    .select('is_2fa_enabled')
    .eq('email', username)
    .single();
  
  const isSetup = !(user && user.is_2fa_enabled);
  console.log("Is setup mode:", isSetup);

  // Log current time
  const now = new Date();
  console.log("Current Time:", now.toLocaleString("en-PH", { timeZone: "Asia/Manila" }));
  
  // Calculate expected OTP for current window
  const currentOTP = speakeasy.totp({
    secret: secret,
    encoding: 'base32',
    step: 30
  });
  
  console.log("Current expected OTP:", currentOTP);
  console.log("User entered OTP:", otp);
  
  // STRICT VERIFICATION - Only current window (window: 0)
  const verified = speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: otp,
    window: 0  // 0 = only current 30-second window, no drift allowed
  });

  console.log("Verification result:", verified ? "✅ SUCCESS" : "❌ FAILED");

  if (!verified) {
    console.log("❌ OTP rejected - invalid or expired");
    console.log("=========================================");
    return res.status(400).json({ 
      message: "Invalid or expired OTP code. Please try again." 
    });
  }

  console.log("✅ OTP verified successfully!");

  // If this is setup mode, save to database
  if (isSetup) {
    console.log("💾 Saving secret permanently for user:", username);
    
    const { data: updateData, error: updateError } = await supabase
      .from('users')
      .update({ 
        secret_key: secret,
        is_2fa_enabled: true,
        two_fa_enabled_at: new Date().toISOString()
      })
      .eq('email', username)
      .select();

    if (updateError) {
      console.error("❌ Error saving secret:", updateError);
      return res.status(500).json({ 
        message: "Failed to save 2FA configuration",
        error: updateError.message
      });
    }
    
    console.log("✅ Setup complete for:", username);
    delete tempSetup[username];
    console.log("=========================================");
    
    return res.json({ 
      message: "Setup successful! You can now login with Google Authenticator.",
      setupComplete: true
    });
  }

  // Normal login
  console.log("🎉 Login successful for:", username);
  delete tempSetup[username];
  console.log("=========================================");
  return res.json({ message: "Login successful" });
});

export default router;