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
  pago: boolean;
  forma_pagamento: string | null;
  cartao_id: string | null;
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
        .insert({ ...lancamento, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lancamentos"] });
    },
  });
};

export const useUpdateLancamento = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Lancamento> & { id: string }) => {
      const { data, error } = await supabase
        .from("lancamentos")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lancamentos"] });
    },
  });
};

export const useDeleteLancamento = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lancamentos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lancamentos"] });
    },
  });
};
