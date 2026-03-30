import Header from '@/components/header'
import Footer from '@/components/footer'
import CartDrawer from '@/components/cart-drawer'
import Link from 'next/link'

export const metadata = {
  title: 'FAQ — Frequently Asked Questions | NUMAT Bamboo',
  description: 'Answers to common questions about NUMAT engineered bamboo products, ordering, lead times, samples, and technical specifications.',
  openGraph: {
    title: 'FAQ | NUMAT Bamboo',
    description: 'Common questions about NUMAT engineered bamboo — products, MOQ, lead times, samples, and more.',
    url: 'https://numatbamboo.com/faq',
  },
}

const faqs = [
  {
    question: 'What is NUMAT engineered bamboo?',
    answer:
      'NUMAT engineered bamboo is a high-performance structural and interior material made from compressed bamboo strands. It delivers superior strength, dimensional stability, and a consistent finish compared to traditional timber — while being sourced from fast-growing, renewable bamboo cultivated in the Philippines.',
  },
  {
    question: 'What products does NUMAT offer?',
    answer:
      'NUMAT offers five product lines: NuBam Boards (structural and furniture panels), NuDoor (interior door blanks), NuFloor (flooring planks), NuWall (wall cladding panels), and NuSlat (decorative feature wall slats). Each product is available in a range of specifications to suit different applications and project scales.',
  },
  {
    question: 'What is the minimum order quantity (MOQ)?',
    answer:
      'MOQs vary by product line. NuBam Boards, NuWall, and NuSlat start from 20 sheets or pieces per order. NuFloor is ordered in multiples of 20 planks. Exact MOQs are displayed on each product page. Contact our sales team if you need smaller quantities for trials or prototyping.',
  },
  {
    question: 'How do I request a quote?',
    answer:
      'Add your required products to your quote list directly on our website, then complete the quote form with your contact details. You can choose to receive your formal quotation by email (PDF) or over WhatsApp. Our team responds within 24 hours on business days.',
  },
  {
    question: 'Do you offer product samples?',
    answer:
      'Yes. We offer 200 × 200 mm sample panels at no charge so you can evaluate finish, colour, and quality before committing to a full order. You can request samples through our website. Samples are shipped from our facility in Cagayan de Oro City, Philippines.',
  },
  {
    question: 'What are the production and lead times?',
    answer:
      'Standard production lead time is 10 working days from order confirmation and receipt of the 50% deposit. Custom sizes or specialty finishes may require additional lead time. Shipping transit time to your port of destination is quoted separately.',
  },
  {
    question: 'What countries do you export to?',
    answer:
      'NUMAT supplies commercial buyers across Southeast Asia, East Asia, the Middle East, and internationally. We are export-ready with established experience coordinating sea freight. Contact our team for freight, customs documentation, and logistics support for your region.',
  },
  {
    question: 'What testing and certifications do your products have?',
    answer:
      'NUMAT products have been independently tested by DOST RSTL Region X under ASTM D1037 for static bending (MOR and MOE), compression parallel to face, and hardness. Test results cover the actual value ranges across samples — not cherry-picked best-case figures. Full results are available on our Certifications page and as a downloadable PDF.',
  },
  {
    question: 'Are NUMAT products suitable for exterior or wet applications?',
    answer:
      'NUMAT products are engineered primarily for interior applications including furniture, cabinetry, wall systems, doors, and flooring. They are not rated for fully exposed exterior or submerged wet environments. If your project involves high-humidity or semi-exposed conditions, please consult our technical team to confirm suitability.',
  },
  {
    question: 'What are the payment terms?',
    answer:
      'Standard payment terms are 50% deposit upon order confirmation, with the balance due prior to shipment. Payment terms, currency, and bank details are confirmed in the formal quotation. We accept international bank transfer (TT) in USD or your agreed local currency equivalent.',
  },
]

export default function FaqPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <CartDrawer />
      <main className="flex-1">
        {/* Hero */}
        <section className="bg-secondary py-12 lg:py-16">
          <div className="mx-auto max-w-7xl px-4 lg:px-8 text-center">
            <h1 className="font-serif text-4xl text-foreground">Frequently Asked Questions</h1>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              Common questions about NUMAT products, ordering, and technical specifications.
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
