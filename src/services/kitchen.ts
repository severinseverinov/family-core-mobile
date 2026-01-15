import { supabase } from "./supabase";
import { GoogleGenerativeAI } from "@google/generative-ai";

// AI Yapılandırması (Web sürümü ile uyumlu model ismi)
const genAI = new GoogleGenerativeAI("AIzaSyBoY5YvMmZq_9IbvkSBV4aQkusVpZI5N0Y");

// Yardımcı: Ay Anahtarı (Örn: "2026-01")
function getCurrentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Yardımcı: Bütçeye Harcama Ekle/Çıkar (Web'deki addExpense mantığı)
async function updateKitchenBudget(familyId: string, amount: number) {
  const monthKey = getCurrentMonthKey();

  const { data: current } = await supabase
    .from("kitchen_budgets")
    .select("spent_amount")
    .eq("family_id", familyId)
    .eq("month_key", monthKey)
    .maybeSingle();

  const newSpent = (current?.spent_amount || 0) + amount;

  await supabase.from("kitchen_budgets").upsert(
    {
      family_id: familyId,
      month_key: monthKey,
      spent_amount: newSpent,
    },
    { onConflict: "family_id, month_key" }
  );
}

// 1. Verileri Getir
export async function getInventoryAndBudget() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return { items: [], budget: 0, spent: 0, shoppingList: [], currency: "TL" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id, preferred_currency")
    .eq("id", user.id)
    .single();

  if (!profile?.family_id)
    return { items: [], budget: 0, spent: 0, shoppingList: [], currency: "TL" };

  const monthKey = getCurrentMonthKey();

  const [inv, shop, bud] = await Promise.all([
    supabase
      .from("inventory")
      .select("*")
      .eq("family_id", profile.family_id)
      .order("created_at", { ascending: false }),
    supabase
      .from("shopping_list")
      .select("*")
      .eq("family_id", profile.family_id)
      .order("is_completed", { ascending: true }),
    supabase
      .from("kitchen_budgets")
      .select("budget_limit, spent_amount")
      .eq("family_id", profile.family_id)
      .eq("month_key", monthKey)
      .maybeSingle(),
  ]);

  return {
    items: inv.data || [],
    shoppingList: shop.data || [],
    budget: bud.data?.budget_limit || 0,
    spent: bud.data?.spent_amount || 0,
    currency: profile.preferred_currency || "TL",
  };
}

// 1.a Stok listesine manuel ürün ekleme
export async function addInventoryItem(itemData: {
  product_name: string;
  quantity: string | number;
  price: string | number;
  category?: string;
  unit?: string;
}) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Kullanıcı bulunamadı." };

    const { data: profile } = await supabase
      .from("profiles")
      .select("family_id")
      .eq("id", user.id)
      .single();

    if (!profile?.family_id) return { error: "Aile bilgisi bulunamadı." };

    const productName = itemData.product_name?.trim();
    if (!productName) return { error: "Ürün adı gerekli." };

    const quantity =
      Number(itemData.quantity) > 0 ? Number(itemData.quantity) : 1;
    const unit = itemData.unit?.trim() || "adet";
    const lastPrice = Number(itemData.price) >= 0 ? Number(itemData.price) : 0;
    const category = itemData.category || "Genel";

    const { data: existing } = await supabase
      .from("inventory")
      .select("id, quantity")
      .eq("family_id", profile.family_id)
      .ilike("product_name", productName)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("inventory")
        .update({
          quantity: existing.quantity + quantity,
          last_price: lastPrice,
          unit,
          category,
        })
        .eq("id", existing.id);
      return { success: !error, error: error?.message };
    }

    const { error } = await supabase.from("inventory").insert({
      family_id: profile.family_id,
      product_name: productName,
      quantity,
      unit,
      category,
      last_price: lastPrice,
      added_by: user.id,
      created_at: new Date().toISOString(),
    });

    return { success: !error, error: error?.message };
  } catch (error: any) {
    return { error: error.message };
  }
}

// 1.c Stoktaki ürünü güncelle
export async function updateInventoryItem(
  itemId: string,
  itemData: {
    product_name: string;
    quantity: string | number;
    price: string | number;
    category?: string;
    unit?: string;
  }
) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Kullanıcı bulunamadı." };

    const { data: profile } = await supabase
      .from("profiles")
      .select("family_id")
      .eq("id", user.id)
      .single();

    if (!profile?.family_id) return { error: "Aile bilgisi bulunamadı." };

    const productName = itemData.product_name?.trim();
    if (!productName) return { error: "Ürün adı gerekli." };

    const quantity =
      Number(itemData.quantity) > 0 ? Number(itemData.quantity) : 1;
    const unit = itemData.unit?.trim() || "adet";
    const lastPrice = Number(itemData.price) >= 0 ? Number(itemData.price) : 0;
    const category = itemData.category || "Genel";

    const { error } = await supabase
      .from("inventory")
      .update({
        product_name: productName,
        quantity,
        unit,
        category,
        last_price: lastPrice,
      })
      .eq("id", itemId)
      .eq("family_id", profile.family_id);

    return { success: !error, error: error?.message };
  } catch (error: any) {
    return { error: error.message };
  }
}

