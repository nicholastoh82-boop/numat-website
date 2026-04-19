'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

interface Lead {
  id: string
  first_name: string | null
  last_name: string | null
  full_name: string | null
  email: string
  company: string | null
  country: string | null
  city: string | null
  phone: string | null
  segment: string | null
  status: string | null
  pipeline_stage: string | null
  rep_assigned: string | null
  rep_email: string | null
  priority_tier: string | null
  notes: string | null
  deal_value_php: number | null
  deal_value_usd: number | null
  quoted_at: string | null
  quote_currency: string | null
  quote_notes: string | null
  quote_issued_by: string | null
  last_activity_at: string | null
  created_at: string
  title?: string | null
  website?: string | null
  linkedin_url?: string | null
  email_sent_at?: string | null
  replied_at?: string | null
  last_email_sent?: string | null
  last_activity_type?: string | null
  reply_classification?: string | null
  appointment_date?: string | null
  close_date?: string | null
  follow_up?: string | null
  booking_confirmed?: boolean | null
  won_lost?: string | null
  qty?: number | null
  unit?: string | null
  meeting_link?: string | null
  last_rep_touch_at?: string | null
  last_rep_touch_by?: string | null
  last_rep_touch_subject?: string | null
  rep_reply_count?: number | null
}

interface CRMUser {
  id: string
  name: string
  email: string
  role: string
  is_active: boolean
}

interface Quote {
  id: string
  quote_number: string
  doc_type: string
  total: number | string
  currency: string | null
  created_at: string
  sent_at: string | null
  email: string | null
  lead_id: string | null
  customer_name: string | null
  company: string | null
}

const PIPELINE_STAGES = ['new','contacted','qualified','proposal_sent','meeting_booked','won','lost']
const STATUS_OPTIONS = ['pending','active','replied','nurturing','booking_sent','booked','closed','cold_close','bounced','unsubscribed']

const STAGE_COLORS: Record<string, string> = {
  new: 'bg-gray-100 text-gray-600',
  contacted: 'bg-blue-100 text-blue-700',
  qualified: 'bg-purple-100 text-purple-700',
  proposal_sent: 'bg-amber-100 text-amber-700',
  meeting_booked: 'bg-orange-100 text-orange-700',
  won: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-700',
}

const STAGE_LABELS: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  proposal_sent: 'Proposal Sent',
  meeting_booked: 'Meeting Booked',
  won: 'Won',
  lost: 'Lost',
}

const STATUS_COLORS: Record<string, string> = {
  booked: 'bg-green-100 text-green-700',
  closed: 'bg-green-100 text-green-700',
  bounced: 'bg-red-100 text-red-700',
  unsubscribed: 'bg-red-100 text-red-700',
}

const REPLY_CLASSIFICATIONS = ['interested','not_interested','out_of_office','wrong_person','request_info','unsubscribed']

// Product catalogue (available SKUs only, sourced from Supabase Apr 2026)
const FX_FLOOR_PHP_PER_USD = 55 // floor rate used for ex-factory guardrail

interface ProductVariant {
  id: string
  sku: string
  productName: string
  category: string
  sizeLabel: string
  unit: string
  moq: number
  basePriceUsd: number
  exFactoryPhp: number | null
}

