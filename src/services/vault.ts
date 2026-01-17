import { supabase } from "./supabase";
import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system/legacy";
import { encrypt, decrypt } from "../utils/encryption"; // Bu yardımcıların mobil tarafta da olması gerekir

// 1. Listeyi Getir (Yetkiye ve Aileye Göre)
export async function getVaultItems() {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { items: [] };

    // Kullanıcının profil bilgilerini al
    const { data: profile } = await supabase
      .from("profiles")
      .select("family_id, role, id")
      .eq("id", user.id)
      .single();

    if (!profile || !profile.family_id) return { items: [] };

    const isAdmin = ["owner", "admin"].includes(profile.role);

    // Aileye ait tüm kasa verilerini çek
    const { data: allItems, error } = await supabase
      .from("vault_items")
      .select("*")
      .eq("family_id", profile.family_id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!allItems) return { items: [] };

    // Mobil tarafta filtreleme mantığı
    const filteredItems = allItems.filter((item: any) => {
      if (isAdmin) return true; // Admin/Owner her şeyi görür
      if (item.visibility === "family") return true; // Herkese açık
      if (item.visibility === "member" && item.assigned_to?.includes(user.id))
        return true; // Kişiye özel
      return false; // parents modundakiler çocuklara gizli
    });

    return { items: filteredItems };
  } catch (error) {
    console.error("Vault listeleme hatası:", error);
    return { items: [], error };
  }
}

// 2. Şifreli Veriyi Çöz
export async function revealSecret(itemId: string) {
  try {
    const { data: item, error } = await supabase
      .from("vault_items")
      .select("encrypted_data")
      .eq("id", itemId)
      .single();

    if (error || !item) return { error: "Veri bulunamadı" };

    // utils/encryption içindeki decrypt fonksiyonunu kullanır
    const secret = decrypt(item.encrypted_data);
    return { secret };
  } catch (e) {
    return { error: "Şifre çözülemesi başarısız." };
  }
}

// 3. Dosya İçin Geçerli Link Oluştur
export async function getFileUrl(path: string) {
  try {
    const { data, error } = await supabase.storage
      .from("vault_files")
      .createSignedUrl(path, 3600); // 1 saatlik geçici link

    if (error) throw error;
    return { url: data.signedUrl };
  } catch (error) {
    return { error: "Dosya erişim hatası" };
  }
}

// 4. Yeni Kasa Öğesi Ekle (Metin veya Dosya)
export async function addVaultItem(itemData: {
  title: string;
  category: string;
  type: "text" | "file";
  visibility: string;
  value?: string;
  file?: {
    uri: string;
    name?: string;
    mimeType?: string;
  };
  assignedTo?: string[];
}) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from("profiles")
      .select("family_id, role")
      .eq("id", user?.id)
      .single();

    if (!profile || !["owner", "admin"].includes(profile.role)) {
      return { error: "Sadece ebeveynler ekleme yapabilir." };
    }

    let dbData: any = {
      family_id: profile.family_id,
      title: itemData.title,
      category: itemData.category,
      type: itemData.type,
      visibility: itemData.visibility,
      assigned_to: itemData.assignedTo || null,
      encrypted_data: "",
    };

    // Metin şifreleme
    if (itemData.type === "text" && itemData.value) {
      dbData.encrypted_data = encrypt(itemData.value);
    }
    // Dosya yükleme mantığı (React Native)
    else if (itemData.type === "file" && itemData.file?.uri) {
      const file = itemData.file;
      const rawName = (file.name || `file-${Date.now()}`).replace(
        /[^a-zA-Z0-9._-]/g,
        "-"
      );
      const filePath = `${profile.family_id}/${Date.now()}-${rawName}`;
      const base64 = await FileSystem.readAsStringAsync(file.uri, {
        encoding: "base64",
      });
      const mimeType = file.mimeType || "application/octet-stream";

      const { error: uploadError } = await supabase.storage
        .from("vault_files")
        .upload(filePath, decode(base64), { contentType: mimeType });

      if (uploadError) throw uploadError;

      dbData.file_path = filePath;
      dbData.mime_type = mimeType;
      dbData.encrypted_data = "FILE_ENCRYPTED";
    }

    const { error: insertError } = await supabase
      .from("vault_items")
      .insert(dbData);
    if (insertError) throw insertError;

    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

// 5. Kasa Öğesini Sil
export async function deleteVaultItem(id: string, filePath?: string) {
  try {
    const { error: dbError } = await supabase
      .from("vault_items")
      .delete()
      .eq("id", id);
    if (dbError) throw dbError;

    if (filePath) {
      await supabase.storage.from("vault_files").remove([filePath]);
    }

    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
