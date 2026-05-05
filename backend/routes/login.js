import express from 'express';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import supabase from '../supabaseClient.js';
import { recordAuditLog } from '../utils/auditLogger.js';

const router = express.Router();
const tempSetup = {};

const buildDisplayName = (userData) => {
  if (!userData) return "Unknown User";
  return [userData.first_name, userData.last_name]
    .filter(Boolean)
    .join(" ") || userData.email || "Unknown User";
};

const queueLoginAuditLog = (userData, description) => {
  void recordAuditLog({
    userId: userData?.id,
    userName: buildDisplayName(userData),
    userRole: userData?.role || "customer",
    action: "LOGIN",
    module: "Authentication",
    description,
  }).catch((error) => {
    console.error("Audit log error:", error);
  });
};

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

// Helper: Get or create login attempt record - WITH USER_ID
async function getLoginAttempts(email) {
  // ✅ FIRST: Try to find the user in users table to get their ID
  let userId = null;
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  
  if (!userError && userData) {
    userId = userData.id;
    console.log(`Found user_id ${userId} for email ${email}`);
  } else {
    console.log(`No user found in users table for ${email}, will keep user_id as NULL`);
  }
  
  // Now get or create login_attempts record
  let { data, error } = await supabase
    .from('login_attempts')
    .select('*')
    .eq('email', email)
    .maybeSingle();
  
  if (error && error.code !== 'PGRST116') {
    console.error('Error getting login attempts:', error);
    throw error;
  }
  
  // If no record exists, create one
  if (!data) {
    console.log(`Creating new login_attempts record for ${email}, user_id: ${userId}`);
    
    const insertData = {
      email: email,
      attempt_count: 0,
      is_locked: false,
      locked_until: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // ✅ Only add user_id if we found one
    if (userId) {
      insertData.user_id = userId;
    }
    
    const { data: newData, error: insertError } = await supabase
      .from('login_attempts')
      .insert([insertData])
      .select()
      .single();
    
    if (insertError) {
      console.error('Error creating login attempts record:', insertError);
      throw insertError;
    }
    
    console.log(`Created record with user_id: ${newData.user_id}`);
    return newData;
  }
  
  // ✅ If record exists but user_id is NULL and we now have a userId, UPDATE it
  if (!data.user_id && userId) {
    console.log(`Updating existing login_attempts record with user_id ${userId}`);
    const { data: updatedData, error: updateError } = await supabase
      .from('login_attempts')
      .update({ user_id: userId, updated_at: new Date().toISOString() })
      .eq('email', email)
      .select()
      .single();
    
    if (!updateError && updatedData) {
      data = updatedData;
    }
  }
  
  console.log(`Retrieved record for ${email} - attempts: ${data.attempt_count}, user_id: ${data.user_id}`);
  return data;
}

// Helper: Reset login attempts to 0 (but keep the user_id)
async function resetLoginAttempts(email) {
  console.log(`Resetting login attempts for ${email} to 0`);
  
  // First get the current record to preserve user_id
  const currentRecord = await getLoginAttempts(email);
  
  const { data, error } = await supabase
    .from('login_attempts')
    .update({ 
      attempt_count: 0, 
      is_locked: false, 
      locked_until: null,
      updated_at: new Date().toISOString()
      // ✅ Don't change user_id - keep whatever it was
    })
    .eq('email', email)
    .select();
  
  if (error) {
    console.error('Error resetting attempts:', error);
    throw error;
  }
  
  console.log(`Reset successful for ${email}, user_id preserved: ${currentRecord?.user_id}`);
  return data;
}

// Helper: Increment failed attempts
async function incrementFailedAttempts(email, MAX_ATTEMPTS, LOCKOUT_MINUTES) {
  console.log(`Incrementing failed attempts for ${email}, max=${MAX_ATTEMPTS}, lockout=${LOCKOUT_MINUTES}min`);
  
  let record = await getLoginAttempts(email);
  console.log(`Current attempt_count: ${record.attempt_count}, is_locked: ${record.is_locked}`);
  
  // Check if already locked and lock hasn't expired
  if (record.is_locked && record.locked_until) {
    const now = new Date();
    const lockExpiry = new Date(record.locked_until);
    
    if (now < lockExpiry) {
      const minutesLeft = Math.ceil((lockExpiry - now) / 1000 / 60);
      console.log(`Account still locked for ${email}, ${minutesLeft} minutes left`);
      return { 
        isLocked: true, 
        minutesLeft,
        message: `Account locked. Try again in ${minutesLeft} minute(s).`
      };
    } else {
      // Lock expired - reset everything
      console.log(`Lock expired for ${email}, resetting to 0`);
      await resetLoginAttempts(email);
      record = await getLoginAttempts(email);
    }
  }
  
  // Increment the attempt count (this makes 0→1, 1→2, etc.)
  const newAttemptCount = (record.attempt_count || 0) + 1;
  const shouldLock = newAttemptCount >= MAX_ATTEMPTS;
  
  console.log(`New attempt_count: ${newAttemptCount}, shouldLock: ${shouldLock}`);
  
  // Calculate lock time if needed
  let lockedUntil = null;
  if (shouldLock) {
    lockedUntil = new Date();
    lockedUntil.setMinutes(lockedUntil.getMinutes() + LOCKOUT_MINUTES);
    console.log(`Will lock account until: ${lockedUntil.toISOString()}`);
  }
  
  // Prepare update data
  const updateData = {
    attempt_count: newAttemptCount,
    last_attempt: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  if (shouldLock) {
    updateData.is_locked = true;
    updateData.locked_until = lockedUntil.toISOString();
  }
  
  // Update the database
  console.log(`Updating database for ${email} with:`, updateData);
  const { error } = await supabase
    .from('login_attempts')
    .update(updateData)
    .eq('email', email);
  
  if (error) {
    console.error('Error updating attempts:', error);
    throw error;
  }
  
  // Verify the update
  const verifyRecord = await getLoginAttempts(email);
  console.log(`Verified: attempt_count is now ${verifyRecord.attempt_count}`);
  
  // Return appropriate response
  if (shouldLock) {
    return { 
      isLocked: true,
      minutesLeft: LOCKOUT_MINUTES,
      remainingAttempts: 0,
      message: `Account locked after ${MAX_ATTEMPTS} failed attempts. Try again in ${LOCKOUT_MINUTES} minutes.`
    };
  }
  
  const remainingAttempts = MAX_ATTEMPTS - newAttemptCount;
  console.log(`Remaining attempts for ${email}: ${remainingAttempts}`);
  
  return { 
    isLocked: false, 
    remainingAttempts,
    message: `Invalid credentials. ${remainingAttempts} attempt(s) remaining.`
  };
}

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
    const settings = await getCurrentSettings();
    const MAX_ATTEMPTS = settings.maxAttempts;
    const LOCKOUT_MINUTES = settings.lockoutMinutes;
    
    console.log(`Login attempt for ${username}, max attempts: ${MAX_ATTEMPTS}`);

    // First, check if account is locked
    const attemptRecord = await getLoginAttempts(username);
    
    if (attemptRecord.is_locked && attemptRecord.locked_until) {
      const now = new Date();
      const lockExpiry = new Date(attemptRecord.locked_until);
      
      if (now < lockExpiry) {
        const minutesLeft = Math.ceil((lockExpiry - now) / 1000 / 60);
        console.log(`Login blocked - account locked for ${username}, ${minutesLeft} minutes left`);
        return res.status(403).json({ 
          message: `Account locked. Try again in ${minutesLeft} minute(s).`,
          isLocked: true,
          minutesLeft
        });
      } else {
        // Lock expired - reset
        console.log(`Lock expired for ${username}, resetting`);
        await resetLoginAttempts(username);
      }
    }

    // Attempt authentication
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: username,
      password: password,
    });

    if (authError || !authData?.user) {
      console.log(`Failed login for ${username}: ${authError?.message || 'Invalid credentials'}`);
      const lockResult = await incrementFailedAttempts(username, MAX_ATTEMPTS, LOCKOUT_MINUTES);
      
      if (lockResult.isLocked) {
        return res.status(403).json({ 
          message: lockResult.message,
          isLocked: true,
          minutesLeft: lockResult.minutesLeft
        });
      }
      
      return res.status(401).json({ 
        message: lockResult.message,
        remainingAttempts: lockResult.remainingAttempts
      });
    }

    // Successful login - reset attempts to 0
    console.log(`Successful login for ${username}, resetting attempt count to 0`);
    await resetLoginAttempts(username);

    // Get user profile
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', username)
      .single();

    if (userError || !user) {
      console.error(`User profile missing for ${username}`);
      return res.status(500).json({ message: "User profile missing" });
    }

    if (!user.is_verified) {
      return res.status(403).json({
        message: "Please verify your email first.",
        requiresVerification: true
      });
    }

    // Handle 2FA
    if (user.is_2fa_enabled && user.secret_key) {
      tempSetup[username] = user.secret_key;
      return res.json({
        requiresOTP: true,
        isSetup: false,
        message: "Enter your Google Authenticator code",
      });
    }

    // Setup 2FA if not enabled
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
      .select('id, first_name, last_name, middle_name, email, contact_number, role, profile_url')
      .eq('email', username)
      .single();

    queueLoginAuditLog(userData, "User completed login and 2FA setup.");

    return res.json({
      message: "Setup successful!",
      setupComplete: true,
      user: _buildUserPayload(userData),
    });
  }

  delete tempSetup[username];
  const { data: userData } = await supabase
    .from('users')
    .select('id, first_name, last_name, middle_name, email, contact_number, role, profile_url')
    .eq('email', username)
    .single();

  queueLoginAuditLog(userData, "User logged in successfully.");

  res.json({
    message: "Login successful",
    user: _buildUserPayload(userData),
  });
});

// -------------------------
// GET LOCKED ACCOUNTS
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