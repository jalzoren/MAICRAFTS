import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;

// normal public key
const supabaseKey = process.env.SUPABASE_KEY;

// admin service key (IMPORTANT)
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables");
}

// normal client (frontend-safe)
const supabase = createClient(supabaseUrl, supabaseKey);

// admin client (backend-only)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export default supabase;
export { supabase, supabaseAdmin };