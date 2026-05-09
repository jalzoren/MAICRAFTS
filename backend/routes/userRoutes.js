// backend/routes/userRoutes.js
import express from "express";
import supabase, { supabaseAdmin } from "../supabaseClient.js";
import multer from 'multer';
const upload = multer({ storage: multer.memoryStorage() });
import { sendWelcomeEmail } from "../utils/mailer.js";
import crypto from "crypto";
import { createAuditLog } from "../services/auditService.js";

const router = express.Router();

// Add this at the top of userRoutes.js, right after the imports
// ========== AUTH MIDDLEWARE ==========
router.use(async (req, res, next) => {
  const authHeader = req.headers.authorization;

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
      // ✅ IMPORTANT: Get role from DATABASE, not from auth metadata
      const { data: dbUser, error: dbError } = await supabase
        .from("users")
        .select("role, first_name, last_name")
        .eq("email", user.email)
        .single();
      
      if (dbError) {
        console.error('Error fetching user from database:', dbError);
      }
      
      // Use role from database (source of truth)
      const userRole = dbUser?.role || 'CUSTOMER';
      
      req.user = {
        id: user.id,
        email: user.email,
        role: userRole,  // ← This will be 'super_admin' from database
        name: dbUser ? `${dbUser.first_name || ''} ${dbUser.last_name || ''}`.trim() : user.user_metadata?.name || user.email
      };
      
      console.log('✅ [userRoutes] Authenticated user:', {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role  // Should show 'super_admin' now
      });
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

// ADMIN AND SELLER ENDPOINTS -----------------------------------------------------
// GET all admin and seller users
// In userRoutes.js - Replace your existing GET /users endpoint

// GET all users (customers, sellers, admins, super_admins)
router.get("/users", async (req, res) => {
  try {
    // Remove any role filtering - fetch ALL users
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Debug log to see what's being fetched
    console.log(`Fetched ${data?.length || 0} users`);
    console.log('Roles found:', [...new Set(data?.map(u => u.role) || [])]);

    // Optional: Add filtering if needed for specific roles
    // If you want ONLY customer, seller, and super_admin (exclude others):
    const filteredData = data?.filter(user => 
      ['customer', 'seller', 'super_admin'].includes(user.role?.toLowerCase())
    ) || data;

    // Audit log
    if (req.user?.id) {
      createAuditLog({
        user_id: req.user.id,
        user_email: req.user.email,
        user_role: req.user.role,
        action: "VIEW",
        module: "USER_MANAGEMENT",
        description: `Viewed users list (${filteredData?.length || 0} users)`,
      }).catch(err => console.error('Audit log error:', err));
    }

    res.json(filteredData);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// CREATE admin/seller user
router.post("/users", async (req, res) => {
  let createdAuthUserId = null;
  
  try {
    const { firstName, lastName, middleName, email, role} = req.body;
    const tempPassword = crypto.randomBytes(6).toString("base64url");

    if (!email || !role) {
      return res.status(400).json({ error: "Email, password, and role are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log("Creating admin/seller user:", { email: normalizedEmail, role });

    // Check if email already exists in users table
    try {
      const { data: existingUsers, error: checkError } = await supabaseAdmin
        .from("users")
        .select("id, email")
        .eq("email", normalizedEmail);

      if (checkError) {
        console.error("Error checking existing email:", checkError);
      } else if (existingUsers && existingUsers.length > 0) {
        return res.status(400).json({ error: "User with this email already exists" });
      }
    } catch (checkErr) {
      console.error("Exception checking email:", checkErr);
    }

    // Create auth user first
    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Service role key not configured on backend" });
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password: tempPassword,
      email_confirm: true,
    });

    if (authError) {
      console.error("Supabase auth error:", authError);
      return res.status(400).json({ error: authError.message || "Failed to create auth user" });
    }

    if (!authData?.user?.id) {
      return res.status(400).json({ error: "Auth user created but no ID returned" });
    }

    createdAuthUserId = authData.user.id;
    console.log("Auth user created with ID:", createdAuthUserId);

    // Then create user profile in users table
    const insertData = {
      id: authData.user.id,
      first_name: firstName?.trim() || null,
      last_name: lastName?.trim() || null,
      middle_name: middleName?.trim() || null,
      email: normalizedEmail,
      role: role.toLowerCase(),
      is_verified: true,
      is_active: true,
    };

    console.log("Inserting user profile:", insertData);

    const { data: newUser, error: userError } = await supabaseAdmin
      .from("users")
      .insert([insertData])
      .select();

    if (userError) {
      console.error("Supabase insert error:", userError);
      
      // Rollback auth user if profile creation fails
      try {
        if (supabaseAdmin) {
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
          console.log("Rolled back auth user");
        }
      } catch (deleteErr) {
        console.error("Failed to rollback auth user:", deleteErr);
      }
      
      return res.status(400).json({ error: userError.message || "Failed to create user profile" });
    }

    if (!newUser || newUser.length === 0) {
      return res.status(400).json({ error: "User created but no data returned" });
    }

    await sendWelcomeEmail({
      email: normalizedEmail,
      fullName: `${firstName || ""} ${lastName || ""}`.trim(),
      password: tempPassword,
    });

    console.log("User created successfully!");
    
    // ✅ ONLY ADDED THIS AUDIT
    await createAuditLog({
      user_id: req.user?.id || null,
      user_email: req.user?.email || "system",
      user_role: req.user?.role || "ADMIN",
      action: "CREATE",
      module: "USER_MANAGEMENT",
      description: `Created ${role} user: ${normalizedEmail} (${firstName || ''} ${lastName || ''})`,
    });

    res.status(201).json(newUser[0]);
  } catch (err) {
    console.error("Error creating user:", err);
    
    // Attempt to rollback auth user if we created one
    if (createdAuthUserId && supabaseAdmin) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
        console.log("Cleaned up auth user on exception");
      } catch (deleteErr) {
        console.error("Failed to cleanup auth user:", deleteErr);
      }
    }

    // ✅ ONLY ADDED THIS AUDIT
    await createAuditLog({
      user_id: req.user?.id || null,
      user_email: req.user?.email || "system",
      user_role: req.user?.role || "ADMIN",
      action: "ERROR",
      module: "USER_MANAGEMENT",
      description: `Failed to create user: ${err.message}`,
    }).catch(e => console.error('Audit error:', e));
    
    res.status(500).json({ error: "Internal server error", message: err.message });
  }
});

// UPDATE user role
router.put("/users/:id/role", async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ error: "Role is required" });
    }

    // ✅ ONLY ADDED THIS - fetch old data for audit
    const { data: oldUserData } = await supabase
      .from("users")
      .select("email, role")
      .eq("id", id)
      .single();

    const { data, error } = await supabase
      .from("users")
      .update({ 
        role: role,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // ✅ ONLY ADDED THIS AUDIT (replacing your old one that had user_name)
    await createAuditLog({
      user_id: req.user?.id || null,
      user_email: req.user?.email || "system",
      user_role: req.user?.role || "ADMIN",
      action: "UPDATE",
      module: "USER_MANAGEMENT",
      description: `Changed role for user ${oldUserData?.email || id} from ${oldUserData?.role || 'unknown'} to ${role}`,
    });

    res.json(data[0]);
  } catch (err) {
    console.error("Error updating role:", err);
    res.status(500).json({ error: "Failed to update role" });
  }
});

// LOCK/UNLOCK user (update is_active status)
router.put("/users/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: "is_active must be a boolean" });
    }

    // ✅ ONLY ADDED THIS - fetch user email for audit
    const { data: oldUserData } = await supabase
      .from("users")
      .select("email")
      .eq("id", id)
      .single();

    const { data, error } = await supabase
      .from("users")
      .update({ 
        is_active: is_active,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // ✅ ONLY ADDED THIS AUDIT
    await createAuditLog({
      user_id: req.user?.id || null,
      user_email: req.user?.email || "system",
      user_role: req.user?.role || "ADMIN",
      action: "UPDATE",
      module: "USER_MANAGEMENT",
      description: `Changed status for user ${oldUserData?.email || id} to ${is_active ? "ACTIVE" : "INACTIVE"}`,
    });

    res.json(data[0]);
  } catch (err) {
    console.error("Error updating user status:", err);
    res.status(500).json({ error: "Failed to update user status" });
  }
});

