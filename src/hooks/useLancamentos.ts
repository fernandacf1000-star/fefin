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

function cleanText(value: string | null | undefined): string {
  return (value || "").trim();
}

function normalizeAccentInsensitive(value: string | null | undefined): string {
  return cleanText(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function normalizePagoPor(value: string | null | undefined): string {
  const normalized = normalizeAccentInsensitive(value);
  if (!normalized || normalized === "fernanda" || normalized === "eu" || normalized === "voce" || normalized === "você") return "voce";
  if (normalized === "adriano" || normalized === "ele") return "adriano";
  return cleanText(value) || "voce";
}

function isInvalidVisualCategory(value: string | null | undefined): boolean {
  const normalized = normalizeAccentInsensitive(value);
  return !normalized || normalized === "extra" || normalized === "despesa" || normalized === "outros" || normalized === "sem categoria";
}

function normalizeSubcategoriaPais(subcategoriaPais: string | null, subcategoria: string | null, adriano: boolean): string | null {
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
  const categoria_macro = cleanText(l.categoria_macro);
  const categoria = cleanText(l.categoria);
  const subcategoria = cleanText(l.subcategoria);
  return {
    ...l,
    descricao: cleanText(l.descricao),
    categoria: categoria || "",
    categoria_macro: categoria_macro || null,
    subcategoria: subcategoria || null,
    subcategoria_pais: normalizeSubcategoriaPais(l.subcategoria_pais, l.subcategoria, l.adriano),
    pago_por: normalizePagoPor(l.pago_por),
  };
}

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
  return normalizeAccentInsensitive(lanc.subcategoria_pais) === "luisa";
}

export function isAdrianoLancamento(l: Lancamento): boolean {
  return l.adriano === true;
}

export function isSharedLancamento(l: Lancamento): boolean {
  return !!l.shared_group_id || l.adriano;
}

export function calcularSaldoAdriano(lancamentos: Lancamento[]): number {
  let saldo = 0;
  for (const raw of lancamentos) {
    const l = normalizeLancamento(raw);
    if (l.tipo === "receita") {
      if (l.categoria === "reembolso_adriano") saldo -= Number(l.valor) || 0;
      continue;
    }
    if (l.tipo !== "despesa") continue;
    if (!l.shared_group_id && !l.adriano) continue;
    if (isLuisaLancamento(l)) continue;
    const valor = Number(l.valor) || 0;
    if (!valor) continue;
    if (l.adriano) saldo += normalizePagoPor(l.pago_por) === "voce" ? valor : -valor;
  }
  return saldo;
}

function asLancamento(row: any): Lancamento {
  return normalizeLancamento(row as Lancamento);
}

function stripDbFields(row: any) {
  const copy = { ...row };
  delete copy.id;
  delete copy.created_at;
  delete copy.editado_individualmente;
  return copy;
}

function stripUpdateFields(row: any) {
  const copy = { ...row };
  delete copy.id;
  delete copy.user_id;
  delete copy.created_at;
  delete copy.editado_individualmente;
  return copy;
}

function splitParcelamentoTotalIntoInstallments(rows: Lancamento[]): Lancamento[] {
  const adjusted = rows.map((r) => ({ ...r }));
  const groups = new Map<string, { index: number; row: Lancamento }[]>();
  adjusted.forEach((row, index) => {
    if (row.tipo === "despesa" && row.is_parcelado && row.parcelamento_id && row.parcela_total && row.parcela_total > 1) {
      const current = groups.get(row.parcelamento_id) || [];
      current.push({ index, row });
      groups.set(row.parcelamento_id, current);
    }
  });
  groups.forEach((group) => {
    const ordered = [...group].sort((a, b) => Number(a.row.parcela_atual || 0) - Number(b.row.parcela_atual || 0));
    const totalParcelas = Number(ordered[0]?.row.parcela_total || 0);
    if (!totalParcelas || ordered.length !== totalParcelas) return;
    const valorTotalInformado = Number(ordered[0].row.valor || 0);
    const allRowsHaveSameTotal = ordered.every(({ row }) => Math.abs(Number(row.valor || 0) - valorTotalInformado) < 0.005);
    if (!allRowsHaveSameTotal) return;
    const totalEmCentavos = Math.round(valorTotalInformado * 100);
    const parcelaBaseEmCentavos = Math.trunc(totalEmCentavos / totalParcelas);
    const diferencaCentavos = totalEmCentavos - parcelaBaseEmCentavos * totalParcelas;
    ordered.forEach(({ index }, installmentIndex) => {
      const centavos = installmentIndex === ordered.length - 1 ? parcelaBaseEmCentavos + diferencaCentavos : parcelaBaseEmCentavos;
      adjusted[index].valor = centavos / 100;
    });
  });
  return adjusted;
}

function pairComparable(l: Lancamento, o: Lancamento): boolean {
  return l.user_id === o.user_id &&
    l.tipo === "despesa" && o.tipo === "despesa" &&
    l.adriano !== o.adriano &&
    l.descricao === o.descricao &&
    l.data === o.data &&
    l.mes_referencia === o.mes_referencia &&
    Math.abs(Number(l.valor || 0) - Number(o.valor || 0)) < 0.01 &&
    (l.categoria || "") === (o.categoria || "") &&
    (l.categoria_macro || "") === (o.categoria_macro || "") &&
    (l.subcategoria || "") === (o.subcategoria || "") &&
    normalizePagoPor(l.pago_por) === normalizePagoPor(o.pago_por);
}

async function findLinkedLancamento(current: Lancamento): Promise<Lancamento | null> {
  if (current.tipo !== "despesa") return null;

  if (current.shared_group_id) {
    const { data } = await supabase
      .from("lancamentos")
      .select("*")
      .eq("shared_group_id", current.shared_group_id)
      .neq("id", current.id)
      .maybeSingle();
    if (data) return asLancamento(data);
  }

  if (current.lancamento_origem_id) {
    const { data } = await supabase.from("lancamentos").select("*").eq("id", current.lancamento_origem_id).maybeSingle();
    if (data) return asLancamento(data);
  }

  const q = supabase
    .from("lancamentos")
    .select("*")
    .eq("user_id", current.user_id)
    .eq("tipo", "despesa")
    .eq("data", current.data)
    .eq("mes_referencia", current.mes_referencia)
    .eq("descricao", current.descricao)
    .eq("valor", current.valor)
    .neq("id", current.id)
    .neq("adriano", current.adriano)
    .order("created_at", { ascending: false });

  const { data } = await q;
  const rows = ((data || []) as unknown as Lancamento[]).map(normalizeLancamento);
  return rows.find((row) => pairComparable(current, row)) || rows[0] || null;
}

function linkedUpdatePayload(target: Lancamento, updates: Partial<Lancamento>) {
  const payload: Record<string, any> = {};
  const keys = [
    "descricao", "valor", "categoria", "categoria_macro", "subcategoria", "data", "mes_referencia",
    "forma_pagamento", "cartao_id", "pago_por", "is_parcelado", "parcela_atual", "parcela_total",
    "parcelamento_id", "recorrente", "dia_recorrencia", "recorrencia_ate", "recorrencia_pai_id", "pago"
  ];
  keys.forEach((k) => {
    if (k in updates) payload[k] = (updates as any)[k];
  });
  if (target.adriano || target.shared_role === "adriano") {
    payload.adriano = true;
    payload.subcategoria_pais = "Adriano";
    payload.shared_role = "adriano";
  } else {
    payload.adriano = false;
    payload.subcategoria_pais = null;
    payload.shared_role = "principal";
  }
  return payload;
}

async function ensurePairLinked(a: Lancamento, b: Lancamento) {
  const gid = a.shared_group_id || b.shared_group_id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
  const principal = a.adriano ? b : a;
  const mirror = a.adriano ? a : b;
  await supabase.from("lancamentos").update({ shared_group_id: gid, shared_role: "principal", lancamento_origem_id: null } as any).eq("id", principal.id);
  await supabase.from("lancamentos").update({ shared_group_id: gid, shared_role: "adriano", lancamento_origem_id: principal.id, subcategoria_pais: "Adriano", adriano: true } as any).eq("id", mirror.id);
}

async function fetchLancamentosByIds(ids: string[]): Promise<Lancamento[]> {
  const uniqueIds = Array.from(new Set(ids)).filter(Boolean);
  if (uniqueIds.length === 0) return [];
  const { data, error } = await supabase.from("lancamentos").select("*").in("id", uniqueIds);
  if (error) throw error;
  return ((data || []) as unknown as Lancamento[]).map(normalizeLancamento);
}

async function resolveIdsWithSharedPairs(rows: Lancamento[]): Promise<string[]> {
  const ids = new Set(rows.map((row) => row.id));
  const sharedGroupIds = Array.from(new Set(rows.map((row) => row.shared_group_id).filter(Boolean))) as string[];

  if (sharedGroupIds.length > 0) {
    const { data, error } = await supabase
      .from("lancamentos")
      .select("id")
      .in("shared_group_id", sharedGroupIds);
    if (error) throw error;
    (data || []).forEach((row: any) => ids.add(row.id));
  }

  for (const row of rows) {
    if (!row.shared_group_id) {
      const linked = await findLinkedLancamento(row);
      if (linked) ids.add(linked.id);
    }
  }

  return Array.from(ids);
}

async function fetchRecorrenciaScopeRows(params: { userId: string; recorrenciaPaiId: string; fromDate?: string }): Promise<Lancamento[]> {
  let q = supabase
    .from("lancamentos")
    .select("*")
    .eq("user_id", params.userId)
    .eq("recorrencia_pai_id", params.recorrenciaPaiId);
  if (params.fromDate) q = q.gte("data", params.fromDate);

  const { data, error } = await q;
  if (error) throw error;
  return ((data || []) as unknown as Lancamento[]).map(normalizeLancamento);
}

async function deleteLancamentosByIds(ids: string[]) {
  const uniqueIds = Array.from(new Set(ids)).filter(Boolean);
  if (uniqueIds.length === 0) return;
  const { error } = await supabase.from("lancamentos").delete().in("id", uniqueIds);
  if (error) throw error;
}

async function updateLancamentosByScope(rows: Lancamento[], updates: Partial<Lancamento>) {
  const targetIds = await resolveIdsWithSharedPairs(rows);
  const targets = await fetchLancamentosByIds(targetIds);
  for (const target of targets) {
    const payload = linkedUpdatePayload(target, updates);
    if ("pago_por" in payload) payload.pago_por = normalizePagoPor(payload.pago_por);
    await supabase.from("lancamentos").update(payload as any).eq("id", target.id).throwOnError();
  }
}

export function useLancamentos(mesRef?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["lancamentos", mesRef || "all"],
    queryFn: async () => {
      let q = supabase.from("lancamentos").select("*").eq("user_id", user!.id).order("data", { ascending: true });
      if (mesRef) q = q.eq("mes_referencia", mesRef);
      const { data, error } = await q;
      if (error) throw error;
      return ((data || []) as unknown as Lancamento[]).map(normalizeLancamento);
    },
    enabled: !!user,
  });
}

