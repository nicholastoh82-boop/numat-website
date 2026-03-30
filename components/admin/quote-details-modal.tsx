'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, Mail, Bell, MessageCircle, X } from 'lucide-react'

interface QuoteItem {
  product_name: string
  product_specs: string | null
  quantity: number
  unit_price: number
  total_price: number
}

interface QuoteDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  quote: {
    id: string
    quote_number: string
    created_at: string
    valid_until: string
    status: string
    subtotal: number
    discount_amount: number
    discount_percent: number
    total: number
    customers: {
      name: string
      email: string
      phone: string
      company_name: string | null
    } | null
    quote_items: QuoteItem[]
  } | null
  onDownloadPdf: (quoteId: string, quoteNumber: string) => void
  onSendQuote: (quoteId: string, quoteNumber: string) => void
  onSendReminder: (quoteId: string, quoteNumber: string) => void
  onShare: (quoteId: string, channel: 'whatsapp') => void
  isSending: boolean
}

export function QuoteDetailsModal({
  open,
  onOpenChange,
  quote,
  onDownloadPdf,
  onSendQuote,
  onSendReminder,
  onShare,
  isSending
}: QuoteDetailsModalProps) {
  if (!quote) return null

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'processing': return 'bg-blue-100 text-blue-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl">Quote #{quote.quote_number}</DialogTitle>
              <DialogDescription className="mt-2">
                Created on {new Date(quote.created_at).toLocaleDateString()} | Valid until {new Date(quote.valid_until).toLocaleDateString()}
              </DialogDescription>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusColor(quote.status)}`}>
              {quote.status}
            </span>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Info */}
          <div className="border-t pt-6">
            <h3 className="font-semibold text-lg mb-3">Customer Information</h3>
            <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-medium">Name</p>
                <p className="text-foreground font-medium">{quote.customers?.name || 'Unknown'}</p>
              </div>
              {quote.customers?.company_name && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-medium">Company</p>
                  <p className="text-foreground font-medium">{quote.customers.company_name}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground uppercase font-medium">Email</p>
                <p className="text-foreground font-medium">{quote.customers?.email}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-medium">Phone</p>
                <p className="text-foreground font-medium">{quote.customers?.phone}</p>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Quote Items</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Product</th>
                    <th className="text-center px-4 py-2 font-medium">Qty</th>
                    <th className="text-right px-4 py-2 font-medium">Unit Price</th>
                    <th className="text-right px-4 py-2 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {quote.quote_items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-muted/20">
                      <td className="px-4 py-2">
                        <p className="font-medium">{item.product_name}</p>
                        {item.product_specs && <p className="text-xs text-muted-foreground">{item.product_specs}</p>}
                      </td>
                      <td className="text-center px-4 py-2">{item.quantity}</td>
                      <td className="text-right px-4 py-2">PHP {item.unit_price.toLocaleString()}</td>
                      <td className="text-right px-4 py-2 font-medium">PHP {item.total_price.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-2 bg-muted/30 p-4 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium">PHP {quote.subtotal.toLocaleString()}</span>
              </div>
              {quote.discount_amount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount ({quote.discount_percent}%):</span>
                  <span className="font-medium">-PHP {quote.discount_amount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t pt-2 border-muted">
                <span>Total:</span>
                <span className="text-primary">PHP {quote.total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap border-t pt-6">
            <Button
              variant="default"
              size="sm"
              className="gap-2"
              onClick={() => onSendQuote(quote.id, quote.quote_number)}
              disabled={isSending}
            >
              <Mail className="w-4 h-4" />
              Send Quote Email
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => onSendReminder(quote.id, quote.quote_number)}
              disabled={isSending}
            >
              <Bell className="w-4 h-4" />
              Send Reminder
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => onDownloadPdf(quote.id, quote.quote_number)}
            >
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => onShare(quote.id, 'whatsapp')}
            >
              <MessageCircle className="w-4 h-4 text-green-600" />
              WhatsApp
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
