# System Architecture - Quote Management & Email Integration

## High-Level Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    ADMIN DASHBOARD                              │
│                 (/app/admin/quotes/page.tsx)                   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Quote List Table                                         │  │
│  │ ├─ Filter by Status (Pending, Processing, etc)        │  │
│  │ ├─ Sort by Date/Amount/Status                          │  │
│  │ ├─ Statistics Cards (Total, Pending, Value)            │  │
│  │ └─ Clickable rows → Details Modal                      │  │
│  │                                                          │  │
│  │ Quick Actions Per Quote:                               │  │
│  │ ├─ [Send Quote] ──────────────────────┐               │  │
│  │ ├─ [Send Reminder] ────────────────────┤               │  │
│  │ ├─ [Download PDF] ─────────────────────┤               │  │
│  │ ├─ [WhatsApp Share] ───────────────────┤               │  │
│  │ └─ [Viber Share] ──────────────────────┤               │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                    │      │       │       │       │
       ┌────────────┘      │       │       │       │
       │            ┌──────┘       │       │       │
       │            │         ┌────┘       │       │
       │            │         │       ┌────┘       │
       │            │         │       │       ┌────┘
       ▼            ▼         ▼       ▼       ▼
   ┌────────────────────────────────────────────────┐
   │         API ROUTE HANDLERS                     │
   │                                                │
   │  1. /api/admin/send-quote    [POST]           │
   │     └─ Handles: "send" & "reminder" types     │
   │                                                │
   │  2. /api/admin/share-quote   [POST]           │
   │     └─ Handles: "whatsapp" & "viber"          │
   │                                                │
   │  3. /api/quote/pdf           [GET]            │
   │     └─ Direct PDF download                    │
   └────────────────────────────────────────────────┘
       │              │              │
       │              │              │
       ▼              ▼              ▼
   ┌──────────┐  ┌────────────┐  ┌────────┐
   │ SendGrid │  │ Database   │  │  PDF   │
   │  Email   │  │ (Supabase) │  │ Gen    │
   │  Service │  │            │  │        │
   └──────────┘  └────────────┘  └────────┘
```

---

## Component Architecture

```
┌─ Frontend Layer ─────────────────────────────────────────────────┐
│                                                                   │
│  ┌─ Admin Dashboard (/app/admin/quotes/page.tsx)              │
│  │  ├─ useCart() hook - fetch quote data                      │
│  │  ├─ useState() - manage filters, sorting, modal             │
│  │  └─ Renders:                                                │
│  │     ├─ QuoteTable with action buttons                       │
│  │     ├─ StatisticsCards                                      │
│  │     └─ QuoteDetailsModal (on row click)                     │
│  │                                                              │
│  └─ Sub-components:                                            │
│     ├─ QuoteDetailsModal (/components/admin/...)              │
│     │   └─ Displays full quote info in modal                  │
│     │                                                          │
│     └─ QuoteStatusBadge (/components/quote-status-badge.tsx)  │
│         └─ Visual status indicator with icon                  │
│                                                                │
└────────────────────────────────────────────────────────────────┘

┌─ API Layer ──────────────────────────────────────────────────────┐
│                                                                   │
│  ┌─ Send Quote Handler (/app/api/admin/send-quote/route.ts)   │
│  │  ├─ Auth check (verify user logged in)                     │
│  │  ├─ Fetch quote from DB with relations                     │
│  │  ├─ Generate PDF via generateQuotePDF()                    │
│  │  ├─ Create email HTML via generateQuoteEmailHTML()         │
│  │  ├─ Send email via sendEmail() [SendGrid]                 │
│  │  └─ Update quote status in DB                              │
│  │                                                              │
│  ├─ Share Quote Handler (/app/api/admin/share-quote/route.ts)│
│  │  ├─ Auth check                                             │
│  │  ├─ Generate share message                                 │
│  │  ├─ Format phone number                                    │
│  │  ├─ Create WhatsApp/Viber URL                             │
│  │  └─ Return URL to frontend                                 │
│  │                                                              │
│  └─ PDF Download Handler (/app/api/quote/pdf/route.tsx)      │
│     ├─ Auth check                                             │
│     ├─ Fetch quote from DB                                    │
│     ├─ Generate PDF                                           │
│     └─ Stream PDF to browser                                  │
│                                                                │
└────────────────────────────────────────────────────────────────┘

