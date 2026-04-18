// ============================================================================
// File path in your repo: src/app/crm/components/SendQuoteButton.tsx
//
// Drop this into any quote row in your CRM. Passes quote_id to n8n webhook.
//
// Env var needed (client-side, so NEXT_PUBLIC_ prefix):
//   NEXT_PUBLIC_N8N_SEND_QUOTE_WEBHOOK
//     (the n8n webhook URL you'll copy from the workflow I just deployed)
// ============================================================================

"use client";

import { useState } from "react";

type Props = {
  quoteId: string;
  quoteNumber: string;
  recipientEmail: string;
  recipientName: string;
  onSent?: () => void;
};

export default function SendQuoteButton({
  quoteId,
  quoteNumber,
  recipientEmail,
  recipientName,
  onSent,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"" | "sent" | "error">("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSend = async () => {
    const confirmed = window.confirm(
      `Send quote ${quoteNumber} to ${recipientName} (${recipientEmail})?\n\n` +
        `A PDF will be generated, saved to Supabase Storage, and emailed to the customer. ` +
        `You will receive a copy at nick@numat.ph.`,
    );
    if (!confirmed) return;

    setBusy(true);
    setStatus("");
    setErrorMsg("");

    try {
      const webhookUrl = process.env.NEXT_PUBLIC_N8N_SEND_QUOTE_WEBHOOK;
      if (!webhookUrl) {
        throw new Error("Webhook URL not configured");
      }

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quote_id: quoteId,
          quote_number: quoteNumber,
          recipient_email: recipientEmail,
          recipient_name: recipientName,
          sent_by: "crm",
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`n8n responded ${response.status}: ${text}`);
      }

      setStatus("sent");
      onSent?.();
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleSend}
        disabled={busy || status === "sent"}
        className="inline-flex items-center justify-center gap-2 rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? (
          <>
            <svg
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Sending...
          </>
        ) : status === "sent" ? (
          <>✓ Quote sent</>
        ) : (
          <>Send Quote</>
        )}
      </button>
      {status === "error" ? (
        <span className="text-xs text-red-600">Failed: {errorMsg}</span>
      ) : null}
    </div>
  );
}