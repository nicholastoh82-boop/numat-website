import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function checkAdminAuth(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 }

  // Check admin_profiles. Ensure RLS policies allow reading this row.
  const { data: adminProfile } = await supabase
    .from('admin_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!adminProfile) return { error: 'Forbidden', status: 403 }
  return { user, adminProfile }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 1. Check Permissions
    const authCheck = await checkAdminAuth(supabase)
    if ('error' in authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status })
    }

    // 2. Process File
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // 3. Generate Unique Filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`

    // 4. Upload to Supabase Storage
    // MAKE SURE bucket 'products' exists in your Supabase Dashboard
    const { error: uploadError } = await supabase
      .storage
      .from('products')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Storage Upload Error:', uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // 5. Get Public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('products')
      .getPublicUrl(fileName)

    return NextResponse.json({ url: publicUrl }, { status: 200 })

  } catch (error: any) {
    console.error('Upload Route Exception:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}