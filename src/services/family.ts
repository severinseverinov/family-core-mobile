import { supabase } from "./supabase";

// src/services/family.ts içindeki interface güncellemesi
export interface FamilyMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
  avatar_url?: string;
  phone?: string;
  birth_date?: string;
  blood_type?: string;
  allergies?: string;
  gender?: string;
  // Yeni Alanlar:
  school?: string;
  height?: string;
  weight?: string;
  chronic_diseases?: string;
  surgeries?: string;
  past_illnesses?: string;
  vaccinations?: string;
}

export interface Family {
  id: string;
  name: string;
  image_url?: string;
}

export async function getFamilyMembers() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { members: [] };

  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id")
    .eq("id", user.id)
    .single();

  if (!profile?.family_id) return { members: [] };

  const { data: members } = await supabase
    .from("profiles")
    .select("*")
    .eq("family_id", profile.family_id)
    .order("role", { ascending: false });

  return { members: members || [] };
}

export async function getFamilyDetails() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { family: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id")
    .eq("id", user.id)
    .single();
  if (!profile?.family_id) return { family: null };

  const { data: family } = await supabase
    .from("families")
    .select("id, name, image_url")
    .eq("id", profile.family_id)
    .single();

  return { family };
}

export async function createFamily(familyName: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: family, error: familyError } = await supabase
    .from("families")
    .insert({ name: familyName })
    .select()
    .single();

  if (familyError) return { error: familyError.message };

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ family_id: family.id, role: "owner" })
    .eq("id", user.id);

  if (profileError) return { error: profileError.message };

  return { data: family, error: null };
}

export async function createInvitation(email: string, role: string = "member") {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.family_id) return { error: "No family" };
  if (!["owner", "admin"].includes(profile.role || ""))
    return { error: "Unauthorized" };

  const token = crypto.randomUUID();
  const { error } = await supabase.from("invitations").insert({
    family_id: profile.family_id,
    email: email.toLowerCase(),
    token: token,
    invited_by: user.id,
    role: role,
    status: "pending",
  });

  if (error) return { error: error.message };

  return { success: true, token };
}

export async function updateMemberDetails(
  memberId: string,
  updates: Partial<FamilyMember>
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: requester } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isSelf = user.id === memberId;
  const isAdmin = ["owner", "admin"].includes(requester?.role || "");

  if (!isSelf && !isAdmin) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", memberId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function removeMember(memberId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("role, family_id")
    .eq("id", user.id)
    .single();

  if (!myProfile) return { error: "Profile not found" };
  if (!["owner", "admin"].includes(myProfile.role || ""))
    return { error: "Unauthorized" };

  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("role, family_id")
    .eq("id", memberId)
    .single();

  if (!targetProfile) return { error: "Member not found" };
  if (targetProfile.role === "owner") return { error: "Cannot remove owner" };
  if (targetProfile.family_id !== myProfile.family_id)
    return { error: "Not in same family" };

  const { error } = await supabase
    .from("profiles")
    .update({ family_id: null, role: "member" })
    .eq("id", memberId);

  if (error) return { error: error.message };
  return { success: true };
}
