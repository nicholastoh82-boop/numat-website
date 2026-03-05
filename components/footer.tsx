import Link from 'next/link'
import { Leaf } from 'lucide-react'

const footerLinks = {
  products: [
    { name: 'Furniture Boards', href: '/products?category=furniture' },
    { name: 'Door Panels', href: '/products?category=door' },
    { name: 'Flooring', href: '/products?category=flooring' },
    { name: 'Structural', href: '/products?category=structural' },
    { name: 'Wall Panelling', href: '/products?category=wall-panelling' },
  ],
  company: [
    { name: 'About Us', href: '/about' },
    { name: 'ESG & Sustainability', href: '/esg' },
    { name: 'Contact', href: '/contact' },
  ],
  legal: [
    { name: 'Privacy Policy', href: '/privacy' },
    { name: 'Terms of Service', href: '/terms' },
    { name: 'Cookie Policy', href: '/cookies' },
  ],
}

export default function Footer() {
  return (
    <footer className="bg-secondary border-t border-border">
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary">
                <Leaf className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-serif text-2xl text-foreground tracking-tight">NUMAT</span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              Premium NuBam engineered bamboo products for sustainable construction and design worldwide. 
              Backed by Wavemaker Impact for verified ESG credentials.
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center px-2 py-1 rounded bg-primary/10 text-primary text-xs font-medium">
                Wavemaker Impact Partner
              </span>
            </div>
          </div>

          {/* Products */}
          <div>
            <h3 className="text-sm font-semibold text-foreground tracking-wide uppercase">
              Products
            </h3>
            <ul className="mt-4 space-y-3">
              {footerLinks.products.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-semibold text-foreground tracking-wide uppercase">
              Company
            </h3>
            <ul className="mt-4 space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold text-foreground tracking-wide uppercase">
              Legal
            </h3>
            <ul className="mt-4 space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              {new Date().getFullYear()} NUMAT. All rights reserved. | Founded in Singapore | Factory in Philippines
            </p>
            <p className="text-xs text-muted-foreground">
              Prices shown are Ex Factory CDO, VAT excluded. | sales@numat.ph | +60 16-295 8983
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
