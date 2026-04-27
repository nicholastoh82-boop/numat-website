export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      accounts_receivable: {
        Row: {
          created_at: string
          currency: string
          customer: string
          due_date: string
          id: string
          invoice_date: string
          invoice_number: string
          invoice_value: number
          notes: string | null
          outstanding_amount: number | null
          paid_amount: number | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          customer: string
          due_date: string
          id?: string
          invoice_date: string
          invoice_number: string
          invoice_value: number
          notes?: string | null
          outstanding_amount?: number | null
          paid_amount?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          customer?: string
          due_date?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          invoice_value?: number
          notes?: string | null
          outstanding_amount?: number | null
          paid_amount?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_profiles: {
        Row: {
          created_at: string
          id: string
          role: string
        }
        Insert: {
          created_at?: string
          id: string
          role?: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: []
      }
      admin_settings: {
        Row: {
          bulk_discount_tiers: Json
          default_lead_time_days: number
          id: string
          quote_validity_days: number
          sales_email: string
          updated_at: string
          whatsapp_number: string
        }
        Insert: {
          bulk_discount_tiers?: Json
          default_lead_time_days?: number
          id?: string
          quote_validity_days?: number
          sales_email?: string
          updated_at?: string
          whatsapp_number?: string
        }
        Update: {
          bulk_discount_tiers?: Json
          default_lead_time_days?: number
          id?: string
          quote_validity_days?: number
          sales_email?: string
          updated_at?: string
          whatsapp_number?: string
        }
        Relationships: []
      }
      campaign_messages: {
        Row: {
          bounce_reason: string | null
          bounced_at: string | null
          campaign_id: string
          clicked_at: string | null
          created_at: string | null
          email_body: string
          email_subject: string
          email_to: string
          gmail_message_id: string | null
          id: string
          lead_id: string
          opened_at: string | null
          rep_assigned: string
          rep_email: string | null
          rep_reply_to: string | null
          replied_at: string | null
          scheduled_for: string
          sent_at: string | null
          sequence_variant: string | null
          skipped_reason: string | null
          status: string
          step_num: number
          subject_variant: string | null
          updated_at: string | null
        }
        Insert: {
          bounce_reason?: string | null
          bounced_at?: string | null
          campaign_id: string
          clicked_at?: string | null
          created_at?: string | null
          email_body: string
          email_subject: string
          email_to: string
          gmail_message_id?: string | null
          id?: string
          lead_id: string
          opened_at?: string | null
          rep_assigned: string
          rep_email?: string | null
          rep_reply_to?: string | null
          replied_at?: string | null
          scheduled_for: string
          sent_at?: string | null
          sequence_variant?: string | null
          skipped_reason?: string | null
          status?: string
          step_num: number
          subject_variant?: string | null
          updated_at?: string | null
        }
        Update: {
          bounce_reason?: string | null
          bounced_at?: string | null
          campaign_id?: string
          clicked_at?: string | null
          created_at?: string | null
          email_body?: string
          email_subject?: string
          email_to?: string
          gmail_message_id?: string | null
          id?: string
          lead_id?: string
          opened_at?: string | null
          rep_assigned?: string
          rep_email?: string | null
          rep_reply_to?: string | null
          replied_at?: string | null
          scheduled_for?: string
          sent_at?: string | null
          sequence_variant?: string | null
          skipped_reason?: string | null
          status?: string
          step_num?: number
          subject_variant?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "master_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          analyzed_at: string | null
          buying_signals: string[] | null
          close_stage: string | null
          content: string
          content_en: string | null
          created_at: string
          detected_dialect: string | null
          detected_language: string | null
          id: string
          intent_tags: string[] | null
          knowledge_used: string[] | null
          objections: string[] | null
          role: string
          sentiment: string | null
          session_id: string
        }
        Insert: {
          analyzed_at?: string | null
          buying_signals?: string[] | null
          close_stage?: string | null
          content: string
          content_en?: string | null
          created_at?: string
          detected_dialect?: string | null
          detected_language?: string | null
          id?: string
          intent_tags?: string[] | null
          knowledge_used?: string[] | null
          objections?: string[] | null
          role: string
          sentiment?: string | null
          session_id: string
        }
        Update: {
          analyzed_at?: string | null
          buying_signals?: string[] | null
          close_stage?: string | null
          content?: string
          content_en?: string | null
          created_at?: string
          detected_dialect?: string | null
          detected_language?: string | null
          id?: string
          intent_tags?: string[] | null
          knowledge_used?: string[] | null
          objections?: string[] | null
          role?: string
          sentiment?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "nara_session_rollup"
            referencedColumns: ["session_id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          buying_signal_count: number | null
          close_quality_score: number | null
          completed: boolean
          final_stage: string | null
          id: string
          lead_submitted: boolean
          message_count: number | null
          objection_count: number | null
          outcome: string | null
          page_url: string | null
          primary_dialect: string | null
          primary_language: string | null
          session_analyzed_at: string | null
          started_at: string
          user_agent: string | null
        }
        Insert: {
          buying_signal_count?: number | null
          close_quality_score?: number | null
          completed?: boolean
          final_stage?: string | null
          id: string
          lead_submitted?: boolean
          message_count?: number | null
          objection_count?: number | null
          outcome?: string | null
          page_url?: string | null
          primary_dialect?: string | null
          primary_language?: string | null
          session_analyzed_at?: string | null
          started_at?: string
          user_agent?: string | null
        }
        Update: {
          buying_signal_count?: number | null
          close_quality_score?: number | null
          completed?: boolean
          final_stage?: string | null
          id?: string
          lead_submitted?: boolean
          message_count?: number | null
          objection_count?: number | null
          outcome?: string | null
          page_url?: string | null
          primary_dialect?: string | null
          primary_language?: string | null
          session_analyzed_at?: string | null
          started_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      claude_usage_baseline: {
        Row: {
          id: number
          iris_messages_count: number
          nara_chat_messages_count: number
          nara_sessions_analyzed_count: number
          notes: string | null
          snapshot_at: string
          starting_balance_usd: number
          system_replies_count: number
        }
        Insert: {
          id?: never
          iris_messages_count: number
          nara_chat_messages_count: number
          nara_sessions_analyzed_count: number
          notes?: string | null
          snapshot_at?: string
          starting_balance_usd: number
          system_replies_count: number
        }
        Update: {
          id?: never
          iris_messages_count?: number
          nara_chat_messages_count?: number
          nara_sessions_analyzed_count?: number
          notes?: string | null
          snapshot_at?: string
          starting_balance_usd?: number
          system_replies_count?: number
        }
        Relationships: []
      }
      claude_usage_cost_model: {
        Row: {
          estimated_cost_per_call_usd: number
          model: string
          notes: string | null
          source: string
        }
        Insert: {
          estimated_cost_per_call_usd: number
          model: string
          notes?: string | null
          source: string
        }
        Update: {
          estimated_cost_per_call_usd?: number
          model?: string
          notes?: string | null
          source?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          active: boolean | null
          created_at: string | null
          domain: string | null
          id: string
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          domain?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          domain?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      company_research: {
        Row: {
          company_domain: string
          company_name: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          pain_hooks: Json | null
          product_recommendations: Json | null
          research_data: Json | null
          research_quality: string | null
          researched_at: string | null
          source_urls: string[] | null
          updated_at: string | null
        }
        Insert: {
          company_domain: string
          company_name?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          pain_hooks?: Json | null
          product_recommendations?: Json | null
          research_data?: Json | null
          research_quality?: string | null
          researched_at?: string | null
          source_urls?: string[] | null
          updated_at?: string | null
        }
        Update: {
          company_domain?: string
          company_name?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          pain_hooks?: Json | null
          product_recommendations?: Json | null
          research_data?: Json | null
          research_quality?: string | null
          researched_at?: string | null
          source_urls?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      config_kv: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      crm_users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          name: string
          rep_assigned_name: string | null
          role: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          is_active?: boolean | null
          name: string
          rep_assigned_name?: string | null
          role?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          name?: string
          rep_assigned_name?: string | null
          role?: string
        }
        Relationships: []
      }
      email_frames: {
        Row: {
          active: boolean | null
          approved_at: string | null
          approved_by: string | null
          body_template: string
          client_id: string
          created_at: string | null
          id: string
          name: string
          pain_angle: string | null
          product_focus: string | null
          segment: string
          step: number
          subject_template: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          active?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          body_template: string
          client_id: string
          created_at?: string | null
          id?: string
          name: string
          pain_angle?: string | null
          product_focus?: string | null
          segment: string
          step: number
          subject_template: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          active?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          body_template?: string
          client_id?: string
          created_at?: string | null
          id?: string
          name?: string
          pain_angle?: string | null
          product_focus?: string | null
          segment?: string
          step?: number
          subject_template?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "email_frames_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      email_suppression_list: {
        Row: {
          client_id: string
          email: string
          id: string
          notes: string | null
          reason: string
          source: string | null
          suppressed_at: string | null
        }
        Insert: {
          client_id: string
          email: string
          id?: string
          notes?: string | null
          reason: string
          source?: string | null
          suppressed_at?: string | null
        }
        Update: {
          client_id?: string
          email?: string
          id?: string
          notes?: string | null
          reason?: string
          source?: string | null
          suppressed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_suppression_list_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_accounts: {
        Row: {
          account_type: string
          code: string
          currency: string
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          opening_balance: number | null
          opening_balance_date: string | null
        }
        Insert: {
          account_type: string
          code: string
          currency: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          opening_balance?: number | null
          opening_balance_date?: string | null
        }
        Update: {
          account_type?: string
          code?: string
          currency?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          opening_balance?: number | null
          opening_balance_date?: string | null
        }
        Relationships: []
      }
      fin_categories: {
        Row: {
          code: string
          cost_center_id: number | null
          display_order: number | null
          id: number
          is_active: boolean | null
          is_income: boolean | null
          name: string
          pl_account_code: string | null
          pl_section: string | null
          ue_bucket: string | null
        }
        Insert: {
          code: string
          cost_center_id?: number | null
          display_order?: number | null
          id?: number
          is_active?: boolean | null
          is_income?: boolean | null
          name: string
          pl_account_code?: string | null
          pl_section?: string | null
          ue_bucket?: string | null
        }
        Update: {
          code?: string
          cost_center_id?: number | null
          display_order?: number | null
          id?: number
          is_active?: boolean | null
          is_income?: boolean | null
          name?: string
          pl_account_code?: string | null
          pl_section?: string | null
          ue_bucket?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_categories_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "fin_cost_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_classifications: {
        Row: {
          code: string
          display_order: number | null
          id: number
          is_active: boolean | null
          name: string
        }
        Insert: {
          code: string
          display_order?: number | null
          id?: number
          is_active?: boolean | null
          name: string
        }
        Update: {
          code?: string
          display_order?: number | null
          id?: number
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      fin_cost_centers: {
        Row: {
          classification_id: number | null
          code: string
          display_order: number | null
          id: number
          is_active: boolean | null
          name: string
        }
        Insert: {
          classification_id?: number | null
          code: string
          display_order?: number | null
          id?: number
          is_active?: boolean | null
          name: string
        }
        Update: {
          classification_id?: number | null
          code?: string
          display_order?: number | null
          id?: number
          is_active?: boolean | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_cost_centers_classification_id_fkey"
            columns: ["classification_id"]
            isOneToOne: false
            referencedRelation: "fin_classifications"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_fx_rates_monthly: {
        Row: {
          avg_rate: number
          end_rate: number | null
          month: number
          notes: string | null
          year: number
        }
        Insert: {
          avg_rate: number
          end_rate?: number | null
          month: number
          notes?: string | null
          year: number
        }
        Update: {
          avg_rate?: number
          end_rate?: number | null
          month?: number
          notes?: string | null
          year?: number
        }
        Relationships: []
      }
      fin_monthly_production: {
        Row: {
          entered_at: string | null
          entered_by: string | null
          month_start: string
          notes: string | null
          slats_produced: number | null
          veneers_produced: number | null
        }
        Insert: {
          entered_at?: string | null
          entered_by?: string | null
          month_start: string
          notes?: string | null
          slats_produced?: number | null
          veneers_produced?: number | null
        }
        Update: {
          entered_at?: string | null
          entered_by?: string | null
          month_start?: string
          notes?: string | null
          slats_produced?: number | null
          veneers_produced?: number | null
        }
        Relationships: []
      }
      fin_revolving_fund_batches: {
        Row: {
          batch_number: string
          closed_at: string | null
          custodian: string | null
          disbursed_amount: number
          disbursed_by: string | null
          disbursed_currency: string | null
          disbursed_on: string
          fund_account_id: string
          id: string
          notes: string | null
          opened_at: string | null
          source_account_id: string
          status: string | null
        }
        Insert: {
          batch_number: string
          closed_at?: string | null
          custodian?: string | null
          disbursed_amount: number
          disbursed_by?: string | null
          disbursed_currency?: string | null
          disbursed_on: string
          fund_account_id: string
          id?: string
          notes?: string | null
          opened_at?: string | null
          source_account_id: string
          status?: string | null
        }
        Update: {
          batch_number?: string
          closed_at?: string | null
          custodian?: string | null
          disbursed_amount?: number
          disbursed_by?: string | null
          disbursed_currency?: string | null
          disbursed_on?: string
          fund_account_id?: string
          id?: string
          notes?: string | null
          opened_at?: string | null
          source_account_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_revolving_fund_batches_fund_account_id_fkey"
            columns: ["fund_account_id"]
            isOneToOne: false
            referencedRelation: "fin_account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_revolving_fund_batches_fund_account_id_fkey"
            columns: ["fund_account_id"]
            isOneToOne: false
            referencedRelation: "fin_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_revolving_fund_batches_source_account_id_fkey"
            columns: ["source_account_id"]
            isOneToOne: false
            referencedRelation: "fin_account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_revolving_fund_batches_source_account_id_fkey"
            columns: ["source_account_id"]
            isOneToOne: false
            referencedRelation: "fin_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_staff: {
        Row: {
          default_account_id: string | null
          default_currency: string | null
          display_order: number | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          role: string | null
        }
        Insert: {
          default_account_id?: string | null
          default_currency?: string | null
          display_order?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          role?: string | null
        }
        Update: {
          default_account_id?: string | null
          default_currency?: string | null
          display_order?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_staff_default_account_id_fkey"
            columns: ["default_account_id"]
            isOneToOne: false
            referencedRelation: "fin_account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_staff_default_account_id_fkey"
            columns: ["default_account_id"]
            isOneToOne: false
            referencedRelation: "fin_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_transactions: {
        Row: {
          advance_status: string | null
          advance_txn_id: string | null
          amount: number
          bank_reference: string | null
          category_id: number | null
          classification_id: number | null
          cost_center_id: number | null
          currency: string
          description: string | null
          entry_type: string
          from_account_id: string | null
          fx_rate: number | null
          id: string
          notes: string | null
          pr_amount: number | null
          receipt_filename: string | null
          receipt_url: string | null
          requisitioner: string | null
          reverses_transaction_id: string | null
          revolving_fund_batch_id: string | null
          settled_by_txn_id: string | null
          staff_id: string | null
          status: string | null
          submitted_at: string | null
          submitted_by: string | null
          to_account_id: string | null
          transaction_date: string
          ue_bucket: string | null
          vendor_payee: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          advance_status?: string | null
          advance_txn_id?: string | null
          amount: number
          bank_reference?: string | null
          category_id?: number | null
          classification_id?: number | null
          cost_center_id?: number | null
          currency: string
          description?: string | null
          entry_type: string
          from_account_id?: string | null
          fx_rate?: number | null
          id?: string
          notes?: string | null
          pr_amount?: number | null
          receipt_filename?: string | null
          receipt_url?: string | null
          requisitioner?: string | null
          reverses_transaction_id?: string | null
          revolving_fund_batch_id?: string | null
          settled_by_txn_id?: string | null
          staff_id?: string | null
          status?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          to_account_id?: string | null
          transaction_date: string
          ue_bucket?: string | null
          vendor_payee?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          advance_status?: string | null
          advance_txn_id?: string | null
          amount?: number
          bank_reference?: string | null
          category_id?: number | null
          classification_id?: number | null
          cost_center_id?: number | null
          currency?: string
          description?: string | null
          entry_type?: string
          from_account_id?: string | null
          fx_rate?: number | null
          id?: string
          notes?: string | null
          pr_amount?: number | null
          receipt_filename?: string | null
          receipt_url?: string | null
          requisitioner?: string | null
          reverses_transaction_id?: string | null
          revolving_fund_batch_id?: string | null
          settled_by_txn_id?: string | null
          staff_id?: string | null
          status?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          to_account_id?: string | null
          transaction_date?: string
          ue_bucket?: string | null
          vendor_payee?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_transactions_advance_txn_id_fkey"
            columns: ["advance_txn_id"]
            isOneToOne: false
            referencedRelation: "fin_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "fin_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_transactions_classification_id_fkey"
            columns: ["classification_id"]
            isOneToOne: false
            referencedRelation: "fin_classifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_transactions_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "fin_cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_transactions_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "fin_account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_transactions_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "fin_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_transactions_reverses_transaction_id_fkey"
            columns: ["reverses_transaction_id"]
            isOneToOne: false
            referencedRelation: "fin_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_transactions_revolving_fund_batch_id_fkey"
            columns: ["revolving_fund_batch_id"]
            isOneToOne: false
            referencedRelation: "fin_revolving_fund_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_transactions_revolving_fund_batch_id_fkey"
            columns: ["revolving_fund_batch_id"]
            isOneToOne: false
            referencedRelation: "fin_rf_batch_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_transactions_settled_by_txn_id_fkey"
            columns: ["settled_by_txn_id"]
            isOneToOne: false
            referencedRelation: "fin_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_transactions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "fin_outstanding_advances"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "fin_transactions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "fin_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_transactions_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "fin_account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_transactions_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "fin_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_unit_econ_model: {
        Row: {
          bucket_label: string | null
          effective_date: string | null
          monthly_model_cost: number | null
          notes: string | null
          per_veneer_cost: number | null
          ue_bucket: string
        }
        Insert: {
          bucket_label?: string | null
          effective_date?: string | null
          monthly_model_cost?: number | null
          notes?: string | null
          per_veneer_cost?: number | null
          ue_bucket: string
        }
        Update: {
          bucket_label?: string | null
          effective_date?: string | null
          monthly_model_cost?: number | null
          notes?: string | null
          per_veneer_cost?: number | null
          ue_bucket?: string
        }
        Relationships: []
      }
      financial_transactions_legacy_backup: {
        Row: {
          ai_confidence: string | null
          amount: number
          category: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          extracted_by_ai: boolean | null
          id: string
          notes: string | null
          raw_ai_output: Json | null
          receipt_filename: string | null
          receipt_url: string | null
          staff_email: string | null
          staff_name: string | null
          status: string | null
          transaction_date: string
          type: string
          vendor_client: string | null
        }
        Insert: {
          ai_confidence?: string | null
          amount: number
          category?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          extracted_by_ai?: boolean | null
          id?: string
          notes?: string | null
          raw_ai_output?: Json | null
          receipt_filename?: string | null
          receipt_url?: string | null
          staff_email?: string | null
          staff_name?: string | null
          status?: string | null
          transaction_date: string
          type: string
          vendor_client?: string | null
        }
        Update: {
          ai_confidence?: string | null
          amount?: number
          category?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          extracted_by_ai?: boolean | null
          id?: string
          notes?: string | null
          raw_ai_output?: Json | null
          receipt_filename?: string | null
          receipt_url?: string | null
          staff_email?: string | null
          staff_name?: string | null
          status?: string | null
          transaction_date?: string
          type?: string
          vendor_client?: string | null
        }
        Relationships: []
      }
      inquiries: {
        Row: {
          company: string | null
          created_at: string | null
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          spam_score: number | null
          status: string
          subject: string
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          spam_score?: number | null
          status?: string
          subject: string
        }
        Update: {
          company?: string | null
          created_at?: string | null
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          spam_score?: number | null
          status?: string
          subject?: string
        }
        Relationships: []
      }
      iris_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          metadata: Json | null
          model: string | null
          role: string
          session_id: string
          token_count: number | null
          tokens_input: number | null
          tokens_output: number | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          metadata?: Json | null
          model?: string | null
          role: string
          session_id: string
          token_count?: number | null
          tokens_input?: number | null
          tokens_output?: number | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          model?: string | null
          role?: string
          session_id?: string
          token_count?: number | null
          tokens_input?: number | null
          tokens_output?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "iris_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "iris_conversations_review"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "iris_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "iris_sessions"
            referencedColumns: ["session_id"]
          },
        ]
      }
      iris_sessions: {
        Row: {
          first_message: string | null
          id: string
          language: string | null
          last_message: string | null
          last_message_at: string
          message_count: number | null
          metadata: Json | null
          outcome: string | null
          outcome_notes: string | null
          referrer: string | null
          session_id: string
          source_ip: string | null
          started_at: string
          user_agent: string | null
        }
        Insert: {
          first_message?: string | null
          id?: string
          language?: string | null
          last_message?: string | null
          last_message_at?: string
          message_count?: number | null
          metadata?: Json | null
          outcome?: string | null
          outcome_notes?: string | null
          referrer?: string | null
          session_id: string
          source_ip?: string | null
          started_at?: string
          user_agent?: string | null
        }
        Update: {
          first_message?: string | null
          id?: string
          language?: string | null
          last_message?: string | null
          last_message_at?: string
          message_count?: number | null
          metadata?: Json | null
          outcome?: string | null
          outcome_notes?: string | null
          referrer?: string | null
          session_id?: string
          source_ip?: string | null
          started_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      kastelon_booking_requests: {
        Row: {
          challenge: string
          company: string
          contact_method: string | null
          created_at: string
          email: string
          email_error: string | null
          email_sent: boolean | null
          id: string
          industry: string | null
          location: string | null
          metadata: Json | null
          name: string
          notes: string | null
          phone: string | null
          processed: boolean | null
          source: string | null
          source_ip: string | null
          team_size: string | null
          user_agent: string | null
        }
        Insert: {
          challenge: string
          company: string
          contact_method?: string | null
          created_at?: string
          email: string
          email_error?: string | null
          email_sent?: boolean | null
          id?: string
          industry?: string | null
          location?: string | null
          metadata?: Json | null
          name: string
          notes?: string | null
          phone?: string | null
          processed?: boolean | null
          source?: string | null
          source_ip?: string | null
          team_size?: string | null
          user_agent?: string | null
        }
        Update: {
          challenge?: string
          company?: string
          contact_method?: string | null
          created_at?: string
          email?: string
          email_error?: string | null
          email_sent?: boolean | null
          id?: string
          industry?: string | null
          location?: string | null
          metadata?: Json | null
          name?: string
          notes?: string | null
          phone?: string | null
          processed?: boolean | null
          source?: string | null
          source_ip?: string | null
          team_size?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      kastelon_leads: {
        Row: {
          company: string
          created_at: string | null
          email: string
          id: string
          interest: string | null
          message: string | null
          name: string
          role: string | null
          source: string | null
        }
        Insert: {
          company: string
          created_at?: string | null
          email: string
          id?: string
          interest?: string | null
          message?: string | null
          name: string
          role?: string | null
          source?: string | null
        }
        Update: {
          company?: string
          created_at?: string | null
          email?: string
          id?: string
          interest?: string | null
          message?: string | null
          name?: string
          role?: string | null
          source?: string | null
        }
        Relationships: []
      }
      kastelon_products: {
        Row: {
          build_status: string
          bundle_tier: string | null
          category: string
          client_dependencies: string[] | null
          created_at: string
          id: string
          integrations_needed: string[] | null
          is_core_platform: boolean
          long_description: string | null
          maintenance_hours_per_month: number | null
          monthly_price_usd: number | null
          name: string
          notes: string | null
          numat_implementation_note: string | null
          owner: string | null
          per_unit_label: string | null
          per_unit_price_usd: number | null
          setup_fee_usd: number | null
          setup_time_days: number | null
          short_description: string
          slug: string
          standalone_sellable: boolean
          tags: string[] | null
          target_industries: string[] | null
          tech_stack: string[] | null
          updated_at: string
        }
        Insert: {
          build_status?: string
          bundle_tier?: string | null
          category: string
          client_dependencies?: string[] | null
          created_at?: string
          id?: string
          integrations_needed?: string[] | null
          is_core_platform?: boolean
          long_description?: string | null
          maintenance_hours_per_month?: number | null
          monthly_price_usd?: number | null
          name: string
          notes?: string | null
          numat_implementation_note?: string | null
          owner?: string | null
          per_unit_label?: string | null
          per_unit_price_usd?: number | null
          setup_fee_usd?: number | null
          setup_time_days?: number | null
          short_description: string
          slug: string
          standalone_sellable?: boolean
          tags?: string[] | null
          target_industries?: string[] | null
          tech_stack?: string[] | null
          updated_at?: string
        }
        Update: {
          build_status?: string
          bundle_tier?: string | null
          category?: string
          client_dependencies?: string[] | null
          created_at?: string
          id?: string
          integrations_needed?: string[] | null
          is_core_platform?: boolean
          long_description?: string | null
          maintenance_hours_per_month?: number | null
          monthly_price_usd?: number | null
          name?: string
          notes?: string | null
          numat_implementation_note?: string | null
          owner?: string | null
          per_unit_label?: string | null
          per_unit_price_usd?: number | null
          setup_fee_usd?: number | null
          setup_time_days?: number | null
          short_description?: string
          slug?: string
          standalone_sellable?: boolean
          tags?: string[] | null
          target_industries?: string[] | null
          tech_stack?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      master_leads: {
        Row: {
          address: string | null
          apollo_contact_id: string | null
          apollo_person_id: string | null
          appointment_date: string | null
          booking_confirmed: boolean | null
          booking_link_sent: string | null
          bounce_reason: string | null
          briefing_sent: boolean | null
          cal_booking_uid: string | null
          cal_event_url: string | null
          campaign_id: string | null
          city: string | null
          client_id: string
          close_date: string | null
          company: string | null
          company_domain: string | null
          confidence_score: number | null
          contact_channel: string | null
          contact_form_url: string | null
          contact_tier: string | null
          country: string | null
          created_at: string | null
          current_email_num: number | null
          current_frame_id: string | null
          deal_value_php: number | null
          deal_value_usd: number | null
          draft_generated_at: string | null
          draft_gmail_id: string | null
          email: string | null
          email_1_sent: string | null
          email_2_sent: string | null
          email_3_sent: string | null
          email_4_sent: string | null
          email_5_sent: string | null
          email_body: string | null
          email_candidates: string | null
          email_confidence: number | null
          email_opened_at: string | null
          email_sent_at: string | null
          email_sequence: string | null
          email_subject: string | null
          email_validation_status: string | null
          engagement_events: Json | null
          excel_row_id: number | null
          first_name: string | null
          follow_up: string | null
          followup_sent: string | null
          full_name: string | null
          id: string
          inferred_timezone: string | null
          last_activity_at: string | null
          last_activity_type: string | null
          last_email_sent: string | null
          last_name: string | null
          last_rep_touch_at: string | null
          last_rep_touch_by: string | null
          last_rep_touch_subject: string | null
          lead_source: string | null
          linkedin_url: string | null
          meeting_link: string | null
          message_angle: string | null
          message_hook: string | null
          n8n_run_id: string | null
          name_candidates: string | null
          notes: string | null
          outreach_started_at: string | null
          pause_reason: string | null
          paused_at: string | null
          persona: string | null
          phone: string | null
          pipeline_stage: string | null
          priority_score: number | null
          priority_tier: string | null
          qty: number | null
          quote_currency: string | null
          quote_expired_at: string | null
          quote_followup_day12_sent_at: string | null
          quote_followup_day3_sent_at: string | null
          quote_issued_by: string | null
          quote_notes: string | null
          quoted_at: string | null
          rep_assigned: string | null
          rep_email: string | null
          rep_nudge_count: number | null
          rep_nudge_reason: string | null
          rep_nudged_at: string | null
          rep_reply_count: number
          rep_reply_to: string | null
          replied_at: string | null
          reply_classification: string | null
          reply_date: string | null
          reply_next_step: string | null
          reply_priority: string | null
          reply_suggested_action: string | null
          reply_summary: string | null
          reply_text: string | null
          report_sent: string | null
          segment: string | null
          sequence: string | null
          sequence_paused: boolean | null
          service_keywords: string | null
          source: string | null
          source_type: string | null
          status: string
          sub_segment: string | null
          suppression_reason: string | null
          template_id: string | null
          title: string | null
          unit: string | null
          updated_at: string | null
          website: string | null
          won_lost: string | null
        }
        Insert: {
          address?: string | null
          apollo_contact_id?: string | null
          apollo_person_id?: string | null
          appointment_date?: string | null
          booking_confirmed?: boolean | null
          booking_link_sent?: string | null
          bounce_reason?: string | null
          briefing_sent?: boolean | null
          cal_booking_uid?: string | null
          cal_event_url?: string | null
          campaign_id?: string | null
          city?: string | null
          client_id: string
          close_date?: string | null
          company?: string | null
          company_domain?: string | null
          confidence_score?: number | null
          contact_channel?: string | null
          contact_form_url?: string | null
          contact_tier?: string | null
          country?: string | null
          created_at?: string | null
          current_email_num?: number | null
          current_frame_id?: string | null
          deal_value_php?: number | null
          deal_value_usd?: number | null
          draft_generated_at?: string | null
          draft_gmail_id?: string | null
          email?: string | null
          email_1_sent?: string | null
          email_2_sent?: string | null
          email_3_sent?: string | null
          email_4_sent?: string | null
          email_5_sent?: string | null
          email_body?: string | null
          email_candidates?: string | null
          email_confidence?: number | null
          email_opened_at?: string | null
          email_sent_at?: string | null
          email_sequence?: string | null
          email_subject?: string | null
          email_validation_status?: string | null
          engagement_events?: Json | null
          excel_row_id?: number | null
          first_name?: string | null
          follow_up?: string | null
          followup_sent?: string | null
          full_name?: string | null
          id?: string
          inferred_timezone?: string | null
          last_activity_at?: string | null
          last_activity_type?: string | null
          last_email_sent?: string | null
          last_name?: string | null
          last_rep_touch_at?: string | null
          last_rep_touch_by?: string | null
          last_rep_touch_subject?: string | null
          lead_source?: string | null
          linkedin_url?: string | null
          meeting_link?: string | null
          message_angle?: string | null
          message_hook?: string | null
          n8n_run_id?: string | null
          name_candidates?: string | null
          notes?: string | null
          outreach_started_at?: string | null
          pause_reason?: string | null
          paused_at?: string | null
          persona?: string | null
          phone?: string | null
          pipeline_stage?: string | null
          priority_score?: number | null
          priority_tier?: string | null
          qty?: number | null
          quote_currency?: string | null
          quote_expired_at?: string | null
          quote_followup_day12_sent_at?: string | null
          quote_followup_day3_sent_at?: string | null
          quote_issued_by?: string | null
          quote_notes?: string | null
          quoted_at?: string | null
          rep_assigned?: string | null
          rep_email?: string | null
          rep_nudge_count?: number | null
          rep_nudge_reason?: string | null
          rep_nudged_at?: string | null
          rep_reply_count?: number
          rep_reply_to?: string | null
          replied_at?: string | null
          reply_classification?: string | null
          reply_date?: string | null
          reply_next_step?: string | null
          reply_priority?: string | null
          reply_suggested_action?: string | null
          reply_summary?: string | null
          reply_text?: string | null
          report_sent?: string | null
          segment?: string | null
          sequence?: string | null
          sequence_paused?: boolean | null
          service_keywords?: string | null
          source?: string | null
          source_type?: string | null
          status?: string
          sub_segment?: string | null
          suppression_reason?: string | null
          template_id?: string | null
          title?: string | null
          unit?: string | null
          updated_at?: string | null
          website?: string | null
          won_lost?: string | null
        }
        Update: {
          address?: string | null
          apollo_contact_id?: string | null
          apollo_person_id?: string | null
          appointment_date?: string | null
          booking_confirmed?: boolean | null
          booking_link_sent?: string | null
          bounce_reason?: string | null
          briefing_sent?: boolean | null
          cal_booking_uid?: string | null
          cal_event_url?: string | null
          campaign_id?: string | null
          city?: string | null
          client_id?: string
          close_date?: string | null
          company?: string | null
          company_domain?: string | null
          confidence_score?: number | null
          contact_channel?: string | null
          contact_form_url?: string | null
          contact_tier?: string | null
          country?: string | null
          created_at?: string | null
          current_email_num?: number | null
          current_frame_id?: string | null
          deal_value_php?: number | null
          deal_value_usd?: number | null
          draft_generated_at?: string | null
          draft_gmail_id?: string | null
          email?: string | null
          email_1_sent?: string | null
          email_2_sent?: string | null
          email_3_sent?: string | null
          email_4_sent?: string | null
          email_5_sent?: string | null
          email_body?: string | null
          email_candidates?: string | null
          email_confidence?: number | null
          email_opened_at?: string | null
          email_sent_at?: string | null
          email_sequence?: string | null
          email_subject?: string | null
          email_validation_status?: string | null
          engagement_events?: Json | null
          excel_row_id?: number | null
          first_name?: string | null
          follow_up?: string | null
          followup_sent?: string | null
          full_name?: string | null
          id?: string
          inferred_timezone?: string | null
          last_activity_at?: string | null
          last_activity_type?: string | null
          last_email_sent?: string | null
          last_name?: string | null
          last_rep_touch_at?: string | null
          last_rep_touch_by?: string | null
          last_rep_touch_subject?: string | null
          lead_source?: string | null
          linkedin_url?: string | null
          meeting_link?: string | null
          message_angle?: string | null
          message_hook?: string | null
          n8n_run_id?: string | null
          name_candidates?: string | null
          notes?: string | null
          outreach_started_at?: string | null
          pause_reason?: string | null
          paused_at?: string | null
          persona?: string | null
          phone?: string | null
          pipeline_stage?: string | null
          priority_score?: number | null
          priority_tier?: string | null
          qty?: number | null
          quote_currency?: string | null
          quote_expired_at?: string | null
          quote_followup_day12_sent_at?: string | null
          quote_followup_day3_sent_at?: string | null
          quote_issued_by?: string | null
          quote_notes?: string | null
          quoted_at?: string | null
          rep_assigned?: string | null
          rep_email?: string | null
          rep_nudge_count?: number | null
          rep_nudge_reason?: string | null
          rep_nudged_at?: string | null
          rep_reply_count?: number
          rep_reply_to?: string | null
          replied_at?: string | null
          reply_classification?: string | null
          reply_date?: string | null
          reply_next_step?: string | null
          reply_priority?: string | null
          reply_suggested_action?: string | null
          reply_summary?: string | null
          reply_text?: string | null
          report_sent?: string | null
          segment?: string | null
          sequence?: string | null
          sequence_paused?: boolean | null
          service_keywords?: string | null
          source?: string | null
          source_type?: string | null
          status?: string
          sub_segment?: string | null
          suppression_reason?: string | null
          template_id?: string | null
          title?: string | null
          unit?: string | null
          updated_at?: string | null
          website?: string | null
          won_lost?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "master_leads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_leads_current_frame_id_fkey"
            columns: ["current_frame_id"]
            isOneToOne: false
            referencedRelation: "email_frames"
            referencedColumns: ["id"]
          },
        ]
      }
      nara_knowledge: {
        Row: {
          answer: string
          category: string
          created_at: string
          dialect: string | null
          id: string
          is_active: boolean
          keywords: string[]
          language: string | null
          last_used_at: string | null
          parent_entry_id: string | null
          question: string
          updated_at: string
          usage_count: number | null
        }
        Insert: {
          answer: string
          category: string
          created_at?: string
          dialect?: string | null
          id?: string
          is_active?: boolean
          keywords?: string[]
          language?: string | null
          last_used_at?: string | null
          parent_entry_id?: string | null
          question: string
          updated_at?: string
          usage_count?: number | null
        }
        Update: {
          answer?: string
          category?: string
          created_at?: string
          dialect?: string | null
          id?: string
          is_active?: boolean
          keywords?: string[]
          language?: string | null
          last_used_at?: string | null
          parent_entry_id?: string | null
          question?: string
          updated_at?: string
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "nara_knowledge_parent_entry_id_fkey"
            columns: ["parent_entry_id"]
            isOneToOne: false
            referencedRelation: "nara_knowledge"
            referencedColumns: ["id"]
          },
        ]
      }
      nara_training_insights: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          conversion_correlation: number | null
          created_at: string
          dialect: string | null
          example_quote: string | null
          id: string
          insight_description: string
          insight_title: string
          insight_type: string
          language: string | null
          sessions_observed: number | null
          status: string
          suggested_kb_entry_answer: string | null
          suggested_kb_entry_question: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          conversion_correlation?: number | null
          created_at?: string
          dialect?: string | null
          example_quote?: string | null
          id?: string
          insight_description: string
          insight_title: string
          insight_type: string
          language?: string | null
          sessions_observed?: number | null
          status?: string
          suggested_kb_entry_answer?: string | null
          suggested_kb_entry_question?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          conversion_correlation?: number | null
          created_at?: string
          dialect?: string | null
          example_quote?: string | null
          id?: string
          insight_description?: string
          insight_title?: string
          insight_type?: string
          language?: string | null
          sessions_observed?: number | null
          status?: string
          suggested_kb_entry_answer?: string | null
          suggested_kb_entry_question?: string | null
        }
        Relationships: []
      }
      nara_translations: {
        Row: {
          context: string | null
          created_at: string
          id: string
          original_dialect: string | null
          original_language: string
          original_text: string
          source_row_id: string | null
          source_table: string | null
          target_language: string
          translated_text: string
        }
        Insert: {
          context?: string | null
          created_at?: string
          id?: string
          original_dialect?: string | null
          original_language: string
          original_text: string
          source_row_id?: string | null
          source_table?: string | null
          target_language?: string
          translated_text: string
        }
        Update: {
          context?: string | null
          created_at?: string
          id?: string
          original_dialect?: string | null
          original_language?: string
          original_text?: string
          source_row_id?: string | null
          source_table?: string | null
          target_language?: string
          translated_text?: string
        }
        Relationships: []
      }
      nara_unanswered: {
        Row: {
          created_at: string
          id: string
          question: string
          resolved: boolean
          session_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          question: string
          resolved?: boolean
          session_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          question?: string
          resolved?: boolean
          session_id?: string | null
        }
        Relationships: []
      }
      news: {
        Row: {
          article_topic: string | null
          content: Json
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          featured: boolean
          gallery_images: string[] | null
          id: string
          published_at: string | null
          read_time_minutes: number | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          article_topic?: string | null
          content?: Json
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          featured?: boolean
          gallery_images?: string[] | null
          id?: string
          published_at?: string | null
          read_time_minutes?: number | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          article_topic?: string | null
          content?: Json
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          featured?: boolean
          gallery_images?: string[] | null
          id?: string
          published_at?: string | null
          read_time_minutes?: number | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      outreach_send_log: {
        Row: {
          body_snapshot: string | null
          client_id: string
          frame_id: string | null
          gmail_message_id: string | null
          gmail_thread_id: string | null
          id: string
          inbox_used: string
          lead_id: string
          sent_at: string | null
          status: string | null
          step: number
          subject: string | null
        }
        Insert: {
          body_snapshot?: string | null
          client_id: string
          frame_id?: string | null
          gmail_message_id?: string | null
          gmail_thread_id?: string | null
          id?: string
          inbox_used: string
          lead_id: string
          sent_at?: string | null
          status?: string | null
          step: number
          subject?: string | null
        }
        Update: {
          body_snapshot?: string | null
          client_id?: string
          frame_id?: string | null
          gmail_message_id?: string | null
          gmail_thread_id?: string | null
          id?: string
          inbox_used?: string
          lead_id?: string
          sent_at?: string | null
          status?: string | null
          step?: number
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_send_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_send_log_frame_id_fkey"
            columns: ["frame_id"]
            isOneToOne: false
            referencedRelation: "email_frames"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_send_log_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "master_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      price_history: {
        Row: {
          created_at: string
          effective_date: string
          exchange_rate: number | null
          id: string
          new_price_usd: number
          notes: string | null
          old_price_usd: number | null
          php_price: number | null
          sku_snapshot: string
          variant_id: string
        }
        Insert: {
          created_at?: string
          effective_date?: string
          exchange_rate?: number | null
          id?: string
          new_price_usd: number
          notes?: string | null
          old_price_usd?: number | null
          php_price?: number | null
          sku_snapshot: string
          variant_id: string
        }
        Update: {
          created_at?: string
          effective_date?: string
          exchange_rate?: number | null
          id?: string
          new_price_usd?: number
          notes?: string | null
          old_price_usd?: number | null
          php_price?: number | null
          sku_snapshot?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_history_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "admin_product_variant_list"
            referencedColumns: ["variant_id"]
          },
          {
            foreignKeyName: "price_history_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string | null
          display_order: number | null
          id: string
          image_url: string
          is_primary: boolean | null
          product_id: string
          variant_id: string | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url: string
          is_primary?: boolean | null
          product_id: string
          variant_id?: string | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          is_primary?: boolean | null
          product_id?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "admin_product_variant_list"
            referencedColumns: ["variant_id"]
          },
          {
            foreignKeyName: "product_images_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          applications: string[] | null
          base_price_usd: number | null
          core_type: string | null
          cost_updated_at: string | null
          created_at: string
          currency: string
          ex_factory_php: number | null
          ex_factory_source: string | null
          ex_factory_updated_at: string | null
          finish: string | null
          grade: string | null
          id: string
          image_url: string | null
          in_stock: boolean
          is_active: boolean
          is_available: boolean
          is_price_on_request: boolean
          length_mm: number
          min_margin_pct: number | null
          mirrors_variant_id: string | null
          moq: number
          ply_count: number | null
          price_notes: string | null
          price_updated_at: string | null
          product_id: string
          production_cost_notes: string | null
          production_cost_php: number | null
          size_label: string | null
          sku: string | null
          sort_order: number | null
          thickness_mm: number
          unit: string
          unit_price: number | null
          width_mm: number
        }
        Insert: {
          applications?: string[] | null
          base_price_usd?: number | null
          core_type?: string | null
          cost_updated_at?: string | null
          created_at?: string
          currency?: string
          ex_factory_php?: number | null
          ex_factory_source?: string | null
          ex_factory_updated_at?: string | null
          finish?: string | null
          grade?: string | null
          id?: string
          image_url?: string | null
          in_stock?: boolean
          is_active?: boolean
          is_available?: boolean
          is_price_on_request?: boolean
          length_mm?: number
          min_margin_pct?: number | null
          mirrors_variant_id?: string | null
          moq?: number
          ply_count?: number | null
          price_notes?: string | null
          price_updated_at?: string | null
          product_id: string
          production_cost_notes?: string | null
          production_cost_php?: number | null
          size_label?: string | null
          sku?: string | null
          sort_order?: number | null
          thickness_mm: number
          unit?: string
          unit_price?: number | null
          width_mm?: number
        }
        Update: {
          applications?: string[] | null
          base_price_usd?: number | null
          core_type?: string | null
          cost_updated_at?: string | null
          created_at?: string
          currency?: string
          ex_factory_php?: number | null
          ex_factory_source?: string | null
          ex_factory_updated_at?: string | null
          finish?: string | null
          grade?: string | null
          id?: string
          image_url?: string | null
          in_stock?: boolean
          is_active?: boolean
          is_available?: boolean
          is_price_on_request?: boolean
          length_mm?: number
          min_margin_pct?: number | null
          mirrors_variant_id?: string | null
          moq?: number
          ply_count?: number | null
          price_notes?: string | null
          price_updated_at?: string | null
          product_id?: string
          production_cost_notes?: string | null
          production_cost_php?: number | null
          size_label?: string | null
          sku?: string | null
          sort_order?: number | null
          thickness_mm?: number
          unit?: string
          unit_price?: number | null
          width_mm?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_mirrors_variant_id_fkey"
            columns: ["mirrors_variant_id"]
            isOneToOne: false
            referencedRelation: "admin_product_variant_list"
            referencedColumns: ["variant_id"]
          },
          {
            foreignKeyName: "product_variants_mirrors_variant_id_fkey"
            columns: ["mirrors_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          base_price_usd: number | null
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          image: string | null
          image_url: string | null
          is_active: boolean | null
          is_featured: boolean
          is_price_on_request: boolean | null
          moq: number | null
          moq_unit: string | null
          name: string | null
          order_increment: number | null
          price_notes: string | null
          slug: string | null
          unit: string | null
        }
        Insert: {
          base_price_usd?: number | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image?: string | null
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean
          is_price_on_request?: boolean | null
          moq?: number | null
          moq_unit?: string | null
          name?: string | null
          order_increment?: number | null
          price_notes?: string | null
          slug?: string | null
          unit?: string | null
        }
        Update: {
          base_price_usd?: number | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image?: string | null
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean
          is_price_on_request?: boolean | null
          moq?: number | null
          moq_unit?: string | null
          name?: string | null
          order_increment?: number | null
          price_notes?: string | null
          slug?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_items: {
        Row: {
          category: string | null
          created_at: string
          id: string
          product_id: string | null
          product_name: string | null
          product_specs: string | null
          quantity: number
          quote_id: string
          sku: string | null
          total_price: number | null
          unit: string | null
          unit_price: number | null
          variant_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          product_id?: string | null
          product_name?: string | null
          product_specs?: string | null
          quantity?: number
          quote_id: string
          sku?: string | null
          total_price?: number | null
          unit?: string | null
          unit_price?: number | null
          variant_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          product_id?: string | null
          product_name?: string | null
          product_specs?: string | null
          quantity?: number
          quote_id?: string
          sku?: string | null
          total_price?: number | null
          unit?: string | null
          unit_price?: number | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "admin_product_variant_list"
            referencedColumns: ["variant_id"]
          },
          {
            foreignKeyName: "quote_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          admin_override_at: string | null
          admin_override_by: string | null
          admin_override_reason: string | null
          amount_paid: number | null
          company: string | null
          converted_from_proforma_id: string | null
          created_at: string
          currency: string | null
          customer_address: string | null
          customer_name: string | null
          customer_tin: string | null
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          deposit_percent: number | null
          discount_amount: number | null
          discount_percent: number | null
          display_currency: string | null
          display_total: number | null
          doc_type: string
          email: string | null
          generated_by: string | null
          id: string
          incoterms: string | null
          invoice_type: string | null
          lead_id: string | null
          notes: string | null
          paid_at: string | null
          payment_due_date: string | null
          payment_status: string | null
          payment_terms: string | null
          pdf_url: string | null
          phone: string | null
          po_reference: string | null
          quote_number: string | null
          revision_number: number
          revision_of: string | null
          sent_at: string | null
          sent_by: string | null
          status: string
          subtotal: number | null
          superseded_by: string | null
          total: number | null
          updated_at: string | null
          valid_until: string | null
          vat_amount: number | null
          vat_enabled: boolean | null
          vat_rate: number | null
        }
        Insert: {
          admin_override_at?: string | null
          admin_override_by?: string | null
          admin_override_reason?: string | null
          amount_paid?: number | null
          company?: string | null
          converted_from_proforma_id?: string | null
          created_at?: string
          currency?: string | null
          customer_address?: string | null
          customer_name?: string | null
          customer_tin?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deposit_percent?: number | null
          discount_amount?: number | null
          discount_percent?: number | null
          display_currency?: string | null
          display_total?: number | null
          doc_type?: string
          email?: string | null
          generated_by?: string | null
          id?: string
          incoterms?: string | null
          invoice_type?: string | null
          lead_id?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_due_date?: string | null
          payment_status?: string | null
          payment_terms?: string | null
          pdf_url?: string | null
          phone?: string | null
          po_reference?: string | null
          quote_number?: string | null
          revision_number?: number
          revision_of?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          subtotal?: number | null
          superseded_by?: string | null
          total?: number | null
          updated_at?: string | null
          valid_until?: string | null
          vat_amount?: number | null
          vat_enabled?: boolean | null
          vat_rate?: number | null
        }
        Update: {
          admin_override_at?: string | null
          admin_override_by?: string | null
          admin_override_reason?: string | null
          amount_paid?: number | null
          company?: string | null
          converted_from_proforma_id?: string | null
          created_at?: string
          currency?: string | null
          customer_address?: string | null
          customer_name?: string | null
          customer_tin?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deposit_percent?: number | null
          discount_amount?: number | null
          discount_percent?: number | null
          display_currency?: string | null
          display_total?: number | null
          doc_type?: string
          email?: string | null
          generated_by?: string | null
          id?: string
          incoterms?: string | null
          invoice_type?: string | null
          lead_id?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_due_date?: string | null
          payment_status?: string | null
          payment_terms?: string | null
          pdf_url?: string | null
          phone?: string | null
          po_reference?: string | null
          quote_number?: string | null
          revision_number?: number
          revision_of?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          subtotal?: number | null
          superseded_by?: string | null
          total?: number | null
          updated_at?: string | null
          valid_until?: string | null
          vat_amount?: number | null
          vat_enabled?: boolean | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_converted_from_proforma_id_fkey"
            columns: ["converted_from_proforma_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "master_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_revision_of_fkey"
            columns: ["revision_of"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          actual_amount: number
          actual_currency: string
          actual_date: string
          bank_reference: string | null
          created_at: string
          display_amount: number | null
          display_currency: string | null
          id: string
          issued_by: string
          notes: string | null
          payment_method: string
          quote_id: string
          receipt_number: string | null
          sent_at: string | null
          sent_by: string | null
          superseded_by: string | null
        }
        Insert: {
          actual_amount: number
          actual_currency: string
          actual_date: string
          bank_reference?: string | null
          created_at?: string
          display_amount?: number | null
          display_currency?: string | null
          id?: string
          issued_by: string
          notes?: string | null
          payment_method: string
          quote_id: string
          receipt_number?: string | null
          sent_at?: string | null
          sent_by?: string | null
          superseded_by?: string | null
        }
        Update: {
          actual_amount?: number
          actual_currency?: string
          actual_date?: string
          bank_reference?: string | null
          created_at?: string
          display_amount?: number | null
          display_currency?: string | null
          id?: string
          issued_by?: string
          notes?: string | null
          payment_method?: string
          quote_id?: string
          receipt_number?: string | null
          sent_at?: string | null
          sent_by?: string | null
          superseded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipts_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_activities: {
        Row: {
          activity_type: string
          actor: string
          created_at: string | null
          gmail_message_id: string | null
          gmail_thread_id: string | null
          id: string
          lead_id: string | null
          payload: Json | null
        }
        Insert: {
          activity_type: string
          actor?: string
          created_at?: string | null
          gmail_message_id?: string | null
          gmail_thread_id?: string | null
          id?: string
          lead_id?: string | null
          payload?: Json | null
        }
        Update: {
          activity_type?: string
          actor?: string
          created_at?: string | null
          gmail_message_id?: string | null
          gmail_thread_id?: string | null
          id?: string
          lead_id?: string | null
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "master_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      sequence_events: {
        Row: {
          clicked_count: number | null
          company: string | null
          country: string | null
          created_at: string | null
          email: string
          email_subject: string | null
          event_type: string
          format_notes: string | null
          format_version: string | null
          id: string
          ip_hash: string | null
          link_url: string | null
          notes: string | null
          opened_count: number | null
          referrer_host: string | null
          reply_sentiment: string | null
          rooms: number | null
          saving_hi: number | null
          saving_lo: number | null
          sent_from: string | null
          sequence_name: string
          sequence_step: number | null
          tracking_id: string | null
          user_agent: string | null
        }
        Insert: {
          clicked_count?: number | null
          company?: string | null
          country?: string | null
          created_at?: string | null
          email: string
          email_subject?: string | null
          event_type: string
          format_notes?: string | null
          format_version?: string | null
          id?: string
          ip_hash?: string | null
          link_url?: string | null
          notes?: string | null
          opened_count?: number | null
          referrer_host?: string | null
          reply_sentiment?: string | null
          rooms?: number | null
          saving_hi?: number | null
          saving_lo?: number | null
          sent_from?: string | null
          sequence_name: string
          sequence_step?: number | null
          tracking_id?: string | null
          user_agent?: string | null
        }
        Update: {
          clicked_count?: number | null
          company?: string | null
          country?: string | null
          created_at?: string | null
          email?: string
          email_subject?: string | null
          event_type?: string
          format_notes?: string | null
          format_version?: string | null
          id?: string
          ip_hash?: string | null
          link_url?: string | null
          notes?: string | null
          opened_count?: number | null
          referrer_host?: string | null
          reply_sentiment?: string | null
          rooms?: number | null
          saving_hi?: number | null
          saving_lo?: number | null
          sent_from?: string | null
          sequence_name?: string
          sequence_step?: number | null
          tracking_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      system_replies: {
        Row: {
          created_at: string
          failed_recipient: string | null
          from_address: string | null
          gmail_message_id: string | null
          gmail_thread_id: string | null
          id: string
          linked_campaign_id: string | null
          linked_message_id: string | null
          original_subject: string | null
          raw_snippet: string | null
          received_at: string | null
          rep_inbox: string
          reply_category: string
          subject: string | null
        }
        Insert: {
          created_at?: string
          failed_recipient?: string | null
          from_address?: string | null
          gmail_message_id?: string | null
          gmail_thread_id?: string | null
          id?: string
          linked_campaign_id?: string | null
          linked_message_id?: string | null
          original_subject?: string | null
          raw_snippet?: string | null
          received_at?: string | null
          rep_inbox: string
          reply_category: string
          subject?: string | null
        }
        Update: {
          created_at?: string
          failed_recipient?: string | null
          from_address?: string | null
          gmail_message_id?: string | null
          gmail_thread_id?: string | null
          id?: string
          linked_campaign_id?: string | null
          linked_message_id?: string | null
          original_subject?: string | null
          raw_snippet?: string | null
          received_at?: string | null
          rep_inbox?: string
          reply_category?: string
          subject?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          email_notified: boolean | null
          id: string
          notes: string | null
          priority: string
          project: string
          reminder_at: string | null
          status: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          email_notified?: boolean | null
          id?: string
          notes?: string | null
          priority?: string
          project?: string
          reminder_at?: string | null
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          email_notified?: boolean | null
          id?: string
          notes?: string | null
          priority?: string
          project?: string
          reminder_at?: string | null
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          company: string | null
          content_image_url: string | null
          created_at: string
          id: string
          is_active: boolean
          location: string
          logo_url: string | null
          name: string
          sort_order: number
          testimonial: string
          updated_at: string
        }
        Insert: {
          company?: string | null
          content_image_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          location: string
          logo_url?: string | null
          name: string
          sort_order?: number
          testimonial: string
          updated_at?: string
        }
        Update: {
          company?: string | null
          content_image_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          location?: string
          logo_url?: string | null
          name?: string
          sort_order?: number
          testimonial?: string
          updated_at?: string
        }
        Relationships: []
      }
      ve_nara_sessions: {
        Row: {
          booking_link_clicked: boolean | null
          booking_made: boolean | null
          booking_rep: string | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          lead_email: string | null
          messages: Json | null
          report_token: string
          resort_name: string | null
          started_at: string | null
        }
        Insert: {
          booking_link_clicked?: boolean | null
          booking_made?: boolean | null
          booking_rep?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          lead_email?: string | null
          messages?: Json | null
          report_token: string
          resort_name?: string | null
          started_at?: string | null
        }
        Update: {
          booking_link_clicked?: boolean | null
          booking_made?: boolean | null
          booking_rep?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          lead_email?: string | null
          messages?: Json | null
          report_token?: string
          resort_name?: string | null
          started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ve_nara_sessions_report_token_fkey"
            columns: ["report_token"]
            isOneToOne: false
            referencedRelation: "ve_reports"
            referencedColumns: ["token"]
          },
        ]
      }
      ve_report_views: {
        Row: {
          id: string
          referrer: string | null
          report_token: string
          resort_name: string | null
          user_agent: string | null
          viewed_at: string | null
        }
        Insert: {
          id?: string
          referrer?: string | null
          report_token: string
          resort_name?: string | null
          user_agent?: string | null
          viewed_at?: string | null
        }
        Update: {
          id?: string
          referrer?: string | null
          report_token?: string
          resort_name?: string | null
          user_agent?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ve_report_views_report_token_fkey"
            columns: ["report_token"]
            isOneToOne: false
            referencedRelation: "ve_reports"
            referencedColumns: ["token"]
          },
        ]
      }
      ve_reports: {
        Row: {
          booking_at: string | null
          booking_made: boolean | null
          booking_rep: string | null
          claude_research: string | null
          contact_name: string | null
          country: string | null
          deal_id: string
          email: string
          email_sent_count: number | null
          first_viewed_at: string | null
          generated_at: string | null
          id: string
          last_email_sent: string | null
          last_viewed_at: string | null
          logo_url: string | null
          nara_sessions: number | null
          numat_total_hi: number | null
          numat_total_lo: number | null
          report_html: string | null
          report_url: string | null
          resort_name: string
          rooms: number
          rooms_source: string | null
          saving_vs_hard_hi: number | null
          saving_vs_hard_lo: number | null
          saving_vs_ply_hi: number | null
          saving_vs_ply_lo: number | null
          segment: string | null
          sequence_step: number | null
          sqm: number
          token: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          booking_at?: string | null
          booking_made?: boolean | null
          booking_rep?: string | null
          claude_research?: string | null
          contact_name?: string | null
          country?: string | null
          deal_id: string
          email: string
          email_sent_count?: number | null
          first_viewed_at?: string | null
          generated_at?: string | null
          id?: string
          last_email_sent?: string | null
          last_viewed_at?: string | null
          logo_url?: string | null
          nara_sessions?: number | null
          numat_total_hi?: number | null
          numat_total_lo?: number | null
          report_html?: string | null
          report_url?: string | null
          resort_name: string
          rooms?: number
          rooms_source?: string | null
          saving_vs_hard_hi?: number | null
          saving_vs_hard_lo?: number | null
          saving_vs_ply_hi?: number | null
          saving_vs_ply_lo?: number | null
          segment?: string | null
          sequence_step?: number | null
          sqm?: number
          token: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          booking_at?: string | null
          booking_made?: boolean | null
          booking_rep?: string | null
          claude_research?: string | null
          contact_name?: string | null
          country?: string | null
          deal_id?: string
          email?: string
          email_sent_count?: number | null
          first_viewed_at?: string | null
          generated_at?: string | null
          id?: string
          last_email_sent?: string | null
          last_viewed_at?: string | null
          logo_url?: string | null
          nara_sessions?: number | null
          numat_total_hi?: number | null
          numat_total_lo?: number | null
          report_html?: string | null
          report_url?: string | null
          resort_name?: string
          rooms?: number
          rooms_source?: string | null
          saving_vs_hard_hi?: number | null
          saving_vs_hard_lo?: number | null
          saving_vs_ply_hi?: number | null
          saving_vs_ply_lo?: number | null
          segment?: string | null
          sequence_step?: number | null
          sqm?: number
          token?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      admin_product_variant_list: {
        Row: {
          applications: string[] | null
          base_price_usd: number | null
          core_type: string | null
          created_at: string | null
          currency: string | null
          finish: string | null
          grade: string | null
          image_url: string | null
          in_stock: boolean | null
          is_active: boolean | null
          is_price_on_request: boolean | null
          length_ft: number | null
          length_m: number | null
          length_mm: number | null
          mirrors_variant_id: string | null
          moq: number | null
          price_notes: string | null
          product_id: string | null
          product_name: string | null
          product_slug: string | null
          size_label: string | null
          thickness_mm: number | null
          unit: string | null
          unit_price: number | null
          variant_id: string | null
          variant_sku: string | null
          width_mm: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_mirrors_variant_id_fkey"
            columns: ["mirrors_variant_id"]
            isOneToOne: false
            referencedRelation: "admin_product_variant_list"
            referencedColumns: ["variant_id"]
          },
          {
            foreignKeyName: "product_variants_mirrors_variant_id_fkey"
            columns: ["mirrors_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      claude_usage_since_baseline: {
        Row: {
          estimated_remaining_balance_usd: number | null
          hours_since_snapshot: number | null
          iris_delta: number | null
          iris_spend_usd: number | null
          nara_chat_delta: number | null
          nara_chat_spend_usd: number | null
          replies_delta: number | null
          replies_spend_usd: number | null
          sessions_analyzed_delta: number | null
          sessions_analyzed_spend_usd: number | null
          snapshot_at: string | null
          starting_balance_usd: number | null
          total_estimated_spend_usd: number | null
        }
        Relationships: []
      }
      fin_account_balances: {
        Row: {
          account_type: string | null
          code: string | null
          currency: string | null
          current_balance: number | null
          id: string | null
          name: string | null
        }
        Insert: {
          account_type?: string | null
          code?: string | null
          currency?: string | null
          current_balance?: never
          id?: string | null
          name?: string | null
        }
        Update: {
          account_type?: string | null
          code?: string | null
          currency?: string | null
          current_balance?: never
          id?: string | null
          name?: string | null
        }
        Relationships: []
      }
      fin_outstanding_advances: {
        Row: {
          advance_count: number | null
          oldest_advance_date: string | null
          outstanding_amount: number | null
          staff_id: string | null
          staff_name: string | null
        }
        Relationships: []
      }
      fin_rf_batch_summary: {
        Row: {
          batch_number: string | null
          custodian: string | null
          disbursed_amount: number | null
          disbursed_by: string | null
          disbursed_on: string | null
          fund_account_id: string | null
          id: string | null
          line_count: number | null
          remaining_balance: number | null
          source_account_id: string | null
          status: string | null
          total_liquidated: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_revolving_fund_batches_fund_account_id_fkey"
            columns: ["fund_account_id"]
            isOneToOne: false
            referencedRelation: "fin_account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_revolving_fund_batches_fund_account_id_fkey"
            columns: ["fund_account_id"]
            isOneToOne: false
            referencedRelation: "fin_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_revolving_fund_batches_source_account_id_fkey"
            columns: ["source_account_id"]
            isOneToOne: false
            referencedRelation: "fin_account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_revolving_fund_batches_source_account_id_fkey"
            columns: ["source_account_id"]
            isOneToOne: false
            referencedRelation: "fin_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      iris_conversations_review: {
        Row: {
          assistant_messages: number | null
          first_message: string | null
          language: string | null
          last_message: string | null
          last_message_at: string | null
          message_count: number | null
          outcome: string | null
          session_id: string | null
          started_at: string | null
          user_messages: number | null
        }
        Insert: {
          assistant_messages?: never
          first_message?: string | null
          language?: string | null
          last_message?: string | null
          last_message_at?: string | null
          message_count?: number | null
          outcome?: string | null
          session_id?: string | null
          started_at?: string | null
          user_messages?: never
        }
        Update: {
          assistant_messages?: never
          first_message?: string | null
          language?: string | null
          last_message?: string | null
          last_message_at?: string | null
          message_count?: number | null
          outcome?: string | null
          session_id?: string | null
          started_at?: string | null
          user_messages?: never
        }
        Relationships: []
      }
      nara_session_rollup: {
        Row: {
          buying_signal_count: number | null
          completed: boolean | null
          final_stage: string | null
          lead_submitted: boolean | null
          message_count: number | null
          objection_count: number | null
          outcome: string | null
          page_url: string | null
          primary_dialect: string | null
          primary_language: string | null
          quality_score: number | null
          session_id: string | null
          started_at: string | null
          user_message_count: number | null
        }
        Insert: {
          buying_signal_count?: never
          completed?: boolean | null
          final_stage?: never
          lead_submitted?: boolean | null
          message_count?: never
          objection_count?: never
          outcome?: never
          page_url?: string | null
          primary_dialect?: never
          primary_language?: never
          quality_score?: never
          session_id?: string | null
          started_at?: string | null
          user_message_count?: never
        }
        Update: {
          buying_signal_count?: never
          completed?: boolean | null
          final_stage?: never
          lead_submitted?: boolean | null
          message_count?: never
          objection_count?: never
          outcome?: never
          page_url?: string | null
          primary_dialect?: never
          primary_language?: never
          quality_score?: never
          session_id?: string | null
          started_at?: string | null
          user_message_count?: never
        }
        Relationships: []
      }
      sequence_events_rollup: {
        Row: {
          bounces: number | null
          click_rate_pct: number | null
          clicks: number | null
          open_rate_pct: number | null
          opens: number | null
          rep: string | null
          replies: number | null
          reply_rate_pct: number | null
          sent: number | null
          sequence_name: string | null
          sequence_step: number | null
        }
        Relationships: []
      }
      sequence_executive_summary: {
        Row: {
          booked_last_7d: number | null
          booked_total: number | null
          bounce_rate_pct: number | null
          bounced_last_7d: number | null
          bounced_total: number | null
          first_activity: string | null
          last_activity: string | null
          replied_last_7d: number | null
          replied_total: number | null
          reply_rate_pct: number | null
          reply_to_booking_pct: number | null
          sent_last_7d: number | null
          sent_total: number | null
          sequence_name: string | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          bounce_reason: string | null
          email: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      variant_margin_audit: {
        Row: {
          base_price_usd: number | null
          core_type: string | null
          cost_updated_at: string | null
          currency: string | null
          current_margin_pct: number | null
          grade: string | null
          is_active: boolean | null
          is_price_on_request: boolean | null
          list_price_php: number | null
          min_margin_pct: number | null
          min_sell_price_php: number | null
          ply_count: number | null
          product: string | null
          production_cost_php: number | null
          size_label: string | null
          sku: string | null
          thickness_mm: number | null
        }
        Relationships: []
      }
      weekly_sequence_report: {
        Row: {
          booked: number | null
          bounce_rate_pct: number | null
          bounced: number | null
          click_rate_pct: number | null
          clicked: number | null
          format_version: string | null
          open_rate_pct: number | null
          opened: number | null
          replied: number | null
          reply_rate_pct: number | null
          reply_to_booking_pct: number | null
          sent: number | null
          sequence_name: string | null
          sequence_step: number | null
          unique_recipients: number | null
          week_end: string | null
          week_start: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      claim_due_messages: {
        Args: { p_limit?: number; p_rep?: string }
        Returns: {
          email_body: string
          email_subject: string
          email_to: string
          id: string
          lead_id: string
          rep_assigned: string
          rep_email: string
          rep_reply_to: string
          step_num: number
        }[]
      }
      enqueue_daily_step1_batch: {
        Args: { p_batch_size?: number }
        Returns: Json
      }
      fin_get_period_fx_rate: {
        Args: { p_end: string; p_start: string }
        Returns: number
      }
      generate_daily_campaign_email: {
        Args: { p_campaign_id?: string }
        Returns: Json
      }
      generate_daily_campaign_report: {
        Args: { p_campaign_id?: string }
        Returns: Json
      }
      generate_paul_meeting_email: { Args: never; Returns: Json }
      generate_ve_report_html: {
        Args: { p_bucket: string; p_cal_link: string; p_company: string }
        Returns: string
      }
      get_ceo_dashboard_data: { Args: never; Returns: Json }
      get_email_outreach_report: { Args: never; Returns: Json }
      gl_archive_stale_leads: { Args: never; Returns: number }
      gl_check_duplicate: { Args: { p_email: string }; Returns: string }
      gl_is_unsubscribed: { Args: { p_email: string }; Returns: boolean }
      import_leads_batch: {
        Args: { p_rows: Json }
        Returns: {
          inserted_count: number
          skipped_count: number
        }[]
      }
      increment_rep_touch: {
        Args: {
          p_actor: string
          p_lead_id: string
          p_subject: string
          p_touch_at: string
        }
        Returns: undefined
      }
      log_system_reply: {
        Args: {
          p_category: string
          p_failed_recipient?: string
          p_from_address: string
          p_gmail_message_id?: string
          p_gmail_thread_id?: string
          p_original_subject?: string
          p_raw_snippet?: string
          p_rep_inbox: string
          p_subject: string
        }
        Returns: Json
      }
      mark_message_failed: {
        Args: { p_error?: string; p_message_id: string }
        Returns: undefined
      }
      mark_message_sent: {
        Args: { p_gmail_message_id?: string; p_message_id: string }
        Returns: undefined
      }
      mark_reply_received: {
        Args: {
          p_from_email: string
          p_reply_subject?: string
          p_reply_text?: string
        }
        Returns: {
          campaign_id: string
          company: string
          lead_id: string
          matched: boolean
          message_id: string
          rep_assigned: string
          step_num: number
        }[]
      }
      next_weekday: { Args: { d: string }; Returns: string }
      parse_csv_document: {
        Args: { p_csv: string }
        Returns: {
          cols: string[]
          row_num: number
        }[]
      }
      parse_csv_line: { Args: { p_line: string }; Returns: string[] }
      record_report_view: {
        Args: { p_referrer?: string; p_token: string; p_user_agent?: string }
        Returns: undefined
      }
      segment_to_bucket: { Args: { p_segment: string }; Returns: string }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      gl_activity_type:
        | "created"
        | "enriched"
        | "email_sent"
        | "email_opened"
        | "email_clicked"
        | "email_replied"
        | "email_bounced"
        | "qualified"
        | "appointment_booked"
        | "appointment_completed"
        | "unsubscribed"
        | "note_added"
        | "segment_changed"
        | "status_changed"
        | "merged"
      gl_appointment_status:
        | "pending"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "no_show"
        | "rescheduled"
      gl_email_send_status:
        | "queued"
        | "sent"
        | "delivered"
        | "opened"
        | "clicked"
        | "replied"
        | "bounced"
        | "failed"
        | "unsubscribed"
      gl_lead_segment:
        | "hotels_resorts"
        | "interior_fitout"
        | "furniture_makers"
        | "construction_buyers"
        | "construction_distributors"
      gl_lead_source:
        | "apollo"
        | "google_maps"
        | "directory_scrape"
        | "trade_show"
        | "prospeo"
        | "snov_io"
        | "hunter_io"
        | "linkedin"
        | "website_inbound"
        | "referral"
        | "manual"
        | "other"
      gl_lead_status:
        | "new"
        | "enriched"
        | "sequencing"
        | "contacted"
        | "replied"
        | "qualified_hot"
        | "qualified_warm"
        | "qualified_cold"
        | "appointment_set"
        | "converted"
        | "unsubscribed"
        | "bounced"
        | "archived"
      gl_legal_basis:
        | "legitimate_interest"
        | "explicit_consent"
        | "contract_performance"
        | "opt_in"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      gl_activity_type: [
        "created",
        "enriched",
        "email_sent",
        "email_opened",
        "email_clicked",
        "email_replied",
        "email_bounced",
        "qualified",
        "appointment_booked",
        "appointment_completed",
        "unsubscribed",
        "note_added",
        "segment_changed",
        "status_changed",
        "merged",
      ],
      gl_appointment_status: [
        "pending",
        "confirmed",
        "completed",
        "cancelled",
        "no_show",
        "rescheduled",
      ],
      gl_email_send_status: [
        "queued",
        "sent",
        "delivered",
        "opened",
        "clicked",
        "replied",
        "bounced",
        "failed",
        "unsubscribed",
      ],
      gl_lead_segment: [
        "hotels_resorts",
        "interior_fitout",
        "furniture_makers",
        "construction_buyers",
        "construction_distributors",
      ],
      gl_lead_source: [
        "apollo",
        "google_maps",
        "directory_scrape",
        "trade_show",
        "prospeo",
        "snov_io",
        "hunter_io",
        "linkedin",
        "website_inbound",
        "referral",
        "manual",
        "other",
      ],
      gl_lead_status: [
        "new",
        "enriched",
        "sequencing",
        "contacted",
        "replied",
        "qualified_hot",
        "qualified_warm",
        "qualified_cold",
        "appointment_set",
        "converted",
        "unsubscribed",
        "bounced",
        "archived",
      ],
      gl_legal_basis: [
        "legitimate_interest",
        "explicit_consent",
        "contract_performance",
        "opt_in",
      ],
    },
  },
} as const
