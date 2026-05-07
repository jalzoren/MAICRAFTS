// backend/services/auditService.js
import supabase from '../supabaseClient.js';

export const createAuditLog = async ({
  user_id,
  user_email,
  user_role,
  action,
  module,
  description,
}) => {
  console.log('🔍 [AUDIT] Attempting to create audit log:', {
    user_id,
    user_email,
    user_role,
    action,
    module,
    description: description?.substring(0, 50)
  });

  const payload = {
    user_id: user_id && user_id.trim() !== "" ? user_id : null,
    user_email: user_email || "unknown@email.com",
    user_role: user_role || "UNKNOWN",
    action: action?.toUpperCase() || "UNKNOWN",
    module: module?.toUpperCase() || "UNKNOWN",
    description: description || `${action} ${module}`,
    created_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase
      .from("audit_logs_central")
      .insert([payload])
      .select();

    if (error) {
      console.error("❌ [AUDIT] Supabase Error:", error.message);
      console.error("❌ [AUDIT] Error code:", error.code);
      console.error("❌ [AUDIT] Error details:", error.details);
      return false;
    }

    console.log("✅ [AUDIT] Log created successfully:", data);
    return true;
  } catch (err) {
    console.error("❌ [AUDIT] Exception:", err.message);
    return false;
  }
};