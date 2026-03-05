'use client'

import React, { useState } from 'react'
import useSWR from 'swr'
import { Download, RefreshCw, MessageCircle, Phone, Mail, Loader2, FileText, Send, Bell, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { QuoteDetailsModal } from '@/components/admin/quote-details-modal'
import { createClient } from '@/lib/supabase/client' // Import Supabase client

// Define types based on your SQL schema
type QuoteItem = {
    id: string
    quantity: number
    price: number
    description: string
    product_name: string
    product_specs: string
    unit_price: number
    total_price: number
}

type QuoteWithCustomer = {
    id: string
    quote_number: string
    created_at: string
    valid_until: string
    status: 'pending' | 'draft' | 'processing' | 'completed' | 'cancelled' | 'expired'
    subtotal: number
    discount_amount: number
    discount_percent: number
    total: number
    delivery_channel: 'whatsapp' | 'viber' | 'email'
    customers: {
        name: string
        email: string
        phone: string
        company_name: string | null
    } | null
    quote_items: QuoteItem[]
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function AdminQuotesPage() {
    const { toast } = useToast()
    const supabase = createClient() // Initialize Supabase browser client
    const { data: quotesData, isLoading, mutate } = useSWR<QuoteWithCustomer[]>('/api/admin/quotes', fetcher)
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [sortBy, setSortBy] = useState<'date' | 'amount' | 'status'>('date')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
    const [isUpdating, setIsUpdating] = useState<string | null>(null)
    const [isSending, setIsSending] = useState<string | null>(null)
    const [selectedQuote, setSelectedQuote] = useState<QuoteWithCustomer | null>(null)
    const [modalOpen, setModalOpen] = useState(false)

    const quotes = Array.isArray(quotesData) ? quotesData : []

    const filteredQuotes = quotes
        .filter(q => statusFilter === 'all' || q.status === statusFilter)
        .sort((a, b) => {
            let aValue: any = a.created_at
            let bValue: any = b.created_at

            if (sortBy === 'amount') {
                aValue = a.total || 0
                bValue = b.total || 0
            } else if (sortBy === 'status') {
                aValue = a.status
                bValue = b.status
            }

            const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0
            return sortOrder === 'asc' ? comparison : -comparison
        })

    // Helper to get Auth Headers
    const getAuthHeaders = async () => {
        const { data: { session } } = await supabase.auth.getSession()
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
            'x-api-key': 'automated-system-call' // Also pass API key for system consistency
        }
    }

    const updateQuoteStatus = async (quoteId: string, newStatus: string) => {
        setIsUpdating(quoteId)
        try {
            const headers = await getAuthHeaders()
            const res = await fetch('/api/admin/quotes', {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ id: quoteId, status: newStatus }),
            })

            if (!res.ok) throw new Error('Failed to update')

            toast({ title: "Status updated", description: `Quote marked as ${newStatus}` })
            mutate()
        } catch (error) {
            toast({ title: "Error", description: "Could not update status", variant: "destructive" })
        } finally {
            setIsUpdating(null)
        }
    }

    const handleDownloadPdf = (quoteId: string, quoteNumber: string) => {
        window.open(`/api/quote/pdf?id=${quoteId}`, '_blank')
        toast({
            title: "Generating PDF",
            description: `Downloading quote #${quoteNumber}...`
        })
    }

    const handleSendQuote = async (quoteId: string, quoteNumber: string) => {
        setIsSending(quoteId)
        try {
            const headers = await getAuthHeaders()
            const res = await fetch('/api/admin/send-quote', {
                method: 'POST',
                headers,
                body: JSON.stringify({ quoteId, type: 'send' }),
            })

            if (!res.ok) throw new Error('Failed to send')

            toast({
                title: "Quote Sent",
                description: `Quote #${quoteNumber} sent successfully via email`
            })
            mutate()
        } catch (error) {
            toast({ title: "Error", description: "Could not send quote email", variant: "destructive" })
        } finally {
            setIsSending(null)
        }
    }

    const handleSendReminder = async (quoteId: string, quoteNumber: string) => {
        setIsSending(quoteId)
        try {
            const headers = await getAuthHeaders()
            const res = await fetch('/api/admin/send-quote', {
                method: 'POST',
                headers,
                body: JSON.stringify({ quoteId, type: 'reminder' }),
            })

            if (!res.ok) throw new Error('Failed to send')

            toast({ title: "Reminder Sent", description: `Reminder for quote #${quoteNumber} sent successfully` })
            mutate()
        } catch (error) {
            toast({ title: "Error", description: "Could not send reminder", variant: "destructive" })
        } finally {
            setIsSending(null)
        }
    }

    const handleSendWhatsApp = async (quoteId: string, quoteNumber: string) => {
        setIsSending(quoteId)
        try {
            const headers = await getAuthHeaders()
            const res = await fetch('/api/admin/send-whatsapp-quote', {
                method: 'POST',
                headers,
                body: JSON.stringify({ quoteId, type: 'send' }),
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || 'Failed to send')
            }

            toast({ title: "Quote Sent via WhatsApp", description: `Quote #${quoteNumber} sent successfully` })
            mutate()
        } catch (error) {
            toast({ title: "Error", description: error instanceof Error ? error.message : "WhatsApp Error", variant: "destructive" })
        } finally {
            setIsSending(null)
        }
    }

    const handleSendWhatsAppReminder = async (quoteId: string, quoteNumber: string) => {
        setIsSending(quoteId)
        try {
            const headers = await getAuthHeaders()
            const res = await fetch('/api/admin/send-whatsapp-quote', {
                method: 'POST',
                headers,
                body: JSON.stringify({ quoteId, type: 'reminder' }),
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || 'Failed to send')
            }

            toast({ title: "Reminder Sent via WhatsApp", description: `WhatsApp reminder for #${quoteNumber} sent` })
            mutate()
        } catch (error) {
            toast({ title: "Error", description: "Could not send WhatsApp reminder", variant: "destructive" })
        } finally {
            setIsSending(null)
        }
    }

    const handleShareOnSocial = async (quoteId: string, channel: 'whatsapp' | 'viber') => {
        try {
            const headers = await getAuthHeaders()
            const res = await fetch('/api/admin/share-quote', {
                method: 'POST',
                headers,
                body: JSON.stringify({ quoteId, channel }),
            })

            if (!res.ok) throw new Error('Failed to generate share link')

            const data = await res.json()
            window.open(data.shareUrl, '_blank')

            toast({ title: "Share Link Opened", description: `Opening ${channel}...` })
        } catch (error) {
            toast({ title: "Error", description: `Could not share on ${channel}`, variant: "destructive" })
        }
    }

    const stats = {
        total: quotes.length,
        pending: quotes.filter(q => q.status === 'pending').length,
        processing: quotes.filter(q => q.status === 'processing').length,
        completed: quotes.filter(q => q.status === 'completed').length,
        totalValue: quotes.reduce((sum, q) => sum + (q.total || 0), 0)
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="font-serif text-2xl text-foreground">Quotes</h1>
                    <p className="text-muted-foreground mt-1">Manage and track all quote requests</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="h-10 px-3 rounded-md border border-input bg-background text-sm"
                    >
                        <option value="all">All Status ({quotes.length})</option>
                        <option value="pending">Pending ({stats.pending})</option>
                        <option value="processing">Processing ({stats.processing})</option>
                        <option value="completed">Completed ({stats.completed})</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="expired">Expired</option>
                    </select>

                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="h-10 px-3 rounded-md border border-input bg-background text-sm"
                    >
                        <option value="date">Sort by Date</option>
                        <option value="amount">Sort by Amount</option>
                        <option value="status">Sort by Status</option>
                    </select>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    >
                        {sortOrder === 'asc' ? '↑' : '↓'}
                    </Button>

                    <Button variant="outline" className="gap-2 bg-transparent">
                        <FileText className="w-4 h-4" /> Export CSV
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-card border border-border rounded-lg p-4">
                    <p className="text-xs text-muted-foreground uppercase font-medium">Total Quotes</p>
                    <p className="text-2xl font-bold text-foreground mt-2">{stats.total}</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-4">
                    <p className="text-xs text-muted-foreground uppercase font-medium">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600 mt-2">{stats.pending}</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-4">
                    <p className="text-xs text-muted-foreground uppercase font-medium">Processing</p>
                    <p className="text-2xl font-bold text-blue-600 mt-2">{stats.processing}</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-4">
                    <p className="text-xs text-muted-foreground uppercase font-medium">Total Value</p>
                    <p className="text-xl font-bold text-primary mt-2">PHP {(stats.totalValue / 1000000).toFixed(1)}M</p>
                </div>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                ) : filteredQuotes.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">No quotes found</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Quote</th>
                                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Customer</th>
                                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3 hidden md:table-cell">Channel</th>
                                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Amount</th>
                                    <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Status</th>
                                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredQuotes.map((quote) => (
                                    <tr
                                        key={quote.id}
                                        className="hover:bg-muted/30 transition-colors cursor-pointer"
                                        onClick={() => {
                                            setSelectedQuote(quote)
                                            setModalOpen(true)
                                        }}
                                    >
                                        <td className="px-4 py-3">
                                            <p className="text-sm font-mono font-medium text-foreground">{quote.quote_number}</p>
                                            <p className="text-xs text-muted-foreground">{new Date(quote.created_at).toLocaleDateString()}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="text-sm font-medium text-foreground">{quote.customers?.name || 'Unknown'}</p>
                                            <p className="text-xs text-muted-foreground">{quote.customers?.email}</p>
                                        </td>
                                        <td className="px-4 py-3 hidden md:table-cell">
                                            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                                                {quote.delivery_channel === 'whatsapp' ? <MessageCircle className="w-4 h-4 text-green-600" /> :
                                                    quote.delivery_channel === 'viber' ? <Phone className="w-4 h-4 text-purple-600" /> :
                                                        <Mail className="w-4 h-4 text-blue-600" />}
                                                <span className="capitalize">{quote.delivery_channel}</span>
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <p className="text-sm font-medium text-foreground">PHP {quote.total?.toLocaleString() ?? 0}</p>
                                        </td>
                                        <td className="px-4 py-3 text-center hidden sm:table-cell">
                                            <div className="flex items-center justify-center gap-2">
                                                {isUpdating === quote.id && <Loader2 className="w-3 h-3 animate-spin" />}
                                                <select
                                                    value={quote.status}
                                                    disabled={isUpdating === quote.id}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onChange={(e) => updateQuoteStatus(quote.id, e.target.value)}
                                                    className="text-xs px-2 py-1 rounded border border-input bg-background cursor-pointer outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                                                >
                                                    <option value="pending">Pending</option>
                                                    <option value="draft">Draft</option>
                                                    <option value="processing">Processing</option>
                                                    <option value="completed">Completed</option>
                                                    <option value="cancelled">Cancelled</option>
                                                    <option value="expired">Expired</option>
                                                </select>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1 flex-wrap">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 hover:text-blue-600"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleSendQuote(quote.id, quote.quote_number)
                                                    }}
                                                    disabled={isSending === quote.id}
                                                    title="Send Quote Email"
                                                >
                                                    {isSending === quote.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Send className="w-4 h-4" />
                                                    )}
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 hover:text-orange-600"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleSendReminder(quote.id, quote.quote_number)
                                                    }}
                                                    disabled={isSending === quote.id}
                                                    title="Send Reminder"
                                                >
                                                    {isSending === quote.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Bell className="w-4 h-4" />
                                                    )}
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 hover:text-green-600"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleSendWhatsApp(quote.id, quote.quote_number)
                                                    }}
                                                    disabled={isSending === quote.id}
                                                    title="Send via WhatsApp"
                                                >
                                                    {isSending === quote.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <MessageSquare className="w-4 h-4" />
                                                    )}
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 hover:text-primary"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleDownloadPdf(quote.id, quote.quote_number)
                                                    }}
                                                    title="Download PDF"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 hover:text-emerald-600"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleSendWhatsAppReminder(quote.id, quote.quote_number)
                                                    }}
                                                    disabled={isSending === quote.id}
                                                    title="Send WhatsApp Reminder"
                                                >
                                                    {isSending === quote.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <MessageCircle className="w-4 h-4" />
                                                    )}
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 hover:text-purple-600"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleShareOnSocial(quote.id, 'viber')
                                                    }}
                                                    title="Share on Viber"
                                                >
                                                    <Phone className="w-4 h-4" />
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 hover:text-muted-foreground"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        mutate()
                                                    }}
                                                    title="Refresh"
                                                >
                                                    <RefreshCw className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <QuoteDetailsModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                quote={selectedQuote}
                onDownloadPdf={handleDownloadPdf}
                onSendQuote={handleSendQuote}
                onSendReminder={handleSendReminder}
                onShare={handleShareOnSocial}
                isSending={isSending === selectedQuote?.id}
            />
        </div>
    )
}