export function useAddLancamento() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Omit<Lancamento, "id" | "user_id" | "created_at" | "editado_individualmente" | "lancamento_origem_id">) => {
      const normalized = normalizeLancamento({ ...(row as Lancamento), id: "", user_id: user!.id, created_at: "", editado_individualmente: false, lancamento_origem_id: null });
      const payload = { ...stripDbFields(normalized), user_id: user!.id, recorrencia_ate: normalized.recorrencia_ate || null };
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
      const normalizedRows = rows.map((r) => normalizeLancamento({
        id: (r.id as string) || "", user_id: user!.id, descricao: (r.descricao as string) || "", valor: Number(r.valor || 0),
        tipo: (r.tipo as "despesa" | "receita") || "despesa", categoria: (r.categoria as string) || "",
        categoria_macro: (r.categoria_macro as string | null) ?? null, subcategoria_pais: (r.subcategoria_pais as string | null) ?? null,
        subcategoria: (r.subcategoria as string | null) ?? null, data: (r.data as string) || "", mes_referencia: (r.mes_referencia as string) || "",
        parcela_atual: (r.parcela_atual as number | null) ?? null, parcela_total: (r.parcela_total as number | null) ?? null,
        is_parcelado: !!r.is_parcelado, parcelamento_id: (r.parcelamento_id as string | null) ?? null, pago: !!r.pago,
        forma_pagamento: (r.forma_pagamento as string | null) ?? null, cartao_id: (r.cartao_id as string | null) ?? null,
        editado_individualmente: !!r.editado_individualmente, recorrente: !!r.recorrente, dia_recorrencia: (r.dia_recorrencia as number | null) ?? null,
        recorrencia_ate: (r.recorrencia_ate as string | null) ?? null, recorrencia_pai_id: (r.recorrencia_pai_id as string | null) ?? null,
        adriano: !!r.adriano, shared_group_id: (r.shared_group_id as string | null) ?? null, shared_role: (r.shared_role as "principal" | "adriano" | null) ?? null,
        lancamento_origem_id: (r.lancamento_origem_id as string | null) ?? null, pago_por: (r.pago_por as string) || "voce", created_at: "",
      }));
      const adjusted = splitParcelamentoTotalIntoInstallments(normalizedRows);
      const { error } = await supabase.from("lancamentos").insert(adjusted.map((r) => ({ ...stripDbFields(r), user_id: user!.id, recorrencia_ate: r.recorrencia_ate || null })) as any);
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
      const { data: currentRaw, error: fetchError } = await supabase.from("lancamentos").select("*").eq("id", id).maybeSingle();
      if (fetchError) throw fetchError;
      if (!currentRaw) return;
      const current = asLancamento(currentRaw);
      const payload = stripUpdateFields(rest);
      if ("pago_por" in payload) payload.pago_por = normalizePagoPor(payload.pago_por);
      await supabase.from("lancamentos").update(linkedUpdatePayload(current, payload as Partial<Lancamento>) as any).eq("id", id).throwOnError();

      const linked = await findLinkedLancamento(current);
      if (linked) {
        await ensurePairLinked(current, linked);
        const linkedPayload = linkedUpdatePayload(linked, payload as Partial<Lancamento>);
        await supabase.from("lancamentos").update(linkedPayload as any).eq("id", linked.id).throwOnError();
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lancamentos"] }),
  });
}

