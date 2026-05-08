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

function normalizePagoPor(value: string | null | undefined): string {
  const normalized = normalizeAccentInsensitive(value);
  if (!normalized || normalized === "fernanda" || normalized === "eu" || normalized === "voce" || normalized === "você") return "voce";
  if (normalized === "adriano" || normalized === "ele") return "adriano";
  return cleanText(value) || "voce";
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
    pago_por: normalizePagoPor(l.pago_por),
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
 * Regra atual: despesas `adriano=true` são 50/50. Se Fernanda pagou 100%,
 * Adriano deve metade. Se Adriano pagou 100%, Fernanda deve metade.
 * saldo > 0 → Adriano deve para o usuário
 * saldo < 0 → usuário deve para Adriano
 */
export function calcularSaldoAdriano(lancamentos: Lancamento[]): number {
  let saldo = 0;

  for (const raw of lancamentos) {
    const l = normalizeLancamento(raw);

    if (l.tipo === "receita") {
      if (l.categoria === "reembolso_adriano") {
        saldo -= Number(l.valor) || 0;
      }
      continue;
    }

    if (l.tipo !== "despesa") continue;
    if (!l.shared_group_id && !l.adriano) continue;

    // Luísa não entra em divisão 50/50 com Adriano
    if (isLuisaLancamento(l)) continue;

    const valor = Number(l.valor) || 0;
    if (!valor) continue;

    if (l.adriano) {
      const metade = valor / 2;
      const pagoPor = normalizePagoPor(l.pago_por || "voce");

      if (pagoPor === "voce") {
        saldo += metade;
      } else {
        saldo -= metade;
      }
    }
  }

  return saldo;
}

function splitParcelamentoTotalIntoInstallments(rows: Lancamento[]): Lancamento[] {
  const adjusted = rows.map((r) => ({ ...r }));
  const groups = new Map<string, { index: number; row: Lancamento }[]>();

  adjusted.forEach((row, index) => {
    if (
      row.tipo === "despesa" &&
      row.is_parcelado &&
      row.parcelamento_id &&
      row.parcela_total &&
      row.parcela_total > 1
    ) {
      const current = groups.get(row.parcelamento_id) || [];
      current.push({ index, row });
      groups.set(row.parcelamento_id, current);
    }
  });

  groups.forEach((group) => {
    const ordered = [...group].sort(
      (a, b) => Number(a.row.parcela_atual || 0) - Number(b.row.parcela_atual || 0)
    );
    const totalParcelas = Number(ordered[0]?.row.parcela_total || 0);

    if (!totalParcelas || ordered.length !== totalParcelas) return;

    const valorTotalInformado = Number(ordered[0].row.valor || 0);
    const allRowsHaveSameTotal = ordered.every(
      ({ row }) => Math.abs(Number(row.valor || 0) - valorTotalInformado) < 0.005
    );

    if (!allRowsHaveSameTotal) return;

    const totalEmCentavos = Math.round(valorTotalInformado * 100);
    const parcelaBaseEmCentavos = Math.trunc(totalEmCentavos / totalParcelas);
    const diferencaCentavos = totalEmCentavos - parcelaBaseEmCentavos * totalParcelas;

    ordered.forEach(({ index }, installmentIndex) => {
      const centavos =
        installmentIndex === ordered.length - 1
          ? parcelaBaseEmCentavos + diferencaCentavos
          : parcelaBaseEmCentavos;

      adjusted[index].valor = centavos / 100;
    });
  });

  return adjusted;
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
        id: "",
        user_id: user!.id,
        created_at: "",
        editado_individualmente: false,
        lancamento_origem_id: null,
      });

      // Remove fields the DB auto-populates or that are empty strings for timestamps
      const { id: _id, created_at: _ca, ...rest } = normalized;
      const payload = {
        ...rest,
        user_id: user!.id,
        recorrencia_ate: rest.recorrencia_ate || null,
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
      const payload = splitParcelamentoTotalIntoInstallments(rows.map((r) =>
        normalizeLancamento({
          id: (r.id as string) || "",
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
          created_at: "",
        })
      ));

      const { error } = await supabase.from("lancamentos").insert(
        payload.map((r) => {
          const { id: _id, created_at: _ca, ...rest } = r;
          return {
            ...rest,
            user_id: user!.id,
            recorrencia_ate: rest.recorrencia_ate || null,
          };
        }) as any
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
              created_at: "",
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
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["lancamentos"] }),
        qc.invalidateQueries({ queryKey: ["reembolsos"] }),
      ]);
    },
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
