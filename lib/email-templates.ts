interface QuoteEmailData {
  customerName: string
  quoteNumber: string
  quoteDate?: string      // Made optional for safety
  subtotal: number
  discountAmount?: number
  discountPercent?: number
  total: number
  validUntil?: string     // Made optional for safety
  items: Array<{
    productName: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }>
  recipientEmail: string
}

/**
 * Main Quote Email Template
 */
export function generateQuoteEmailHTML(data: QuoteEmailData): string {
  // --- SAFETY CHECKS ---
  const displayDate = data.quoteDate || new Date().toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const displayExpiry = data.validUntil || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const discountAmount = data.discountAmount || 0;
  const discountPercent = data.discountPercent || 0;

  const itemsHTML = data.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #f0f0f0; text-align: left;">${item.productName}</td>
      <td style="padding: 12px; border-bottom: 1px solid #f0f0f0; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #f0f0f0; text-align: right;">PHP ${item.unitPrice.toLocaleString()}</td>
      <td style="padding: 12px; border-bottom: 1px solid #f0f0f0; text-align: right; font-weight: 600;">PHP ${item.totalPrice.toLocaleString()}</td>
    </tr>
  `
    )
    .join('')

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Quote from NUMAT</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9fafb; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); overflow: hidden; }
    .header { background: linear-gradient(135deg, #166534 0%, #15803d 100%); color: white; padding: 40px 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
    .content { padding: 40px 30px; }
    .quote-info { background: #f3f4f6; border-left: 4px solid #166534; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .quote-info-row { display: flex; justify-content: space-between; padding: 5px 0; }
    .quote-info-label { font-weight: 600; color: #374151; }
    .quote-info-value { color: #166534; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #f3f4f6; padding: 10px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280; }
    .totals { margin-top: 20px; text-align: right; }
    .total-row { padding: 5px 0; }
    .grand-total { font-size: 18px; font-weight: 700; color: #166534; border-top: 2px solid #166534; margin-top: 10px; padding-top: 10px; }
    .terms { background: #fef3c7; border-left: 4px solid #fbbf24; padding: 15px; margin: 20px 0; font-size: 12px; color: #78350f; }
    .cta-button { background: #166534; color: white !important; padding: 12px 25px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>NUMAT - NuBam</h1>
      <p>FSC-Certified Engineered Bamboo Products</p>
    </div>
    <div class="content">
      <p>Dear <strong>${data.customerName}</strong>,</p>
      <p>Thank you for choosing NUMAT. Your personalized quote is ready for review.</p>
      
      <div class="quote-info">
        <div class="quote-info-row">
          <span class="quote-info-label">Quote Number:</span>
          <span class="quote-info-value">${data.quoteNumber}</span>
        </div>
        <div class="quote-info-row">
          <span class="quote-info-label">Date Issued:</span>
          <span class="quote-info-value">${displayDate}</span>
        </div>
        <div class="quote-info-row">
          <span class="quote-info-label">Valid Until:</span>
          <span class="quote-info-value">${displayExpiry}</span>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Unit</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
        </tbody>
      </table>

      <div class="totals">
        <div class="total-row">Subtotal: PHP ${data.subtotal.toLocaleString()}</div>
        ${discountAmount > 0 ? `<div class="total-row" style="color: #166534;">Discount (${discountPercent}%): -PHP ${discountAmount.toLocaleString()}</div>` : ''}
        <div class="total-row grand-total">Total Amount: PHP ${data.total.toLocaleString()}</div>
      </div>

      <div class="terms">
        <strong>Terms & Conditions:</strong><br>
        • Valid for 14 days.<br>
        • 50% Downpayment required to process orders.<br>
        • Prices are exclusive of delivery fees unless specified.
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="mailto:sales@numat.ph?subject=Proceed with Quote ${data.quoteNumber}" class="cta-button">Proceed with Order</a>
      </div>
    </div>
    <div class="footer">
      <strong>NUMAT - NuBam</strong><br>
      sales@numat.ph | +60 16-295 8983<br>
      FSC-Certified Sustainable Solutions for a Greener Future
    </div>
  </div>
</body>
</html>
  `
}

/**
 * Reminder Email Template
 */
export function generateReminderEmailHTML(data: QuoteEmailData): string {
  const displayExpiry = data.validUntil || "Soon";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Quote Reminder</title>
  <style>
    body { font-family: sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 20px auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
    .header { background: #ea580c; color: white; padding: 30px; text-align: center; }
    .content { padding: 30px; }
    .box { background: #fff7ed; border: 1px solid #fdba74; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .cta { background: #ea580c; color: white !important; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Quote Reminder</h1>
    </div>
    <div class="content">
      <p>Hi ${data.customerName},</p>
      <p>This is a friendly reminder that your quote <strong>#${data.quoteNumber}</strong> is set to expire on <strong>${displayExpiry}</strong>.</p>
      
      <div class="box">
        <strong>Quote Total: PHP ${data.total.toLocaleString()}</strong><br>
        Items: ${data.items.length} Product(s)
      </div>

      <p>Would you like to proceed with this order or do you have any questions? Our team is ready to assist you.</p>
      
      <div style="text-align: center; margin-top: 30px;">
        <a href="mailto:sales@numat.ph?subject=Question about Quote ${data.quoteNumber}" class="cta">Contact Sales Team</a>
      </div>
    </div>
  </div>
</body>
</html>
  `
}
