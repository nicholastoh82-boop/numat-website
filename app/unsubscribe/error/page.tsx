import type { Metadata } from "next";
import Header from "@/components/header";
import Footer from "@/components/footer";

export const metadata: Metadata = {
  title: "Unsubscribe link error | NUMAT",
  description: "There was a problem processing your unsubscribe request.",
  robots: { index: false, follow: false },
};

const REASON_MESSAGES: Record<string, string> = {
  invalid_signature: "This link could not be verified. It may have been altered or copied incorrectly.",
  expired: "This link has expired. Unsubscribe links are valid for one year from the date they were sent.",
  malformed: "This link is malformed and cannot be processed.",
  missing_token: "No unsubscribe token was provided.",
  missing_secret: "We could not process this request right now. Please email us instead.",
  unknown_client: "We could not identify the sender associated with this link.",
  missing_global_client: "We could not process this request right now. Please email us instead.",
  server_error: "Something went wrong on our end while processing your request.",
};

type SearchParams = Promise<{ reason?: string }>;

export default async function UnsubscribeErrorPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const reason = params.reason ?? "";
  const explanation =
    REASON_MESSAGES[reason] ??
    "We could not verify your unsubscribe link. It may be invalid or expired.";

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-2xl px-4 py-16 lg:px-8 lg:py-24">
          <h1 className="font-serif text-3xl sm:text-4xl text-foreground mb-6">
            Unsubscribe link error
          </h1>
          <p className="text-muted-foreground mb-8">{explanation}</p>
          <p className="text-foreground mb-2">
            Email{" "}
            <a href="mailto:hello@numat.ph" className="underline">
              hello@numat.ph
            </a>{" "}
            to unsubscribe manually.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
