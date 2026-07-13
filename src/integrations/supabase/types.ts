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
      ai_diagnostics: {
        Row: {
          ai_diagnosis: string
          created_at: string
          estimated_cost: number | null
          id: string
          image_url: string | null
          problem_input: string | null
          recommended_specialty: string | null
          user_id: string
        }
        Insert: {
          ai_diagnosis: string
          created_at?: string
          estimated_cost?: number | null
          id?: string
          image_url?: string | null
          problem_input?: string | null
          recommended_specialty?: string | null
          user_id: string
        }
        Update: {
          ai_diagnosis?: string
          created_at?: string
          estimated_cost?: number | null
          id?: string
          image_url?: string | null
          problem_input?: string | null
          recommended_specialty?: string | null
          user_id?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          full_name: string
          id: string
          kind: string
          message: string
          phone: string
          status: string
          subject: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          kind?: string
          message: string
          phone: string
          status?: string
          subject: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          kind?: string
          message?: string
          phone?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      market_orders: {
        Row: {
          address: string
          created_at: string
          customer_id: string
          id: string
          notes: string | null
          phone: string
          product_id: string
          quantity: number
          status: string
          total_price: number
          updated_at: string
        }
        Insert: {
          address: string
          created_at?: string
          customer_id: string
          id?: string
          notes?: string | null
          phone: string
          product_id: string
          quantity?: number
          status?: string
          total_price?: number
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          customer_id?: string
          id?: string
          notes?: string | null
          phone?: string
          product_id?: string
          quantity?: number
          status?: string
          total_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "market_products"
            referencedColumns: ["id"]
          },
        ]
      }
      market_products: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price: number
          stock: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price?: number
          stock?: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price?: number
          stock?: number
          updated_at?: string
        }
        Relationships: []
      }
      masters: {
        Row: {
          bio: string | null
          completed_jobs: number | null
          created_at: string
          experience_years: number | null
          hourly_rate: number | null
          id: string
          is_available: boolean
          rating: number | null
          specialty: string
          tuman: string | null
          updated_at: string
          user_id: string
          viloyat: string
        }
        Insert: {
          bio?: string | null
          completed_jobs?: number | null
          created_at?: string
          experience_years?: number | null
          hourly_rate?: number | null
          id?: string
          is_available?: boolean
          rating?: number | null
          specialty: string
          tuman?: string | null
          updated_at?: string
          user_id: string
          viloyat: string
        }
        Update: {
          bio?: string | null
          completed_jobs?: number | null
          created_at?: string
          experience_years?: number | null
          hourly_rate?: number | null
          id?: string
          is_available?: boolean
          rating?: number | null
          specialty?: string
          tuman?: string | null
          updated_at?: string
          user_id?: string
          viloyat?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          address: string | null
          created_at: string
          customer_id: string
          id: string
          master_id: string | null
          notes: string | null
          price: number | null
          problem_description: string | null
          provider_id: string | null
          scheduled_date: string | null
          status: Database["public"]["Enums"]["order_status"]
          technique_id: string | null
          type: Database["public"]["Enums"]["order_type"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          customer_id: string
          id?: string
          master_id?: string | null
          notes?: string | null
          price?: number | null
          problem_description?: string | null
          provider_id?: string | null
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          technique_id?: string | null
          type: Database["public"]["Enums"]["order_type"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          master_id?: string | null
          notes?: string | null
          price?: number | null
          problem_description?: string | null
          provider_id?: string | null
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          technique_id?: string | null
          type?: Database["public"]["Enums"]["order_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_master_id_fkey"
            columns: ["master_id"]
            isOneToOne: false
            referencedRelation: "masters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_technique_id_fkey"
            columns: ["technique_id"]
            isOneToOne: false
            referencedRelation: "techniques"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          tuman: string | null
          updated_at: string
          viloyat: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          tuman?: string | null
          updated_at?: string
          viloyat?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          tuman?: string | null
          updated_at?: string
          viloyat?: string | null
        }
        Relationships: []
      }
      technique_categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      techniques: {
        Row: {
          brand: string | null
          category_id: string | null
          created_at: string
          daily_price: number | null
          description: string | null
          hourly_price: number | null
          id: string
          image_url: string | null
          is_available: boolean
          name: string
          owner_id: string
          rating: number | null
          tuman: string | null
          updated_at: string
          viloyat: string
          year: number | null
        }
        Insert: {
          brand?: string | null
          category_id?: string | null
          created_at?: string
          daily_price?: number | null
          description?: string | null
          hourly_price?: number | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name: string
          owner_id: string
          rating?: number | null
          tuman?: string | null
          updated_at?: string
          viloyat: string
          year?: number | null
        }
        Update: {
          brand?: string | null
          category_id?: string | null
          created_at?: string
          daily_price?: number | null
          description?: string | null
          hourly_price?: number | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name?: string
          owner_id?: string
          rating?: number | null
          tuman?: string | null
          updated_at?: string
          viloyat?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "techniques_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "technique_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_links: {
        Row: {
          code_expires_at: string | null
          created_at: string
          id: string
          link_code: string | null
          linked_at: string | null
          telegram_id: number | null
          telegram_username: string | null
          user_id: string | null
        }
        Insert: {
          code_expires_at?: string | null
          created_at?: string
          id?: string
          link_code?: string | null
          linked_at?: string | null
          telegram_id?: number | null
          telegram_username?: string | null
          user_id?: string | null
        }
        Update: {
          code_expires_at?: string | null
          created_at?: string
          id?: string
          link_code?: string | null
          linked_at?: string | null
          telegram_id?: number | null
          telegram_username?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "fermer" | "usta" | "texnika_egasi"
      order_status: "yaratildi" | "jarayonda" | "yolda" | "bajarildi" | "bekor"
      order_type: "texnika_ijarasi" | "usta_chaqirish"
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
      app_role: ["admin", "fermer", "usta", "texnika_egasi"],
      order_status: ["yaratildi", "jarayonda", "yolda", "bajarildi", "bekor"],
      order_type: ["texnika_ijarasi", "usta_chaqirish"],
    },
  },
} as const
