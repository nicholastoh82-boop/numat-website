'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function AdminSettingsPage() {
    return (
        <div className="space-y-8 max-w-2xl">
            <div>
                <h1 className="font-serif text-2xl text-foreground">Settings</h1>
                <p className="text-muted-foreground mt-1">Configure pricing rules and system settings</p>
            </div>

            {/* Discount Rules */}
            <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="font-semibold text-foreground mb-4">Bulk Discount Tiers</h2>
                <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-sm font-medium text-muted-foreground border-b border-border pb-2">
                        <span>Min Quantity</span>
                        <span>Max Quantity</span>
                        <span>Discount</span>
                    </div>
                    {[
                        { min: 20, max: 49, disc: '3%' },
                        { min: 50, max: 99, disc: '5%' },
                        { min: 100, max: 199, disc: '7%' },
                        { min: 200, max: 499, disc: '10%' },
                        { min: '500+', max: '-', disc: '15%' },
                    ].map((tier, i) => (
                        <div key={i} className="grid grid-cols-3 gap-4 text-sm">
                            <span className="text-foreground">{tier.min}</span>
                            <span className="text-foreground">{tier.max}</span>
                            <span className="text-primary font-medium">{tier.disc}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Quote Settings */}
            <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="font-semibold text-foreground mb-4">Quote Settings</h2>
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-foreground">Quote Validity (days)</label>
                        <Input type="number" defaultValue={14} className="max-w-32 mt-1.5" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-foreground">Default Lead Time (days)</label>
                        <Input type="number" defaultValue={10} className="max-w-32 mt-1.5" />
                    </div>
                </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="font-semibold text-foreground mb-4">Contact Information</h2>
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-foreground">WhatsApp Number</label>
                        <Input type="tel" defaultValue="+639123456789" className="mt-1.5" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-foreground">Sales Email</label>
                        <Input type="email" defaultValue="sales@numat.ph" className="mt-1.5" />
                    </div>
                </div>
            </div>

            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                Save Changes
            </Button>
        </div>
    )
}
