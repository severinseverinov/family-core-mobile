import { supabase } from "./supabase";
import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";

type CreateFamilyOptions = {
  avatarUri?: string | null;
  autoAvatar?: boolean;
};

type UpdateFamilySettingsInput = {
  familyId: string;
  name?: string;
  avatarUri?: string | null;
};

function getInitials(name: string) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "FC";
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] || "" : "";
  return (first + last).toUpperCase() || "FC";
}

function pickColor(seed: string) {
  const colors = ["#0ea5e9", "#8b5cf6", "#22c55e", "#f59e0b", "#ef4444"];
  let hash = 0;
  for (let i = 0; i < seed.length; i++)
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return colors[hash % colors.length];
}

// NOTE: Don't use SVG for avatars here; RN Image/ImageBackground won't render SVG reliably.

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

export async function getFamilyMottosSample(limit: number = 30) {
  try {
    const { data, error } = await supabase
      .from("family_mottos")
      .select("text")
      .limit(limit);
    if (error) return { mottos: [], error: error.message };
    return { mottos: data || [], error: null };
  } catch (error: any) {
    return { mottos: [], error: error.message };
  }
}

export async function createFamily(
  familyName: string,
  options?: CreateFamilyOptions
) {
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

  // Optional family avatar upload (user-selected) or auto-generated PNG
  try {
    const avatarUri = options?.avatarUri || null;
    const autoAvatar = options?.autoAvatar === true;

    if (avatarUri) {
      const fileExt = avatarUri.split(".").pop() || "jpg";
      const filePath = `${family.id}/avatar-${Date.now()}.${fileExt}`;
      const base64 = await FileSystem.readAsStringAsync(avatarUri, {
        encoding: "base64",
      });
      const { error: uploadError } = await supabase.storage
        .from("family-avatars")
        .upload(filePath, decode(base64), { contentType: `image/${fileExt}` });
      if (uploadError) throw uploadError;
      const { data: signed } = await supabase.storage
        .from("family-avatars")
        .createSignedUrl(filePath, 60 * 60 * 24 * 365);
      const signedUrl = signed?.signedUrl;
      const publicUrl = supabase.storage
        .from("family-avatars")
        .getPublicUrl(filePath).data.publicUrl;
      await supabase
        .from("families")
        .update({ image_url: signedUrl || publicUrl })
        .eq("id", family.id);
    } else if (autoAvatar) {
      // Generate a PNG avatar and upload it
      const bg = pickColor(family.id).replace("#", "");
      const url = `https://ui-avatars.com/api/?name=${encodeURIComponent(
        familyName
      )}&background=${bg}&color=ffffff&size=256&format=png&bold=true`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Auto avatar download failed");
      const arrayBuffer = await res.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const filePath = `${family.id}/avatar-${Date.now()}.png`;
      const { error: autoUploadError } = await supabase.storage
        .from("family-avatars")
        .upload(filePath, bytes, { contentType: "image/png" });
      if (autoUploadError) throw autoUploadError;
      const { data: signed } = await supabase.storage
        .from("family-avatars")
        .createSignedUrl(filePath, 60 * 60 * 24 * 365);
      const signedUrl = signed?.signedUrl;
      const publicUrl = supabase.storage
        .from("family-avatars")
        .getPublicUrl(filePath).data.publicUrl;
      await supabase
        .from("families")
        .update({ image_url: signedUrl || publicUrl })
        .eq("id", family.id);
    }
  } catch (e) {
    // Non-blocking: family creation should succeed even if avatar upload fails
    console.warn("Family avatar upload failed:", e);
  }

  return { data: family, error: null };
}

function getExtFromUri(uri: string) {
  const clean = uri.split("?")[0];
  const ext = clean.includes(".") ? clean.split(".").pop() : null;
  return (ext || "jpg").toLowerCase();
}

function getContentTypeByExt(ext: string) {
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "heic" || ext === "heif") return "image/heic";
  return "image/jpeg";
}

export async function updateFamilySettings(input: UpdateFamilySettingsInput) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const { data: profile } = await supabase
      .from("profiles")
      .select("family_id, role")
      .eq("id", user.id)
      .single();

    if (!profile?.family_id) return { success: false, error: "No family" };
    if (profile.family_id !== input.familyId)
      return { success: false, error: "Unauthorized" };
    if (!["owner", "admin"].includes(profile.role || ""))
      return { success: false, error: "Unauthorized" };

    let imageUrl: string | undefined = undefined;
    if (input.avatarUri) {
      const ext = getExtFromUri(input.avatarUri);
      const filePath = `${input.familyId}/avatar-${Date.now()}.${ext}`;
      const base64 = await FileSystem.readAsStringAsync(input.avatarUri, {
        encoding: "base64",
      });
      const { error: uploadError } = await supabase.storage
        .from("family-avatars")
        .upload(filePath, decode(base64), {
          contentType: getContentTypeByExt(ext),
        });
      if (uploadError) {
        return { success: false, error: uploadError.message };
      }
      const { data: signed } = await supabase.storage
        .from("family-avatars")
        .createSignedUrl(filePath, 60 * 60 * 24 * 365);
      const signedUrl = signed?.signedUrl;
      const publicUrl = supabase.storage
        .from("family-avatars")
        .getPublicUrl(filePath).data.publicUrl;
      imageUrl = signedUrl || publicUrl;
    }

    const updates: any = {};
    if (typeof input.name === "string" && input.name.trim().length > 0) {
      updates.name = input.name.trim();
    }
    if (imageUrl) updates.image_url = imageUrl;

    if (Object.keys(updates).length === 0) {
      return { success: true };
    }

    const { error } = await supabase
      .from("families")
      .update(updates)
      .eq("id", input.familyId);

    return { success: !error, error: error?.message, imageUrl };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
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