// DELETE user
router.delete("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ ONLY ADDED THIS - fetch user data before deletion
    const { data: userToDelete } = await supabase
      .from("users")
      .select("email, role, first_name, last_name")
      .eq("id", id)
      .single();

    // Delete user profile
    const { error: profileError } = await supabase
      .from("users")
      .delete()
      .eq("id", id);

    if (profileError) throw profileError;

    // Delete auth user
    const { error: authError } = await supabase.auth.admin.deleteUser(id);
    if (authError) {
      console.warn("Auth delete failed:", authError.message);
    }

    // ✅ ONLY ADDED THIS AUDIT
    await createAuditLog({
      user_id: req.user?.id || null,
      user_email: req.user?.email || "system",
      user_role: req.user?.role || "ADMIN",
      action: "DELETE",
      module: "USER_MANAGEMENT",
      description: `Deleted user: ${userToDelete?.email || id} (${userToDelete?.first_name || ''} ${userToDelete?.last_name || ''}), Role: ${userToDelete?.role || 'unknown'}`,
    });

    res.json({ message: "User deleted successfully" });

  } catch (err) {
    console.error("Error deleting user:", err);

    // ✅ ONLY ADDED THIS AUDIT
    await createAuditLog({
      user_id: req.user?.id || null,
      user_email: req.user?.email || "system",
      user_role: req.user?.role || "ADMIN",
      action: "ERROR",
      module: "USER_MANAGEMENT",
      description: `Failed to delete user ${req.params.id}: ${err.message}`,
    }).catch(e => console.error('Audit error:', e));

    res.status(500).json({ error: "Failed to delete user" });
  }
});

// CUSTOMER ENDPOINTS -----------------------------------------------------

