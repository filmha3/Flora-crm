import { createClient } from "@supabase/supabase-js";

// Public by design: this is the publishable (anon) key, safe to ship in the
// bundle. It can only do what the RLS policies on each table allow.
const SUPABASE_URL = "https://grbtuoaoygpbtjrmxbkp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ZsdjW98Vn889i66yyh3pEw_5QIk0qTN";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
