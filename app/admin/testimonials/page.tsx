'use client'

import React, { useMemo, useState } from 'react'
import useSWR from 'swr'
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Loader2,
  Save,
  MessageSquareQuote,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

type Testimonial = {
  id?: string
  name: string
  location: string
  testimonial: string
  is_active: boolean
  sort_order?: number
  created_at?: string
  updated_at?: string
}

const INITIAL_TESTIMONIAL: Testimonial = {
  name: '',
  location: '',
  testimonial: '',
  is_active: true,
  sort_order: 0,
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch data')
  return res.json()
}

export default function AdminTestimonialsPage() {
  const { toast } = useToast()
  const {
    data: testimonialsData,
    isLoading,
    mutate,
  } = useSWR<Testimonial[]>('/api/admin/testimonials', fetcher)

  const testimonials = Array.isArray(testimonialsData) ? testimonialsData : []

  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [currentTestimonial, setCurrentTestimonial] =
    useState<Testimonial>(INITIAL_TESTIMONIAL)
  const [testimonialToDelete, setTestimonialToDelete] = useState<string | null>(null)

  const filteredTestimonials = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return testimonials

    return testimonials.filter((item) => {
      return (
        item.name?.toLowerCase().includes(q) ||
        item.location?.toLowerCase().includes(q) ||
        item.testimonial?.toLowerCase().includes(q)
      )
    })
  }, [testimonials, searchQuery])

  const handleOpenAdd = () => {
    setCurrentTestimonial(INITIAL_TESTIMONIAL)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (item: Testimonial) => {
    setCurrentTestimonial({
      id: item.id,
      name: item.name || '',
      location: item.location || '',
      testimonial: item.testimonial || '',
      is_active: item.is_active ?? true,
      sort_order: item.sort_order ?? 0,
    })
    setIsModalOpen(true)
  }

  const handleOpenDelete = (id: string) => {
    setTestimonialToDelete(id)
    setIsDeleteAlertOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const isEditing = Boolean(currentTestimonial.id)
      const method = isEditing ? 'PATCH' : 'POST'

      const res = await fetch('/api/admin/testimonials', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(currentTestimonial),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => null)
        throw new Error(errorData?.error || 'Failed to save testimonial')
      }

      await mutate()
      setIsModalOpen(false)
      setCurrentTestimonial(INITIAL_TESTIMONIAL)

      toast({
        title: 'Success',
        description: `Testimonial ${isEditing ? 'updated' : 'created'} successfully.`,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Something went wrong.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!testimonialToDelete) return

    try {
      const res = await fetch(`/api/admin/testimonials?id=${testimonialToDelete}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => null)
        throw new Error(errorData?.error || 'Failed to delete testimonial')
      }

      await mutate()

      toast({
        title: 'Deleted',
        description: 'Testimonial removed successfully.',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Could not delete testimonial.',
        variant: 'destructive',
      })
    } finally {
      setIsDeleteAlertOpen(false)
      setTestimonialToDelete(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-serif text-2xl text-foreground">Testimonials</h1>
          <p className="mt-1 text-muted-foreground">
            Manage customer testimonials shown on the website.
          </p>
        </div>

        <Button
          onClick={handleOpenAdd}
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Testimonial
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search by name, location, or testimonial..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filteredTestimonials.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 text-center">
            <MessageSquareQuote className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-medium text-foreground">No testimonials found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add your first testimonial or adjust your search.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredTestimonials.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold text-foreground">
                      {item.name || 'Unnamed'}
                    </p>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs',
                        item.is_active
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {item.is_active ? 'Active' : 'Hidden'}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.location || 'No location'}
                  </p>

                  <p className="mt-3 max-w-3xl whitespace-pre-line text-sm leading-6 text-foreground">
                    {item.testimonial}
                  </p>

                  <div className="mt-3 text-xs text-muted-foreground">
                    Sort order: {item.sort_order ?? 0}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleOpenEdit(item)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => item.id && handleOpenDelete(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {currentTestimonial.id ? 'Edit Testimonial' : 'Add Testimonial'}
            </DialogTitle>
            <DialogDescription>
              Update the testimonial content shown on the website.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="grid gap-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={currentTestimonial.name}
                  onChange={(e) =>
                    setCurrentTestimonial((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  value={currentTestimonial.location}
                  onChange={(e) =>
                    setCurrentTestimonial((prev) => ({
                      ...prev,
                      location: e.target.value,
                    }))
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="testimonial">Testimonial *</Label>
              <Textarea
                id="testimonial"
                rows={6}
                value={currentTestimonial.testimonial}
                onChange={(e) =>
                  setCurrentTestimonial((prev) => ({
                    ...prev,
                    testimonial: e.target.value,
                  }))
                }
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sort_order">Sort Order</Label>
                <Input
                  id="sort_order"
                  type="number"
                  value={currentTestimonial.sort_order ?? 0}
                  onChange={(e) =>
                    setCurrentTestimonial((prev) => ({
                      ...prev,
                      sort_order: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>

              <div className="flex items-center space-x-2 pt-8">
                <Switch
                  id="is_active"
                  checked={currentTestimonial.is_active}
                  onCheckedChange={(checked) =>
                    setCurrentTestimonial((prev) => ({
                      ...prev,
                      is_active: checked,
                    }))
                  }
                />
                <Label htmlFor="is_active">Visible on website</Label>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>

              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Testimonial
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this testimonial?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the testimonial from your admin list and website output.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}