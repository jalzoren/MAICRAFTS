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

/// POST login settings - FIXED
router.post("/login-settings", async (req, res) => {
  const { maxAttempts, lockoutDurationMinutes } = req.body;
  
  try {
    // First, try to update existing record
    const { error: updateError } = await supabaseAdmin
      .from('system_settings')
      .update({
        setting_value: { maxAttempts, lockoutDurationMinutes },
        updated_at: new Date().toISOString()
      })
      .eq('setting_key', 'login_attempts');
    
    // If no record was updated, insert a new one
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

export default router;