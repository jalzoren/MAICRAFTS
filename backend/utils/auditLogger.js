import { supabaseAdmin } from "../supabaseClient.js";

const AUDIT_LOG_TABLE = "audit_logs";

const buildAuditLogPayload = ({
  userId,
  userName,
  userRole,
  action,
  module,
  description,
}) => ({
  user_id: userId,
  user_name: userName || "Unknown User",
  user_role: userRole || "customer",
  action: String(action || "UNKNOWN").toUpperCase(),
  module: module || "General",
  description: description || "",
  created_at: new Date().toISOString(),
});

export const recordAuditLog = async ({
  userId,
  userName,
  userRole,
  action,
  module,
  description,
}) => {
  const payload = buildAuditLogPayload({
    userId,
    userName,
    userRole,
    action,
    module,
    description,
  });

  const { data, error } = await supabaseAdmin
    .from(AUDIT_LOG_TABLE)
    .insert([payload])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const fetchAuditLogs = async () => {
  const { data, error } = await supabaseAdmin
    .from(AUDIT_LOG_TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
};