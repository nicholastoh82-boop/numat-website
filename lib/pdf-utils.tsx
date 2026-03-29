import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'

export interface QuoteData {
  id: string
  quote_number: string
  created_at: string
  valid_until?: string | null
  subtotal?: number
  discount_amount?: number
  discount_percent?: number
  total?: number
  display_currency?: string
  display_total?: number
  // Direct fields on quotes row
  customer_name?: string
  company?: string | null
  email?: string
  phone?: string
  // Legacy joined customers object
  customers?: {
    name: string
    company_name: string | null
    email: string
    phone: string
  } | null
  quote_items: Array<{
    product_name: string
    product_specs: string | null
    quantity: number
    unit_price: number
    total_price: number
  }>
}

const blue = '#1a237e'
const green = '#4caf50'
const lightBlue = '#e8eaf6'

const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#333',
  },
  // Header band
  headerBand: {
    backgroundColor: blue,
    padding: '20 40 0 40',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 16,
  },
  logoText: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    letterSpacing: 2,
  },
  logoTagline: {
    fontSize: 8,
    color: '#9fa8da',
    marginTop: 2,
    letterSpacing: 1,
  },
  headerContact: {
    alignItems: 'flex-end',
  },
  headerContactText: {
    fontSize: 9,
    color: '#c5cae9',
    marginBottom: 3,
  },
  // Green address band
  addressBand: {
    backgroundColor: green,
    padding: '6 40',
  },
  addressText: {
    fontSize: 8,
    color: '#ffffff',
  },
  // Content area
  content: {
    padding: '24 40',
  },
  // Quote title row
  quoteTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: blue,
    paddingBottom: 12,
  },
  quoteTitle: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: blue,
  },
  quoteNumber: {
    fontSize: 11,
    color: '#555',
    marginTop: 4,
  },
  quoteDateText: {
    fontSize: 9,
    color: '#555',
    marginBottom: 3,
    textAlign: 'right',
  },
  // Bill to section
  billToSection: {
    backgroundColor: lightBlue,
    padding: '10 14',
    borderRadius: 4,
    marginBottom: 20,
  },
  billToLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: blue,
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  billToText: {
    fontSize: 10,
    color: '#333',
    marginBottom: 2,
  },
  // Table
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: blue,
    padding: '8 6',
    marginBottom: 0,
  },
  tableHeaderText: {
    color: '#ffffff',
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    padding: '8 6',
  },
  tableRowAlt: {
    backgroundColor: '#f5f5f5',
  },
  colDesc: { width: '40%' },
  colSpecs: { width: '30%' },
  colQty: { width: '10%', textAlign: 'center' },
  colPrice: { width: '10%', textAlign: 'right' },
  colTotal: { width: '10%', textAlign: 'right' },
  specsText: {
    fontSize: 8,
    color: '#777',
  },
  // Totals
  totalsSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  totalsBox: {
    width: 220,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: '7 12',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  totalLabel: {
    fontSize: 10,
    color: '#555',
  },
  totalValue: {
    fontSize: 10,
    color: '#333',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: '9 12',
    backgroundColor: blue,
  },
  grandTotalLabel: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },
  grandTotalValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },
  // Terms
  termsBox: {
    backgroundColor: '#fff8e1',
    borderLeftWidth: 3,
    borderLeftColor: '#ffc107',
    padding: '10 14',
    marginTop: 20,
    borderRadius: 2,
  },
  termsTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#7a5c00',
    marginBottom: 5,
  },
  termsText: {
    fontSize: 8,
    color: '#7a5c00',
    lineHeight: 1.6,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: blue,
    padding: '10 40',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 8,
    color: '#9fa8da',
  },
})

