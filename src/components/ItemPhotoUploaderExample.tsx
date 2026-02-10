import { type ChangeEvent, useState } from 'react'

import { uploadItemPhotos, type UploadedItemPhoto } from '../lib/itemPhotoUpload'
import { supabase } from '../lib/supabase'

interface ItemPhotoUploaderExampleProps {
  itemId: string
}

export function ItemPhotoUploaderExample({ itemId }: ItemPhotoUploaderExampleProps) {
  const [files, setFiles] = useState<File[]>([])
  const [photos, setPhotos] = useState<UploadedItemPhoto[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(event.target.files ?? [])
    setFiles(nextFiles)
  }

  const handleUpload = async () => {
    setIsUploading(true)
    setErrors([])

    const result = await uploadItemPhotos(supabase, itemId, files)

    setPhotos((prev) => [...result.photos, ...prev])
    setErrors(result.errors)
    setIsUploading(false)
  }

  return (
    <section>
      <h2>Upload Item Photos</h2>

      <input type="file" accept="image/*" multiple onChange={handleFileChange} />

      <button type="button" onClick={handleUpload} disabled={isUploading}>
        {isUploading ? 'Uploading...' : 'Upload up to 3 photos'}
      </button>

      {errors.length > 0 && (
        <ul aria-live="polite">
          {errors.map((error) => (
            <li key={error} style={{ color: 'crimson' }}>
              {error}
            </li>
          ))}
        </ul>
      )}

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
        {photos.map((photo) => (
          <img
            key={photo.id}
            src={photo.image_url}
            alt={`Uploaded photo ${photo.id}`}
            style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 8 }}
          />
        ))}
      </div>
    </section>
  )
}
