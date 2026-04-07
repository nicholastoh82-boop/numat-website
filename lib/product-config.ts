export type ProductFamily =
  | 'nubam-boards'
  | 'nudoor'
  | 'nufloor'
  | 'nuwall'
  | 'nuslat'
  | 'furniture'
  | 'other'

export type ConfigOption = {
  label: string
  value: string
}

export type ResolvedConfig = {
  family: ProductFamily
  productLabel: string
  dimensions: string
  thickness: string
  ply: string
  coreType: string
  model: string
  length: string
  unit: string
  moq: number
  priceUsd: number | null
  inStock: boolean
  stockMessage?: string
}

type BoardRow = {
  coreType: 'Horizontal' | 'Vertical'
  thickness: string
  ply: string
  priceUsd: number
}

const BOARD_DIMENSIONS = '2440mm x 1220mm'

const BOARD_ROWS: BoardRow[] = [
  { coreType: 'Horizontal', thickness: '7mm', ply: '2 Ply', priceUsd: 50 },
  { coreType: 'Horizontal', thickness: '7mm', ply: '3 Ply', priceUsd: 65 },
  { coreType: 'Horizontal', thickness: '12mm', ply: '2 Ply', priceUsd: 55 },
  { coreType: 'Horizontal', thickness: '12mm', ply: '3 Ply', priceUsd: 70 },
  { coreType: 'Horizontal', thickness: '20mm', ply: '3 Ply', priceUsd: 75 },
  { coreType: 'Horizontal', thickness: '25mm', ply: '3 Ply', priceUsd: 130 },
  { coreType: 'Horizontal', thickness: '30mm', ply: '5 Ply', priceUsd: 140 },
  { coreType: 'Vertical', thickness: '40mm', ply: '3 Ply', priceUsd: 200 },
  { coreType: 'Vertical', thickness: '45mm', ply: '5 Ply', priceUsd: 210 },
  { coreType: 'Vertical', thickness: '50mm', ply: '5 Ply', priceUsd: 220 },
]

const DOOR_MODELS = {
  premium: {
    label: 'NuDoor Premium',
    dimensions: '2100mm x 900mm',
    thickness: '45mm',
    priceUsd: 350,
    moq: 1,
    unit: 'pc',
  },
  composite: {
    label: 'NuDoor Composite',
    dimensions: '2100mm x 800mm',
    thickness: '40mm',
    priceUsd: 250,
    moq: 1,
    unit: 'pc',
  },
  light: {
    label: 'NuDoor Light',
    dimensions: '2000mm x 800mm',
    thickness: '35mm',
    priceUsd: 200,
    moq: 1,
    unit: 'pc',
  },
} as const

const FLOOR_DIMENSIONS = '1220mm x 305mm'

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function detectProductFamily(productName: string, category?: string | null): ProductFamily {
  const combined = `${productName} ${category || ''}`.toLowerCase()

  if (combined.includes('nudoor')) return 'nudoor'
  if (combined.includes('nufloor')) return 'nufloor'
  if (combined.includes('nuwall')) return 'nuwall'
  if (combined.includes('nuslat')) return 'nuslat'
  if (combined.includes('nubam')) return 'nubam-boards'
  if (combined.includes('furniture')) return 'furniture'

  const slug = slugify(category || '')
  if (slug === 'nudoor' || slug === 'door') return 'nudoor'
  if (slug === 'nufloor' || slug === 'flooring') return 'nufloor'
  if (slug === 'nuwall' || slug === 'wall-panelling' || slug === 'wall-paneling' || slug === 'wall') {
    return 'nuwall'
  }
  if (slug === 'nuslat' || slug === 'diy-project' || slug === 'diy-projects' || slug === 'diy') {
    return 'nuslat'
  }
  if (slug === 'nubam' || slug === 'nubam-boards' || slug === 'veneer') return 'nubam-boards'
  if (slug === 'furniture') return 'furniture'

  return 'other'
}

export function getFamilyLabel(family: ProductFamily) {
  switch (family) {
    case 'nubam-boards':
      return 'NuBam Boards'
    case 'nudoor':
      return 'NuDoor'
    case 'nufloor':
      return 'NuFloor'
    case 'nuwall':
      return 'NuWall'
    case 'nuslat':
      return 'NuSlat'
    case 'furniture':
      return 'Furniture'
    default:
      return 'Product'
  }
}

