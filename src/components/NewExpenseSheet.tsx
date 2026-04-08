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

function cleanText(value: string | null | undefined): string {
  return (value || "").trim();
}

function normalizeAccentInsensitive(value: string | null | undefined): string {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isInvalidVisualCategory(value: string | null | undefined): boolean {
  const normalized = normalizeAccentInsensitive(value);
  return (
    !normalized ||
    normalized === "extra" ||
    normalized === "despesa" ||
    normalized === "outros" ||
    normalized === "sem categoria"
  );
}

function normalizeSubcategoriaPais(
  subcategoriaPais: string | null,
  subcategoria: string | null,
  adriano: boolean
): string | null {
  const subPais = cleanText(subcategoriaPais);
  const sub = cleanText(subcategoria);

  const subPaisNorm = normalizeAccentInsensitive(subPais);
  const subNorm = normalizeAccentInsensitive(sub);

  if (subPaisNorm === "luisa" || subNorm === "luisa") return "Luísa";
  if (subPaisNorm === "vicente" || subNorm === "vicente") return "Vicente";
  if (subPaisNorm === "adriano") return "Adriano";

  if (subPais) return subPais;
  if (adriano && subNorm === "luisa") return "Luísa";

  return null;
}

export function normalizeLancamento(l: Lancamento): Lancamento {
  const subcategoria_pais = normalizeSubcategoriaPais(
    l.subcategoria_pais,
    l.subcategoria,
    l.adriano
  );

  const categoria_macro = cleanText(l.categoria_macro);
  const categoria = cleanText(l.categoria);
  const subcategoria = cleanText(l.subcategoria);

  return {
    ...l,
    descricao: cleanText(l.descricao),
    categoria: categoria || "",
    categoria_macro: categoria_macro || null,
    subcategoria: subcategoria || null,
    subcategoria_pais,
    pago_por: cleanText(l.pago_por) || "voce",
  };
}

/** Normaliza categoria visual para dashboard */
export function getCategoriaDashboard(l: Lancamento): string {
  const lanc = normalizeLancamento(l);

  const subPais = cleanText(lanc.subcategoria_pais);
  const subPaisNorm = normalizeAccentInsensitive(subPais);

  if (subPaisNorm === "vicente") return "Vicente";
  if (subPaisNorm === "luisa") return "Luísa";
  if (subPaisNorm === "adriano") return "Adriano";
  if (subPais && subPaisNorm !== "geral") return "Pais";

  const macro = cleanText(lanc.categoria_macro);
  if (!isInvalidVisualCategory(macro)) return macro;

  const sub = cleanText(lanc.subcategoria);
  if (!isInvalidVisualCategory(sub)) return sub;

  const cat = cleanText(lanc.categoria);
  if (!isInvalidVisualCategory(cat)) return cat;

  return "";
}

export function isLuisaLancamento(l: Lancamento): boolean {
  const lanc = normalizeLancamento(l);
  const sub = normalizeAccentInsensitive(lanc.subcategoria_pais);
  return sub === "luisa";
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

  for (const raw of lancamentos) {
    const l = normalizeLancamento(raw);

    if (l.tipo !== "despesa") continue;
    if (!l.shared_group_id && !l.adriano) continue;

    // Luísa não entra em divisão 50/50
    if (isLuisaLancamento(l)) continue;

    const valor = Number(l.valor) || 0;
    if (!valor) continue;

    if (l.adriano) {
      const pagoPor = normalizeAccentInsensitive(l.pago_por || "voce");

      if (pagoPor === "voce") {
        saldo += valor;
      } else {
        saldo -= valor;
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

      return ((data || []) as unknown as Lancamento[]).map(normalizeLancamento);
    },
    enabled: !!user,
  });
}

// ── mutations ────────────────────────────────────────────────────────────

export function useAddLancamento() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (
      row: Omit<
        Lancamento,
        | "id"
        | "user_id"
        | "created_at"
        | "editado_individualmente"
        | "lancamento_origem_id"
      >
    ) => {
      const normalized = normalizeLancamento({
        ...(row as Lancamento),
        id: "temp-id",
        user_id: user!.id,
        created_at: new Date().toISOString(),
        editado_individualmente: false,
        lancamento_origem_id: null,
      });

      const payload = {
        descricao: normalized.descricao,
        valor: normalized.valor,
        tipo: normalized.tipo,
        categoria: normalized.categoria,
        categoria_macro: normalized.categoria_macro,
        subcategoria_pais: normalized.subcategoria_pais,
        subcategoria: normalized.subcategoria,
        data: normalized.data,
        mes_referencia: normalized.mes_referencia,
        parcela_atual: normalized.parcela_atual,
        parcela_total: normalized.parcela_total,
        is_parcelado: normalized.is_parcelado,
        parcelamento_id: normalized.parcelamento_id,
        pago: normalized.pago,
        forma_pagamento: normalized.forma_pagamento,
        cartao_id: normalized.cartao_id,
        recorrente: normalized.recorrente,
        dia_recorrencia: normalized.dia_recorrencia,
        recorrencia_ate: normalized.recorrencia_ate,
        recorrencia_pai_id: normalized.recorrencia_pai_id,
        adriano: normalized.adriano,
        shared_group_id: normalized.shared_group_id,
        shared_role: normalized.shared_role,
        lancamento_origem_id: normalized.lancamento_origem_id,
        pago_por: normalized.pago_por,
        user_id: user!.id,
      };

      const { error } = await supabase.from("lancamentos").insert(payload as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lancamentos"] }),
  });
}

