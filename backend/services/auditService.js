import supabase from '../supabaseClient.js';

export const createAuditLog = async ({
  user_id,
  user_email,
  user_role,
  action,
  module,
  description,
}) => {
  const payload = {
    user_id: user_id && user_id.trim() !== "" ? user_id : null,
    user_email: user_email || "unknown@email.com",
    user_role: user_role || "UNKNOWN",
    action,
    module,
    description,
  };

  const { error } = await supabase
    .from("audit_logs_central")
    .insert([payload]);

  if (error) {
    console.error("Audit Log Error:", error.message);
  }
};