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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      approval_history: {
        Row: {
          action: string
          approver_id: string
          approver_role: Database["public"]["Enums"]["app_role"]
          comments: string
          created_at: string
          id: string
          inspection_id: string
          new_status: Database["public"]["Enums"]["inspection_status"]
          previous_status: Database["public"]["Enums"]["inspection_status"]
        }
        Insert: {
          action: string
          approver_id: string
          approver_role: Database["public"]["Enums"]["app_role"]
          comments: string
          created_at?: string
          id?: string
          inspection_id: string
          new_status: Database["public"]["Enums"]["inspection_status"]
          previous_status: Database["public"]["Enums"]["inspection_status"]
        }
        Update: {
          action?: string
          approver_id?: string
          approver_role?: Database["public"]["Enums"]["app_role"]
          comments?: string
          created_at?: string
          id?: string
          inspection_id?: string
          new_status?: Database["public"]["Enums"]["inspection_status"]
          previous_status?: Database["public"]["Enums"]["inspection_status"]
        }
        Relationships: [
          {
            foreignKeyName: "approval_history_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_history_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_images: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string
          inspection_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url: string
          inspection_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string
          inspection_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_images_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_results: {
        Row: {
          actual_value: string
          created_at: string
          id: string
          inspection_id: string
          is_pass: boolean
          remarks: string | null
          specification_id: string
        }
        Insert: {
          actual_value: string
          created_at?: string
          id?: string
          inspection_id: string
          is_pass: boolean
          remarks?: string | null
          specification_id: string
        }
        Update: {
          actual_value?: string
          created_at?: string
          id?: string
          inspection_id?: string
          is_pass?: boolean
          remarks?: string | null
          specification_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_results_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_results_specification_id_fkey"
            columns: ["specification_id"]
            isOneToOne: false
            referencedRelation: "specifications"
            referencedColumns: ["id"]
          },
        ]
      }
      inspections: {
        Row: {
          batch_number: string | null
          created_at: string
          created_by: string
          id: string
          inspection_number: string
          product_id: string
          remarks: string | null
          status: Database["public"]["Enums"]["inspection_status"]
          updated_at: string
        }
        Insert: {
          batch_number?: string | null
          created_at?: string
          created_by: string
          id?: string
          inspection_number: string
          product_id: string
          remarks?: string | null
          status?: Database["public"]["Enums"]["inspection_status"]
          updated_at?: string
        }
        Update: {
          batch_number?: string | null
          created_at?: string
          created_by?: string
          id?: string
          inspection_number?: string
          product_id?: string
          remarks?: string | null
          status?: Database["public"]["Enums"]["inspection_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          part_number: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          part_number: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          part_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      specifications: {
        Row: {
          check_method: string | null
          condition_description: string | null
          created_at: string
          evidence_required: boolean | null
          id: string
          parameter_name: string
          photo_required: boolean | null
          product_id: string
          remarks_required: boolean | null
          result_type: string | null
          specification_type: Database["public"]["Enums"]["specification_type"]
          standard_value: string
          test_description: string | null
          tolerance_max: number | null
          tolerance_min: number | null
          unit: string | null
        }
        Insert: {
          check_method?: string | null
          condition_description?: string | null
          created_at?: string
          evidence_required?: boolean | null
          id?: string
          parameter_name: string
          photo_required?: boolean | null
          product_id: string
          remarks_required?: boolean | null
          result_type?: string | null
          specification_type?: Database["public"]["Enums"]["specification_type"]
          standard_value: string
          test_description?: string | null
          tolerance_max?: number | null
          tolerance_min?: number | null
          unit?: string | null
        }
        Update: {
          check_method?: string | null
          condition_description?: string | null
          created_at?: string
          evidence_required?: boolean | null
          id?: string
          parameter_name?: string
          photo_required?: boolean | null
          product_id?: string
          remarks_required?: boolean | null
          result_type?: string | null
          specification_type?: Database["public"]["Enums"]["specification_type"]
          standard_value?: string
          test_description?: string | null
          tolerance_max?: number | null
          tolerance_min?: number | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "specifications_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_role_after_registration: {
        Args: { _registration_code: string; _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      generate_inspection_number: { Args: never; Returns: string }
      get_role_for_registration_code: {
        Args: { _registration_code: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      quality_head_exists: { Args: never; Returns: boolean }
      validate_registration_code: {
        Args: { _registration_code: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "auditor" | "team_leader" | "hof_auditor" | "quality_head"
      inspection_status:
        | "pending_team_leader"
        | "pending_hof_auditor"
        | "pending_quality_head"
        | "approved"
        | "rejected"
      specification_type: "dimensional" | "visual" | "functional" | "compliance"
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
      app_role: ["auditor", "team_leader", "hof_auditor", "quality_head"],
      inspection_status: [
        "pending_team_leader",
        "pending_hof_auditor",
        "pending_quality_head",
        "approved",
        "rejected",
      ],
      specification_type: ["dimensional", "visual", "functional", "compliance"],
    },
  },
} as const
