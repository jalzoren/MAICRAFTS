// backend/routes/changePassword.js

import express from "express";
import supabase from "../supabaseClient.js";

const router = express.Router();

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
      return res.status(401).json({ message: "Incorrect password. Please try again." });
    }

    return res.status(200).json({ message: "Password verified." });

  } catch (err) {
    console.error("Verify current password error:", err);
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
    // 1️⃣ Find the user in Supabase Auth
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      return res.status(500).json({ message: "Failed to look up user." });
    }

    const user = users.users.find((u) => u.email === email);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // 2️⃣ Update password via Supabase Admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });

    if (updateError) {
      console.error("Password update error:", updateError);
      return res.status(500).json({ message: "Failed to update password." });
    }

    console.log(`✅ Password changed successfully for: ${email}`);
    return res.status(200).json({ message: "Password updated successfully." });

  } catch (err) {
    console.error("Change password error:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
});

export default router;