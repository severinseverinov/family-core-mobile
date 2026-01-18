import { supabase } from "./supabase";
import { GoogleGenerativeAI } from "@google/generative-ai";

// AI Yapılandırması (Web sürümü ile uyumlu model ismi)
const geminiApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(geminiApiKey);

// Yardımcı: Ay Anahtarı (Örn: "2026-01")
function getCurrentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function normalizeProductName(value: string) {
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

function isProductMatch(source: string, target: string) {
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

    const { error } = await supabase.from("meal_polls").insert({
      family_id: profile.family_id,
      created_by: user.id,
      title: input.title,
      suggestions: input.suggestions,
      missing_items: input.missingItems,
      extra_notes: input.extraNotes || null,
      end_at: input.endAt || null,
      audience: input.audience,
      member_ids: input.audience === "members" ? input.memberIds || [] : null,
      is_approved: false,
      votes: {},
    });

    if (!error) {
      await notifyFamilyMembers(
        profile.family_id,
        "Yemek anketi yayınlandı",
        "Yeni yemek anketi hazır.",
        input.audience,
        input.memberIds || []
      );
    }

    return { success: !error, error: error?.message };
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
    const { data } = await supabase
      .from("meal_polls")
      .select("*")
      .eq("family_id", profile.family_id)
      .eq("is_active", true)
      .or(`end_at.is.null,end_at.gte.${nowIso}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) return { poll: null };

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
      .select("id, family_id, audience, member_ids, votes, suggestions")
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

    return { success: !error, error: error?.message };
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

    const matchedSuggestion = (poll.suggestions || []).find(
      (item: any) => (item.title || item) === winningTitle
    );
    const missingItems = matchedSuggestion?.missing || [];
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
        is_active: false,
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

// 2. AI Fiş Analizi (Mobil için optimize edildi)
export async function analyzeReceiptMobile(base64Image: string) {
  try {
    if (!geminiApiKey) {
      return { error: "Gemini API key tanımlı değil." };
    }
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" }); // Not: gemini-2.5-flash henüz genel erişimde olmayabilir, stabilite için 1.5-flash önerilir.
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
