interface QuoteEmailData {
  customerName: string
  quoteNumber: string
  quoteDate?: string
  subtotal: number
  discountAmount?: number
  discountPercent?: number
  total: number
  validUntil?: string
  items: Array<{
    productName: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }>
  recipientEmail: string
}

export function generateQuoteEmailHTML(data: QuoteEmailData): string {
  const displayDate = data.quoteDate || new Date().toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric'
  })
  const displayExpiry = data.validUntil || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric'
  })
  const discountAmount = data.discountAmount || 0
  const discountPercent = data.discountPercent || 0

  const itemsHTML = data.items.map((item) => `
    <tr>
      <td style="padding:12px 8px;border-bottom:1px solid #f0f0f0;text-align:left;font-size:14px;color:#333;">${item.productName}</td>
      <td style="padding:12px 8px;border-bottom:1px solid #f0f0f0;text-align:center;font-size:14px;color:#333;">${item.quantity}</td>
      <td style="padding:12px 8px;border-bottom:1px solid #f0f0f0;text-align:right;font-size:14px;color:#333;">${item.unitPrice.toLocaleString()}</td>
      <td style="padding:12px 8px;border-bottom:1px solid #f0f0f0;text-align:right;font-size:14px;font-weight:600;color:#1a237e;">${item.totalPrice.toLocaleString()}</td>
    </tr>
  `).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Quote from NUMAT</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="620" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">

          <!-- HEADER -->
          <tr>
            <td style="background-color:#1a237e;padding:0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:24px 32px;">
                    <img src="https://numatbamboo.com/numat-logo.png" alt="NUMAT" width="180" style="display:block;" />
                  </td>
                  <td style="padding:24px 32px;text-align:right;vertical-align:middle;">
                    <p style="margin:0;color:#ffffff;font-size:13px;line-height:1.8;">
                      📞 +639453444575<br>
                      🌐 www.numatbamboo.com<br>
                      ✉️ sales@numat.ph
                    </p>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="background-color:#4caf50;padding:6px 32px;">
                    <p style="margin:0;color:#ffffff;font-size:11px;letter-spacing:1px;">
                      Global Agro Milling Corporation, Warehouse B22, Barangay Alae, Manolo Fortich 8703, Bukidnon
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- QUOTE TITLE BAR -->
          <tr>
            <td style="background-color:#f8f9fa;border-bottom:2px solid #1a237e;padding:16px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0;font-size:22px;font-weight:700;color:#1a237e;">QUOTATION</p>
                    <p style="margin:4px 0 0;font-size:13px;color:#666;">#{quoteNumber}</p>
                  </td>
                  <td style="text-align:right;">
                    <p style="margin:0;font-size:12px;color:#666;">Date Issued: <strong>${displayDate}</strong></p>
                    <p style="margin:4px 0 0;font-size:12px;color:#666;">Valid Until: <strong style="color:#c62828;">${displayExpiry}</strong></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- GREETING -->
          <tr>
            <td style="padding:28px 32px 16px;">
              <p style="margin:0;font-size:15px;color:#333;">Dear <strong>${data.customerName}</strong>,</p>
              <p style="margin:12px 0 0;font-size:14px;color:#555;line-height:1.6;">
                Thank you for your interest in NUMAT's engineered bamboo products. Please find below your personalized quotation as requested.
              </p>
            </td>
          </tr>

          <!-- QUOTE INFO BOX -->
          <tr>
            <td style="padding:0 32px 16px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4ff;border-left:4px solid #1a237e;border-radius:4px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0;font-size:13px;color:#333;"><strong>Quote Number:</strong> <span style="color:#1a237e;">${data.quoteNumber}</span></p>
                    <p style="margin:6px 0 0;font-size:13px;color:#333;"><strong>Date Issued:</strong> ${displayDate}</p>
                    <p style="margin:6px 0 0;font-size:13px;color:#333;"><strong>Valid Until:</strong> <span style="color:#c62828;">${displayExpiry}</span></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ITEMS TABLE -->
          <tr>
            <td style="padding:0 32px 16px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:4px;overflow:hidden;">
                <thead>
                  <tr style="background-color:#1a237e;">
                    <th style="padding:12px 8px;text-align:left;font-size:12px;color:#ffffff;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Product</th>
                    <th style="padding:12px 8px;text-align:center;font-size:12px;color:#ffffff;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Qty</th>
                    <th style="padding:12px 8px;text-align:right;font-size:12px;color:#ffffff;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Unit Price</th>
                    <th style="padding:12px 8px;text-align:right;font-size:12px;color:#ffffff;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHTML}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- TOTALS -->
          <tr>
            <td style="padding:0 32px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="60%"></td>
                  <td width="40%">
                    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:4px;">
                      <tr>
                        <td style="padding:10px 14px;font-size:13px;color:#555;border-bottom:1px solid #f0f0f0;">Subtotal</td>
                        <td style="padding:10px 14px;font-size:13px;color:#333;text-align:right;border-bottom:1px solid #f0f0f0;">${data.subtotal.toLocaleString()}</td>
                      </tr>
                      ${discountAmount > 0 ? `
                      <tr>
                        <td style="padding:10px 14px;font-size:13px;color:#4caf50;border-bottom:1px solid #f0f0f0;">Discount (${discountPercent}%)</td>
                        <td style="padding:10px 14px;font-size:13px;color:#4caf50;text-align:right;border-bottom:1px solid #f0f0f0;">-${discountAmount.toLocaleString()}</td>
                      </tr>` : ''}
                      <tr style="background-color:#1a237e;">
                        <td style="padding:12px 14px;font-size:14px;color:#ffffff;font-weight:700;">TOTAL</td>
                        <td style="padding:12px 14px;font-size:14px;color:#ffffff;font-weight:700;text-align:right;">${data.total.toLocaleString()}</td>
                      </tr>
                    </table>
                    <p style="margin:8px 0 0;font-size:11px;color:#999;text-align:right;">Exclusive of VAT & delivery</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- TERMS -->
          <tr>
            <td style="padding:0 32px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff8e1;border-left:4px solid #ffc107;border-radius:4px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0;font-size:12px;color:#7a5c00;font-weight:700;">Terms & Conditions</p>
                    <p style="margin:6px 0 0;font-size:12px;color:#7a5c00;line-height:1.6;">
                      • This quotation is valid for 14 days from date of issue.<br>
                      • 50% downpayment required to process orders.<br>
                      • Balance due before delivery.<br>
                      • Prices are exclusive of delivery fees unless specified.<br>
                      • Lead time: 10 working days from order confirmation.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:0 32px 32px;text-align:center;">
              <a href="mailto:sales@numat.ph?subject=Proceed with Quote ${data.quoteNumber}"
                style="display:inline-block;background-color:#1a237e;color:#ffffff;padding:14px 32px;border-radius:6px;text-decoration:none;font-size:15px;font-weight:600;">
                Proceed with Order
              </a>
              <p style="margin:12px 0 0;font-size:12px;color:#999;">
                Reply to this email or contact us at <a href="mailto:sales@numat.ph" style="color:#1a237e;">sales@numat.ph</a>
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color:#1a237e;padding:20px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0;font-size:12px;color:#ffffff;font-weight:600;">NUMAT — Numat Sustainable Manufacturing Inc.</p>
                    <p style="margin:4px 0 0;font-size:11px;color:#9fa8da;">FSC-Certified Engineered Bamboo Products | From Nature, For Nature</p>
                  </td>
                  <td style="text-align:right;vertical-align:top;">
                    <p style="margin:0;font-size:11px;color:#9fa8da;">
                      sales@numat.ph<br>
                      +639453444575
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`
    .replace('#{quoteNumber}', `#${data.quoteNumber}`)
}

