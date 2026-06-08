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
      incoming_goods: {
        Row: {
          created_at: string
          created_by: string | null
          harga_beli: number
          id: string
          jumlah: number
          product_id: string
          supplier: string | null
          tanggal_masuk: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          harga_beli?: number
          id?: string
          jumlah: number
          product_id: string
          supplier?: string | null
          tanggal_masuk?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          harga_beli?: number
          id?: string
          jumlah?: number
          product_id?: string
          supplier?: string | null
          tanggal_masuk?: string
        }
        Relationships: [
          {
            foreignKeyName: "incoming_goods_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      outgoing_goods: {
        Row: {
          created_at: string
          created_by: string | null
          hpp: number
          id: string
          jenis_keluar: string
          jumlah: number
          product_id: string
          tanggal_keluar: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          hpp?: number
          id?: string
          jenis_keluar?: string
          jumlah: number
          product_id: string
          tanggal_keluar?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          hpp?: number
          id?: string
          jenis_keluar?: string
          jumlah?: number
          product_id?: string
          tanggal_keluar?: string
        }
        Relationships: [
          {
            foreignKeyName: "outgoing_goods_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          created_at: string
          gambar_barang: string | null
          harga_jual: number
          id: string
          kategori: string | null
          kode_barang: string
          nama_barang: string
          satuan: string
          stok: number
          stok_maksimum: number
          stok_minimum: number
          tanggal_kadaluarsa: string | null
        }
        Insert: {
          barcode?: string | null
          created_at?: string
          gambar_barang?: string | null
          harga_jual?: number
          id?: string
          kategori?: string | null
          kode_barang: string
          nama_barang: string
          satuan?: string
          stok?: number
          stok_maksimum?: number
          stok_minimum?: number
          tanggal_kadaluarsa?: string | null
        }
        Update: {
          barcode?: string | null
          created_at?: string
          gambar_barang?: string | null
          harga_jual?: number
          id?: string
          kategori?: string | null
          kode_barang?: string
          nama_barang?: string
          satuan?: string
          stok?: number
          stok_maksimum?: number
          stok_minimum?: number
          tanggal_kadaluarsa?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          nama: string
        }
        Insert: {
          created_at?: string
          id: string
          nama?: string
        }
        Update: {
          created_at?: string
          id?: string
          nama?: string
        }
        Relationships: []
      }
      stock_adjustments: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          jenis_penyesuaian: string
          jumlah: number
          keterangan: string | null
          product_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          jenis_penyesuaian: string
          jumlah: number
          keterangan?: string | null
          product_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          jenis_penyesuaian?: string
          jumlah?: number
          keterangan?: string | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_batches: {
        Row: {
          harga_beli: number
          id: string
          jumlah_masuk: number
          product_id: string
          sisa_stok: number
          tanggal_masuk: string
        }
        Insert: {
          harga_beli?: number
          id?: string
          jumlah_masuk: number
          product_id: string
          sisa_stok: number
          tanggal_masuk?: string
        }
        Update: {
          harga_beli?: number
          id?: string
          jumlah_masuk?: number
          product_id?: string
          sisa_stok?: number
          tanggal_masuk?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_batches_product_id_fkey"
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
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      fn_barang_keluar: {
        Args: {
          p_jenis: string
          p_jumlah: number
          p_product_id: string
          p_tanggal: string
        }
        Returns: string
      }
      fn_barang_masuk: {
        Args: {
          p_harga: number
          p_jumlah: number
          p_product_id: string
          p_supplier: string
          p_tanggal: string
        }
        Returns: string
      }
      fn_hapus_barang_keluar: { Args: { p_id: string }; Returns: undefined }
      fn_hapus_barang_masuk: { Args: { p_id: string }; Returns: undefined }
      fn_penyesuaian: {
        Args: {
          p_jenis: string
          p_jumlah: number
          p_keterangan: string
          p_product_id: string
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "gudang" | "kasir"
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
      app_role: ["admin", "gudang", "kasir"],
    },
  },
} as const
