import { supabase } from "./supabase";

export type UserRole = "submitter" | "property_admin" | "corporate_admin";

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  hotel_id: string | null;
}

export async function getCurrentProfile(): Promise<UserProfile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, hotel_id")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    // Fallback if profile row is missing
    return {
      id: user.id,
      email: user.email ?? null,
      full_name: user.user_metadata?.full_name ?? null,
      role: "submitter",
      hotel_id: null,
    };
  }

  return profile as UserProfile;
}

export function isCorporate(profile: UserProfile | null): boolean {
  return profile?.role === "corporate_admin";
}
