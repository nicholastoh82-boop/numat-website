import type { Metadata } from 'next'

const BASE_URL = 'https://numatbamboo.com'
const OG_IMAGE = `${BASE_URL}/og-social.jpg`

export const globalMetadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'NUMAT Bamboo | Engineered Bamboo Boards from the Philippines',
    template: '%s | NUMAT Bamboo',
  },
  description:
    'Engineered bamboo boards: woven bamboo formwork, bamboo composite panels, and cross laminated boards for construction, furniture, and interior finishing. Export ready from Manolo Fortich, Bukidnon, with DOST and ASTM D1037 mechanical testing. Get a quote in 24 hours.',
  keywords: [
    'engineered bamboo boards',
    'bamboo boards Philippines',
    'bamboo wall panels',
    'bamboo flooring supplier',
    'bamboo boards for furniture',
    'sustainable bamboo building materials',
    'bamboo boards supplier Southeast Asia',
    'bamboo boards export',
    'bamboo cabinetry boards',
    'engineered bamboo supplier',
    'bamboo boards Singapore',
    'bamboo boards Malaysia',
  ],
  authors: [{ name: 'NUMAT Sustainable Manufacturing Inc.' }],
  creator: 'NUMAT Sustainable Manufacturing Inc.',
  publisher: 'NUMAT Sustainable Manufacturing Inc.',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: BASE_URL,
    siteName: 'NUMAT Bamboo',
    title: 'NUMAT Bamboo | Engineered Bamboo Boards from the Philippines',
    description:
      'Engineered bamboo boards: woven bamboo formwork, bamboo composite panels, and cross laminated boards. Export ready from Manolo Fortich, Bukidnon, Philippines.',
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'NUMAT engineered bamboo boards for commercial and interior applications',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: [OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export const homeMetadata: Metadata = {
  title: 'NUMAT Bamboo | Engineered Bamboo Boards from the Philippines',
  description:
    'Engineered bamboo boards: woven bamboo formwork, bamboo composite panels, and cross laminated boards. Backed by DOST and ASTM D1037 mechanical testing. Export ready from Manolo Fortich, Bukidnon, Philippines. Request a quote in 24 hours.',
  alternates: { canonical: `${BASE_URL}/` },
  openGraph: {
    url: `${BASE_URL}/`,
    title: 'NUMAT Bamboo | Engineered Bamboo Boards from the Philippines',
    description:
      'Engineered bamboo boards: woven bamboo formwork, bamboo composite panels, and cross laminated boards. Export ready from Manolo Fortich, Bukidnon, Philippines.',
  },
}

export const productsMetadata: Metadata = {
  title: 'Bamboo Boards and Panels | Product Catalog',
  description:
    'Browse NUMAT engineered bamboo boards: woven bamboo formwork boards, bamboo composite panels, and cross laminated boards in multiple thicknesses and finishes. Export ready from the Philippines. Download specs and request samples.',
  alternates: { canonical: `${BASE_URL}/products` },
  openGraph: {
    url: `${BASE_URL}/products`,
    title: 'Bamboo Boards and Panels | Product Catalog | NUMAT Bamboo',
    description:
      'Woven bamboo formwork boards, bamboo composite panels, and cross laminated boards in multiple configurations. Export ready from the Philippines.',
  },
}

export const applicationsMetadata: Metadata = {
  title: 'Bamboo Board Applications | Furniture, Interiors, and Construction',
  description:
    'How architects, interior designers, furniture manufacturers, and developers specify NUMAT engineered bamboo boards across residential and commercial projects in Southeast Asia.',
  alternates: { canonical: `${BASE_URL}/applications` },
  openGraph: {
    url: `${BASE_URL}/applications`,
    title: 'Bamboo Board Applications | NUMAT Bamboo',
    description:
      'How architects, interior designers, and furniture manufacturers use NUMAT engineered bamboo boards across commercial and residential projects.',
  },
}

export const compareMetadata: Metadata = {
  title: 'Bamboo vs Plywood vs MDF | Material Comparison',
  description:
    'Compare engineered bamboo boards against plywood, MDF, and solid wood across mechanical strength, sustainability, weight, and cost. Make an informed specification decision for your next project.',
  alternates: { canonical: `${BASE_URL}/compare` },
  openGraph: {
    url: `${BASE_URL}/compare`,
    title: 'Bamboo vs Plywood vs MDF | Material Comparison | NUMAT Bamboo',
    description:
      'How engineered bamboo boards compare against plywood, MDF, and solid wood across strength, sustainability, weight, and cost.',
  },
}

export const technicalResourcesMetadata: Metadata = {
  title: 'Technical Resources | Data Sheets and Mechanical Testing',
  description:
    'Download data sheets, dimensional specifications, and mechanical testing results for NUMAT engineered bamboo boards. DOST and ASTM D1037 tested. Available for commercial evaluation.',
  alternates: { canonical: `${BASE_URL}/technical-resources` },
  openGraph: {
    url: `${BASE_URL}/technical-resources`,
    title: 'Technical Resources | NUMAT Bamboo',
    description:
      'Data sheets, dimensional specs, and DOST and ASTM D1037 mechanical testing results for NUMAT engineered bamboo boards.',
  },
}

export const aboutMetadata: Metadata = {
  title: 'About NUMAT | Sustainable Bamboo Manufacturing from the Philippines',
  description:
    'NUMAT is a Singapore founded bamboo manufacturing company producing engineered bamboo boards in Manolo Fortich, Bukidnon, in Northern Mindanao, Philippines. Backed by Wavemaker Impact. From nature, for nature.',
  alternates: { canonical: `${BASE_URL}/about` },
  openGraph: {
    url: `${BASE_URL}/about`,
    title: 'About NUMAT | Sustainable Bamboo Manufacturing',
    description:
      'NUMAT is a Singapore founded bamboo manufacturing company producing engineered bamboo boards in Manolo Fortich, Bukidnon, Northern Mindanao. Backed by Wavemaker Impact.',
  },
}

export const contactMetadata: Metadata = {
  title: 'Contact NUMAT | Request a Quote or Sample',
  description:
    'Get in touch with the NUMAT sales team for quotes, samples, and technical support. We respond within 24 hours. Export-ready engineered bamboo boards from the Philippines.',
  alternates: { canonical: `${BASE_URL}/contact` },
  openGraph: {
    url: `${BASE_URL}/contact`,
    title: 'Contact NUMAT | Request a Quote or Sample',
    description:
      'Get quotes, samples, and technical support from NUMAT. We respond within 24 hours.',
  },
}

export const esgMetadata: Metadata = {
  title: 'ESG and Sustainability | NUMAT Bamboo',
  description:
    'NUMAT engineered bamboo boards are sustainably harvested from Dendrocalamus asper bamboo sequestering 66.3 tonnes of CO2 per hectare per year. Our commitment to responsible manufacturing and community development in Mindanao.',
  alternates: { canonical: `${BASE_URL}/esg` },
  openGraph: {
    url: `${BASE_URL}/esg`,
    title: 'ESG and Sustainability | NUMAT Bamboo',
    description:
      'Sustainably harvested bamboo sequestering 66.3 tonnes of CO2 per hectare per year. NUMAT commitment to responsible manufacturing and community development.',
  },
}

export const requestQuoteMetadata: Metadata = {
  title: 'Request a Quote | Engineered Bamboo Boards',
  description:
    'Submit your project details and receive a quote within 24 hours. Engineered bamboo boards: woven bamboo formwork, bamboo composite panels, and cross laminated boards. Export ready from Manolo Fortich, Bukidnon, Philippines.',
  alternates: { canonical: `${BASE_URL}/request-quote` },
  robots: { index: false, follow: false },
}

export const newsMetadata: Metadata = {
  title: 'News and Updates | NUMAT Bamboo',
  description:
    'The latest news, project features, and updates from NUMAT. Engineered bamboo boards for furniture, interiors, and commercial applications from the Philippines.',
  alternates: { canonical: `${BASE_URL}/news` },
  openGraph: {
    url: `${BASE_URL}/news`,
    title: 'News and Updates | NUMAT Bamboo',
    description:
      'Latest news, project features, and updates from NUMAT engineered bamboo boards.',
  },
}

export const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'NUMAT Sustainable Manufacturing Inc.',
  alternateName: 'NUMAT Bamboo',
  url: BASE_URL,
  logo: `${BASE_URL}/logo.png`,
  image: OG_IMAGE,
  description:
    'Engineered bamboo board manufacturer producing woven bamboo formwork boards, bamboo composite panels, and cross laminated bamboo boards for construction, furniture, cabinetry, and interior finishing. Manufactured in Manolo Fortich, Bukidnon, Philippines.',
  foundingLocation: {
    '@type': 'Place',
    name: 'Singapore',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '2 Havelock Road, Havelock 2, #07-13',
      addressLocality: 'Singapore',
      postalCode: '059763',
      addressCountry: 'SG',
    },
  },
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Global Agro Milling Corp., Warehouse B22, Barangay Alae',
    addressLocality: 'Manolo Fortich',
    addressRegion: 'Bukidnon',
    postalCode: '8703',
    addressCountry: 'PH',
  },
  contactPoint: [
    {
      '@type': 'ContactPoint',
      email: 'sales@numat.ph',
      contactType: 'sales',
      areaServed: ['PH', 'SG', 'MY', 'ID', 'AU', 'GB', 'US'],
      availableLanguage: 'English',
    },
  ],
  sameAs: [
    'https://www.facebook.com/NuMatPH/',
    'https://ph.linkedin.com/company/numat-ph',
  ],
}

export const localBusinessSchema = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'NUMAT Bamboo',
  url: BASE_URL,
  image: OG_IMAGE,
  description:
    'Engineered bamboo board manufacturer and supplier. Woven bamboo formwork boards, bamboo composite panels, and cross laminated bamboo boards, manufactured in Manolo Fortich, Bukidnon, Philippines.',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Global Agro Milling Corp., Warehouse B22, Barangay Alae',
    addressLocality: 'Manolo Fortich',
    addressRegion: 'Bukidnon',
    postalCode: '8703',
    addressCountry: 'PH',
  },
  email: 'sales@numat.ph',
  telephone: '+639613076458',
  priceRange: '$$',
  currenciesAccepted: 'PHP USD SGD MYR',
  paymentAccepted: 'Bank Transfer, TT',
  openingHoursSpecification: {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    opens: '08:00',
    closes: '17:00',
  },
}
