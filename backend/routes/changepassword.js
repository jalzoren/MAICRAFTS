// backend/routes/changepassword.js
// ─── This is the file server.js actually imports. Replace the old content with this. ───

import express from "express";
import supabase, { supabaseAdmin } from "../supabaseClient.js";
import { createAuditLog } from "../services/auditService.js";

const router = express.Router();

// ── Auth middleware ──────────────────────────────────────────────────────────
router.use(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(" ")[1];

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      req.user = null;
      return next();
    }

    const { data: dbUser } = await supabase
      .from("users")
      .select("role, first_name, last_name")
      .eq("email", user.email)
      .single();

    req.user = {
      id:    user.id,
      email: user.email,
      role:  dbUser?.role || "customer",
      name:  dbUser
        ? `${dbUser.first_name || ""} ${dbUser.last_name || ""}`.trim()
        : user.email,
    };
  } catch {
    req.user = null;
  }

  next();
});

// ── POST /api/verify-current-password ───────────────────────────────────────
router.post("/verify-current-password", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  try {
    // Bug fix: Supabase expects `password`, not `currentPassword`
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data?.user) {
      await createAuditLog({
        user_id:     req.user?.id || null,
        user_email:  email,
        user_role:   req.user?.role || "customer",
        action:      "FAILED",
        module:      "PASSWORD_CHANGE",
        description: `Current password verification failed for ${email}`,
      });
      return res.status(401).json({ message: "Incorrect password. Please try again." });
    }

    await createAuditLog({
      user_id:     req.user?.id || data.user.id,
      user_email:  email,
      user_role:   req.user?.role || "customer",
      action:      "VERIFY",
      module:      "PASSWORD_CHANGE",
      description: `Current password verified for ${email}`,
    });

    return res.status(200).json({ message: "Password verified." });
  } catch (err) {
    console.error("verify-current-password error:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
});

// ── POST /api/change-password ────────────────────────────────────────────────
router.post("/change-password", async (req, res) => {
  console.log("📥 Change password request body:", req.body);
  const { email, currentPassword, newPassword, verifiedViaOTP } = req.body;

  // ── Validation ──────────────────────────────────────────────────────────
  if (!email || !newPassword) {
    return res.status(400).json({ message: "Email and new password are required." });
  }

  // currentPassword is only required when NOT coming through OTP path
  if (!verifiedViaOTP && !currentPassword) {
    return res.status(400).json({ message: "Current password is required." });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters." });
  }

  try {
    // ── Step 1: Re-verify current password (non-OTP path only) ──────────
    if (!verifiedViaOTP) {
      // Bug fix: use `password: currentPassword`, not `currentPassword` as key
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,   // ← fixed parameter name
      });

      if (error || !data?.user) {
        await createAuditLog({
          user_id:     req.user?.id || null,
          user_email:  email,
          user_role:   req.user?.role || "customer",
          action:      "FAILED",
          module:      "PASSWORD_CHANGE",
          description: `Re-verification failed during password change for ${email}`,
        });
        return res.status(401).json({ message: "Incorrect current password." });
      }
    }

    // ── Step 2: Look up user in DB ───────────────────────────────────────
    const { data: dbUser, error: userError } = await supabase
      .from("users")
      .select("id, email, role")
      .ilike("email", email)
      .single();

    if (userError || !dbUser) {
      return res.status(404).json({ message: "User not found." });
    }

    // ── Step 3: Update password via Admin API ────────────────────────────
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      dbUser.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Password update error:", updateError);
      return res.status(500).json({ message: "Failed to update password. Please try again." });
    }

    await createAuditLog({
      user_id:     dbUser.id,
      user_email:  email,
      user_role:   dbUser.role || "customer",
      action:      "UPDATE",
      module:      "PASSWORD_CHANGE",
      description: `Password changed successfully for ${email}`,
    });

    console.log(`✅ Password changed for: ${email}`);
    return res.status(200).json({ message: "Password updated successfully." });

  } catch (err) {
    console.error("change-password error:", err);

    await createAuditLog({
      user_id:     req.user?.id || null,
      user_email:  email,
      user_role:   req.user?.role || "customer",
      action:      "ERROR",
      module:      "PASSWORD_CHANGE",
      description: `Password change error: ${err.message}`,
    });

    return res.status(500).json({ message: "Internal server error." });
  }
});

export default router;