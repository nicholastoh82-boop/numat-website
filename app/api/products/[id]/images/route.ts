import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // Standard Next.js 15 type
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const formData = await request.formData()

    // 1. Check if product exists
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id')
      .eq('id', id)
      .single()

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found in database' },
        { status: 404 }
      )
    }

    const files = formData.getAll('images') as File[]
    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No images provided in request' },
        { status: 400 }
      )
    }

    // 2. Get current max display order
    const { data: existingImages } = await supabase
      .from('product_images')
      .select('display_order')
      .eq('product_id', id)
      .order('display_order', { ascending: false })
      .limit(1)

    let nextDisplayOrder = 0
    if (existingImages && existingImages.length > 0) {
      nextDisplayOrder = (existingImages[0].display_order || 0) + 1
    }

    const uploadedImages = []
    let lastError = null

    for (const file of files) {
      // 3. Upload to Supabase Storage (Bucket name: products)
      const fileName = `${id}/${uuidv4()}-${file.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('products')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        console.error('STORAGE ERROR:', uploadError)
        lastError = `Storage: ${uploadError.message}`
        continue
      }

      // 4. Get public URL
      const { data: publicUrl } = supabase.storage
        .from('products')
        .getPublicUrl(fileName)

      // 5. Create product image record in Database
      const { data: imageRecord, error: insertError } = await supabase
        .from('product_images')
        .insert({
          product_id: id,
          image_url: publicUrl.publicUrl,
          alt_text: file.name.replace(/\.[^/.]+$/, ''),
          display_order: nextDisplayOrder++,
        })
        .select()
        .single()

      if (insertError) {
        console.error('DATABASE ERROR:', insertError)
        lastError = `Database: ${insertError.message}`
      } else if (imageRecord) {
        uploadedImages.push(imageRecord)
      }
    }

    // If we processed files but none successfully saved
    if (uploadedImages.length === 0) {
      return NextResponse.json(
        { error: lastError || 'Failed to process images' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      images: uploadedImages,
      message: `Successfully uploaded ${uploadedImages.length} image(s)`,
    })
  } catch (error: any) {
    console.error('CATCH ERROR:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: images, error } = await supabase
      .from('product_images')
      .select('*')
      .eq('product_id', id)
      .order('display_order', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      images: images || [],
      total: images?.length || 0
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { imageId } = await request.json()

    if (!imageId) {
      return NextResponse.json({ error: 'Image ID is required' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: image, error: fetchError } = await supabase
      .from('product_images')
      .select('*')
      .eq('id', imageId)
      .eq('product_id', id)
      .single()

    if (fetchError || !image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }

    // Extract file path safely
    const bucketSearchString = '/storage/v1/object/public/products/'
    const urlParts = image.image_url.split(bucketSearchString)
    if (urlParts.length === 2) {
      const filePath = urlParts[1]
      await supabase.storage.from('products').remove([filePath])
    }

    const { error: deleteError } = await supabase
      .from('product_images')
      .delete()
      .eq('id', imageId)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}