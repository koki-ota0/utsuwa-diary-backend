export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UsageLogRow = {
  id: number;
  item_id: string;
  user_id: string;
  used_at: string;
  scene_tag: string;
  created_at: string;
};

export type UsageLogInsert = {
  id?: never;
  item_id: string;
  user_id: string;
  used_at?: string;
  scene_tag: string;
  created_at?: string;
};

export type UsageLogUpdate = {
  id?: never;
  item_id?: string;
  user_id?: string;
  used_at?: string;
  scene_tag?: string;
  created_at?: string;
};

export type Database = {
  public: {
    Tables: {
      usage_logs: {
        Row: UsageLogRow;
        Insert: UsageLogInsert;
        Update: UsageLogUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type UsageStats = {
  itemId: string;
  totalUses: number;
  uniqueUsers: number;
  lastUsedAt: string | null;
  byScene: Record<string, number>;
};
