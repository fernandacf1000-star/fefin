import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Reembolso {
  id: string;
  user_id: string;
  lancamento_id: string;
  valor_reembolsado: number;
  quem_reembolsou: string;
  data_reembolso: string;
  observacao: string | null;
  created_at: string;
}

export const useReembolsos = (mesReferencia?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["reembolsos", user?.id, mesReferencia],
    queryFn: async () => {
      let query = supabase
        .from("reembolsos")
        .select("*")
        .order("data_reembolso", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Reembolso[];
    },
    enabled: !!user,
  });
};

export const useReembolsosByLancamento = (lancamentoId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["reembolsos", "lancamento", lancamentoId],
    queryFn: async () => {
const { data, error } = await supabase
        .from("reembolsos")
        .select("*")
        .eq("user_id", user!.id)
        .order("data_reembolso", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Reembolso[];
    },
    enabled: !!user && !!lancamentoId,
  });
};

export const useAllReembolsos = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["reembolsos", "all", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reembolsos")
        .select("*")
        .order("data_reembolso", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Reembolso[];
    },
    enabled: !!user,
  });
};

export const useAddReembolso = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (reembolso: Omit<Reembolso, "id" | "user_id" | "created_at">) => {
      if (!user) throw new Error("Não autenticado");
      const { data, error } = await supabase
        .from("reembolsos")
        .insert({ ...reembolso, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reembolsos"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["lancamentos"], exact: false });
    },
  });
};

export const useDeleteReembolso = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reembolsos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reembolsos"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["lancamentos"], exact: false });
    },
  });
};

/** Calculate total reembolsado for a lancamento from a list of reembolsos */
export const getTotalReembolsado = (reembolsos: Reembolso[], lancamentoId: string): number => {
  return reembolsos
    .filter((r) => r.lancamento_id === lancamentoId)
    .reduce((sum, r) => sum + Number(r.valor_reembolsado), 0);
};
