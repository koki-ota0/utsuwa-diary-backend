import type { SupabaseClient } from '@supabase/supabase-js'

export interface UploadedItemPhoto {
  id: number
  item_id: string
  image_url: string
  created_at: string
}

export interface UploadItemPhotosResult {
  photos: UploadedItemPhoto[]
  errors: string[]
}

const MAX_PHOTOS_PER_ITEM = 3

/**
 * Uploads up to 3 images for a single item and stores public URLs in `item_photos`.
 *
 * Expected `item_photos` columns:
 * - id (number)
 * - item_id (uuid/text)
 * - image_url (text)
 * - created_at (timestamp)
 */
export async function uploadItemPhotos(
  supabase: SupabaseClient,
  itemId: string,
  files: File[],
  bucket = 'item-photos',
): Promise<UploadItemPhotosResult> {
  if (!itemId) {
    return {
      photos: [],
      errors: ['Missing itemId.'],
    }
  }

  const selectedFiles = files.slice(0, MAX_PHOTOS_PER_ITEM);

  if (selectedFiles.length === 0) {
    return {
      photos: [],
      errors: ['Please select at least one image.'],
    }
  }

  const uploadErrors: string[] = []
  const successfulPhotos: UploadedItemPhoto[] = []

  for (const [index, file] of selectedFiles.entries()) {
    const extension = file.name.split('.').pop() || 'jpg'
    const filePath = `${itemId}/${crypto.randomUUID()}.${extension}`

    const { error: storageError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (storageError) {
      uploadErrors.push(`Image ${index + 1}: ${storageError.message}`)
      continue
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)

    const imageUrl = publicUrlData.publicUrl

    const { data: insertedPhoto, error: insertError } = await supabase
      .from('item_photos')
      .insert({
        item_id: itemId,
        image_url: imageUrl,
      })
      .select('id, item_id, image_url, created_at')
      .single<UploadedItemPhoto>()

    if (insertError) {
      uploadErrors.push(`Image ${index + 1}: ${insertError.message}`)
      await supabase.storage.from(bucket).remove([filePath])
      continue
    }

    successfulPhotos.push(insertedPhoto)
  }

  if (files.length > MAX_PHOTOS_PER_ITEM) {
    uploadErrors.push(`Only the first ${MAX_PHOTOS_PER_ITEM} images were processed.`)
  }

  return {
    photos: successfulPhotos,
    errors: uploadErrors,
  }
}
