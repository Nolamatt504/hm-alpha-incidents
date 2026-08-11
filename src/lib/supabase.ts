import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://jwztnydfwvivubmpgeoh.supabase.co";

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3enRueWRmd3ZpdnVibXBnZW9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNzY4NDQsImV4cCI6MjEwMTk1Mjg0NH0.yijHIRAWfgBrBDXe5Ll9Yj-hRAdc-f3Ur0OrDH6yDWY";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
