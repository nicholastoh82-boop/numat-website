import Header from '@/components/header'
import Footer from '@/components/footer'
import CartDrawer from '@/components/cart-drawer'
import Link from 'next/link'

export const metadata = {
  title: 'FAQ: Frequently Asked Questions | NuMat Bamboo',
  description: 'Answers to common questions about NuMat engineered bamboo products, ordering, lead times, pricing, and technical specifications.',
  alternates: { canonical: 'https://numatbamboo.com/faq' },
  openGraph: {
    title: 'FAQ | NuMat Bamboo',
    description: 'Common questions about NuMat engineered bamboo: products, MOQ, lead times, pricing, and more.',
    url: 'https://numatbamboo.com/faq',
  },
}

const faqs = [
  {
    question: 'What is NuMat engineered bamboo?',
    answer:
      'NuMat engineered bamboo is a high performance board made from bamboo bonded under high heat and high pressure. It delivers strength, dimensional stability, and a consistent finish next to traditional timber, while being sourced from fast growing, renewable bamboo grown in the Philippines and manufactured at our factory in Manolo Fortich, Bukidnon.',
  },
  {
    question: 'What products does NuMat Bamboo offer?',
    answer:
      'NuMat Bamboo supplies three engineered bamboo boards, all in the standard 2440 mm x 1220 mm (4 by 8 ft) panel size across a range of thicknesses. NuWeave, a woven bamboo board for concrete formwork and interior finishing, from PHP 1,000. NuHybrid, a bamboo composite panel and MDF substitute for furniture and cabinetry, from PHP 3,500. NuBam CLB, a cross laminated bamboo board for structural and architectural use, from PHP 2,300. Prices are ex factory and exclude shipping. See each product page for the full thickness and price list.',
  },
  {
    question: 'What is the difference between NuWeave, NuHybrid, and NuBam CLB?',
    answer:
      'All three share the standard 2440 mm x 1220 mm (4 by 8 ft) panel size and come in a range of thicknesses. The difference is construction and use. NuWeave is woven bamboo mats pressed under heat and pressure, and does two jobs: concrete formwork across repeated pours, and interior finishing where you want the weave visible in the face. NuHybrid is built around a woven bamboo mat with bamboo sawdust filling the weave, a smooth and machinable MDF substitute for furniture and cabinetry. NuBam CLB is cross laminated for structural integrity and architectural surfaces such as wall cladding, with a standard horizontal range and a customized range that adds vertical layers for directional strength.',
  },
  {
    question: 'What is the minimum order quantity (MOQ)?',
    answer:
      'The minimum order is 10 panels per product. For bulk, container, or recurring supply pricing, contact our sales team.',
  },
  {
    question: 'How do I request a quote?',
    answer:
      'Add your required products to your quote list directly on our website, then complete the quote form with your contact details. You can choose to receive your formal quotation by email as a PDF or over WhatsApp. Our team responds within 24 hours on business days.',
  },
  {
    question: 'Do you offer free product samples?',
    answer:
      'We no longer provide free samples. To evaluate the boards, place a minimum order of the product you want to test and request a quote through our website. The minimum order is 10 panels. That way you assess the actual board you would buy, at full size and finish, rather than a small offcut.',
  },
  {
    question: 'Can NuWeave be used for concrete formwork and wet conditions?',
    answer:
      'Yes. NuWeave is built for concrete formwork. The interwoven mats spread load across the whole sheet, so the board holds its line across repeated pours where conventional substrates start to bulge. On a site running both side by side, NuWeave reached 8 to 10 pours against 4 to 5 for marine plywood. It is used for wall, column, slab, and beam forming. For NuHybrid and NuBam CLB, which are intended for furniture, cabinetry, and interior or architectural surfaces, please consult our technical team to confirm suitability for high humidity or exposed conditions.',
  },
  {
    question: 'What are the production and lead times?',
    answer:
      'Standard production lead time is 10 working days from order confirmation and receipt of the 50 percent deposit. Custom sizes or specialty finishes may require additional lead time. Shipping transit time to your port of destination is quoted separately.',
  },
  {
    question: 'What countries do you export to?',
    answer:
      'NuMat Bamboo supplies commercial buyers across Southeast Asia, East Asia, the Middle East, and internationally. We are export ready with established experience coordinating sea freight. Contact our team for freight, customs documentation, and logistics support for your region.',
  },
  {
    question: 'What testing have your products undergone?',
    answer:
      'NuMat engineered bamboo has been independently tested by DOST RSTL Region X under ASTM D1037 for static bending, covering modulus of rupture and modulus of elasticity, along with compression parallel to face and hardness. Results cover the actual value ranges across samples rather than best case figures. Full results are available on our Certifications page and as a downloadable PDF.',
  },
  {
    question: 'What are the payment terms?',
    answer:
      'Standard payment terms are 50 percent deposit upon order confirmation, with the balance due prior to shipment. Payment terms, currency, and bank details are confirmed in the formal quotation. We accept international bank transfer in USD or your agreed local currency equivalent.',
  },
]

export default function FaqPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <CartDrawer />
      <main className="flex-1">
        {/* FAQPage structured data, generated to match the visible answers
            above one to one. Lets search engines and AI engines extract each
            question and answer cleanly for rich results and AI overviews. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: faqs.map((f) => ({
                '@type': 'Question',
                name: f.question,
                acceptedAnswer: { '@type': 'Answer', text: f.answer },
              })),
            }),
          }}
        />
        {/* Hero */}
        <section className="bg-secondary py-12 lg:py-16">
          <div className="mx-auto max-w-7xl px-4 lg:px-8 text-center">
            <h1 className="font-serif text-4xl text-foreground">Frequently Asked Questions</h1>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              Common questions about NuMat Bamboo products, ordering, and technical specifications.
            </p>
          </div>
        </section>

        {/* FAQ list */}
        <section className="py-12 lg:py-16 bg-background">
          <div className="mx-auto max-w-3xl px-4 lg:px-8">
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-border bg-card p-6"
                >
                  <h2 className="text-base font-semibold text-foreground">
                    {faq.question}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="mt-12 rounded-2xl border border-primary/20 bg-primary/5 p-8 text-center">
              <h2 className="font-serif text-xl text-foreground">Still have questions?</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Our sales team is happy to help with technical queries, pricing, and project-specific requirements.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center rounded-full bg-[#16361f] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#204a2b]"
                >
                  Contact Sales
                </Link>
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-semibold text-stone-800 transition hover:bg-stone-50"
                >
                  Browse Products
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
