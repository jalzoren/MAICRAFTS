// login.js
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
  } catch (err) {}
  return { maxAttempts: 3, lockoutMinutes: 30 };
}

async function getLoginAttempts(email) {
  let userId = null;
  const { data: userData } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  
  if (userData) {
    userId = userData.id;
  }
  
  let { data, error } = await supabase
    .from('login_attempts')
    .select('*')
    .eq('email', email)
    .maybeSingle();
  
  if (error && error.code !== 'PGRST116') {
    console.error('Error getting login attempts:', error);
    throw error;
  }
  
  if (!data) {
    const insertData = {
      email: email,
      attempt_count: 0,
      is_locked: false,
      locked_until: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
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
    
    return newData;
  }
  
  if (!data.user_id && userId) {
    await supabase
      .from('login_attempts')
      .update({ user_id: userId, updated_at: new Date().toISOString() })
      .eq('email', email);
    data.user_id = userId;
  }
  
  return data;
}

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
  
  if (error) {
    console.error('Error resetting attempts:', error);
    throw error;
  }
}

async function recordLockAudit(userId, email, action, attemptCount = null, lockedAt = null, lockedUntil = null, unlockedAt = null, performedBy = null, reason = null) {
  try {
    const insertData = {
      user_id: userId,
      email: email,
      action: action,
      attempt_count: attemptCount,
      locked_at: lockedAt,
      locked_until: lockedUntil,
      unlocked_at: unlockedAt,
      performed_by: performedBy,
      reason: reason,
      created_at: new Date().toISOString()
    };
    
    const { error } = await supabase
      .from('account_lock_audit_logs')
      .insert([insertData]);
    
    if (error) console.error('Error recording lock audit:', error);
  } catch (err) {
    console.error('Failed to record lock audit:', err);
  }
}

async function updateUnlockAudit(email, performedBy, reason) {
  try {
    console.log(`🔍 Looking for locked row for ${email}`);
    
    const { data: lockRow, error: findError } = await supabase
      .from('account_lock_audit_logs')
      .select('id, locked_at')
      .eq('email', email)
      .eq('action', 'LOCKED')
      .is('unlocked_at', null)
      .order('locked_at', { ascending: false })
      .limit(1)
      .single();
    
    if (findError) {
      console.error('❌ Error finding lock row:', findError);
      return;
    }
    
    if (lockRow) {
      console.log(`✅ Found lock row for ${email}, ID: ${lockRow.id}, locked_at: ${lockRow.locked_at}`);
      console.log(`📝 Updating with unlocked_at: ${new Date().toISOString()}`);
      
      const { error: updateError } = await supabase
        .from('account_lock_audit_logs')
        .update({
          action: 'UNLOCKED',
          unlocked_at: new Date().toISOString(),
          performed_by: performedBy,
          reason: reason
        })
        .eq('id', lockRow.id);
      
      if (updateError) {
        console.error('❌ Error updating unlock audit:', updateError);
      } else {
        console.log(`✅ Successfully updated unlock audit for ${email}`);
      }
    } else {
      console.log(`⚠️ No locked row found for ${email}`);
    }
  } catch (err) {
    console.error('❌ Failed to update unlock audit:', err);
  }
}

async function incrementFailedAttempts(email, MAX_ATTEMPTS, LOCKOUT_MINUTES) {
  let record = await getLoginAttempts(email);
  
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
      await updateUnlockAudit(email, null, 'Auto-unlocked after lockout period expired');
      await resetLoginAttempts(email);
      record = await getLoginAttempts(email);
    }
  }
  
  const newAttemptCount = (record.attempt_count || 0) + 1;
  const shouldLock = newAttemptCount >= MAX_ATTEMPTS;
  const remainingAttempts = shouldLock ? 0 : MAX_ATTEMPTS - newAttemptCount;
  
  let lockedUntil = null;
  let lockedAt = null;
  
  if (shouldLock) {
    lockedAt = new Date();
    lockedUntil = new Date();
    lockedUntil.setMinutes(lockedUntil.getMinutes() + LOCKOUT_MINUTES);
    
    await recordLockAudit(
      record.user_id,
      email,
      'LOCKED',
      newAttemptCount,
      lockedAt.toISOString(),
      lockedUntil.toISOString(),
      null,
      null,
      `Account locked after ${newAttemptCount} failed attempts (max: ${MAX_ATTEMPTS})`
    );
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
  
  if (error) {
    console.error('Error updating attempts:', error);
    throw error;
  }
  
  if (shouldLock) {
    return { 
      isLocked: true,
      minutesLeft: LOCKOUT_MINUTES,
      remainingAttempts: 0,
      message: `Account locked after ${MAX_ATTEMPTS} failed attempts. Try again in ${LOCKOUT_MINUTES} minutes.`
    };
  }
  
  return { 
    isLocked: false, 
    remainingAttempts: remainingAttempts,
    message: `Invalid credentials. ${remainingAttempts} attempt(s) remaining.`
  };
}

// LOGIN ENDPOINT
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

    await resetLoginAttempts(username);

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', username)
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

// VERIFY OTP ENDPOINT
// VERIFY OTP ENDPOINT - UPDATED to include token
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

  await updateUnlockAudit(username, null, 'Account unlocked via successful login');
  await resetLoginAttempts(username);

  // GET THE SUPABASE SESSION TOKEN
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;

  if (!accessToken) {
    console.error('No access token found after successful login');
    return res.status(500).json({ message: "Failed to get session token" });
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

    // Return user data WITH token
    return res.json({
      message: "Setup successful!",
      setupComplete: true,
      user: _buildUserPayload(userData),
      token: accessToken, // ← ADD THIS
    });
  }

  delete tempSetup[username];
  const { data: userData } = await supabase
    .from('users')
    .select('id, first_name, last_name, middle_name, email, contact_number, role, profile_url')
    .eq('email', username)
    .single();

  queueLoginAuditLog(userData, "User logged in successfully.");

  // Return user data WITH token
  res.json({
    message: "Login successful",
    user: _buildUserPayload(userData),
    token: accessToken, 
  });
});

// GET LOCKED ACCOUNTS
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

// UNLOCK ACCOUNT
router.post("/unlock-account", async (req, res) => {
  const { email } = req.body;
  const performedBy = req.user?.id || null;
  const performedByName = req.user?.name || "ADMIN";
  
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }
  
  try {
    await updateUnlockAudit(email, performedBy, `Manually unlocked by ${performedByName}`);
    
    const { error: updateError } = await supabase
      .from('login_attempts')
      .update({
        is_locked: false,
        locked_until: null,
        attempt_count: 0,
        updated_at: new Date().toISOString()
      })
      .eq('email', email);
    
    if (updateError) throw updateError;
    
    res.json({ message: "Account unlocked successfully" });
  } catch (err) {
    console.error("Error unlocking:", err);
    res.status(500).json({ error: "Failed to unlock account" });
  }
});

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