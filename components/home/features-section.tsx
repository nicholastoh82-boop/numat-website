import { MessageCircle, Clock, Percent, Shield, Leaf, FileText } from 'lucide-react'

const features = [
  {
    icon: MessageCircle,
    title: 'Instant WhatsApp Quotes',
    description: 'Get your quote delivered directly to WhatsApp or Viber within seconds of submission.',
  },
  {
    icon: Clock,
    title: '10-Day Lead Time',
    description: 'Fast production and delivery from our factory in CDO. Quote validity: 14 days.',
  },
  {
    icon: Percent,
    title: 'Bulk Discounts',
    description: 'Order 100+ boards and receive an automatic 15% discount on your entire order.',
  },
  {
    icon: Shield,
    title: 'Quality Assured',
    description: 'Every board meets international standards for density, moisture, and structural integrity.',
  },
  {
    icon: Leaf,
    title: 'Carbon Negative',
    description: 'Our bamboo products sequester more carbon than they emit throughout their lifecycle.',
  },
  {
    icon: FileText,
    title: 'Professional Documentation',
    description: 'Receive detailed PDF quotes with full specifications, ready for your records.',
  },
]

export function FeaturesSection() {
  return (
    <section className="py-20 bg-background">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="font-serif text-3xl sm:text-4xl text-foreground">
            Why Choose NUMAT
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            We make sourcing premium bamboo simple, fast, and sustainable.
          </p>
        </div>

        {/* Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className="flex gap-4"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
