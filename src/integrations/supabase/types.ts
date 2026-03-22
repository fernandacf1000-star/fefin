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
      assets: {
        Row: {
          acquired_at: string | null
          category: string
          created_at: string
          id: string
          name: string
          notes: string | null
          user_id: string
          value: number
        }
        Insert: {
          acquired_at?: string | null
          category?: string
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          user_id: string
          value?: number
        }
        Update: {
          acquired_at?: string | null
          category?: string
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      cartoes: {
        Row: {
          ativo: boolean
          bandeira: string
          cor: string
          created_at: string
          dia_fechamento: number
          dia_vencimento: number
          id: string
          melhor_dia_compra: number
          nome: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          bandeira?: string
          cor?: string
          created_at?: string
          dia_fechamento?: number
          dia_vencimento?: number
          id?: string
          melhor_dia_compra?: number
          nome: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          bandeira?: string
          cor?: string
          created_at?: string
          dia_fechamento?: number
          dia_vencimento?: number
          id?: string
          melhor_dia_compra?: number
          nome?: string
          user_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          date: string
          description: string
          id: string
          user_id: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          date?: string
          description: string
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          date?: string
          description?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      installment_purchases: {
        Row: {
          category: string
          created_at: string
          current_installment: number
          description: string
          id: string
          installment_amount: number
          start_date: string
          total_amount: number
          total_installments: number
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          current_installment?: number
          description: string
          id?: string
          installment_amount?: number
          start_date?: string
          total_amount?: number
          total_installments?: number
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          current_installment?: number
          description?: string
          id?: string
          installment_amount?: number
          start_date?: string
          total_amount?: number
          total_installments?: number
          user_id?: string
        }
        Relationships: []
      }
      ir_lancamentos: {
        Row: {
          ano: number
          created_at: string
          data: string | null
          descricao: string
          id: string
          mes: number | null
          subtipo: string | null
          tipo: string
          user_id: string
          valor: number
        }
        Insert: {
          ano: number
          created_at?: string
          data?: string | null
          descricao: string
          id?: string
          mes?: number | null
          subtipo?: string | null
          tipo?: string
          user_id: string
          valor?: number
        }
        Update: {
          ano?: number
          created_at?: string
          data?: string | null
          descricao?: string
          id?: string
          mes?: number | null
          subtipo?: string | null
          tipo?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      lancamentos: {
        Row: {
          cartao_id: string | null
          categoria: string
          categoria_macro: string | null
          created_at: string
          data: string
          descricao: string
          dia_recorrencia: number | null
          editado_individualmente: boolean
          forma_pagamento: string | null
          id: string
          is_parcelado: boolean
          mes_referencia: string
          pago: boolean
          parcela_atual: number | null
          parcela_total: number | null
          parcelamento_id: string | null
          recorrencia_ate: string | null
          recorrencia_pai_id: string | null
          recorrente: boolean
          subcategoria: string | null
          subcategoria_pais: string | null
          tipo: string
          user_id: string
          valor: number
        }
        Insert: {
          cartao_id?: string | null
          categoria?: string
          categoria_macro?: string | null
          created_at?: string
          data?: string
          descricao: string
          dia_recorrencia?: number | null
          editado_individualmente?: boolean
          forma_pagamento?: string | null
          id?: string
          is_parcelado?: boolean
          mes_referencia?: string
          pago?: boolean
          parcela_atual?: number | null
          parcela_total?: number | null
          parcelamento_id?: string | null
          recorrencia_ate?: string | null
          recorrencia_pai_id?: string | null
          recorrente?: boolean
          subcategoria?: string | null
          subcategoria_pais?: string | null
          tipo?: string
          user_id: string
          valor?: number
        }
        Update: {
          cartao_id?: string | null
          categoria?: string
          categoria_macro?: string | null
          created_at?: string
          data?: string
          descricao?: string
          dia_recorrencia?: number | null
          editado_individualmente?: boolean
          forma_pagamento?: string | null
          id?: string
          is_parcelado?: boolean
          mes_referencia?: string
          pago?: boolean
          parcela_atual?: number | null
          parcela_total?: number | null
          parcelamento_id?: string | null
          recorrencia_ate?: string | null
          recorrencia_pai_id?: string | null
          recorrente?: boolean
          subcategoria?: string | null
          subcategoria_pais?: string | null
          tipo?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_cartao_id_fkey"
            columns: ["cartao_id"]
            isOneToOne: false
            referencedRelation: "cartoes"
            referencedColumns: ["id"]
          },
        ]
      }
      patrimonio: {
        Row: {
          created_at: string
          data_atualizacao: string
          id: string
          rendimento_mensal: number | null
          saldo: number
          tipo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_atualizacao?: string
          id?: string
          rendimento_mensal?: number | null
          saldo?: number
          tipo: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_atualizacao?: string
          id?: string
          rendimento_mensal?: number | null
          saldo?: number
          tipo?: string
          user_id?: string
        }
        Relationships: []
      }
      patrimonio_movimentacoes: {
        Row: {
          created_at: string
          data: string
          id: string
          motivo: string | null
          patrimonio_tipo: string
          tipo_movimentacao: string
          user_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          data?: string
          id?: string
          motivo?: string | null
          patrimonio_tipo: string
          tipo_movimentacao: string
          user_id: string
          valor?: number
        }
        Update: {
          created_at?: string
          data?: string
          id?: string
          motivo?: string | null
          patrimonio_tipo?: string
          tipo_movimentacao?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          aliquota_aposentadoria_estimada: number | null
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          idade: number | null
          idade_aposentadoria: number | null
          ir_dados: Json | null
          meta_mensal: number | null
          nome: string | null
          tipo_tributacao: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          aliquota_aposentadoria_estimada?: number | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          idade?: number | null
          idade_aposentadoria?: number | null
          ir_dados?: Json | null
          meta_mensal?: number | null
          nome?: string | null
          tipo_tributacao?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          aliquota_aposentadoria_estimada?: number | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          idade?: number | null
          idade_aposentadoria?: number | null
          ir_dados?: Json | null
          meta_mensal?: number | null
          nome?: string | null
          tipo_tributacao?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recurring_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          day_of_month: number
          description: string
          id: string
          is_active: boolean
          user_id: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          day_of_month?: number
          description: string
          id?: string
          is_active?: boolean
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          day_of_month?: number
          description?: string
          id?: string
          is_active?: boolean
          user_id?: string
        }
        Relationships: []
      }
      reembolsos: {
        Row: {
          created_at: string
          data_reembolso: string
          id: string
          lancamento_id: string
          observacao: string | null
          quem_reembolsou: string
          user_id: string
          valor_reembolsado: number
        }
        Insert: {
          created_at?: string
          data_reembolso?: string
          id?: string
          lancamento_id: string
          observacao?: string | null
          quem_reembolsou?: string
          user_id: string
          valor_reembolsado?: number
        }
        Update: {
          created_at?: string
          data_reembolso?: string
          id?: string
          lancamento_id?: string
          observacao?: string | null
          quem_reembolsou?: string
          user_id?: string
          valor_reembolsado?: number
        }
        Relationships: [
          {
            foreignKeyName: "reembolsos_lancamento_id_fkey"
            columns: ["lancamento_id"]
            isOneToOne: false
            referencedRelation: "lancamentos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
