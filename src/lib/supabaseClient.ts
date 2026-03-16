import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Initialize the Supabase client for browser environments with automatic cookie management
export const supabase = createBrowserClient(
  supabaseUrl,
  supabaseAnonKey
);