export function useAddMultipleLancamentos() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (rows: Partial<Lancamento>[]) => {
      const payload = rows.map((r) => {
        const normalized = normalizeLancamento({
          id: "temp-id",
          user_id: user!.id,
          descricao: (r.descricao as string) || "",
          valor: Number(r.valor || 0),
          tipo: (r.tipo as "despesa" | "receita") || "despesa",
          categoria: (r.categoria as string) || "",
          categoria_macro: (r.categoria_macro as string | null) ?? null,
          subcategoria_pais: (r.subcategoria_pais as string | null) ?? null,
          subcategoria: (r.subcategoria as string | null) ?? null,
          data: (r.data as string) || "",
          mes_referencia: (r.mes_referencia as string) || "",
          parcela_atual: (r.parcela_atual as number | null) ?? null,
          parcela_total: (r.parcela_total as number | null) ?? null,
          is_parcelado: !!r.is_parcelado,
          parcelamento_id: (r.parcelamento_id as string | null) ?? null,
          pago: !!r.pago,
          forma_pagamento: (r.forma_pagamento as string | null) ?? null,
          cartao_id: (r.cartao_id as string | null) ?? null,
          editado_individualmente: !!r.editado_individualmente,
          recorrente: !!r.recorrente,
          dia_recorrencia: (r.dia_recorrencia as number | null) ?? null,
          recorrencia_ate: (r.recorrencia_ate as string | null) ?? null,
          recorrencia_pai_id: (r.recorrencia_pai_id as string | null) ?? null,
          adriano: !!r.adriano,
          shared_group_id: (r.shared_group_id as string | null) ?? null,
          shared_role: (r.shared_role as "principal" | "adriano" | null) ?? null,
          lancamento_origem_id: (r.lancamento_origem_id as string | null) ?? null,
          pago_por: (r.pago_por as string) || "voce",
          created_at: new Date().toISOString(),
        });

        return {
          descricao: normalized.descricao,
          valor: normalized.valor,
          tipo: normalized.tipo,
          categoria: normalized.categoria,
          categoria_macro: normalized.categoria_macro,
          subcategoria_pais: normalized.subcategoria_pais,
          subcategoria: normalized.subcategoria,
          data: normalized.data,
          mes_referencia: normalized.mes_referencia,
          parcela_atual: normalized.parcela_atual,
          parcela_total: normalized.parcela_total,
          is_parcelado: normalized.is_parcelado,
          parcelamento_id: normalized.parcelamento_id,
          pago: normalized.pago,
          forma_pagamento: normalized.forma_pagamento,
          cartao_id: normalized.cartao_id,
          recorrente: normalized.recorrente,
          dia_recorrencia: normalized.dia_recorrencia,
          recorrencia_ate: normalized.recorrencia_ate,
          recorrencia_pai_id: normalized.recorrencia_pai_id,
          adriano: normalized.adriano,
          shared_group_id: normalized.shared_group_id,
          shared_role: normalized.shared_role,
          lancamento_origem_id: normalized.lancamento_origem_id,
          pago_por: normalized.pago_por,
          user_id: user!.id,
        };
      });

      const { error } = await supabase.from("lancamentos").insert(payload as any);
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

      const normalizedRest =
        "descricao" in rest ||
        "categoria" in rest ||
        "categoria_macro" in rest ||
        "subcategoria" in rest ||
        "subcategoria_pais" in rest ||
        "adriano" in rest
          ? normalizeLancamento({
              id,
              user_id: "",
              descricao: (rest.descricao as string) || "",
              valor: Number(rest.valor || 0),
              tipo: (rest.tipo as "despesa" | "receita") || "despesa",
              categoria: (rest.categoria as string) || "",
              categoria_macro: (rest.categoria_macro as string | null) ?? null,
              subcategoria_pais: (rest.subcategoria_pais as string | null) ?? null,
              subcategoria: (rest.subcategoria as string | null) ?? null,
              data: (rest.data as string) || "",
              mes_referencia: (rest.mes_referencia as string) || "",
              parcela_atual: (rest.parcela_atual as number | null) ?? null,
              parcela_total: (rest.parcela_total as number | null) ?? null,
              is_parcelado: !!rest.is_parcelado,
              parcelamento_id: (rest.parcelamento_id as string | null) ?? null,
              pago: !!rest.pago,
              forma_pagamento: (rest.forma_pagamento as string | null) ?? null,
              cartao_id: (rest.cartao_id as string | null) ?? null,
              editado_individualmente: !!rest.editado_individualmente,
              recorrente: !!rest.recorrente,
              dia_recorrencia: (rest.dia_recorrencia as number | null) ?? null,
              recorrencia_ate: (rest.recorrencia_ate as string | null) ?? null,
              recorrencia_pai_id: (rest.recorrencia_pai_id as string | null) ?? null,
              adriano: !!rest.adriano,
              shared_group_id: (rest.shared_group_id as string | null) ?? null,
              shared_role: (rest.shared_role as "principal" | "adriano" | null) ?? null,
              lancamento_origem_id: (rest.lancamento_origem_id as string | null) ?? null,
              pago_por: (rest.pago_por as string) || "voce",
              created_at: new Date().toISOString(),
            })
          : (rest as Lancamento);

      const payload = { ...normalizedRest };
      delete (payload as any).id;
      delete (payload as any).user_id;
      delete (payload as any).created_at;

      const { error } = await supabase
        .from("lancamentos")
        .update(payload as any)
        .eq("id", id);

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
    mutationFn: async ({
      parcelamento_id,
      fromDate,
    }: {
      parcelamento_id: string;
      fromDate: string;
    }) => {
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
    mutationFn: async ({
      recorrencia_pai_id,
      fromDate,
    }: {
      recorrencia_pai_id: string;
      fromDate: string;
    }) => {
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