import Header from "@/components/header"
import Footer from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Truck, Package, Clock, MapPin, AlertCircle, CheckCircle } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Shipping & Delivery | NUMAT",
  description: "Learn about NUMAT's shipping options, delivery times, and policies worldwide.",
}

export default function ShippingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-16 max-w-4xl">
          <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">Shipping & Delivery</h1>
          <p className="text-lg text-muted-foreground mb-12">
            We deliver premium bamboo products throughout the Philippines and internationally.
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <Card className="border-border">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                    <MapPin className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Metro Manila</h3>
                    <p className="text-muted-foreground text-sm">3-5 business days</p>
                    <p className="text-muted-foreground text-sm">Free delivery for orders over PHP 50,000</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                    <Truck className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Luzon (Outside NCR)</h3>
                    <p className="text-muted-foreground text-sm">5-7 business days</p>
                    <p className="text-muted-foreground text-sm">Shipping calculated at checkout</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                    <Package className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Visayas & Mindanao</h3>
                    <p className="text-muted-foreground text-sm">7-14 business days</p>
                    <p className="text-muted-foreground text-sm">Via sea freight or air cargo</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                    <Clock className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">International</h3>
                    <p className="text-muted-foreground text-sm">14-30 business days</p>
                    <p className="text-muted-foreground text-sm">Contact us for custom quotes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">How It Works</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium shrink-0">1</div>
                  <div>
                    <h4 className="font-medium text-foreground">Request a Quote</h4>
                    <p className="text-muted-foreground">Submit your product requirements through our quote system</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium shrink-0">2</div>
                  <div>
                    <h4 className="font-medium text-foreground">Receive Your Quote</h4>
                    <p className="text-muted-foreground">Get detailed pricing including shipping via WhatsApp, Viber, or Email</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium shrink-0">3</div>
                  <div>
                    <h4 className="font-medium text-foreground">Confirm & Pay</h4>
                    <p className="text-muted-foreground">Accept the quote and submit required deposit</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium shrink-0">4</div>
                  <div>
                    <h4 className="font-medium text-foreground">Track & Receive</h4>
                    <p className="text-muted-foreground">Track your order and receive delivery at your location</p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Important Information</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <p className="text-foreground text-sm">All products are carefully packaged to prevent damage during transit</p>
                </div>
                <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <p className="text-foreground text-sm">Large orders may require special handling and extended lead times</p>
                </div>
                <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <p className="text-foreground text-sm">We coordinate delivery times for commercial orders</p>
                </div>
                <div className="flex items-start gap-3 p-4 bg-secondary rounded-lg">
                  <AlertCircle className="w-5 h-5 text-foreground mt-0.5 shrink-0" />
                  <p className="text-foreground text-sm">Please inspect all products upon delivery and report any damage within 24 hours</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Questions?</h2>
              <p className="text-muted-foreground">
                For shipping inquiries or special delivery requirements, contact our team at{" "}
                <a href="mailto:sales@numat.ph" className="text-primary hover:underline">
                  sales@numat.ph
                </a>{" "}
                or call us at +60 16-295 8983.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
