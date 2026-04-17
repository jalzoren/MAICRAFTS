import express from "express";
import bcrypt from "bcrypt";
import supabase from "../supabaseClient.js";

const router = express.Router();

// Test login endpoint
router.post("/test-login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log("Testing login for:", email);
    
    const { data: user, error } = await supabase
      .from("admin")
      .select("*")
      .eq("email", email.toLowerCase())
      .single();
    
    if (error || !user) {
      return res.json({ 
        success: false, 
        error: "User not found"
      });
    }
    
    const isValid = await bcrypt.compare(password, user.password_hash);
    
    res.json({
      userFound: true,
      email: user.email,
      role: user.role,
      passwordValid: isValid,
      status: user.status
    });
    
  } catch (err) {
    res.json({ error: err.message });
  }
});

// Main login endpoint
router.post("/superlogin", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const { data: user, error } = await supabase
      .from("admin")
      .select("*")
      .eq("email", email.toLowerCase())
      .single();

    if (error || !user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (user.status !== "active") {
      return res.status(401).json({ error: "Account is deactivated" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const { password_hash, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: "Login successful",
      user: userWithoutPassword
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;