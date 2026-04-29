// login.js - MODIFIED to fetch fresh settings each time
import express from 'express';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import supabase from '../supabaseClient.js';

const router = express.Router();
const tempSetup = {};

// Remove the global variables and loadLoginSettings function
// Instead, create a function that fetches fresh settings

async function getCurrentSettings() {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'login_attempts')
      .single();
    
    if (data && data.setting_value) {
      return {
        maxAttempts: data.setting_value.maxAttempts || 3,
        lockoutMinutes: data.setting_value.lockoutDurationMinutes || 30
      };
    }
  } catch (err) {
    console.log('Using default settings');
  }
  return { maxAttempts: 3, lockoutMinutes: 30 };
}

// Helper: Get or create login attempt record
async function getLoginAttempts(email) {
  const { data, error } = await supabase
    .from('login_attempts')
    .select('*')
    .eq('email', email)
    .single();
  
  if (error && error.code === 'PGRST116') {
    const { data: newData, error: insertError } = await supabase
      .from('login_attempts')
      .insert([{ 
        email, 
        attempt_count: 0,
        is_locked: false,
        locked_until: null
      }])
      .select()
      .single();
    
    if (insertError) throw insertError;
    return newData;
  }
  
  if (error) throw error;
  return data;
}

// Helper: Reset login attempts
async function resetLoginAttempts(email) {
  const { error } = await supabase
    .from('login_attempts')
    .update({ 
      attempt_count: 0, 
      is_locked: false, 
      locked_until: null,
      updated_at: new Date().toISOString()
    })
    .eq('email', email);
  
  if (error) throw error;
}

