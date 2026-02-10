# Supabase Backend Design: Japanese Hobby App for Tableware & Household Goods

## 1) Database schema (tables, columns, types)

### 1. `profiles`
Extends `auth.users` with app-level profile metadata.

| Column | Type | Constraints / Notes |
|---|---|---|
| `id` | `uuid` | Primary key. References `auth.users(id)` (1:1). |
| `display_name` | `text` | Optional nickname. |
| `created_at` | `timestamptz` | Not null, default `now()`. |
| `updated_at` | `timestamptz` | Not null, default `now()`. |

---

### 2. `items`
Stores each user-owned tableware/household item.

| Column | Type | Constraints / Notes |
|---|---|---|
| `id` | `uuid` | Primary key, default `gen_random_uuid()`. |
| `user_id` | `uuid` | Not null, references `auth.users(id)` on delete cascade. |
| `name` | `text` | Not null. Example: "有田焼 小鉢". |
| `category` | `text` | Not null. Example values: `tableware`, `kitchen_tool`, `home_good`. |
| `material` | `text` | Optional. e.g., porcelain, wood, glass. |
| `brand` | `text` | Optional. |
| `purchase_date` | `date` | Optional. |
| `notes` | `text` | Optional memo field. |
| `is_active` | `boolean` | Not null, default `true`. Soft active flag. |
| `created_at` | `timestamptz` | Not null, default `now()`. |
| `updated_at` | `timestamptz` | Not null, default `now()`. |

Recommended indexes:
- `idx_items_user_id` on (`user_id`)
- `idx_items_user_id_category` on (`user_id`, `category`)
- `idx_items_user_id_created_at` on (`user_id`, `created_at` desc)

---

### 3. `item_photos`
Stores metadata for item images in Supabase Storage.

| Column | Type | Constraints / Notes |
|---|---|---|
| `id` | `uuid` | Primary key, default `gen_random_uuid()`. |
| `item_id` | `uuid` | Not null, references `items(id)` on delete cascade. |
| `user_id` | `uuid` | Not null, references `auth.users(id)` on delete cascade. Redundant but useful for policy checks. |
| `storage_path` | `text` | Not null. Full key path in storage bucket. |
| `caption` | `text` | Optional. |
| `sort_order` | `smallint` | Not null, default `1`. Use `1..3` for display order. |
| `created_at` | `timestamptz` | Not null, default `now()`. |

Constraints:
- `check (sort_order between 1 and 3)`
- `unique (item_id, sort_order)`
- `unique (storage_path)`

**Up to 3 photos rule**
- Enforce with a trigger on `item_photos`:
  - Before insert, count existing rows for `item_id`.
  - Reject when count >= 3.

Recommended indexes:
- `idx_item_photos_item_id` on (`item_id`)
- `idx_item_photos_user_id` on (`user_id`)

---

### 4. `usage_events`
Logs “used today” actions.

| Column | Type | Constraints / Notes |
|---|---|---|
| `id` | `uuid` | Primary key, default `gen_random_uuid()`. |
| `item_id` | `uuid` | Not null, references `items(id)` on delete cascade. |
| `user_id` | `uuid` | Not null, references `auth.users(id)` on delete cascade. |
| `used_on` | `date` | Not null. Date user used the item. |
| `memo` | `text` | Optional usage note. |
| `created_at` | `timestamptz` | Not null, default `now()`. |

Constraints:
- `unique (item_id, used_on)` to avoid duplicate “used today” entries for same item/day.

Recommended indexes:
- `idx_usage_events_user_id_used_on` on (`user_id`, `used_on` desc)
- `idx_usage_events_item_id_used_on` on (`item_id`, `used_on` desc)

---

### Optional helper trigger (recommended)
When inserting into `item_photos` / `usage_events`, auto-fill `user_id = auth.uid()` if null and verify ownership through `items.user_id`.

## 2) Relationships

- `auth.users (1) -> (1) profiles`
  - `profiles.id = auth.users.id`
