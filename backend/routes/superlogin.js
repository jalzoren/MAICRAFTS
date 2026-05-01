import express from "express";
import bcrypt from "bcrypt";
import supabase from "../supabaseClient.js";
import { recordAuditLog } from "../utils/auditLogger.js";

const router = express.Router();

const buildDisplayName = (user) => {
  if (!user) return "Unknown User";

  return (
    user.name ||
    user.full_name ||
    [user.first_name, user.last_name].filter(Boolean).join(" ") ||
    user.email ||
    "Unknown User"
  );
};

const queueLoginAuditLog = (user) => {
  void recordAuditLog({
    userId: user?.id,
    userName: buildDisplayName(user),
    userRole: user?.role || "super_admin",
    action: "LOGIN",
    module: "Authentication",
    description: "Admin user logged in successfully.",
  }).catch((error) => {
    console.error("Audit log error:", error);
  });
};

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

    queueLoginAuditLog(userWithoutPassword);

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