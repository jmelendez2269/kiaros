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
      blueprints: {
        Row: {
          astrological_context: string | null
          created_at: string | null
          error_message: string | null
          generated_at: string | null
          generation_prompt: string | null
          id: string
          model_used: string | null
          months: Json | null
          plan_year: number
          push_periods: Json | null
          quarters: Json | null
          rest_periods: Json | null
          status: string
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
          id?: string
          model_used?: string | null
          months?: Json | null
          plan_year: number
          push_periods?: Json | null
          quarters?: Json | null
          rest_periods?: Json | null
          status?: string
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
          id?: string
          model_used?: string | null
          months?: Json | null
          plan_year?: number
          push_periods?: Json | null
          quarters?: Json | null
          rest_periods?: Json | null
          status?: string
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
          id: string
          last_period_start: string | null
          natal_chart: Json | null
          onboarding_completed_at: string | null
          plan_year: number | null
          study_focus: string | null
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
          id?: string
          last_period_start?: string | null
          natal_chart?: Json | null
          onboarding_completed_at?: string | null
          plan_year?: number | null
          study_focus?: string | null
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
          id?: string
          last_period_start?: string | null
          natal_chart?: Json | null
          onboarding_completed_at?: string | null
          plan_year?: number | null
          study_focus?: string | null
          updated_at?: string | null
          what_to_release?: string | null
          word_of_year?: string | null
          year_vision?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      app_current_clerk_user_id: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
