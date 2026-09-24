export type ApplicationItem = {
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

export const applicationDetails: ApplicationItem[] = [
  {
    slug: 'furniture-manufacturing',
    title: 'Furniture Manufacturing',
    cardDescription:
      'NuBrid boards for tables, cabinetry and custom furniture, a smooth bamboo substitute for MDF.',
    intro:
      'NuBrid is our furniture board, from cabinet bodies and panels to tables and worktops. Its laminated bamboo face on a woven bamboo back gives a smooth, machinable surface in place of MDF.',
    sections: [
      {
        title: 'Best Fit',
        body: [
          'Tables and worktops',
          'Cabinet bodies and fronts',
          'Shelving',
          'Furniture panels and backing',
          'Built in furniture and custom joinery',
        ],
      },
      {
        title: 'Recommended Products',
        body: [
          'NuBrid for cabinetry, furniture bodies and panels that need a smooth, machinable surface in place of MDF',
          'NuBrid for tables, worktops and furniture elements',
          'The NuBrid Furniture and Cabinetry solution for finished pieces',
        ],
      },
      {
        title: 'Why It Works',
        body: [
          'A stable engineered panel format',
          'A premium, natural bamboo appearance',
          'Suitable for both visible and structural furniture use',
          'A stronger sustainability story with commercially practical positioning',
        ],
      },
      {
        title: 'Buyer Considerations',
        body: [
          'Confirm the product and thickness at quote stage',
          'Review the finishing system for the final furniture use',
          'Request samples for color, grain and fabrication evaluation',
        ],
      },
    ],
    ctas: [
      { label: 'View NuBrid', href: '/products/nuhybrid' },
      { label: 'View the furniture solution', href: '/solutions/furniture' },
      { label: 'Request Quote', href: '/request-quote' },
    ],
  },
  {
    slug: 'interior-fit-outs',
    title: 'Interior Fit Outs',
    cardDescription:
      'For wall panels, partitions, feature panels and premium interior surfacing.',
    intro:
      'Interior fit outs are one of the clearest use cases for NUMAT, from office interiors and wall paneling to partitions and premium surfacing. NuWev brings a woven bamboo feature to walls and ceilings, and NuBrid covers the joinery.',
    sections: [
      {
        title: 'Best Fit',
        body: [
          'Wall paneling and cladding',
          'Feature walls',
          'Partition systems',
          'Ceilings and joinery',
          'Premium interior surfacing',
        ],
      },
      {
        title: 'Recommended Products',
        body: [
          'NuWev for decorative indoor wall cladding, feature walls and ceilings',
          'NuWev as a substrate when a laminate or veneer finish is needed',
          'NuBrid for wall panels, ceilings and premium joinery',
          'NuBrid for interior cabinetry and panel work',
        ],
      },
      {
        title: 'Why It Works',
        body: [
          'A natural material finish suited to premium interiors',
          'A woven bamboo pattern that turns a plain wall into a feature',
          'Supports projects balancing performance and lower impact sourcing',
        ],
      },
      {
        title: 'Buyer Considerations',
        body: [
          'Match the product to decorative, joinery or partition needs',
          'Confirm finishing and edge treatment before quotation',
          'Contact sales for technical and project document support',
        ],
      },
    ],
    ctas: [
      { label: 'View NuWev', href: '/products/nuweave' },
      { label: 'View the wall cladding solution', href: '/solutions/wall-panels' },
      { label: 'Request Quote', href: '/request-quote' },
    ],
  },
  {
    slug: 'hospitality-and-commercial-spaces',
    title: 'Hospitality and Commercial Spaces',
    cardDescription:
      'A strong fit for hotels, retail, offices and branded interiors.',
    intro:
      'NUMAT is suited to hospitality and commercial interiors where buyers need panels that carry design value, practical fabrication and a stronger sustainability story, from feature walls and ceilings to cabinetry and joinery.',
    sections: [
      {
        title: 'Best Fit',
        body: [
          'Hotel and resort interiors',
          'Retail and branded environments',
          'Office interiors',
          'Feature walls and paneling',
          'Reception and back of house joinery',
        ],
      },
      {
        title: 'Recommended Products',
        body: [
          'NuWev for feature walls, paneling and ceilings',
          'NuBrid for cabinetry, shelving, furniture and joinery',
        ],
      },
      {
        title: 'Why It Works',
        body: [
          'Suited to high visibility interior applications',
          'Strong enough for practical joinery and panel work',
          'A premium, sustainable material story without sounding purely eco first',
        ],
      },
      {
        title: 'Buyer Considerations',
        body: [
          'Hospitality and retail buyers usually need visual consistency and durability',
          'Samples matter for finish approval',
          'Sales can handle commercial documentation and performance questions',
        ],
      },
    ],
    ctas: [
      { label: 'View Solutions', href: '/solutions' },
      { label: 'Request Quote', href: '/request-quote' },
    ],
  },
  {
    slug: 'concrete-formwork',
    title: 'Concrete Formwork',
    cardDescription:
      'NuForm and NuForm Lite bamboo formwork boards with a phenolic film on both faces.',
    intro:
      'NuForm is an engineered bamboo formwork board with a phenolic film on both faces, built to replace imported phenolic plywood on site. Choose NuForm for the most reuse on demanding pours, or NuForm Lite for a lighter, lower cost board on standard work.',
    sections: [
      {
        title: 'Best Fit',
        body: [
          'Wall and column forming',
          'Slab and beam soffit forming',
          'Repeated pour formwork on site',
          'Precast and cast in place concrete',
          'Industrial and infrastructure projects',
        ],
      },
      {
        title: 'Recommended Product',
        body: [
          'NuForm for the most reuse on demanding pours',
          'NuForm Lite for a lighter, lower cost board on standard work',
          'Standard 4 by 8 ft (1220 x 2440 mm) sheet, several thicknesses per grade',
        ],
      },
      {
        title: 'Why It Works',
        body: [
          'Phenolic film on both faces for a smooth concrete finish',
          'Proven on site to reach 8 to 10 pours, versus 4 to 5 for marine plywood',
          'DOST tested to ASTM D1037 for strength and stability',
          'Fits your existing formwork system',
          'Made from rapidly renewable Philippine bamboo',
        ],
      },
      {
        title: 'Buyer Considerations',
        body: [
          'Confirm the grade and thickness at quote stage',
          'Seal cut edges for the longest service life',
          'Keep the surface clean between pours',
        ],
      },
    ],
    ctas: [
      { label: 'View NuForm', href: '/products/nuform' },
      { label: 'Request Quote', href: '/request-quote' },
    ],
  },
  {
    slug: 'project-and-procurement-use',
    title: 'Project and Procurement Use',
    cardDescription:
      'Supported with quotations, sample coordination and commercial documentation.',
    intro:
      'This page is for buyers evaluating NUMAT for project use, pilot deployments or recurring procurement. It brings together the products, the solutions and the documentation a specifier or buyer needs.',
    sections: [
      {
        title: 'Best Fit',
        body: [
          'Pilot projects',
          'Specification review',
          'Commercial buyer evaluation',
          'Sample based qualification',
          'Procurement and sourcing discussions',
          'Distributor and trade conversations',
        ],
      },
      {
        title: 'What Buyers Can Request',
        body: [
          'Product quotations',
          'Sample coordination',
          'Technical data sheets',
          'Testing page review',
          'Commercial documentation',
        ],
      },
      {
        title: 'Commercial Positioning',
        body: [
          'NUMAT does not compete as a lowest price commodity material',
          'It positions as a credible engineered panel alternative to plywood',
          'Credibility and documentation are central to commercial adoption',
        ],
      },
      {
        title: 'Buyer Considerations',
        body: [
          'Best for buyers evaluating on application fit, not only price',
          'Best where performance, differentiation and sustainability all matter',
          'Best supported through sample review and direct commercial discussion',
        ],
      },
    ],
    ctas: [
      { label: 'Browse all products', href: '/products' },
      { label: 'Contact Sales', href: '/contact' },
    ],
  },
]