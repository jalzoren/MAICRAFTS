  // backend/routes/verify.js
  import express from "express";
  import supabase from "../supabaseClient.js";

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
        return res.status(500).send("Database error");
      }

      const CLIENT_URL = process.env.CLIENT_URL;

        if (!verification) {
          return res.redirect(`${CLIENT_URL}/login?error=invalid_token`);
        }

        if (verification.is_used) {
          return res.redirect(`${CLIENT_URL}/login?message=already_verified`);
        }

        if (new Date(verification.expires_at) < new Date()) {
          return res.redirect(`${CLIENT_URL}/login?error=expired`);
        }

      await supabase
        .from("users")
        .update({ is_active: true })
        .eq("id", verification.user_id);

      // Mark token as used
      await supabase
        .from("email_verifications")
        .update({ is_used: true })
        .eq("id", verification.id);

      return res.redirect("http://localhost:5173/login?success=verified");
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal server error");
    }
  });

  export default router;