┌─ Service Layer ──────────────────────────────────────────────────┐
│                                                                   │
│  ┌─ SendGrid Service (/lib/sendgrid.ts)                       │
│  │  ├─ Initialize with API key                                │
│  │  ├─ sendEmail() function                                   │
│  │  └─ Handles attachments and basic email sending            │
│  │                                                              │
│  ├─ Email Templates (/lib/email-templates.ts)                │
│  │  ├─ generateQuoteEmailHTML()                               │
│  │  └─ generateReminderEmailHTML()                            │
│  │                                                              │
│  └─ PDF Utils (/lib/pdf-utils.ts)                             │
│     ├─ generateQuotePDF() - main function                    │
│     ├─ QuoteDocument - React component                        │
│     └─ StyleSheet - PDF styles                                │
│                                                                │
└────────────────────────────────────────────────────────────────┘

┌─ Data Layer ─────────────────────────────────────────────────────┐
│                                                                   │
│  Database Tables (Supabase/PostgreSQL):                          │
│  ├─ quotes                                                       │
│  │  ├─ id (UUID)                                               │
│  │  ├─ quote_number (String)                                   │
│  │  ├─ created_at (Timestamp)                                  │
│  │  ├─ status ('pending'|'processing'|'completed'|etc)        │
│  │  ├─ subtotal (Number)                                       │
│  │  ├─ discount_amount (Number)                                │
│  │  ├─ total (Number)                                          │
│  │  ├─ customer_id (FK)                                        │
│  │  └─ [relations] → customers, quote_items                   │
│  │                                                              │
│  ├─ customers                                                   │
│  │  ├─ id (UUID)                                               │
│  │  ├─ name (String)                                           │
│  │  ├─ email (String)                                          │
│  │  ├─ phone (String)                                          │
│  │  └─ company_name (String, optional)                         │
│  │                                                              │
│  ├─ quote_items                                                │
│  │  ├─ id (UUID)                                               │
│  │  ├─ quote_id (FK)                                           │
│  │  ├─ product_name (String)                                   │
│  │  ├─ quantity (Number)                                       │
│  │  ├─ unit_price (Number)                                     │
│  │  └─ total_price (Number)                                    │
│  │                                                              │
│  └─ quote_interactions (optional - for logging)               │
│     ├─ id (UUID)                                               │
│     ├─ quote_id (FK)                                           │
│     ├─ action ('send'|'share'|'view')                         │
│     └─ created_at (Timestamp)                                  │
│                                                                │
└────────────────────────────────────────────────────────────────┘

