// backend/routes/verify.js
import express from "express";
import supabase from "../supabaseClient.js";
import { createAuditLog } from "../services/auditService.js";

const router = express.Router();

router.get("/verify-email", async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send("Token is required");

  try {
    const { data: verification, error } = await supabase
      .from("email_verifications")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (error) {
      console.error(error);
      
      // Log error
      await createAuditLog({
        user_id: null,
        user_email: null,
        user_role: "SYSTEM",
        action: "ERROR",
        module: "VERIFICATION",
        description: `Database error during email verification: ${error.message}`,
      });
      
      return res.status(500).send("Database error");
    }

    const CLIENT_URL = process.env.CLIENT_URL;

    // Case 1: Invalid token
    if (!verification) {
      await createAuditLog({
        user_id: null,
        user_email: null,
        user_role: "SYSTEM",
        action: "FAILED",
        module: "VERIFICATION",
        description: `Email verification failed: Invalid token used`,
      });
      
      return res.redirect(`${CLIENT_URL}/login?error=invalid_token`);
    }

    // Get user email for audit logs
    const { data: user } = await supabase
      .from("users")
      .select("email, role")
      .eq("id", verification.user_id)
      .single();

    // Case 2: Token already used
    if (verification.is_used) {
      await createAuditLog({
        user_id: verification.user_id,
        user_email: user?.email || null,
        user_role: user?.role || "CUSTOMER",
        action: "FAILED",
        module: "VERIFICATION",
        description: `Email verification failed: Token already used`,
      });
      
      return res.redirect(`${CLIENT_URL}/login?message=already_verified`);
    }

    // Case 3: Token expired
    if (new Date(verification.expires_at) < new Date()) {
      await createAuditLog({
        user_id: verification.user_id,
        user_email: user?.email || null,
        user_role: user?.role || "CUSTOMER",
        action: "FAILED",
        module: "VERIFICATION",
        description: `Email verification failed: Token expired (expired at: ${verification.expires_at})`,
      });
      
      return res.redirect(`${CLIENT_URL}/login?error=expired`);
    }

    // Case 4: Successful verification
    // Update user to active
    const { error: updateError } = await supabase
      .from("users")
      .update({ 
        is_active: true,
        is_verified: true,
        updated_at: new Date().toISOString()
      })
      .eq("id", verification.user_id);

    if (updateError) {
      console.error("Error updating user:", updateError);
      
      await createAuditLog({
        user_id: verification.user_id,
        user_email: user?.email || null,
        user_role: user?.role || "CUSTOMER",
        action: "ERROR",
        module: "VERIFICATION",
        description: `Failed to activate user account: ${updateError.message}`,
      });
      
      return res.status(500).send("Error activating account");
    }

    // Mark token as used
    await supabase
      .from("email_verifications")
      .update({ is_used: true })
      .eq("id", verification.id);

    // SUCCESS AUDIT LOG
    await createAuditLog({
      user_id: verification.user_id,
      user_email: user?.email || null,
      user_role: user?.role || "CUSTOMER",
      action: "VERIFY",
      module: "AUTH",
      description: `Email verified and account activated successfully`,
    });

    console.log(`✅ Email verified for user: ${user?.email}`);

    return res.redirect(`${CLIENT_URL}/login?success=verified`);
    
  } catch (err) {
    console.error(err);
    
    // Log catch-all error
    await createAuditLog({
      user_id: null,
      user_email: null,
      user_role: "SYSTEM",
      action: "ERROR",
      module: "VERIFICATION",
      description: `Unexpected error during email verification: ${err.message}`,
    });
    
    res.status(500).send("Internal server error");
  }
});

export default router;