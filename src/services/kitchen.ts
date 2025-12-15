import { supabase } from './supabase';

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category?: string;
  family_id: string;
  created_at: string;
}

export interface ShoppingListItem {
  id: string;
  name: string;
  is_completed: boolean;
  family_id: string;
  created_at: string;
}

function getCurrentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export async function getInventoryAndBudget() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const defaultData = {
    items: [],
    budget: 0,
    spent: 0,
    shoppingList: [],
    currency: 'TL',
  };
  if (!user) return defaultData;

  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id, preferred_currency')
    .eq('id', user.id)
    .single();

  if (!profile?.family_id) return defaultData;
  const currency = profile.preferred_currency || 'TL';

  const { data: items } = await supabase
    .from('inventory')
    .select('*')
    .eq('family_id', profile.family_id)
    .order('created_at', { ascending: false });

  const { data: shoppingList } = await supabase
    .from('shopping_list')
    .select('*')
    .eq('family_id', profile.family_id)
    .order('is_completed', { ascending: true })
    .order('created_at', { ascending: false });

  const monthKey = getCurrentMonthKey();
  const { data: budgetData } = await supabase
    .from('kitchen_budgets')
    .select('budget_limit, spent_amount')
    .eq('family_id', profile.family_id)
    .eq('month_key', monthKey)
    .maybeSingle();

  return {
    items: items || [],
    budget: budgetData?.budget_limit || 0,
    spent: budgetData?.spent_amount || 0,
    shoppingList: shoppingList || [],
    currency,
  };
}

export async function addInventoryItem(item: {
  name: string;
  quantity: number;
  unit: string;
  category?: string;
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id')
    .eq('id', user.id)
    .single();
  if (!profile?.family_id) return { error: 'No family' };

  const { data, error } = await supabase
    .from('inventory')
    .insert({
      family_id: profile.family_id,
      ...item,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data, error: null };
}

export async function updateItemQuantity(itemId: string, quantity: number) {
  const { error } = await supabase
    .from('inventory')
    .update({ quantity })
    .eq('id', itemId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteInventoryItem(itemId: string) {
  const { error } = await supabase.from('inventory').delete().eq('id', itemId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function addToShoppingList(itemName: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id')
    .eq('id', user.id)
    .single();
  if (!profile?.family_id) return { error: 'No family' };

  const { data, error } = await supabase
    .from('shopping_list')
    .insert({
      family_id: profile.family_id,
      name: itemName,
      is_completed: false,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data, error: null };
}

export async function toggleShoppingItem(itemId: string) {
  const { data: item } = await supabase
    .from('shopping_list')
    .select('is_completed')
    .eq('id', itemId)
    .single();

  if (!item) return { error: 'Item not found' };

  const { error } = await supabase
    .from('shopping_list')
    .update({ is_completed: !item.is_completed })
    .eq('id', itemId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteShoppingItem(itemId: string) {
  const { error } = await supabase.from('shopping_list').delete().eq('id', itemId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function updateBudget(budgetLimit: number) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id')
    .eq('id', user.id)
    .single();
  if (!profile?.family_id) return { error: 'No family' };

  const monthKey = getCurrentMonthKey();
  const { error } = await supabase.from('kitchen_budgets').upsert(
    {
      family_id: profile.family_id,
      month_key: monthKey,
      budget_limit: budgetLimit,
    },
    { onConflict: 'family_id, month_key' }
  );

  if (error) return { error: error.message };
  return { success: true };
}

