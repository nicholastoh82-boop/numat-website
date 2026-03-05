import Header from "@/components/header"
import Footer from "@/components/footer"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms of Service | NUMAT",
  description: "Read the terms and conditions for using NUMAT's products and services.",
}

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-16 max-w-4xl">
          <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-8">Terms of Service</h1>
          <p className="text-muted-foreground mb-8">Last updated: January 2026</p>
          
          <div className="prose prose-lg max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing and using the NUMAT website and services, you accept and agree to be bound 
                by these Terms of Service. If you do not agree to these terms, please do not use our services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">2. Quote Requests</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Quote requests submitted through our website are inquiries only and do not constitute 
                binding orders. Prices and availability are subject to confirmation by our sales team.
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Quotes are valid for 30 days from the date of issuance unless otherwise stated</li>
                <li>Prices are subject to change based on market conditions</li>
                <li>Minimum order quantities may apply for certain products</li>
                <li>Custom specifications may require additional lead time</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">3. Product Information</h2>
              <p className="text-muted-foreground leading-relaxed">
                We strive to provide accurate product descriptions and specifications. However, bamboo 
                is a natural material with inherent variations in color, grain pattern, and dimensions. 
                Minor variations are normal and do not constitute defects.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">4. Orders and Payment</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Once a quote is accepted:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>A deposit may be required to confirm the order</li>
                <li>Payment terms will be specified in the final invoice</li>
                <li>We accept bank transfers and other payment methods as agreed</li>
                <li>Orders are processed upon receipt of required payment</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">5. Delivery</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Delivery terms and conditions:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Delivery times are estimates and not guaranteed</li>
                <li>Shipping costs are calculated based on destination and order size</li>
                <li>Risk of loss passes to buyer upon delivery</li>
                <li>Inspect products upon delivery and report any damage immediately</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">6. Returns and Refunds</h2>
              <p className="text-muted-foreground leading-relaxed">
                Returns are accepted for manufacturing defects only. Claims must be made within 7 days 
                of delivery with photographic evidence. Custom orders are non-refundable. Refunds or 
                replacements will be processed at our discretion after inspection.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">7. Intellectual Property</h2>
              <p className="text-muted-foreground leading-relaxed">
                All content on this website, including text, images, logos, and designs, is the property 
                of NUMAT and is protected by intellectual property laws. Unauthorized use is prohibited.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">8. Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                NUMAT shall not be liable for any indirect, incidental, special, or consequential 
                damages arising from the use of our products or services. Our liability is limited to 
                the value of the products purchased.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">9. Governing Law</h2>
              <p className="text-muted-foreground leading-relaxed">
                These terms are governed by the laws of the Republic of the Philippines. Any disputes 
                shall be resolved in the courts of Makati City, Philippines.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">10. Changes to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to modify these terms at any time. Changes will be effective 
                immediately upon posting on our website. Continued use constitutes acceptance of modified terms.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
