// D:\MAICRAFTS\backend\supabaseClient.js
import { createClient } from '@supabase/supabase-js'; // ✅ ES module import

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default supabase; // ✅ default export