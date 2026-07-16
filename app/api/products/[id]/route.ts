import { NextResponse } from 'next/server'
import { getProduct } from '@/lib/products/get-product'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Thin wrapper over getProduct. The query itself lives in lib/products so the
 * /products/[id] server component can run it directly for metadata and server
 * rendering, without this route and that page drifting apart.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json(
      { error: 'Missing Supabase environment variables.' },
      { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' } },
    )
  }

  const product = await getProduct(id)

  if (!product) {
    return NextResponse.json(
      { error: 'Product not found.' },
      { status: 404, headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' } },
    )
  }

  return NextResponse.json(product, {
    headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' },
  })
}
