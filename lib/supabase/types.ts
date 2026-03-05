export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          image_url: string | null
          display_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          image_url?: string | null
          display_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          image_url?: string | null
          display_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          category_id: string | null
          image_url: string | null
          thickness: string | null
          width: string | null
          length: string | null
          color: string | null
          finish: string | null
          min_order_qty: number
          unit: string
          base_price: number | null
          is_featured: boolean
          is_active: boolean
          specifications: Json | null
          created_at: string
          updated_at: string,
          sku: string | null
          category: string | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          category_id?: string | null
          image_url?: string | null
          thickness?: string | null
          width?: string | null
          length?: string | null
          color?: string | null
          finish?: string | null
          min_order_qty?: number
          unit?: string
          base_price?: number | null
          is_featured?: boolean
          is_active?: boolean
          specifications?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          category_id?: string | null
          image_url?: string | null
          thickness?: string | null
          width?: string | null
          length?: string | null
          color?: string | null
          finish?: string | null
          min_order_qty?: number
          unit?: string
          base_price?: number | null
          is_featured?: boolean
          is_active?: boolean
          specifications?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          user_id: string | null
          company_name: string | null
          contact_name: string
          email: string
          phone: string | null
          whatsapp: string | null
          viber: string | null
          address: string | null
          city: string | null
          province: string | null
          country: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          company_name?: string | null
          contact_name: string
          email: string
          phone?: string | null
          whatsapp?: string | null
          viber?: string | null
          address?: string | null
          city?: string | null
          province?: string | null
          country?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          company_name?: string | null
          contact_name?: string
          email?: string
          phone?: string | null
          whatsapp?: string | null
          viber?: string | null
          address?: string | null
          city?: string | null
          province?: string | null
          country?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      quotes: {
        Row: {
          id: string
          quote_number: string
          customer_id: string | null
          status: string
          delivery_method: string
          delivery_address: string | null
          subtotal: number
          discount_amount: number
          total: number
          notes: string | null
          admin_notes: string | null
          valid_until: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          quote_number: string
          customer_id?: string | null
          status?: string
          delivery_method: string
          delivery_address?: string | null
          subtotal?: number
          discount_amount?: number
          total?: number
          notes?: string | null
          admin_notes?: string | null
          valid_until?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          quote_number?: string
          customer_id?: string | null
          status?: string
          delivery_method?: string
          delivery_address?: string | null
          subtotal?: number
          discount_amount?: number
          total?: number
          notes?: string | null
          admin_notes?: string | null
          valid_until?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      quote_items: {
        Row: {
          id: string
          quote_id: string
          product_id: string | null
          product_name: string
          product_specs: string | null
          quantity: number
          unit_price: number
          total_price: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          quote_id: string
          product_id?: string | null
          product_name: string
          product_specs?: string | null
          quantity: number
          unit_price?: number
          total_price?: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          quote_id?: string
          product_id?: string | null
          product_name?: string
          product_specs?: string | null
          quantity?: number
          unit_price?: number
          total_price?: number
          notes?: string | null
          created_at?: string
        }
      }
      inquiries: {
        Row: {
          id: string
          name: string
          email: string
          phone: string | null
          company: string | null
          subject: string
          message: string
          status: string
          admin_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          phone?: string | null
          company?: string | null
          subject: string
          message: string
          status?: string
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          phone?: string | null
          company?: string | null
          subject?: string
          message?: string
          status?: string
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      admin_profiles: {
        Row: {
          id: string
          user_id: string
          role: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

export type Category = Database['public']['Tables']['categories']['Row']
export type Product = Database['public']['Tables']['products']['Row']
export type Customer = Database['public']['Tables']['customers']['Row']
export type Quote = Database['public']['Tables']['quotes']['Row']
export type QuoteItem = Database['public']['Tables']['quote_items']['Row']
export type Inquiry = Database['public']['Tables']['inquiries']['Row']
export type AdminProfile = Database['public']['Tables']['admin_profiles']['Row']

export type QuoteWithItems = Quote & {
  quote_items: QuoteItem[]
  customers: Customer | null
}

export type ProductWithCategory = Product & {
  categories: Category | null
}
