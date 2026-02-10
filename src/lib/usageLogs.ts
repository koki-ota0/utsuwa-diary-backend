import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, UsageLogRow, UsageStats } from '../types/usageLog';

export async function logItemUsage(
  supabase: SupabaseClient<Database>,
  itemId: string,
  sceneTag: string,
): Promise<UsageLogRow> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  if (!user) {
    throw new Error('You must be authenticated to log item usage.');
  }

  const { data, error } = await supabase
    .from('usage_logs')
    .insert({
      item_id: itemId,
      user_id: user.id,
      scene_tag: sceneTag,
      used_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getUsageStats(
  supabase: SupabaseClient<Database>,
  itemId: string,
): Promise<UsageStats> {
  const { data, error } = await supabase
    .from('usage_logs')
    .select('item_id,user_id,used_at,scene_tag')
    .eq('item_id', itemId);

  if (error) {
    throw error;
  }

  const rows = data ?? [];
  const byScene = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.scene_tag] = (acc[row.scene_tag] ?? 0) + 1;
    return acc;
  }, {});

  const uniqueUsers = new Set(rows.map((row) => row.user_id)).size;
  const lastUsedAt = rows
    .map((row) => row.used_at)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;

  return {
    itemId,
    totalUses: rows.length,
    uniqueUsers,
    lastUsedAt,
    byScene,
  };
}