const QuoteDocument = ({ quote }: { quote: QuoteData }) => {
  // Resolve customer info from either direct fields or joined customers object
  const customerName = quote.customer_name || quote.customers?.name || 'Valued Customer'
  const customerCompany = quote.company || quote.customers?.company_name || null
  const customerEmail = quote.email || quote.customers?.email || ''
  const customerPhone = quote.phone || quote.customers?.phone || ''

  const currency = quote.display_currency ?? 'PHP'
  const displayTotal = quote.display_total ?? quote.total ?? 0
  const usdTotal = quote.total ?? 0
  const conversionRatio = usdTotal > 0 ? displayTotal / usdTotal : 1

  const subtotal = Math.round((quote.subtotal ?? 0) * conversionRatio)
  const discountAmount = Math.round((quote.discount_amount ?? 0) * conversionRatio)
  const discountPercent = quote.discount_percent ?? 0

  const createdDate = quote.created_at
    ? new Date(quote.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })

  const validUntilDate = quote.valid_until && quote.valid_until !== 'Invalid Date'
    ? new Date(quote.valid_until).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* HEADER */}
        <View style={styles.headerBand}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.logoText}>NUMAT</Text>
              <Text style={styles.logoTagline}>FROM NATURE, FOR NATURE</Text>
            </View>
            <View style={styles.headerContact}>
              <Text style={styles.headerContactText}>+60162958983</Text>
              <Text style={styles.headerContactText}>www.numatbamboo.com</Text>
              <Text style={styles.headerContactText}>sales@numat.ph</Text>
            </View>
          </View>
        </View>

        {/* ADDRESS BAND */}
        <View style={styles.addressBand}>
          <Text style={styles.addressText}>
            Global Agro Milling Corporation, Warehouse B22, Barangay Alae, Manolo Fortich 8703, Bukidnon, Philippines
          </Text>
        </View>

        {/* CONTENT */}
        <View style={styles.content}>

          {/* QUOTE TITLE ROW */}
          <View style={styles.quoteTitleRow}>
            <View>
              <Text style={styles.quoteTitle}>QUOTATION</Text>
              <Text style={styles.quoteNumber}>#{quote.quote_number}</Text>
            </View>
            <View>
              <Text style={styles.quoteDateText}>Date Issued: {createdDate}</Text>
              <Text style={[styles.quoteDateText, { color: '#c62828' }]}>Valid Until: {validUntilDate}</Text>
            </View>
          </View>

          {/* BILL TO */}
          <View style={styles.billToSection}>
            <Text style={styles.billToLabel}>Bill To</Text>
            <Text style={styles.billToText}>{customerName}</Text>
            {customerCompany ? <Text style={styles.billToText}>{customerCompany}</Text> : null}
            {customerEmail ? <Text style={styles.billToText}>{customerEmail}</Text> : null}
            {customerPhone ? <Text style={styles.billToText}>{customerPhone}</Text> : null}
          </View>

          {/* ITEMS TABLE */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colDesc]}>Product</Text>
            <Text style={[styles.tableHeaderText, styles.colSpecs]}>Specs</Text>
            <Text style={[styles.tableHeaderText, styles.colQty]}>Qty</Text>
            <Text style={[styles.tableHeaderText, styles.colPrice]}>Unit Price</Text>
            <Text style={[styles.tableHeaderText, styles.colTotal]}>Total</Text>
          </View>

          {quote.quote_items?.map((item, i) => {
            const itemTotal = Math.round((item.total_price ?? item.quantity * item.unit_price) * conversionRatio)
            const itemUnitPrice = Math.round((item.unit_price ?? 0) * conversionRatio)
            return (
              <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                <Text style={styles.colDesc}>{item.product_name}</Text>
                <Text style={[styles.colSpecs, styles.specsText]}>{item.product_specs || '-'}</Text>
                <Text style={styles.colQty}>{item.quantity}</Text>
                <Text style={styles.colPrice}>{itemUnitPrice.toLocaleString()}</Text>
                <Text style={styles.colTotal}>{itemTotal.toLocaleString()}</Text>
              </View>
            )
          })}

          {/* TOTALS */}
          <View style={styles.totalsSection}>
            <View style={styles.totalsBox}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>{currency} {subtotal.toLocaleString()}</Text>
              </View>
              {discountAmount > 0 && (
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, { color: green }]}>Discount ({discountPercent}%)</Text>
                  <Text style={[styles.totalValue, { color: green }]}>-{currency} {discountAmount.toLocaleString()}</Text>
                </View>
              )}
              <View style={styles.grandTotalRow}>
                <Text style={styles.grandTotalLabel}>TOTAL</Text>
                <Text style={styles.grandTotalValue}>{currency} {Math.round(displayTotal).toLocaleString()}</Text>
              </View>
            </View>
          </View>

          {/* TERMS */}
          <View style={styles.termsBox}>
            <Text style={styles.termsTitle}>Terms & Conditions</Text>
            <Text style={styles.termsText}>
              • This quotation is valid for 14 days from date of issue.{'\n'}
              • 50% downpayment required to process orders.{'\n'}
              • Balance due before delivery.{'\n'}
              • Prices are exclusive of delivery fees and VAT unless specified.{'\n'}
              • Lead time: 10 working days from order confirmation.
            </Text>
          </View>

        </View>

        {/* FOOTER */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>NUMAT — Numat Sustainable Manufacturing Inc.</Text>
          <Text style={styles.footerText}>sales@numat.ph | +60162958983</Text>
        </View>

      </Page>
    </Document>
  )
}

export async function generateQuotePDF(quote: QuoteData): Promise<Buffer> {
  try {
    const buffer = await renderToBuffer(<QuoteDocument quote={quote} />)
    return buffer
  } catch (error) {
    console.error('PDF Generation Error:', error)
    throw new Error('Failed to generate PDF')
  }
}