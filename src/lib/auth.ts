import { supabase } from "./supabase";

export type UserRole =
  | "submitter"
  | "property_hr"
  | "property_admin"
  | "corporate_admin";

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  hotel_id: string | null;
  is_active: boolean;
}

export async function getCurrentProfile(): Promise<UserProfile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, hotel_id, is_active")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    return null;
  }

  return {
    ...(profile as UserProfile),
    is_active: profile.is_active !== false,
  };
}

export function isCorporate(profile: UserProfile | null): boolean {
  return profile?.role === "corporate_admin";
}

export function isPropertyAdmin(profile: UserProfile | null): boolean {
  return profile?.role === "property_admin";
}

export function isPropertyHr(profile: UserProfile | null): boolean {
  return profile?.role === "property_hr";
}

/** Hotel Admin or Property HR */
export function isPropertyStaff(profile: UserProfile | null): boolean {
  return isPropertyAdmin(profile) || isPropertyHr(profile);
}

/** Can open Admin page and manage users */
export function canManageUsers(profile: UserProfile | null): boolean {
  return isCorporate(profile) || isPropertyAdmin(profile);
}

/** Can change report status and investigation notes */
export function canManageReports(profile: UserProfile | null): boolean {
  return (
    isCorporate(profile) || isPropertyAdmin(profile) || isPropertyHr(profile)
  );
}

/** Only Hotel Admin can send a report to corporate */
export function canSendToCorporate(profile: UserProfile | null): boolean {
  return isPropertyAdmin(profile);
}

export const ROLE_LABELS: Record<UserRole, string> = {
  submitter: "Submitter",
  property_hr: "Property HR",
  property_admin: "Hotel Admin",
  corporate_admin: "Corporate Admin",
};
