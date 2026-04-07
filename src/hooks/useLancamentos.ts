import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
  adriano: boolean;
  shared_group_id: string | null;
  shared_role: "principal" | "adriano" | null;
  lancamento_origem_id: string | null;
  pago_por: string;
  created_at: string;
}

// ── helpers ──────────────────────────────────────────────────────────────

/** Normaliza categoria visual para dashboard (nunca "extra" ou "despesa") */
export function getCategoriaDashboard(l: Lancamento): string {
  const sub = l.subcategoria_pais;
  if (sub && sub !== "" && sub !== "Geral") {
    if (sub === "Vicente") return "Vicente";
    if (sub === "Luísa" || sub === "Luisa") return "Luísa";
    if (sub === "Adriano") return "Adriano";
    return "Pais";
  }
  if (l.categoria_macro && l.categoria_macro.trim() !== "") return l.categoria_macro;
  // fallback seguro — nunca retornar "extra" ou "despesa" como label visual
  const cat = (l.categoria || "").trim().toLowerCase();
  if (!cat || cat === "extra" || cat === "despesa" || cat === "outros" || cat === "sem categoria") return "";
  return l.categoria;
}

export function isLuisaLancamento(l: Lancamento): boolean {
  const sub = (l.subcategoria_pais || "").trim();
  return sub === "Luísa" || sub === "Luisa";
}

export function isAdrianoLancamento(l: Lancamento): boolean {
  return l.adriano === true;
}

export function isSharedLancamento(l: Lancamento): boolean {
  return !!l.shared_group_id || l.adriano;
}

/**
 * Calcula saldo líquido entre o usuário e Adriano.
 * saldo > 0 → Adriano deve para o usuário
 * saldo < 0 → usuário deve para Adriano
 */
export function calcularSaldoAdriano(lancamentos: Lancamento[]): number {
  let saldo = 0;
  // Only consider despesas that are part of a shared split
  for (const l of lancamentos) {
    if (l.tipo !== "despesa") continue;
    if (!l.shared_group_id && !l.adriano) continue;
    // skip Luísa items — they are NOT split
    if (isLuisaLancamento(l)) continue;

    const metade = Number(l.valor);
    if (l.adriano) {
      // This is the mirror (Adriano's half)
      const pagoPor = (l.pago_por || "voce") as string;
      if (pagoPor === "voce") {
        saldo += metade; // eu paguei, Adriano me deve
      } else {
        saldo -= metade; // Adriano pagou, eu devo
      }
    }
  }
  return saldo;
}

// ── queries ──────────────────────────────────────────────────────────────

export function useLancamentos(mesRef?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["lancamentos", mesRef || "all"],
    queryFn: async () => {
      let q = supabase
        .from("lancamentos")
        .select("*")
        .eq("user_id", user!.id)
        .order("data", { ascending: true });
      if (mesRef) q = q.eq("mes_referencia", mesRef);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as Lancamento[];
    },
    enabled: !!user,
  });
}

// ── mutations ────────────────────────────────────────────────────────────

export function useAddLancamento() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Omit<Lancamento, "id" | "user_id" | "created_at" | "editado_individualmente" | "lancamento_origem_id" | "shared_group_id" | "shared_role">) => {
      const { error } = await supabase.from("lancamentos").insert({ ...row, user_id: user!.id } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lancamentos"] }),
  });
}

export function useAddMultipleLancamentos() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: any[]) => {
      const { error } = await supabase.from("lancamentos").insert(
        rows.map((r: any) => ({ ...r, user_id: user!.id }))
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lancamentos"] }),
  });
}

export function useUpdateLancamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (upd: Partial<Lancamento> & { id: string }) => {
      const { id, ...rest } = upd;
      const { error } = await supabase.from("lancamentos").update(rest as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lancamentos"] }),
  });
}

export function useDeleteLancamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lancamentos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lancamentos"] }),
  });
}

export function useDeleteFutureParcelamento() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ parcelamento_id, fromDate }: { parcelamento_id: string; fromDate: string }) => {
      const { error } = await supabase
        .from("lancamentos")
        .delete()
        .eq("user_id", user!.id)
        .eq("parcelamento_id", parcelamento_id)
        .gte("data", fromDate);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lancamentos"] }),
  });
}

export function useDeleteAllParcelamento() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (parcelamento_id: string) => {
      const { error } = await supabase
        .from("lancamentos")
        .delete()
        .eq("user_id", user!.id)
        .eq("parcelamento_id", parcelamento_id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lancamentos"] }),
  });
}

export function useDeleteFutureRecorrencia() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ recorrencia_pai_id, fromDate }: { recorrencia_pai_id: string; fromDate: string }) => {
      const { error } = await supabase
        .from("lancamentos")
        .delete()
        .eq("user_id", user!.id)
        .eq("recorrencia_pai_id", recorrencia_pai_id)
        .gte("data", fromDate);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lancamentos"] }),
  });
}

export function useDeleteAllRecorrencia() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (recorrencia_pai_id: string) => {
      const { error } = await supabase
        .from("lancamentos")
        .delete()
        .eq("user_id", user!.id)
        .eq("recorrencia_pai_id", recorrencia_pai_id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lancamentos"] }),
  });
}
