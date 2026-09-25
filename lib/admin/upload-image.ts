'use client'

// lib/admin/upload-image.ts
//
// Uploads an image from an admin screen straight to Supabase storage:
// 1. Shrinks large photos in the browser (longest side 2400 px, WebP), which
//    typically turns a 6 MB phone photo into well under 1 MB and makes the
//    public pages faster too.
// 2. Asks /api/admin/upload-url for a one time signed upload URL.
// 3. Sends the file directly to Supabase, never through a Vercel function,
//    so Vercel's 4.5 MB request limit ("Request Entity Too Large") cannot hit.
// Returns the public URL of the stored image.

import { createClient } from '@/lib/supabase/client'

const MAX_EDGE = 2400
const QUALITY = 0.85

/** Shrink and convert raster images. GIF and SVG are left untouched. */
export async function compressImage(file: File): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type)) return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', QUALITY))
    // Keep the original if the browser cannot make WebP or it came out bigger.
    if (!blob || blob.type !== 'image/webp' || blob.size >= file.size) return file
    return blob
  } catch {
    return file
  }
}

async function readError(res: Response, fallback: string): Promise<string> {
  const text = await res.text().catch(() => '')
  try {
    const data = JSON.parse(text) as { error?: string }
    if (data?.error) return data.error
  } catch {
    // Not JSON, for example a plain text error page.
  }
  if (res.status === 413) return 'That image is too large to upload. Please use a smaller image.'
  return text && text.length < 200 ? text : fallback
}

export async function uploadAdminImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file (JPG, PNG, WebP or GIF).')

  const body = await compressImage(file)
  const contentType = body.type || file.type

  const res = await fetch('/api/admin/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contentType, fileName: file.name }),
  })
  if (!res.ok) throw new Error(await readError(res, 'Could not prepare the upload. Please try again.'))
  const { bucket, path, token, publicUrl } = (await res.json()) as {
    bucket: string
    path: string
    token: string
    publicUrl: string
  }

  const supabase = createClient()
  const { error } = await supabase.storage.from(bucket).uploadToSignedUrl(path, token, body, {
    contentType,
    cacheControl: '31536000',
  })
  if (error) throw new Error(`Upload failed: ${error.message}`)

  return publicUrl
}
