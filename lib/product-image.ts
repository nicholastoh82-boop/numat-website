export function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function getFallbackImageByCategory(categoryName: string) {
  const slug = slugify(categoryName)

  const map: Record<string, string> = {
    furniture: '/Bamboo-Furniture.png',

    door: '/Bamboo-Door.png',
    nudoor: '/Bamboo-Door.png',

    flooring: '/Bamboo-Flooring.png',
    floor: '/Bamboo-Flooring.png',
    nufloor: '/Bamboo-Flooring.png',

    wall: '/Bamboo-Wall.png',
    'wall-panelling': '/Bamboo-Wall.png',
    'wall-paneling': '/Bamboo-Wall.png',
    nuwall: '/Bamboo-Wall.png',

    veneer: '/Bamboo-Board.png',
    nubam: '/Bamboo-Board.png',
    'nubam-boards': '/Bamboo-Board.png',

    diy: '/placeholder-product.jpg',
    'diy-project': '/placeholder-product.jpg',
    'diy-projects': '/placeholder-product.jpg',
    nuslat: '/placeholder-product.jpg',
  }

  return map[slug] || '/Bamboo-Board.png'
}

export function getCategoryName(product: {
  category?: string | { id?: string; name?: string } | null
  categories?: { id: string; name: string } | null
}) {
  if (typeof product.category === 'string') return product.category
  if (
    product.category &&
    typeof product.category === 'object' &&
    typeof product.category.name === 'string'
  ) {
    return product.category.name
  }
  if (typeof product.categories?.name === 'string') return product.categories.name
  return ''
}