import Header from '@/components/header'
import Footer from '@/components/footer'
import CartDrawer from '@/components/cart-drawer'
import Link from 'next/link'
import Image from 'next/image'
import {
  Leaf,
  Award,
  MapPin,
  Users,
  Target,
  Heart,
  ArrowRight,
  ShieldCheck,
  Zap,
  Globe,
} from 'lucide-react'

export const metadata = {
  title: 'About Us | NUMAT',
  description: 'Learn about NUMAT and our mission to provide sustainable engineered bamboo products worldwide.',
}

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <CartDrawer />
      <main className="flex-1 bg-[#f6f1e8]">

        {/* Hero */}
        <section className="border-b border-stone-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-20">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-900/10 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">
                  <Award className="h-4 w-4" />
                  Wavemaker Impact Portfolio Company
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-stone-950 sm:text-5xl lg:text-6xl">
                  Building a Sustainable Future with Bamboo
                </h1>
                <p className="mt-6 text-lg leading-8 text-stone-600">
                  NUMAT is a Singapore-founded, Philippines-manufactured engineered bamboo company.
                  We supply commercial-grade boards to furniture makers, architects, contractors,
                  and sourcing teams across Southeast Asia and beyond.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/products"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-stone-950 px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-stone-900"
                  >
                    Browse Products
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/contact"
                    className="inline-flex items-center justify-center rounded-2xl border border-stone-300 bg-white px-6 py-3 text-sm font-bold text-stone-900 transition hover:-translate-y-0.5 hover:bg-stone-50"
                  >
                    Contact Sales
                  </Link>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-[2rem] border border-stone-200 shadow-lg">
                <div className="relative h-[420px]">
                  <Image
                    src="/about-us.jpg"
                    alt="Numat sustainable harvesting"
                    fill
                    className="object-cover transition duration-700 group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                  <div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-white/20 bg-white/90 p-5 backdrop-blur">
                    <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">Headquartered in Singapore</p>
                    <p className="mt-1 text-lg font-bold text-stone-950">Manufacturing in Cagayan de Oro, Philippines</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust stats */}
        <section className="border-b border-stone-200 bg-[#f6f1e8]">
          <div className="mx-auto max-w-7xl px-6 py-6 lg:px-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { value: '50+', label: 'Local Bamboo Farmers', icon: Users },
                { value: 'Singapore', label: 'Headquarters', icon: Globe },
                { value: 'FSC', label: 'Sustainable Sourcing', icon: ShieldCheck },
                { value: 'Carbon−', label: 'Negative Products', icon: Leaf },
              ].map((stat) => (
                <div key={stat.label} className="rounded-[1.75rem] border border-stone-200 bg-white px-6 py-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50">
                      <stat.icon className="h-5 w-5 text-emerald-800" />
                    </div>
                    <div>
                      <p className="text-xl font-extrabold text-stone-950">{stat.value}</p>
                      <p className="text-xs text-stone-500">{stat.label}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Our Story */}
        <section className="border-b border-stone-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-18">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-emerald-800">Who We Are</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-stone-950 sm:text-4xl">
                  Our Story
                </h2>
                <div className="mt-6 space-y-5 text-base leading-7 text-stone-600">
                  <p>
                    Founded in Singapore with manufacturing facilities in Cagayan de Oro, Philippines,
                    NUMAT emerged from a simple observation — the construction and design industry
                    needed better, more sustainable materials.
                  </p>
                  <p>
                    Bamboo, with its remarkable strength, rapid growth, and carbon-negative
                    properties, was the obvious answer. We partnered with local bamboo farmers
                    and invested in state-of-the-art processing to create premium engineered
                    bamboo boards under the NuBam brand.
                  </p>
                  <p>
                    Today, we support furniture manufacturers, architects, contractors, developers,
                    and sourcing teams with commercial-grade bamboo materials built for real projects.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  {
                    icon: MapPin,
                    title: 'Global Presence',
                    body: 'Headquartered in Singapore with manufacturing in Cagayan de Oro, Philippines — positioned for export across Asia and beyond.',
                  },
                  {
                    icon: Users,
                    title: '50+ Local Farmers',
                    body: 'We work directly with local bamboo farming communities through fair-trade partnerships that support livelihoods and supply chain integrity.',
                  },
                  {
                    icon: Award,
                    title: 'Wavemaker Impact Backed',
                    body: "Portfolio company of Southeast Asia's leading climate-tech investor — independently verifying our carbon-negative impact claims.",
                  },
                  {
                    icon: Zap,
                    title: 'Export-Ready Supply',
                    body: 'Commercial documentation, technical data sheets, and procurement support available for serious buyers and project teams.',
                  },
                ].map((item) => (
                  <div key={item.title} className="flex gap-5 rounded-[1.75rem] border border-stone-200 bg-stone-50 px-6 py-5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50">
                      <item.icon className="h-5 w-5 text-emerald-800" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-stone-950">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-stone-500">{item.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Why buyers trust us */}
        <section className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-18">
          <div className="mb-10 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-800">Why Buyers Choose NUMAT</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-stone-950 sm:text-4xl">
              Built for Commercial Confidence
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-stone-600">
              We're not just a materials supplier. We provide the documentation, samples,
              technical support, and commercial backing serious buyers need to specify with confidence.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {[
              {
                icon: ShieldCheck,
                title: 'DOST / ASTM D1037 Tested',
                body: 'Mechanical testing completed to international standards — MOR, MOE, compression, and hardness data available for specification.',
              },
              {
                icon: Leaf,
                title: 'SUstainable Sourcing & Carbon-Negative',
                body: 'All products sourced from sustainable plantations. Carbon-negative lifecycle verified by Wavemaker Impact.',
              },
              {
                icon: Award,
                title: 'Investor-Backed Credibility',
                body: "Backed by Wavemaker Impact, Southeast Asia's leading climate-tech VC — giving buyers confidence in our long-term supply capability.",
              },
              {
                icon: MapPin,
                title: 'Philippine Manufacturing',
                body: 'Produced in Bukidnon using Giant Asper bamboo — a strong, dense species ideal for engineered board applications.',
              },
              {
                icon: Users,
                title: 'Direct Sales Support',
                body: 'Real people, real documentation. Our team supports sampling, quotation, technical queries, and commercial documentation.',
              },
              {
                icon: Target,
                title: 'Low MOQ, Export-Ready',
                body: 'MOQ from 10 boards. Export documentation and commercial support available for buyers across Asia and internationally.',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-[2rem] border border-stone-200 bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50">
                  <item.icon className="h-6 w-6 text-emerald-800" />
                </div>
                <h3 className="mt-5 text-lg font-bold text-stone-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-stone-500">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Mission & Values */}
        <section className="border-y border-stone-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-18">
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-bold tracking-tight text-stone-950 sm:text-4xl">
                Our Mission & Values
              </h2>
              <p className="mt-3 text-base text-stone-500">Guided by purpose, driven by sustainability</p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  icon: Target,
                  title: 'Mission',
                  body: 'To provide procurement-ready engineered bamboo materials that help commercial buyers choose lower-impact alternatives without compromising performance, finish, or supply support.',
                  color: 'bg-blue-50',
                  iconColor: 'text-blue-700',
                },
                {
                  icon: Leaf,
                  title: 'Sustainability',
                  body: 'Every decision we make prioritizes environmental impact. Our products are certified carbon-negative and sourced from sustainable plantations.',
                  color: 'bg-emerald-50',
                  iconColor: 'text-emerald-700',
                },
                {
                  icon: Heart,
                  title: 'Community',
                  body: 'We invest in local farming communities in Bukidnon and Mindanao, ensuring fair wages and sustainable livelihoods throughout our supply chain.',
                  color: 'bg-rose-50',
                  iconColor: 'text-rose-700',
                },
              ].map((item) => (
                <div key={item.title} className="rounded-[2rem] border border-stone-200 bg-stone-50 p-8">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${item.color}`}>
                    <item.icon className={`h-7 w-7 ${item.iconColor}`} />
                  </div>
                  <h3 className="mt-6 text-xl font-bold text-stone-950">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-stone-500">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-18">
          <div className="relative overflow-hidden rounded-[2rem] bg-stone-950 px-8 py-12 text-white shadow-xl lg:px-12 lg:py-16">
            <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-emerald-900/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-emerald-900/20 blur-3xl" />
            <div className="absolute inset-0 opacity-20">
              <Image src="/Bamboo-DIY.png" alt="" fill className="object-cover" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-black/60" />

            <div className="relative grid gap-8 lg:grid-cols-2 lg:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">Work with us</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                  Ready to Source Bamboo Boards for Your Next Project?
                </h2>
                <p className="mt-4 text-base text-white/70">
                  Our team is ready to support your project with samples, specs,
                  quotations, and commercial documentation.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
                <Link
                  href="/request-quote"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-bold text-stone-950 transition hover:-translate-y-0.5 hover:bg-stone-100"
                >
                  Request Quote
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/10"
                >
                  Contact Sales
                </Link>
              </div>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  )
}