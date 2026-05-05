import express from "express";
import { v4 as uuidv4 } from "uuid";
import supabase from "../supabaseClient.js";
import { createAuditLog } from "../services/auditService.js";

const router = express.Router();

router.post("/contact-admin", async (req, res) => {
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

    // ✅ AUDIT LOG (ONLY AFTER SUCCESS)
    await createAuditLog({
      user_id: null,
      user_name: `${first_name} ${last_name}`,
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


// GET all contact admin requests
router.get("/contact-admin", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("contact_admin_requests")
        .select("*")
        .order("created_at", { ascending: false });
  
      if (error) throw error;
  
      res.json(data);
    } catch (err) {
      console.error("Error fetching requests:", err);
      res.status(500).json({ error: "Failed to fetch requests" });
    }
  });

  router.put("/contact-admin/:id/approve", async (req, res) => {
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
  
      // 3. audit log AFTER success
      await createAuditLog({
        user_id: null,
        user_name: `${request.first_name} ${request.last_name}`,
        user_role: "CUSTOMER",
        action: "UPDATE",
        module: "SELLER_REQUEST",
        description: "Seller request approved by admin",
      });
  
      res.json({ message: "Request approved" });
  
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  });

export default router;