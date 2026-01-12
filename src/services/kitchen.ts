import { supabase } from "./supabase";

export async function getInventoryAndBudget() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { items: [], shoppingList: [], budget: 0, spent: 0 };

  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id, preferred_currency")
    .eq("id", user.id)
    .single();

  if (!profile?.family_id)
    return { items: [], shoppingList: [], budget: 0, spent: 0 };

  // Next.js: 'product_name' sütunu kullanılıyor
  const { data: items } = await supabase
    .from("inventory")
    .select("*")
    .eq("family_id", profile.family_id);

  const { data: shoppingList } = await supabase
    .from("shopping_list")
    .select("*")
    .eq("family_id", profile.family_id);

  const monthKey = `${new Date().getFullYear()}-${String(
    new Date().getMonth() + 1
  ).padStart(2, "0")}`;
  const { data: budgetData } = await supabase
    .from("kitchen_budgets")
    .select("*")
    .eq("family_id", profile.family_id)
    .eq("month_key", monthKey)
    .maybeSingle();

  return {
    items: items || [],
    shoppingList: shoppingList || [],
    budget: budgetData?.budget_limit || 0,
    spent: budgetData?.spent_amount || 0,
    currency: profile.preferred_currency || "TL",
  };
}

export async function addInventoryItem(itemData: {
  product_name: string;
  quantity: string;
  price: string;
  category?: string;
  unit?: string;
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id")
    .eq("id", user.id)
    .single();

  if (!profile?.family_id) return { error: "No family" };

  const { data, error } = await supabase
    .from("inventory")
    .insert({
      family_id: profile.family_id,
      product_name: itemData.product_name,
      quantity: parseFloat(itemData.quantity) || 1,
      price: parseFloat(itemData.price) || 0,
      category: itemData.category || "Genel",
      unit: itemData.unit || "adet",
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { success: true, data };
}
