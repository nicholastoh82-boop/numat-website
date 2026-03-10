import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/header'
import Footer from '@/components/footer'
import CartDrawer from '@/components/cart-drawer'

export default function NumatBambooHomepageRevamp() {
  const trustPoints = [
    'FSC-certified materials',
    'Carbon-negative positioning',
    'MOQ from 10 boards',
    'Fast quote turnaround',
    'Export-ready supply',
  ]

  const productFamilies = [
    {
      title: 'Furniture Boards',
      description:
        'For tables, shelving, cabinetry, and custom furniture manufacturing.',
      image: '/Bamboo-Furniture.png',
    },
    {
      title: 'Wall and Ceiling Panels',
      description:
        'For interior surfacing, decorative applications, and architectural finishes.',
      image: '/Bamboo-Wall.png',
    },
    {
      title: 'Doors and Cabinet Components',
      description:
        'For doors, fronts, panels, and interior joinery.',
      image: '/Bamboo-Door.png',
    },
    {
      title: 'Flooring and Interior Surfaces',
      description:
        'For durable interior applications requiring a premium natural finish.',
      image: '/Bamboo-Flooring.png',
    },
    {
      title: 'Construction and Fit-Out Boards',
      description:
        'For selected structural and project-based applications.',
      image: '/Bamboo-Board.png',
    },
  ]

  const valueCards = [
    {
      title: 'Technical-grade boards',
      description:
        'Engineered for furniture, cabinetry, interiors, and fit-out applications with specifications tailored for commercial use.',
    },
    {
      title: 'Verified sustainability',
      description:
        'FSC-certified sourcing and carbon-conscious production to support lower-impact material selection.',
    },
    {
      title: 'Flexible order support',
      description:
        'Suitable for both project-based requirements and ongoing production needs, with MOQ from 10 boards.',
    },
    {
      title: 'Fast commercial response',
      description:
        'Clear quotation support, product guidance, and export-ready coordination for serious buyers.',
    },
  ]

  const resourceLinks = [
    'Technical Data Sheets',
    'Dimensions and thicknesses',
    'Finishes and applications',
    'Certifications',
    'Installation and care guidance',
  ]

  const applications = [
    'Furniture manufacturing',
    'Cabinetry and joinery',
    'Hospitality interiors',
    'Residential fit-outs',
    'Retail and commercial spaces',
    'Architectural detailing',
  ]

  const credibilityItems = [
    'Manufacturing photos and process visuals',
    'Packaging, pallet, and shipment readiness',
    'Sample kit presentation',
    'Client, partner, or project logos',
    'Export market coverage',
    'Response-time commitment for buyer inquiries',
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <CartDrawer />

      <main className="flex-1 bg-stone-50 text-stone-900">
        <section className="border-b border-stone-200 bg-white">
          <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 lg:grid-cols-2 lg:px-8 lg:py-24">
            <div className="flex flex-col justify-center">
              <div className="mb-4 inline-flex w-fit rounded-full border border-emerald-700/20 bg-emerald-700/5 px-3 py-1 text-sm font-medium text-emerald-800">
                Engineered bamboo boards for commercial use
              </div>

              <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl lg:text-6xl">
                Engineered Bamboo Boards for Commercial Projects and Manufacturing
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-stone-700">
                FSC-certified bamboo boards for furniture, interiors, cabinetry,
                fit-outs, and architectural applications — backed by technical
                documentation, fast quotation support, and export-ready supply.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href="/request-quote"
                  className="inline-flex items-center justify-center rounded-2xl bg-stone-950 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                >
                  Request Quote
                </Link>

                <Link
                  href="/request-samples"
                  className="inline-flex items-center justify-center rounded-2xl border border-stone-300 bg-white px-6 py-3 text-sm font-semibold text-stone-900 transition hover:bg-stone-100"
                >
                  Order Samples
                </Link>

                <Link
                  href="/technical-resources"
                  className="inline-flex items-center justify-center rounded-2xl border border-emerald-700/20 bg-emerald-700/5 px-6 py-3 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-700/10"
                >
                  View Certifications
                </Link>
              </div>

              <p className="mt-4 text-sm text-stone-600">
                Available in multiple thicknesses for commercial, manufacturing,
                and project use.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <span className="rounded-full border border-stone-200 bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">
                  Technical data available
                </span>
                <span className="rounded-full border border-stone-200 bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">
                  Certification support
                </span>
                <span className="rounded-full border border-stone-200 bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">
                  Buyer documentation
                </span>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-3xl border border-stone-200 bg-stone-200 p-4 shadow-sm">
                <div className="relative h-72 overflow-hidden rounded-2xl">
                  <Image
                    src="/Bamboo-DIY.png"
                    alt="Engineered bamboo boards for commercial applications"
                    fill
                    priority
                    className="object-cover object-center"
                  />
                  <div className="absolute inset-0 bg-black/10" />
                  <div className="absolute bottom-6 left-6 rounded-2xl bg-white/92 p-4 shadow-lg backdrop-blur">
                    <p className="text-sm font-medium text-stone-700">
                      Procurement-ready support
                    </p>
                    <p className="mt-1 text-xl font-semibold text-stone-950">
                      Specs, samples, and fast quotations
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
                  <p className="text-sm font-medium text-stone-600">Use cases</p>
                  <p className="mt-2 text-lg font-semibold text-stone-950">
                    Furniture, interiors, doors, fit-outs
                  </p>
                </div>

                <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
                  <p className="text-sm font-medium text-stone-600">
                    Commercial support
                  </p>
                  <p className="mt-2 text-lg font-semibold text-stone-950">
                    Export-ready coordination and buyer documentation
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-stone-200 bg-stone-950 text-white">
          <div className="mx-auto max-w-7xl px-6 py-5 lg:px-8">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {trustPoints.map((point) => (
                <div
                  key={point}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium"
                >
                  {point}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-24">
  <div className="max-w-3xl">
    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-800">
      Testing & performance
    </p>
    <h2 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
      DOST Testing Results Compared with Typical Plywood
    </h2>
    <p className="mt-4 text-lg leading-8 text-stone-700">
      NUMAT engineered bamboo boards have undergone ASTM D1037 mechanical
      testing. The table below compares the tested bamboo range against typical
      plywood reference values to help buyers evaluate structural and commercial
      suitability.
    </p>
  </div>

  <div className="mt-10 overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
    <div className="border-b border-stone-200 bg-stone-950 px-6 py-5 text-white">
      <h3 className="text-xl font-semibold">Mechanical Performance Comparison</h3>
      <p className="mt-1 text-sm text-stone-300">
        ASTM D1037 / DOST test results versus common plywood reference ranges.
      </p>
    </div>

    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead className="bg-stone-100">
          <tr>
            <th className="border-b border-stone-200 px-6 py-4 text-left text-sm font-semibold text-stone-900">
              Metric
            </th>
            <th className="border-b border-stone-200 px-6 py-4 text-left text-sm font-semibold text-stone-900">
              NUMAT Engineered Bamboo
            </th>
            <th className="border-b border-stone-200 px-6 py-4 text-left text-sm font-semibold text-stone-900">
              Typical Plywood
            </th>
            <th className="border-b border-stone-200 px-6 py-4 text-left text-sm font-semibold text-stone-900">
              Commercial Reading
            </th>
          </tr>
        </thead>

        <tbody>
          <tr className="align-top">
            <td className="border-b border-stone-200 px-6 py-5 text-sm font-medium text-stone-900">
              MOR
            </td>
            <td className="border-b border-stone-200 px-6 py-5 text-sm text-stone-700">
              22.77–69.44 MPa
            </td>
            <td className="border-b border-stone-200 px-6 py-5 text-sm text-stone-700">
              ~30–60 MPa
            </td>
            <td className="border-b border-stone-200 px-6 py-5 text-sm leading-7 text-stone-700">
              Bending strength range shows NUMAT can compete with or exceed
              typical plywood depending on configuration.
            </td>
          </tr>

          <tr className="align-top bg-stone-50/70">
            <td className="border-b border-stone-200 px-6 py-5 text-sm font-medium text-stone-900">
              MOE
            </td>
            <td className="border-b border-stone-200 px-6 py-5 text-sm text-stone-700">
              2211.82–10256.71 MPa
            </td>
            <td className="border-b border-stone-200 px-6 py-5 text-sm text-stone-700">
              ~4000–9000 MPa
            </td>
            <td className="border-b border-stone-200 px-6 py-5 text-sm leading-7 text-stone-700">
              Stiffness varies by sample and configuration, with upper-end
              results outperforming typical plywood references.
            </td>
          </tr>

          <tr className="align-top">
            <td className="border-b border-stone-200 px-6 py-5 text-sm font-medium text-stone-900">
              Compression Strength
            </td>
            <td className="border-b border-stone-200 px-6 py-5 text-sm text-stone-700">
              25.19–30.46 MPa
            </td>
            <td className="border-b border-stone-200 px-6 py-5 text-sm text-stone-700">
              ~20–35 MPa
            </td>
            <td className="border-b border-stone-200 px-6 py-5 text-sm leading-7 text-stone-700">
              Compressive performance is within the range expected for commercial
              plywood boards.
            </td>
          </tr>

          <tr className="align-top bg-stone-50/70">
            <td className="px-6 py-5 text-sm font-medium text-stone-900">
              Hardness
            </td>
            <td className="px-6 py-5 text-sm text-stone-700">
              3918.33–7377.33 N
            </td>
            <td className="px-6 py-5 text-sm text-stone-700">
              Typically lower and more variable
            </td>
            <td className="px-6 py-5 text-sm leading-7 text-stone-700">
              Useful for surface durability and wear resistance in interior and
              exposed applications.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <div className="mt-6 rounded-3xl border border-stone-200 bg-stone-50 p-6">
  <p className="text-sm leading-7 text-stone-700">
    Results apply to the specific samples submitted for testing and are shown
    as reference values. Actual performance may vary depending on thickness,
    configuration, moisture content, ply arrangement, and manufacturing lot.
  </p>

  <div className="mt-4 flex flex-wrap gap-3">
    <Link
      href="/testing"
      className="inline-flex items-center justify-center rounded-2xl bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
    >
      View Full Testing Page
    </Link>

    <Link
      href="/contact"
      className="inline-flex items-center justify-center rounded-2xl border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-900 transition hover:bg-stone-100"
    >
      Contact Sales for Full Results
    </Link>
    </div>
  </div>
</section>

        <section className="border-y border-stone-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-24">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-800">
                  Product families
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
                  Explore Product Families
                </h2>
                <p className="mt-4 text-lg leading-8 text-stone-700">
                  Browse engineered bamboo boards by end use and application.
                </p>
              </div>

              <Link
                href="/products"
                className="inline-flex items-center justify-center rounded-2xl border border-stone-300 bg-stone-100 px-5 py-3 text-sm font-semibold text-stone-900 transition hover:bg-stone-200"
              >
                View All Products
              </Link>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {productFamilies.map((item, index) => (
                <div
                  key={item.title}
                  className="overflow-hidden rounded-3xl border border-stone-200 bg-stone-50 shadow-sm"
                >
                  <div className="relative h-48">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div className="p-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                      0{index + 1}
                    </p>

                    <h3 className="mt-2 text-xl font-semibold text-stone-950">
                      {item.title}
                    </h3>

                    <p className="mt-3 text-sm leading-7 text-stone-700">
                      {item.description}
                    </p>

                    <Link
                      href="/products"
                      className="mt-5 inline-flex text-sm font-semibold text-emerald-800"
                    >
                      View Products →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-800">
                Technical resources
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
                Technical Information for Buyers
              </h2>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-stone-700">
                Get the documents and specifications you need before requesting a
                quote.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/technical-resources"
                  className="inline-flex items-center justify-center rounded-2xl bg-stone-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                >
                  Download Specs
                </Link>

                <Link
                  href="/technical-resources"
                  className="inline-flex items-center justify-center rounded-2xl border border-emerald-700/20 bg-emerald-700/5 px-5 py-3 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-700/10"
                >
                  Certifications
                </Link>

                <Link
                  href="/request-samples"
                  className="inline-flex items-center justify-center rounded-2xl border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-900 transition hover:bg-stone-100"
                >
                  Request Samples
                </Link>
              </div>
            </div>

            <div className="grid gap-4">
              {resourceLinks.map((resource) => (
                <div
                  key={resource}
                  className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm"
                >
                  <p className="text-base font-semibold text-stone-950">
                    {resource}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-stone-200 bg-stone-100">
          <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-24">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-800">
                Applications
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
                Built for Real-World Applications
              </h2>
              <p className="mt-4 text-lg leading-8 text-stone-700">
                From interiors to production environments, Numat boards are
                designed for practical use across commercial and design-led
                projects.
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {applications.map((application) => (
                <div
                  key={application}
                  className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm"
                >
                  <p className="text-lg font-semibold text-stone-950">
                    {application}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-2">
            <div className="rounded-[2rem] border border-emerald-900/10 bg-emerald-900 p-8 text-white shadow-sm lg:p-10">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-200">
                ESG
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Sustainability That Supports Procurement Goals
              </h2>
              <p className="mt-4 text-lg leading-8 text-emerald-50/90">
                Numat’s sustainability story is designed to do more than inspire.
                It helps buyers source materials aligned with responsible
                procurement, green building goals, and lower-impact project
                requirements.
              </p>

              <Link
                href="/esg"
                className="mt-8 inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50"
              >
                View ESG Details
              </Link>
            </div>

            <div className="grid gap-4">
              {[
                'FSC-certified sourcing',
                'Carbon-negative positioning',
                'Lifecycle-based methodology',
                'Documentation available for review',
              ].map((point) => (
                <div
                  key={point}
                  className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm"
                >
                  <p className="text-lg font-semibold text-stone-950">{point}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-stone-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-24">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-800">
                Operational credibility
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
                Built to Support Commercial Buyers
              </h2>
              <p className="mt-4 text-lg leading-8 text-stone-700">
                Numat supports buyers with product guidance, documentation, and
                practical commercial coordination from inquiry to shipment.
              </p>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {credibilityItems.map((item) => (
                <div
                  key={item}
                  className="rounded-3xl border border-stone-200 bg-stone-50 p-6 shadow-sm"
                >
                  <p className="text-base font-semibold text-stone-950">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-24">
          <div className="rounded-[2rem] bg-stone-950 px-8 py-12 text-white shadow-sm lg:px-12 lg:py-16">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
                Next step
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Ready to Source Bamboo Boards for Your Next Project or Production Run?
              </h2>
              <p className="mt-4 text-lg leading-8 text-stone-300">
                Talk to our team about specifications, availability, sampling, and
                commercial quotations.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/request-quote"
                  className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-stone-950 transition hover:bg-stone-100"
                >
                  Request Quote
                </Link>

                <Link
                  href="/request-samples"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Order Samples
                </Link>

                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
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