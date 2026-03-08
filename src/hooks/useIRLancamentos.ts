import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface IRLancamento {
  id: string;
  user_id: string;
  ano: number;
  mes: number | null;
  tipo: string;
  descricao: string;
  valor: number;
  data: string | null;
  subtipo: string | null;
  created_at: string;
}

export type IRLancamentoInsert = Omit<IRLancamento, "id" | "user_id" | "created_at">;

export const useIRLancamentos = (ano: number) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["ir_lancamentos", user?.id, ano],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ir_lancamentos" as any)
        .select("*")
        .eq("user_id", user!.id)
        .eq("ano", ano)
        .order("mes", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as IRLancamento[];
    },
    enabled: !!user,
  });
};

export const useAddIRLancamento = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (lancamento: IRLancamentoInsert) => {
      if (!user) throw new Error("Não autenticado");
      const { data, error } = await supabase
        .from("ir_lancamentos" as any)
        .insert({ ...lancamento, user_id: user.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ir_lancamentos"] });
    },
  });
};

export const useUpdateIRLancamento = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<IRLancamento> & { id: string }) => {
      const { data, error } = await supabase
        .from("ir_lancamentos" as any)
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ir_lancamentos"] });
    },
  });
};

export const useDeleteIRLancamento = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ir_lancamentos" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ir_lancamentos"] });
    },
  });
};

export const useSeedIRData = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Não autenticado");

      // Check if seed data already exists
      const { data: existing } = await supabase
        .from("ir_lancamentos" as any)
        .select("id")
        .eq("user_id", user.id)
        .eq("ano", 2025)
        .eq("descricao", "Informe Goldman Sachs 2025")
        .limit(1);

      if (existing && (existing as any[]).length > 0) return;

      const seedData = [
        { ano: 2025, mes: null, tipo: "renda", descricao: "Informe Goldman Sachs 2025", valor: 970379.22, data: "2025-12-31", subtipo: "salario" },
        { ano: 2025, mes: null, tipo: "ir_retido", descricao: "Informe Goldman Sachs 2025", valor: 219789.77, data: "2025-12-31", subtipo: null },
        { ano: 2025, mes: null, tipo: "inss", descricao: "Informe Goldman Sachs 2025", valor: 11419.44, data: "2025-12-31", subtipo: null },
        { ano: 2025, mes: null, tipo: "pgbl", descricao: "PGBL Itaú Vida", valor: 114110.92, data: "2025-12-31", subtipo: "aporte_mensal" },
        { ano: 2025, mes: null, tipo: "saude", descricao: "Plano de saúde Omint (titular)", valor: 1596.0, data: "2025-12-31", subtipo: "plano_saude" },
      ];

      const { error } = await supabase
        .from("ir_lancamentos" as any)
        .insert(seedData.map((d) => ({ ...d, user_id: user.id })) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ir_lancamentos"] });
    },
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

export const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