// POST avatar upload
router.post('/users/:id/avatar', upload.single('avatar'), async (req, res) => {
  const { id } = req.params;
  const file = req.file;
  if (!file) return res.status(400).json({ message: 'No file provided' });

  // ✅ ONLY ADDED THIS - get user email for audit
  const { data: userData } = await supabase
    .from('users')
    .select('email')
    .eq('id', id)
    .single();

  const filePath = `avatars/${id}-${Date.now()}`;

  const { error: uploadError } = await supabase.storage
    .from('profile')
    .upload(filePath, file.buffer, { contentType: file.mimetype, upsert: true });

  if (uploadError) return res.status(500).json({ message: uploadError.message });

  const { data: urlData } = supabase.storage.from('profile').getPublicUrl(filePath);
  const publicUrl = urlData.publicUrl;

  const { error: dbError } = await supabase
    .from('users')
    .update({ profile_url: publicUrl })
    .eq('id', id);

  if (dbError) return res.status(500).json({ message: dbError.message });

  // ✅ ONLY ADDED THIS AUDIT
  if (req.user?.id) {
    createAuditLog({
      user_id: req.user.id,
      user_email: req.user.email,
      user_role: req.user.role,
      action: "UPDATE",
      module: "USER_PROFILE",
      description: `Updated avatar for user ${userData?.email || id}`,
    }).catch(err => console.error('Audit log error:', err));
  }

  res.json({ message: 'Avatar updated', profile_url: publicUrl });
});

// GET user profile
router.get('/users/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, middle_name, email, contact_number, profile_url')
    .eq('id', req.params.id)
    .single();

  if (error) return res.status(404).json({ message: 'User not found' });

  // ✅ ONLY ADDED THIS AUDIT
  if (req.user?.id && req.user.id !== req.params.id) {
    createAuditLog({
      user_id: req.user.id,
      user_email: req.user.email,
      user_role: req.user.role,
      action: "VIEW",
      module: "USER_MANAGEMENT",
      description: `Viewed user details: ${data.email} (${data.first_name || ''} ${data.last_name || ''})`,
    }).catch(err => console.error('Audit log error:', err));
  }

  res.json({ user: data });
});

// PUT update user profile
router.put('/users/:id', async (req, res) => {
  const { first_name, last_name, middle_name, contact_number } = req.body;
  
  // ✅ ONLY ADDED THIS - get old data for audit
  const { data: oldUserData } = await supabase
    .from('users')
    .select('email, first_name, last_name, contact_number')
    .eq('id', req.params.id)
    .single();
  
  const { data, error } = await supabase
    .from('users')
    .update({ first_name, last_name, middle_name, contact_number, updated_at: new Date() })
    .eq('id', req.params.id)
    .select('id, first_name, last_name, middle_name, email, contact_number, profile_url')
    .single();

  if (error) return res.status(500).json({ message: error.message });
  
  // ✅ ONLY ADDED THIS AUDIT
  if (req.user?.id && req.user.id === req.params.id) {
    const changes = [];
    if (oldUserData?.first_name !== first_name) changes.push(`first_name: ${oldUserData?.first_name} → ${first_name}`);
    if (oldUserData?.last_name !== last_name) changes.push(`last_name: ${oldUserData?.last_name} → ${last_name}`);
    if (oldUserData?.contact_number !== contact_number) changes.push(`contact: ${oldUserData?.contact_number} → ${contact_number}`);
    
    createAuditLog({
      user_id: req.user.id,
      user_email: req.user.email,
      user_role: req.user.role,
      action: "UPDATE",
      module: "USER_PROFILE",
      description: `Updated own profile. Changes: ${changes.join(', ') || 'No changes'}`,
    }).catch(err => console.error('Audit log error:', err));
  }
  
  res.json({ user: data });
});


// In userRoutes.js - Keep only this version (remove the other one)

// Password change endpoint with strong password requirements
router.post("/change-password", async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        success: false,
        message: "Not authenticated" 
      });
    }
    
    // Validate input
    if (!current_password || !new_password) {
      return res.status(400).json({ 
        success: false,
        message: "Current password and new password are required" 
      });
    }
    
    // Strong password validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;
    
    if (!passwordRegex.test(new_password)) {
      return res.status(400).json({ 
        success: false,
        message: "Password must meet the following requirements: at least 12 characters, 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (@$!%*?&)" 
      });
    }
    
    // First, verify the current password by attempting to sign in
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: req.user.email,
      password: current_password,
    });
    
    if (signInError) {
      return res.status(401).json({ 
        success: false,
        message: "Current password is incorrect" 
      });
    }
    
    // Update password using Supabase auth
    const { error: updateError } = await supabase.auth.updateUser({
      password: new_password
    });
    
    if (updateError) {
      console.error("Supabase password update error:", updateError);
      return res.status(400).json({ 
        success: false,
        message: updateError.message || "Failed to update password" 
      });
    }
    
    // Log the password change for audit
    await createAuditLog({
      user_id: req.user.id,
      user_email: req.user.email,
      user_role: req.user.role,
      action: "UPDATE",
      module: "USER_PROFILE",
      description: "Changed password"
    });
    
    res.json({ 
      success: true,
      message: "Password updated successfully" 
    });
    
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ 
      success: false,
      message: "Internal server error" 
    });
  }
});

export default router;