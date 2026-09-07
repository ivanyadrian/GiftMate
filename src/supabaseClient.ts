import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Hiányzó Supabase környezeti változók!");
}

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "");

if (typeof window !== "undefined") {
  (window as any).supabase = supabase;
}
