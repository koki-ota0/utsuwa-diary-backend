# Supabase Storage Design for Item Photos

## 1) Bucket structure

- **Bucket name:** `item-photos`
- **Public access:** disabled (`public = false`)
- **Path convention:**
  - `item-photos/{user_id}/{item_id}/{image_no}.{ext}`
  - Example:
    - `item-photos/9f2f4a4f-8db1-4e58-9a1f-4c6dcdb2c0c3/2b24f457-0c44-48ba-a1ec-31366fda5f58/1.jpg`
    - `item-photos/9f2f4a4f-8db1-4e58-9a1f-4c6dcdb2c0c3/2b24f457-0c44-48ba-a1ec-31366fda5f58/2.jpg`
    - `item-photos/9f2f4a4f-8db1-4e58-9a1f-4c6dcdb2c0c3/2b24f457-0c44-48ba-a1ec-31366fda5f58/3.jpg`

### Folder and file rules

- First folder must be the authenticated user ID (`auth.uid()`).
- Second folder is the app's item ID.
- File name must be one of `1`, `2`, or `3` (any extension is allowed).
- This guarantees **max 3 images per item** by path contract.

---

## 2) Storage security policies (SQL)

```sql
-- 0) Create the private bucket (id/name = item-photos)
insert into storage.buckets (id, name, public)
values ('item-photos', 'item-photos', false)
on conflict (id) do update
set public = excluded.public;

-- 1) Helper: validate object path for this use case
-- Expected: {user_id}/{item_id}/{slot}.{ext}
-- slot must be 1..3
create or replace function public.is_valid_item_photo_path(path text)
returns boolean
language sql
stable
as $$
  with p as (
    select storage.foldername(path) as folders,
           storage.filename(path) as file_name
  ),
  parts as (
    select
      folders,
      file_name,
      split_part(file_name, '.', 1) as slot
    from p
  )
  select
    array_length(folders, 1) = 2
    and slot in ('1','2','3');
$$;

-- 2) INSERT: only owner can upload into own folder and valid slot
create policy "item_photos_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'item-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.is_valid_item_photo_path(name)
);

-- 3) SELECT: only owner can read own files
create policy "item_photos_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'item-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- 4) UPDATE (optional but recommended): only owner can overwrite/move within own scope
create policy "item_photos_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'item-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'item-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.is_valid_item_photo_path(name)
);

-- 5) DELETE: only owner can delete own files
create policy "item_photos_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'item-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);
```

### Notes

- This design enforces user isolation at the storage layer by requiring the top-level folder to equal `auth.uid()`.
- The `1|2|3` slot naming convention enforces at most 3 images per item path.
- If you also keep item metadata in a table (e.g., `items`), add an additional check that `{item_id}` belongs to `auth.uid()` for stronger ownership guarantees.
