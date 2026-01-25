import { supabase } from "./supabase";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { startOfWeek, addDays, format } from "date-fns";

// AI Yapılandırması (Web sürümü ile uyumlu model ismi)
const geminiApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(geminiApiKey);

// Yardımcı: Ay Anahtarı (Örn: "2026-01")
function getCurrentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function normalizeProductName(value: string) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(?:kg|gr|g|lt|l|ml|adet|pcs|paket|kutu|sise|sişe|pet)\b/g, " ")
    .replace(/\b\d+\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isProductMatch(source: string, target: string) {
  const a = normalizeProductName(source);
  const b = normalizeProductName(target);
  if (!a || !b) return false;
  if (a.includes(b) || b.includes(a)) return true;
  const tokensA = a.split(" ").filter(t => t.length >= 3);
  const tokensB = new Set(b.split(" ").filter(t => t.length >= 3));
  return tokensA.some(token => tokensB.has(token));
}

function resolveMealLanguage(preferred?: string) {
  if (preferred === "en") return "English";
  if (preferred === "de") return "Deutsch";
  return "Türkçe";
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

  const newSpent = Math.max(0, (current?.spent_amount || 0) + amount);

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
      .select("family_id, preferred_currency, role")
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

    const isParent = ["owner", "admin"].includes(profile?.role || "");

    if (existing) {
      const { error } = await supabase
        .from("inventory")
        .update({
          quantity: existing.quantity + quantity,
          last_price: lastPrice,
          unit,
          category,
          last_price_currency: profile?.preferred_currency || "TL",
        })
        .eq("id", existing.id);
      return { success: !error, error: error?.message };
    }

    const { error } = await supabase.from("inventory").insert({
      family_id: profile.family_id,
      product_name: productName,
      product_name_en: productName,
      quantity,
      unit,
      category,
      last_price: lastPrice,
      created_at: new Date().toISOString(),
      last_price_currency: profile?.preferred_currency || "TL",
      is_approved: isParent,
      requested_by: isParent ? null : user.id,
    });

    return { success: !error, error: error?.message };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function approveInventoryItem(itemId: string) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Kullanıcı bulunamadı." };

    const { data: profile } = await supabase
      .from("profiles")
      .select("family_id, role")
      .eq("id", user.id)
      .single();

    if (!profile?.family_id) return { error: "Aile bilgisi bulunamadı." };
    if (!["owner", "admin"].includes(profile?.role || "")) {
      return { error: "Yetkisiz işlem." };
    }

    const { error } = await supabase
      .from("inventory")
      .update({ is_approved: true })
      .eq("id", itemId)
    .eq("family_id", profile.family_id);

    return { success: !error, error: error?.message };
  } catch (error: any) {
    return { error: error.message };
  }
}

