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
      'Boards suited for tables, shelving, cabinetry, and custom furniture production.',
    intro:
      'NUMAT engineered bamboo boards are well suited for furniture manufacturing where buyers need a stable, premium-looking panel for visible and semi-visible joinery applications.',
    sections: [
      {
        title: 'Best Fit',
        body: [
          'Tables and desktops',
          'Shelving',
          'Cabinet bodies and fronts',
          'Furniture backing panels',
          'Built-in furniture and custom joinery',
        ],
      },
      {
        title: 'Recommended Board Logic',
        body: [
          '7mm boards for lightweight furniture backing and secondary panels',
          '12mm boards for cabinetry, shelving, and light furniture structures',
          '18–20mm boards for heavier-duty furniture elements, worktops, and higher-load components',
        ],
      },
      {
        title: 'Why It Works',
        body: [
          'Stable engineered panel format',
          'Premium natural bamboo appearance',
          'Suitable for visible and semi-structural furniture uses',
          'A stronger sustainability story with commercially practical positioning',
        ],
      },
      {
        title: 'Buyer Considerations',
        body: [
          'Confirm required thickness and ply combination at quote stage',
          'Review finishing system depending on final furniture application',
          'Request samples for color, grain, and fabrication evaluation',
        ],
      },
    ],
    ctas: [
      { label: 'Request Furniture Samples', href: '/request-samples' },
      { label: 'Request Quote', href: '/request-quote' },
    ],
  },
  {
    slug: 'interior-fit-outs',
    title: 'Interior Fit-Outs',
    cardDescription:
      'For joinery, wall systems, feature panels, and premium interior surfacing.',
    intro:
      'Interior fit-outs are one of the clearest current use cases for NUMAT, including office interiors, wall cladding, partitions, and premium surfacing.',
    sections: [
      {
        title: 'Best Fit',
        body: [
          'Office fit-outs',
          'Wall cladding',
          'Partition systems',
          'Feature panels',
          'Interior surfacing',
          'Premium design-led joinery',
        ],
      },
      {
        title: 'Recommended Board Logic',
        body: [
          '7mm boards for lightweight interior paneling',
          '12mm boards for wall linings, cabinetry doors, and interior joinery',
          '18–20mm boards for structural partition panels and heavier interior panel requirements',
        ],
      },
      {
        title: 'Why It Works',
        body: [
          'Natural material finish suited to premium interiors',
          'Already aligned with NUMAT’s current use-case materials',
          'Supports projects balancing material performance and lower-impact sourcing',
        ],
      },
      {
        title: 'Buyer Considerations',
        body: [
          'Match board selection to decorative, joinery, or partition requirements',
          'Confirm finishing and edge treatment before quotation',
          'Contact sales for technical and project-document support',
        ],
      },
    ],
    ctas: [
      { label: 'Request Interior Samples', href: '/request-samples' },
      { label: 'Contact Sales', href: '/contact' },
    ],
  },
  {
    slug: 'hospitality-and-commercial-spaces',
    title: 'Hospitality and Commercial Spaces',
    cardDescription:
      'A strong fit for hotels, retail environments, offices, and branded interiors.',
    intro:
      'NUMAT boards are suitable for hospitality and commercial interiors where buyers need a panel that supports design value, practical fabrication, and a stronger sustainability narrative.',
    sections: [
      {
        title: 'Best Fit',
        body: [
          'Hotel interiors',
          'Retail displays and branded environments',
          'Office interiors',
          'Feature walls and paneling',
          'Reception and back-of-house joinery',
          'Commercial cabinetry and shelving',
        ],
      },
      {
        title: 'Recommended Board Logic',
        body: [
          '7mm boards for retail displays and lightweight commercial panel use',
          '12mm boards for cabinetry, shelving, signage, and door-facing interior components',
          '18–20mm boards for structural partition panels, countertop substrates, and higher-load interior substrates',
        ],
      },
      {
        title: 'Why It Works',
        body: [
          'Suitable for high-visibility interior applications',
          'Strong enough for practical joinery and panel use',
          'Supports a premium sustainable material story without sounding purely eco-first',
        ],
      },
      {
        title: 'Buyer Considerations',
        body: [
          'Hospitality and retail buyers usually need visual consistency and durability',
          'Samples are important for finish approval',
          'Sales should handle commercial documentation and performance-reference questions',
        ],
      },
    ],
    ctas: [
      { label: 'Request Commercial Samples', href: '/request-samples' },
      { label: 'Request Quote', href: '/request-quote' },
    ],
  },
  {
    slug: 'project-and-procurement-use',
    title: 'Project and Procurement Use',
    cardDescription:
      'Supported with quotation assistance, sample coordination, and commercial documentation.',
    intro:
      'This page is designed for buyers evaluating NUMAT for project use, pilot deployments, or recurring procurement conversations.',
    sections: [
      {
        title: 'Best Fit',
        body: [
          'Pilot projects',
          'Specification review',
          'Commercial buyer evaluation',
          'Sample-based qualification',
          'Procurement and sourcing discussions',
          'Distributor and trade conversations',
        ],
      },
      {
        title: 'What Buyers Can Request',
        body: [
          'Product quotations',
          'Sample coordination',
          'Technical references',
          'Testing-page review',
          'Commercial documentation',
          'Clarification on current certification and export-support materials',
        ],
      },
      {
        title: 'Commercial Positioning',
        body: [
          'NUMAT should not compete as a lowest-price commodity material',
          'It should position itself as a credible engineered panel alternative to plywood',
          'Credibility and documentation are central to commercial adoption',
        ],
      },
      {
        title: 'Buyer Considerations',
        body: [
          'Best for buyers evaluating on application fit, not only price',
          'Best used where performance, differentiation, and sustainability all matter',
          'Best supported through sample review and direct commercial discussion',
        ],
      },
    ],
    ctas: [
      { label: 'Contact Sales for Buyer Support', href: '/contact' },
      { label: 'Request Quote', href: '/request-quote' },
    ],
  },
]