export function getConfiguratorOptions(family: ProductFamily) {
  if (family === 'nubam-boards' || family === 'nuwall') {
    const coreTypes: ConfigOption[] = Array.from(new Set(BOARD_ROWS.map((r) => r.coreType))).map((v) => ({
      label: v,
      value: v,
    }))

    return {
      coreTypes,
      thicknesses(coreType: string) {
        return Array.from(
          new Set(BOARD_ROWS.filter((r) => r.coreType === coreType).map((r) => r.thickness))
        ).map((v) => ({ label: v, value: v }))
      },
      plys(coreType: string, thickness: string) {
        return BOARD_ROWS.filter((r) => r.coreType === coreType && r.thickness === thickness).map((r) => ({
          label: r.ply,
          value: r.ply,
        }))
      },
    }
  }

  if (family === 'nudoor') {
    return {
      models: [
        { label: 'NuDoor Premium', value: 'premium' },
        { label: 'NuDoor Composite', value: 'composite' },
        { label: 'NuDoor Light', value: 'light' },
      ] satisfies ConfigOption[],
    }
  }

  if (family === 'nufloor') {
    return {
      thicknesses: [
        { label: '20mm', value: '20mm' },
      ] satisfies ConfigOption[],
    }
  }

  if (family === 'nuslat') {
    return {
      thicknesses: [
        { label: '5mm', value: '5mm' },
        { label: '6mm', value: '6mm' },
        { label: '7mm', value: '7mm' },
        { label: '8mm', value: '8mm' },
        { label: '9mm', value: '9mm' },
        { label: '10mm', value: '10mm' },
        { label: '11mm', value: '11mm' },
        { label: '12mm', value: '12mm' },
      ] satisfies ConfigOption[],
      lengths: [
        { label: '3ft', value: '3ft' },
        { label: '4ft', value: '4ft' },
        { label: '5ft', value: '5ft' },
        { label: '6ft', value: '6ft' },
        { label: '7ft', value: '7ft' },
        { label: '8ft', value: '8ft' },
        { label: '9ft', value: '9ft' },
        { label: '10ft', value: '10ft' },
      ] satisfies ConfigOption[],
    }
  }

  return {}
}

export function resolveConfiguredVariant(args: {
  family: ProductFamily
  productName: string
  selectedCoreType?: string
  selectedThickness?: string
  selectedPly?: string
  selectedModel?: string
  selectedLength?: string
}): ResolvedConfig {
  const {
    family,
    productName,
    selectedCoreType = '',
    selectedThickness = '',
    selectedPly = '',
    selectedModel = '',
    selectedLength = '',
  } = args

  if (family === 'nubam-boards' || family === 'nuwall') {
    const match =
      BOARD_ROWS.find(
        (r) =>
          r.coreType === selectedCoreType &&
          r.thickness === selectedThickness &&
          r.ply === selectedPly
      ) ?? null

    return {
      family,
      productLabel: getFamilyLabel(family),
      dimensions: BOARD_DIMENSIONS,
      thickness: selectedThickness,
      ply: selectedPly,
      coreType: selectedCoreType,
      model: '',
      length: '',
      unit: 'sheet',
      moq: 10,
      priceUsd: match?.priceUsd ?? null,
      inStock: Boolean(match),
      stockMessage: match ? '' : 'No stock',
    }
  }

  if (family === 'nudoor') {
    const model =
      DOOR_MODELS[selectedModel as keyof typeof DOOR_MODELS] ?? DOOR_MODELS.premium

    return {
      family,
      productLabel: model.label,
      dimensions: model.dimensions,
      thickness: model.thickness,
      ply: '—',
      coreType: '—',
      model: model.label,
      length: '',
      unit: model.unit,
      moq: model.moq,
      priceUsd: model.priceUsd,
      inStock: true,
    }
  }

  if (family === 'nufloor') {
    const thickness = selectedThickness || '12mm'
    return {
      family,
      productLabel: 'NuFloor',
      dimensions: FLOOR_DIMENSIONS,
      thickness,
      ply: '3 Ply',
      coreType: '—',
      model: '',
      length: '',
      unit: 'pc',
      moq: 20,
      priceUsd: 10,
      inStock: true,
    }
  }

  if (family === 'nuslat') {
    const inStock = selectedThickness === '5mm' && selectedLength === '8ft'
    return {
      family,
      productLabel: 'NuSlat',
      dimensions: 'Length-based product',
      thickness: selectedThickness,
      ply: '—',
      coreType: '—',
      model: '',
      length: selectedLength,
      unit: 'pc',
      moq: 500,
      priceUsd: inStock ? 0.5 : null,
      inStock,
      stockMessage: inStock ? '' : 'No stock',
    }
  }

  if (family === 'furniture') {
    return {
      family,
      productLabel: productName,
      dimensions: 'Custom depending on product',
      thickness: '—',
      ply: '—',
      coreType: '—',
      model: '',
      length: '',
      unit: 'pc',
      moq: 1,
      priceUsd: null,
      inStock: false,
      stockMessage: 'Request Quote',
    }
  }

  return {
    family,
    productLabel: productName,
    dimensions: '—',
    thickness: '—',
    ply: '—',
    coreType: '—',
    model: '',
    length: '',
    unit: 'pc',
    moq: 1,
    priceUsd: null,
    inStock: false,
    stockMessage: 'No stock',
  }
}

export function validateConfiguredQuantity(family: ProductFamily, quantity: number) {
  if (family === 'nufloor') {
    if (quantity < 20) {
      return 'Minimum order quantity is 20.'
    }
    if (quantity % 20 !== 0) {
      return 'NuFloor quantity must be in multiples of 20.'
    }
  }

  if (family === 'nubam-boards' || family === 'nuwall') {
    if (quantity < 10) return 'Minimum order quantity is 10.'
  }

  if (family === 'nudoor') {
    if (quantity < 1) return 'Minimum order quantity is 1.'
  }

  if (family === 'nuslat') {
    if (quantity < 500) return 'Minimum order quantity is 500.'
  }

  if (family === 'furniture') {
    if (quantity < 1) return 'Minimum order quantity is 1.'
  }

  return ''
}