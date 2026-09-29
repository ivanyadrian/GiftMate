import { createClient } from "@supabase/supabase-js";

/**
 * Supabase Client Configuration
 *
 * Initializes the singleton Supabase client using environment variables:
 * - `VITE_SUPABASE_URL`: The project API endpoint.
 * - `VITE_SUPABASE_ANON_KEY`: Public anonymous API key with Row Level Security (RLS).
 *
 * Exposes the client on `window.supabase` during local development for debugging purposes.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Hiányzó Supabase környezeti változók!");
}

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "");

// Expose client globally in development mode for easy browser console inspection
if (import.meta.env.DEV && typeof window !== "undefined") {
  (window as any).supabase = supabase;
}
