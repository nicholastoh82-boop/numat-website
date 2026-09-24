/**
 * Curated gallery images and sales copy for each customer facing product,
 * keyed by URL slug. Source: NUMAT Master Sales Kit and the NUMAT Canva board.
 *
 * Rules that apply to everything in this file (see CLAUDE.md):
 * - No prices. Prices only ever come from Supabase product_variants.
 * - No certification, fire, acoustic, LEED or ASTM rating claims, even where
 *   the sales kit prints one. The existing DOST test results and the existing
 *   8 to 10 pour reuse figure may be reused as published on the site.
 * - No hyphens or dashes in any string a visitor can read.
 * - Only NuForm, NuForm Lite, NuWev and NuBrid.
 */

export type GalleryImage = {
  src: string
  alt: string
  /** Rendered edge to edge (photo) or contained on the warm studio background (product render). */
  fit?: 'cover' | 'contain'
}

export type SpecRow = { label: string; value: string }

export type ProductMarketing = {
  slug: string
  displayName: string
  tagline: string
  pitch: string
  badge?: string
  /** A sister product sold from the same page, e.g. NuForm Lite on the NuForm page. */
  alsoAvailable?: string
  highlights: string[]
  bestFor: string[]
  specs: SpecRow[]
  gallery: GalleryImage[]
}

const FORMWORK_PHOTOS: GalleryImage[] = [
  { src: '/nuweave/numat-engineered-bamboo-formwork-panels.jpg', alt: 'NuForm panels forming a concrete wall on site', fit: 'cover' },
  { src: '/nuweave/numat-bamboo-formwork-column-forming.jpg', alt: 'NuForm panels forming concrete columns', fit: 'cover' },
  { src: '/nuweave/numat-bamboo-formwork-slab-forming.jpg', alt: 'NuForm panels forming a concrete slab', fit: 'cover' },
  { src: '/nuweave/numat-bamboo-formwork-beam-forming.jpg', alt: 'NuForm panels forming a concrete beam', fit: 'cover' },
]

