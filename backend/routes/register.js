// routes/register.js
import express from "express";
import supabase from "../supabaseClient.js"; // ES module import
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

// POST /api/register
router.post("/register", async (req, res) => {
  const { email, first_name, last_name, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    // 1️⃣ Create user in Supabase Auth
    const { data: user, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // will send verification email
    });

    if (authError) {
      console.error(authError);
      return res.status(400).json({ error: authError.message });
    }

    // 2️⃣ Insert user profile in public.profiles
    const { error: profileError } = await supabase
      .from("users")
      .insert([{
        id: user.id, // use Supabase Auth user id
        first_name: first_name || null,
        last_name: last_name || null,
        email,
      }]);

    if (profileError) {
      console.error(profileError);
      return res.status(500).json({ error: profileError.message });
    }

    return res.status(201).json({
      message: "Account created! Verification email sent.",
      userId: user.id
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;