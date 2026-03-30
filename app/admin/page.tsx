'use client'

import useSWR from 'swr'
import { MessageCircle, Mail, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
// You might need to update this import if your types are strict, 
// or simply cast the data inside the component if the type definition is outdated.
import type { QuoteWithItems, ProductWithCategory, Inquiry } from '@/lib/supabase/types'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function AdminOverviewPage() {
  const { data: quotesData } = useSWR<any[]>('/api/admin/quotes', fetcher) // Changed type to any[] temporarily to avoid type conflicts if interface is outdated
  const { data: productsData } = useSWR<ProductWithCategory[]>('/api/products', fetcher)
  const { data: inquiriesData } = useSWR<Inquiry[]>('/api/inquiries', fetcher)

  // Safe access
  const quotes = Array.isArray(quotesData) ? quotesData : []
  const products = Array.isArray(productsData) ? productsData : []
  const inquiries = Array.isArray(inquiriesData) ? inquiriesData : []

  const pendingQuotes = quotes.filter(q => q.status === 'pending').length
  const totalRevenue = quotes.reduce((sum, q) => sum + (q.status === 'completed' ? q.total : 0), 0)
  const recentQuotes = quotes.slice(0, 3)

  if (!quotesData && !productsData) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-2xl text-foreground">Dashboard Overview</h1>
        <p className="text-muted-foreground mt-1">Welcome back! Here&apos;s what&apos;s happening.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard label="Total Products" value={products.length} subtext="Active in catalog" />
        <StatsCard label="Total Quotes" value={quotes.length} subtext={`${pendingQuotes} pending`} />
        <StatsCard label="New Inquiries" value={inquiries.filter(i => i.status === 'new').length} subtext="Awaiting response" />
        <StatsCard label="Revenue (Completed)" value={`PHP ${totalRevenue.toLocaleString()}`} subtext="From completed quotes" />
      </div>

      {/* Recent Quotes Panel */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Recent Quotes</h2>
          <Button variant="ghost" size="sm" className="text-primary" asChild>
            <a href="/admin/quotes">View All</a>
          </Button>
        </div>
        <div className="divide-y divide-border">
          {recentQuotes.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No quotes yet</div>
          ) : (
            recentQuotes.map((quote) => (
              <div key={quote.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    {/* FIXED: Changed delivery_method to delivery_channel to match your schema */}
                    {quote.delivery_channel === 'whatsapp' ? <MessageCircle className="w-5 h-5 text-green-600" /> :
                        <Mail className="w-5 h-5 text-blue-600" />}
                  </div>
                  <div>
                    {/* FIXED: Changed contact_name to name */}
                    <p className="font-medium text-foreground">{quote.customers?.name || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">{quote.quote_number}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-foreground">PHP {quote.total?.toLocaleString() ?? 0}</p>
                  <StatusBadge status={quote.status} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// Helper components for this page
function StatsCard({ label, value, subtext }: { label: string, value: string | number, subtext: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-serif text-2xl text-foreground mt-1">{value}</p>
      <p className="text-xs text-primary mt-2">{subtext}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      'text-xs px-2 py-0.5 rounded-full capitalize',
      status === 'completed' ? 'bg-primary/10 text-primary' :
        status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
          'bg-muted text-muted-foreground'
    )}>
      {status}
    </span>
  )
}