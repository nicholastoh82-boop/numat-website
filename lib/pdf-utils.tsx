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
  valid_until: string
  subtotal: number
  discount_amount: number
  discount_percent: number
  total: number
  date: string
  customers: {
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

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#333',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  logo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#166534',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  section: {
    marginBottom: 20,
  },
  table: {
    marginTop: 20,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingBottom: 5,
    marginBottom: 5,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 8,
  },
  colDesc: { width: '45%' },
  colSpecs: { width: '25%', color: '#666', fontSize: 9 },
  colQty: { width: '10%', textAlign: 'center' },
  colPrice: { width: '10%', textAlign: 'right' },
  colTotal: { width: '10%', textAlign: 'right' },
  totals: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  totalRow: {
    flexDirection: 'row',
    width: 200,
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  totalLabel: {
    fontWeight: 'bold',
  },
  grandTotal: {
    fontSize: 12,
    fontWeight: 'bold',
    borderTopWidth: 1,
    borderTopColor: '#000',
    paddingTop: 5,
    marginTop: 5,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#999',
    fontSize: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  }
})

const QuoteDocument = ({ quote }: { quote: QuoteData }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>NUMAT</Text>
          <Text style={{ marginTop: 5 }}>NuBam Engineered Bamboo Products</Text>
          <Text>Singapore & Philippines</Text>
          <Text>sales@numat.ph | +60 16-295 8983</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.title}>QUOTE</Text>
          <Text>#{quote.quote_number}</Text>
          <Text>Date: {new Date(quote.created_at).toLocaleDateString()}</Text>
          <Text>Valid Until: {new Date(quote.valid_until).toLocaleDateString()}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 5 }}>Bill To:</Text>
        <Text>{quote.customers?.name || 'Guest Customer'}</Text>
        {quote.customers?.company_name && <Text>{quote.customers.company_name}</Text>}
        <Text>{quote.customers?.email || ''}</Text>
        <Text>{quote.customers?.phone || ''}</Text>
      </View>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.colDesc}>Description</Text>
          <Text style={styles.colSpecs}>Specs</Text>
          <Text style={styles.colQty}>Qty</Text>
          <Text style={styles.colPrice}>Unit Price</Text>
          <Text style={styles.colTotal}>Total</Text>
        </View>

        {quote.quote_items?.map((item, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={styles.colDesc}>{item.product_name}</Text>
            <Text style={styles.colSpecs}>{item.product_specs || '-'}</Text>
            <Text style={styles.colQty}>{item.quantity}</Text>
            <Text style={styles.colPrice}>{item.unit_price.toLocaleString()}</Text>
            <Text style={styles.colTotal}>{item.total_price.toLocaleString()}</Text>
          </View>
        ))}
      </View>

      <View style={styles.totals}>
        <View>
          <View style={styles.totalRow}>
            <Text>Subtotal:</Text>
            <Text>PHP {quote.subtotal?.toLocaleString()}</Text>
          </View>
          {quote.discount_amount > 0 && (
            <View style={styles.totalRow}>
              <Text>Discount ({quote.discount_percent}%):</Text>
              <Text style={{ color: '#166534' }}>- PHP {quote.discount_amount.toLocaleString()}</Text>
            </View>
          )}
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text style={styles.totalLabel}>Total Amount:</Text>
            <Text style={styles.totalLabel}>PHP {quote.total.toLocaleString()}</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text>This quote is valid for 14 days. Prices are exclusive of VAT unless stated otherwise.</Text>
        <Text style={{ marginTop: 2 }}>Payment Terms: 50% Downpayment, 50% Before Delivery.</Text>
        <Text style={{ marginTop: 2 }}>Thank you for your business!</Text>
      </View>
    </Page>
  </Document>
)

export async function generateQuotePDF(quote: QuoteData): Promise<Buffer> {
  try {
    const buffer = await renderToBuffer(<QuoteDocument quote={quote} />)
    return buffer
  } catch (error) {
    console.error('PDF Generation Error:', error)
    throw new Error('Failed to generate PDF')
  }
}
