import express from 'express';
import supabase, { supabaseAdmin } from '../supabaseClient.js';
import { createAuditLog } from '../services/auditService.js'; 

const router = express.Router();

// ========== AUTH MIDDLEWARE ==========
router.use(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log('🔐 [settingsRoutes] Auth Header:', authHeader ? 'Present' : 'Missing');

  if (!authHeader || !authHeader.startsWith("Bearer ")) {    req.user = null;
    return next();
  }

  const token = authHeader.split(" ")[1];

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error) {
      console.error('Supabase auth error:', error.message);
      req.user = null;
      return next();
    }

    if (user) {
      const { data: dbUser, error: dbError } = await supabase
        .from("users")
        .select("role, first_name, last_name")
        .eq("email", user.email)
        .single();
      
      const userRole = dbUser?.role || 'CUSTOMER';
      
      req.user = {
        id: user.id,
        email: user.email,
        role: userRole,
        name: dbUser ? `${dbUser.first_name || ''} ${dbUser.last_name || ''}`.trim() : user.user_metadata?.name || user.email
      };
      
      console.log('✅ [settingsRoutes] Authenticated user:', {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role
      });
    } else {
      req.user = null;
    }
  } catch (error) {
    console.error('Token verification error:', error);
    req.user = null;
  }

  next();
});
// ========== END AUTH MIDDLEWARE ==========

async function updateUnlockAudit(email, performedBy, reason) {
  try {
    const { data: lockRow } = await supabase
      .from('account_lock_audit_logs')
      .select('id')
      .eq('email', email)
      .eq('action', 'LOCKED')
      .is('unlocked_at', null)
      .order('locked_at', { ascending: false })
      .limit(1)
      .single();
    
    if (lockRow) {
      await supabase
        .from('account_lock_audit_logs')
        .update({
          action: 'UNLOCKED',
          unlocked_at: new Date().toISOString(),
          performed_by: performedBy,
          reason: reason
        })
        .eq('id', lockRow.id);
    }
  } catch (err) {
    console.error('Failed to update unlock audit:', err);
  }
}

// Helper function to get current login settings
async function getCurrentLoginSettings() {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'login_attempts')
      .single();
    
    if (error) throw error;
    return data?.setting_value || { maxAttempts: 3, lockoutDurationMinutes: 30 };
  } catch (err) {
    return { maxAttempts: 3, lockoutDurationMinutes: 30 };
  }
}

// GET login settings
router.get("/login-settings", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'login_attempts')
      .single();
    
    if (error) throw error;

    res.json(data.setting_value);
  } catch (err) {
    res.json({ maxAttempts: 3, lockoutDurationMinutes: 30 });
  }
});

// POST login settings
router.post("/login-settings", async (req, res) => {
  const { maxAttempts, lockoutDurationMinutes } = req.body;
  
  try {
    const currentSettings = await getCurrentLoginSettings();
    const oldMax = currentSettings.maxAttempts;
    const oldLockout = currentSettings.lockoutDurationMinutes;

    const { error: updateError } = await supabaseAdmin
      .from('system_settings')
      .update({
        setting_value: { maxAttempts, lockoutDurationMinutes },
        updated_at: new Date().toISOString()
      })
      .eq('setting_key', 'login_attempts');
    
    let finalError = updateError;

    if (updateError && updateError.code === 'PGRST116') {
      const { error: insertError } = await supabaseAdmin
        .from('system_settings')
        .insert({
          setting_key: 'login_attempts',
          setting_value: { maxAttempts, lockoutDurationMinutes },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      finalError = insertError;
    }

    if (finalError) throw finalError;

    if (req.user?.id) {
      await createAuditLog({
        user_id: req.user.id,
        user_email: req.user.email,
        user_role: req.user.role,
        action: "UPDATE",
        module: "SETTINGS",
        description: `Changed login attempt settings: maxAttempts ${oldMax} → ${maxAttempts}, lockoutDuration ${oldLockout}min → ${lockoutDurationMinutes}min`,
      });
      console.log('✅ SETTINGS audit log created');
    }

    res.json({ message: "Settings saved successfully" });
  } catch (err) {
    console.error("Error saving:", err);

    if (req.user?.id) {
      await createAuditLog({
        user_id: req.user.id,
        user_email: req.user.email,
        user_role: req.user.role,
        action: "ERROR",
        module: "SETTINGS",
        description: `Failed to save login attempt settings: ${err.message}`,
      }).catch(e => console.error('Audit error:', e));
    }

    res.status(500).json({ error: "Failed to save settings" });
  }
});

// GET locked accounts
router.get("/locked-accounts", async (req, res) => {
  try {
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('login_attempts')
      .select(`
        id,
        email,
        attempt_count,
        locked_until,
        is_locked,
        created_at,
        user_id,
        users:user_id (
          id,
          first_name,
          last_name,
          email,
          role
        )
      `)
      .eq('is_locked', true)
      .gt('locked_until', now)
      .order('locked_until', { ascending: false });
    
    if (error) throw error;

    if (req.user?.id) {
      createAuditLog({
        user_id: req.user.id,
        user_email: req.user.email,
        user_role: req.user.role,
        action: "VIEW",
        module: "SECURITY",
        description: `Viewed locked accounts list (${data?.length || 0} locked accounts)`,
      }).catch(err => console.error('Audit log error:', err));
    }
    
    const formattedData = (data || []).map(attempt => ({
      ...attempt,
      user: attempt.users || null,
      users: undefined
    }));
    
    res.json(formattedData);
  } catch (err) {
    console.error("Error fetching locked accounts:", err);
    res.status(500).json({ error: "Failed to fetch locked accounts" });
  }
});

router.post("/unlock-account", async (req, res) => {
  const { email, adminId, adminName } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }
  
  try {
    const { data: accountDetails } = await supabase
    .from('login_attempts')
    .select('attempt_count, locked_until, is_locked')
    .eq('email', email)
    .single();
    
    await updateUnlockAudit(email, adminId, `Manually unlocked by ${adminName || "ADMIN"}`);
    
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

     // ✅ UNLOCK ACCOUNT AUDIT LOG
     if (req.user?.id) {
      await createAuditLog({
        user_id: req.user.id,
        user_email: req.user.email,
        user_role: req.user.role,
        action: "UPDATE",
        module: "SECURITY",
        description: `Unlocked account for ${email}. Previously had ${accountDetails?.attempt_count || 0} failed attempts, locked until ${accountDetails?.locked_until || 'N/A'}. Performed by: ${adminName || req.user.email}`,
      });
      console.log('✅ UNLOCK audit log created');
    }
    
    res.json({ message: "Account unlocked successfully" });
  } catch (err) {
    console.error("Error unlocking:", err);

      // ✅ ERROR AUDIT LOG
      if (req.user?.id) {
        await createAuditLog({
          user_id: req.user.id,
          user_email: req.user.email,
          user_role: req.user.role,
          action: "ERROR",
          module: "SECURITY",
          description: `Failed to unlock account for ${email}: ${err.message}`,
        }).catch(e => console.error('Audit error:', e));
      }

    res.status(500).json({ error: "Failed to unlock account" });
  }
});

export default router;