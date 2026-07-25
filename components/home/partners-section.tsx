/* eslint-disable @next/next/no-img-element */

/**
 * Partnerships band, mirroring the Partnerships and Investor blocks in
 * Brochure Rev 1. Logo provenance:
 * - adb.svg, gcash.svg, dti.svg, da.svg: official marks from Wikimedia
 *   Commons originals.
 * - dost.png: official DOST seal, Wikimedia Commons original.
 * - pbidc.png: high resolution cut from Brochure Rev 1, cropped to the mark
 *   and flattened to white (PBIDC has no standalone site).
 * Dignity Through Identity and Wavemaker Impact are intentionally not shown as
 * logo images: the brochure is a flattened export so a clean cut is not
 * possible, and neither has a usable web source (the Wavemaker sites serve a
 * JS shell, BQ has no findable web presence). Wavemaker appears as a wordmark
 * below; add a Dignity Through Identity file to PARTNERS when the partner
 * supplies one.
 */

const PARTNERS = [
  { src: '/partners/adb.svg', name: 'Asian Development Bank' },
  { src: '/partners/gcash.svg', name: 'GCash' },
  { src: '/partners/dti.svg', name: 'Department of Trade and Industry' },
  { src: '/partners/dost.png', name: 'Department of Science and Technology' },
  { src: '/partners/da.svg', name: 'Department of Agriculture' },
  { src: '/partners/pbidc.png', name: 'Philippine Bamboo Industry Development Council' },
]

export default function PartnersSection() {
  return (
    <section className="border-t border-stone-200 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-800">
          Partnerships
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-stone-950 sm:text-3xl">
          Powered by partnerships. Built for the future.
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone-600">
          We work with national agencies, development institutions, and industry
          bodies building the Philippine bamboo value chain, from farm programs
          to industrial standards.
        </p>

        <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
          {PARTNERS.map((partner) => (
            <div
              key={partner.name}
              className="flex flex-col items-center justify-end gap-3 text-center"
            >
              <div className="flex h-24 w-full items-center justify-center rounded-2xl border border-stone-200 bg-white px-5 py-4">
                <img
                  src={partner.src}
                  alt={partner.name}
                  loading="lazy"
                  className="max-h-14 w-auto max-w-[150px] object-contain"
                />
              </div>
              <span className="text-xs font-medium leading-snug text-stone-600">
                {partner.name}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start gap-5 rounded-2xl border border-stone-200 bg-stone-50 p-6 sm:flex-row sm:items-center sm:gap-8">
          <div className="flex shrink-0 items-center justify-center rounded-2xl border border-stone-200 bg-white px-6 py-4">
            <span className="text-lg font-bold tracking-tight text-stone-900">
              Wavemaker <span className="text-emerald-700">Impact</span>
            </span>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-800">
              Investor
            </p>
            <p className="mt-1 text-sm leading-relaxed text-stone-700">
              Backed by Wavemaker Impact, catalyzing inclusive and sustainable
              enterprise growth across Southeast Asia.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
