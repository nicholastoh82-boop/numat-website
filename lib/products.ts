import { Product } from './types'

// Product data - NuBam Boards product line
// MOQ: 10 boards, 15% discount for orders > 100 boards
export const products: Product[] = [
  // Engineered Bamboo Boards - differentiated by thickness
  {
    sku: 'NUB-6.35-1P',
    title: 'NuBam Engineered Bamboo Board - 6.35mm',
    size: '2440 x 1220 mm',
    thickness_mm: 6.35,
    ply: '1-Ply',
    price: 1850,
    moq: 10,
    lead_time_days: 10,
    category: 'Furniture',
    description: 'Premium engineered bamboo board perfect for furniture applications. Natural color with horizontal grain pattern.',
  },
  {
    sku: 'NUB-12.7-2P',
    title: 'NuBam Engineered Bamboo Board - 12.7mm',
    size: '2440 x 1220 mm',
    thickness_mm: 12.7,
    ply: '2-Ply',
    price: 2450,
    moq: 10,
    lead_time_days: 10,
    category: 'Furniture',
    description: 'Double-ply engineered bamboo board for enhanced durability. Ideal for tabletops and furniture panels.',
  },
  {
    sku: 'NUB-19-3P',
    title: 'NuBam Engineered Bamboo Board - 19mm',
    size: '2440 x 1220 mm',
    thickness_mm: 19,
    ply: '3-Ply',
    price: 3200,
    moq: 10,
    lead_time_days: 10,
    category: 'Furniture',
    description: 'Heavy-duty triple-ply engineered bamboo board for structural furniture and countertops.',
  },
  {
    sku: 'NUB-25-4P',
    title: 'NuBam Engineered Bamboo Board - 25mm',
    size: '2440 x 1220 mm',
    thickness_mm: 25,
    ply: '4-Ply',
    price: 3950,
    moq: 10,
    lead_time_days: 10,
    category: 'Structural',
    description: 'Extra thick engineered bamboo board for heavy-duty structural applications.',
  },
  // Door panels
  {
    sku: 'DOOR-19-3P',
    title: 'NuBam Door Panel - 19mm',
    size: '2100 x 900 mm',
    thickness_mm: 19,
    ply: '3-Ply',
    price: 2800,
    moq: 10,
    lead_time_days: 10,
    category: 'Door',
    description: 'Pre-sized engineered bamboo panel for door manufacturing. Premium finish for excellent aesthetics.',
  },
  {
    sku: 'DOOR-25-4P',
    title: 'NuBam Door Panel - 25mm',
    size: '2100 x 900 mm',
    thickness_mm: 25,
    ply: '4-Ply',
    price: 3400,
    moq: 10,
    lead_time_days: 10,
    category: 'Door',
    description: 'Premium thickness door panel with engineered construction for solid core doors.',
  },
  // Flooring
  {
    sku: 'FLR-14-CLICK',
    title: 'NuBam Click Flooring - 14mm',
    size: '1850 x 125 mm',
    thickness_mm: 14,
    ply: '3-Ply',
    price: 1450,
    moq: 10,
    lead_time_days: 10,
    category: 'Flooring',
    description: 'Easy-install click-lock engineered bamboo flooring. Natural finish with UV coating.',
  },
  {
    sku: 'FLR-14-CARB',
    title: 'NuBam Click Flooring - 14mm Amber',
    size: '1850 x 125 mm',
    thickness_mm: 14,
    ply: '3-Ply',
    price: 1550,
    moq: 10,
    lead_time_days: 10,
    category: 'Flooring',
    description: 'Engineered bamboo flooring with rich amber tones. Click-lock installation.',
  },
  {
    sku: 'FLR-20-STRAND',
    title: 'NuBam Premium Flooring - 20mm',
    size: '1850 x 125 mm',
    thickness_mm: 20,
    ply: 'Strand',
    price: 2100,
    moq: 10,
    lead_time_days: 10,
    category: 'Flooring',
    description: 'Ultra-durable engineered bamboo flooring with distinctive tiger stripe pattern.',
  },
  // Wall Panelling
  {
    sku: 'WALL-6-1P',
    title: 'NuBam Wall Panel - 6mm',
    size: '2440 x 600 mm',
    thickness_mm: 6,
    ply: '1-Ply',
    price: 950,
    moq: 10,
    lead_time_days: 10,
    category: 'Wall Panelling',
    description: 'Lightweight engineered bamboo panels for interior wall cladding and feature walls.',
  },
  {
    sku: 'WALL-9-2P',
    title: 'NuBam Wall Panel - 9mm',
    size: '2440 x 600 mm',
    thickness_mm: 9,
    ply: '2-Ply',
    price: 1250,
    moq: 10,
    lead_time_days: 10,
    category: 'Wall Panelling',
    description: 'Engineered wall panels with enhanced durability for commercial interiors.',
  },
  // Veneer
  {
    sku: 'VNR-0.6-NAT',
    title: 'NuBam Veneer Sheet - 0.6mm',
    size: '2500 x 640 mm',
    thickness_mm: 0.6,
    ply: 'Veneer',
    price: 380,
    moq: 10,
    lead_time_days: 10,
    category: 'Veneer',
    description: 'Flexible engineered bamboo veneer for furniture overlay and decorative applications.',
  },
  {
    sku: 'VNR-0.6-CARB',
    title: 'NuBam Veneer Sheet - 0.6mm Amber',
    size: '2500 x 640 mm',
    thickness_mm: 0.6,
    ply: 'Veneer',
    price: 420,
    moq: 10,
    lead_time_days: 10,
    category: 'Veneer',
    description: 'Engineered bamboo veneer with warm amber coloring.',
  },
  // Cladding
  {
    sku: 'CLAD-12-EXT',
    title: 'NuBam Exterior Cladding - 12mm',
    size: '2440 x 150 mm',
    thickness_mm: 12,
    ply: '2-Ply',
    price: 1650,
    moq: 10,
    lead_time_days: 10,
    category: 'Cladding',
    description: 'Weather-resistant engineered bamboo cladding for exterior facades. UV and moisture treated.',
  },
  {
    sku: 'CLAD-18-EXT',
    title: 'NuBam Exterior Cladding - 18mm',
    size: '2440 x 150 mm',
    thickness_mm: 18,
    ply: '3-Ply',
    price: 2200,
    moq: 10,
    lead_time_days: 10,
    category: 'Cladding',
    description: 'Premium exterior cladding for commercial buildings. Enhanced weather resistance.',
  },
  // Structural
  {
    sku: 'STR-30-BEAM',
    title: 'NuBam Structural Beam - 30mm',
    size: '3000 x 150 x 150 mm',
    thickness_mm: 30,
    ply: '5-Ply',
    price: 4500,
    moq: 10,
    lead_time_days: 10,
    category: 'Structural',
    description: 'Load-bearing engineered bamboo beam for structural applications. Engineered for strength.',
  },
  {
    sku: 'STR-40-POST',
    title: 'NuBam Structural Post - 40mm',
    size: '3000 x 200 x 200 mm',
    thickness_mm: 40,
    ply: '6-Ply',
    price: 5800,
    moq: 10,
    lead_time_days: 10,
    category: 'Structural',
    description: 'Heavy-duty engineered structural post for columns and vertical supports.',
  },
  // DIY Project
  {
    sku: 'DIY-6-CRAFT',
    title: 'NuBam Craft Board - 6mm',
    size: '600 x 400 mm',
    thickness_mm: 6,
    ply: '1-Ply',
    price: 280,
    moq: 10,
    lead_time_days: 10,
    category: 'DIY Project',
    description: 'Small format engineered bamboo board for DIY projects and crafts.',
  },
  {
    sku: 'DIY-12-SHELF',
    title: 'NuBam Shelf Board - 12mm',
    size: '900 x 250 mm',
    thickness_mm: 12,
    ply: '2-Ply',
    price: 450,
    moq: 10,
    lead_time_days: 10,
    category: 'DIY Project',
    description: 'Pre-cut engineered shelf board for home organization projects.',
  },
  {
    sku: 'DIY-19-DESK',
    title: 'NuBam Desktop Panel - 19mm',
    size: '1200 x 600 mm',
    thickness_mm: 19,
    ply: '3-Ply',
    price: 1200,
    moq: 10,
    lead_time_days: 10,
    category: 'DIY Project',
    description: 'Desktop panel for DIY desk builds and workstations.',
  },
]

export const categories = [
  'Furniture',
  'Door',
  'Flooring',
  'Structural',
  'Wall Panelling',
  'Veneer',
  'Cladding',
  'DIY Project'
] as const

export type Category = typeof categories[number]

// Pricing constants
export const DISCOUNT_THRESHOLD = 100 // boards
export const DISCOUNT_PERCENT = 15
export const DEFAULT_MOQ = 10
export const DEFAULT_LEAD_TIME = 10
export const QUOTE_VALIDITY_DAYS = 14
export const VAT_RATE = 0.12 // 12% VAT in Philippines

export function calculateDiscount(totalBoards: number): number {
  return totalBoards > DISCOUNT_THRESHOLD ? DISCOUNT_PERCENT : 0
}

export function getProductsByCategory(category: string): Product[] {
  return products.filter(p => p.category === category)
}

export function getProductBySku(sku: string): Product | undefined {
  return products.find(p => p.sku === sku)
}
