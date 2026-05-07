import express from "express";
import supabase from '../supabaseClient.js';
import { fetchAuditLogs, recordAuditLog } from "../utils/auditLogger.js";

const router = express.Router();

router.get("/admin/audit-logs", async (_req, res) => {
  try {
    const logs = await fetchAuditLogs();
    res.json({ data: logs, count: logs.length });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

// ========================================
// NEW CENTRAL AUDIT LOGS
// ========================================

router.get("/admin/system-audit-logs", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("audit_logs_central")
      .select(`
        id,
        user_id,
        user_email,
        user_role,
        action,
        module,
        description,
        created_at
      `)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    // rename user_email -> user_name
    const formattedLogs = (data || []).map((log) => ({
      ...log,
      user_name: log.user_email,
    }));

    res.json({
      success: true,
      data: formattedLogs,
      count: formattedLogs.length,
    });
  } catch (error) {
    console.error("Error fetching system audit logs:", error);

    res.status(500).json({
      success: false,
      error: "Failed to fetch system audit logs",
    });
  }
});

router.post("/audit-logs", async (req, res) => {
  const {
    user_id: userId,
    user_name: userName,
    user_role: userRole,
    action,
    module,
    description,
  } = req.body || {};

  if (!userId || !action) {
    return res.status(400).json({ error: "user_id and action are required" });
  }

  try {
    const log = await recordAuditLog({
      userId,
      userName,
      userRole,
      action,
      module,
      description,
    });

    res.status(201).json({ message: "Audit log recorded", data: log });
  } catch (error) {
    console.error("Error creating audit log:", error);
    res.status(500).json({ error: "Failed to create audit log" });
  }
});




export default router;