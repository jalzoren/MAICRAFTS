import express from "express";
import supabase from "../supabaseClient.js";

const router = express.Router();

router.get("/verify-email", async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send("Token is required");

  try {
    // Find the token in verification table
    const { data: verification, error } = await supabase
    .from("email_verifications")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  
    if (error) {
      console.error("DB error:", error);
      return res.status(500).send("Database error");
    }

    // Mark the user as verified
    await supabase.from("users")
      .update({ is_verified: true })
      .eq("id", verification.user_id);

    // Optionally delete the token
    await supabase.from("email_verifications")
    .update({ is_used: true })
    .eq("id", verification.id);

    // Redirect to homepage or login page
    res.redirect("http://localhost:5173/login"); 
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
});

export default router;