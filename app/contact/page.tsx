import Header from '@/components/header'
import Footer from '@/components/footer'
import CartDrawer from '@/components/cart-drawer'
import { ContactForm } from '@/components/contact-form'
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  MessageCircle,
} from 'lucide-react'

export const metadata = {
  title: 'Contact Sales — Get a Quote or Request Samples',
  description: 'Contact NUMAT for product enquiries, quotes, and technical support. WhatsApp and email support for commercial buyers across Southeast Asia and internationally.',
  openGraph: {
    title: 'Contact NUMAT Bamboo Sales',
    description: 'Get a quote, request samples, or talk to our technical team. Fast response for commercial buyers.',
    url: 'https://numatbamboo.com/contact',
  },
}

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <CartDrawer />
      <main className="flex-1">
        {/* Hero */}
        <section className="bg-secondary py-12 lg:py-16">
          <div className="mx-auto max-w-7xl px-4 lg:px-8 text-center">
            <h1 className="font-serif text-4xl text-foreground">Contact Us</h1>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              Have questions about our products? Need a custom quote? 
              We are here to help.
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="py-12 lg:py-16 bg-background">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12">
              {/* Contact info */}
              <div>
                <h2 className="font-serif text-2xl text-foreground mb-6">Get in Touch</h2>
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Headquarters</h3>
                      <p className="text-muted-foreground mt-1">
                        Singapore
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Manufacturing Facility</h3>
                      <p className="text-muted-foreground mt-1">
                        Cagayan de Oro City<br />
                        Misamis Oriental, Philippines
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Phone className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Phone</h3>
                      <p className="text-muted-foreground mt-1">
                        +60 16-295 8983
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Email</h3>
                      <p className="text-muted-foreground mt-1">
                        sales@numat.ph
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Business Hours</h3>
                      <p className="text-muted-foreground mt-1">
                        Monday - Friday: 8:00 AM - 5:00 PM<br />
                        Saturday: 8:00 AM - 12:00 PM
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Facebook</h3>
                      <a
                        href="https://www.facebook.com/NuMatPH/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground mt-1 block hover:text-primary transition-colors"
                      >
                        facebook.com/NuMatPH
                      </a>
                    </div>
                  </div>
                </div>

                {/* Quick contact */}
                <div className="mt-8 p-6 bg-primary/5 rounded-xl border border-primary/20">
                  <div className="flex items-center gap-3 mb-3">
                    <MessageCircle className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-foreground">Sales and Procurement Support</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Talk to our team about technical documentation, product suitability, sampling, pricing, and export coordination.
                  </p>
                  <a 
                    href="/products"
                    className="inline-flex items-center gap-2 text-primary font-medium text-sm hover:underline underline-offset-4"
                  >
                    Browse Products & Get Quote
                  </a>
                </div>
              </div>

              {/* Contact form */}
              <div className="bg-card border border-border rounded-xl p-6 lg:p-8">
                <h2 className="font-serif text-2xl text-foreground mb-6">Send a Message</h2>
                <ContactForm />
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
