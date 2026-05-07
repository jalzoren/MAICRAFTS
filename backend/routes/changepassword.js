// backend/routes/changePassword.js

import express from "express";
import supabase, { supabaseAdmin } from "../supabaseClient.js";
import { createAuditLog } from "../services/auditService.js";

const router = express.Router();


// ========== AUTH MIDDLEWARE ==========
router.use(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log('🔐 [changePassword] Auth Header:', authHeader ? 'Present' : 'Missing');
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    req.user = null;
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
      
      console.log('✅ [changePassword] Authenticated user:', req.user.email);
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

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/verify-current-password
// ─────────────────────────────────────────────────────────────────────────────
router.post("/verify-current-password", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data?.user) {

      await createAuditLog({
        user_id: req.user?.id || null,
        user_email: email,
        user_role: req.user?.role || 'CUSTOMER',
        action: 'FAILED',
        module: 'PASSWORD_CHANGE',
        description: `Current password verification failed for ${email}`,
      });

      return res.status(401).json({ message: "Incorrect password. Please try again." });
    }

    await createAuditLog({
      user_id: req.user?.id || data.user.id,
      user_email: email,
      user_role: req.user?.role || 'CUSTOMER',
      action: 'VERIFY',
      module: 'PASSWORD_CHANGE',
      description: `Current password verified successfully for ${email}`,
    });

    return res.status(200).json({ message: "Password verified." });

  } catch (err) {
    console.error("Verify current password error:", err);

    await createAuditLog({
      user_id: req.user?.id || null,
      user_email: email,
      user_role: req.user?.role || 'CUSTOMER',
      action: 'ERROR',
      module: 'PASSWORD_CHANGE',
      description: `Password verification error: ${err.message}`,
    });

    return res.status(500).json({ message: "Internal server error." });
  }
});

router.post("/change-password", async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return res.status(400).json({ message: "Email and new password are required." });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters." });
  }

  try {
    // Get user from database first
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, email, role")
      .eq("email", email)
      .single();

    if (userError || !user) {
      await createAuditLog({
        user_id: null,
        user_email: email,
        user_role: 'CUSTOMER',
        action: 'FAILED',
        module: 'PASSWORD_CHANGE',
        description: `Password change failed: User not found for ${email}`,
      });
      
      return res.status(404).json({ message: "User not found." });
    }

    // Update password via Supabase Admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });

    if (updateError) {
      console.error("Password update error:", updateError);
      
      await createAuditLog({
        user_id: user.id,
        user_email: email,
        user_role: user.role || 'CUSTOMER',
        action: 'ERROR',
        module: 'PASSWORD_CHANGE',
        description: `Password update failed for ${email}: ${updateError.message}`,
      });
      
      return res.status(500).json({ message: "Failed to update password." });
    }

    // ✅ SUCCESSFUL PASSWORD CHANGE AUDIT
    await createAuditLog({
      user_id: user.id,
      user_email: email,
      user_role: user.role || 'CUSTOMER',
      action: 'UPDATE',
      module: 'PASSWORD_CHANGE',
      description: `Password changed successfully for ${email}`,
    });

    console.log(`✅ Password changed successfully for: ${email}`);
    return res.status(200).json({ message: "Password updated successfully." });

  } catch (err) {
    console.error("Change password error:", err);
    
    await createAuditLog({
      user_id: null,
      user_email: email,
      user_role: 'CUSTOMER',
      action: 'ERROR',
      module: 'PASSWORD_CHANGE',
      description: `Password change error: ${err.message}`,
    });
    
    return res.status(500).json({ message: "Internal server error." });
  }
});

export default router;