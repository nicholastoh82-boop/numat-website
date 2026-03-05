import Header from '@/components/header'
import Footer from '@/components/footer'
import CartDrawer from '@/components/cart-drawer'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Leaf, Award, MapPin, Users, Target, Heart, ArrowRight } from 'lucide-react'

export const metadata = {
  title: 'About Us | NUMAT',
  description: 'Learn about NUMAT and our mission to provide sustainable NuBam engineered bamboo products worldwide.',
}

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <CartDrawer />
      <main className="flex-1">
        {/* Hero */}
        <section className="bg-secondary py-16 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="max-w-3xl">
              <h1 className="font-serif text-4xl sm:text-5xl text-foreground leading-tight">
                Building a Sustainable Future with Bamboo
              </h1>
              <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
                NUMAT is dedicated to bringing premium NuBam engineered bamboo products to the construction 
                and design industry worldwide. We believe in the power of bamboo as a sustainable alternative to traditional materials.
              </p>
            </div>
          </div>
        </section>

        {/* Story */}
        <section className="py-16 lg:py-20 bg-background">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="font-serif text-3xl text-foreground mb-6">Our Story</h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    Founded in Singapore with manufacturing facilities in Cagayan de Oro, Philippines, NUMAT emerged from a simple 
                    observation: the construction industry needed better, more sustainable 
                    materials. Bamboo, with its remarkable strength, rapid growth, and 
                    carbon-negative properties, was the obvious answer.
                  </p>
                  <p>
                    We partnered with local bamboo farmers and invested in state-of-the-art 
                    processing facilities to create premium engineered bamboo products under the NuBam brand 
                    that meet international quality standards while supporting local communities.
                  </p>
                  <p>
                    Today, we serve furniture makers, contractors, architects, and DIY 
                    enthusiasts worldwide, providing them 
                    with materials that are as beautiful as they are sustainable.
                  </p>
                </div>
              </div>
              <div className="bg-muted/50 rounded-2xl p-8 space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Global Presence</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Headquartered in Singapore with manufacturing in Cagayan de Oro, Philippines
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">50+ Local Farmers</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Supporting local communities through fair trade partnerships
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Award className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Wavemaker Impact</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Backed by Southeast Asia&apos;s leading climate-tech investor
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Mission & Values */}
        <section className="py-16 lg:py-20 bg-secondary">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="font-serif text-3xl text-foreground">Our Mission & Values</h2>
              <p className="mt-4 text-muted-foreground">
                Guided by purpose, driven by sustainability
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-card rounded-xl border border-border p-6 text-center">
                <div className="w-14 h-14 rounded-full bg-primary/10 mx-auto flex items-center justify-center mb-4">
                  <Target className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Mission</h3>
                <p className="text-sm text-muted-foreground">
                  To make sustainable bamboo products accessible and affordable for 
                  every builder and creator in the Philippines.
                </p>
              </div>
              <div className="bg-card rounded-xl border border-border p-6 text-center">
                <div className="w-14 h-14 rounded-full bg-primary/10 mx-auto flex items-center justify-center mb-4">
                  <Leaf className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Sustainability</h3>
                <p className="text-sm text-muted-foreground">
                  Every decision we make prioritizes environmental impact. 
                  Our products are certified carbon-negative.
                </p>
              </div>
              <div className="bg-card rounded-xl border border-border p-6 text-center">
                <div className="w-14 h-14 rounded-full bg-primary/10 mx-auto flex items-center justify-center mb-4">
                  <Heart className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Community</h3>
                <p className="text-sm text-muted-foreground">
                  We invest in local farming communities and ensure fair wages 
                  throughout our supply chain.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 lg:py-20 bg-background">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="bg-primary rounded-3xl p-8 sm:p-12 text-center">
              <h2 className="font-serif text-3xl text-primary-foreground mb-4">
                Ready to Build with NuBam?
              </h2>
              <p className="text-primary-foreground/80 max-w-xl mx-auto mb-8">
                Browse our engineered bamboo catalog and get an instant quote delivered to your phone.
              </p>
              <Link href="/products">
                <Button size="lg" variant="secondary" className="gap-2">
                  View Products
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