export function useDeleteLancamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: currentRaw, error: fetchError } = await supabase.from("lancamentos").select("*").eq("id", id).maybeSingle();
      if (fetchError) throw fetchError;
      const current = currentRaw ? asLancamento(currentRaw) : null;
      if (!current) return;
      const ids = await resolveIdsWithSharedPairs([current]);
      await deleteLancamentosByIds(ids);
    },
    onSuccess: async () => {
      await Promise.all([qc.invalidateQueries({ queryKey: ["lancamentos"] }), qc.invalidateQueries({ queryKey: ["reembolsos"] })]);
    },
  });
}

export function useDeleteFutureParcelamento() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ parcelamento_id, fromDate }: { parcelamento_id: string; fromDate: string }) => {
      const { data, error } = await supabase.from("lancamentos").select("*").eq("user_id", user!.id).eq("parcelamento_id", parcelamento_id).gte("data", fromDate);
      if (error) throw error;
      const ids = await resolveIdsWithSharedPairs(((data || []) as unknown as Lancamento[]).map(normalizeLancamento));
      await deleteLancamentosByIds(ids);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lancamentos"] }),
  });
}

export function useDeleteAllParcelamento() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (parcelamento_id: string) => {
      const { data, error } = await supabase.from("lancamentos").select("*").eq("user_id", user!.id).eq("parcelamento_id", parcelamento_id);
      if (error) throw error;
      const ids = await resolveIdsWithSharedPairs(((data || []) as unknown as Lancamento[]).map(normalizeLancamento));
      await deleteLancamentosByIds(ids);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lancamentos"] }),
  });
}