export const PRODUCT_MARKETING: Record<string, ProductMarketing> = {
  nuform: {
    slug: 'nuform',
    displayName: 'NuForm',
    tagline: 'Smarter concrete formwork, made from Philippine bamboo',
    pitch:
      'NuForm is an engineered bamboo formwork board with a phenolic film on both faces. It is built to replace imported phenolic plywood on site, giving you a smooth concrete finish, pour after pour, at a lower cost per pour.',
    badge: 'Best seller',
    alsoAvailable: 'Also available as NuForm Lite',
    highlights: [
      'Phenolic film on both faces for a smooth concrete finish',
      'Proven on site to reach 8 to 10 pours, versus 4 to 5 for marine plywood',
      'Independently tested by DOST for strength and stability',
      'Water resistant exterior grade PF resin bond',
      'Standard 4 by 8 ft sheet, fits your existing formwork system',
      'Minimum order of just 10 boards',
    ],
    bestFor: ['Slabs', 'Beams', 'Walls', 'Columns', 'Staircases'],
    specs: [
      { label: 'Panel size', value: '2440 x 1220 mm (4 x 8 ft)' },
      { label: 'Surface', value: 'Phenolic film, both faces' },
      { label: 'Bonding', value: 'Exterior grade phenol formaldehyde (PF) resin' },
      { label: 'Nominal density', value: '800 to 1,000 kg/m3' },
      { label: 'Moisture content', value: '6 to 10%' },
      { label: 'Minimum order', value: '10 boards' },
    ],
    gallery: [
      { src: '/products/nuform/nuform-board-stack.jpg', alt: 'Stack of NuForm phenolic faced bamboo formwork boards', fit: 'contain' },
      { src: '/products/nuform/nuform-panel-on-site.jpg', alt: 'NuForm board standing on a construction site', fit: 'cover' },
      { src: '/products/nuform/nuform-and-nuform-lite.jpg', alt: 'NuForm and NuForm Lite boards side by side', fit: 'contain' },
      { src: '/products/nuform/nuform-phenolic-face-closeup.jpg', alt: 'Close up of the NuForm phenolic film face', fit: 'cover' },
      ...FORMWORK_PHOTOS,
    ],
  },
  nuweave: {
    slug: 'nuweave',
    displayName: 'NuWev',
    tagline: 'Woven bamboo that turns a wall into a feature',
    pitch:
      'NuWev is a woven bamboo board for decorative indoor wall cladding, or as a stable substrate for lamination. Every sheet shows the hand woven bamboo pattern, pressed with bamboo sawdust and phenolic resin for a dense, durable board.',
    highlights: [
      'Natural hand woven bamboo pattern on every sheet',
      'Decorative indoor wall cladding and feature walls',
      'Stable substrate for laminates and veneers',
      'Standard 4 by 8 ft sheet',
      'Minimum order of just 10 boards',
    ],
    bestFor: ['Feature walls', 'Ceilings', 'Hospitality interiors', 'Retail fit outs', 'Lamination substrate'],
    specs: [
      { label: 'Panel size', value: '2440 x 1220 mm (4 x 8 ft)' },
      { label: 'Construction', value: 'Woven bamboo mats, bamboo sawdust, phenolic resin' },
      { label: 'Nominal density', value: '750 to 850 kg/m3' },
      { label: 'Minimum order', value: '10 boards' },
    ],
    gallery: [
      { src: '/products/nuweave/nuwev-woven-face.jpg', alt: 'NuWev woven bamboo board', fit: 'contain' },
      { src: '/products/nuweave/nuwev-woven-texture-closeup.jpg', alt: 'Close up of the NuWev woven bamboo pattern', fit: 'cover' },
      { src: '/products/nuweave/nuwev-board-render.jpg', alt: 'NuWev woven bamboo board, full sheet', fit: 'contain' },
      { src: '/nuweave/numat-nuweave-woven-bamboo-board.jpg', alt: 'NuWev woven bamboo board', fit: 'cover' },
      { src: '/nuweave/numat-bamboo-delivery-alina-resort-woven.jpg', alt: 'NuWev boards delivered to Alina Resort', fit: 'cover' },
    ],
  },
  nuhybrid: {
    slug: 'nuhybrid',
    displayName: 'NuBrid',
    tagline: 'The bamboo panel that replaces MDF',
    pitch:
      'NuBrid pairs a refined laminated bamboo face with a woven bamboo back in one engineered panel. Use it wherever you would use MDF: cabinetry, furniture, wall panels and ceilings, with a clean natural finish and added strength.',
    highlights: [
      'A natural bamboo alternative to MDF',
      'Refined laminated face, woven bamboo back',
      'Cuts, routes and drills like the boards you already use',
      'Thicknesses from 8 to 22 mm',
      'Minimum order of just 10 boards',
    ],
    bestFor: ['Cabinetry', 'Furniture', 'Wall panels', 'Ceilings', 'Joinery'],
    specs: [
      { label: 'Panel size', value: '2440 x 1220 mm (4 x 8 ft)' },
      { label: 'Panel build', value: '2 to 5 ply, depending on thickness' },
      { label: 'Surface', value: 'Smooth laminated bamboo face, machinable' },
      { label: 'Bonding', value: 'Phenolic (PF) resin' },
      { label: 'Nominal density', value: '800 to 1,000 kg/m3' },
      { label: 'Moisture content', value: '6 to 10%' },
      { label: 'Minimum order', value: '10 boards' },
    ],
    gallery: [
      { src: '/products/nubrid/nubrid-two-faces.jpg', alt: 'NuBrid panel showing the laminated face and the woven back', fit: 'contain' },
      { src: '/products/nubrid/nubrid-laminated-texture-closeup.jpg', alt: 'Close up of the NuBrid laminated bamboo face', fit: 'cover' },
      { src: '/products/nubrid/nubrid-laminated-face.jpg', alt: 'NuBrid laminated bamboo panel', fit: 'contain' },
    ],
  },
}

/** Customer facing order of the range. Anything else active in Supabase is not shown. */
export const PRODUCT_ORDER = ['nuform', 'nuweave', 'nuhybrid'] as const

export function getMarketing(slug: string | null | undefined): ProductMarketing | null {
  return slug ? PRODUCT_MARKETING[slug] ?? null : null
}

/**
 * NuForm and NuForm Lite, sold from one page (stored as the grade column on
 * product_variants: 'Standard' and 'Lite'). The only published reuse figure is
 * the existing site figure for NuForm: 8 to 10 pours.
 */
export const NUFORM_GRADES = [
  {
    grade: 'Standard',
    name: 'NuForm',
    promise: 'Built for more pours',
    bestFor: 'Slabs, beams, walls, columns and high demand projects',
    advantage: 'Maximum reuse and the lowest cost per pour',
    strength: 'High bending strength',
    image: '/products/nuform/nuform-board-stack.jpg',
  },
  {
    grade: 'Lite',
    name: 'NuForm Lite',
    promise: 'Lighter. Practical. Affordable.',
    bestFor: 'Walls, columns, small beams, light slabs and standard projects',
    advantage: 'Lighter weight with excellent value',
    strength: 'Moderate to high bending strength',
    image: '/products/nuform/nuform-and-nuform-lite.jpg',
  },
] as const

/** Pull a readable thickness out of a size label such as "2440 mm x 1220 mm x 2 to 4 mm". */
export function thicknessLabel(sizeLabel: string | null | undefined, thicknessMm: number | null | undefined) {
  const last = sizeLabel?.split(/\s+x\s+/i).pop()?.trim()
  if (last && /mm$/i.test(last)) return last
  return typeof thicknessMm === 'number' ? `${thicknessMm} mm` : ''
}
