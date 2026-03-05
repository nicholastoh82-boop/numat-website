'use client'

import React from "react"

import { useState } from 'react'
import { Loader2, Send, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

const SUBJECTS = [
  { value: 'product', label: 'Product Inquiry' },
  { value: 'quote', label: 'Custom Quote Request' },
  { value: 'bulk', label: 'Bulk Order' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'other', label: 'Other' },
]

export function ContactForm() {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [submissionTime, setSubmissionTime] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    subject: '',
    message: '',
    honeypot: '', // Anti-spam honeypot field
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  React.useEffect(() => {
    // Track when form is mounted for bot detection
    setSubmissionTime(Date.now())
  }, [])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // Honeypot check (if filled, it's likely a bot)
    if (formData.honeypot.trim()) {
      console.warn('[Anti-Spam] Honeypot field was filled - likely spam bot')
      newErrors.honeypot = 'Invalid submission'
      setErrors(newErrors)
      return false
    }

    // Check submission time (less than 2 seconds likely bot)
    if (submissionTime && Date.now() - submissionTime < 2000) {
      newErrors.submit = 'Please take your time to fill out the form'
      setErrors(newErrors)
      return false
    }

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required'
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address'
      }
    }

    if (!formData.subject) {
      newErrors.subject = 'Please select a subject'
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required'
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields correctly.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          phone: formData.phone || null,
          company: formData.company || null,
          subject: SUBJECTS.find(s => s.value === formData.subject)?.label || formData.subject,
          message: formData.message,
          // Include metadata for backend spam detection
          submissionTime: submissionTime ? Date.now() - submissionTime : null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        if (response.status === 429) {
          throw new Error('Too many requests. Please wait before submitting again.')
        }
        throw new Error(data.error || `Server error: ${response.status}`)
      }

      const data = await response.json()

      if (data.ok) {
        setIsSuccess(true)
        toast({
          title: 'Message Sent!',
          description: 'Thank you for your inquiry. We will respond within 24-48 hours.',
        })
        // Reset form
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          company: '',
          subject: '',
          message: '',
          honeypot: '',
        })
        // Auto-reset success message after 5 seconds
        setTimeout(() => setIsSuccess(false), 5000)
      } else {
        throw new Error(data.error || 'Failed to submit inquiry')
      }
    } catch (error) {
      console.error('Inquiry submission error:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send message. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-primary" />
        </div>
        <h3 className="font-semibold text-lg text-foreground">Message Sent!</h3>
        <p className="text-muted-foreground mt-2">
          Thank you for your inquiry. We will respond within 24-48 hours.
        </p>
        <Button 
          variant="outline" 
          className="mt-6 bg-transparent"
          onClick={() => setIsSuccess(false)}
        >
          Send Another Message
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Honeypot field - hidden from real users */}
      <input
        type="text"
        name="honeypot"
        value={formData.honeypot}
        onChange={(e) => setFormData({ ...formData, honeypot: e.target.value })}
        style={{ display: 'none', visibility: 'hidden', height: 0, width: 0, position: 'absolute', pointerEvents: 'none' }}
        autoComplete="off"
        tabIndex={-1}
        aria-hidden="true"
      />
      
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">
            First Name <span className="text-destructive">*</span>
          </Label>
          <Input 
            id="firstName" 
            placeholder="Juan" 
            className={cn('mt-1.5', errors.firstName && 'border-destructive')}
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            disabled={isSubmitting}
          />
          {errors.firstName && <p className="text-destructive text-xs mt-1">{errors.firstName}</p>}
        </div>
        <div>
          <Label htmlFor="lastName">
            Last Name <span className="text-destructive">*</span>
          </Label>
          <Input 
            id="lastName" 
            placeholder="Cruz" 
            className={cn('mt-1.5', errors.lastName && 'border-destructive')}
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            disabled={isSubmitting}
          />
          {errors.lastName && <p className="text-destructive text-xs mt-1">{errors.lastName}</p>}
        </div>
      </div>
      <div>
        <Label htmlFor="email">
          Email <span className="text-destructive">*</span>
        </Label>
        <Input 
          id="email" 
          type="email" 
          placeholder="juan@company.com" 
          className={cn('mt-1.5', errors.email && 'border-destructive')}
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          disabled={isSubmitting}
        />
        {errors.email && <p className="text-destructive text-xs mt-1">{errors.email}</p>}
      </div>
      <div>
        <Label htmlFor="phone">Phone</Label>
        <Input 
          id="phone" 
          type="tel" 
          placeholder="+63 912 345 6789" 
          className="mt-1.5"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          disabled={isSubmitting}
        />
      </div>
      <div>
        <Label htmlFor="company">Company (Optional)</Label>
        <Input 
          id="company" 
          placeholder="Company Name" 
          className="mt-1.5"
          value={formData.company}
          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
          disabled={isSubmitting}
        />
      </div>
      <div>
        <Label htmlFor="subject">
          Subject <span className="text-destructive">*</span>
        </Label>
        <select 
          id="subject"
          className={cn(
            'w-full h-10 px-3 rounded-md border border-input bg-background text-sm mt-1.5 disabled:opacity-50 disabled:cursor-not-allowed',
            errors.subject && 'border-destructive'
          )}
          value={formData.subject}
          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
          disabled={isSubmitting}
        >
          <option value="">Select a subject</option>
          {SUBJECTS.map((subject) => (
            <option key={subject.value} value={subject.value}>
              {subject.label}
            </option>
          ))}
        </select>
        {errors.subject && <p className="text-destructive text-xs mt-1">{errors.subject}</p>}
      </div>
      <div>
        <Label htmlFor="message">
          Message <span className="text-destructive">*</span>
        </Label>
        <Textarea 
          id="message"
          rows={4}
          placeholder="Tell us about your project or inquiry..."
          className={cn('mt-1.5 resize-none', errors.message && 'border-destructive')}
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          disabled={isSubmitting}
        />
        {errors.message && <p className="text-destructive text-xs mt-1">{errors.message}</p>}
      </div>
      <Button 
        type="submit" 
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Send Message
          </>
        )}
      </Button>
    </form>
  )
}
