import express from "express";
import { v4 as uuidv4 } from "uuid";
import supabase from "../supabaseClient.js";

const router = express.Router();

router.post("/contact-admin", async (req, res) => {
  const { name, email, message } = req.body;

  // 1️⃣ Validation
  if (!name || !email || !message) {
    return res.status(400).json({
      error: "Name, email, and message are required"
    });
  }

  let requestId;

  try {
    // 2️⃣ Insert request into Supabase
    const { data, error } = await supabase
      .from("contact_admin_requests")
      .insert([
        {
          id: uuidv4(),
          name,
          email,
          message,
          status: "pending",
          created_at: new Date()
        }
      ])
      .select();

    if (error) {
      console.error("Supabase insert error:", error);
      return res.status(500).json({
        error: "Failed to submit request"
      });
    }

    requestId = data?.[0]?.id;

    return res.status(201).json({
      message: "Request sent successfully",
      requestId
    });

  } catch (error) {
    console.error("Unexpected error:", error);
    return res.status(500).json({
      error: "Internal server error"
    });
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
  
    const { error } = await supabase
      .from("contact_admin_requests")
      .update({ status: "approved" })
      .eq("id", id);
  
    if (error) {
      return res.status(500).json({ error: "Failed to approve request" });
    }
  
    res.json({ message: "Request approved" });
  });

export default router;