const PRODUCT_VARIANTS: ProductVariant[] = [
  { id:'936e18a9-fae3-48e2-b4a4-689e67cd1bcc', sku:'NUBAM-012-2PLY-HC', productName:'NuBam Boards', category:'NuBam Boards', sizeLabel:'2440x1220x12mm 2PLY HC', unit:'piece', moq:10, basePriceUsd:68, exFactoryPhp:3722.98 },
  { id:'2c735f1e-20ba-428d-b030-4d1a4e494cda', sku:'NUBAM-016-3PLY-HC', productName:'NuBam Boards', category:'NuBam Boards', sizeLabel:'2440x1220x16mm 3PLY HC', unit:'piece', moq:10, basePriceUsd:86, exFactoryPhp:4723.70 },
  { id:'810a7d4b-4b53-4333-bcb2-72098d1c38b6', sku:'NUBAM-020-3PLY-HC', productName:'NuBam Boards', category:'NuBam Boards', sizeLabel:'2440x1220x20mm 3PLY HC', unit:'piece', moq:10, basePriceUsd:123, exFactoryPhp:6725.14 },
  { id:'f47a5021-7854-4a10-8511-d9e46a043d97', sku:'NUBAM-025-5PLY-HC', productName:'NuBam Boards', category:'NuBam Boards', sizeLabel:'2440x1220x25mm 5PLY HC', unit:'piece', moq:10, basePriceUsd:159, exFactoryPhp:8726.58 },
  { id:'c4e3f752-1bcb-4efe-be3e-9c618ccc5f3a', sku:'NUBAM-030-5PLY-HC', productName:'NuBam Boards', category:'NuBam Boards', sizeLabel:'2440x1220x30mm 5PLY HC', unit:'piece', moq:10, basePriceUsd:196, exFactoryPhp:10728.02 },
  { id:'3bc52f65-76d9-418a-90ab-f3d63bc29862', sku:'NUBAM-030-3PLY-VC', productName:'NuBam Boards', category:'NuBam Boards', sizeLabel:'2440x1220x30mm 3PLY VC', unit:'piece', moq:10, basePriceUsd:198, exFactoryPhp:10889.04 },
  { id:'0696d712-de40-467b-8686-016cde3a3aba', sku:'NUBAM-040-5PLY-VC', productName:'NuBam Boards', category:'NuBam Boards', sizeLabel:'2440x1220x40mm 5PLY VC', unit:'piece', moq:10, basePriceUsd:235, exFactoryPhp:12890.48 },
  { id:'7d9dc48e-d48a-442b-90c9-8d1a3fd5cab8', sku:'NUBAM-050-5PLY-VC', productName:'NuBam Boards', category:'NuBam Boards', sizeLabel:'2440x1220x50mm 5PLY VC', unit:'piece', moq:10, basePriceUsd:308, exFactoryPhp:16893.36 },
  { id:'05e04977-5119-46cb-a91f-520e5b5e6065', sku:'NUWALL-012-2PLY-HC', productName:'NuWall', category:'NuWall', sizeLabel:'2440x1220x12mm 2PLY HC', unit:'piece', moq:10, basePriceUsd:68, exFactoryPhp:3722.98 },
  { id:'e1ccd43c-fb30-4cbc-a20e-15ad09ff7373', sku:'NUWALL-016-3PLY-HC', productName:'NuWall', category:'NuWall', sizeLabel:'2440x1220x16mm 3PLY HC', unit:'piece', moq:10, basePriceUsd:86, exFactoryPhp:4723.70 },
  { id:'88ffae79-3599-46b6-8d5e-871eab9beba7', sku:'NUWALL-020-3PLY-HC', productName:'NuWall', category:'NuWall', sizeLabel:'2440x1220x20mm 3PLY HC', unit:'piece', moq:10, basePriceUsd:123, exFactoryPhp:6725.14 },
  { id:'a7d17d35-ce5c-46e5-af3e-4933814708f9', sku:'NUWALL-025-5PLY-HC', productName:'NuWall', category:'NuWall', sizeLabel:'2440x1220x25mm 5PLY HC', unit:'piece', moq:10, basePriceUsd:159, exFactoryPhp:8726.58 },
  { id:'d18586e3-2a7f-4079-8f48-5fda5b34877e', sku:'NUWALL-030-5PLY-HC', productName:'NuWall', category:'NuWall', sizeLabel:'2440x1220x30mm 5PLY HC', unit:'piece', moq:10, basePriceUsd:196, exFactoryPhp:10728.02 },
  { id:'546304d5-09ef-4ba7-a27d-5fd10f691222', sku:'NUWALL-030-3PLY-VC', productName:'NuWall', category:'NuWall', sizeLabel:'2440x1220x30mm 3PLY VC', unit:'piece', moq:10, basePriceUsd:198, exFactoryPhp:10889.04 },
  { id:'b073beb3-1707-4d79-83d7-7cc8f70fb48f', sku:'NUWALL-040-5PLY-VC', productName:'NuWall', category:'NuWall', sizeLabel:'2440x1220x40mm 5PLY VC', unit:'piece', moq:10, basePriceUsd:235, exFactoryPhp:12890.48 },
  { id:'e6b0ce70-fe53-490d-97c5-8eef60202e7d', sku:'NUWALL-050-5PLY-VC', productName:'NuWall', category:'NuWall', sizeLabel:'2440x1220x50mm 5PLY VC', unit:'piece', moq:10, basePriceUsd:308, exFactoryPhp:16893.36 },
  { id:'7be2be7b-abc9-469e-b20e-caf37370c3a2', sku:'NUDOOR-LIGHT', productName:'NuDoor', category:'NuDoor', sizeLabel:'2100x800x40mm Light', unit:'piece', moq:5, basePriceUsd:250, exFactoryPhp:null },
  { id:'44b2a331-8bcf-4696-ab3d-8150ab691c31', sku:'NUDOOR-COMPOSITE', productName:'NuDoor', category:'NuDoor', sizeLabel:'2100x800x40mm Composite', unit:'piece', moq:5, basePriceUsd:300, exFactoryPhp:null },
  { id:'a4b38f1a-e617-42fd-af1b-fc680566e382', sku:'NUDOOR-PREMIUM', productName:'NuDoor', category:'NuDoor', sizeLabel:'2100x800x40mm Premium', unit:'piece', moq:5, basePriceUsd:350, exFactoryPhp:null },
  { id:'276784a7-390b-4ba1-b4b5-ee1fb23be34b', sku:'NUFLOOR-020-3PLY', productName:'NuFloor', category:'NuFloor', sizeLabel:'1220x153x20mm 3PLY', unit:'piece', moq:20, basePriceUsd:15, exFactoryPhp:null },
  { id:'d1ea85f3-75cf-4c41-913d-17806742d677', sku:'NUFLOOR-020-3PLY-1220x305', productName:'NuFloor', category:'NuFloor', sizeLabel:'1220x305x20mm 3PLY', unit:'piece', moq:20, basePriceUsd:15, exFactoryPhp:null },
  { id:'c80f8a43-6552-4aef-b399-c6af9adac3c9', sku:'NUSLAT-3MM-2400L-27W', productName:'NuSlat', category:'NuSlat', sizeLabel:'2400x27x3mm', unit:'slat', moq:500, basePriceUsd:0.40, exFactoryPhp:null },
  { id:'77feccc2-506a-4702-be57-784b8717d4d0', sku:'NUSLAT-3MM-2400L-25W', productName:'NuSlat', category:'NuSlat', sizeLabel:'2400x25x3mm', unit:'slat', moq:500, basePriceUsd:0.40, exFactoryPhp:null },
  { id:'7e940a43-6b59-4212-a43f-33b6ab663e91', sku:'NUSLAT-3MM-2400L-26W', productName:'NuSlat', category:'NuSlat', sizeLabel:'2400x26x3mm', unit:'slat', moq:500, basePriceUsd:0.40, exFactoryPhp:null },
  { id:'5fec6030-7ab6-4e2b-9e52-86cb5a7e2a28', sku:'NUSLAT-3MM-1000L-25W', productName:'NuSlat', category:'NuSlat', sizeLabel:'1000x25x3mm', unit:'slat', moq:500, basePriceUsd:0.17, exFactoryPhp:null },
  { id:'b4e52d75-31a1-461e-8ae8-2d83e01fa98d', sku:'NUSLAT-3MM-1000L-26W', productName:'NuSlat', category:'NuSlat', sizeLabel:'1000x26x3mm', unit:'slat', moq:500, basePriceUsd:0.17, exFactoryPhp:null },
  { id:'5de1b537-13b9-4ca8-ab31-e34dde38a6a8', sku:'NUSLAT-3MM-1000L-27W', productName:'NuSlat', category:'NuSlat', sizeLabel:'1000x27x3mm', unit:'slat', moq:500, basePriceUsd:0.17, exFactoryPhp:null },
  { id:'af0714ea-74cb-40c2-be93-67a344e27709', sku:'NUSLAT-3MM-1200L-25W', productName:'NuSlat', category:'NuSlat', sizeLabel:'1200x25x3mm', unit:'slat', moq:500, basePriceUsd:0.20, exFactoryPhp:null },
  { id:'8135bff5-d59d-4830-807d-0dec00274887', sku:'NUSLAT-3MM-1200L-26W', productName:'NuSlat', category:'NuSlat', sizeLabel:'1200x26x3mm', unit:'slat', moq:500, basePriceUsd:0.20, exFactoryPhp:null },
  { id:'93efdf10-8650-4bd3-bd95-6cc1350a8be5', sku:'NUSLAT-3MM-1200L-27W', productName:'NuSlat', category:'NuSlat', sizeLabel:'1200x27x3mm', unit:'slat', moq:500, basePriceUsd:0.20, exFactoryPhp:null },
  { id:'bb3c5eeb-d5c4-42d1-bc1d-b5750361e6f7', sku:'NUSLAT-4MM-1000L-25W', productName:'NuSlat', category:'NuSlat', sizeLabel:'1000x25x4mm', unit:'slat', moq:500, basePriceUsd:0.17, exFactoryPhp:null },
  { id:'7a9bcbf3-8236-449b-a7ec-8108d0f38a57', sku:'NUSLAT-4MM-2400L-27W', productName:'NuSlat', category:'NuSlat', sizeLabel:'2400x27x4mm', unit:'slat', moq:500, basePriceUsd:0.40, exFactoryPhp:null },
  { id:'1a614a89-190f-4e6c-90ae-7c74334436aa', sku:'NUSLAT-4MM-2400L-26W', productName:'NuSlat', category:'NuSlat', sizeLabel:'2400x26x4mm', unit:'slat', moq:500, basePriceUsd:0.40, exFactoryPhp:null },
  { id:'a9529e73-28aa-4cb1-acd0-d81589e0a5ba', sku:'NUSLAT-4MM-2400L-25W', productName:'NuSlat', category:'NuSlat', sizeLabel:'2400x25x4mm', unit:'slat', moq:500, basePriceUsd:0.40, exFactoryPhp:null },
  { id:'9ba003af-f41c-44b5-81af-3e40f2c4447d', sku:'NUSLAT-4MM-1200L-25W', productName:'NuSlat', category:'NuSlat', sizeLabel:'1200x25x4mm', unit:'slat', moq:500, basePriceUsd:0.20, exFactoryPhp:null },
  { id:'1b7663f1-addb-4faf-af20-dabf7f266807', sku:'NUSLAT-4MM-1200L-26W', productName:'NuSlat', category:'NuSlat', sizeLabel:'1200x26x4mm', unit:'slat', moq:500, basePriceUsd:0.20, exFactoryPhp:null },
  { id:'8d6dfcab-eecc-4dc7-83cc-7c4347df7b28', sku:'NUSLAT-4MM-1200L-27W', productName:'NuSlat', category:'NuSlat', sizeLabel:'1200x27x4mm', unit:'slat', moq:500, basePriceUsd:0.20, exFactoryPhp:null },
  { id:'1c38ceb5-718e-4136-af49-240a69f6a313', sku:'NUSLAT-6MM-2400L-27W', productName:'NuSlat', category:'NuSlat', sizeLabel:'2400x27x6mm', unit:'slat', moq:500, basePriceUsd:0.40, exFactoryPhp:null },
  { id:'1715cec8-30cb-4f0a-b542-129e7ceda61a', sku:'NUSLAT-6MM-2400L-26W', productName:'NuSlat', category:'NuSlat', sizeLabel:'2400x26x6mm', unit:'slat', moq:500, basePriceUsd:0.40, exFactoryPhp:null },
  { id:'b85847df-b33b-4e58-ade6-e4a784aa5a4e', sku:'NUSLAT-6MM-2400L-25W', productName:'NuSlat', category:'NuSlat', sizeLabel:'2400x25x6mm', unit:'slat', moq:500, basePriceUsd:0.40, exFactoryPhp:null },
  { id:'6c6f17c3-03dc-4a9a-b6d3-2e93227e711e', sku:'NUSLAT-9MM-2400L-26W', productName:'NuSlat', category:'NuSlat', sizeLabel:'2400x26x9mm', unit:'slat', moq:500, basePriceUsd:0.40, exFactoryPhp:null },
  { id:'c06e7793-9894-4092-a98f-4f9eb081aade', sku:'NUSLAT-9MM-2400L-27W', productName:'NuSlat', category:'NuSlat', sizeLabel:'2400x27x9mm', unit:'slat', moq:500, basePriceUsd:0.40, exFactoryPhp:null },
  { id:'30361c05-6d96-44fc-8fbd-05131a1bfef0', sku:'NUSLAT-9MM-2400L-25W', productName:'NuSlat', category:'NuSlat', sizeLabel:'2400x25x9mm', unit:'slat', moq:500, basePriceUsd:0.40, exFactoryPhp:null },
]

