import express from 'express';
import supabase, { supabaseAdmin } from '../supabaseClient.js';

const router = express.Router();

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

    res.json({ message: "Settings saved successfully" });
  } catch (err) {
    console.error("Error saving:", err);
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
    
    res.json({ message: "Account unlocked successfully" });
  } catch (err) {
    console.error("Error unlocking:", err);
    res.status(500).json({ error: "Failed to unlock account" });
  }
});

export default router;