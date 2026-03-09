import Header from '@/components/header'
import Footer from '@/components/footer'
import CartDrawer from '@/components/cart-drawer'
import { HeroSection } from '@/components/home/hero-section'
import { ApplicationsSection } from '@/components/home/applications-section'
import { FeaturesSection } from '@/components/home/features-section'
import { ESGCallout } from '@/components/home/esg-callout'
import { CTASection } from '@/components/home/cta-section'

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <CartDrawer />
      <main className="flex-1">
        <HeroSection />
        <ApplicationsSection />
        <FeaturesSection />
        <ESGCallout />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}