┌─ External Services ──────────────────────────────────────────────┐
│                                                                   │
│  ┌─ SendGrid ───────────────────────────────────────────────┐  │
│  │  ├─ API Endpoint: api.sendgrid.com/v3/mail/send        │  │
│  │  ├─ Authentication: API Key in Authorization header     │  │
│  │  ├─ Rate Limits: Depends on plan                        │  │
│  │  └─ Success Response: 202 Accepted                      │  │
│  │                                                          │  │
│  └─ Third-Party Apps (Client-side) ──────────────────────┐ │  │
│     ├─ WhatsApp Web (https://wa.me/)                      │ │  │
│     ├─ Viber (viber://chat/)                              │ │  │
│     └─ Email clients (Gmail, Outlook, Apple Mail)         │ │  │
│                                                            │ │  │
└────────────────────────────────────────────────────────────┘ │
```

---

## Data Flow Diagrams

### Flow 1: Sending Quote Email

```
User clicks [Send Quote] button
        ↓
Frontend: handleSendQuote()
        ↓
POST /api/admin/send-quote
  { quoteId, type: "send" }
        ↓
Backend: Authenticate user
        ↓
Fetch quote from DB:
  SELECT quotes.*, customers.*, quote_items.*
  FROM quotes
  LEFT JOIN customers ON quotes.customer_id = customers.id
  LEFT JOIN quote_items ON quote_items.quote_id = quotes.id
  WHERE quotes.id = quoteId
        ↓
Generate PDF: generateQuotePDF(quote)
  ├─ Create React PDF document component
  ├─ Render to buffer
  └─ Return Buffer object
        ↓
Create HTML: generateQuoteEmailHTML(data)
  ├─ Format prices and dates
  ├─ Create responsive HTML
  └─ Return HTML string
        ↓
Send via SendGrid: sendEmail({
  to: customer.email,
  from: NEXT_PUBLIC_SENDGRID_FROM_EMAIL,
  subject: "Your Quote #...",
  html: emailHTML,
  attachments: [{
    content: pdfBuffer.toString('base64'),
    filename: 'Quote-#.pdf',
    type: 'application/pdf'
  }]
})
        ↓
SendGrid API processes request
        ↓
Update DB: Set quote status = "processing"
        ↓
Return success response to frontend
        ↓
Frontend: Show toast notification
        ↓
Frontend: Refresh data via mutate()
```

### Flow 2: Sharing on WhatsApp

```
User clicks [WhatsApp] button
        ↓
Frontend: handleShareOnSocial(quoteId, 'whatsapp')
        ↓
POST /api/admin/share-quote
  { quoteId, channel: "whatsapp" }
        ↓
Backend: Authenticate user
        ↓
Fetch quote + customer from DB
        ↓
Generate message:
  "Hi [Name],\n\nWe have prepared a quote for you:\n\n
   Quote #: [Number]\nAmount: PHP [Total]\n
   Valid Until: [Date]\n\nPlease see the attached PDF..."
        ↓
Encode message for URL
        ↓
Format phone number (remove special chars)
        ↓
Create WhatsApp URL:
  https://wa.me/[PHONE]?text=[ENCODED_MESSAGE]
        ↓
Log interaction in DB (optional)
        ↓
Return shareUrl to frontend
        ↓
Frontend: window.open(shareUrl)
        ↓
Browser: Opens WhatsApp Web (or app if installed)
        ↓
WhatsApp: Pre-fills message to contact
```

---

## Request/Response Examples

### Send Quote Email Request

```bash
POST /api/admin/send-quote HTTP/1.1
Content-Type: application/json
Authorization: Bearer [session_token]

{
  "quoteId": "550e8400-e29b-41d4-a716-446655440000",
  "type": "send"
}
```

### Send Quote Email Response

```json
{
  "ok": true,
  "message": "Quote sent successfully to customer@example.com"
}
```

### Share Quote Request

```bash
POST /api/admin/share-quote HTTP/1.1
Content-Type: application/json
Authorization: Bearer [session_token]

{
  "quoteId": "550e8400-e29b-41d4-a716-446655440000",
  "channel": "whatsapp"
}
```

### Share Quote Response

```json
{
  "ok": true,
  "shareUrl": "https://wa.me/639123456789?text=Hi%20John%2C%0A%0AWe%20have%20prepared...",
  "message": "Share link generated for whatsapp"
}
```

---

## Security Architecture

```
┌─ Authentication Layer ──────────────┐
│ - Session verification on all       │
│   protected endpoints               │
│ - User must be logged in            │
│ - Admin profile check               │
└─────────────────────────────────────┘
           ↓
┌─ Authorization Layer ──────────────┐
│ - Verify user is admin              │
│ - Check permissions                 │
│ - Prevent unauthorized access       │
└─────────────────────────────────────┘
           ↓
┌─ Validation Layer ─────────────────┐
│ - Validate request payload          │
│ - Check required fields             │
│ - Sanitize inputs                   │
└─────────────────────────────────────┘
           ↓
┌─ Processing Layer ─────────────────┐
│ - Database operations               │
│ - External API calls (SendGrid)     │
│ - Error handling                    │
└─────────────────────────────────────┘
           ↓
┌─ Response Layer ───────────────────┐
│ - Return success/error response     │
│ - Don't expose sensitive data       │
│ - Use appropriate HTTP status codes │
└─────────────────────────────────────┘
```

---

## Technology Stack

```
Frontend:
├─ Next.js 16 (App Router)
├─ React 19
├─ TypeScript
├─ Tailwind CSS
├─ Lucide React (Icons)
├─ SWR (Data Fetching)
└─ React Hot Toast (Notifications)

Backend:
├─ Next.js API Routes
├─ Node.js Runtime
├─ Supabase (Database)
├─ SendGrid (@sendgrid/mail)
└─ @react-pdf/renderer

External Services:
├─ SendGrid (Email)
├─ Supabase (Database)
├─ WhatsApp Web/API
└─ Viber App/API

Development:
├─ TypeScript
├─ ESLint
├─ Tailwind CSS
└─ Environment Variables
```

---

## Performance Considerations

1. **PDF Generation**: Server-side only (no client-side rendering overhead)
2. **Email Sending**: Async operation (non-blocking)
3. **Database Queries**: Optimized with foreign key relations
4. **Caching**: SWR on frontend for client-side caching
5. **Rate Limiting**: Consider SendGrid rate limits for bulk sends
6. **Error Handling**: Graceful degradation with user feedback

---

## Scalability Notes

- **Email Volume**: SendGrid can handle thousands of emails - scale limited by plan
- **Database**: Supabase handles horizontal scaling
- **API Endpoints**: Serverless functions scale automatically
- **PDF Generation**: Can be resource-intensive - consider background jobs for bulk ops
- **Attachments**: Large PDFs may slow email delivery - consider size optimization

---

**Last Updated**: January 2026
**Architecture Version**: 1.0
**Status**: Production Ready