// Helper: Increment failed attempts - FIXED
async function incrementFailedAttempts(email, MAX_ATTEMPTS, LOCKOUT_MINUTES) {
  const record = await getLoginAttempts(email);
  
  if (record.is_locked && record.locked_until) {
    const now = new Date();
    const lockExpiry = new Date(record.locked_until);
    
    if (now < lockExpiry) {
      const minutesLeft = Math.ceil((lockExpiry - now) / 1000 / 60);
      return { 
        isLocked: true, 
        minutesLeft,
        message: `Account locked. Try again in ${minutesLeft} minute(s).`
      };
    } else {
      await resetLoginAttempts(email);
      return { isLocked: false };
    }
  }
  
  const newAttemptCount = (record.attempt_count || 0) + 1;
  const shouldLock = newAttemptCount >= MAX_ATTEMPTS;
  
  // ✅ Calculate lock time FIRST
  let lockedUntil = null;
  if (shouldLock) {
    lockedUntil = new Date();
    lockedUntil.setMinutes(lockedUntil.getMinutes() + LOCKOUT_MINUTES);
  }
  
  const updateData = {
    attempt_count: newAttemptCount,
    last_attempt: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  if (shouldLock) {
    updateData.is_locked = true;
    updateData.locked_until = lockedUntil.toISOString();
  }
  
  const { error } = await supabase
    .from('login_attempts')
    .update(updateData)
    .eq('email', email);
  
  if (error) throw error;
  
  if (shouldLock) {
    const lockedUntil = new Date();
    lockedUntil.setMinutes(lockedUntil.getMinutes() + LOCKOUT_MINUTES);
    updateData.is_locked = true;
    updateData.locked_until = lockedUntil.toISOString();
    
    return { 
      isLocked: true,
      minutesLeft: LOCKOUT_MINUTES,  // ← JUST ADD THIS LINE
      message: `Account locked after ${MAX_ATTEMPTS} failed attempts. Try again in ${LOCKOUT_MINUTES} minutes.`
    };
  }
  
  const remainingAttempts = MAX_ATTEMPTS - newAttemptCount;
  return { 
    isLocked: false, 
    remainingAttempts,
    message: `Invalid credentials. ${remainingAttempts} attempt(s) remaining.`
  };
}

// -------------------------
// LOGIN ENDPOINT - Fetches fresh settings each time
// -------------------------
router.post("/", async (req, res) => {
  const username = req.body.username?.trim().toLowerCase();
  const password = req.body.password?.trim();

  if (!username || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    // ✅ GET FRESH SETTINGS ON EVERY LOGIN
    const settings = await getCurrentSettings();
    const MAX_ATTEMPTS = settings.maxAttempts;
    const LOCKOUT_MINUTES = settings.lockoutMinutes;
    
    console.log(`Login attempt for ${username} - Settings: ${MAX_ATTEMPTS} attempts, ${LOCKOUT_MINUTES} min lockout`);

    const attemptRecord = await getLoginAttempts(username);
    if (attemptRecord.is_locked && attemptRecord.locked_until) {
      const now = new Date();
      const lockExpiry = new Date(attemptRecord.locked_until);
      
      if (now < lockExpiry) {
        const minutesLeft = Math.ceil((lockExpiry - now) / 1000 / 60);
        return res.status(403).json({ 
          message: `Account locked. Try again in ${minutesLeft} minute(s).`,
          isLocked: true,
          minutesLeft
        });
      } else {
        await resetLoginAttempts(username);
      }
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: username,
      password: password,
    });

    if (authError || !authData?.user) {
      // ✅ Pass current settings to increment function
      const lockResult = await incrementFailedAttempts(username, MAX_ATTEMPTS, LOCKOUT_MINUTES);
      
      if (lockResult.isLocked) {
        return res.status(403).json({ 
          message: lockResult.message,
          isLocked: true,
          minutesLeft: lockResult.minutesLeft,  // ✅ ADD THIS
        });
      }
      
      return res.status(401).json({ 
        message: lockResult.message || "Invalid email or password"
      });
    }

    await resetLoginAttempts(username);

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (userError || !user) {
      return res.status(500).json({ message: "User profile missing" });
    }

    if (!user.is_verified) {
      return res.status(403).json({
        message: "Please verify your email first.",
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
      message: "Scan QR code with Google Authenticator",
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
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
  
  let verified = speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: otp,
    window: 0,
  });

  if (!verified) {
    const checkWithWindow = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: otp,
      window: 1,
    });

    if (checkWithWindow) {
      return res.status(400).json({ message: "Code expired. Try again." });
    } else {
      return res.status(400).json({ message: "Invalid code. Try again." });
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
      return res.status(500).json({ message: "Failed to save 2FA secret" });
    }
    delete tempSetup[username];

    const { data: userData } = await supabase
      .from('users')
      .select('id, first_name, last_name, middle_name, email, contact_number, role')
      .eq('email', username)
      .single();

    return res.json({
      message: "Setup successful!",
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

// -------------------------
// GET LOCKED ACCOUNTS
// -------------------------
// -------------------------
// GET LOCKED ACCOUNTS - FIXED
// -------------------------
router.get("/locked-accounts", async (req, res) => {
  try {
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('login_attempts')
      .select('*')
      .eq('is_locked', true)
      .gt('locked_until', now)
      .order('locked_until', { ascending: false });
    
    if (error) throw error;
    
    const lockedAccounts = await Promise.all(
      data.map(async (attempt) => {
        // Get user from users table only
        const { data: user } = await supabase
          .from('users')
          .select('id, first_name, last_name, email, role')
          .eq('email', attempt.email)
          .single();
        
        return {
          ...attempt,
          user: user || { first_name: '', last_name: '', email: attempt.email, role: 'customer' }
        };
      })
    );
    
    res.json(lockedAccounts);
  } catch (err) {
    console.error("Error fetching locked accounts:", err);
    res.status(500).json({ error: "Failed to fetch locked accounts" });
  }
});

// -------------------------
// UNLOCK ACCOUNT
// -------------------------
router.post("/unlock-account", async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }
  
  try {
    await resetLoginAttempts(email);
    res.json({ message: "Account unlocked successfully" });
  } catch (err) {
    console.error("Error unlocking account:", err);
    res.status(500).json({ error: "Failed to unlock account" });
  }
});

// -------------------------
// HELPER FUNCTION
// -------------------------
function _buildUserPayload(userData) {
  if (!userData) return null;
  return {
    id: userData.id,
    name: [userData.first_name, userData.last_name].filter(Boolean).join(" ") || null,
    firstName: userData.first_name || null,
    lastName: userData.last_name || null,
    email: userData.email,
    phone: userData.contact_number || null,
    avatar: userData.profile_url || null,
    role: userData.role || "customer",
  };
}

export default router;