import Link from 'next/link'
import Image from 'next/image'

const footerLinks = {
  products: [
    { name: 'NuBam Boards', href: '/products?category=nubam-boards' },
    { name: 'NuDoor', href: '/products?category=nudoor' },
    { name: 'NuFloor', href: '/products?category=nufloor' },
    { name: 'NuWall', href: '/products?category=nuwall' },
    { name: 'NuSlat', href: '/products?category=nuslat' },
    { name: 'Furniture', href: '/products?category=furniture' },
  ],
  company: [
    { name: 'About Us', href: '/about' },
    { name: 'Testing', href: '/testing' },
    { name: 'Sustainability', href: '/esg' },
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
    <footer className="border-t border-white/10 bg-[#182019] text-white">
      <div className="mx-auto max-w-7xl px-4 py-14 lg:px-8 lg:py-16">
        <div className="grid gap-12 lg:grid-cols-[1.35fr_0.85fr_0.75fr_0.75fr]">
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
              Engineered bamboo materials for refined interiors, fit-outs, doors,
              flooring, wall finishes, and furniture applications.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/75">
                Singapore-founded
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/75">
                Manufacturing in the Philippines
              </span>
            </div>

            <div className="mt-6 space-y-2 text-sm text-white/68">
              <p>sales@numat.ph</p>
              <p>WhatsApp: +60 11 3959 3956</p>
              <p>Viber: +63 962 812 7829</p>
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

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/88">
              Legal
            </h3>
            <ul className="mt-5 space-y-3">
              {footerLinks.legal.map((link) => (
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
              Prices shown in local currency are converted from USD. Final quote values are subject to confirmation.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}