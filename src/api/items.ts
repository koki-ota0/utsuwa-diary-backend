import type { SupabaseClient } from "@supabase/supabase-js";

const ITEMS_TABLE = "items";

type UUID = string;

export type Item = {
  id: UUID;
  user_id: UUID;
  name: string;
  category: string;
  brand_or_shop: string | null;
  notes: string | null;
  created_at: string;
};

export type ItemInput = {
  name: string;
  category: string;
  brand_or_shop?: string;
  notes?: string;
};

type InsertItemPayload = {
  user_id: UUID;
  name: string;
  category: string;
  brand_or_shop: string | null;
  notes: string | null;
};

/**
 * Creates a new item for the currently authenticated user.
 */
export async function createItem(
  supabase: SupabaseClient,
  input: ItemInput,
): Promise<Item> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(`Failed to resolve authenticated user: ${authError.message}`);
  }

  if (!user) {
    throw new Error("No authenticated user found.");
  }

  const payload: InsertItemPayload = {
    user_id: user.id,
    name: input.name,
    category: input.category,
    brand_or_shop: input.brand_or_shop ?? null,
    notes: input.notes ?? null,
  };

  const { data, error } = await supabase
    .from(ITEMS_TABLE)
    .insert(payload)
    .select("id, user_id, name, category, brand_or_shop, notes, created_at")
    .single();

  if (error) {
    throw new Error(`Failed to create item: ${error.message}`);
  }

  return data as Item;
}

/**
 * Returns all items owned by the currently authenticated user.
 */
export async function getMyItems(supabase: SupabaseClient): Promise<Item[]> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(`Failed to resolve authenticated user: ${authError.message}`);
  }

  if (!user) {
    throw new Error("No authenticated user found.");
  }

  const { data, error } = await supabase
    .from(ITEMS_TABLE)
    .select("id, user_id, name, category, brand_or_shop, notes, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load items: ${error.message}`);
  }

  return (data ?? []) as Item[];
}

/**
 * Deletes an item by ID if it belongs to the currently authenticated user.
 */
export async function deleteItem(
  supabase: SupabaseClient,
  itemId: UUID,
): Promise<void> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(`Failed to resolve authenticated user: ${authError.message}`);
  }

  if (!user) {
    throw new Error("No authenticated user found.");
  }

  const { error } = await supabase
    .from(ITEMS_TABLE)
    .delete()
    .eq("id", itemId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(`Failed to delete item: ${error.message}`);
  }
}
