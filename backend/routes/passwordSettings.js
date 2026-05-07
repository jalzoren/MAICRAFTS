import express from "express";
import supabase from "../supabaseClient.js";
import { createAuditLog } from "../services/auditService.js";

const router = express.Router();

// ========== AUTH MIDDLEWARE ==========
router.use(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log('🔐 [passwordSettings] Auth Header:', authHeader ? 'Present' : 'Missing');

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
      
      const userRole = dbUser?.role || 'CUSTOMER';
      
      req.user = {
        id: user.id,
        email: user.email,
        role: userRole,
        name: dbUser ? `${dbUser.first_name || ''} ${dbUser.last_name || ''}`.trim() : user.user_metadata?.name || user.email
      };
      
      console.log('✅ [passwordSettings] Authenticated user:', {
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
});
// ========== END AUTH MIDDLEWARE ==========

// Helper function to get current password settings
async function getCurrentPasswordSettings() {
  try {
    const { data, error } = await supabase
      .from("password_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("Error fetching password settings:", err.message);
    return null;
  }
}

router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("password_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error) throw error;

      // ✅ VIEW AUDIT LOG (fire and forget)
      if (req.user?.id) {
        createAuditLog({
          user_id: req.user.id,
          user_email: req.user.email,
          user_role: req.user.role,
          action: "VIEW",
          module: "SETTINGS",
          description: "Viewed password complexity settings",
        }).catch(err => console.error('Audit log error:', err));
      }

    res.json(data);
  } catch (err) {
    console.error("GET error:", err.message);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

router.post("/", async (req, res) => {
    const s = req.body;
  
    try {
      const oldSettings = await getCurrentPasswordSettings();
      const { error } = await supabase
        .from("password_settings")
        .upsert({
          id: 1, // 🔥 important
          min_length: s.minLength,
          require_uppercase: s.requireUppercase,
          uppercase_min_count: s.uppercaseMinCount,
          require_lowercase: s.requireLowercase,
          lowercase_min_count: s.lowercaseMinCount,
          require_number: s.requireNumber,
          number_min_count: s.numberMinCount,
          require_special_char: s.requireSpecialChar,
          special_char_min_count: s.specialCharMinCount,
          special_char_set: s.specialCharSet,
          expires_in_days: s.expiresInDays
        });
  
      if (error) throw error;

        // ✅ UPDATE AUDIT LOG
    if (req.user?.id) {
      // Build description of changes
      const changes = [];
      if (oldSettings?.min_length !== s.minLength) changes.push(`minLength: ${oldSettings?.min_length || 8} → ${s.minLength}`);
      if (oldSettings?.require_uppercase !== s.requireUppercase) changes.push(`requireUppercase: ${oldSettings?.require_uppercase} → ${s.requireUppercase}`);
      if (oldSettings?.require_lowercase !== s.requireLowercase) changes.push(`requireLowercase: ${oldSettings?.require_lowercase} → ${s.requireLowercase}`);
      if (oldSettings?.require_number !== s.requireNumber) changes.push(`requireNumber: ${oldSettings?.require_number} → ${s.requireNumber}`);
      if (oldSettings?.require_special_char !== s.requireSpecialChar) changes.push(`requireSpecialChar: ${oldSettings?.require_special_char} → ${s.requireSpecialChar}`);
      if (oldSettings?.expires_in_days !== s.expiresInDays) changes.push(`expiresInDays: ${oldSettings?.expires_in_days || 0} → ${s.expiresInDays}`);
      
      await createAuditLog({
        user_id: req.user.id,
        user_email: req.user.email,
        user_role: req.user.role,
        action: "UPDATE",
        module: "SETTINGS",
        description: `Updated password complexity settings. Changes: ${changes.join(', ') || 'All settings updated'}`,
      });
      console.log('✅ Password settings audit log created');
    }
  
      res.json({ success: true });
    } catch (err) {
      console.error("POST error:", err.message);

      // ✅ ERROR AUDIT LOG
    if (req.user?.id) {
      await createAuditLog({
        user_id: req.user.id,
        user_email: req.user.email,
        user_role: req.user.role,
        action: "ERROR",
        module: "SETTINGS",
        description: `Failed to save password settings: ${err.message}`,
      }).catch(e => console.error('Audit error:', e));
    }


      res.status(500).json({ error: "Failed to save settings" });
    }
  });

export default router;