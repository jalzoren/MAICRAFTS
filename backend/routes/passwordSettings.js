import express from "express";
import supabase from "../supabaseClient.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("password_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error("GET error:", err.message);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

router.post("/", async (req, res) => {
    const s = req.body;
  
    try {
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
  
      res.json({ success: true });
    } catch (err) {
      console.error("POST error:", err.message);
      res.status(500).json({ error: "Failed to save settings" });
    }
  });

export default router;