export function useDeleteFutureRecorrencia() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ recorrencia_pai_id, fromDate }: { recorrencia_pai_id: string; fromDate: string }) => {
      const rows = await fetchRecorrenciaScopeRows({ userId: user!.id, recorrenciaPaiId: recorrencia_pai_id, fromDate });
      const ids = await resolveIdsWithSharedPairs(rows);
      await deleteLancamentosByIds(ids);
    },
    onSuccess: async () => {
      await Promise.all([qc.invalidateQueries({ queryKey: ["lancamentos"] }), qc.invalidateQueries({ queryKey: ["reembolsos"] })]);
    },
  });
}

export function useDeleteAllRecorrencia() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (recorrencia_pai_id: string) => {
      const rows = await fetchRecorrenciaScopeRows({ userId: user!.id, recorrenciaPaiId: recorrencia_pai_id });
      const ids = await resolveIdsWithSharedPairs(rows);
      await deleteLancamentosByIds(ids);
    },
    onSuccess: async () => {
      await Promise.all([qc.invalidateQueries({ queryKey: ["lancamentos"] }), qc.invalidateQueries({ queryKey: ["reembolsos"] })]);
    },
  });
}

export function useUpdateFutureRecorrencia() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ recorrencia_pai_id, fromDate, updates }: { recorrencia_pai_id: string; fromDate: string; updates: Partial<Lancamento> }) => {
      const rows = await fetchRecorrenciaScopeRows({ userId: user!.id, recorrenciaPaiId: recorrencia_pai_id, fromDate });
      await updateLancamentosByScope(rows, stripUpdateFields(updates) as Partial<Lancamento>);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lancamentos"] }),
  });
}

export function useUpdateAllRecorrencia() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ recorrencia_pai_id, updates }: { recorrencia_pai_id: string; updates: Partial<Lancamento> }) => {
      const rows = await fetchRecorrenciaScopeRows({ userId: user!.id, recorrenciaPaiId: recorrencia_pai_id });
      await updateLancamentosByScope(rows, stripUpdateFields(updates) as Partial<Lancamento>);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lancamentos"] }),
  });
}