interface QuoteLineItem {
  lineId: string
  variantId: string
  sku: string
  productName: string
  sizeLabel: string
  unit: string
  moq: number
  qty: number
  unitPriceUsd: number
  exFactoryPhp: number | null
  isCustom?: boolean
  productSpecs?: string
}

const CUSTOM_VARIANT_ID = '__custom__'

function floorPriceUsd(exPhp: number | null): number | null {
  if (!exPhp) return null
  return parseFloat((exPhp / FX_FLOOR_PHP_PER_USD).toFixed(2))
}

const formatStatusLabel = (s: string) => s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())

function relDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  const diffMs = Date.now() - d.getTime()
  const diffDays = Math.floor(diffMs / 86_400_000)
  if (diffDays < 1) return 'Today'
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString('en-PH', { day: 'numeric', month: 'short' })
}

function mostRecent(...isos: (string | null | undefined)[]): string | null {
  const valid = isos.filter(Boolean) as string[]
  if (valid.length === 0) return null
  return valid.reduce((a, b) => (new Date(a) > new Date(b) ? a : b))
}

const PHP_TO_USD = 56 // ₱/USD rate

export default function CRMDashboard() {
  const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
  const router = useRouter()

  const [user, setUser] = useState<CRMUser | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [filtered, setFiltered] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('all')
  const [repFilter, setRepFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [quoteModal, setQuoteModal] = useState<{ lead: Lead; docType: 'proforma_invoice' | 'invoice' } | null>(null)
  const [quoteLineItems, setQuoteLineItems] = useState<QuoteLineItem[]>([])
  const [quoteNotes, setQuoteNotes] = useState('')
  const [quoteSubmitting, setQuoteSubmitting] = useState(false)
  // Invoice-specific fields
  const [invoiceCustomerTin, setInvoiceCustomerTin] = useState('')
  const [invoiceCustomerAddress, setInvoiceCustomerAddress] = useState('')
  const [invoiceDueDate, setInvoiceDueDate] = useState('')
  const [invoicePoRef, setInvoicePoRef] = useState('')
  const [invoiceVatEnabled, setInvoiceVatEnabled] = useState(false)
  // Add Lead modal
  const [addLeadOpen, setAddLeadOpen] = useState(false)
  const [addLeadSubmitting, setAddLeadSubmitting] = useState(false)
  const [newLead, setNewLead] = useState({
    first_name: '', last_name: '', email: '', company: '', country: '', city: '',
    phone: '', segment: '', title: '', notes: '', priority_tier: '',
    deal_value_php: '', rep_email: '',
  })
  // Quotes (documents per lead)
  const [quotesByLead, setQuotesByLead] = useState<Record<string, Quote[]>>({})
  const [sendingQuoteId, setSendingQuoteId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [analyticsOpen, setAnalyticsOpen] = useState(true)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadUser = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { router.push('/crm/login'); return null }
    const { data } = await supabase.from('crm_users').select('*').eq('email', authUser.email).single()
    if (!data) { router.push('/crm/login'); return null }
    setUser(data)
    return data as CRMUser
  }, [supabase, router])

  const loadLeads = useCallback(async (crmUser: CRMUser) => {
    const SELECT_FIELDS = 'id,first_name,last_name,full_name,email,company,country,city,phone,segment,status,pipeline_stage,rep_assigned,rep_email,priority_tier,notes,deal_value_php,deal_value_usd,quoted_at,quote_currency,quote_notes,quote_issued_by,last_activity_at,created_at,title,website,linkedin_url,email_sent_at,replied_at,last_email_sent,last_activity_type,reply_classification,appointment_date,close_date,follow_up,booking_confirmed,won_lost,qty,unit,meeting_link,last_rep_touch_at,last_rep_touch_by,last_rep_touch_subject,rep_reply_count'
    const PAGE_SIZE = 1000
    const allLeads: Lead[] = []
    let from = 0
    let keepFetching = true

    while (keepFetching) {
      let query = supabase
        .from('master_leads')
        .select(SELECT_FIELDS)
        .order('created_at', { ascending: false })
        .range(from, from + PAGE_SIZE - 1)

      if (crmUser.role === 'rep') {
        query = query.eq('rep_email', crmUser.email)
      }

      const { data, error } = await query
      if (error) { showToast('Failed to load leads', 'error'); return }
      if (!data || data.length === 0) break
      allLeads.push(...data)
      if (data.length < PAGE_SIZE) break
      from += PAGE_SIZE
    }

    setLeads(allLeads)
  }, [supabase])

  const loadQuotes = useCallback(async () => {
    const { data } = await supabase
      .from('quotes')
      .select('id, quote_number, doc_type, total, currency, created_at, sent_at, email, lead_id, customer_name, company')
      .not('lead_id', 'is', null)
      .order('created_at', { ascending: false })
    if (data) {
      const grouped: Record<string, Quote[]> = {}
      for (const q of data as Quote[]) {
        if (!q.lead_id) continue
        if (!grouped[q.lead_id]) grouped[q.lead_id] = []
        grouped[q.lead_id].push(q)
      }
      setQuotesByLead(grouped)
    }
  }, [supabase])

  const refresh = async () => {
    if (!user) return
    setRefreshing(true)
    await loadLeads(user)
    await loadQuotes()
    setRefreshing(false)
  }

  useEffect(() => {
    setLoading(true)
    loadUser().then(u => {
      if (u) loadLeads(u).then(() => { setLoading(false); loadQuotes() })
      else setLoading(false)
    })
  }, [loadUser, loadLeads, loadQuotes])

  useEffect(() => {
    let result = [...leads]
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(l =>
        [l.full_name, l.first_name, l.last_name, l.company, l.email, l.city, l.segment]
          .some(v => v?.toLowerCase().includes(q))
      )
    }
    if (stageFilter !== 'all') result = result.filter(l => l.pipeline_stage === stageFilter)
    if (repFilter !== 'all') result = result.filter(l => l.rep_email === repFilter)
    setFiltered(result)
  }, [leads, search, stageFilter, repFilter])

  const updateLead = async (id: string, updates: Record<string, unknown>) => {
    setSaving(id)
    const { error } = await supabase
      .from('master_leads')
      .update({ ...updates, last_activity_at: new Date().toISOString() })
      .eq('id', id)
    if (error) { showToast('Failed to save', 'error') }
    else { setLeads(prev => prev.map(l => l.id === id ? { ...l, ...(updates as Partial<Lead>) } : l)) }
    setSaving(null)
  }

  const openQuoteModal = (lead: Lead, docType: 'proforma_invoice' | 'invoice', e: React.MouseEvent) => {
    e.stopPropagation()
    setQuoteModal({ lead, docType })
    setQuoteNotes('')
    // Default payment due date = today + 30 days for invoices
    const due = new Date()
    due.setDate(due.getDate() + 30)
    setInvoiceCustomerTin('')
    setInvoiceCustomerAddress('')
    setInvoiceDueDate(due.toISOString().slice(0, 10))
    setInvoicePoRef('')
    setInvoiceVatEnabled(false)
    // Pre-populate with one blank line item to prompt the rep
    setQuoteLineItems([{
      lineId: Math.random().toString(36).slice(2),
      variantId: PRODUCT_VARIANTS[0].id,
      sku: PRODUCT_VARIANTS[0].sku,
      productName: PRODUCT_VARIANTS[0].productName,
      sizeLabel: PRODUCT_VARIANTS[0].sizeLabel,
      unit: PRODUCT_VARIANTS[0].unit,
      moq: PRODUCT_VARIANTS[0].moq,
      qty: PRODUCT_VARIANTS[0].moq,
      unitPriceUsd: PRODUCT_VARIANTS[0].basePriceUsd,
      exFactoryPhp: PRODUCT_VARIANTS[0].exFactoryPhp,
    }])
  }

  function updateLineItemVariant(lineId: string, variantId: string) {
    if (variantId === CUSTOM_VARIANT_ID) {
      setQuoteLineItems(prev => prev.map(l =>
        l.lineId === lineId
          ? { ...l, variantId: CUSTOM_VARIANT_ID, isCustom: true, sku: 'CUSTOM',
              productName: 'Custom Order', sizeLabel: '', unit: 'piece',
              moq: 1, qty: Math.max(l.qty, 1), unitPriceUsd: l.unitPriceUsd || 0,
              exFactoryPhp: null, productSpecs: l.productSpecs || '' }
          : l
      ))
      return
    }
    const v = PRODUCT_VARIANTS.find(p => p.id === variantId)
    if (!v) return
    setQuoteLineItems(prev => prev.map(l =>
      l.lineId === lineId
        ? { ...l, variantId: v.id, isCustom: false, sku: v.sku, productName: v.productName,
            sizeLabel: v.sizeLabel, unit: v.unit, moq: v.moq, qty: Math.max(l.qty, v.moq),
            unitPriceUsd: v.basePriceUsd, exFactoryPhp: v.exFactoryPhp, productSpecs: '' }
        : l
    ))
  }

  function updateLineItemQty(lineId: string, qty: number) {
    setQuoteLineItems(prev => prev.map(l => l.lineId === lineId ? { ...l, qty: Math.max(1, qty) } : l))
  }

  function updateLineItemPrice(lineId: string, price: number) {
    setQuoteLineItems(prev => prev.map(l => l.lineId === lineId ? { ...l, unitPriceUsd: price } : l))
  }

  function updateCustomLineField(lineId: string, field: 'productName'|'productSpecs'|'unit', value: string) {
    setQuoteLineItems(prev => prev.map(l => l.lineId === lineId ? { ...l, [field]: value } : l))
  }

  function addLineItem() {
    const v = PRODUCT_VARIANTS[0]
    setQuoteLineItems(prev => [...prev, {
      lineId: Math.random().toString(36).slice(2),
      variantId: v.id, sku: v.sku, productName: v.productName, sizeLabel: v.sizeLabel,
      unit: v.unit, moq: v.moq, qty: v.moq, unitPriceUsd: v.basePriceUsd, exFactoryPhp: v.exFactoryPhp,
    }])
  }

  function addCustomLineItem() {
    setQuoteLineItems(prev => [...prev, {
      lineId: Math.random().toString(36).slice(2),
      variantId: CUSTOM_VARIANT_ID, isCustom: true, sku: 'CUSTOM',
      productName: 'Custom Order', sizeLabel: '', unit: 'piece', moq: 1, qty: 1,
      unitPriceUsd: 0, exFactoryPhp: null, productSpecs: '',
    }])
  }

  function removeLineItem(lineId: string) {
    setQuoteLineItems(prev => prev.filter(l => l.lineId !== lineId))
  }

  const previewQuote = (quoteId: string) => {
    window.open(`/api/quote/${quoteId}/pdf`, '_blank', 'noopener,noreferrer')
  }

  const sendQuote = async (quote: Quote, lead: Lead) => {
    if (sendingQuoteId) return
    const recipient = quote.email || lead.email
    const recipientName = quote.customer_name || lead.full_name || [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Customer'
    const docLabel = quote.doc_type === 'invoice' ? 'Invoice' : 'Proforma invoice'
    const isResend = Boolean(quote.sent_at)
    const verb = isResend ? 'Resend' : 'Send'
    if (!window.confirm(`${verb} ${docLabel} ${quote.quote_number} to ${recipient}?`)) return
    const senderRepEmail = lead.rep_email || 'nick@numat.ph'
    setSendingQuoteId(quote.id)
    try {
      const res = await fetch('https://nicholastoh.app.n8n.cloud/webhook/send-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote_id: quote.id,
          quote_number: quote.quote_number,
          doc_type: quote.doc_type,
          recipient_email: recipient,
          recipient_name: recipientName,
          sender_rep_email: senderRepEmail,
          sent_by: user?.email || 'crm',
        }),
      })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(`n8n responded ${res.status}: ${txt || res.statusText}`)
      }
      const nowIso = new Date().toISOString()
      setQuotesByLead(prev => {
        const list = (prev[lead.id] || []).map(q => q.id === quote.id ? { ...q, sent_at: nowIso } : q)
        return { ...prev, [lead.id]: list }
      })
      showToast(`${docLabel} ${quote.quote_number} sent to ${recipient}`)
    } catch (err: any) {
      showToast(`Failed to send: ${err?.message || 'unknown error'}`, 'error')
    } finally {
      setSendingQuoteId(null)
    }
  }

  const submitQuote = async () => {
    if (!quoteModal || !user || quoteLineItems.length === 0) return
    const { lead, docType } = quoteModal
    const isInvoice = docType === 'invoice'

    // Skip floor check for custom items
    const hasFloorViolation = quoteLineItems.some(l => {
      if (l.isCustom) return false
      const floor = floorPriceUsd(l.exFactoryPhp)
      return floor !== null && l.unitPriceUsd < floor
    })
    if (hasFloorViolation) {
      showToast('One or more items are below the ex-factory floor price. Please adjust before submitting.', 'error')
      return
    }
    // MOQ check skipped for custom
    const hasMoqViolation = quoteLineItems.some(l => !l.isCustom && l.qty < l.moq)
    if (hasMoqViolation) {
      showToast('One or more items are below minimum order quantity.', 'error')
      return
    }
    // Invoice-specific validation
    if (isInvoice && !invoiceDueDate) {
      showToast('Payment due date is required for invoices', 'error')
      return
    }

    setQuoteSubmitting(true)
    const totalUsd = quoteLineItems.reduce((sum, l) => sum + l.qty * l.unitPriceUsd, 0)
    const totalPhp = Math.round(totalUsd * PHP_TO_USD)

    // Build payload for /api/quote/create
    const apiItems = quoteLineItems.map(l => ({
      product_id: l.isCustom ? null : l.variantId,
      is_custom: l.isCustom || false,
      product_name: l.isCustom ? l.productName : undefined,
      product_specs: l.isCustom ? l.productSpecs : (l.sizeLabel || undefined),
      sku: l.sku,
      category: l.isCustom ? 'Custom' : undefined,
      unit: l.unit,
      quantity: l.qty,
      unit_price: l.unitPriceUsd,
      moq_override: l.isCustom,
    }))

    try {
      const res = await fetch('/api/quote/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doc_type: docType,
          customer_name: lead.full_name || [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Customer',
          company: lead.company,
          email: lead.email,
          phone: lead.phone,
          notes: quoteNotes,
          items: apiItems,
          lead_id: lead.id,
          currency: 'USD',
          generated_by: user.email,
          ...(isInvoice ? {
            customer_tin: invoiceCustomerTin || null,
            customer_address: invoiceCustomerAddress || null,
            payment_due_date: invoiceDueDate ? new Date(invoiceDueDate).toISOString() : null,
            po_reference: invoicePoRef || null,
            vat_enabled: invoiceVatEnabled,
            vat_rate: 12.0,
          } : {}),
        }),
      })
      const result = await res.json()
      if (!res.ok || result.error) throw new Error(result.error || `HTTP ${res.status}`)

      const docLabel = isInvoice ? 'Invoice' : 'Proforma invoice'
      const linesSummary = quoteLineItems
        .map(l => `${l.sku} x${l.qty} ${l.unit} @ ${l.unitPriceUsd.toFixed(2)}`)
        .join(', ')
      const updates = {
        pipeline_stage: 'proposal_sent', status: 'active',
        deal_value_php: totalPhp,
        deal_value_usd: parseFloat(totalUsd.toFixed(2)),
        quoted_at: new Date().toISOString(), quote_currency: 'USD',
        quote_notes: [`${docLabel} ${result.quote_number}`, linesSummary, quoteNotes].filter(Boolean).join(' | '),
        quote_issued_by: user.email,
        last_activity_at: new Date().toISOString(),
      }
      await supabase.from('master_leads').update(updates).eq('id', lead.id)
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, ...updates } : l))
      // Optimistically push the new quote into quotesByLead
      const newQuote: Quote = {
        id: result.quote_id,
        quote_number: result.quote_number,
        doc_type: docType,
        total: totalUsd,
        currency: 'USD',
        created_at: new Date().toISOString(),
        sent_at: null,
        email: lead.email,
        lead_id: lead.id,
        customer_name: lead.full_name,
        company: lead.company,
      }
      setQuotesByLead(prev => ({ ...prev, [lead.id]: [newQuote, ...(prev[lead.id] || [])] }))
      showToast(`${docLabel} ${result.quote_number} issued for ${lead.company || lead.full_name || 'lead'}`)
      setQuoteModal(null)
      setQuoteLineItems([])
      setQuoteNotes('')
    } catch (err: any) {
      showToast(`Failed to issue ${isInvoice ? 'invoice' : 'proforma'}: ${err.message || 'unknown error'}`, 'error')
    } finally {
      setQuoteSubmitting(false)
    }
  }

  const submitNewLead = async () => {
    if (!user) return
    const email = newLead.email.trim().toLowerCase()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast('Valid email address is required', 'error')
      return
    }
    setAddLeadSubmitting(true)
    const repNameMap: Record<string,string> = { 'mohan@numat.ph': 'Mohan', 'bryan@numat.ph': 'Bryan', 'nick@numat.ph': 'Nick' }
    // Non-admins can only create leads assigned to themselves
    const repEmail = user.role === 'admin' ? (newLead.rep_email || null) : user.email
    const repName = repEmail ? (repNameMap[repEmail] || repEmail.split('@')[0]) : null
    const fullName = [newLead.first_name, newLead.last_name].filter(Boolean).join(' ').trim() || null
    const payload: Record<string, unknown> = {
      email,
      first_name: newLead.first_name || null,
      last_name: newLead.last_name || null,
      full_name: fullName,
      company: newLead.company || null,
      country: newLead.country || null,
      city: newLead.city || null,
      phone: newLead.phone || null,
      segment: newLead.segment || null,
      title: newLead.title || null,
      notes: newLead.notes || null,
      priority_tier: newLead.priority_tier || null,
      deal_value_php: newLead.deal_value_php ? Number(newLead.deal_value_php) : null,
      rep_email: repEmail,
      rep_assigned: repName,
      source: 'manual',
      lead_source: 'CRM Manual Entry',
      pipeline_stage: 'new',
      status: 'pending',
      last_activity_at: new Date().toISOString(),
    }
    const { data, error } = await supabase.from('master_leads').insert(payload).select('*').single()
    if (error) {
      showToast(`Failed to add lead: ${error.message}`, 'error')
    } else if (data) {
      setLeads(prev => [data as Lead, ...prev])
      showToast(`Lead added: ${(data as Lead).full_name || (data as Lead).email}`)
      setAddLeadOpen(false)
      setNewLead({ first_name:'', last_name:'', email:'', company:'', country:'', city:'', phone:'', segment:'', title:'', notes:'', priority_tier:'', deal_value_php:'', rep_email:'' })
    }
    setAddLeadSubmitting(false)
  }

  const signOut = async () => { await supabase.auth.signOut(); router.push('/crm/login') }
  const repOptions = Array.from(new Set(leads.map(l => l.rep_email).filter(Boolean))) as string[]
  const segmentOptions = Array.from(new Set(leads.map(l => l.segment).filter(Boolean))) as string[]

  const analytics = useMemo(() => {
    const byAgent = new Map<string, number>()
    const bySegment = new Map<string, number>()
    const byCountry = new Map<string, number>()
    const byStage = new Map<string, number>()
    const byStatus = new Map<string, number>()
    for (const l of leads) {
      const agent = l.rep_email || 'unassigned'
      byAgent.set(agent, (byAgent.get(agent) || 0) + 1)
      const seg = l.segment || 'Unspecified'
      bySegment.set(seg, (bySegment.get(seg) || 0) + 1)
      const country = l.country || 'Unknown'
      byCountry.set(country, (byCountry.get(country) || 0) + 1)
      const stage = l.pipeline_stage || 'new'
      byStage.set(stage, (byStage.get(stage) || 0) + 1)
      const status = l.status || 'pending'
      byStatus.set(status, (byStatus.get(status) || 0) + 1)
    }
    const sortDesc = (m: Map<string, number>) => Array.from(m.entries()).sort((a, b) => b[1] - a[1])
    return {
      total: leads.length,
      byAgent: sortDesc(byAgent),
      bySegment: sortDesc(bySegment),
      byCountry: sortDesc(byCountry).slice(0, 10),
      byStage: PIPELINE_STAGES.map(s => [s, byStage.get(s) || 0] as [string, number]),
      byStatus: STATUS_OPTIONS.map(s => [s, byStatus.get(s) || 0] as [string, number]),
    }
  }, [leads])

  const stats = {
    total: filtered.length,
    active: filtered.filter(l => ['active','replied','nurturing'].includes(l.status || '')).length,
    quoted: filtered.filter(l => l.pipeline_stage === 'proposal_sent').length,
    won: filtered.filter(l => l.pipeline_stage === 'won').length,
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">Loading leads...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-700 flex items-center justify-center text-white font-bold text-sm">
              {user?.name?.[0]?.toUpperCase() || 'N'}
            </div>
            <span className="font-semibold text-gray-800">NUMAT CRM</span>
            <span className="text-gray-400 text-sm hidden sm:block">{user?.name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${user?.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
              {user?.role}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setAddLeadOpen(true)} className="px-3 py-1.5 bg-green-700 hover:bg-green-800 rounded-lg text-white text-xs font-medium flex items-center gap-1" title="Add a new lead">
              <span className="text-base leading-none">+</span> Add Lead
            </button>
            <button onClick={refresh} disabled={refreshing} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 text-lg leading-none disabled:opacity-40" title="Refresh">
              {refreshing ? '⟳' : '↻'}
            </button>
            <button onClick={signOut} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500" title="Sign out">⎋</button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {user?.role === 'admin' && (
          <div className="bg-white rounded-xl border border-gray-200 mb-5 overflow-hidden">
            <button
              onClick={() => setAnalyticsOpen(o => !o)}
              className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-700" />
                <span className="font-semibold text-gray-800">Analytics</span>
                <span className="text-xs text-gray-400">{analytics.total.toLocaleString()} total leads</span>
              </div>
              <span className="text-gray-400 text-sm">{analyticsOpen ? '▲' : '▼'}</span>
            </button>
            {analyticsOpen && (
              <div className="border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-gray-100">
                <div className="bg-white p-4">
                  <div className="text-xs uppercase tracking-wide text-gray-400 font-medium mb-2">Total Leads</div>
                  <div className="text-3xl font-bold text-green-700">{analytics.total.toLocaleString()}</div>
                </div>
                <div className="bg-white p-4">
                  <div className="text-xs uppercase tracking-wide text-gray-400 font-medium mb-2">By Agent</div>
                  <ul className="space-y-1 text-sm">
                    {analytics.byAgent.length === 0 && <li className="text-gray-400 text-xs">No data</li>}
                    {analytics.byAgent.map(([agent, count]) => (
                      <li key={agent} className="flex justify-between gap-2">
                        <span className="text-gray-700 truncate">{agent === 'unassigned' ? 'Unassigned' : agent.split('@')[0]}</span>
                        <span className="text-gray-500 tabular-nums">{count.toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-white p-4">
                  <div className="text-xs uppercase tracking-wide text-gray-400 font-medium mb-2">By Segment</div>
                  <ul className="space-y-1 text-sm max-h-40 overflow-y-auto">
                    {analytics.bySegment.length === 0 && <li className="text-gray-400 text-xs">No data</li>}
                    {analytics.bySegment.map(([seg, count]) => (
                      <li key={seg} className="flex justify-between gap-2">
                        <span className="text-gray-700 truncate">{seg}</span>
                        <span className="text-gray-500 tabular-nums">{count.toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-white p-4">
                  <div className="text-xs uppercase tracking-wide text-gray-400 font-medium mb-2">Top 10 Countries</div>
                  <ul className="space-y-1 text-sm">
                    {analytics.byCountry.length === 0 && <li className="text-gray-400 text-xs">No data</li>}
                    {analytics.byCountry.map(([country, count]) => (
                      <li key={country} className="flex justify-between gap-2">
                        <span className="text-gray-700 truncate">{country}</span>
                        <span className="text-gray-500 tabular-nums">{count.toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-white p-4">
                  <div className="text-xs uppercase tracking-wide text-gray-400 font-medium mb-2">By Pipeline Stage</div>
                  <ul className="space-y-1 text-sm">
                    {analytics.byStage.map(([stage, count]) => (
                      <li key={stage} className="flex justify-between gap-2">
                        <span className="text-gray-700 truncate">{STAGE_LABELS[stage] || stage}</span>
                        <span className="text-gray-500 tabular-nums">{count.toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-white p-4">
                  <div className="text-xs uppercase tracking-wide text-gray-400 font-medium mb-2">By Status</div>
                  <ul className="space-y-1 text-sm">
                    {analytics.byStatus.map(([status, count]) => (
                      <li key={status} className="flex justify-between gap-2">
                        <span className="text-gray-700 truncate">{formatStatusLabel(status)}</span>
                        <span className="text-gray-500 tabular-nums">{count.toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-3 mb-5">
          <input type="text" placeholder="Search name, company, email, city..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-52 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          <select value={stageFilter} onChange={e => setStageFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
            <option value="all">All Stages</option>
            {PIPELINE_STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
          </select>
          {user?.role === 'admin' && repOptions.length > 0 && (
            <select value={repFilter} onChange={e => setRepFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
              <option value="all">All Reps</option>
              {repOptions.map(r => <option key={r} value={r}>{r.split('@')[0]}</option>)}
            </select>
          )}
        </div>

        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total', value: stats.total, color: 'text-gray-800' },
            { label: 'Active', value: stats.active, color: 'text-blue-700' },
            { label: 'Quoted', value: stats.quoted, color: 'text-amber-700' },
            { label: 'Won', value: stats.won, color: 'text-green-700' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <p className="text-lg">No leads found</p>
              <p className="text-sm mt-1">Adjust your search or filters</p>
            </div>
          )}
          {filtered.map(lead => {
            const displayName = lead.first_name || lead.full_name?.split(' ')[0] || 'Unknown'
            const isExpanded = expandedId === lead.id
            const stageColor = STAGE_COLORS[lead.pipeline_stage || 'new'] || 'bg-gray-100 text-gray-600'
            const stageLabel = STAGE_LABELS[lead.pipeline_stage || 'new'] || lead.pipeline_stage || 'New'
            const statusColor = STATUS_COLORS[lead.status || ''] || 'bg-gray-100 text-gray-600'
            const lastContact = relDate(mostRecent(lead.last_activity_at, lead.last_email_sent))
            return (
              <div key={lead.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center px-4 py-3 cursor-pointer hover:bg-gray-50 select-none"
                  onClick={() => setExpandedId(isExpanded ? null : lead.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-800">{displayName}</span>
                      {lead.company && <span className="text-gray-500 text-sm">{lead.company}</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stageColor}`}>{stageLabel}</span>
                      {lead.status && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>
                          {formatStatusLabel(lead.status)}
                        </span>
                      )}
                      {lead.quoted_at && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                          ₱{Number(lead.deal_value_php || 0).toLocaleString()} quoted
                        </span>
                      )}
                      {(lead.rep_reply_count || 0) > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium" title={lead.last_rep_touch_subject || 'Rep outbound replies'}>
                          ✉ {lead.rep_reply_count} rep {lead.rep_reply_count === 1 ? 'reply' : 'replies'}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 truncate">
                      {[lead.email, lead.city, lead.country].filter(Boolean).join(' · ')}
                      {lastContact && <span className="ml-2 text-gray-400">· {lastContact}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    <button onClick={e => openQuoteModal(lead, 'proforma_invoice', e)}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${lead.quoted_at ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' : 'bg-white text-green-700 border-green-200 hover:bg-green-50'}`}
                      title="Issue a Proforma Invoice (pre-sale proposal)">
                      {lead.quoted_at ? '↺ Proforma' : '+ Proforma'}
                    </button>
                    <button onClick={e => openQuoteModal(lead, 'invoice', e)}
                      className="text-xs px-3 py-1.5 rounded-lg border font-medium bg-white text-blue-700 border-blue-200 hover:bg-blue-50 transition-colors"
                      title="Issue an Invoice (demand for payment)">
                      + Invoice
                    </button>
                    <span className="text-gray-300 text-sm">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>
                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 py-4 bg-gray-50/70">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-400 block mb-1">Pipeline Stage</label>
                        <select defaultValue={lead.pipeline_stage || 'new'}
                          onChange={e => updateLead(lead.id, { pipeline_stage: e.target.value })}
                          className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                          {PIPELINE_STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-400 block mb-1">Email Status</label>
                        <select defaultValue={lead.status || 'pending'}
                          onChange={e => updateLead(lead.id, { status: e.target.value })}
                          className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-400 block mb-1">Value (PHP)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₱</span>
                          <input type="number" defaultValue={lead.deal_value_php || ''}
                            onBlur={e => updateLead(lead.id, { deal_value_php: parseFloat(e.target.value) || null })}
                            placeholder="0" className="w-full border border-gray-200 bg-white rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-400 block mb-1">Value (USD)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                          <input type="number" defaultValue={lead.deal_value_usd || ''}
                            onBlur={e => updateLead(lead.id, { deal_value_usd: parseFloat(e.target.value) || null })}
                            placeholder="0" className="w-full border border-gray-200 bg-white rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-400 block mb-1">Phone</label>
                        <input type="text" defaultValue={lead.phone || ''} placeholder="+63..."
                          onBlur={e => updateLead(lead.id, { phone: e.target.value || null })}
                          className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-400 block mb-1">Title / Role</label>
                        <input type="text" defaultValue={lead.title || ''} placeholder="e.g. Project Manager"
                          onBlur={e => updateLead(lead.id, { title: e.target.value || null })}
                          className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-400 block mb-1">Segment</label>
                        <select defaultValue={lead.segment || ''}
                          onChange={e => updateLead(lead.id, { segment: e.target.value || null })}
                          className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                          <option value="">— None —</option>
                          {segmentOptions.map(s => <option key={s} value={s}>{s}</option>)}
                          {lead.segment && !segmentOptions.includes(lead.segment) && (
                            <option value={lead.segment}>{lead.segment}</option>
                          )}
                        </select>
                      </div>
                      {user?.role === 'admin' && (
                        <div>
                          <label className="text-xs font-medium text-gray-400 block mb-1">Rep Assigned</label>
                          <select defaultValue={lead.rep_email || ''}
                            onChange={e => {
                              const email = e.target.value
                              const repNameMap: Record<string,string> = {
                                'mohan@numat.ph': 'Mohan',
                                'bryan@numat.ph': 'Bryan',
                              }
                              const name = repNameMap[email] || email.split('@')[0]
                              updateLead(lead.id, {
                                rep_email: email || null,
                                rep_assigned: email ? name : null,
                                rep_reply_to: email || null,
                              })
                            }}
                            className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                            <option value="">— Unassigned —</option>
                            <option value="mohan@numat.ph">Mohan (International)</option>
                            <option value="bryan@numat.ph">Bryan (Philippines)</option>
                          </select>
                        </div>
                      )}
                      <div>
                        <label className="text-xs font-medium text-gray-400 block mb-1">Reply Classification</label>
                        <select defaultValue={lead.reply_classification || ''}
                          onChange={e => updateLead(lead.id, { reply_classification: e.target.value || null })}
                          className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                          <option value="">— None —</option>
                          {REPLY_CLASSIFICATIONS.map(c => <option key={c} value={c}>{formatStatusLabel(c)}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-400 block mb-1">Appointment Date</label>
                        <input type="date" defaultValue={lead.appointment_date ? lead.appointment_date.slice(0, 10) : ''}
                          onBlur={e => updateLead(lead.id, { appointment_date: e.target.value || null })}
                          className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-400 block mb-1">Close Date</label>
                        <input type="date" defaultValue={lead.close_date ? lead.close_date.slice(0, 10) : ''}
                          onBlur={e => updateLead(lead.id, { close_date: e.target.value || null })}
                          className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-400 block mb-1">Follow Up</label>
                        <input type="text" defaultValue={lead.follow_up || ''} placeholder="e.g. Call back 20 Apr"
                          onBlur={e => updateLead(lead.id, { follow_up: e.target.value || null })}
                          className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                      </div>
                      <div className="col-span-2 md:col-span-3">
                        <label className="text-xs font-medium text-gray-400 block mb-1">Notes</label>
                        <textarea defaultValue={lead.notes || ''} rows={2} placeholder="Add notes..."
                          onBlur={e => updateLead(lead.id, { notes: e.target.value })}
                          className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
                      </div>
                    </div>
                    {lead.quoted_at && (
                      <div className="mt-3 px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-700 flex items-start gap-2">
                        <span>📋</span>
                        <span>
                          Quote issued {new Date(lead.quoted_at).toLocaleDateString('en-PH',{day:'numeric',month:'short',year:'numeric'})}
                          {lead.quote_issued_by && ' by ' + lead.quote_issued_by.split('@')[0]}
                          {lead.deal_value_php && ' · ₱' + Number(lead.deal_value_php).toLocaleString()}
                          {lead.deal_value_usd && ' / \u0024' + Number(lead.deal_value_usd).toLocaleString()}
                          {lead.quote_notes && ' · ' + lead.quote_notes}
                        </span>
                      </div>
                    )}
                    {quotesByLead[lead.id] && quotesByLead[lead.id].length > 0 && (
                      <div className="mt-3">
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Documents</div>
                        <div className="space-y-1.5">
                          {quotesByLead[lead.id].map(q => {
                            const isInvoice = q.doc_type === 'invoice'
                            const isSent = Boolean(q.sent_at)
                            const isSending = sendingQuoteId === q.id
                            return (
                              <div key={q.id} className="flex flex-wrap items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs">
                                <span className={`px-1.5 py-0.5 rounded font-semibold ${isInvoice ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                  {isInvoice ? 'INV' : 'PI'}
                                </span>
                                <span className="font-mono text-gray-700">{q.quote_number}</span>
                                <span className="text-gray-300">·</span>
                                <span className="text-gray-600">{q.currency || 'USD'} {Number(q.total).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                                <span className="text-gray-300">·</span>
                                <span className={isSent ? 'text-emerald-700' : 'text-amber-700'}>
                                  {isSent ? `✓ Sent ${relDate(q.sent_at)}` : 'Not sent'}
                                </span>
                                <div className="flex-1 min-w-2" />
                                <button onClick={() => previewQuote(q.id)}
                                  className="px-2.5 py-1 border border-gray-200 rounded hover:bg-gray-50 text-gray-700 font-medium">
                                  Preview
                                </button>
                                <button onClick={() => sendQuote(q, lead)} disabled={isSending}
                                  className={`px-2.5 py-1 rounded font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed ${isSent ? 'bg-gray-500 hover:bg-gray-600' : 'bg-orange-600 hover:bg-orange-700'}`}>
                                  {isSending ? 'Sending…' : isSent ? 'Resend' : 'Send'}
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    {(lead.rep_reply_count || 0) > 0 && lead.last_rep_touch_at && (
                      <div className="mt-3 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-lg text-xs text-emerald-800 flex items-start gap-2">
                        <span>✉</span>
                        <span>
                          Last rep reply {relDate(lead.last_rep_touch_at)}
                          {lead.last_rep_touch_by && ' by ' + lead.last_rep_touch_by.split('@')[0]}
                          {' · ' + lead.rep_reply_count + ' total ' + (lead.rep_reply_count === 1 ? 'reply' : 'replies')}
                          {lead.last_rep_touch_subject && (
                            <span className="block mt-1 text-emerald-700/80 italic truncate">“{lead.last_rep_touch_subject}”</span>
                          )}
                        </span>
                      </div>
                    )}
                    {saving === lead.id && <p className="text-xs text-green-600 mt-2 animate-pulse">Saving...</p>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {quoteModal && (() => {
        const { lead, docType } = quoteModal
        const isInvoice = docType === 'invoice'
        return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
              <h2 className="text-lg font-semibold text-gray-800">
                Issue {isInvoice ? 'Invoice' : 'Proforma Invoice'}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {lead.full_name || [lead.first_name, lead.last_name].filter(Boolean).join(' ')}
                {lead.company && ' · ' + lead.company}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {isInvoice
                  ? 'Binding demand for payment. A PDF invoice will be emailed to the customer.'
                  : 'Pre-sale proposal. A PDF proforma invoice will be emailed to the customer.'}
              </p>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
              {/* Invoice-only fields */}
              {isInvoice && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 space-y-3">
                  <div className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Invoice Details</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">Customer TIN</label>
                      <input type="text" value={invoiceCustomerTin}
                        onChange={e => setInvoiceCustomerTin(e.target.value)}
                        placeholder="000-000-000-000"
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">Payment Due Date <span className="text-red-500">*</span></label>
                      <input type="date" value={invoiceDueDate}
                        onChange={e => setInvoiceDueDate(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-gray-600 block mb-1">Customer Address</label>
                      <input type="text" value={invoiceCustomerAddress}
                        onChange={e => setInvoiceCustomerAddress(e.target.value)}
                        placeholder="Street, City, Country"
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">PO Reference</label>
                      <input type="text" value={invoicePoRef}
                        onChange={e => setInvoicePoRef(e.target.value)}
                        placeholder="Customer PO number (optional)"
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                        <input type="checkbox" checked={invoiceVatEnabled}
                          onChange={e => setInvoiceVatEnabled(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                        <span>Apply 12% VAT</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Line Items */}
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Line Items</div>
                <div className="space-y-3">
                  {quoteLineItems.map((line, idx) => {
                    const floor = line.isCustom ? null : floorPriceUsd(line.exFactoryPhp)
                    const isBelowFloor = floor !== null && line.unitPriceUsd < floor
                    const isBelowMoq = !line.isCustom && line.qty < line.moq
                    const lineTotal = line.qty * line.unitPriceUsd
                    return (
                      <div key={line.lineId} className={`rounded-xl border p-3 space-y-2 ${isBelowFloor ? 'border-red-300 bg-red-50' : line.isCustom ? 'border-purple-200 bg-purple-50/40' : 'border-gray-200 bg-gray-50'}`}>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-400 w-5">{idx + 1}.</span>
                          <select
                            value={line.variantId}
                            onChange={e => updateLineItemVariant(line.lineId, e.target.value)}
                            className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                          >
                            <optgroup label="Custom">
                              <option value={CUSTOM_VARIANT_ID}>— Custom Order —</option>
                            </optgroup>
                            {['NuBam Boards','NuWall','NuDoor','NuFloor','NuSlat'].map(cat => (
                              <optgroup key={cat} label={cat}>
                                {PRODUCT_VARIANTS.filter(v => v.category === cat).map(v => (
                                  <option key={v.id} value={v.id}>{v.sku} — {v.sizeLabel}</option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                          {quoteLineItems.length > 1 && (
                            <button onClick={() => removeLineItem(line.lineId)}
                              className="text-gray-400 hover:text-red-500 text-lg leading-none px-1">×</button>
                          )}
                        </div>
                        {line.isCustom && (
                          <div className="grid grid-cols-2 gap-2 pl-7">
                            <div className="col-span-2">
                              <label className="text-xs text-gray-500">Product Name</label>
                              <input type="text" value={line.productName}
                                onChange={e => updateCustomLineField(line.lineId, 'productName', e.target.value)}
                                placeholder="e.g. Custom bamboo panel 600x400x20mm"
                                className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm mt-0.5 bg-white focus:outline-none focus:ring-2 focus:ring-green-500" />
                            </div>
                            <div className="col-span-2">
                              <label className="text-xs text-gray-500">Specs / Description</label>
                              <input type="text" value={line.productSpecs || ''}
                                onChange={e => updateCustomLineField(line.lineId, 'productSpecs', e.target.value)}
                                placeholder="Dimensions, material, finish, notes..."
                                className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm mt-0.5 bg-white focus:outline-none focus:ring-2 focus:ring-green-500" />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500">Unit</label>
                              <input type="text" value={line.unit}
                                onChange={e => updateCustomLineField(line.lineId, 'unit', e.target.value)}
                                placeholder="piece, sqm, lm..."
                                className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm mt-0.5 bg-white focus:outline-none focus:ring-2 focus:ring-green-500" />
                            </div>
                          </div>
                        )}
                        <div className="grid grid-cols-3 gap-2 pl-7">
                          <div>
                            <label className="text-xs text-gray-400">Qty{line.unit ? ` (${line.unit}s)` : ''}</label>
                            <input type="number" value={line.qty} min={line.isCustom ? 1 : line.moq}
                              onChange={e => updateLineItemQty(line.lineId, parseInt(e.target.value) || 1)}
                              className={`w-full border rounded-lg px-2 py-1 text-sm mt-0.5 focus:outline-none focus:ring-2 focus:ring-green-500 ${isBelowMoq ? 'border-amber-400' : 'border-gray-200'}`}
                            />
                            {isBelowMoq && <p className="text-xs text-amber-600 mt-0.5">MOQ: {line.moq}</p>}
                          </div>
                          <div>
                            <label className="text-xs text-gray-400">Unit Price (USD)</label>
                            <div className="relative mt-0.5">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                              <input type="number" step="0.01" value={line.unitPriceUsd}
                                onChange={e => updateLineItemPrice(line.lineId, parseFloat(e.target.value) || 0)}
                                className={`w-full border rounded-lg pl-6 pr-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${isBelowFloor ? 'border-red-400 bg-white' : 'border-gray-200'}`}
                              />
                            </div>
                            {floor !== null && !line.isCustom && (
                              <p className={`text-xs mt-0.5 ${isBelowFloor ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
                                {isBelowFloor ? `Below floor (${floor.toFixed(2)})` : `Floor: ${floor.toFixed(2)}`}
                              </p>
                            )}
                            {line.isCustom && (
                              <p className="text-xs mt-0.5 text-purple-600">No floor (custom)</p>
                            )}
                          </div>
                          <div>
                            <label className="text-xs text-gray-400">Line Total</label>
                            <p className="mt-1 text-sm font-semibold text-gray-800">${lineTotal.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}</p>
                            <p className="text-xs text-gray-400">≈ ₱{Math.round(lineTotal * PHP_TO_USD).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-2 flex gap-3">
                  <button onClick={addLineItem}
                    className="text-sm text-green-700 font-medium hover:text-green-900 flex items-center gap-1">
                    <span className="text-lg leading-none">+</span> Add line item
                  </button>
                  <button onClick={addCustomLineItem}
                    className="text-sm text-purple-700 font-medium hover:text-purple-900 flex items-center gap-1">
                    <span className="text-lg leading-none">+</span> Add custom order
                  </button>
                </div>
              </div>

              {/* Totals */}
              {quoteLineItems.length > 0 && (() => {
                const subtotalUsd = quoteLineItems.reduce((s, l) => s + l.qty * l.unitPriceUsd, 0)
                const vatUsd = (isInvoice && invoiceVatEnabled) ? subtotalUsd * 0.12 : 0
                const totalUsd = subtotalUsd + vatUsd
                const totalPhp = Math.round(totalUsd * PHP_TO_USD)
                return (
                  <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 space-y-1">
                    {isInvoice && invoiceVatEnabled && (
                      <>
                        <div className="flex justify-between text-xs text-green-700">
                          <span>Subtotal (net)</span>
                          <span>${subtotalUsd.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                        </div>
                        <div className="flex justify-between text-xs text-green-700">
                          <span>VAT (12%)</span>
                          <span>${vatUsd.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs text-green-700 font-medium">{isInvoice ? 'Amount Due (USD)' : 'Total (USD)'}</p>
                        <p className="text-xl font-bold text-green-800">${totalUsd.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-green-700 font-medium">{isInvoice ? 'Amount Due (PHP equiv.)' : 'Total (PHP equiv.)'}</p>
                        <p className="text-lg font-bold text-green-800">₱{totalPhp.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Notes */}
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1.5">
                  {isInvoice ? 'Invoice' : 'Proforma'} Notes <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <textarea value={quoteNotes} onChange={e => setQuoteNotes(e.target.value)}
                  rows={2} placeholder="Delivery timeline, special terms, project scope..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
              </div>

              <div className={`rounded-xl px-4 py-3 text-xs ${isInvoice ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>
                {isInvoice
                  ? <>Submitting will generate an <strong>INVOICE</strong> PDF with invoice number <strong>INV-xxxx</strong>, email it to the customer from the assigned rep&apos;s account, and set the lead to <strong>Proposal Sent</strong>.</>
                  : <>Submitting will generate a <strong>PROFORMA INVOICE</strong> PDF with number <strong>PI-xxxx</strong>, email it to the customer from the assigned rep&apos;s account, and set the lead to <strong>Proposal Sent</strong>.</>
                }
              </div>
            </div>

            <div className="px-6 pb-6 pt-3 border-t border-gray-100 flex gap-3 shrink-0">
              <button onClick={() => { setQuoteModal(null); setQuoteLineItems([]); setQuoteNotes('') }}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={submitQuote}
                disabled={quoteLineItems.length === 0 || quoteSubmitting ||
                  quoteLineItems.some(l => { if (l.isCustom) return false; const f = floorPriceUsd(l.exFactoryPhp); return f !== null && l.unitPriceUsd < f; }) ||
                  quoteLineItems.some(l => !l.isCustom && l.qty < l.moq) ||
                  (isInvoice && !invoiceDueDate)}
                className={`flex-1 py-2.5 text-white rounded-xl text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${isInvoice ? 'bg-blue-700 hover:bg-blue-800' : 'bg-green-700 hover:bg-green-800'}`}>
                {quoteSubmitting ? 'Generating PDF...' : isInvoice ? 'Issue Invoice' : 'Issue Proforma'}
              </button>
            </div>
          </div>
        </div>
        )
      })()}

      {addLeadOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
            <div className="px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
              <h2 className="text-lg font-semibold text-gray-800">Add New Lead</h2>
              <p className="text-sm text-gray-500 mt-0.5">Manually add a lead to the CRM</p>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">First Name</label>
                  <input type="text" value={newLead.first_name}
                    onChange={e => setNewLead({ ...newLead, first_name: e.target.value })}
                    placeholder="Juan"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Last Name</label>
                  <input type="text" value={newLead.last_name}
                    onChange={e => setNewLead({ ...newLead, last_name: e.target.value })}
                    placeholder="Dela Cruz"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-500 block mb-1">Email <span className="text-red-500">*</span></label>
                  <input type="email" value={newLead.email}
                    onChange={e => setNewLead({ ...newLead, email: e.target.value })}
                    placeholder="name@company.com"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-500 block mb-1">Company</label>
                  <input type="text" value={newLead.company}
                    onChange={e => setNewLead({ ...newLead, company: e.target.value })}
                    placeholder="Company name"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Job Title</label>
                  <input type="text" value={newLead.title}
                    onChange={e => setNewLead({ ...newLead, title: e.target.value })}
                    placeholder="Project Manager"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Phone</label>
                  <input type="text" value={newLead.phone}
                    onChange={e => setNewLead({ ...newLead, phone: e.target.value })}
                    placeholder="+63..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Country</label>
                  <input type="text" value={newLead.country}
                    onChange={e => setNewLead({ ...newLead, country: e.target.value })}
                    placeholder="Philippines"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">City</label>
                  <input type="text" value={newLead.city}
                    onChange={e => setNewLead({ ...newLead, city: e.target.value })}
                    placeholder="Manila"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Segment</label>
                  <select value={newLead.segment}
                    onChange={e => setNewLead({ ...newLead, segment: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="">— Select —</option>
                    <option value="Architect">Architect</option>
                    <option value="Contractor">Contractor</option>
                    <option value="Developer">Developer</option>
                    <option value="Interior Designer">Interior Designer</option>
                    <option value="Hotel">Hotel</option>
                    <option value="Manufacturer">Manufacturer</option>
                    <option value="Distributor">Distributor</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Priority</label>
                  <select value={newLead.priority_tier}
                    onChange={e => setNewLead({ ...newLead, priority_tier: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="">— None —</option>
                    <option value="hot">Hot</option>
                    <option value="warm">Warm</option>
                    <option value="cold">Cold</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Deal Value (PHP)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₱</span>
                    <input type="number" value={newLead.deal_value_php}
                      onChange={e => setNewLead({ ...newLead, deal_value_php: e.target.value })}
                      placeholder="0"
                      className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                </div>
                {user?.role === 'admin' && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">Assign To</label>
                    <select value={newLead.rep_email}
                      onChange={e => setNewLead({ ...newLead, rep_email: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500">
                      <option value="">— Unassigned —</option>
                      <option value="bryan@numat.ph">Bryan (Philippines)</option>
                      <option value="mohan@numat.ph">Mohan (International)</option>
                      <option value="nick@numat.ph">Nick</option>
                    </select>
                  </div>
                )}
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-500 block mb-1">Notes</label>
                  <textarea value={newLead.notes} rows={2}
                    onChange={e => setNewLead({ ...newLead, notes: e.target.value })}
                    placeholder="Source, context, any other details..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
                </div>
              </div>

              <div className="bg-green-50 rounded-xl px-4 py-3 text-xs text-green-700">
                This lead will be saved with <strong>source: manual</strong>. {user?.role !== 'admin' && <>It will be auto-assigned to <strong>{user?.email}</strong>.</>}
              </div>
            </div>

            <div className="px-6 pb-6 pt-3 border-t border-gray-100 flex gap-3 shrink-0">
              <button onClick={() => setAddLeadOpen(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={submitNewLead} disabled={addLeadSubmitting || !newLead.email}
                className="flex-1 py-2.5 bg-green-700 text-white rounded-xl text-sm font-semibold hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {addLeadSubmitting ? 'Adding...' : 'Add Lead'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