async function notifyFamilyMembers(
  familyId: string,
  title: string,
  body: string,
  audience: "parents" | "members" = "parents",
  memberIds: string[] = []
) {
  try {
    const { data: members } = await supabase
      .from("profiles")
      .select("id, push_token, role")
      .eq("family_id", familyId);

    const filtered = (members || []).filter((member: any) => {
      if (audience === "parents") {
        return ["owner", "admin"].includes(member.role);
      }
      if (audience === "members") {
        return memberIds.includes(member.id);
      }
      return true;
    });

    const tokens =
      filtered.map((member: any) => member.push_token).filter(Boolean) || [];

    if (tokens.length === 0) return;

    const messages = tokens.map((token: string) => ({
      to: token,
      sound: "default",
      title,
      body,
      data: { type: "meal_poll" },
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
  } catch (error) {
    console.warn("Anket bildirimi gönderilemedi:", error);
  }
}

export async function notifyMealPollPublished(payload: {
  title: string;
  summary: string;
  audience?: "parents" | "members";
  memberIds?: string[];
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

    await notifyFamilyMembers(
      profile.family_id,
      payload.title,
      payload.summary,
      payload.audience || "parents",
      payload.memberIds || []
    );
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function createMealPoll(input: {
  title: string;
  suggestions: { title: string; missing: string[] }[];
  missingItems: string[];
  extraNotes?: string;
  endAt?: string | null;
  audience: "parents" | "members";
  memberIds?: string[];
  mealType?: "cook" | "delivery" | "restaurant";
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

    const { data: newPoll, error } = await supabase.from("meal_polls").insert({
      family_id: profile.family_id,
      created_by: user.id,
      title: input.title,
      suggestions: input.suggestions,
      missing_items: input.missingItems,
      extra_notes: input.extraNotes || null,
      end_at: input.endAt || null,
      audience: input.audience,
      member_ids: input.audience === "members" ? input.memberIds || [] : null,
      meal_type: input.mealType || "cook",
      is_approved: false,
      is_active: true,
      votes: {},
    }).select().single();

    if (!error && newPoll) {
      await notifyFamilyMembers(
        profile.family_id,
        "Yemek anketi yayınlandı",
        "Yeni yemek anketi hazır.",
        input.audience,
        input.memberIds || []
      );
    }

    return { success: !error, poll: newPoll || null, error: error?.message };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function getActiveMealPoll() {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { poll: null, error: "Kullanıcı bulunamadı." };

    const { data: profile } = await supabase
      .from("profiles")
      .select("family_id, role, id")
      .eq("id", user.id)
      .single();

    if (!profile?.family_id) return { poll: null, error: "Aile bulunamadı." };

    const nowIso = new Date().toISOString();
    
    // Önce aktif anketleri getir (onaylanmış veya onaylanmamış)
    const { data, error: queryError } = await supabase
      .from("meal_polls")
    .select("*")
      .eq("family_id", profile.family_id)
      .eq("is_active", true)
      .or(`end_at.is.null,end_at.gte.${nowIso}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (queryError) {
      console.error("getActiveMealPoll query error:", queryError);
    }

    // Eğer aktif anket varsa, kontrol et ve dön
    if (data) {
      // Audience kontrolü
      if (data.audience === "parents") {
        if (!["owner", "admin"].includes(profile.role || "")) {
          return { poll: null };
        }
      }
      if (data.audience === "members") {
        const memberIds = data.member_ids || [];
        if (!memberIds.includes(profile.id)) return { poll: null };
      }

      return { poll: data };
    }

    // Aktif anket yoksa, sonlandırılmış son anketi getir (onaylanmamış olanları)
    // Onaylanmış anketler "Yemek Hazır" butonuna basıldıktan sonra silindiği için
    // sonlandırılmış onaylanmış anket olmamalı, ama yine de kontrol edelim
    const { data: lastPoll } = await supabase
      .from("meal_polls")
      .select("*")
      .eq("family_id", profile.family_id)
      .eq("is_active", false)
      .eq("is_approved", false) // Sonlandırılmış ama onaylanmamış anketleri getir
      .is("approved_meal", null) // Onaylanmamış anketleri getir
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!lastPoll) return { poll: null };

    // Audience kontrolü
    if (lastPoll.audience === "parents") {
      if (!["owner", "admin"].includes(profile.role || "")) {
        return { poll: null };
      }
    }
    if (lastPoll.audience === "members") {
      const memberIds = lastPoll.member_ids || [];
      if (!memberIds.includes(profile.id)) return { poll: null };
    }

    return { poll: lastPoll };
  } catch (error: any) {
    return { poll: null, error: error.message };
  }
}

export async function submitMealPollVote(pollId: string, optionTitle: string) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Kullanıcı bulunamadı." };

    const { data: profile } = await supabase
      .from("profiles")
      .select("family_id, role, id")
      .eq("id", user.id)
      .single();

    if (!profile?.family_id) return { error: "Aile bulunamadı." };

    const { data: poll } = await supabase
      .from("meal_polls")
      .select("id, family_id, audience, member_ids, votes, suggestions, created_by, is_active")
      .eq("id", pollId)
      .eq("family_id", profile.family_id)
      .single();

    if (!poll) return { error: "Anket bulunamadı." };

    if (poll.audience === "parents") {
      if (!["owner", "admin"].includes(profile.role || "")) {
        return { error: "Bu anket sadece ebeveynlere açık." };
      }
    }
    if (poll.audience === "members") {
      const memberIds = poll.member_ids || [];
      if (!memberIds.includes(profile.id)) {
        return { error: "Bu anket size açık değil." };
      }
    }

    const options = (poll.suggestions || []).map(
      (item: any) => item.title || item
    );
    if (!options.includes(optionTitle)) {
      return { error: "Seçenek bulunamadı." };
    }

    const votes = poll.votes || {};
    const userId = profile.id;

    let previousOption: string | null = null;
    Object.keys(votes).forEach(key => {
      const entry = votes[key] || {};
      const memberIds = entry.memberIds || [];
      if (memberIds.includes(userId)) {
        previousOption = key;
      }
    });

    if (previousOption && previousOption !== optionTitle) {
      const prevEntry = votes[previousOption] || { count: 0, memberIds: [] };
      const filtered = (prevEntry.memberIds || []).filter(
        (id: string) => id !== userId
      );
      votes[previousOption] = {
        count: Math.max(0, (prevEntry.count || 0) - 1),
        memberIds: filtered,
      };
    }

    if (!previousOption || previousOption !== optionTitle) {
      const entry = votes[optionTitle] || { count: 0, memberIds: [] };
      const nextIds = Array.from(
        new Set([...(entry.memberIds || []), userId])
      );
      votes[optionTitle] = {
        count: (entry.count || 0) + 1,
        memberIds: nextIds,
      };
    }

    const { error } = await supabase
      .from("meal_polls")
      .update({ votes })
      .eq("id", pollId)
    .eq("family_id", profile.family_id);

    if (error) {
      return { success: false, error: error.message };
    }

    // Oy verdikten sonra herkes oy verdi mi kontrol et
    if (poll.is_active) {
      let targetMemberIds: string[] = [];
      
      if (poll.audience === "parents") {
        // Ebeveynlerin ID'lerini al
        const { data: parents } = await supabase
          .from("profiles")
          .select("id")
          .eq("family_id", profile.family_id)
          .in("role", ["owner", "admin"]);
        targetMemberIds = (parents || []).map((p: any) => p.id);
      } else if (poll.audience === "members") {
        targetMemberIds = poll.member_ids || [];
      }

      // Oy veren tüm kullanıcıları topla
      const votedMemberIds = new Set<string>();
      Object.keys(votes).forEach(key => {
        const entry = votes[key] || {};
        const memberIds = entry.memberIds || [];
        memberIds.forEach((id: string) => votedMemberIds.add(id));
      });

      // Herkes oy verdi mi kontrol et
      const allVoted = targetMemberIds.length > 0 && 
        targetMemberIds.every(id => votedMemberIds.has(id));

      if (allVoted) {
        // Anketi otomatik sonlandır
        await supabase
          .from("meal_polls")
          .update({ is_active: false })
          .eq("id", pollId);

        // Anket oluşturana bildirim gönder
        await notifyFamilyMembers(
          profile.family_id,
          "Anket tamamlandı",
          "Ankette herkes oy verdi. Sonuçları onaylayabilirsiniz.",
          "members",
          [poll.created_by]
        );
      }
    }

    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function approveMealPoll(pollId: string) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Kullanıcı bulunamadı." };

    const { data: profile } = await supabase
      .from("profiles")
      .select("family_id, role")
      .eq("id", user.id)
      .single();

    if (!profile?.family_id) return { error: "Aile bulunamadı." };

    const { data: poll } = await supabase
      .from("meal_polls")
    .select("*")
      .eq("id", pollId)
    .eq("family_id", profile.family_id)
      .single();

    if (!poll) return { error: "Anket bulunamadı." };

    if (poll.end_at) {
      const endAt = new Date(poll.end_at).getTime();
      if (Date.now() < endAt) {
        return { error: "Anket süresi dolmadı." };
      }
    }

    const votes = poll.votes || {};
    let winningTitle: string | null = null;
    let winningCount = -1;
    Object.keys(votes).forEach(key => {
      const count = votes[key]?.count || 0;
      if (count > winningCount) {
        winningCount = count;
        winningTitle = key;
      }
    });

    if (!winningTitle) {
      const first = (poll.suggestions || [])[0];
      winningTitle = first?.title || first || null;
    }
    if (!winningTitle) {
      return { error: "Seçili yemek bulunamadı." };
    }

    let matchedSuggestion = (poll.suggestions || []).find(
      (item: any) => (item.title || item) === winningTitle
    );
    let missingItems = matchedSuggestion?.missing || [];
    
    // Eğer manuel anketten geliyorsa (missing array boş), AI ile tarif ve eksik malzemeleri bul
    if (missingItems.length === 0 && geminiApiKey) {
      try {
        // Envanter bilgilerini al
        const { data: inventoryData } = await supabase
          .from("inventory")
          .select("product_name, quantity, unit, category")
          .eq("family_id", profile.family_id)
          .eq("is_approved", true)
          .limit(80);
        
        const inventoryItems = (inventoryData || []).map((item: any) => ({
          product_name: item.product_name,
          quantity: item.quantity,
          unit: item.unit,
          category: item.category,
        }));
        
        // Kullanıcı dilini al
        const { data: userProfile } = await supabase
          .from("profiles")
          .select("language")
          .eq("id", user.id)
          .single();
        
        const aiResult = await getMealRecipeAndMissingItems(
          winningTitle,
          inventoryItems,
          userProfile?.language || "tr"
        );
        
        if (!aiResult.error) {
          missingItems = aiResult.missing || [];
          
          // Anketi güncelle - suggestions array'inde bu yemeğin missing ve recipe bilgilerini ekle
          const updatedSuggestions = (poll.suggestions || []).map((s: any) => {
            const sTitle = s.title || s;
            if (sTitle === winningTitle) {
              return {
                title: sTitle,
                missing: missingItems,
                recipe: aiResult.recipe || "",
              };
            }
            return s;
          });
          
          // Anketi güncelle (missing ve recipe bilgileriyle)
          await supabase
            .from("meal_polls")
            .update({ suggestions: updatedSuggestions })
            .eq("id", pollId)
            .eq("family_id", profile.family_id);
        }
      } catch (aiError) {
        console.warn("AI ile eksik malzeme bulunamadı:", aiError);
      }
    }
    
    for (const name of missingItems) {
      await supabase.from("shopping_list").insert({
        family_id: profile.family_id,
        product_name: name,
        quantity: 1,
        unit: "adet",
        market_name: null,
        is_urgent: true,
        is_completed: false,
        is_checked: false,
        added_by: user.id,
        created_at: new Date().toISOString(),
      });
    }

    const { error } = await supabase
      .from("meal_polls")
      .update({
        is_approved: true,
        // is_active: true kalmalı - anket onaylandıktan sonra da aktif kalmalı
        // Sadece "Yemek Hazır" butonuna basıldığında silinecek
        approved_meal: winningTitle,
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", pollId)
      .eq("family_id", profile.family_id);

    if (!error && missingItems.length > 0) {
      await notifyFamilyMembers(
        profile.family_id,
        "Eksik malzeme listesi güncellendi",
        `Eksik ürünler listeye eklendi: ${missingItems.join(", ")}`,
        poll.audience === "members" ? "members" : "parents",
        poll.member_ids || []
      );
    }

    return { success: !error, error: error?.message };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteMealPoll(pollId: string, skipOwnerCheck: boolean = false) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Kullanıcı bulunamadı." };

    const { data: profile } = await supabase
      .from("profiles")
      .select("family_id, role")
      .eq("id", user.id)
      .single();

    if (!profile?.family_id) return { error: "Aile bulunamadı." };

    const { data: poll } = await supabase
      .from("meal_polls")
      .select("created_by")
      .eq("id", pollId)
      .eq("family_id", profile.family_id)
      .single();

    if (!poll) return { error: "Anket bulunamadı." };
    
    // Eğer skipOwnerCheck false ise ve kullanıcı anketi oluşturan kişi değilse, 
    // sadece owner/admin ise silme izni ver
    if (!skipOwnerCheck && poll.created_by !== user.id) {
      if (!["owner", "admin"].includes(profile.role || "")) {
        return { error: "Bu anketi sadece oluşturan kişi veya yönetici silebilir." };
      }
    }

    const { error } = await supabase
      .from("meal_polls")
      .delete()
      .eq("id", pollId)
      .eq("family_id", profile.family_id);

    return { success: !error, error: error?.message };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function endMealPoll(pollId: string) {
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

    if (!profile?.family_id) return { error: "Aile bulunamadı." };

    const { data: poll } = await supabase
      .from("meal_polls")
      .select("created_by")
      .eq("id", pollId)
      .eq("family_id", profile.family_id)
      .single();

    if (!poll) return { error: "Anket bulunamadı." };
    if (poll.created_by !== user.id) {
      return { error: "Bu anketi sadece oluşturan kişi sonlandırabilir." };
    }

    const { error } = await supabase
      .from("meal_polls")
      .update({ is_active: false })
      .eq("id", pollId)
      .eq("family_id", profile.family_id);

    return { success: !error, error: error?.message };
  } catch (error: any) {
    return { error: error.message };
  }
}

// Envanterden malzeme miktarını düşür
export async function reduceInventoryQuantity(
  productName: string,
  usedQuantity: number,
  usedUnit: string
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

    // Envanterde eşleşen ürünleri bul
    const { data: inventoryItems } = await supabase
      .from("inventory")
      .select("*")
      .eq("family_id", profile.family_id)
      .eq("is_approved", true);

    if (!inventoryItems || inventoryItems.length === 0) {
      return { error: "Envanterde ürün bulunamadı." };
    }

    // Ürün adına göre eşleşen ürünleri bul
    const matchedItems = inventoryItems.filter((item: any) =>
      isProductMatch(item.product_name, productName)
    );

    if (matchedItems.length === 0) {
      return { error: `Envanterde "${productName}" bulunamadı.` };
    }

    // Kullanılan miktarı birimlere göre dönüştür (basit dönüşüm)
    const results: Array<{ id: string; reduced: number; remaining: number }> = [];

    for (const item of matchedItems) {
      const currentQty = Number(item.quantity) || 0;
      const itemUnit = (item.unit || "adet").toLowerCase().trim();
      const usedUnitLower = usedUnit.toLowerCase().trim();

      // Birim dönüşümü: kullanılan miktarı envanter birimine dönüştür
      let convertedUsedQty = usedQuantity;
      
      if (usedUnitLower !== itemUnit) {
        // Gram -> Kilogram (1 gr = 0.001 kg)
        if ((usedUnitLower === "gr" || usedUnitLower === "g") && (itemUnit === "kg" || itemUnit === "kilogram")) {
          convertedUsedQty = usedQuantity * 0.001;
        }
        // Kilogram -> Gram (1 kg = 1000 gr)
        else if ((usedUnitLower === "kg" || usedUnitLower === "kilogram") && (itemUnit === "gr" || itemUnit === "g")) {
          convertedUsedQty = usedQuantity * 1000;
        }
        // Mililitre -> Litre (1 ml = 0.001 lt)
        else if ((usedUnitLower === "ml") && (itemUnit === "lt" || itemUnit === "litre" || itemUnit === "l")) {
          convertedUsedQty = usedQuantity * 0.001;
        }
        // Litre -> Mililitre (1 lt = 1000 ml)
        else if ((usedUnitLower === "lt" || usedUnitLower === "litre" || usedUnitLower === "l") && (itemUnit === "ml")) {
          convertedUsedQty = usedQuantity * 1000;
        }
        // Aynı birimler farklı yazılmışsa (adet, ad, piece, pcs) - dönüşüm yok
        else if (
          (usedUnitLower === "adet" || usedUnitLower === "ad" || usedUnitLower === "piece" || usedUnitLower === "pcs") &&
          (itemUnit === "adet" || itemUnit === "ad" || itemUnit === "piece" || itemUnit === "pcs")
        ) {
          convertedUsedQty = usedQuantity;
        }
        // Birimler uyumsuzsa direkt kullan (kullanıcı dikkatli olmalı)
        else {
          convertedUsedQty = usedQuantity;
        }
      }

      // Envanterden düşülecek miktar (envanter biriminde)
      const reduceAmount = Math.min(convertedUsedQty, currentQty);
      const newQty = Math.max(0, currentQty - reduceAmount);

      if (newQty > 0) {
        // Miktarı güncelle
        await supabase
          .from("inventory")
          .update({ quantity: newQty })
          .eq("id", item.id)
          .eq("family_id", profile.family_id);
        
        results.push({
          id: item.id,
          reduced: reduceAmount,
          remaining: newQty,
        });
      } else {
        // Ürünü sil (miktar 0 oldu)
        await supabase
          .from("inventory")
          .delete()
          .eq("id", item.id)
          .eq("family_id", profile.family_id);
        
        results.push({
          id: item.id,
          reduced: currentQty,
          remaining: 0,
        });
      }
    }

    return { success: true, results };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function updateMealPoll(
  pollId: string,
  input: {
    title: string;
    suggestions: { title: string; missing: string[] }[];
    missingItems: string[];
    extraNotes?: string;
    endAt?: string | null;
    audience: "parents" | "members";
    memberIds?: string[];
    mealType?: "cook" | "delivery" | "restaurant";
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

    const { data: existingPoll } = await supabase
      .from("meal_polls")
      .select("created_by")
      .eq("id", pollId)
      .eq("family_id", profile.family_id)
      .single();

    if (!existingPoll) return { error: "Anket bulunamadı." };
    if (existingPoll.created_by !== user.id) {
      return { error: "Bu anketi sadece oluşturan kişi düzenleyebilir." };
    }

    const { data: updatedPoll, error } = await supabase
      .from("meal_polls")
      .update({
        title: input.title,
        suggestions: input.suggestions,
        missing_items: input.missingItems,
        extra_notes: input.extraNotes || null,
        end_at: input.endAt || null,
        audience: input.audience,
        member_ids: input.audience === "members" ? input.memberIds || [] : null,
        meal_type: input.mealType || "cook",
        // Oy verilerini sıfırla (düzenlemede oylar temizlenir)
        votes: {},
      })
      .eq("id", pollId)
      .eq("family_id", profile.family_id)
      .select()
      .single();

    return { success: !error, poll: updatedPoll || null, error: error?.message };
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
      .select("family_id, preferred_currency")
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
        product_name_en: productName,
        quantity,
        unit,
        category,
        last_price: lastPrice,
        last_price_currency: profile?.preferred_currency || "TL",
      })
      .eq("id", itemId)
      .eq("family_id", profile.family_id);

    return { success: !error, error: error?.message };
  } catch (error: any) {
    return { error: error.message };
  }
}

// 1.d Stoktaki ürünü sil
export async function deleteInventoryItem(
  itemId: string,
  reason: "consumed" | "mistake" = "consumed"
) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Kullanıcı bulunamadı." };

    const { data: profile } = await supabase
      .from("profiles")
      .select("family_id, preferred_currency")
      .eq("id", user.id)
      .single();

    if (!profile?.family_id) return { error: "Aile bilgisi bulunamadı." };

    const { data: item } = await supabase
      .from("inventory")
      .select("quantity, last_price")
      .eq("id", itemId)
      .eq("family_id", profile.family_id)
    .maybeSingle();

    if (reason === "mistake" && item) {
      const quantity = Number(item.quantity) > 0 ? Number(item.quantity) : 1;
      const price = Number(item.last_price) >= 0 ? Number(item.last_price) : 0;
      const refundAmount = quantity * price;
      if (refundAmount > 0) {
        await updateKitchenBudget(profile.family_id, -refundAmount);
      }
    }

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
  marketName?: string,
  isUrgent: boolean = false
) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Kullanıcı bulunamadı." };

    const { data: profile } = await supabase
      .from("profiles")
      .select("family_id, preferred_currency")
      .eq("id", user.id)
      .single();

    if (!profile?.family_id) return { error: "Aile bilgisi bulunamadı." };

    const { error } = await supabase.from("shopping_list").insert({
      family_id: profile.family_id,
      product_name: productName,
      quantity,
      unit,
      market_name: marketName || null,
      is_urgent: isUrgent,
      is_completed: false,
      is_checked: false,
      added_by: user.id,
      created_at: new Date().toISOString(),
    });

    if (!error && isUrgent) {
      try {
        const { data: members } = await supabase
          .from("profiles")
          .select("id, push_token, role")
          .eq("family_id", profile.family_id)
          .neq("id", user.id);

        const tokens =
          (members || [])
            .map((member: any) => member.push_token)
            .filter((token: string) => !!token) || [];

        if (tokens.length > 0) {
          const bodyParts = [`${productName}`, `${quantity} ${unit}`];
          if (marketName) bodyParts.push(`Market: ${marketName}`);
          const messages = tokens.map((token: string) => ({
            to: token,
            sound: "default",
            title: "Acil ihtiyaç",
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

export async function generateMealSuggestionsAI(input: {
  inventoryItems: Array<{
    product_name?: string;
    quantity?: string | number;
    unit?: string;
    category?: string;
  }>;
  groups: Array<{
    label: string;
    memberNames: string[];
    prefs: { cuisine?: string; calories?: string; avoid?: string };
  }>;
  language?: string;
}) {
  try {
    if (!geminiApiKey) {
      return { error: "Gemini API key tanımlı değil." };
    }
    const language = resolveMealLanguage(input.language);
    const inventoryList = (input.inventoryItems || [])
      .filter(item => item.product_name)
      .slice(0, 80)
      .map(item => {
        const qty = item.quantity ? `${item.quantity}` : "";
        const unit = item.unit ? ` ${item.unit}` : "";
        const cat = item.category ? ` (${item.category})` : "";
        return `${item.product_name}${qty || unit ? ` • ${qty}${unit}` : ""}${cat}`;
      })
      .join("\n");

    if (!inventoryList) {
      const emptyMessage =
        language === "English"
          ? "Inventory is empty. Please add items to get suggestions."
          : language === "Deutsch"
          ? "Der Bestand ist leer. Bitte fügen Sie Produkte hinzu."
          : "Stok boş. Öneri için önce ürün ekleyin.";
  return {
        groups: input.groups.map(group => ({
          label: group.label,
          suggestions: [emptyMessage],
        })),
      };
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `You are a meal suggestion assistant.
Respond strictly in ${language}.

Inventory items:
${inventoryList}

You will receive preference groups. For each group:
- Generate up to 3 meal suggestions.
- Prefer meals that use inventory items.
- If missing ingredients, allow up to 4 missing items and mention them in parentheses.
- Respect cuisine, calorie target, and avoid list.
- If no good match, propose simple meals using available items.

Return ONLY JSON in this exact shape:
{
  "groups": [
    {
      "label": "string",
      "suggestions": [
        { "title": "string", "missing": ["string"] }
      ]
    }
  ]
}

Preference groups:
${JSON.stringify(input.groups)}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response
      .text()
      .replace(/```json|```/g, "")
      .trim();
    const parsed = JSON.parse(text);
    if (!parsed?.groups || !Array.isArray(parsed.groups)) {
      return { error: "AI response invalid." };
    }
    const cleaned = parsed.groups.map((group: any) => ({
      label: String(group.label || ""),
      suggestions: (group.suggestions || [])
        .slice(0, 3)
        .map((item: any) => ({
          title: String(item?.title || ""),
          missing: Array.isArray(item?.missing)
            ? item.missing.map((m: any) => String(m))
            : [],
        }))
        .filter((item: any) => item.title),
    }));
    return { groups: cleaned };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function getMealRecipeAndMissingItems(
  mealTitle: string,
  inventoryItems: Array<{
    product_name?: string;
    quantity?: string | number;
    unit?: string;
    category?: string;
  }>,
  language?: string
) {
  try {
    if (!geminiApiKey) {
      return { error: "Gemini API key tanımlı değil." };
    }
    const lang = resolveMealLanguage(language);
    const inventoryList = (inventoryItems || [])
      .filter(item => item.product_name)
      .slice(0, 80)
      .map(item => {
        const qty = item.quantity ? `${item.quantity}` : "";
        const unit = item.unit ? ` ${item.unit}` : "";
        const cat = item.category ? ` (${item.category})` : "";
        return `${item.product_name}${qty || unit ? ` • ${qty}${unit}` : ""}${cat}`;
      })
      .join("\n");

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `You are a meal assistant. Respond strictly in ${lang}.

Meal name: "${mealTitle}"

Available inventory items:
${inventoryList || "No items in inventory"}

Analyze this meal and:
1. Check which ingredients are available in the inventory
2. List any missing ingredients needed for this meal
3. Return ONLY a JSON object in this exact format:

{
  "missing": ["ingredient1", "ingredient2"],
  "recipe": "Brief recipe description"
}

Return ONLY the JSON, no other text.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response
      .text()
      .replace(/```json|```/g, "")
      .trim();
    const parsed = JSON.parse(text);
    
    return {
      missing: Array.isArray(parsed?.missing) ? parsed.missing.map((m: any) => String(m)) : [],
      recipe: String(parsed?.recipe || ""),
    };
  } catch (error: any) {
    return { error: error.message, missing: [], recipe: "" };
  }
}

// BMI'ye göre bir aylık diyet programı oluştur
export async function generateDietPlan(input: {
  bmi: number;
  weight: number;
  height: number;
  age?: number;
  gender?: string;
  currentDiet?: string;
  currentCuisine?: string;
  currentAvoid?: string;
  language?: string;
  allergies?: string;
  medications?: string;
  notes?: string;
  startDate?: string; // YYYY-MM-DD formatında başlangıç tarihi
  endDate?: string; // YYYY-MM-DD formatında bitiş tarihi (Pazartesi)
  budgetPreference?: "affordable" | "moderate" | "expensive"; // Masraf tercihi
  difficultyPreference?: "easy" | "moderate" | "difficult"; // Yapılış zorluğu
}) {
  try {
    if (!geminiApiKey) {
      return { error: "Gemini API key tanımlı değil." };
    }
    
    const lang = resolveMealLanguage(input.language);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    // BMI'ye göre hedef belirle
    let goal = "";
    let calorieTarget = "";
    let dietType = "";
    
    if (input.bmi < 18.5) {
      goal = lang === "English" ? "weight gain" : lang === "Deutsch" ? "Gewichtszunahme" : "kilo alma";
      // Yaş ve cinsiyete göre bazal metabolizma hızı (BMR) hesapla
      let baseCalories = 2000; // Varsayılan
      if (input.age && input.gender) {
        if (input.gender === "female" || input.gender === "kadın") {
          // Kadınlar için: BMR = 10 × kilo + 6.25 × boy - 5 × yaş - 161
          baseCalories = 10 * input.weight + 6.25 * input.height - 5 * input.age - 161;
        } else if (input.gender === "male" || input.gender === "erkek") {
          // Erkekler için: BMR = 10 × kilo + 6.25 × boy - 5 × yaş + 5
          baseCalories = 10 * input.weight + 6.25 * input.height - 5 * input.age + 5;
        }
        // Orta seviye aktivite için TDEE = BMR × 1.55
        baseCalories = baseCalories * 1.55;
      } else {
        baseCalories = input.gender === "female" ? 1800 : 2200;
      }
      // Sağlıklı kilo alma için günlük +300-500 kalori
      calorieTarget = String(Math.round(baseCalories + 400));
      dietType = "weight_gain";
    } else if (input.bmi >= 25) {
      goal = lang === "English" ? "weight loss" : lang === "Deutsch" ? "Gewichtsverlust" : "kilo verme";
      // Yaş ve cinsiyete göre bazal metabolizma hızı (BMR) hesapla
      let baseCalories = 2000; // Varsayılan
      if (input.age && input.gender) {
        if (input.gender === "female" || input.gender === "kadın") {
          // Kadınlar için: BMR = 10 × kilo + 6.25 × boy - 5 × yaş - 161
          baseCalories = 10 * input.weight + 6.25 * input.height - 5 * input.age - 161;
        } else if (input.gender === "male" || input.gender === "erkek") {
          // Erkekler için: BMR = 10 × kilo + 6.25 × boy - 5 × yaş + 5
          baseCalories = 10 * input.weight + 6.25 * input.height - 5 * input.age + 5;
        }
        // Orta seviye aktivite için TDEE = BMR × 1.55
        baseCalories = baseCalories * 1.55;
      } else {
        baseCalories = input.gender === "female" ? 1800 : 2200;
      }
      // Sağlıklı kilo verme için günlük -500 kalori (hafif açık)
      calorieTarget = String(Math.max(1200, Math.round(baseCalories - 500)));
      dietType = "weight_loss";
    } else {
      // Normal BMI - diyet gerekmez
      return { 
        needsDiet: false, 
        message: lang === "English" 
          ? "Your BMI is in the healthy range. No special diet plan needed. Maintain your current eating habits."
          : lang === "Deutsch"
          ? "Ihr BMI liegt im gesunden Bereich. Kein spezieller Diätplan erforderlich. Behalten Sie Ihre aktuellen Essgewohnheiten bei."
          : "BMI değeriniz sağlıklı aralıkta. Özel bir diyet programına gerek yok. Mevcut beslenme alışkanlıklarınızı sürdürün."
      };
    }
    
    // Başlangıç ve bitiş tarihlerini hesapla
    let startDate = input.startDate ? new Date(input.startDate) : new Date();
    let endDate = input.endDate ? new Date(input.endDate) : null;
    
    // Eğer endDate yoksa, başlangıç tarihinden itibaren bir sonraki Pazartesi'yi bul
    if (!endDate) {
      const nextMonday = startOfWeek(addDays(startDate, 7), { weekStartsOn: 1 });
      endDate = nextMonday;
    }
    
    // Gün sayısını hesapla
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const numDays = Math.min(7, Math.max(1, daysDiff)); // En az 1, en fazla 7 gün
    
    // Gün isimlerini oluştur
    const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const dayNamesTR = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
    const dayNamesDE = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
    
    const dayNameList = lang === "English" ? dayNames : lang === "Deutsch" ? dayNamesDE : dayNamesTR;
    const startDayIndex = startDate.getDay() === 0 ? 6 : startDate.getDay() - 1; // Pazartesi = 0
    
    // Günlük program için gün listesi oluştur
    const daysList = [];
    for (let i = 0; i < numDays; i++) {
      const dayIndex = (startDayIndex + i) % 7;
      daysList.push({
        day: dayNameList[dayIndex],
        date: format(addDays(startDate, i), "yyyy-MM-dd"),
      });
    }
    
    // Masraf tercihi çevirisi
    const budgetLabel = 
      input.budgetPreference === "affordable" 
        ? (lang === "English" ? "affordable" : lang === "Deutsch" ? "günstig" : "uygun")
        : input.budgetPreference === "expensive"
        ? (lang === "English" ? "expensive" : lang === "Deutsch" ? "teuer" : "pahalı")
        : (lang === "English" ? "moderate" : lang === "Deutsch" ? "mittel" : "orta");
    
    // Zorluk tercihi çevirisi
    const difficultyLabel = 
      input.difficultyPreference === "easy"
        ? (lang === "English" ? "easy" : lang === "Deutsch" ? "einfach" : "kolay")
        : input.difficultyPreference === "difficult"
        ? (lang === "English" ? "difficult" : lang === "Deutsch" ? "schwierig" : "zor")
        : (lang === "English" ? "moderate" : lang === "Deutsch" ? "mittel" : "orta");

    const prompt = `You are a nutritionist and dietitian. Respond strictly in ${lang}.

User profile:
- BMI: ${input.bmi}
- Weight: ${input.weight} kg
- Height: ${input.height} cm
- Age: ${input.age || "not specified"} years
- Gender: ${input.gender || "not specified"}
- Goal: ${goal}
- Daily calorie target: ${calorieTarget} kcal
- Current diet preference: ${input.currentDiet || "standard"}
- Current cuisine preference: ${input.currentCuisine || "world"}
- Foods to avoid: ${input.currentAvoid || "none"}
${input.allergies ? `- Allergies: ${input.allergies}` : ""}
${input.medications ? `- Medications: ${input.medications}` : ""}
${input.notes ? `- Health notes: ${input.notes}` : ""}
${input.budgetPreference ? `- Budget preference: ${budgetLabel} (${lang === "English" ? "choose ingredients and meals that fit this budget level" : lang === "Deutsch" ? "wählen Sie Zutaten und Mahlzeiten, die diesem Budgetniveau entsprechen" : "bu bütçe seviyesine uygun malzemeler ve yemekler seçin"})` : ""}
${input.difficultyPreference ? `- Cooking difficulty preference: ${difficultyLabel} (${lang === "English" ? "choose recipes that match this difficulty level" : lang === "Deutsch" ? "wählen Sie Rezepte, die diesem Schwierigkeitsgrad entsprechen" : "bu zorluk seviyesine uygun tarifler seçin"})` : ""}

Create a ${numDays}-day diet plan starting from ${format(startDate, "yyyy-MM-dd")} until ${format(endDate, "yyyy-MM-dd")} for ${goal}. The plan should:
1. Include balanced meals for each day with SPECIFIC TIMES (breakfast around 08:00, lunch around 13:00, dinner around 19:00, snacks between meals)
2. Respect the calorie target (${calorieTarget} kcal/day)
3. Consider the user's current diet type (${input.currentDiet || "standard"})
4. Consider cuisine preferences (${input.currentCuisine || "world"})
5. STRICTLY AVOID any foods that the user is allergic to: ${input.allergies || "none"}
6. Consider medications and health conditions: ${input.medications || "none"} ${input.notes || ""}
7. Avoid foods listed: ${input.currentAvoid || "none"}
8. Be realistic and sustainable
9. Include variety to prevent boredom
10. Ensure all meals are safe considering allergies and medications
11. Provide hourly meal schedule with specific times for each meal
${input.budgetPreference ? `12. IMPORTANT: Choose ingredients and meals that are ${budgetLabel} in cost. ${input.budgetPreference === "affordable" ? "Use budget-friendly ingredients and simple, cost-effective recipes." : input.budgetPreference === "expensive" ? "You can include premium ingredients and more elaborate dishes." : "Use a balanced mix of affordable and moderately priced ingredients."}` : ""}
${input.difficultyPreference ? `13. IMPORTANT: Choose recipes that are ${difficultyLabel} to prepare. ${input.difficultyPreference === "easy" ? "Use simple recipes with minimal steps and common cooking techniques." : input.difficultyPreference === "difficult" ? "You can include more complex recipes with advanced techniques." : "Use recipes with moderate complexity and standard cooking techniques."}` : ""}

IMPORTANT: If the user has allergies, you MUST NOT include any foods that could cause allergic reactions. If the user is taking medications, consider potential food-drug interactions.

Return ONLY a JSON object in this exact format:
{
  "diet_plan": {
    "goal": "${goal}",
    "daily_calories": ${calorieTarget},
    "diet_type": "${dietType}",
    "start_date": "${format(startDate, "yyyy-MM-dd")}",
    "end_date": "${format(endDate, "yyyy-MM-dd")}",
    "daily_meal_plans": [
${daysList.map((day, index) => `      {
        "date": "${day.date}",
        "day": "${day.day}",
        "meals": [
          {
            "time": "08:00",
            "type": "breakfast",
            "meal": "meal name and brief description",
            "calories": approximate calories for this meal
          },
          {
            "time": "10:00",
            "type": "snack",
            "meal": "snack suggestion",
            "calories": approximate calories for this snack
          },
          {
            "time": "13:00",
            "type": "lunch",
            "meal": "meal name and brief description",
            "calories": approximate calories for this meal
          },
          {
            "time": "16:00",
            "type": "snack",
            "meal": "snack suggestion",
            "calories": approximate calories for this snack
          },
          {
            "time": "19:00",
            "type": "dinner",
            "meal": "meal name and brief description",
            "calories": approximate calories for this meal
          }
        ]
      }${index < daysList.length - 1 ? "," : ""}`).join("\n")}
    ]
  },
  "updated_preferences": {
    "diet": "updated diet type if needed",
    "calories": "${calorieTarget}",
    "cuisine": "preferred cuisine",
    "avoid": "foods to avoid",
    "notes": ""
  }
}

Return ONLY the JSON, no other text.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response
      .text()
      .replace(/```json|```/g, "")
      .trim();
    const parsed = JSON.parse(text);
    
    return {
      needsDiet: true,
      dietPlan: parsed.diet_plan || null,
      updatedPreferences: parsed.updated_preferences || null,
    };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function getShoppingListItems() {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { items: [], error: "Kullanıcı bulunamadı." };

    const { data: profile } = await supabase
      .from("profiles")
      .select("family_id")
      .eq("id", user.id)
      .single();

    if (!profile?.family_id)
      return { items: [], error: "Aile bilgisi bulunamadı." };

    const { data } = await supabase
      .from("shopping_list")
      .select(
        "id, product_name, quantity, unit, market_name, is_urgent, is_completed, is_checked"
      )
      .eq("family_id", profile.family_id)
      .eq("is_completed", false)
      .order("created_at", { ascending: false });

    return { items: data || [] };
  } catch (error: any) {
    return { items: [], error: error.message };
  }
}

// Diyet programı aktif olan kullanıcılar için bir aylık ihtiyaç listesi kontrolü
export async function checkDietShoppingNeeds() {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Kullanıcı bulunamadı." };

    const { data: profile } = await supabase
      .from("profiles")
      .select("family_id")
      .eq("id", user.id)
      .single();

    if (!profile?.family_id) return { success: false, error: "Aile bilgisi bulunamadı." };

    // Ailedeki tüm üyeleri getir
    const { data: members } = await supabase
      .from("profiles")
      .select("id, full_name, weight, height, gender, meal_preferences")
      .eq("family_id", profile.family_id);

    if (!members || members.length === 0) {
      return { success: true, message: "Aile üyesi bulunamadı." };
    }

    // Envanteri getir
    const { data: inventory } = await supabase
      .from("inventory")
      .select("product_name, quantity, unit")
      .eq("family_id", profile.family_id)
      .eq("is_approved", true);

    const inventoryItems = (inventory || []).map((item: any) => ({
      product_name: item.product_name,
      quantity: item.quantity,
      unit: item.unit,
    }));

    // Mevcut shopping list'i getir (tekrar eklemeyi önlemek için)
    const { data: existingShopping } = await supabase
      .from("shopping_list")
      .select("product_name")
      .eq("family_id", profile.family_id)
      .eq("is_completed", false);

    const existingProductNames = new Set(
      (existingShopping || []).map((item: any) => normalizeProductName(item.product_name))
    );

    let totalAdded = 0;

    // Her üye için kontrol et
    for (const member of members) {
      const mealPrefs = member.meal_preferences || {};
      
      // Diyet aktif mi kontrol et
      if (!mealPrefs.diet_active || !mealPrefs.diet_start_date) {
        continue; // Diyet aktif değilse atla
      }

      // BMI hesapla
      if (!member.weight || !member.height) {
        continue; // Kilo/boy yoksa atla
      }

      const heightInMeters = member.height / 100;
      const bmi = member.weight / (heightInMeters * heightInMeters);

      // AI ile bir aylık diyet planı için gerekli malzemeleri belirle
      if (!geminiApiKey) {
        continue;
      }

      try {
        const lang = resolveMealLanguage(mealPrefs.language);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        
        const goal = bmi < 18.5 ? "weight gain" : bmi >= 25 ? "weight loss" : "maintain";
        const calorieTarget = mealPrefs.calories || "2000";
        
        const prompt = `You are a nutritionist. Respond strictly in ${lang}.

User profile:
- BMI: ${bmi.toFixed(1)}
- Weight: ${member.weight} kg
- Height: ${member.height} cm
- Goal: ${goal}
- Daily calorie target: ${calorieTarget} kcal
- Diet type: ${mealPrefs.diet || "standard"}
- Cuisine preference: ${mealPrefs.cuisine || "world"}
- Foods to avoid: ${mealPrefs.avoid || "none"}

Current inventory:
${inventoryItems.map((item: any) => `${item.product_name} (${item.quantity} ${item.unit})`).join("\n") || "No items"}

Based on a 1-month diet plan for this user, list ALL ingredients needed that are NOT in the inventory.
Return ONLY a JSON array of product names (general names, in Turkish if ${lang === "Türkçe"}):
["product1", "product2", "product3", ...]

Return ONLY the JSON array, no other text.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response
          .text()
          .replace(/```json|```/g, "")
          .trim();
        
        let neededProducts: string[] = [];
        try {
          const parsed = JSON.parse(text);
          neededProducts = Array.isArray(parsed) 
            ? parsed.map((p: any) => String(p).trim()).filter(Boolean)
            : [];
        } catch (parseError) {
          // JSON parse hatası - metinden ürün isimlerini çıkarmaya çalış
          const lines = text.split("\n").filter((line: string) => line.trim());
          neededProducts = lines
            .map((line: string) => line.replace(/^[-•*]\s*/, "").trim())
            .filter((line: string) => line.length > 2);
        }

        // Shopping list'e ekle (sadece listede olmayanlar)
        for (const productName of neededProducts) {
          const normalizedName = normalizeProductName(productName);
          
          // Zaten listede var mı kontrol et
          if (existingProductNames.has(normalizedName)) {
            continue;
          }

          // Envanterde var mı kontrol et
          const inInventory = inventoryItems.some((item: any) =>
            isProductMatch(item.product_name, productName)
          );
          
          if (inInventory) {
            continue; // Envanterde varsa ekleme
          }

          // Shopping list'e ekle
          await supabase.from("shopping_list").insert({
            family_id: profile.family_id,
            product_name: productName,
            quantity: 1,
            unit: "adet",
            market_name: null,
            is_urgent: false,
            is_completed: false,
            is_checked: false,
            added_by: user.id,
            created_at: new Date().toISOString(),
            meta: JSON.stringify({ source: "diet_plan", member_id: member.id }),
          });

          existingProductNames.add(normalizedName);
          totalAdded++;
        }
      } catch (aiError: any) {
        console.warn(`AI ile malzeme listesi oluşturulamadı (${member.full_name}):`, aiError);
        continue;
      }
    }

    return {
      success: true,
      message: `${totalAdded} ürün ihtiyaç listesine eklendi.`,
      addedCount: totalAdded,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 2. AI Fiş Analizi (Mobil için optimize edildi)
export async function analyzeReceiptMobile(base64Image: string) {
  try {
    if (!geminiApiKey) {
      return { error: "Gemini API key tanımlı değil." };
    }
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
    const preferredCurrency = (profile as any)?.preferred_currency;
    const currency = receiptData.currency || preferredCurrency || "TL";

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
            last_price_currency: currency,
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("inventory").insert({
          family_id: profile.family_id,
          product_name: productName,
          product_name_en: productName,
          quantity: quantity,
          unit: item.unit || "adet",
          category: item.category || "Genel",
          last_price: unitPrice,
          created_at: new Date().toISOString(),
          last_price_currency: currency,
        });
      }

    }

    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function findMatchingShoppingItems(productNames: string[]) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { matches: [], error: "Kullanıcı bulunamadı." };

    const { data: profile } = await supabase
      .from("profiles")
      .select("family_id")
      .eq("id", user.id)
      .single();

    if (!profile?.family_id)
      return { matches: [], error: "Aile bilgisi bulunamadı." };

    const { data: shopping } = await supabase
      .from("shopping_list")
      .select("id, product_name")
      .eq("family_id", profile.family_id)
      .eq("is_completed", false);

    const matches =
      (shopping || []).filter((item: any) =>
        productNames.some(name => isProductMatch(name, item.product_name))
      ) || [];

    return { matches };
  } catch (error: any) {
    return { matches: [], error: error.message };
  }
}

export async function removeShoppingItemsByIds(ids: string[]) {
  if (!ids.length) return { success: true };
  const { error } = await supabase.from("shopping_list").delete().in("id", ids);
  return { success: !error, error: error?.message };
}

// 4. Diğer Alışveriş Listesi Fonksiyonları
export async function toggleShoppingItem(itemId: string, isCompleted: boolean) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id;

    const { data: item } = await supabase
      .from("shopping_list")
      .select("family_id, product_name, quantity, unit, is_urgent")
      .eq("id", itemId)
      .single();

    const { error } = await supabase
      .from("shopping_list")
      .update({ is_completed: isCompleted })
      .eq("id", itemId);

    if (!error && isCompleted && item?.is_urgent && item?.family_id) {
      const { data: members } = await supabase
        .from("profiles")
        .select("id, push_token")
        .eq("family_id", item.family_id)
        .neq("id", userId || "");

      const tokens =
        (members || [])
          .map((member: any) => member.push_token)
          .filter((token: string) => !!token) || [];

      if (tokens.length > 0) {
        const quantity = item.quantity || 1;
        const unit = item.unit || "adet";
        const messages = tokens.map((token: string) => ({
          to: token,
          sound: "default",
          title: "Acil ürün alındı",
          body: `${item.product_name} • ${quantity} ${unit}`,
          data: { type: "shopping_urgent_done" },
        }));

        await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Accept-encoding": "gzip, deflate",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(messages),
        });
      }
    }

    return { success: !error, error: error?.message };
  } catch (error: any) {
    return { error: error.message };
  }
}

// Diyet planından malzemeleri çıkar (Gemini API ile)
export async function extractIngredientsFromDietPlan(dietPlan: any): Promise<{
  ingredients: Array<{ name: string; quantity: string; unit: string }>;
  error: string | null;
}> {
  try {
    if (!geminiApiKey) {
      return { ingredients: [], error: "Gemini API key tanımlı değil." };
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Tüm yemekleri topla
    const allMeals: string[] = [];
    if (dietPlan?.daily_meal_plans) {
      dietPlan.daily_meal_plans.forEach((dayPlan: any) => {
        if (dayPlan.meals) {
          dayPlan.meals.forEach((meal: any) => {
            if (meal.meal) {
              allMeals.push(meal.meal);
            }
          });
        }
      });
    }

    if (allMeals.length === 0) {
      return { ingredients: [], error: "Diyet planında yemek bulunamadı." };
    }

    const mealsText = allMeals.join("\n");

    const prompt = `Aşağıdaki haftalık diyet programındaki tüm yemekler için gerekli malzemeleri çıkar. Her malzeme için miktar ve birim bilgisi de ver.

Yemekler:
${mealsText}

Sadece JSON formatında döndür, başka bir şey yazma:
{
  "ingredients": [
    {
      "name": "malzeme adı",
      "quantity": "miktar (sayı veya yaklaşık)",
      "unit": "birim (kg, gr, adet, yemek kaşığı, vb.)"
    }
  ]
}

Önemli:
- Aynı malzeme birden fazla yemekte kullanılıyorsa, toplam miktarı hesapla
- Birimleri standartlaştır (ör: 500 gr yerine 0.5 kg)
- Sadece gerçek malzemeleri listele, baharat ve soslar dahil`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(text);

    return {
      ingredients: parsed.ingredients || [],
      error: null,
    };
  } catch (error: any) {
    return { ingredients: [], error: error.message || "Malzemeler çıkarılamadı." };
  }
}

// Malzemeleri envanter ve market listesi ile karşılaştır
export async function compareIngredientsWithInventory(
  ingredients: Array<{ name: string; quantity: string; unit: string }>
): Promise<{
  matched: Array<{ ingredient: any; inventoryItem: any }>;
  unmatched: Array<{ ingredient: any; reason: string }>;
  error: string | null;
}> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return { matched: [], unmatched: [], error: "Kullanıcı bulunamadı." };

    const { data: profile } = await supabase
      .from("profiles")
      .select("family_id")
      .eq("id", user.id)
      .single();

    if (!profile?.family_id)
      return { matched: [], unmatched: [], error: "Aile bilgisi bulunamadı." };

    // Envanteri getir
    const { data: inventory } = await supabase
      .from("inventory")
      .select("id, product_name, quantity, unit")
      .eq("family_id", profile.family_id)
      .eq("is_approved", true);

    // Market listesini getir
    const { data: shoppingList } = await supabase
      .from("shopping_list")
      .select("id, product_name, quantity, unit")
      .eq("family_id", profile.family_id)
      .eq("is_completed", false);

    const inventoryItems = inventory || [];
    const shoppingItems = shoppingList || [];

    const matched: Array<{ ingredient: any; inventoryItem: any }> = [];
    const unmatched: Array<{ ingredient: any; reason: string }> = [];

    for (const ingredient of ingredients) {
      // Önce envanterde ara
      const inventoryMatch = inventoryItems.find((item: any) =>
        isProductMatch(ingredient.name, item.product_name)
      );

      if (inventoryMatch) {
        matched.push({
          ingredient,
          inventoryItem: inventoryMatch,
        });
        continue;
      }

      // Sonra market listesinde ara
      const shoppingMatch = shoppingItems.find((item: any) =>
        isProductMatch(ingredient.name, item.product_name)
      );

      if (shoppingMatch) {
        matched.push({
          ingredient,
          inventoryItem: shoppingMatch,
        });
        continue;
      }

      // Hiçbirinde yok
      unmatched.push({
        ingredient,
        reason: "Envanterde ve market listesinde bulunamadı",
      });
    }

    return { matched, unmatched, error: null };
  } catch (error: any) {
    return {
      matched: [],
      unmatched: [],
      error: error.message || "Karşılaştırma yapılamadı.",
    };
  }
}

// Market listesine malzeme ekle
export async function addIngredientsToShoppingList(
  ingredients: Array<{ name: string; quantity: string; unit: string }>,
  isUrgent: boolean = false
): Promise<{ success: boolean; error: string | null; added: number }> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return { success: false, error: "Kullanıcı bulunamadı.", added: 0 };

    const { data: profile } = await supabase
      .from("profiles")
      .select("family_id, role")
      .eq("id", user.id)
      .single();

    if (!profile?.family_id)
      return { success: false, error: "Aile bilgisi bulunamadı.", added: 0 };

    // Mevcut market listesini getir (tekrar eklemeyi önlemek için)
    const { data: existingShopping } = await supabase
      .from("shopping_list")
      .select("product_name")
      .eq("family_id", profile.family_id)
      .eq("is_completed", false);

    const existingProductNames = new Set(
      (existingShopping || []).map((item: any) =>
        normalizeProductName(item.product_name)
      )
    );

    const isParent = ["owner", "admin"].includes(profile?.role || "");
    let added = 0;

    for (const ingredient of ingredients) {
      const normalizedName = normalizeProductName(ingredient.name);
      if (existingProductNames.has(normalizedName)) {
        continue; // Zaten listede var
      }

      const { error } = await supabase.from("shopping_list").insert({
        family_id: profile.family_id,
        product_name: ingredient.name,
        quantity: ingredient.quantity || "1",
        unit: ingredient.unit || "adet",
        is_urgent: isUrgent,
        is_approved: isParent,
        requested_by: isParent ? null : user.id,
      });

      if (!error) {
        added++;
        existingProductNames.add(normalizedName);
      }
    }

    return { success: true, error: null, added };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Market listesine eklenemedi.",
      added: 0,
    };
  }
}
