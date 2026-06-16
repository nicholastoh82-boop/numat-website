import { NextRequest, NextResponse } from 'next/server'
import { requireProductionUser, adminClient } from '../_lib/auth'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// A treatment photo is required as documentation, so this accepts form data
// (the photo plus the fields) rather than JSON. The photo goes to the private
// qc-photos bucket and its path is stored on the test row.
const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export async function POST(req: NextRequest) {
  const auth = await requireProductionUser()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'expected a form with the photo' }, { status: 400 })

  const slat_receipt_id = String(form.get('slat_receipt_id') || '')
  const event_date = String(form.get('event_date') || '')
  const p = Number(form.get('slats_pass'))
  const f = Number(form.get('slats_fail'))
  const notes = form.get('notes') ? String(form.get('notes')) : null
  const shift_operator = form.get('shift_operator') ? String(form.get('shift_operator')) : null
  const file = form.get('photo')

  if (!slat_receipt_id) return NextResponse.json({ error: 'slat_receipt_id required' }, { status: 400 })
  if (!event_date) return NextResponse.json({ error: 'event_date required' }, { status: 400 })
  if (!Number.isFinite(p) || !Number.isFinite(f) || p < 0 || f < 0) return NextResponse.json({ error: 'invalid quantities' }, { status: 400 })
  if (p + f === 0) return NextResponse.json({ error: 'at least one slat must be tested' }, { status: 400 })
  if (!file || typeof file === 'string' || (file as File).size === 0) {
    return NextResponse.json({ error: 'a treatment photo is required' }, { status: 400 })
  }

  const photoFile = file as File
  const mime = photoFile.type || 'image/jpeg'
  if (!MIME_EXT[mime]) return NextResponse.json({ error: 'photo must be a JPG, PNG or WEBP image' }, { status: 415 })

  const sc = adminClient()

  // The referenced receipt must exist and not be voided.
  const { data: receipt, error: rcErr } = await sc.from('prod_slat_receipts')
    .select('id, slats_passed, voided').eq('id', slat_receipt_id).single()
  if (rcErr || !receipt) return NextResponse.json({ error: 'slat receipt not found' }, { status: 404 })
  if (receipt.voided) return NextResponse.json({ error: 'cannot test a voided receipt' }, { status: 400 })

  // Upload the documentation photo first, so a test is never saved without it.
  const day = (event_date || new Date().toISOString().slice(0, 10)).slice(0, 10)
  const uuid = crypto.randomUUID()
  const storagePath = `borax/${day}/${uuid}.${MIME_EXT[mime]}`
  const bytes = Buffer.from(await photoFile.arrayBuffer())
  const { error: upErr } = await sc.storage.from('qc-photos').upload(storagePath, bytes, {
    contentType: mime,
    upsert: false,
  })
  if (upErr) return NextResponse.json({ error: `photo upload failed: ${upErr.message}` }, { status: 500 })

  const { data, error } = await sc.from('prod_borax_tests').insert({
    slat_receipt_id, event_date,
    slats_pass: p, slats_fail: f,
    notes, shift_operator,
    storage_path: storagePath,
    submitted_by: auth.email,
  }).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}
