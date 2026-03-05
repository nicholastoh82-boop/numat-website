import type { Metadata } from 'next'
import Header from '@/components/header'
import Footer from '@/components/footer'

export const metadata: Metadata = {
  title: 'Cookie Policy | NUMAT',
  description: 'Learn about how NUMAT uses cookies and similar technologies on our website.',
}

export default function CookiesPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-4xl px-4 py-12 lg:px-8 lg:py-16">
          <h1 className="font-serif text-3xl sm:text-4xl text-foreground mb-8">
            Cookie Policy
          </h1>
          
          <div className="prose prose-neutral max-w-none">
            <p className="text-muted-foreground mb-6">
              Last updated: January 2026
            </p>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">What Are Cookies</h2>
              <p className="text-muted-foreground mb-4">
                Cookies are small text files that are stored on your computer or mobile device when you visit our website. They help us make our site work properly, make it more secure, provide a better user experience, and understand how the site is used.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">How We Use Cookies</h2>
              <p className="text-muted-foreground mb-4">
                NUMAT uses cookies for the following purposes:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
                <li><strong className="text-foreground">Essential Cookies:</strong> Required for the website to function properly, including maintaining your session and shopping cart.</li>
                <li><strong className="text-foreground">Functional Cookies:</strong> Remember your preferences and settings to enhance your experience.</li>
                <li><strong className="text-foreground">Analytics Cookies:</strong> Help us understand how visitors interact with our website so we can improve it.</li>
                <li><strong className="text-foreground">Marketing Cookies:</strong> Used to track visitors across websites to display relevant advertisements.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">Types of Cookies We Use</h2>
              
              <div className="bg-card rounded-lg border border-border p-6 mb-4">
                <h3 className="font-medium text-foreground mb-2">Strictly Necessary Cookies</h3>
                <p className="text-muted-foreground text-sm mb-2">
                  These cookies are essential for you to browse the website and use its features. Without these cookies, services like shopping carts and quote requests cannot be provided.
                </p>
                <p className="text-xs text-muted-foreground">Duration: Session</p>
              </div>

              <div className="bg-card rounded-lg border border-border p-6 mb-4">
                <h3 className="font-medium text-foreground mb-2">Performance Cookies</h3>
                <p className="text-muted-foreground text-sm mb-2">
                  These cookies collect information about how you use our website, such as which pages you visit most often. This data helps us optimize our website and improve your experience.
                </p>
                <p className="text-xs text-muted-foreground">Duration: Up to 2 years</p>
              </div>

              <div className="bg-card rounded-lg border border-border p-6 mb-4">
                <h3 className="font-medium text-foreground mb-2">Functionality Cookies</h3>
                <p className="text-muted-foreground text-sm mb-2">
                  These cookies allow our website to remember choices you make (such as your username, language, or region) and provide enhanced, personalized features.
                </p>
                <p className="text-xs text-muted-foreground">Duration: Up to 1 year</p>
              </div>

              <div className="bg-card rounded-lg border border-border p-6 mb-4">
                <h3 className="font-medium text-foreground mb-2">Targeting/Advertising Cookies</h3>
                <p className="text-muted-foreground text-sm mb-2">
                  These cookies are used to deliver advertisements more relevant to you and your interests. They are also used to limit the number of times you see an advertisement and help measure the effectiveness of advertising campaigns.
                </p>
                <p className="text-xs text-muted-foreground">Duration: Up to 2 years</p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">Third-Party Cookies</h2>
              <p className="text-muted-foreground mb-4">
                In addition to our own cookies, we may also use various third-party cookies to report usage statistics, deliver advertisements, and so forth. These may include:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
                <li>Google Analytics - for website analytics</li>
                <li>Vercel Analytics - for performance monitoring</li>
                <li>Supabase - for authentication and session management</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">Managing Cookies</h2>
              <p className="text-muted-foreground mb-4">
                Most web browsers allow you to control cookies through their settings preferences. However, if you limit the ability of websites to set cookies, you may worsen your overall user experience, as it will no longer be personalized to you. It may also stop you from saving customized settings like login information.
              </p>
              <p className="text-muted-foreground mb-4">
                To manage cookies in popular browsers:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
                <li><strong className="text-foreground">Chrome:</strong> Settings → Privacy and security → Cookies and other site data</li>
                <li><strong className="text-foreground">Firefox:</strong> Options → Privacy & Security → Cookies and Site Data</li>
                <li><strong className="text-foreground">Safari:</strong> Preferences → Privacy → Manage Website Data</li>
                <li><strong className="text-foreground">Edge:</strong> Settings → Privacy, search, and services → Cookies</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">Cookie Consent</h2>
              <p className="text-muted-foreground mb-4">
                When you first visit our website, you will be shown a cookie consent banner. By clicking &quot;Accept All&quot;, you agree to the storing of cookies on your device. You can change your cookie preferences at any time by clearing your browser cookies and revisiting our site.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">Updates to This Policy</h2>
              <p className="text-muted-foreground mb-4">
                We may update this Cookie Policy from time to time to reflect changes in technology, legislation, or our data practices. When we post changes to this policy, we will revise the &quot;Last updated&quot; date at the top of this page.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">Contact Us</h2>
              <p className="text-muted-foreground mb-4">
                If you have any questions about our use of cookies, please contact us:
              </p>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-foreground font-medium">NUMAT</p>
                <p className="text-muted-foreground">Email: sales@numat.ph</p>
                <p className="text-muted-foreground">Phone: +60 16-295 8983</p>
                <p className="text-muted-foreground">Address: Cagayan de Oro City, Philippines</p>
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
