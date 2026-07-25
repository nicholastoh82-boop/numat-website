export type SolutionItem = {
  slug: string
  title: string
  category: string
  tagline: string
  cardDescription: string
  intro: string
  heroImage: string
  keyFacts: { label: string; value: string }[]
  features: string[]
  grainOptions?: { name: string; note: string }[]
  jointProfile?: { label: string; value: string }[]
  installSteps?: { title: string; body: string }[]
  installNotes?: string[]
  finishes?: string[]
  applications: string[]
  specs: { label: string; value: string }[]
  boardSlug: string
  boardName: string
  sheetPdf?: string
}

export const solutions: SolutionItem[] = [
  {
    slug: 'wall-panels',
    sheetPdf: '/docs/CLB-Wall-Panel-Sheet.pdf',
    title: 'CLB Wall Panels',
    category: 'Interior wall systems',
    tagline: 'Easier installation, stronger walls, better aesthetics',
    cardDescription:
      'Tongue and groove wall panels in Cross Laminated Bamboo, 14 mm thick, for a seamless interior finish.',
    intro:
      'An improved design for easier installation, stronger walls and better aesthetics. All boards are 14 mm thick with a tongue and groove joint for a seamless finish. The core is Cross Laminated Bamboo for strength and stability.',
    heroImage: '/nuweave/numat-clb-wall-panel-interior.jpg',
    keyFacts: [
      { label: 'Thickness', value: '14 mm' },
      { label: 'Joint', value: 'Tongue and groove' },
      { label: 'Core', value: 'Cross Laminated Bamboo' },
      { label: 'Use', value: 'Interior walls' },
    ],
    features: [
      'Tongue and groove joint for fast, easy and tight installation',
      'Cross base support concept for flat and stable panels',
      'All boards 14 mm thick for strength and durability',
      'Minimal visible gaps for a clean and seamless look',
      'Suitable for residential, commercial and hospitality interiors',
    ],
    grainOptions: [
      { name: 'Horizontal grain', note: 'A classic, natural and warm look' },
      { name: 'Vertical grain', note: 'A modern, sleek and uniform look' },
    ],
    jointProfile: [
      { label: 'Recommended fit tolerance', value: '0.2 to 0.4 mm' },
      { label: 'Groove depth', value: '4 mm' },
      { label: 'Tongue thickness', value: '6 mm' },
      { label: 'Joint', value: 'Self aligning and concealed for a clean surface' },
    ],
    installSteps: [
      {
        title: 'Prepare the wall',
        body: 'Ensure the wall is level and dry, and install vertical battens or furring strips at 400 to 600 mm on centre.',
      },
      {
        title: 'Start installing',
        body: 'Place the first panel with the groove side facing out, or as preferred.',
      },
      {
        title: 'Lock the next panel',
        body: 'Insert the tongue of the next panel into the groove and push it in.',
      },
      {
        title: 'Secure',
        body: 'Nail or screw through the tongue, a hidden fastening, into the backing batten.',
      },
      {
        title: 'Continue',
        body: 'Continue panel by panel until the wall is complete, then add trims for finishing.',
      },
    ],
    installNotes: [
      'Ensure the wall is level, dry and structurally sound',
      'Use corrosion resistant screws or nails',
      'Leave a 3 to 5 mm expansion gap at the top, bottom and ends',
      'Allow panels to acclimatise 48 to 72 hours before installation',
      'Finish with matching bamboo trims for a premium look',
    ],
    finishes: [
      'PU clear coating (matt or satin)',
      'UV oil or hardwax oil',
      'Water based varnish',
      'Natural oil finish',
    ],
    applications: [
      'Interior wall paneling',
      'Feature walls',
      'Partitions',
      'Hospitality and commercial spaces',
      'Residential spaces',
    ],
    specs: [
      { label: 'Material', value: 'Engineered Bamboo CLB (Cross Laminated Bamboo)' },
      { label: 'Thickness', value: '14 mm' },
      { label: 'Joint type', value: 'Tongue and groove' },
      { label: 'Surface grain options', value: 'Horizontal or vertical' },
      { label: 'Application', value: 'Interior walls' },
    ],
    boardSlug: 'nubam-clb',
    boardName: 'NuBam CLB',
  },
  {
    slug: 'columns-and-beams',
    sheetPdf: '/docs/CLB-Columns-and-Beams-Sheet.pdf',
    title: 'CLB Columns and Beams',
    category: 'Structural cladding',
    tagline: 'Easier installation, stronger structure, better aesthetics',
    cardDescription:
      'Cross Laminated Bamboo panels that wrap steel columns and beams, 16 mm thick, for non load bearing architectural cladding.',
    intro:
      'Engineered Bamboo CLB panels provide a durable, beautiful and easy to install solution for wrapping steel columns and beams. Designed for non load bearing applications that enhance natural aesthetics and protect the structure.',
    heroImage: '/nuweave/numat-clb-columns-beams-pavilion.jpg',
    keyFacts: [
      { label: 'Thickness', value: '16 mm' },
      { label: 'Column size', value: '8 by 8 inch, up to 6 m' },
      { label: 'Beam size', value: '8 by 8 inch, up to 3 m' },
      { label: 'Load', value: 'Non load bearing' },
    ],
    features: [
      'Direct installation on steel columns and beams',
      'All boards 16 mm thick for strength and durability',
      'Lightweight yet strong',
      'Minimal visible gaps for a clean and seamless look',
      'UV and moisture resistant finish for long lasting performance',
      'Suitable for interior and exterior covered applications',
    ],
    grainOptions: [
      { name: 'Horizontal grain', note: 'A classic, natural and warm look' },
      { name: 'Vertical grain', note: 'A modern, sleek and uniform look' },
    ],
    jointProfile: [
      { label: 'Recommended fit tolerance', value: '0.2 to 0.4 mm' },
      { label: 'Groove depth', value: '6 mm' },
      { label: 'Tongue thickness', value: '6 mm' },
      { label: 'Joint', value: 'Tongue and groove, concealed for a clean surface' },
    ],
    installSteps: [
      {
        title: 'Prepare the steel member',
        body: 'Ensure the steel is clean, dry and free from rust, oil and debris.',
      },
      {
        title: 'Apply adhesive',
        body: 'Apply PU construction adhesive in vertical beads.',
      },
      {
        title: 'Position the panel',
        body: 'Place the panel and press it firmly onto the steel member.',
      },
      {
        title: 'Fasten securely',
        body: 'Use stainless steel screws to secure the panel.',
      },
      {
        title: 'Continue wrapping',
        body: 'Repeat on all sides for columns, or along the length for beams.',
      },
    ],
    installNotes: [
      'Ensure the member is level, plumb and structurally secure',
      'Use corrosion resistant screws or nails',
      'Leave a 2 to 3 mm expansion gap at the top and ends',
      'Allow panels to acclimatise 48 to 72 hours before installation',
      'Finish with matching trims for a premium look',
    ],
    finishes: [
      'PU clear coating (matt or satin)',
      'UV oil or hardwax oil',
      'Water based varnish',
      'Natural oil finish',
    ],
    applications: [
      'Structural columns and beams',
      'Open air pavilions',
      'Interior architectural features',
      'Commercial buildings',
      'Hospitality and resort structures',
      'Residential spaces',
    ],
    specs: [
      { label: 'Material', value: 'Engineered Bamboo CLB (Cross Laminated Bamboo)' },
      { label: 'Thickness', value: '16 mm' },
      {
        label: 'Member size',
        value: 'Columns 8 by 8 inch up to 6 m, beams 8 by 8 inch up to 3 m',
      },
      { label: 'Joint type', value: 'Tongue and groove' },
      { label: 'Surface grain options', value: 'Horizontal or vertical' },
      { label: 'Application', value: 'Beams and columns, non load bearing' },
    ],
    boardSlug: 'nubam-clb',
    boardName: 'NuBam CLB',
  },
  {
    slug: 'furniture',
    sheetPdf: '/docs/CLB-Round-Table-Sheet.pdf',
    title: 'CLB Furniture',
    category: 'Furniture',
    tagline: 'Stronger structure, better durability, beautiful aesthetics',
    cardDescription:
      'Cross Laminated Bamboo furniture such as round tables, 25 mm thick, with a solid cross base for heavy use.',
    intro:
      'Engineered Bamboo CLB furniture is built for large scale and heavy use. The round table features a solid cross base with a solid panel for enhanced stability and durability, and all boards are 25 mm thick.',
    heroImage: '/nuweave/numat-bamboo-tables-flooring-apdcc.jpg',
    keyFacts: [
      { label: 'Thickness', value: '25 mm' },
      { label: 'Base', value: 'Solid cross base' },
      { label: 'Core', value: 'Cross Laminated Bamboo' },
      { label: 'Built for', value: 'Large scale, heavy use' },
    ],
    features: [
      'Solid cross base for maximum stability',
      'All boards 25 mm thick',
      'Strong, simple and durable construction',
      'Suitable for large scale and heavy use',
    ],
    grainOptions: [
      { name: 'Horizontal grain boards', note: 'A classic, natural and warm look' },
      { name: 'Vertical grain boards', note: 'A modern, sleek and uniform look' },
    ],
    applications: [
      'Dining and conference tables',
      'Hospitality and events',
      'Commercial and institutional spaces',
      'Large table and seating sets',
    ],
    specs: [
      { label: 'Material', value: 'Engineered Bamboo CLB (Cross Laminated Bamboo)' },
      { label: 'Board thickness', value: '25 mm' },
      { label: 'Base', value: 'Solid cross base with a solid panel' },
      { label: 'Surface grain options', value: 'Horizontal or vertical' },
    ],
    boardSlug: 'nubam-clb',
    boardName: 'NuBam CLB',
  },
]
