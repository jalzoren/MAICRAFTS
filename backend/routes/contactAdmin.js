import express from "express";
import { v4 as uuidv4 } from "uuid";
import supabase from "../supabaseClient.js";
import { createAuditLog } from "../services/auditService.js";

const router = express.Router();

console.log("🔥 contactAdmin.js LOADED");

// ========== AUTH MIDDLEWARE FOR PROTECTED ROUTES ==========
const authenticateUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log('🔐 [contactAdmin] Auth Header:', authHeader ? 'Present' : 'Missing');

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
      const { data: dbUser, error: dbError } = await supabase
        .from("users")
        .select("role, first_name, last_name")
        .eq("email", user.email)
        .single();
      
      if (dbError) {
        console.error('Error fetching user from database:', dbError);
      }
      
      const userRole = dbUser?.role || 'CUSTOMER';
      
      req.user = {
        id: user.id,
        email: user.email,
        role: userRole,
        name: dbUser ? `${dbUser.first_name || ''} ${dbUser.last_name || ''}`.trim() : user.user_metadata?.name || user.email
      };
      
      console.log('✅ [contactAdmin] Authenticated user:', {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role
      });
    } else {
      req.user = null;
    }
  } catch (error) {
    console.error('Token verification error:', error);
    req.user = null;
  }

  next();
};
// ========== END AUTH MIDDLEWARE ==========

// POST - Submit seller request (PUBLIC - NO AUTH NEEDED)
router.post("/contact-admin", async (req, res) => {
  console.log("🔥 CONTACT ADMIN ROUTE HIT");
  const { first_name, middle_name, last_name, email, message } = req.body;

  if (!first_name || !last_name || !email || !message) {
    return res.status(400).json({
      error: "First name, last name, email, and message are required"
    });
  }

  try {
    const { data, error } = await supabase
      .from("contact_admin_requests")
      .insert([
        {
          id: uuidv4(),
          first_name,
          middle_name,
          last_name,
          email,
          message,
          status: "pending",
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      console.error("Supabase insert error:", error);
      return res.status(500).json({ error: "Failed to submit request" });
    }

    const request = data?.[0];

    // ✅ AUDIT LOG
    await createAuditLog({
      user_id: null,
      user_email: email,
      user_role: "CUSTOMER",
      action: "CREATE",
      module: "SELLER_REQUEST",
      description: "User submitted seller request",
    });

    return res.status(201).json({
      message: "Request sent successfully",
      requestId: request?.id
    });

  } catch (error) {
    console.error("Unexpected error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET all contact admin requests (PROTECTED - requires authentication)
router.get("/contact-admin", authenticateUser, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("contact_admin_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // ✅ AUDIT LOG - Uses req.user.role
    await createAuditLog({
      user_id: req.user?.id || null,
      user_email: req.user?.email || "admin@system",
      user_role: req.user?.role || "ADMIN",
      action: "VIEW",
      module: "SELLER_REQUEST",
      description: "Admin viewed seller requests list",
    });

    res.json(data);
  } catch (err) {
    console.error("Error fetching requests:", err);
    res.status(500).json({ error: "Failed to fetch requests" });
  }
});

// PUT - Approve seller request (PROTECTED - requires authentication)
router.put("/contact-admin/:id/approve", authenticateUser, async (req, res) => {
  const { id } = req.params;

  try {
    // 1. get request first
    const { data: request, error: fetchError } = await supabase
      .from("contact_admin_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !request) {
      return res.status(404).json({ error: "Request not found" });
    }

    // 2. update status
    const { error } = await supabase
      .from("contact_admin_requests")
      .update({ status: "approved" })
      .eq("id", id);

    if (error) {
      return res.status(500).json({ error: "Failed to approve request" });
    }

    // 3. ✅ FIXED AUDIT LOG - Now uses req.user.role
    await createAuditLog({
      user_id: req.user?.id || null,
      user_email: req.user?.email || "admin@system",
      user_role: req.user?.role || "ADMIN",  // ← FIXED: Uses actual admin role
      action: "UPDATE",
      module: "SELLER_REQUEST",
      description: `Approved seller request for ${request.email}`,
    });

    res.json({ message: "Request approved" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;