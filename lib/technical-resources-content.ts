export type TechnicalResourceItem = {
  slug: string
  title: string
  cardDescription: string
  intro: string
  sections: Array<{
    title: string
    body: string[]
  }>
  ctas: Array<{
    label: string
    href: string
  }>
}

export const technicalResourceDetails: TechnicalResourceItem[] = [
  {
    slug: 'technical-data-sheets',
    title: 'Technical Data Sheets',
    cardDescription:
      'Product specifications, board properties, and technical reference information for buyer evaluation.',
    intro:
      'Access the core technical information buyers, specifiers, and manufacturers need when evaluating NUMAT engineered bamboo boards.',
    sections: [
      {
        title: 'Product Overview',
        body: [
          'NUMAT boards are engineered bamboo plyboards made using laminated slat construction.',
          'Suitable for interior panels, furniture cores, non-structural substrates, shopfitting, door cores, and similar applications.',
        ],
      },
      {
        title: 'Material and Processing',
        body: [
          'Giant Asper bamboo',
          'Borax–boric acid treatment and kiln drying',
          'Hydraulic hot-press manufacturing',
          'Sanded surface ready for finishing',
        ],
      },
      {
        title: 'Physical Reference Properties',
        body: [
          'Base density target: 650–750 kg/m3',
          'Moisture target at shipment: 8–12%',
          'Optional edge sealing depending on project requirements',
        ],
      },
      {
        title: 'Available on Request',
        body: [
          'Treatment records',
          'MSDS for adhesives and finishing chemicals',
          'QA / QC reference documents',
        ],
      },
    ],
    ctas: [
      { label: 'Contact Sales for Full Data Sheets', href: '/contact' },
      { label: 'Request Quote', href: '/request-quote' },
    ],
  },
  {
    slug: 'dimensions-and-thicknesses',
    title: 'Dimensions and Thicknesses',
    cardDescription:
      'Standard sizing information, thickness options, and ordering formats for current board configurations.',
    intro:
      'Review the standard board formats currently prepared for quotation and buyer evaluation.',
    sections: [
     {
        title: 'Standard Board Sizes',
        body: [
          '2440 × 1220 mm (8 × 4 ft)',
          '3050 × 1220 mm (10 × 4 ft)',
          'Custom lengths may be available on request',
        ],
      },
      {
        title: 'Standard Thickness and Ply Combinations',
        body: [
          '**Horizontal Core**',
          '7 mm 2 PLY',
          '7 mm 3 PLY',
          '12 mm 2 PLY',
          '12 mm 3 PLY',
          '20 mm 3 PLY',
          '25 mm 5 PLY',
          '**Vertical Core**',
          '30 mm 3 PLY',
          '40 mm 5 PLY',
          '45 mm 5 PLY',
          '50 mm 5 PLY',
              ],
      },
      {
        title: 'Target Tolerances',
        body: [
          'Thickness tolerance: ±0.5 mm target',
          'Width and length tolerance: ±2.0 mm target',
        ],
      },
      {
        title: 'Target Tolerances',
        body: [
          'Thickness tolerance: ±0.5 mm target',
          'Width and length tolerance: ±2.0 mm target',
        ],
      },
      
    ],
    ctas: [
      { label: 'Request Full Size and Thickness Sheet', href: '/contact' },
      { label: 'Request Samples', href: '/request-samples' },
    ],
  },
  {
    slug: 'certifications',
    title: 'Certifications',
    cardDescription:
      'Current documentation and certification pathway information for commercial and export review.',
    intro:
      'Review the documentation currently available and the compliance areas buyers typically ask about.',
    sections: [
      {
        title: 'Available Documentation',
        body: [
          'DOST / ASTM D1037 testing references',
          'Export-supporting documentation where applicable',
          'Technical support documents for buyer review',
        ],
      },
      {
        title: 'Buyer Review Support',
        body: [
          'Supplier credibility and technical seriousness',
          'Commercial evaluation support',
          'Certification pathway clarity for project discussions',
        ],
      },
      {
        title: 'Commercial Relevance',
        body: [
          'Supports export conversations',
          'Improves compliance clarity',
          'Helps buyers assess readiness for target markets',
        ],
      },
      {
        title: 'Need Full Results?',
        body: [
          'Full reports and supporting documents are available through sales support upon request.',
        ],
      },
    ],
    ctas: [
      { label: 'View Testing Page', href: '/testing' },
      { label: 'Contact Sales for Full Documentation', href: '/contact' },
    ],
  },
  {
    slug: 'installation-and-care-guidance',
    title: 'Installation and Care Guidance',
    cardDescription:
      'Practical guidance for machining, finishing, storage, and application handling.',
    intro:
      'Useful handling and finishing guidance for buyers, fabricators, and project teams working with engineered bamboo boards.',
    sections: [
      {
        title: 'Machining Guidance',
        body: [
          'Carbide tooling is recommended',
          'Pre-drilling is recommended for screws near edges',
        ],
      },
      {
        title: 'Finishing Guidance',
        body: [
          'Compatible with water-borne PU, UV, or oil-wax systems',
          'Surface is prepared for finishing depending on end use',
        ],
      },
      {
        title: 'Storage Guidance',
        body: [
          'Keep boards flat and properly stickered',
          'Acclimatize before installation where appropriate',
        ],
      },
      {
        title: 'Application Notes',
        body: [
          'Best suited for interior panels, furniture, shopfitting, cabinetry, door-related applications, and similar uses unless otherwise reviewed for a specific project.',
        ],
      },
    ],
    ctas: [
      { label: 'Request Handling Guide', href: '/contact' },
      { label: 'Request Samples', href: '/request-samples' },
    ],
  },
]