// 1.d Stoktaki ürünü sil
export async function deleteInventoryItem(itemId: string) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Kullanıcı bulunamadı." };

    const { data: profile } = await supabase
      .from("profiles")
      .select("family_id")
      .eq("id", user.id)
      .single();

    if (!profile?.family_id) return { error: "Aile bilgisi bulunamadı." };

    const { error } = await supabase
      .from("inventory")
      .delete()
      .eq("id", itemId)
      .eq("family_id", profile.family_id);

    return { success: !error, error: error?.message };
  } catch (error: any) {
    return { error: error.message };
  }
}

// 1.b Alışveriş listesine ürün ekle
export async function addShoppingItem(
  productName: string,
  quantity: number,
  unit: string,
  market?: string,
  isUrgent: boolean = false
) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Kullanıcı bulunamadı." };

    const { data: profile } = await supabase
      .from("profiles")
      .select("family_id")
      .eq("id", user.id)
      .single();

    if (!profile?.family_id) return { error: "Aile bilgisi bulunamadı." };

    const { error } = await supabase.from("shopping_list").insert({
      family_id: profile.family_id,
      product_name: productName,
      quantity,
      unit,
      market: market || null,
      is_urgent: isUrgent,
      is_completed: false,
      added_by: user.id,
      created_at: new Date().toISOString(),
    });

    if (!error && isUrgent) {
      try {
        const { data: members } = await supabase
          .from("profiles")
          .select("id, push_token")
          .eq("family_id", profile.family_id)
          .neq("id", user.id);

        const tokens =
          members
            ?.map((member: any) => member.push_token)
            .filter((token: string) => !!token) || [];

        if (tokens.length > 0) {
          const bodyParts = [`${productName}`, `${quantity} ${unit}`];
          if (market) bodyParts.push(`Market: ${market}`);
          const messages = tokens.map((token: string) => ({
            to: token,
            sound: "default",
            title: "Acil alışveriş",
            body: bodyParts.join(" • "),
            data: { type: "shopping_urgent" },
          }));

          await fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Accept-Encoding": "gzip, deflate",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(messages),
          });
        }
      } catch (notifyError) {
        console.warn("Acil bildirim gönderilemedi:", notifyError);
      }
    }

    return { success: !error, error: error?.message };
  } catch (error: any) {
    return { error: error.message };
  }
}

// 2. AI Fiş Analizi (Mobil için optimize edildi)
export async function analyzeReceiptMobile(base64Image: string) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); // Not: gemini-2.5-flash henüz genel erişimde olmayabilir, stabilite için 1.5-flash önerilir.
    const prompt = `Bu bir market fişi. Lütfen fişteki ürünleri, fiyatları ve toplam tutarı analiz et.
      Sadece saf JSON formatında şu yapıda veri döndür:
      {
        "shop_name": "Market Adı",
        "items": [
          { "name": "Ürün Adı", "category": "Kategori", "quantity": 1, "unit_price": 10.5, "unit": "adet/kg" }
        ],
        "total_amount": 100.50,
        "currency": "TL"
      }`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Image, mimeType: "image/jpeg" } },
    ]);

    const response = await result.response;
    const text = response
      .text()
      .replace(/```json|```/g, "")
      .trim();
    return JSON.parse(text);
  } catch (error) {
    console.error("AI okuma hatası:", error);
    return { error: "AI fişi okuyamadı. Lütfen daha net bir fotoğraf çekin." };
  }
}

// 3. Fiş Kaydetme (Web'deki saveReceipt mantığı ile birebir)
export async function saveReceiptFinal(receiptData: any) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Oturum yok" };

    const { data: profile } = await supabase
      .from("profiles")
      .select("family_id")
      .eq("id", user.id)
      .single();
    if (!profile?.family_id) return { error: "Aile bulunamadı" };

    // A. Toplam harcamayı bütçeye ve giderlere ekle
    if (receiptData.total_amount > 0) {
      await updateKitchenBudget(profile.family_id, receiptData.total_amount);
      await supabase.from("expenses").insert({
        family_id: profile.family_id,
        user_id: user.id,
        amount: receiptData.total_amount,
        category: "Mutfak",
        description: `${receiptData.shop_name} Alışverişi (AI)`,
      });
    }

    // B. Ürünleri tek tek işle
    for (const item of receiptData.items) {
      const productName = item.name || "Bilinmeyen Ürün";
      const quantity = parseFloat(item.quantity) || 1;
      const unitPrice = parseFloat(item.unit_price) || 0;

      // 1. Stok kontrolü (Web mantığı: Mevcut varsa ekle, yoksa yeni oluştur)
      const { data: existing } = await supabase
        .from("inventory")
        .select("id, quantity")
        .eq("family_id", profile.family_id)
        .ilike("product_name", productName)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("inventory")
          .update({
            quantity: existing.quantity + quantity,
            last_price: unitPrice,
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("inventory").insert({
          family_id: profile.family_id,
          product_name: productName,
          quantity: quantity,
          unit: item.unit || "adet",
          category: item.category || "Genel",
          last_price: unitPrice,
          added_by: user.id,
          created_at: new Date().toISOString(),
        });
      }

      // 2. Alışveriş Listesinden silme (Akıllı Eşleşme)
      await supabase
        .from("shopping_list")
        .delete()
        .eq("family_id", profile.family_id)
        .eq("is_completed", false)
        .ilike("product_name", `%${productName}%`);
    }

    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

// 4. Diğer Alışveriş Listesi Fonksiyonları
export async function toggleShoppingItem(itemId: string, isCompleted: boolean) {
  const { error } = await supabase
    .from("shopping_list")
    .update({ is_completed: isCompleted })
    .eq("id", itemId);
  return { success: !error, error: error?.message };
}