- `auth.users (1) -> (N) items`
  - `items.user_id -> auth.users.id`
- `items (1) -> (N) item_photos`
  - `item_photos.item_id -> items.id`
- `auth.users (1) -> (N) item_photos`
  - `item_photos.user_id -> auth.users.id`
- `items (1) -> (N) usage_events`
  - `usage_events.item_id -> items.id`
- `auth.users (1) -> (N) usage_events`
  - `usage_events.user_id -> auth.users.id`

Ownership consistency rule:
- `item_photos.user_id` and `usage_events.user_id` must match parent `items.user_id`.
- Enforce with trigger or check in insert policy (using `exists` subquery).

## 3) Row Level Security (RLS) policies

Enable RLS on all app tables:
- `profiles`
- `items`
- `item_photos`
- `usage_events`

### `profiles`
- **SELECT**: user can read own profile only.
  - `using (id = auth.uid())`
- **INSERT**: user can create own profile only.
  - `with check (id = auth.uid())`
- **UPDATE**: user can update own profile only.
  - `using (id = auth.uid()) with check (id = auth.uid())`
- **DELETE**: usually disabled (optional admin-only).

### `items`
- **SELECT**: owner only.
  - `using (user_id = auth.uid())`
- **INSERT**: owner only.
  - `with check (user_id = auth.uid())`
- **UPDATE**: owner only.
  - `using (user_id = auth.uid()) with check (user_id = auth.uid())`
- **DELETE**: owner only.
  - `using (user_id = auth.uid())`

### `item_photos`
- **SELECT**: owner only.
  - `using (user_id = auth.uid())`
- **INSERT**: owner only and parent item must be owned by same user.
  - `with check (user_id = auth.uid() and exists (select 1 from items i where i.id = item_id and i.user_id = auth.uid()))`
- **UPDATE**: owner only and ownership consistency preserved.
  - `using (user_id = auth.uid())`
  - `with check (user_id = auth.uid() and exists (select 1 from items i where i.id = item_id and i.user_id = auth.uid()))`
- **DELETE**: owner only.
  - `using (user_id = auth.uid())`

### `usage_events`
- **SELECT**: owner only.
  - `using (user_id = auth.uid())`
- **INSERT**: owner only and parent item ownership required.
  - `with check (user_id = auth.uid() and exists (select 1 from items i where i.id = item_id and i.user_id = auth.uid()))`
- **UPDATE**: owner only with ownership consistency.
  - `using (user_id = auth.uid())`
  - `with check (user_id = auth.uid() and exists (select 1 from items i where i.id = item_id and i.user_id = auth.uid()))`
- **DELETE**: owner only.
  - `using (user_id = auth.uid())`

## 4) Supabase Storage bucket structure

Create one private bucket:
- Bucket name: `item-photos`
- Public: `false`

Object key convention:
- `user_id/item_id/<uuid>.<ext>`
- Example: `7d4.../2f1.../a9c3...jpg`

Why this structure:
- Easy policy scoping by path prefix.
- Natural grouping by user then item.
- Supports multiple photos per item.

Storage RLS policy idea (`storage.objects`):
- Allow authenticated users to CRUD only files under their own user prefix in `item-photos`.
- Example check logic:
  - `bucket_id = 'item-photos'`
  - first path segment (`foldername(name)[1]`) equals `auth.uid()::text`

Recommended upload flow:
1. Client calls app to create item first.
2. Client uploads image to `item-photos/{auth.uid()}/{item_id}/{uuid}.jpg`.
3. Insert metadata row into `item_photos` with `storage_path`.
4. Enforce max 3 photos at DB layer (`item_photos` trigger).

## Implementation notes (quick start order)

1. Enable email auth in Supabase Auth settings.
2. Create tables + indexes + constraints.
3. Add `item_photos` trigger for max 3 photos.
4. Enable RLS and apply policies table-by-table.
5. Create private storage bucket `item-photos`.
6. Add storage object policies for user-folder isolation.
7. Test with two accounts to confirm strict data isolation.
