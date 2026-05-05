// backend/routes/settings.js
import express from 'express';
import supabase, { supabaseAdmin } from '../supabaseClient.js';
import { createAuditLog } from "../services/auditService.js";

const router = express.Router();

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

    // ✅ AUDIT LOG (ONLY ON SUCCESS)
    await createAuditLog({
      user_id: req.user?.id || null,
      user_name: req.user?.name || "ADMIN",
      user_role: "ADMIN",
      action: "UPDATE",
      module: "SETTINGS",
      description: `Updated login settings (maxAttempts: ${maxAttempts}, lockout: ${lockoutDurationMinutes}min)`,
    });

    res.json({ message: "Settings saved successfully" });
  } catch (err) {
    console.error("Error saving:", err);
    res.status(500).json({ error: "Failed to save settings" });
  }
});

router.get("/locked-accounts", async (req, res) => {
  try {
    const now = new Date().toISOString();
    
    // ✅ Better query with proper join
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
    
    // Format the response
    const formattedData = (data || []).map(attempt => ({
      ...attempt,
      user: attempt.users || null,
      users: undefined // Remove the nested users object
    }));
    
    res.json(formattedData);
  } catch (err) {
    console.error("Error fetching locked accounts:", err);
    res.status(500).json({ error: "Failed to fetch locked accounts" });
  }
});

router.post("/unlock-account", async (req, res) => {
  const { email, user_id } = req.body;

  if (!email && !user_id) {
    return res.status(400).json({ error: "Email or user_id required" });
  }

  try {
    // Update login_attempts to unlock
    const { error: updateError } = await supabaseAdmin
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