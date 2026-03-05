// Product types
export interface Product {
  sku: string
  title: string
  size: string
  thickness_mm: number
  ply: string
  price: number
  moq: number
  lead_time_days: number
  category: string
  description?: string
  image?: string
}

// Contact types
export interface Contact {
  name: string
  phone: string
  channel: 'whatsapp' | 'viber'
  email?: string
  company?: string
  buyerType?: 'Retailer' | 'Distributor' | 'Contractor' | 'Homeowner'
  application: Application
  consent: boolean
}

// Application types
export type Application = 
  | 'Furniture'
  | 'Door'
  | 'Flooring'
  | 'Structural'
  | 'Wall Panelling'
  | 'Veneer'
  | 'Cladding'
  | 'DIY Project'

// Cart item
export interface CartItem {
  sku: string
  title: string
  qty: number
  unit_price: number
  line_subtotal: number
  size: string
  thickness_mm: number
  ply: string
}

// Quote types
export interface Quote {
  id: string
  contact: Contact
  items: CartItem[]
  subtotal: number
  discount: number
  total: number
  currency: string
  status: QuoteStatus
  pdf_url?: string
  created_at: string
}

export type QuoteStatus = 
  | 'created'
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'accepted'
  | 'cancelled'

// API Response types
export interface QuoteResponse {
  ok: boolean
  quoteId?: string
  pdfUrl?: string
  message?: string
  error?: string
}

// Admin types
export interface DiscountRule {
  id: string
  minBoards: number
  discountPercent: number
  active: boolean
}

// Country codes for phone input
export interface CountryCode {
  code: string
  name: string
  dial: string
  flag: string
}

export const COUNTRY_CODES: CountryCode[] = [
  { code: 'PH', name: 'Philippines', dial: '+63', flag: '🇵🇭' },
  { code: 'US', name: 'United States', dial: '+1', flag: '🇺🇸' },
  { code: 'SG', name: 'Singapore', dial: '+65', flag: '🇸🇬' },
  { code: 'MY', name: 'Malaysia', dial: '+60', flag: '🇲🇾' },
  { code: 'ID', name: 'Indonesia', dial: '+62', flag: '🇮🇩' },
  { code: 'TH', name: 'Thailand', dial: '+66', flag: '🇹🇭' },
  { code: 'VN', name: 'Vietnam', dial: '+84', flag: '🇻🇳' },
  { code: 'JP', name: 'Japan', dial: '+81', flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea', dial: '+82', flag: '🇰🇷' },
  { code: 'CN', name: 'China', dial: '+86', flag: '🇨🇳' },
  { code: 'AU', name: 'Australia', dial: '+61', flag: '🇦🇺' },
  { code: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧' },
  { code: 'DE', name: 'Germany', dial: '+49', flag: '🇩🇪' },
  { code: 'FR', name: 'France', dial: '+33', flag: '🇫🇷' },
  { code: 'AE', name: 'UAE', dial: '+971', flag: '🇦🇪' },
]

export const APPLICATIONS: Application[] = [
  'Furniture',
  'Door',
  'Flooring',
  'Structural',
  'Wall Panelling',
  'Veneer',
  'Cladding',
  'DIY Project'
]

export const BUYER_TYPES = [
  'Retailer',
  'Distributor',
  'Contractor',
  'Homeowner'
] as const
