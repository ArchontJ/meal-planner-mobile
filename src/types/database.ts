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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      meal_items: {
        Row: {
          grams: number | null
          id: string
          meal_id: string
          portions: number | null
          position: number
          product_id: string | null
          recipe_id: string | null
        }
        Insert: {
          grams?: number | null
          id?: string
          meal_id: string
          portions?: number | null
          position?: number
          product_id?: string | null
          recipe_id?: string | null
        }
        Update: {
          grams?: number | null
          id?: string
          meal_id?: string
          portions?: number | null
          position?: number
          product_id?: string | null
          recipe_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meal_items_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "meals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "my_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_macros"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "meal_items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "shared_recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_slots: {
        Row: {
          default_key: string | null
          id: string
          is_active: boolean
          name: string | null
          position: number
          user_id: string
        }
        Insert: {
          default_key?: string | null
          id?: string
          is_active?: boolean
          name?: string | null
          position?: number
          user_id?: string
        }
        Update: {
          default_key?: string | null
          id?: string
          is_active?: boolean
          name?: string | null
          position?: number
          user_id?: string
        }
        Relationships: []
      }
      meals: {
        Row: {
          date: string
          id: string
          note: string | null
          slot_id: string
          user_id: string
        }
        Insert: {
          date: string
          id?: string
          note?: string | null
          slot_id: string
          user_id?: string
        }
        Update: {
          date?: string
          id?: string
          note?: string | null
          slot_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meals_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "meal_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          id: string
          key: string | null
          name: string
          name_en: string | null
          position: number
          user_id: string | null
        }
        Insert: {
          id?: string
          key?: string | null
          name: string
          name_en?: string | null
          position?: number
          user_id?: string | null
        }
        Update: {
          id?: string
          key?: string | null
          name?: string
          name_en?: string | null
          position?: number
          user_id?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          archived_at: string | null
          carbs: number
          category_id: string
          copied_from_product: string | null
          created_at: string
          created_by: string | null
          ean: string | null
          fat: number
          id: string
          kcal: number
          name: string
          off_categories: string[] | null
          owner_id: string | null
          producer: string | null
          protein: number
          source: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          carbs: number
          category_id: string
          copied_from_product?: string | null
          created_at?: string
          created_by?: string | null
          ean?: string | null
          fat: number
          id?: string
          kcal: number
          name: string
          off_categories?: string[] | null
          owner_id?: string | null
          producer?: string | null
          protein: number
          source?: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          carbs?: number
          category_id?: string
          copied_from_product?: string | null
          created_at?: string
          created_by?: string | null
          ean?: string | null
          fat?: number
          id?: string
          kcal?: number
          name?: string
          off_categories?: string[] | null
          owner_id?: string | null
          producer?: string | null
          protein?: number
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_copied_from_product_fkey"
            columns: ["copied_from_product"]
            isOneToOne: false
            referencedRelation: "my_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_copied_from_product_fkey"
            columns: ["copied_from_product"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          category_order: string[]
          created_at: string
          display_name: string | null
          fat_max_pct: number
          fat_min_pct: number
          household_size: number
          id: string
          language: string
          target_kcal: number
          target_protein: number
          theme: string
        }
        Insert: {
          avatar_url?: string | null
          category_order?: string[]
          created_at?: string
          display_name?: string | null
          fat_max_pct?: number
          fat_min_pct?: number
          household_size?: number
          id: string
          language?: string
          target_kcal?: number
          target_protein?: number
          theme?: string
        }
        Update: {
          avatar_url?: string | null
          category_order?: string[]
          created_at?: string
          display_name?: string | null
          fat_max_pct?: number
          fat_min_pct?: number
          household_size?: number
          id?: string
          language?: string
          target_kcal?: number
          target_protein?: number
          theme?: string
        }
        Relationships: []
      }
      recipe_ingredients: {
        Row: {
          grams: number
          id: string
          position: number
          product_id: string
          recipe_id: string
        }
        Insert: {
          grams: number
          id?: string
          position?: number
          product_id: string
          recipe_id: string
        }
        Update: {
          grams?: number
          id?: string
          position?: number
          product_id?: string
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "my_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_macros"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "shared_recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_meal_slots: {
        Row: {
          recipe_id: string
          slot_id: string
        }
        Insert: {
          recipe_id: string
          slot_id: string
        }
        Update: {
          recipe_id?: string
          slot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_meal_slots_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_macros"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "recipe_meal_slots_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_meal_slots_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "shared_recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_meal_slots_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "meal_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          archived_at: string | null
          copied_from: string | null
          created_at: string
          id: string
          instructions: string | null
          is_shared: boolean
          name: string
          serve_with: string | null
          shared_at: string | null
          tags: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          copied_from?: string | null
          created_at?: string
          id?: string
          instructions?: string | null
          is_shared?: boolean
          name: string
          serve_with?: string | null
          shared_at?: string | null
          tags?: string[]
          updated_at?: string
          user_id?: string
        }
        Update: {
          archived_at?: string | null
          copied_from?: string | null
          created_at?: string
          id?: string
          instructions?: string | null
          is_shared?: boolean
          name?: string
          serve_with?: string | null
          shared_at?: string | null
          tags?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipes_copied_from_fkey"
            columns: ["copied_from"]
            isOneToOne: false
            referencedRelation: "recipe_macros"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "recipes_copied_from_fkey"
            columns: ["copied_from"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_copied_from_fkey"
            columns: ["copied_from"]
            isOneToOne: false
            referencedRelation: "shared_recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_shared_recipes: {
        Row: {
          created_at: string
          recipe_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          recipe_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          recipe_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_shared_recipes_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_macros"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "saved_shared_recipes_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_shared_recipes_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "shared_recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_products: {
        Row: {
          added_at: string
          product_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          product_id: string
          user_id?: string
        }
        Update: {
          added_at?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "my_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      my_products: {
        Row: {
          added_at: string | null
          archived_at: string | null
          carbs: number | null
          category_id: string | null
          created_at: string | null
          created_by: string | null
          ean: string | null
          fat: number | null
          id: string | null
          is_catalog: boolean | null
          kcal: number | null
          name: string | null
          off_categories: string[] | null
          owner_id: string | null
          producer: string | null
          protein: number | null
          source: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_macros: {
        Row: {
          carbs: number | null
          fat: number | null
          kcal: number | null
          portion_grams: number | null
          protein: number | null
          recipe_id: string | null
        }
        Relationships: []
      }
      recipe_tag_suggestions: {
        Row: {
          tag: string | null
          uses: number | null
        }
        Relationships: []
      }
      shared_recipe_ingredients: {
        Row: {
          carbs: number | null
          category_key: string | null
          fat: number | null
          grams: number | null
          id: string | null
          is_catalog: boolean | null
          kcal: number | null
          name: string | null
          position: number | null
          producer: string | null
          protein: number | null
          recipe_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_macros"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "shared_recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_recipes: {
        Row: {
          author_avatar_url: string | null
          author_id: string | null
          author_name: string | null
          carbs: number | null
          fat: number | null
          id: string | null
          instructions: string | null
          kcal: number | null
          name: string | null
          portion_grams: number | null
          protein: number | null
          serve_with: string | null
          shared_at: string | null
          slot_keys: string[] | null
          tags: string[] | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_meal_item: {
        Args: {
          p_date: string
          p_grams: number
          p_portions: number
          p_product_id: string
          p_recipe_id: string
          p_slot_id: string
        }
        Returns: string
      }
      copy_shared_recipe: { Args: { p_recipe_id: string }; Returns: string }
      ensure_meal: {
        Args: { p_date: string; p_slot_id: string }
        Returns: string
      }
      paste_meal: {
        Args: {
          p_mode?: string
          p_source_meal_id: string
          p_target_date: string
          p_target_slot_id: string
        }
        Returns: string
      }
      save_recipe: {
        Args: {
          p_id: string
          p_ingredients: Json
          p_instructions: string
          p_is_shared: boolean
          p_name: string
          p_serve_with: string
          p_slot_ids: string[]
          p_tags: string[]
        }
        Returns: string
      }
      transfer_meal: {
        Args: {
          p_copy: boolean
          p_date: string
          p_slot_id: string
          p_source_meal_id: string
        }
        Returns: string
      }
      transfer_meal_item: {
        Args: {
          p_copy: boolean
          p_date: string
          p_item_id: string
          p_slot_id: string
        }
        Returns: string
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
