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
    title: 'NuWev Wall Cladding',
    category: 'Interior wall systems',
    tagline: 'Woven bamboo that turns a wall into a feature',
    cardDescription:
      'Decorative indoor wall cladding in NuWev woven bamboo board, for feature walls, partitions and ceilings.',
    intro:
      'NuWev brings the hand woven bamboo pattern to interior walls. Use it as a decorative cladding for feature walls, partitions and ceilings, or as a stable substrate when you want to laminate or veneer over it.',
    heroImage: '/products/nuweave/nuwev-woven-texture-closeup.jpg',
    keyFacts: [
      { label: 'Board', value: 'NuWev' },
      { label: 'Face', value: 'Hand woven bamboo pattern' },
      { label: 'Sheet', value: '4 by 8 ft' },
      { label: 'Use', value: 'Indoor walls and ceilings' },
    ],
    features: [
      'Natural hand woven bamboo pattern on every sheet',
      'Decorative finish for feature walls and ceilings',
      'Works as a stable substrate for laminates and veneers',
      'Standard 4 by 8 ft sheet that is easy to plan around',
      'Suitable for residential, commercial and hospitality interiors',
    ],
    installSteps: [
      {
        title: 'Prepare the wall',
        body: 'Make sure the wall is level, dry and sound, and fix battens or furring strips to take the boards.',
      },
      {
        title: 'Plan the layout',
        body: 'Set out the sheets so the woven pattern runs the way you want and cuts fall at the edges.',
      },
      {
        title: 'Fix the boards',
        body: 'Fix each board to the battens with suitable screws or adhesive. Our team can confirm the fixing method for your project.',
      },
      {
        title: 'Finish',
        body: 'Add trims at edges and corners, then apply your chosen finish or laminate.',
      },
    ],
    installNotes: [
      'For indoor use only',
      'Ensure the wall is level, dry and structurally sound',
      'Use corrosion resistant screws or nails',
      'Allow boards to acclimatise on site before installation',
      'Leave a small expansion gap at the edges',
    ],
    finishes: [
      'PU clear coating (matt or satin)',
      'Water based varnish',
      'Natural oil finish',
      'Laminate or veneer over the board',
    ],
    applications: [
      'Feature walls',
      'Interior wall cladding',
      'Partitions',
      'Ceilings',
      'Hospitality and retail interiors',
      'Residential spaces',
    ],
    specs: [
      { label: 'Board', value: 'NuWev woven bamboo board' },
      { label: 'Panel size', value: '2440 x 1220 mm (4 x 8 ft)' },
      { label: 'Construction', value: 'Woven bamboo mats, bamboo sawdust, phenolic resin' },
      { label: 'Application', value: 'Indoor walls, partitions and ceilings' },
      { label: 'Also used as', value: 'Substrate for laminates and veneers' },
    ],
    boardSlug: 'nuweave',
    boardName: 'NuWev',
  },
  {
    slug: 'furniture',
    title: 'NuBrid Furniture and Cabinetry',
    category: 'Furniture',
    tagline: 'The bamboo panel that replaces MDF',
    cardDescription:
      'Cabinetry, furniture and joinery in NuBrid, a laminated bamboo face on a woven bamboo back, used in place of MDF.',
    intro:
      'NuBrid pairs a refined laminated bamboo face with a woven bamboo back in one engineered panel. Use it wherever you would use MDF: cabinet bodies and fronts, tables, shelving and built in joinery, with a clean natural finish.',
    heroImage: '/products/nubrid/nubrid-two-faces.jpg',
    keyFacts: [
      { label: 'Board', value: 'NuBrid' },
      { label: 'Face', value: 'Laminated bamboo' },
      { label: 'Back', value: 'Woven bamboo' },
      { label: 'Replaces', value: 'MDF' },
    ],
    features: [
      'A natural bamboo alternative to MDF',
      'Refined laminated face, woven bamboo back',
      'Cuts, routes and drills like the boards you already use',
      'Smooth surface that takes common furniture finishes',
    ],
    finishes: [
      'PU clear coating (matt or satin)',
      'UV oil or hardwax oil',
      'Water based varnish',
      'Natural oil finish',
    ],
    applications: [
      'Cabinet bodies and fronts',
      'Tables and worktops',
      'Shelving',
      'Built in furniture and custom joinery',
      'Hospitality and commercial furniture',
    ],
    specs: [
      { label: 'Board', value: 'NuBrid engineered bamboo panel' },
      { label: 'Panel size', value: '2440 x 1220 mm (4 x 8 ft)' },
      { label: 'Panel build', value: 'Laminated bamboo face, woven bamboo back' },
      { label: 'Thickness', value: '8 to 22 mm' },
      { label: 'Surface', value: 'Smooth laminated bamboo face, machinable' },
    ],
    boardSlug: 'nuhybrid',
    boardName: 'NuBrid',
  },
]
