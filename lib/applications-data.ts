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
      'Boards for tables, cabinetry and custom furniture, from a smooth MDF substitute to premium cross laminated panels.',
    intro:
      'NUMAT engineered bamboo is well suited to furniture, from cabinet bodies and panels to premium tables and worktops. NuHybrid gives a smooth, machinable surface in place of MDF, while NuBam CLB brings the strength and finish for visible, higher load pieces.',
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
          'NuHybrid for cabinetry, furniture bodies and panels that need a smooth, machinable surface in place of MDF',
          'NuBam CLB for premium tables, worktops and structural furniture elements',
          'The CLB Furniture solution for round tables on a solid cross base',
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
      { label: 'View the CLB Furniture solution', href: '/solutions/furniture' },
      { label: 'Request Quote', href: '/request-quote' },
    ],
  },
  {
    slug: 'interior-fit-outs',
    title: 'Interior Fit Outs',
    cardDescription:
      'For wall panels, partitions, feature panels and premium interior surfacing.',
    intro:
      'Interior fit outs are one of the clearest use cases for NUMAT, from office interiors and wall paneling to partitions and premium surfacing. The CLB Wall Panels solution adds a tongue and groove system for a fast, seamless wall.',
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
          'The CLB Wall Panels solution, tongue and groove at 14 mm, for interior walls and feature walls',
          'NuBam CLB for architectural panels and premium joinery',
          'NuHybrid for interior cabinetry and panel work',
        ],
      },
      {
        title: 'Why It Works',
        body: [
          'A natural material finish suited to premium interiors',
          'A tongue and groove wall system that installs fast with minimal visible gaps',
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
      { label: 'View the CLB Wall Panels solution', href: '/solutions/wall-panels' },
      { label: 'Request Quote', href: '/request-quote' },
    ],
  },
  {
    slug: 'hospitality-and-commercial-spaces',
    title: 'Hospitality and Commercial Spaces',
    cardDescription:
      'A strong fit for hotels, retail, offices and branded interiors.',
    intro:
      'NUMAT is suited to hospitality and commercial interiors where buyers need panels that carry design value, practical fabrication and a stronger sustainability story, from feature walls to cabinetry and clad columns.',
    sections: [
      {
        title: 'Best Fit',
        body: [
          'Hotel and resort interiors',
          'Retail and branded environments',
          'Office interiors',
          'Feature walls and paneling',
          'Reception and back of house joinery',
          'Clad columns, beams and pavilions',
        ],
      },
      {
        title: 'Recommended Products',
        body: [
          'The CLB Wall Panels solution for feature walls and paneling',
          'The CLB Columns and Beams solution for clad structure and pavilions',
          'NuBam CLB and NuHybrid for cabinetry, shelving and joinery',
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
    slug: 'columns-beams-and-cladding',
    title: 'Columns, Beams and Cladding',
    cardDescription:
      'Cross laminated bamboo that wraps steel columns and beams for a warm architectural finish.',
    intro:
      'Engineered bamboo CLB panels wrap steel columns and beams to give a structure a warm, natural finish without carrying load. It is a fast, clean way to lift the look of pavilions, atriums and architectural features while protecting the steel underneath.',
    sections: [
      {
        title: 'Best Fit',
        body: [
          'Steel column and beam cladding',
          'Open air pavilions',
          'Interior architectural features',
          'Commercial lobbies and atriums',
          'Hospitality and resort structures',
          'Exposed frames and feature ceilings',
        ],
      },
      {
        title: 'Recommended Product',
        body: [
          'NuBam CLB at 16 mm for wrapping column and beam members',
          'Tongue and groove joints for a concealed, seamless surface',
          'Sized to wrap 8 by 8 inch members, columns up to 6 m and beams up to 3 m',
        ],
      },
      {
        title: 'Why It Works',
        body: [
          'Installs directly onto the steel member',
          'Lightweight yet strong and quick to fit on site',
          'UV and moisture resistant finish for covered exterior use',
          'Turns plain structure into a design feature',
        ],
      },
      {
        title: 'Buyer Considerations',
        body: [
          'Confirm member sizes and lengths at quote stage',
          'This is a non load bearing finish, not a structural replacement',
          'Request samples to approve the grain and finish',
        ],
      },
    ],
    ctas: [
      { label: 'View the CLB Columns and Beams solution', href: '/solutions/columns-and-beams' },
      { label: 'Request Quote', href: '/request-quote' },
    ],
  },
  {
    slug: 'concrete-formwork',
    title: 'Concrete Formwork',
    cardDescription:
      'NuWeave woven bamboo board built for concrete forming, with a phenolic surface and strong reuse.',
    intro:
      'NuWeave woven bamboo mat board is built for concrete formwork. The phenolic surface strips clean and stands up to repeated pours, giving a strong, moisture resistant panel that competes with film faced plywood on reuse and cost.',
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
          'NuWeave woven bamboo mat board with a phenolic film on both sides',
          'Available from 10 to 20 mm thick',
          'Standard sheet size 1220 by 2440 mm',
        ],
      },
      {
        title: 'Why It Works',
        body: [
          'Phenolic surface releases cleanly and resists moisture',
          'Designed for 30 or more reuses',
          'DOST tested to ASTM D1037 for strength and stability',
          'Made from rapidly renewable bamboo',
        ],
      },
      {
        title: 'Buyer Considerations',
        body: [
          'Seal cut edges for the longest service life',
          'Keep the surface clean between pours',
          'Request samples to evaluate the surface and release',
        ],
      },
    ],
    ctas: [
      { label: 'View NuWeave', href: '/products/nuweave' },
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