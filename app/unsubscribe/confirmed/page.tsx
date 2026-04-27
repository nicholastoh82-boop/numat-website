import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/header";
import Footer from "@/components/footer";

export const metadata: Metadata = {
  title: "Unsubscribed | NUMAT",
  description: "You have been unsubscribed from NUMAT communications.",
  robots: { index: false, follow: false },
};

export default function UnsubscribeConfirmedPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-2xl px-4 py-16 lg:px-8 lg:py-24">
          <h1 className="font-serif text-3xl sm:text-4xl text-foreground mb-6">
            You have been unsubscribed
          </h1>
          <p className="text-muted-foreground mb-6">
            Your email address has been removed from NUMAT communications. You will not
            receive further outreach from us.
          </p>
          <p className="text-sm text-muted-foreground mb-10">
            If this was a mistake, contact us at{" "}
            <a href="mailto:hello@numat.ph" className="underline text-foreground">
              hello@numat.ph
            </a>
            .
          </p>
          <Link
            href="https://www.numatbamboo.com"
            className="inline-flex items-center text-foreground underline"
          >
            Return to numatbamboo.com
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
