import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Lancamento {
  id: string;
  user_id: string;
  descricao: string;
  valor: number;
  tipo: "despesa" | "receita";
  categoria: string;
  categoria_macro: string | null;
  subcategoria_pais: string | null;
  subcategoria: string | null;
  data: string;
  mes_referencia: string;
  parcela_atual: number | null;
  parcela_total: number | null;
  is_parcelado: boolean;
  parcelamento_id: string | null;
  pago: boolean;
  forma_pagamento: string | null;
  cartao_id: string | null;
  editado_individualmente?: boolean;
  recorrente: boolean;
  dia_recorrencia: number | null;
  recorrencia_ate: string | null;
  recorrencia_pai_id: string | null;
  created_at: string;
}

export const useLancamentos = (mesReferencia?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["lancamentos", user?.id, mesReferencia],
    queryFn: async () => {
      let query = supabase
        .from("lancamentos")
        .select("*")
        .order("data", { ascending: false });

      if (mesReferencia) {
        query = query.eq("mes_referencia", mesReferencia);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Lancamento[];
    },
    enabled: !!user,
  });
};

export const useAddLancamento = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (lancamento: Omit<Lancamento, "id" | "user_id" | "created_at">) => {
      if (!user) throw new Error("Não autenticado");
      const { data, error } = await supabase
        .from("lancamentos")
        .insert({ ...lancamento, user_id: user.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lancamentos"], exact: false });
    },
  });
};

export const useAddMultipleLancamentos = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (lancamentos: Omit<Lancamento, "id" | "user_id" | "created_at">[]) => {
      if (!user) throw new Error("Não autenticado");
      const rows = lancamentos.map(l => ({ ...l, user_id: user.id }));
      const { data, error } = await supabase
        .from("lancamentos")
        .insert(rows as any)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lancamentos"], exact: false });
    },
  });
};

export const useUpdateLancamento = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Lancamento> & { id: string }) => {
      const { data, error } = await supabase
        .from("lancamentos")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lancamentos"], exact: false });
    },
  });
};

export const useUpdateParcelamentoFuturas = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      parcelamento_id,
      fromDate,
      updates,
    }: {
      parcelamento_id: string;
      fromDate: string;
      updates: { 
        descricao?: string; 
        valor?: number;
        categoria?: string;
        subcategoria?: string | null;
        categoria_macro?: string | null;
        forma_pagamento?: string | null;
        cartao_id?: string | null;
      };
    }) => {
      // Try parcelamento_id first
      const { error: err1 } = await supabase
        .from("lancamentos")
        .update(updates as any)
        .eq("parcelamento_id", parcelamento_id)
        .gte("data", fromDate);
      if (err1) throw err1;

      // Also update by recorrencia_pai_id (for recurring entries)
      const { error: err2 } = await supabase
        .from("lancamentos")
        .update(updates as any)
        .eq("recorrencia_pai_id", parcelamento_id)
        .gte("data", fromDate);
      if (err2) throw err2;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lancamentos"], exact: false });
    },
  });
};

export const useUpdateAllParcelamento = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      parcelamento_id,
      updates,
    }: {
      parcelamento_id: string;
      updates: { 
        descricao?: string; 
        valor?: number;
        categoria?: string;
        subcategoria?: string | null;
        categoria_macro?: string | null;
        forma_pagamento?: string | null;
        cartao_id?: string | null;
      };
    }) => {
      // Try parcelamento_id
      const { error: err1 } = await supabase
        .from("lancamentos")
        .update(updates as any)
        .eq("parcelamento_id", parcelamento_id);
      if (err1) throw err1;

      // Also update by recorrencia_pai_id
      const { error: err2 } = await supabase
        .from("lancamentos")
        .update(updates as any)
        .eq("recorrencia_pai_id", parcelamento_id);
      if (err2) throw err2;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lancamentos"], exact: false });
    },
  });
};

/** Returns count of lancamentos for a parcelamento_id or recorrencia_pai_id, optionally filtered by fromDate */
export const fetchParcelamentoCount = async (
  groupId: string,
  fromDate?: string
): Promise<number> => {
  // Try parcelamento_id first, then recorrencia_pai_id
  let query = supabase
    .from("lancamentos")
    .select("id", { count: "exact", head: true })
    .eq("parcelamento_id", groupId);

  if (fromDate) {
    query = query.gte("data", fromDate);
  }

  const { count: count1 } = await query;
  if (count1 && count1 > 0) return count1;

  // Fallback: try recorrencia_pai_id
  let query2 = supabase
    .from("lancamentos")
    .select("id", { count: "exact", head: true })
    .eq("recorrencia_pai_id", groupId);

  if (fromDate) {
    query2 = query2.gte("data", fromDate);
  }

  const { count: count2 } = await query2;
  return count2 ?? 0;
};

export const useDeleteLancamento = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lancamentos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lancamentos"], exact: false });
    },
  });
};
