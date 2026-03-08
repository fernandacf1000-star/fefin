import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface IRDados {
  rendimentos?: number;
  ir_retido?: number;
  pgbl?: number;
  plano_saude?: number;
  outras_deducoes_medicas?: number;
  updated_at?: string;
}

export const useIRDados = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["ir_dados", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("ir_dados")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return (data?.ir_dados as IRDados | null) ?? {};
    },
    enabled: !!user,
  });
};

export const useSaveIRDados = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dados: IRDados) => {
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase
        .from("profiles")
        .update({ ir_dados: { ...dados, updated_at: new Date().toISOString() } as unknown as string })
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ir_dados"] });
    },
  });
};

export const useLancamentosAno = (ano: number) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["lancamentos_ano", user?.id, ano],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lancamentos")
        .select("*")
        .gte("data", `${ano}-01-01`)
        .lte("data", `${ano}-12-31`);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
};

/* ── Tabela progressiva IRPF 2025 (anual) ── */
export const calcularIRAnual = (baseCalculo: number): number => {
  if (baseCalculo <= 0) return 0;
  if (baseCalculo <= 26963.20) return 0;
  if (baseCalculo <= 33919.80) return baseCalculo * 0.075 - 2023.74;
  if (baseCalculo <= 45012.60) return baseCalculo * 0.15 - 4590.72;
  if (baseCalculo <= 55976.16) return baseCalculo * 0.225 - 7968.21;
  return baseCalculo * 0.275 - 10773.45;
};

export const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
