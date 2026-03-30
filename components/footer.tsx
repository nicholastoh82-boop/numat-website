import Link from 'next/link'
import Image from 'next/image'

const footerLinks = {
  products: [
    { name: 'NuBam Boards', href: '/products?category=nubam-boards' },
    { name: 'NuDoor', href: '/products?category=nudoor' },
    { name: 'NuFloor', href: '/products?category=nufloor' },
    { name: 'NuWall', href: '/products?category=nuwall' },
    { name: 'NuSlat', href: '/products?category=nuslat' },
  ],
  resources: [
    { name: 'Technical Resources', href: '/technical-resources' },
    { name: 'Request Samples', href: '/request-samples' },
    { name: 'ESG', href: '/esg' },
    { name: 'Contact Sales', href: '/contact' },
  ],
  company: [
    { name: 'About Us', href: '/about' },
    { name: 'Contact', href: '/contact' },
    { name: 'Privacy Policy', href: '/privacy' },
    { name: 'Terms of Service', href: '/terms' },
    { name: 'Cookie Policy', href: '/cookies' },
  ],
}

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#182019] text-white">
      <div className="mx-auto max-w-7xl px-4 py-14 lg:px-8 lg:py-16">
        <div className="grid gap-12 lg:grid-cols-[1.35fr_0.85fr_0.85fr_0.85fr]">
          <div>
            <Link href="/" className="inline-block">
              <div className="relative h-12 w-[220px]">
                <Image
                  src="/logo.png"
                  alt="NUMAT logo"
                  fill
                  sizes="220px"
                  className="object-contain object-left"
                />
              </div>
            </Link>

            <p className="mt-6 max-w-md text-sm leading-7 text-white/68">
              Engineered bamboo boards for furniture manufacturing,
              cabinetry, wall systems, doors, flooring, and commercial interior applications.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/75">
                Singapore-founded
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/75">
                Manufacturing in the Philippines
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/75">
                Export-ready supply
              </span>
            </div>

            <div className="mt-6 space-y-2 text-sm text-white/68">
              <p>Sales: sales@numat.ph</p>
              <p>WhatsApp: +60162958983</p>
              <a
                href="https://www.facebook.com/NuMatPH/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 transition-colors hover:text-white"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                  </svg>
                facebook.com/NuMatPH
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/88">
              Products
            </h3>
            <ul className="mt-5 space-y-3">
              {footerLinks.products.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/68 transition-colors hover:text-white"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/88">
              Resources
            </h3>
            <ul className="mt-5 space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/68 transition-colors hover:text-white"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/88">
              Company
            </h3>
            <ul className="mt-5 space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/68 transition-colors hover:text-white"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-6">
          <div className="flex flex-col gap-3 text-sm text-white/55 md:flex-row md:items-center md:justify-between">
            <p>{new Date().getFullYear()} NUMAT. All rights reserved.</p>
            <p>
              Prices shown in local currency are converted from USD. Final quotation values,
              availability, and freight are subject to confirmation.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}