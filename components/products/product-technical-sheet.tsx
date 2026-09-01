/**
 * Native technical content for a product, driven by the product data sheet.
 * Keyed by slug so each board can carry its own verified figures. NuWev is
 * populated from the DOST tested TDS (source of truth). Add other slugs as
 * their data sheets are finalised. Renders nothing for products without a
 * sheet, so it is safe to mount on every product page.
 */

type Row = { label: string; value: string }

type Sheet = {
  specs: Row[]
  construction: string[]
  dost: Row[]
  dostNote: string
  dataSheet?: string
  applications: string[]
  comparison: {
    columns: string[]
    rows: { feature: string; values: Array<number | string> }[]
  }
}

const SHEETS: Record<string, Sheet> = {
  nuweave: {
    specs: [
      { label: 'Thickness options', value: '4, 8, 12, 16 and 20 mm' },
      { label: 'Standard width', value: '1220 mm (4 ft)' },
      { label: 'Standard length', value: '2440 mm (8 ft)' },
      { label: 'Density (typical)', value: '800 to 1,000 kg/m3' },
      { label: 'Moisture content', value: '6 to 10%' },
      { label: 'Surface', value: 'Phenolic film, both sides' },
      { label: 'Edge finish', value: 'Sealed edges' },
      { label: 'Adhesive', value: 'Exterior grade phenol formaldehyde (PF)' },
      { label: 'Body', value: 'Woven bamboo mat, 1 to 5 plies (by thickness)' },
      { label: 'Filler', value: 'Bamboo sawdust filling the weave crevices' },
    ],
    construction: [
      'Phenolic film (top)',
      'PF resin layer',
      'Woven bamboo mat (top ply), with bamboo sawdust filling the weave',
      'PF resin layer',
      'Woven bamboo mat (bottom ply), with bamboo sawdust filling the weave',
      'PF resin layer',
      'Phenolic film (bottom)',
    ],
    dost: [
      { label: 'Modulus of elasticity (MOE)', value: '4,210.56 MPa' },
      { label: 'Modulus of rupture (MOR)', value: '89.01 MPa' },
      { label: 'Internal bond strength', value: '1.24 MPa' },
      { label: 'Water absorption (24 hr)', value: '12.7%' },
      { label: 'Thickness swelling', value: '3.2%' },
    ],
    dostNote:
      'Independently tested to ASTM D1037 by the DOST Regional Standards and Testing Laboratory. Results apply to the samples submitted and may vary by configuration, thickness, moisture content and manufacturing lot.',
    dataSheet: '/docs/NuWev-Technical-Data-Sheet.pdf',
    applications: [
      'Interior wall panels',
      'Cabinets and furniture',
      'Concrete formwork',
      'Industrial panels',
      'Packaging and crates',
      'Partitions',
    ],
    comparison: {
      columns: ['NuWev', 'Plywood', 'MDF', 'Particle board', 'Plastic formwork'],
      rows: [
        { feature: 'Strength', values: [5, 4, 2, 2, 3] },
        { feature: 'Moisture resistance', values: [5, 3, 1, 1, 5] },
        { feature: 'Screw holding', values: [5, 4, 2, 2, 2] },
        { feature: 'Surface hardness', values: [5, 3, 3, 2, 4] },
        { feature: 'Reusability (formwork)', values: ['8 to 10 uses', '4 to 5 uses', 'N/A', 'N/A', '50+ uses'] },
        { feature: 'Sustainability', values: [5, 2, 1, 1, 1] },
        { feature: 'Cost efficiency', values: [5, 3, 2, 2, 2] },
      ],
    },
  },
}

function Rating({ score }: { score: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${score} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`inline-block h-1.5 w-1.5 rounded-full ${
            n <= score ? 'bg-[#16361f]' : 'bg-black/12'
          }`}
        />
      ))}
    </span>
  )
}

