/**
 * WhatsApp Message Templates for Quotes
 * These templates are optimized for WhatsApp's message formatting
 */

export interface QuoteMessageData {
  customerName: string
  quoteNumber: string
  quoteDate: string
  validUntil: string
  total: number
  items: Array<{
    product_name: string
    quantity: number
    unit_price: number
    total_price: number
  }>
}

/**
 * Generate a professional quote message for WhatsApp
 */
export function generateQuoteMessage(data: QuoteMessageData): string {
  const itemsList = data.items
    .map(
      (item) =>
        `  • ${item.product_name}\n    Qty: ${item.quantity} × PHP ${item.unit_price.toLocaleString()} = PHP ${item.total_price.toLocaleString()}`
    )
    .join('\n')

  return `
*📋 QUOTE #${data.quoteNumber}*

Hello ${data.customerName},

Thank you for your interest in NUMAT's sustainable bamboo products! Your quote is ready for review.

*Itemized Details:*
${itemsList}

*Amount Summary:*
━━━━━━━━━━━━━━━━━━━━
Total Quote: *PHP ${data.total.toLocaleString()}*
━━━━━━━━━━━━━━━━━━━━

*Quote Information:*
📅 Date: ${data.quoteDate}
⏰ Valid Until: ${data.validUntil}

*Next Steps:*
1️⃣ Review the detailed quote (PDF attached)
2️⃣ Let us know your feedback
3️⃣ We're ready to discuss bulk orders and custom requirements

Have questions? We're here to help! 🎋

_NUMAT - NuBam Engineered Bamboo Products_
📧 sales@numat.ph
`.trim()
}

/**
 * Generate a reminder message for WhatsApp
 */
export function generateReminderMessage(data: Omit<QuoteMessageData, 'items'>): string {
  return `
*⏰ QUOTE REMINDER*

Hello ${data.customerName},

This is a friendly reminder that your quote *#${data.quoteNumber}* will be expiring soon.

*Quote Details:*
📅 Issued: ${data.quoteDate}
⏳ Expires: ${data.validUntil}
💰 Total: *PHP ${data.total.toLocaleString()}*

*Don't Miss Out!*
This is a great opportunity to secure sustainable bamboo products at this quoted price. Prices and availability may change after the expiration date.

📲 Reply to this message or contact us to:
  ✅ Confirm your order
  ✅ Negotiate terms
  ✅ Discuss delivery options
  ✅ Request customization

Your satisfaction is our priority! 🎋

_NUMAT - NuBam Engineered Bamboo Products_
📧 sales@numat.ph
`.trim()
}

/**
 * Generate a follow-up message for WhatsApp
 */
export function generateFollowUpMessage(
  customerName: string,
  quoteNumber: string,
  total: number
): string {
  return `
*👋 QUOTE FOLLOW-UP*

Hi ${customerName},

We noticed you haven't confirmed your quote yet. We'd love to help you!

*Quote #${quoteNumber}*
Total: PHP ${total.toLocaleString()}

*How Can We Assist?*
📞 Have questions about the quote?
💡 Need custom modifications?
🚚 Want to discuss delivery options?
💰 Looking for bulk discounts?

Just reply here or reach out directly. We're committed to finding the perfect solution for your bamboo product needs! 🌱

_NUMAT - NuBam Engineered Bamboo Products_
📧 sales@numat.ph
`.trim()
}

/**
 * Generate an order confirmation message
 */
export function generateOrderConfirmationMessage(
  customerName: string,
  quoteNumber: string,
  orderNumber: string,
  total: number,
  deliveryDate: string
): string {
  return `
*✅ ORDER CONFIRMED!*

Hello ${customerName},

Great news! Your order has been confirmed and we're excited to serve you! 🎉

*Order Details:*
📋 Quote #: ${quoteNumber}
📋 Order #: ${orderNumber}
💰 Total Amount: PHP ${total.toLocaleString()}
📦 Expected Delivery: ${deliveryDate}

*What's Next?*
1️⃣ You will receive an invoice shortly
2️⃣ Our team will prepare your order
3️⃣ Shipping updates will be sent via this channel
4️⃣ We'll notify you when your order is ready for pickup/delivery

*Order Support:*
Have any questions? We're just a message away!

Thank you for choosing NUBAMBU! 🎋

_NUMAT - NuBam Engineered Bamboo Products_
📧 sales@numat.ph
`.trim()
}

/**
 * Generate a shipping notification message
 */
export function generateShippingNotificationMessage(
  customerName: string,
  orderNumber: string,
  trackingNumber?: string,
  estimatedDelivery?: string
): string {
  return `
*📦 SHIPMENT NOTIFICATION*

Hello ${customerName},

Exciting news! Your order #${orderNumber} has been shipped! 🚚

${
  trackingNumber
    ? `*Tracking Information:*
🔗 Tracking #: ${trackingNumber}
Track your package at: [Your tracking link]`
    : ''
}

${
  estimatedDelivery
    ? `⏰ Estimated Delivery: ${estimatedDelivery}`
    : ''
}

*What to Expect:*
📍 You'll receive updates as your order moves
📞 Contact us if you have any concerns
✅ Inspect the package upon delivery

*Questions?*
Reply to this message anytime. We're here to help! 🎋

_NUMAT - NuBam Engineered Bamboo Products_
📧 sales@numat.ph
`.trim()
}

/**
 * Generate a thank you/feedback request message
 */
export function generateFeedbackRequestMessage(
  customerName: string,
  orderNumber: string
): string {
  return `
*⭐ WE VALUE YOUR FEEDBACK!*

Hello ${customerName},

Thank you so much for choosing NUBAMBU for your order #${orderNumber}! 🙏

We hope you love your sustainable bamboo products. Your feedback helps us improve and serve you better.

*Rate Your Experience:*
⭐ Quality of products
⭐ Delivery speed
⭐ Customer service
⭐ Overall satisfaction

*Share Your Thoughts:*
📸 Share a photo of your products
💬 Tell us what you think
❤️ Recommend us to others

*Special Offer:*
Customers who provide feedback get 10% off their next order! 🎁

Thank you for being part of the NUBAMBU family! 🎋

_NUMAT - NuBam Engineered Bamboo Products_
📧 sales@numat.ph
`.trim()
}

/**
 * Format phone number for WhatsApp (e.g., from +639123456789 to 639123456789)
 */
export function formatWhatsAppPhone(phoneNumber: string): string {
  return phoneNumber.replace(/\D/g, '').replace(/^1/, '') // Remove all non-digits, remove leading 1 if present
}

/**
 * Create WhatsApp link for manual sharing
 */
export function createWhatsAppLink(
  phoneNumber: string,
  message: string
): string {
  const formattedPhone = formatWhatsAppPhone(phoneNumber)
  const encodedMessage = encodeURIComponent(message)
  return `https://wa.me/${formattedPhone}?text=${encodedMessage}`
}
