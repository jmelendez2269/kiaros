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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activation_claims: {
        Row: {
          claim_email: string
          claim_token: string
          claimed_at: string | null
          claimed_clerk_user_id: string | null
          claimed_user_id: string | null
          consumed_at: string | null
          created_at: string
          expires_at: string | null
          id: string
          marketplace_order_id: string
          status: string
          verified_at: string | null
        }
        Insert: {
          claim_email: string
          claim_token?: string
          claimed_at?: string | null
          claimed_clerk_user_id?: string | null
          claimed_user_id?: string | null
          consumed_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          marketplace_order_id: string
          status?: string
          verified_at?: string | null
        }
        Update: {
          claim_email?: string
          claim_token?: string
          claimed_at?: string | null
          claimed_clerk_user_id?: string | null
          claimed_user_id?: string | null
          consumed_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          marketplace_order_id?: string
          status?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activation_claims_claimed_user_id_fkey"
            columns: ["claimed_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activation_claims_marketplace_order_id_fkey"
            columns: ["marketplace_order_id"]
            isOneToOne: false
            referencedRelation: "marketplace_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_cards: {
        Row: {
          category: Database["public"]["Enums"]["admin_card_category"]
          confidence_score: number | null
          created_at: string
          editor_notes: string | null
          id: string
          import_id: string | null
          source_quotes: string[]
          source_refs: string[]
          status: Database["public"]["Enums"]["admin_card_status"]
          structured_data: Json
          summary: string | null
          tags: string[]
          title: string
          updated_at: string
          usable_copy: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["admin_card_category"]
          confidence_score?: number | null
          created_at?: string
          editor_notes?: string | null
          id?: string
          import_id?: string | null
          source_quotes?: string[]
          source_refs?: string[]
          status?: Database["public"]["Enums"]["admin_card_status"]
          structured_data?: Json
          summary?: string | null
          tags?: string[]
          title: string
          updated_at?: string
          usable_copy?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["admin_card_category"]
          confidence_score?: number | null
          created_at?: string
          editor_notes?: string | null
          id?: string
          import_id?: string | null
          source_quotes?: string[]
          source_refs?: string[]
          status?: Database["public"]["Enums"]["admin_card_status"]
          structured_data?: Json
          summary?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          usable_copy?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_cards_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "admin_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_imports: {
        Row: {
          cleaned_content: string | null
          created_at: string
          error_message: string | null
          id: string
          import_type: Database["public"]["Enums"]["admin_import_type"]
          raw_content: string | null
          source_id: string | null
          status: Database["public"]["Enums"]["admin_import_status"]
          title: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          cleaned_content?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          import_type: Database["public"]["Enums"]["admin_import_type"]
          raw_content?: string | null
          source_id?: string | null
          status?: Database["public"]["Enums"]["admin_import_status"]
          title?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          cleaned_content?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          import_type?: Database["public"]["Enums"]["admin_import_type"]
          raw_content?: string | null
          source_id?: string | null
          status?: Database["public"]["Enums"]["admin_import_status"]
          title?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_imports_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "admin_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_planner_mappings: {
        Row: {
          card_id: string
          confidence_override: number | null
          created_at: string
          customized_only: boolean
          default_eligible: boolean
          id: string
          planner_layer: Database["public"]["Enums"]["admin_planner_layer"]
          priority_weight: number
          updated_at: string
          use_case: string | null
        }
        Insert: {
          card_id: string
          confidence_override?: number | null
          created_at?: string
          customized_only?: boolean
          default_eligible?: boolean
          id?: string
          planner_layer: Database["public"]["Enums"]["admin_planner_layer"]
          priority_weight?: number
          updated_at?: string
          use_case?: string | null
        }
        Update: {
          card_id?: string
          confidence_override?: number | null
          created_at?: string
          customized_only?: boolean
          default_eligible?: boolean
          id?: string
          planner_layer?: Database["public"]["Enums"]["admin_planner_layer"]
          priority_weight?: number
          updated_at?: string
          use_case?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_planner_mappings_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "admin_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_sources: {
        Row: {
          active: boolean
          astrologer_name: string | null
          created_at: string
          description: string | null
          id: string
          source_name: string
          source_type: Database["public"]["Enums"]["admin_source_type"]
          tags: string[]
          trust_level: Database["public"]["Enums"]["admin_trust_level"]
          updated_at: string
          url: string | null
        }
        Insert: {
          active?: boolean
          astrologer_name?: string | null
          created_at?: string
          description?: string | null
          id?: string
          source_name: string
          source_type: Database["public"]["Enums"]["admin_source_type"]
          tags?: string[]
          trust_level?: Database["public"]["Enums"]["admin_trust_level"]
          updated_at?: string
          url?: string | null
        }
        Update: {
          active?: boolean
          astrologer_name?: string | null
          created_at?: string
          description?: string | null
          id?: string
          source_name?: string
          source_type?: Database["public"]["Enums"]["admin_source_type"]
          tags?: string[]
          trust_level?: Database["public"]["Enums"]["admin_trust_level"]
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      ai_usage: {
        Row: {
          cache_creation_tokens: number
          created_at: string
          feature: string
          id: string
          input_tokens: number
          input_tokens_cached: number
          message_count: number
          model: string
          output_tokens: number
          period_month: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cache_creation_tokens?: number
          created_at?: string
          feature: string
          id?: string
          input_tokens?: number
          input_tokens_cached?: number
          message_count?: number
          model: string
          output_tokens?: number
          period_month: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cache_creation_tokens?: number
          created_at?: string
          feature?: string
          id?: string
          input_tokens?: number
          input_tokens_cached?: number
          message_count?: number
          model?: string
          output_tokens?: number
          period_month?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      area_goals: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          id: string
          linked_week_number: number | null
          sort_order: number
          status: string
          target_label: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          linked_week_number?: number | null
          sort_order?: number
          status?: string
          target_label?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          linked_week_number?: number | null
          sort_order?: number
          status?: string
          target_label?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "area_goals_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "goal_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "area_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blueprints: {
        Row: {
          astrological_context: string | null
          created_at: string | null
          error_message: string | null
          generated_at: string | null
          generation_prompt: string | null
          house_system: string | null
          id: string
          model_used: string | null
          months: Json | null
          plan_year: number
          push_periods: Json | null
          push_rest_arc: Json | null
          quarters: Json | null
          rest_periods: Json | null
          status: string
          tradition: string | null
          user_id: string
          version: number
          weeks: Json | null
          year_summary: string | null
          year_theme: string | null
        }
        Insert: {
          astrological_context?: string | null
          created_at?: string | null
          error_message?: string | null
          generated_at?: string | null
          generation_prompt?: string | null
          house_system?: string | null
          id?: string
          model_used?: string | null
          months?: Json | null
          plan_year: number
          push_periods?: Json | null
          push_rest_arc?: Json | null
          quarters?: Json | null
          rest_periods?: Json | null
          status?: string
          tradition?: string | null
          user_id: string
          version?: number
          weeks?: Json | null
          year_summary?: string | null
          year_theme?: string | null
        }
        Update: {
          astrological_context?: string | null
          created_at?: string | null
          error_message?: string | null
          generated_at?: string | null
          generation_prompt?: string | null
          house_system?: string | null
          id?: string
          model_used?: string | null
          months?: Json | null
          plan_year?: number
          push_periods?: Json | null
          push_rest_arc?: Json | null
          quarters?: Json | null
          rest_periods?: Json | null
          status?: string
          tradition?: string | null
          user_id?: string
          version?: number
          weeks?: Json | null
          year_summary?: string | null
          year_theme?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blueprints_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      capture_topics: {
        Row: {
          capture_id: string
          confidence: number
          created_at: string
          id: string
          kind: string
          label: string
          user_id: string
        }
        Insert: {
          capture_id: string
          confidence?: number
          created_at?: string
          id?: string
          kind: string
          label: string
          user_id: string
        }
        Update: {
          capture_id?: string
          confidence?: number
          created_at?: string
          id?: string
          kind?: string
          label?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "capture_topics_capture_id_fkey"
            columns: ["capture_id"]
            isOneToOne: false
            referencedRelation: "oracle_captures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capture_topics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_plans: {
        Row: {
          approved_at: string | null
          constraints: string | null
          created_at: string | null
          curriculum: Json
          duration_weeks: number
          id: string
          intensity: string
          objectives: Json
          outcomes: Json
          skills: Json
          start_date: string | null
          status: string
          summary: string | null
          title: string
          topic: string
          updated_at: string | null
          user_id: string
          weekly_hours: number
        }
        Insert: {
          approved_at?: string | null
          constraints?: string | null
          created_at?: string | null
          curriculum: Json
          duration_weeks: number
          id?: string
          intensity: string
          objectives?: Json
          outcomes?: Json
          skills?: Json
          start_date?: string | null
          status?: string
          summary?: string | null
          title: string
          topic: string
          updated_at?: string | null
          user_id: string
          weekly_hours: number
        }
        Update: {
          approved_at?: string | null
          constraints?: string | null
          created_at?: string | null
          curriculum?: Json
          duration_weeks?: number
          id?: string
          intensity?: string
          objectives?: Json
          outcomes?: Json
          skills?: Json
          start_date?: string | null
          status?: string
          summary?: string | null
          title?: string
          topic?: string
          updated_at?: string | null
          user_id?: string
          weekly_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_session_content: {
        Row: {
          body: string
          curriculum_plan_id: string
          exercises: Json
          generated_at: string
          id: string
          model: string
          reflection_prompt: string | null
          session_order: number
          updated_at: string
          user_id: string
          week_number: number
        }
        Insert: {
          body: string
          curriculum_plan_id: string
          exercises?: Json
          generated_at?: string
          id?: string
          model: string
          reflection_prompt?: string | null
          session_order: number
          updated_at?: string
          user_id: string
          week_number: number
        }
        Update: {
          body?: string
          curriculum_plan_id?: string
          exercises?: Json
          generated_at?: string
          id?: string
          model?: string
          reflection_prompt?: string | null
          session_order?: number
          updated_at?: string
          user_id?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_session_content_curriculum_plan_id_fkey"
            columns: ["curriculum_plan_id"]
            isOneToOne: false
            referencedRelation: "curriculum_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_session_content_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_session_progress: {
        Row: {
          completed_at: string | null
          created_at: string | null
          curriculum_plan_id: string
          id: string
          session_order: number
          updated_at: string | null
          user_id: string
          week_number: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          curriculum_plan_id: string
          id?: string
          session_order: number
          updated_at?: string | null
          user_id: string
          week_number: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          curriculum_plan_id?: string
          id?: string
          session_order?: number
          updated_at?: string | null
          user_id?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_session_progress_curriculum_plan_id_fkey"
            columns: ["curriculum_plan_id"]
            isOneToOne: false
            referencedRelation: "curriculum_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_session_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_sessions: {
        Row: {
          created_at: string | null
          curriculum_plan_id: string
          curriculum_title: string
          description: string | null
          estimated_minutes: number
          id: string
          scheduled_for: string
          session_order: number
          session_type: string
          status: string
          title: string
          user_id: string
          week_number: number
        }
        Insert: {
          created_at?: string | null
          curriculum_plan_id: string
          curriculum_title: string
          description?: string | null
          estimated_minutes: number
          id?: string
          scheduled_for: string
          session_order: number
          session_type: string
          status?: string
          title: string
          user_id: string
          week_number: number
        }
        Update: {
          created_at?: string | null
          curriculum_plan_id?: string
          curriculum_title?: string
          description?: string | null
          estimated_minutes?: number
          id?: string
          scheduled_for?: string
          session_order?: number
          session_type?: string
          status?: string
          title?: string
          user_id?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_sessions_curriculum_plan_id_fkey"
            columns: ["curriculum_plan_id"]
            isOneToOne: false
            referencedRelation: "curriculum_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cycle_entries: {
        Row: {
          created_at: string | null
          cycle_length: number | null
          id: string
          notes: Json | null
          period_end: string | null
          period_start: string
          symptoms: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          cycle_length?: number | null
          id?: string
          notes?: Json | null
          period_end?: string | null
          period_start: string
          symptoms?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          cycle_length?: number | null
          id?: string
          notes?: Json | null
          period_end?: string | null
          period_start?: string
          symptoms?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cycle_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_logs: {
        Row: {
          created_at: string | null
          cycle_phase: string | null
          energy_level: number | null
          id: string
          log_date: string
          lunar_phase: string | null
          lunar_sign: string | null
          mood_tag: string | null
          notes: string | null
          updated_at: string | null
          user_id: string
          values: Json
        }
        Insert: {
          created_at?: string | null
          cycle_phase?: string | null
          energy_level?: number | null
          id?: string
          log_date: string
          lunar_phase?: string | null
          lunar_sign?: string | null
          mood_tag?: string | null
          notes?: string | null
          updated_at?: string | null
          user_id: string
          values?: Json
        }
        Update: {
          created_at?: string | null
          cycle_phase?: string | null
          energy_level?: number | null
          id?: string
          log_date?: string
          lunar_phase?: string | null
          lunar_sign?: string | null
          mood_tag?: string | null
          notes?: string | null
          updated_at?: string | null
          user_id?: string
          values?: Json
        }
        Relationships: [
          {
            foreignKeyName: "daily_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_purchase_orders: {
        Row: {
          access_plan: string
          amount_subtotal_cents: number | null
          amount_total_cents: number | null
          clerk_user_id: string
          created_at: string
          currency: string
          id: string
          metadata: Json
          oracle_enabled: boolean
          planner_year: number
          product_tier: string
          purchased_at: string | null
          purchaser_email: string
          status: string
          stripe_checkout_session_id: string
          stripe_customer_id: string | null
          stripe_payment_intent_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          stripe_subscription_item_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          access_plan?: string
          amount_subtotal_cents?: number | null
          amount_total_cents?: number | null
          clerk_user_id: string
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          oracle_enabled?: boolean
          planner_year: number
          product_tier: string
          purchased_at?: string | null
          purchaser_email: string
          status?: string
          stripe_checkout_session_id: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          stripe_subscription_item_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          access_plan?: string
          amount_subtotal_cents?: number | null
          amount_total_cents?: number | null
          clerk_user_id?: string
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          oracle_enabled?: boolean
          planner_year?: number
          product_tier?: string
          purchased_at?: string | null
          purchaser_email?: string
          status?: string
          stripe_checkout_session_id?: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          stripe_subscription_item_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "direct_purchase_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ephemeris_cache: {
        Row: {
          computed_at: string | null
          data: Json
          user_id: string
          year: number
        }
        Insert: {
          computed_at?: string | null
          data: Json
          user_id: string
          year: number
        }
        Update: {
          computed_at?: string | null
          data?: Json
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "ephemeris_cache_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          category: string
          created_at: string | null
          generation_ref: string | null
          id: string
          message: string | null
          page_context: string | null
          sub_category: string | null
          user_id: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          generation_ref?: string | null
          id?: string
          message?: string | null
          page_context?: string | null
          sub_category?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          generation_ref?: string | null
          id?: string
          message?: string | null
          page_context?: string | null
          sub_category?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_categories: {
        Row: {
          color_key: string | null
          created_at: string | null
          description: string | null
          icon_key: string | null
          id: string
          name: string
          sort_order: number
          success: string | null
          user_id: string
        }
        Insert: {
          color_key?: string | null
          created_at?: string | null
          description?: string | null
          icon_key?: string | null
          id?: string
          name: string
          sort_order?: number
          success?: string | null
          user_id: string
        }
        Update: {
          color_key?: string | null
          created_at?: string | null
          description?: string | null
          icon_key?: string | null
          id?: string
          name?: string
          sort_order?: number
          success?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_categories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          body: string
          created_at: string | null
          cycle_phase: string | null
          entry_date: string
          goal_tags: string[] | null
          id: string
          is_ritual: boolean | null
          lunar_phase: string | null
          lunar_sign: string | null
          mood_tag: string | null
          oracle_memory: boolean
          title: string | null
          transit_context: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          cycle_phase?: string | null
          entry_date: string
          goal_tags?: string[] | null
          id?: string
          is_ritual?: boolean | null
          lunar_phase?: string | null
          lunar_sign?: string | null
          mood_tag?: string | null
          oracle_memory?: boolean
          title?: string | null
          transit_context?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          cycle_phase?: string | null
          entry_date?: string
          goal_tags?: string[] | null
          id?: string
          is_ritual?: boolean | null
          lunar_phase?: string | null
          lunar_sign?: string | null
          mood_tag?: string | null
          oracle_memory?: boolean
          title?: string | null
          transit_context?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entry_aspects: {
        Row: {
          applying: boolean
          aspect: string
          aspect_key: string
          created_at: string
          entry_date: string
          id: string
          journal_entry_id: string
          lunar_phase: string | null
          lunar_sign: string | null
          natal_longitude: number | null
          natal_planet: string
          orb: number
          retrogrades: string[]
          transit_longitude: number | null
          transiting_planet: string
          user_id: string
        }
        Insert: {
          applying: boolean
          aspect: string
          aspect_key: string
          created_at?: string
          entry_date: string
          id?: string
          journal_entry_id: string
          lunar_phase?: string | null
          lunar_sign?: string | null
          natal_longitude?: number | null
          natal_planet: string
          orb: number
          retrogrades?: string[]
          transit_longitude?: number | null
          transiting_planet: string
          user_id: string
        }
        Update: {
          applying?: boolean
          aspect?: string
          aspect_key?: string
          created_at?: string
          entry_date?: string
          id?: string
          journal_entry_id?: string
          lunar_phase?: string | null
          lunar_sign?: string | null
          natal_longitude?: number | null
          natal_planet?: string
          orb?: number
          retrogrades?: string[]
          transit_longitude?: number | null
          transiting_planet?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_aspects_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_aspects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entry_sky: {
        Row: {
          created_at: string
          entry_date: string
          journal_entry_id: string
          moon_degree: number | null
          moon_illumination: number | null
          moon_phase: string | null
          moon_phase_event: string | null
          moon_sign: string | null
          retrogrades: string[]
          sun_degree: number | null
          sun_sign: string | null
          transit_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entry_date: string
          journal_entry_id: string
          moon_degree?: number | null
          moon_illumination?: number | null
          moon_phase?: string | null
          moon_phase_event?: string | null
          moon_sign?: string | null
          retrogrades?: string[]
          sun_degree?: number | null
          sun_sign?: string | null
          transit_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entry_date?: string
          journal_entry_id?: string
          moon_degree?: number | null
          moon_illumination?: number | null
          moon_phase?: string | null
          moon_phase_event?: string | null
          moon_sign?: string | null
          retrogrades?: string[]
          sun_degree?: number | null
          sun_sign?: string | null
          transit_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_sky_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: true
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_sky_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_rewards: {
        Row: {
          amount_off_cents: number | null
          created_at: string
          currency: string | null
          delivery_email: string
          entitlement_id: string | null
          id: string
          metadata: Json
          promotion_code: string | null
          redeem_by: string | null
          redeemed_at: string | null
          reward_year: number
          sent_at: string | null
          status: string
          stripe_coupon_id: string | null
          stripe_customer_id: string | null
          stripe_promotion_code_id: string | null
          user_id: string
        }
        Insert: {
          amount_off_cents?: number | null
          created_at?: string
          currency?: string | null
          delivery_email: string
          entitlement_id?: string | null
          id?: string
          metadata?: Json
          promotion_code?: string | null
          redeem_by?: string | null
          redeemed_at?: string | null
          reward_year: number
          sent_at?: string | null
          status?: string
          stripe_coupon_id?: string | null
          stripe_customer_id?: string | null
          stripe_promotion_code_id?: string | null
          user_id: string
        }
        Update: {
          amount_off_cents?: number | null
          created_at?: string
          currency?: string | null
          delivery_email?: string
          entitlement_id?: string | null
          id?: string
          metadata?: Json
          promotion_code?: string | null
          redeem_by?: string | null
          redeemed_at?: string | null
          reward_year?: number
          sent_at?: string | null
          status?: string
          stripe_coupon_id?: string | null
          stripe_customer_id?: string | null
          stripe_promotion_code_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_rewards_entitlement_id_fkey"
            columns: ["entitlement_id"]
            isOneToOne: false
            referencedRelation: "product_entitlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_rewards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_orders: {
        Row: {
          access_plan: string
          claimed_at: string | null
          claimed_user_id: string | null
          etsy_listing_id: string | null
          etsy_sku: string | null
          external_order_id: string
          id: string
          imported_at: string
          listing_key: string | null
          metadata: Json
          oracle_enabled: boolean
          planner_year: number
          product_tier: string
          purchased_at: string | null
          purchaser_email: string
          purchaser_name: string | null
          source: string
          source_message_id: string | null
          status: string
        }
        Insert: {
          access_plan?: string
          claimed_at?: string | null
          claimed_user_id?: string | null
          etsy_listing_id?: string | null
          etsy_sku?: string | null
          external_order_id: string
          id?: string
          imported_at?: string
          listing_key?: string | null
          metadata?: Json
          oracle_enabled?: boolean
          planner_year: number
          product_tier: string
          purchased_at?: string | null
          purchaser_email: string
          purchaser_name?: string | null
          source: string
          source_message_id?: string | null
          status?: string
        }
        Update: {
          access_plan?: string
          claimed_at?: string | null
          claimed_user_id?: string | null
          etsy_listing_id?: string | null
          etsy_sku?: string | null
          external_order_id?: string
          id?: string
          imported_at?: string
          listing_key?: string | null
          metadata?: Json
          oracle_enabled?: boolean
          planner_year?: number
          product_tier?: string
          purchased_at?: string | null
          purchaser_email?: string
          purchaser_name?: string | null
          source?: string
          source_message_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_orders_claimed_user_id_fkey"
            columns: ["claimed_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      month_briefs: {
        Row: {
          blueprint_id: string | null
          brief_text: string
          edited_at: string | null
          generated_at: string
          id: string
          model_used: string
          month: number
          pinned: boolean
          plan_year: number
          user_id: string
        }
        Insert: {
          blueprint_id?: string | null
          brief_text: string
          edited_at?: string | null
          generated_at?: string
          id?: string
          model_used?: string
          month: number
          pinned?: boolean
          plan_year: number
          user_id: string
        }
        Update: {
          blueprint_id?: string | null
          brief_text?: string
          edited_at?: string | null
          generated_at?: string
          id?: string
          model_used?: string
          month?: number
          pinned?: boolean
          plan_year?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "month_briefs_blueprint_id_fkey"
            columns: ["blueprint_id"]
            isOneToOne: false
            referencedRelation: "blueprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "month_briefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      oracle_captures: {
        Row: {
          captured_text: string
          created_at: string
          id: string
          include_in_insights: boolean
          include_in_planner: boolean
          source_excerpt: string | null
          source_message_id: string | null
          source_role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          captured_text: string
          created_at?: string
          id?: string
          include_in_insights?: boolean
          include_in_planner?: boolean
          source_excerpt?: string | null
          source_message_id?: string | null
          source_role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          captured_text?: string
          created_at?: string
          id?: string
          include_in_insights?: boolean
          include_in_planner?: boolean
          source_excerpt?: string | null
          source_message_id?: string | null
          source_role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oracle_captures_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_items: {
        Row: {
          area_goal_id: string | null
          completed_at: string | null
          created_at: string
          duration_minutes: number
          id: string
          item_date: string
          sort_order: number
          source: string
          start_minute: number | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          area_goal_id?: string | null
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          item_date: string
          sort_order?: number
          source?: string
          start_minute?: number | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          area_goal_id?: string | null
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          item_date?: string
          sort_order?: number
          source?: string
          start_minute?: number | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_items_area_goal_id_fkey"
            columns: ["area_goal_id"]
            isOneToOne: false
            referencedRelation: "area_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_entitlements: {
        Row: {
          access_plan: string
          created_at: string
          ends_at: string
          id: string
          oracle_enabled: boolean
          planner_year: number
          product_tier: string
          source: string
          source_order_id: string | null
          starts_at: string
          status: string
          user_id: string
        }
        Insert: {
          access_plan?: string
          created_at?: string
          ends_at: string
          id?: string
          oracle_enabled?: boolean
          planner_year: number
          product_tier: string
          source: string
          source_order_id?: string | null
          starts_at: string
          status?: string
          user_id: string
        }
        Update: {
          access_plan?: string
          created_at?: string
          ends_at?: string
          id?: string
          oracle_enabled?: boolean
          planner_year?: number
          product_tier?: string
          source?: string
          source_order_id?: string | null
          starts_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_entitlements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quarterly_reviews: {
        Row: {
          ai_summary: string | null
          challenges: Json | null
          completed_at: string | null
          created_at: string | null
          id: string
          next_quarter_intentions: string | null
          pivots: string | null
          plan_year: number
          quarter: number
          stats_snapshot: Json | null
          user_id: string
          wins: Json | null
        }
        Insert: {
          ai_summary?: string | null
          challenges?: Json | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          next_quarter_intentions?: string | null
          pivots?: string | null
          plan_year: number
          quarter: number
          stats_snapshot?: Json | null
          user_id: string
          wins?: Json | null
        }
        Update: {
          ai_summary?: string | null
          challenges?: Json | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          next_quarter_intentions?: string | null
          pivots?: string | null
          plan_year?: number
          quarter?: number
          stats_snapshot?: Json | null
          user_id?: string
          wins?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "quarterly_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tracker_metrics: {
        Row: {
          category_id: string | null
          config: Json | null
          created_at: string | null
          data_type: string
          id: string
          is_active: boolean | null
          key: string
          label: string
          sort_order: number | null
          user_id: string
        }
        Insert: {
          category_id?: string | null
          config?: Json | null
          created_at?: string | null
          data_type: string
          id?: string
          is_active?: boolean | null
          key: string
          label: string
          sort_order?: number | null
          user_id: string
        }
        Update: {
          category_id?: string | null
          config?: Json | null
          created_at?: string | null
          data_type?: string
          id?: string
          is_active?: boolean | null
          key?: string
          label?: string
          sort_order?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracker_metrics_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "goal_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracker_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_pattern_insights: {
        Row: {
          ai_summary: string | null
          ai_summary_voice_label: string | null
          ai_synthesizing_at: string | null
          confidence: number
          created_at: string
          evidence: Json
          first_seen: string | null
          id: string
          last_entry_id: string | null
          last_seen: string | null
          pattern_key: string
          pattern_type: string
          sample_size: number
          summary: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_summary?: string | null
          ai_summary_voice_label?: string | null
          ai_synthesizing_at?: string | null
          confidence?: number
          created_at?: string
          evidence?: Json
          first_seen?: string | null
          id?: string
          last_entry_id?: string | null
          last_seen?: string | null
          pattern_key: string
          pattern_type: string
          sample_size?: number
          summary: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_summary?: string | null
          ai_summary_voice_label?: string | null
          ai_synthesizing_at?: string | null
          confidence?: number
          created_at?: string
          evidence?: Json
          first_seen?: string | null
          id?: string
          last_entry_id?: string | null
          last_seen?: string | null
          pattern_key?: string
          pattern_type?: string
          sample_size?: number
          summary?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_pattern_insights_last_entry_id_fkey"
            columns: ["last_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_pattern_insights_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avg_cycle_length: number | null
          avg_period_length: number | null
          birth_city: string | null
          birth_date: string | null
          birth_lat: number | null
          birth_lng: number | null
          birth_time: string | null
          birth_time_unknown: boolean | null
          birth_tz: string | null
          clerk_user_id: string
          created_at: string | null
          cycle_enabled: boolean | null
          display_name: string | null
          email: string
          house_system: string | null
          human_design: Json | null
          id: string
          last_period_start: string | null
          marketing_consent: boolean
          marketing_consent_at: string | null
          natal_chart: Json | null
          onboarding_completed_at: string | null
          plan_year: number | null
          planner_lat: number | null
          planner_lng: number | null
          planner_tz: string | null
          study_focus: string | null
          theme: string
          tradition: string | null
          updated_at: string | null
          what_to_release: string | null
          word_of_year: string | null
          year_vision: string | null
        }
        Insert: {
          avg_cycle_length?: number | null
          avg_period_length?: number | null
          birth_city?: string | null
          birth_date?: string | null
          birth_lat?: number | null
          birth_lng?: number | null
          birth_time?: string | null
          birth_time_unknown?: boolean | null
          birth_tz?: string | null
          clerk_user_id: string
          created_at?: string | null
          cycle_enabled?: boolean | null
          display_name?: string | null
          email: string
          house_system?: string | null
          human_design?: Json | null
          id?: string
          last_period_start?: string | null
          marketing_consent?: boolean
          marketing_consent_at?: string | null
          natal_chart?: Json | null
          onboarding_completed_at?: string | null
          plan_year?: number | null
          planner_lat?: number | null
          planner_lng?: number | null
          planner_tz?: string | null
          study_focus?: string | null
          theme?: string
          tradition?: string | null
          updated_at?: string | null
          what_to_release?: string | null
          word_of_year?: string | null
          year_vision?: string | null
        }
        Update: {
          avg_cycle_length?: number | null
          avg_period_length?: number | null
          birth_city?: string | null
          birth_date?: string | null
          birth_lat?: number | null
          birth_lng?: number | null
          birth_time?: string | null
          birth_time_unknown?: boolean | null
          birth_tz?: string | null
          clerk_user_id?: string
          created_at?: string | null
          cycle_enabled?: boolean | null
          display_name?: string | null
          email?: string
          house_system?: string | null
          human_design?: Json | null
          id?: string
          last_period_start?: string | null
          marketing_consent?: boolean
          marketing_consent_at?: string | null
          natal_chart?: Json | null
          onboarding_completed_at?: string | null
          plan_year?: number | null
          planner_lat?: number | null
          planner_lng?: number | null
          planner_tz?: string | null
          study_focus?: string | null
          theme?: string
          tradition?: string | null
          updated_at?: string | null
          what_to_release?: string | null
          word_of_year?: string | null
          year_vision?: string | null
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          journal_insight_voice: string | null
          journal_insight_voice_label: string | null
          journal_insight_voice_updated_at: string | null
          jupiter_season_read: string | null
          jupiter_season_read_at: string | null
          jupiter_season_signature: string | null
          season_read: string | null
          season_read_at: string | null
          season_read_signature: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          journal_insight_voice?: string | null
          journal_insight_voice_label?: string | null
          journal_insight_voice_updated_at?: string | null
          jupiter_season_read?: string | null
          jupiter_season_read_at?: string | null
          jupiter_season_signature?: string | null
          season_read?: string | null
          season_read_at?: string | null
          season_read_signature?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          journal_insight_voice?: string | null
          journal_insight_voice_label?: string | null
          journal_insight_voice_updated_at?: string | null
          jupiter_season_read?: string | null
          jupiter_season_read_at?: string | null
          jupiter_season_signature?: string | null
          season_read?: string | null
          season_read_at?: string | null
          season_read_signature?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      app_current_clerk_user_id: { Args: never; Returns: string }
      increment_ai_usage: {
        Args: {
          p_cache_creation_tokens: number
          p_feature: string
          p_input_tokens: number
          p_input_tokens_cached: number
          p_messages: number
          p_model: string
          p_output_tokens: number
          p_period_month: string
          p_user_id: string
        }
        Returns: undefined
      }
      refresh_user_pattern_insight: {
        Args: {
          p_last_entry_id?: string
          p_pattern_key: string
          p_pattern_type: string
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      admin_card_category:
        | "rising_sign"
        | "house"
        | "planet"
        | "transit_timing"
        | "planner_translation"
        | "general_framework"
      admin_card_status: "draft" | "approved" | "rejected"
      admin_import_status: "pending" | "fetched" | "processed" | "failed"
      admin_import_type:
        | "youtube_transcript"
        | "podcast_transcript"
        | "manual_paste"
        | "url_scrape"
      admin_planner_layer: "year" | "month" | "week" | "day"
      admin_source_type:
        | "youtube_video"
        | "youtube_channel"
        | "podcast"
        | "website"
        | "book"
        | "newsletter"
        | "other"
      admin_trust_level: "low" | "medium" | "high" | "verified"
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
      admin_card_category: [
        "rising_sign",
        "house",
        "planet",
        "transit_timing",
        "planner_translation",
        "general_framework",
      ],
      admin_card_status: ["draft", "approved", "rejected"],
      admin_import_status: ["pending", "fetched", "processed", "failed"],
      admin_import_type: [
        "youtube_transcript",
        "podcast_transcript",
        "manual_paste",
        "url_scrape",
      ],
      admin_planner_layer: ["year", "month", "week", "day"],
      admin_source_type: [
        "youtube_video",
        "youtube_channel",
        "podcast",
        "website",
        "book",
        "newsletter",
        "other",
      ],
      admin_trust_level: ["low", "medium", "high", "verified"],
    },
  },
} as const