export default function ProductTechnicalSheet({ slug }: { slug: string | null | undefined }) {
  const sheet = slug ? SHEETS[slug] : undefined
  if (!sheet) return null

  const cardClass = 'rounded-[30px] border border-black/8 bg-white p-6 shadow-sm lg:p-8'

  return (
    <>
      {/* Technical specifications */}
      <div className={cardClass}>
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-foreground">Technical specifications</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Standard sizes, materials and finishes
          </p>
        </div>
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {sheet.specs.map((row) => (
            <div key={row.label} className="flex flex-col border-b border-black/6 pb-3">
              <dt className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {row.label}
              </dt>
              <dd className="mt-1 text-sm font-medium text-foreground">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Construction */}
      <div className={cardClass}>
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-foreground">Construction</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Layers from the top surface down
          </p>
        </div>
        <ol className="space-y-3">
          {sheet.construction.map((layer, index) => (
            <li key={layer} className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#16361f]/8 text-xs font-semibold text-[#16361f]">
                {index + 1}
              </span>
              <p className="text-sm leading-7 text-foreground">{layer}</p>
            </li>
          ))}
        </ol>
      </div>

      {/* DOST tested results */}
      <div className={cardClass}>
        <div className="mb-5">
          <h2 className="text-2xl font-semibold text-foreground">DOST tested results</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Mechanical testing to ASTM D1037
          </p>
        </div>
        <div className="overflow-hidden rounded-[22px] border border-black/8">
          {sheet.dost.map((row, index) => (
            <div
              key={row.label}
              className={`flex items-center justify-between gap-4 px-4 py-3 ${
                index % 2 === 0 ? 'bg-[#faf6ef]' : 'bg-white'
              }`}
            >
              <span className="text-sm text-foreground/80">{row.label}</span>
              <span className="text-sm font-semibold text-foreground">{row.value}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs leading-6 text-muted-foreground">{sheet.dostNote}</p>
        {sheet.dataSheet && (
          <a
            href={sheet.dataSheet}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline underline-offset-4"
          >
            Download technical data sheet (PDF)
          </a>
        )}
      </div>

      {/* Applications */}
      <div className={cardClass}>
        <div className="mb-5">
          <h2 className="text-2xl font-semibold text-foreground">Applications</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {sheet.applications.map((item) => (
            <div key={item} className="flex items-start gap-3">
              <span className="mt-2 inline-block h-2 w-2 shrink-0 rounded-full bg-[#16361f]" />
              <p className="text-sm leading-7 text-foreground">{item}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Comparison */}
      <div className={cardClass}>
        <div className="mb-5">
          <h2 className="text-2xl font-semibold text-foreground">How it compares</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Indicative comparison with common board types
          </p>
        </div>
        <div className="-mx-2 overflow-x-auto px-2">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="border-b border-black/10 py-3 pr-4 text-left font-semibold text-foreground">
                  Feature
                </th>
                {sheet.comparison.columns.map((col, i) => (
                  <th
                    key={col}
                    className={`border-b border-black/10 px-3 py-3 text-left font-semibold ${
                      i === 0 ? 'text-[#16361f]' : 'text-foreground/70'
                    }`}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sheet.comparison.rows.map((row) => (
                <tr key={row.feature}>
                  <td className="border-b border-black/6 py-3 pr-4 text-foreground/80">
                    {row.feature}
                  </td>
                  {row.values.map((value, i) => (
                    <td
                      key={i}
                      className={`border-b border-black/6 px-3 py-3 ${
                        i === 0 ? 'bg-[#faf6ef]/60' : ''
                      }`}
                    >
                      {typeof value === 'number' ? (
                        <Rating score={value} />
                      ) : (
                        <span className="text-foreground/80">{value}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs leading-6 text-muted-foreground">
          Ratings are indicative and shown for general guidance. Actual performance
          depends on grade, thickness and application.
        </p>
      </div>
    </>
  )
}
