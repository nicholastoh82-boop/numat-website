// lib/email-headers.ts
//
// Builds RFC 8058 list-unsubscribe headers for outbound cold-outreach emails.
// The send-time worker (Phase C) will spread these into the Gmail API send
// payload so Gmail surfaces a one-click unsubscribe button.

import { generateToken } from "@/lib/unsubscribe";

export type UnsubscribeHeaders = {
  "List-Unsubscribe": string;
  "List-Unsubscribe-Post": string;
};

export function buildUnsubscribeHeaders(
  email: string,
  clientSlug: string,
  baseUrl: string,
): UnsubscribeHeaders {
  const token = generateToken(email, clientSlug);
  const trimmedBase = baseUrl.replace(/\/+$/, "");
  return {
    "List-Unsubscribe": `<${trimmedBase}/api/unsubscribe?token=${token}>, <mailto:unsubscribe@numat.ph>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}
