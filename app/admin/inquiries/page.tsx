'use client'

import React, { useState } from 'react'
import useSWR from 'swr'
import { CheckCircle, Loader2, Archive, MailOpen, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

// Define type based on SQL schema
type Inquiry = {
    id: string
    name: string
    email: string
    phone?: string
    company?: string
    subject: string
    message: string
    status: 'new' | 'read' | 'replied' | 'archived'
    created_at: string
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function AdminInquiriesPage() {
    const { toast } = useToast()

    // CHANGED: Using /api/inquiries to match your Dashboard page. 
    // If you strictly use /api/admin/inquiries, change it back, but ensure that file exists.
    const { data: inquiriesData, isLoading, mutate } = useSWR<any>('/api/inquiries', fetcher)
    const [statusFilter, setStatusFilter] = useState<string>('all')

    // FIXED: Safely extract array whether API returns [ ... ] or { data: [ ... ] }
    const inquiries: Inquiry[] = React.useMemo(() => {
        if (!inquiriesData) return []
        if (Array.isArray(inquiriesData)) return inquiriesData
        if (Array.isArray(inquiriesData.data)) return inquiriesData.data
        return []
    }, [inquiriesData])

    const filteredInquiries = inquiries
        .filter(i => statusFilter === 'all' || i.status === statusFilter)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) // Sort newest first

    const updateStatus = async (id: string, newStatus: string) => {
        try {
            const res = await fetch('/api/inquiries', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: newStatus }),
            })

            if (!res.ok) throw new Error("Failed to update")

            mutate()
            toast({ title: "Updated", description: `Inquiry marked as ${newStatus}` })
        } catch (e) {
            toast({ title: "Error", description: "Failed to update status", variant: "destructive" })
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this inquiry?')) return

        try {
            const res = await fetch(`/api/inquiries?id=${id}`, {
                method: 'DELETE',
            })

            if (!res.ok) throw new Error("Failed to delete")

            mutate()
            toast({ title: "Deleted", description: "Inquiry removed successfully" })
        } catch (e) {
            toast({ title: "Error", description: "Failed to delete inquiry", variant: "destructive" })
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="font-serif text-2xl text-foreground">Inquiries</h1>
                    <p className="text-muted-foreground mt-1">Contact form submissions and messages</p>
                </div>
                <div className="flex gap-2">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="h-10 px-3 rounded-md border border-input bg-background text-sm"
                    >
                        <option value="all">All Status</option>
                        <option value="new">New</option>
                        <option value="read">Read</option>
                        <option value="replied">Replied</option>
                        <option value="archived">Archived</option>
                    </select>
                </div>
            </div>

            <div className="space-y-4">
                {isLoading ? (
                    <div className="flex items-center justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                ) : filteredInquiries.length === 0 ? (
                    <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
                        {statusFilter === 'all' ? 'No inquiries found' : `No ${statusFilter} inquiries found`}
                    </div>
                ) : (
                    filteredInquiries.map((inquiry) => (
                        <div key={inquiry.id} className="bg-card border border-border rounded-xl p-4 transition-all hover:shadow-sm">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="font-semibold text-lg text-foreground">{inquiry.subject}</h3>
                                        <span className={cn(
                                            'text-xs px-2 py-0.5 rounded-full capitalize font-medium',
                                            inquiry.status === 'new' ? 'bg-yellow-100 text-yellow-700' :
                                                inquiry.status === 'read' ? 'bg-blue-100 text-blue-700' :
                                                    inquiry.status === 'replied' ? 'bg-green-100 text-green-700' :
                                                        'bg-gray-100 text-gray-700'
                                        )}>
                                            {inquiry.status}
                                        </span>
                                    </div>

                                    <div className="grid sm:grid-cols-2 gap-2 text-sm mb-3">
                                        <p className="text-muted-foreground">
                                            <span className="font-medium text-foreground">From:</span> {inquiry.name}
                                        </p>
                                        <p className="text-muted-foreground">
                                            <span className="font-medium text-foreground">Email:</span> {inquiry.email}
                                        </p>
                                        {inquiry.phone && (
                                            <p className="text-muted-foreground">
                                                <span className="font-medium text-foreground">Phone:</span> {inquiry.phone}
                                            </p>
                                        )}
                                        {inquiry.company && (
                                            <p className="text-muted-foreground">
                                                <span className="font-medium text-foreground">Company:</span> {inquiry.company}
                                            </p>
                                        )}
                                    </div>

                                    <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                                        <p className="text-sm text-foreground whitespace-pre-wrap">{inquiry.message}</p>
                                    </div>

                                    <p className="text-xs text-muted-foreground mt-3">
                                        Received: {new Date(inquiry.created_at).toLocaleString()}
                                    </p>
                                </div>

                                <div className="flex flex-col gap-2">
                                    {inquiry.status === 'new' && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 w-8 p-0 text-blue-600 border-blue-200 hover:bg-blue-50"
                                            onClick={() => updateStatus(inquiry.id, 'read')}
                                            title="Mark as Read"
                                        >
                                            <MailOpen className="w-4 h-4" />
                                        </Button>
                                    )}

                                    {inquiry.status === 'read' && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 w-8 p-0 text-green-600 border-green-200 hover:bg-green-50"
                                            onClick={() => updateStatus(inquiry.id, 'replied')}
                                            title="Mark as Replied"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                        </Button>
                                    )}

                                    {inquiry.status !== 'archived' && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                            onClick={() => updateStatus(inquiry.id, 'archived')}
                                            title="Archive"
                                        >
                                            <Archive className="w-4 h-4" />
                                        </Button>
                                    )}

                                    {/* Delete Button (Optional) */}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                                        onClick={() => handleDelete(inquiry.id)}
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}