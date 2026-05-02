// backend/routes/settings.js
import express from 'express';
import supabase, { supabaseAdmin } from '../supabaseClient.js';

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
    
    if (updateError && updateError.code === 'PGRST116') {
      const { error: insertError } = await supabaseAdmin
        .from('system_settings')
        .insert({
          setting_key: 'login_attempts',
          setting_value: { maxAttempts, lockoutDurationMinutes },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (insertError) throw insertError;
    } else if (updateError) {
      throw updateError;
    }
    
    res.json({ message: "Settings saved successfully" });
  } catch (err) {
    console.error("Error saving:", err);
    res.status(500).json({ error: "Failed to save settings" });
  }
});

// FIXED: Get locked accounts with user names
router.get("/locked-accounts", async (req, res) => {
  try {
    const currentTime = new Date().toISOString();
    
    // First, get all login attempts that are locked
    const { data: loginAttempts, error: attemptsError } = await supabase
      .from('login_attempts')
      .select('*')
      .eq('is_locked', true)
      .gt('locked_until', currentTime);

    if (attemptsError) {
      console.error("Error fetching login_attempts:", attemptsError);
      return res.status(500).json({ error: attemptsError.message });
    }

    if (!loginAttempts || loginAttempts.length === 0) {
      return res.json([]);
    }

    // Get all users to join the data
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('email, first_name, last_name, role');

    if (usersError) {
      console.error("Error fetching users:", usersError);
      return res.status(500).json({ error: usersError.message });
    }

    // Combine the data
    const combinedData = loginAttempts.map(attempt => {
      const user = allUsers?.find(u => u.email === attempt.email);
      
      return {
        id: attempt.id,
        email: attempt.email,
        attempt_count: attempt.attempt_count,
        locked_until: attempt.locked_until,
        created_at: attempt.created_at,
        is_locked: attempt.is_locked,
        user: user ? {
          first_name: user.first_name || 'No',
          last_name: user.last_name || 'Name',
          role: user.role || 'customer',
          email: user.email
        } : {
          first_name: 'Unknown',
          last_name: 'User',
          role: 'customer',
          email: attempt.email
        }
      };
    });

    res.json(combinedData);
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Failed to fetch locked accounts" });
  }
});

// FIXED: Unlock account endpoint
router.post("/unlock-account", async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
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