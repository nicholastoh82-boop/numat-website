import { Resend } from 'resend'

/** Quotes are routed here when a rep issues one. */
const QUOTE_NOTIFY_TO = ['erica@numat.ph']

export type NotifyQuoteItem = {
  sku?: string | null
  product_name?: string | null
  quantity?: number | null
  unit_price?: number | null
}

export type NotifyQuoteInput = {
  quoteNumber: string
  docType: string
  totalPhp: number
  issuedBy: string | null
  notes: string | null
  customerName: string | null
  company: string | null
  email: string | null
  items: NotifyQuoteItem[]
}

const php = (n: number) =>
  `PHP ${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const esc = (v: unknown) =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * Email Erica when a rep issues a quote or invoice.
 *
 * Email rather than WhatsApp: sendWhatsAppProductionQuote needs a Meta approved
 * template SID, and an internal alert would need its own template approved
 * before it could send. Swap this out once that template exists.
 *
 * Never throws, and callers must not await it into their failure path. The
 * quote is already committed by the time this runs, so a mail outage is logged
 * and swallowed rather than shown to the rep as a failed quote.
 */
export async function notifyQuoteIssued(q: NotifyQuoteInput): Promise<void> {
  try {
    const key = process.env.RESEND_API_KEY
    if (!key) {
      console.warn('[Quote notify] RESEND_API_KEY not set, skipping')
      return
    }

    const rows = q.items
      .map((i) => {
        const qty = Number(i.quantity || 0)
        const unit = Number(i.unit_price || 0)
        return `<tr>
          <td style="padding:6px 10px;border-bottom:1px solid #eee">${esc(i.sku)}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee">${esc(i.product_name)}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${qty}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${php(unit)}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${php(qty * unit)}</td>
        </tr>`
      })
      .join('')

    const label = q.docType === 'invoice' ? 'Invoice' : 'Quote'

    await new Resend(key).emails.send({
      from: 'noreply@numat.ph',
      to: QUOTE_NOTIFY_TO,
      subject: `${label} ${q.quoteNumber} issued: ${q.company || q.customerName || 'Unknown'}, ${php(q.totalPhp)}`,
      html: `
        <div style="font-family:system-ui,-apple-system,sans-serif;color:#1c1917;max-width:640px">
          <h2 style="margin:0 0 4px">${label} ${esc(q.quoteNumber)}</h2>
          <p style="margin:0 0 16px;color:#57534e">Issued by ${esc(q.issuedBy) || 'a rep'}</p>
          <table style="border-collapse:collapse;margin-bottom:16px">
            <tr><td style="padding:4px 10px 4px 0;color:#57534e">Customer</td><td style="padding:4px 0;font-weight:600">${esc(q.customerName) || 'Not given'}</td></tr>
            <tr><td style="padding:4px 10px 4px 0;color:#57534e">Company</td><td style="padding:4px 0;font-weight:600">${esc(q.company) || 'Not given'}</td></tr>
            <tr><td style="padding:4px 10px 4px 0;color:#57534e">Email</td><td style="padding:4px 0">${q.email ? `<a href="mailto:${esc(q.email)}">${esc(q.email)}</a>` : 'Not given'}</td></tr>
            <tr><td style="padding:4px 10px 4px 0;color:#57534e">Total</td><td style="padding:4px 0;font-weight:700">${php(q.totalPhp)}</td></tr>
          </table>
          <table style="border-collapse:collapse;width:100%;font-size:14px">
            <thead>
              <tr style="text-align:left;color:#57534e">
                <th style="padding:6px 10px;border-bottom:2px solid #ddd">SKU</th>
                <th style="padding:6px 10px;border-bottom:2px solid #ddd">Product</th>
                <th style="padding:6px 10px;border-bottom:2px solid #ddd;text-align:right">Qty</th>
                <th style="padding:6px 10px;border-bottom:2px solid #ddd;text-align:right">Unit</th>
                <th style="padding:6px 10px;border-bottom:2px solid #ddd;text-align:right">Line</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          ${q.notes ? `<p style="margin-top:16px;color:#57534e"><strong>Notes:</strong> ${esc(q.notes)}</p>` : ''}
          <p style="margin-top:24px">
            <a href="https://numatbamboo.com/crm/dashboard" style="background:#166534;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Open the CRM</a>
          </p>
        </div>
      `,
    })
  } catch (err) {
    console.error('[Quote notify] Failed:', err)
  }
}
