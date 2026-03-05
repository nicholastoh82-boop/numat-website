'use client'

import React, { useState, useRef } from 'react'
import useSWR from 'swr'
import Image from 'next/image'
import { Plus, Search, Edit2, Trash2, ChevronDown, ChevronUp, Loader2, Upload, X, ImageIcon, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

// Type definition based strictly on SQL schema
type Product = {
    id?: string
    sku: string
    title: string
    size: string
    thickness_mm: number
    ply: string
    price: number
    base_price?: number
    moq: number
    lead_time_days: number
    category: string
    description: string
    image: string
    is_active: boolean
    is_featured: boolean
    categories?: { name: string }
}

const INITIAL_PRODUCT: Product = {
    sku: '',
    title: '',
    size: '',
    thickness_mm: 0,
    ply: '',
    price: 0,
    moq: 10,
    lead_time_days: 10,
    category: 'Structural',
    description: '',
    image: '',
    is_active: true,
    is_featured: false
}

const CATEGORY_OPTIONS = ['Structural', 'Furniture', 'Flooring', 'Doors', 'Cladding', 'Veneer', 'DIY Project', 'Other']

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function AdminProductsPage() {
    const { toast } = useToast()
    const { data: productsData, isLoading, mutate } = useSWR<Product[]>('/api/admin/products?includeInactive=true', fetcher)

    // UI State
    const [searchQuery, setSearchQuery] = useState('')
    const [expandedProduct, setExpandedProduct] = useState<string | null>(null)
    const [isProductModalOpen, setIsProductModalOpen] = useState(false)
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    // Form State
    const [currentProduct, setCurrentProduct] = useState<Product>(INITIAL_PRODUCT)
    const [productToDelete, setProductToDelete] = useState<string | null>(null)

    // Image Upload State
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    
    // Multiple images upload state
    const [multipleImageFiles, setMultipleImageFiles] = useState<File[]>([])
    const [uploadingImages, setUploadingImages] = useState(false)
    const multiImageInputRef = useRef<HTMLInputElement>(null)
    const [existingProductImages, setExistingProductImages] = useState<any[]>([])
    const [loadingImages, setLoadingImages] = useState(false)

    const products = Array.isArray(productsData) ? productsData : []

    const filteredProducts = products.filter(p =>
        p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Handlers
    const handleOpenAdd = () => {
        setCurrentProduct(INITIAL_PRODUCT)
        setImageFile(null)
        setImagePreview(null)
        setMultipleImageFiles([])
        setExistingProductImages([])
        if (fileInputRef.current) fileInputRef.current.value = ''
        if (multiImageInputRef.current) multiImageInputRef.current.value = ''
        setIsProductModalOpen(true)
    }

    const handleOpenEdit = (product: Product) => {
        setCurrentProduct(product)
        setImageFile(null)
        setImagePreview(product.image || null)
        setMultipleImageFiles([])
        setExistingProductImages([])
        
        // Fetch existing product images if product has ID
        if (product.id) {
            fetchProductImages(product.id)
        }
        
        setIsProductModalOpen(true)
    }

    const fetchProductImages = async (productId: string) => {
        try {
            setLoadingImages(true)
            const res = await fetch(`/api/products/${productId}/images`)
            if (res.ok) {
                const data = await res.json()
                setExistingProductImages(data.images || [])
            }
        } catch (error) {
            console.error('Failed to fetch product images:', error)
        } finally {
            setLoadingImages(false)
        }
    }

    const handleOpenDelete = (id: string) => {
        setProductToDelete(id)
        setIsDeleteAlertOpen(true)
    }

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            // Check file size (e.g., max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                toast({ title: "Error", description: "Image size must be less than 5MB", variant: "destructive" })
                return
            }
            setImageFile(file)
            // Create local preview URL
            const previewUrl = URL.createObjectURL(file)
            setImagePreview(previewUrl)
        }
    }

    const handleRemoveImage = () => {
        setImageFile(null)
        setImagePreview(null)
        setCurrentProduct({ ...currentProduct, image: '' })
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleMultipleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        if (files.length > 0) {
            // Check file sizes (e.g., max 5MB each)
            const validFiles = files.filter(file => {
                if (file.size > 5 * 1024 * 1024) {
                    toast({ title: "Error", description: `${file.name} is larger than 5MB`, variant: "destructive" })
                    return false
                }
                return true
            })
            setMultipleImageFiles(prev => [...prev, ...validFiles])
        }
    }

    const handleRemoveMultipleImage = (index: number) => {
        setMultipleImageFiles(prev => prev.filter((_, i) => i !== index))
    }



    const handleSaveProduct = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)

        try {
            let imageUrl = currentProduct.image
            let savedProductId = currentProduct.id

            // 1. Upload Image if a new file is selected
            if (imageFile) {
                const formData = new FormData()
                formData.append('file', imageFile)

                const uploadRes = await fetch('/api/admin/upload', {
                    method: 'POST',
                    body: formData,
                })

                if (!uploadRes.ok) throw new Error('Failed to upload image')

                const uploadData = await uploadRes.json()
                imageUrl = uploadData.url
            }

            // 2. Save Product Data
            const productToSave = { ...currentProduct, image: imageUrl }
            const isEditing = !!currentProduct.id
            const method = isEditing ? 'PATCH' : 'POST'
            const url = '/api/admin/products'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productToSave),
            })

            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || 'Failed to save product')
            }

            const savedProduct = await res.json()
            savedProductId = savedProduct.id

            // 3. Upload multiple images if any are selected (for both new and existing products)
            if (multipleImageFiles.length > 0 && savedProductId) {
                const formData = new FormData()
                multipleImageFiles.forEach(file => {
                    formData.append('images', file)
                })

                const uploadRes = await fetch(`/api/products/${savedProductId}/images`, {
                    method: 'POST',
                    body: formData,
                })

                if (!uploadRes.ok) {
                    console.error('Failed to upload additional images')
                    // Don't throw error - product was saved successfully
                } else {
                    const uploadData = await uploadRes.json()
                    console.log('Uploaded images:', uploadData)
                }
            }

            await mutate()
            setIsProductModalOpen(false)
            
            // Reset form state
            setCurrentProduct(INITIAL_PRODUCT)
            setImageFile(null)
            setImagePreview(null)
            setMultipleImageFiles([])
            setExistingProductImages([])
            if (fileInputRef.current) fileInputRef.current.value = ''
            if (multiImageInputRef.current) multiImageInputRef.current.value = ''
            
            toast({
                title: "Success",
                description: `Product ${isEditing ? 'updated' : 'created'} successfully${multipleImageFiles.length > 0 ? ` with ${multipleImageFiles.length} image(s)` : '.'}`
            })
        } catch (error) {
            console.error(error)
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Something went wrong",
                variant: "destructive"
            })
        } finally {
            setIsSaving(false)
        }
    }

    const handleDeleteConfirm = async () => {
        if (!productToDelete) return

        try {
            const res = await fetch(`/api/admin/products?id=${productToDelete}`, {
                method: 'DELETE',
            })

            if (!res.ok) throw new Error('Failed to delete')

            await mutate()
            toast({ title: "Deleted", description: "Product marked as inactive." })
        } catch (error) {
            toast({ title: "Error", description: "Could not delete product", variant: "destructive" })
        } finally {
            setIsDeleteAlertOpen(false)
            setProductToDelete(null)
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="font-serif text-2xl text-foreground">Products</h1>
                    <p className="text-muted-foreground mt-1">{products.length} products in catalog</p>
                </div>
                <Button onClick={handleOpenAdd} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                    <Plus className="w-4 h-4" />
                    Add Product
                </Button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search by name or SKU..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center p-8">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">SKU</th>
                                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Product</th>
                                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Category</th>
                                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Price</th>
                                    <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3 hidden md:table-cell">Status</th>
                                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredProducts.map((product) => (
                                    <React.Fragment key={product.id}>
                                        <tr className="hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3 text-sm font-mono text-foreground">{product.sku}</td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => setExpandedProduct(expandedProduct === product.id ? null : product.id!)}
                                                    className="flex items-center gap-2 text-left"
                                                >
                                                    {product.image ? (
                                                        <img src={product.image} alt="" className="w-8 h-8 rounded object-cover border border-border" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center border border-border">
                                                            <ImageIcon className="w-4 h-4 text-muted-foreground" />
                                                        </div>
                                                    )}
                                                    <span className="text-sm font-medium text-foreground">{product.title}</span>
                                                    {expandedProduct === product.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">
                                                {product.categories?.name || product.category || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium text-foreground text-right">
                                                {product.price ? `PHP ${product.price.toLocaleString()}` : 'Quote'}
                                            </td>
                                            <td className="px-4 py-3 text-center hidden md:table-cell">
                                                <span className={cn('text-xs px-2 py-0.5 rounded-full', product.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
                                                    {product.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(product)}>
                                                        <Edit2 className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleOpenDelete(product.id!)}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                        {expandedProduct === product.id && (
                                            <tr className="bg-muted/20">
                                                <td colSpan={6} className="px-4 py-4">
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                        <div><span className="text-muted-foreground">Size:</span> <span className="ml-2 text-foreground">{product.size}</span></div>
                                                        <div><span className="text-muted-foreground">Thickness:</span> <span className="ml-2 text-foreground">{product.thickness_mm} mm</span></div>
                                                        <div><span className="text-muted-foreground">Ply:</span> <span className="ml-2 text-foreground">{product.ply}</span></div>
                                                        <div><span className="text-muted-foreground">MOQ:</span> <span className="ml-2 text-foreground">{product.moq}</span></div>
                                                        <div className="col-span-2 md:col-span-4 mt-2">
                                                            <span className="text-muted-foreground block mb-1">Description:</span>
                                                            <p className="text-foreground">{product.description || 'No description available.'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Product Dialog */}
            <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{currentProduct.id ? 'Edit Product' : 'Add New Product'}</DialogTitle>
                        <DialogDescription>
                            Fill in the details below. Required fields must be populated to save.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveProduct} className="grid gap-4 py-4">
                        {/* Image Upload Section */}
                        <div className="flex flex-col gap-2">
                            <Label>Product Image</Label>
                            <div className="flex items-start gap-4">
                                <div className="relative w-24 h-24 border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-muted/50 overflow-hidden shrink-0">
                                    {imagePreview ? (
                                        <>
                                            <Image
                                                src={imagePreview}
                                                alt="Preview"
                                                fill
                                                className="object-cover"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleRemoveImage}
                                                className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white rounded-full p-0.5"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </>
                                    ) : (
                                        <ImageIcon className="w-8 h-8 text-muted-foreground" />
                                    )}
                                </div>
                                <div className="flex-1 space-y-2">
                                    <Input
                                        ref={fileInputRef}
                                        id="image"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        className="cursor-pointer"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Upload a product image (Max 5MB). PNG, JPG, or WEBP supported.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="sku">SKU *</Label>
                                <Input
                                    id="sku"
                                    value={currentProduct.sku}
                                    onChange={(e) => setCurrentProduct({ ...currentProduct, sku: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="title">Title *</Label>
                                <Input
                                    id="title"
                                    value={currentProduct.title}
                                    onChange={(e) => setCurrentProduct({ ...currentProduct, title: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="category">Category</Label>
                                <Select
                                    value={currentProduct.category}
                                    onValueChange={(value) => setCurrentProduct({ ...currentProduct, category: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CATEGORY_OPTIONS.map((cat) => (
                                            <SelectItem key={cat} value={cat}>
                                                {cat}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="price">Price (PHP) *</Label>
                                <Input
                                    id="price"
                                    type="number"
                                    min="0"
                                    value={currentProduct.price}
                                    onChange={(e) => setCurrentProduct({ ...currentProduct, price: parseFloat(e.target.value) })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="size">Size *</Label>
                                <Input
                                    id="size"
                                    placeholder="e.g. 4'x8'"
                                    value={currentProduct.size}
                                    onChange={(e) => setCurrentProduct({ ...currentProduct, size: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="thickness">Thickness (mm) *</Label>
                                <Input
                                    id="thickness"
                                    type="number"
                                    min="0"
                                    value={currentProduct.thickness_mm}
                                    onChange={(e) => setCurrentProduct({ ...currentProduct, thickness_mm: parseFloat(e.target.value) })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ply">Ply *</Label>
                                <Input
                                    id="ply"
                                    placeholder="e.g. 1ply"
                                    value={currentProduct.ply}
                                    onChange={(e) => setCurrentProduct({ ...currentProduct, ply: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="moq">MOQ</Label>
                                <Input
                                    id="moq"
                                    type="number"
                                    min="1"
                                    value={currentProduct.moq}
                                    onChange={(e) => setCurrentProduct({ ...currentProduct, moq: parseInt(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lead_time">Lead Time (days)</Label>
                                <Input
                                    id="lead_time"
                                    type="number"
                                    min="1"
                                    value={currentProduct.lead_time_days}
                                    onChange={(e) => setCurrentProduct({ ...currentProduct, lead_time_days: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                rows={3}
                                value={currentProduct.description || ''}
                                onChange={(e) => setCurrentProduct({ ...currentProduct, description: e.target.value })}
                            />
                        </div>

                        <div className="flex items-center space-x-2 pt-2">
                            <Switch
                                id="active"
                                checked={currentProduct.is_active}
                                onCheckedChange={(checked) => setCurrentProduct({ ...currentProduct, is_active: checked })}
                            />
                            <Label htmlFor="active">Is Active (Visible in Store)</Label>
                        </div>

                        {/* Multiple Images Upload Section */}
                        <div className="border-t pt-4 mt-4">
                            <Label className="mb-3 block">Product Gallery Images</Label>
                            <p className="text-xs text-muted-foreground mb-3">
                                Upload multiple images to showcase your product from different angles. These will appear in the product gallery on the detail page.
                            </p>
                            
                            {/* Existing images - show if product is being edited */}
                            {currentProduct.id && existingProductImages.length > 0 && (
                                <div className="mb-4 pb-4 border-b">
                                    <p className="text-sm font-medium text-foreground mb-2">
                                        Existing Images ({existingProductImages.length})
                                    </p>
                                    <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                                        {existingProductImages.map((image) => (
                                            <div key={image.id} className="relative w-24 h-24 border border-border rounded overflow-hidden bg-muted flex items-center justify-center group">
                                                <img
                                                    src={image.image_url}
                                                    alt={image.alt_text || 'Product image'}
                                                    className="w-full h-full object-cover"
                                                />
                                                {image.is_primary && (
                                                    <div className="absolute top-0.5 left-0.5 bg-primary/90 text-white text-xs px-1.5 py-0.5 rounded">
                                                        Primary
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* New images selection */}
                            <div className="space-y-3">
                                <Input
                                    ref={multiImageInputRef}
                                    id="multiImages"
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={handleMultipleImageChange}
                                    className="cursor-pointer"
                                />
                                
                                {/* Preview selected files */}
                                {multipleImageFiles.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium text-foreground">
                                            Selected: {multipleImageFiles.length} new image(s)
                                        </p>
                                        <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                                            {multipleImageFiles.map((file, index) => (
                                                <div key={index} className="relative w-24 h-24 border border-border rounded overflow-hidden bg-muted flex items-center justify-center">
                                                    <img
                                                        src={URL.createObjectURL(file)}
                                                        alt={file.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveMultipleImage(index)}
                                                        className="absolute top-0.5 right-0.5 bg-black/50 hover:bg-black/70 text-white rounded-full p-0.5"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsProductModalOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isSaving}>
                                {isSaving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {imageFile || multipleImageFiles.length > 0 ? 'Uploading & Saving...' : 'Saving...'}
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Save Product{multipleImageFiles.length > 0 ? ` with ${multipleImageFiles.length} image(s)` : ''}
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Alert */}
            <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will soft-delete the product (set to inactive). It will no longer appear in the store, but existing quotes will remain valid.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
