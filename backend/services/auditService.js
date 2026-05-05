import supabase from '../supabaseClient.js';

export const createAuditLog = async ({
  user_id,
  user_email,
  user_role,
  action,
  module,
  description,
}) => {
  const { error } = await supabase
    .from("audit_logs_central")
    .insert([
      {
        user_id,
        user_email,
        user_role,
        action,
        module,
        description,
      },
    ]);

  if (error) {
    console.error("Audit Log Error:", error.message);
  }
};