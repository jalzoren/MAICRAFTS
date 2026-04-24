// backend/routes/userRoutes.js
import express from "express";
import bcrypt from "bcrypt";
import supabase from "../supabaseClient.js";

const router = express.Router();

// GET all users
router.get("/users", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("admin")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const usersWithoutPassword = data.map(user => {
      const { password_hash, ...userData } = user;
      return userData;
    });

    res.json(usersWithoutPassword);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// CREATE user
router.post("/users", async (req, res) => {
  try {
    const { username, lastName, firstName, middleName, extension, email, role, password } = req.body;

    console.log("Creating user:", { email, role, username });

    // Check if username exists
    const { data: existingUsername } = await supabase
      .from("admin")
      .select("username")
      .eq("username", username.toLowerCase())
      .single();

    if (existingUsername) {
      return res.status(400).json({ error: "Username already taken" });
    }

    // Check if email exists
    const { data: existingEmail } = await supabase
      .from("admin")
      .select("email")
      .eq("email", email.toLowerCase())
      .single();

    if (existingEmail) {
      return res.status(400).json({ error: "User with this email already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("Password hashed successfully");

    // Insert user
    const { data, error } = await supabase
      .from("admin")
      .insert([{
        username: username.toLowerCase(),
        last_name: lastName,
        first_name: firstName,
        middle_name: middleName || null,
        extension: extension || null,
        email: email.toLowerCase(),
        role: role,
        password_hash: hashedPassword,
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select();

    if (error) {
      console.error("Supabase insert error:", error);
      return res.status(500).json({ error: error.message });
    }

    console.log("User created successfully!");
    const { password_hash, ...userWithoutPassword } = data[0];
    res.status(201).json(userWithoutPassword);
  } catch (err) {
    console.error("Error creating user:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// UPDATE user role
router.put("/users/:id/role", async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const { data, error } = await supabase
      .from("admin")
      .update({ 
        role: role,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select();

    if (error) throw error;

    const { password_hash, ...userWithoutPassword } = data[0];
    res.json(userWithoutPassword);
  } catch (err) {
    console.error("Error updating role:", err);
    res.status(500).json({ error: "Failed to update role" });
  }
});

// DELETE user
router.delete("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("admin")
      .delete()
      .eq("id", id);

    if (error) throw error;

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

export default router;