export function generateReminderEmailHTML(data: QuoteEmailData): string {
  const displayExpiry = data.validUntil || 'Soon'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Quote Reminder - NUMAT</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="620" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color:#1a237e;padding:24px 32px;">
              <img src="https://numatbamboo.com/numat-logo.png" alt="NUMAT" width="160" style="display:block;" />
            </td>
          </tr>
          <tr>
            <td style="background-color:#e53935;padding:14px 32px;">
              <p style="margin:0;color:#ffffff;font-size:16px;font-weight:700;">⏰ Quote Expiring Soon</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;">
              <p style="margin:0;font-size:15px;color:#333;">Hi <strong>${data.customerName}</strong>,</p>
              <p style="margin:12px 0 0;font-size:14px;color:#555;line-height:1.6;">
                Your quote <strong>#${data.quoteNumber}</strong> is expiring on <strong style="color:#c62828;">${displayExpiry}</strong>.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;background:#f0f4ff;border-left:4px solid #1a237e;border-radius:4px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0;font-size:14px;color:#1a237e;font-weight:700;">Total: ${data.total.toLocaleString()}</p>
                    <p style="margin:4px 0 0;font-size:13px;color:#666;">${data.items.length} product(s)</p>
                  </td>
                </tr>
              </table>
              <div style="text-align:center;margin-top:28px;">
                <a href="mailto:sales@numat.ph?subject=Question about Quote ${data.quoteNumber}"
                  style="display:inline-block;background-color:#1a237e;color:#ffffff;padding:14px 32px;border-radius:6px;text-decoration:none;font-size:15px;font-weight:600;">
                  Contact Sales Team
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color:#1a237e;padding:16px 32px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9fa8da;">NUMAT — sales@numat.ph | +639453444575</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}