import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase as sb, configured } from "./supabase";
import {
  CATEGORIES,
  isSubcategoryOf,
  subcategoryCategory,
  knownMacro,
  isCategory,
  categoryOf,
  categoryPatch,
  memory,
  memorySubcategory,
  memoryExamples,
  parentRule,
  dateKey,
  monthKey,
  effectiveDate,
  parseMoney,
  cardDates,
  monthPeriod,
  installmentRows,
  recurringRows,
  groupScope,
  splitInstallments,
  isInstallmentCount,
  normalize,
  parseDate,
  navigateMonth,
} from "./domain";
import type { Entry, Card, Category } from "./domain";
import CategorySelect from "./CategorySelect";
import SubcategorySelect from "./SubcategorySelect";
import MonthSelector from "./MonthSelector";
import Ledger from "./Ledger";
import MonthView from "./MonthView";
import Charts from "./Charts";
const money = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    n,
  );
const message = (e: unknown) =>
  e instanceof Error
    ? e.message
    : "Não foi possível concluir. Tente novamente.";
type Draft = {
  amount: number;
  label: string;
  kind: "despesa" | "receita";
  category: Category | null;
  subcategory: string | null;
  dayOffset: number;
  cardId: string | null;
  edited?: boolean;
};
const fields =
  "id,user_id,descricao,valor,tipo,categoria,categoria_macro,subcategoria,subcategoria_pais,data,mes_referencia,forma_pagamento,cartao_id,pago,pago_por,is_parcelado,parcela_atual,parcela_total,parcelamento_id,recorrencia_id,created_at";
async function historyFor(uid: string) {
  const all: Entry[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await sb!
      .from("norte_lancamentos")
      .select(fields)
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .order("id")
      .range(offset, offset + 999);
    if (error) throw error;
    all.push(...(data as Entry[]));
    if (data.length < 1000) return all;
  }
}
async function askAI(body: Record<string, unknown>) {
  const { data, error } = await sb!.functions.invoke("norte-ai", {
    body: { ...body, categories: CATEGORIES },
  });
  if (error || data?.error || data?.code) {
    let details = data;
    const response = error?.context;
    if (response instanceof Response) {
      try { details = await response.clone().json(); } catch { /* Gateway responses can be non-JSON. */ }
    }
    const code = response?.status === 401 ? "auth" : details?.code;
    const text = ["config", "provider_auth", "model"].includes(code)
      ? "A IA ainda não está configurada"
      : code === "auth" ? "Entre de novo para usar a IA"
      : code === "input" ? "Confira o texto e tente de novo"
      : "A IA está fora do ar agora, tente de novo";
    throw new Error(text);
  }
  return data;
}
function Logo() {
  return (
    <span className="brand">
      <img src="/norte-compass-v4.svg" alt="" />
      norte<span className="brand-dot">.</span>
    </span>
  );
}
export default function App() {
  const [session, setSession] = useState<Session | null>(null),
    [authReady, setAuthReady] = useState(false);
  const [rows, setRows] = useState<Entry[]>([]),
    [cards, setCards] = useState<Card[]>([]),
    [loading, setLoading] = useState(true),
    [loadFailed, setLoadFailed] = useState(false);
  const [tab, setTab] = useState("Mês"),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [noticeMonth, setNoticeMonth] = useState<string | null>(null),
    [pending, setPending] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(new Date()),
    [undo, setUndo] = useState<string[]>([]),
    [undoBusy, setUndoBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null),
    opener = useRef<HTMLButtonElement>(null),
    cancelled = useRef(new Set<string>());
  const [kind, setKind] = useState<"despesa" | "receita">("despesa");
  const [mode, setMode] = useState("Texto com IA"),
    [text, setText] = useState(""),
    [amount, setAmount] = useState(""),
    [label, setLabel] = useState(""),
    [drafts, setDrafts] = useState<Draft[]>([]),
    [payment, setPayment] = useState("dinheiro"),
    [plan, setPlan] = useState<"uma" | "parcelado" | "recorrente">("uma"),
    [installments, setInstallments] = useState("2"),
    [recDay, setRecDay] = useState(String(new Date().getDate())),
    [recMonths, setRecMonths] = useState("12"),
    [busy, setBusy] = useState(false),
    [sheetError, setSheetError] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12),
  );
  const period = monthPeriod(selectedMonth, now);
  const selectedDate = period === "current" ? now : selectedMonth;
  const [categoryFilter, setCategoryFilter] = useState<Category | null>(null);
  const uid = session?.user.id;
  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(
      () => {
        setNotice("");
        setUndo([]);
        setNoticeMonth(null);
      },
      undo.length ? 8000 : 4000,
    );
    return () => window.clearTimeout(t);
  }, [notice, undo]);
  useEffect(() => {
    if (!sb) {
      setAuthReady(true);
      return;
    }
    let live = true;
    sb.auth.getSession().then(({ data, error }) => {
      if (live) {
        setSession(data.session);
        setAuthReady(true);
        if (error) setError("Entre novamente para continuar.");
      }
    });
    const { data } = sb.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setAuthReady(true);
    });
    return () => {
      live = false;
      data.subscription.unsubscribe();
    };
  }, []);
  const load = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    setLoadFailed(false);
    try {
      const [entries, c] = await Promise.all([
        historyFor(uid),
        sb!
          .from("norte_cartoes")
          .select("id,nome,dia_fechamento,dia_vencimento,ativo")
          .eq("user_id", uid),
      ]);
      if (c.error) throw c.error;
      setRows(entries);
      setCards(c.data ?? []);
      setError("");
    } catch {
      setLoadFailed(true);
      setError("Não consegui carregar seus dados. Tente atualizar.");
    } finally {
      setLoading(false);
    }
  }, [uid]);
  useEffect(() => {
    setRows([]);
    setCards([]);
    setUndo([]);
    cancelled.current.clear();
    void load();
  }, [load]);
  useEffect(() => {
    const refresh = () => {
      setNow(new Date());
      if (document.visibilityState === "visible") void load();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      clearInterval(timer);
    };
  }, [load]);
  const ranked = cards
    .filter((c) => c.ativo)
    .map((c) => ({ ...c, ...cardDates(c, now) }))
    .sort((a, b) => b.days - a.days || a.nome.localeCompare(b.nome));
  const canChoosePlan =
    mode === "Valor" ||
    (mode === "Texto com IA" && drafts.length === 1 && drafts[0].kind === "despesa");
  const planAmount = mode === "Valor" ? parseMoney(amount) : drafts[0]?.amount ?? NaN;
  const installmentCount = Number(installments);
  const installmentPreview = isInstallmentCount(installmentCount)
    ? splitInstallments(planAmount, installmentCount)
    : [];
  async function deleteEntry(row: Entry, scope: "one" | "next" | "all" = "one") {
    if (!uid) throw new Error("Sessão encerrada");
    const targets = groupScope(rows, row, scope);
    const ids = targets.map((r) => r.id);
    ids.forEach((id) => cancelled.current.add(id));
    const { data, error } = await sb!
      .from("norte_lancamentos")
      .delete()
      .eq("user_id", uid)
      .in("id", ids)
      .select("id");
    if (error || data?.length !== ids.length) {
      ids.forEach((id) => cancelled.current.delete(id));
      throw error ?? new Error("Exclusão não confirmada");
    }
    setRows((old) => old.filter((r) => !ids.includes(r.id)));
    setUndo((old) => old.filter((id) => !ids.includes(id)));
    setNotice(ids.length > 1 ? `${ids.length} lançamentos apagados.` : "Lançamento apagado.");
  }
  async function editEntry(
    row: Entry,
    edits: { descricao: string; valor: number; data?: string; category: Category | null; subcategory: string | null },
    scope: "one" | "next" | "all",
  ) {
    if (!uid) throw new Error("Sessão encerrada");
    const targets = groupScope(rows, row, scope);
    const ids = targets.map((r) => r.id);
    const patch: Record<string, unknown> = {
      descricao: edits.descricao,
      valor: Math.round(edits.valor * 100) / 100,
    };
    if (edits.data && targets.length === 1 && !row.parcelamento_id && !row.recorrencia_id) {
      const d = parseDate(edits.data);
      if (Number.isNaN(d.getTime()) || dateKey(d) !== edits.data) throw new Error("Data inválida");
      patch.data = edits.data;
      const card = row.cartao_id ? cards.find((c) => c.id === row.cartao_id) : undefined;
      patch.mes_referencia = card ? cardDates(card, d).reference : monthKey(d);
    }
    const category = parentRule(edits.descricao) ? "Pais" : edits.category;
    const subcategory = row.tipo === "despesa" && isSubcategoryOf(edits.subcategory, category)
      ? edits.subcategory : null;
    const categoryChanged = category !== categoryOf(row) || subcategory !== (row.subcategoria ?? null);
    const categoryUpdate = category ? {
      ...categoryPatch(category, row),
      subcategoria: subcategory,
      ...(category === "Pais" && subcategory ? { categoria_macro: subcategoryCategory(subcategory) } : {}),
    } : null;
    const { data, error } = await sb!
      .from("norte_lancamentos")
      .update(patch)
      .eq("user_id", uid)
      .in("id", ids)
      .select("id");
    if (error || data?.length !== ids.length)
      throw error ?? new Error("Alteração não confirmada");
    setRows((old) => old.map((r) => (ids.includes(r.id) ? { ...r, ...patch } as Entry : r)));
    if (categoryChanged && categoryUpdate) {
      const related = groupScope(rows, row, "all").map((r) => r.id);
      const result = await sb!.from("norte_lancamentos")
        .update(categoryUpdate).eq("user_id", uid).in("id", related).select("id");
      if (result.error || result.data?.length !== related.length)
        throw result.error ?? new Error("Categoria não confirmada");
      setRows((old) => old.map((r) => related.includes(r.id) ? { ...r, ...categoryUpdate } as Entry : r));
    }
    setNotice(ids.length > 1 ? `${ids.length} lançamentos atualizados.` : "Lançamento atualizado.");
  }
  function openSheet() {
    setSheetError("");
    setDrafts([]);
    setMode("Texto com IA");
    setKind("despesa");
    setText("");
    setAmount("");
    setLabel("");
    setPlan("uma");
    setInstallments("2");
    setRecDay(String(new Date().getDate()));
    setRecMonths("12");
    dialog.current?.showModal();
  }
  function closeSheet() {
    if (busy) return;
    dialog.current?.close();
    opener.current?.focus();
  }
  async function parseText() {
    setBusy(true);
    setSheetError("");
    try {
      const examples = memoryExamples(rows)
        .map((r) => `${r.descricao}${r.recorrencia_id ? " (recorrente)" : ""} → ${categoryOf(r)}${r.subcategoria ? ` / ${r.subcategoria}` : ""}`);
      const data = await askAI({
        task: "parse",
        text,
        today: dateKey(now),
        examples,
        cards: ranked.map(({ id, nome }) => ({ id, name: nome })),
        defaultCardId: ranked[0]?.id ?? null,
      });
      const items: Draft[] = (Array.isArray(data.items) ? data.items : [])
        .slice(0, 10)
        .map((v: Record<string, unknown>) => {
          const label = String(v.label ?? "").trim().slice(0, 120);
          if (v.kind !== "despesa" && v.kind !== "receita")
            throw new Error("Não identifiquei se é gasto ou receita. Tente explicar de outro jeito.");
          const category = memory(label, rows) ?? (isCategory(v.category) ? v.category : null);
          const remembered = memorySubcategory(label, rows);
          const subcategory = isSubcategoryOf(remembered, category)
            ? remembered
            : isSubcategoryOf(v.subcategory, category)
              ? v.subcategory
              : null;
          return {
            amount: Number(v.amount),
            label,
            kind: v.kind,
            category,
            subcategory,
            cardId: v.cardId === null || typeof v.cardId === "string" && cards.some((c) => c.id === v.cardId)
              ? v.cardId as string | null
              : ranked[0]?.id ?? null,
            dayOffset: Number.isInteger(v.dayOffset)
              ? Math.max(-30, Math.min(0, Number(v.dayOffset)))
              : 0,
          };
        })
        .filter(
          (v: Draft) => Number.isFinite(v.amount) && v.amount > 0 && v.label,
        );
      if (!items.length)
        throw new Error("Não identifiquei um lançamento. Inclua valor e descrição.");
      setDrafts(items);
    } catch (e) {
      setSheetError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function classify(inserted: Entry[], before: Entry[]) {
    setPending((s) => new Set([...s, ...inserted.map((r) => r.id)]));
    try {
      const unknown = inserted.filter((r) => {
        const cat = categoryOf(r) ?? memory(r.descricao, before);
        return !cat || (r.tipo === "despesa" &&
          !isSubcategoryOf(r.subcategoria, cat) &&
          !isSubcategoryOf(memorySubcategory(r.descricao, before), cat));
      });
      // A compra parcelada cria várias linhas iguais. A IA recebe cada
      // descrição uma vez, mantendo a chamada dentro do limite de 10 itens.
      const guesses = new Map<string, { category: Category; subcategory: string | null }>();
      const guessKey = (type: string, label: string) => `${type}|${normalize(label)}`;
      const uniqueUnknown = unknown.filter(
        (row, index) => unknown.findIndex(
          (other) => other.tipo === row.tipo && normalize(other.descricao) === normalize(row.descricao),
        ) === index,
      );
      for (const entryKind of ["despesa", "receita"] as const) {
        const group = uniqueUnknown.filter((row) => row.tipo === entryKind);
        if (!group.length) continue;
        try {
          const data = await askAI({
            task: "classify",
            kind: entryKind,
            items: group.map((r) => ({
              label: r.descricao,
              amount: r.valor,
              ...(categoryOf(r) ?? memory(r.descricao, before)
                ? { category: categoryOf(r) ?? memory(r.descricao, before) }
                : {}),
            })),
            examples: memoryExamples(before)
              .map((r) => `${r.descricao}${r.recorrencia_id ? " (recorrente)" : ""} → ${categoryOf(r)}${r.subcategoria ? ` / ${r.subcategoria}` : ""}`),
          });
          const categories = Array.isArray(data.categories) ? data.categories : [];
          const subcategories = Array.isArray(data.subcategories) ? data.subcategories : [];
          group.forEach((row, index) => {
            const category = categories[index];
            if (isCategory(category))
              guesses.set(guessKey(row.tipo, row.descricao), {
                category,
                subcategory: isSubcategoryOf(subcategories[index], category)
                  ? subcategories[index]
                  : null,
              });
          });
        } catch (e) {
          setNotice(`${message(e)}. Lançamento salvo; corrija pelo swipe se precisar.`);
        }
      }
      for (const r of inserted) {
        if (cancelled.current.has(r.id)) continue;
        const guess = guesses.get(guessKey(r.tipo, r.descricao));
        const cat =
          categoryOf(r) ??
          memory(r.descricao, before) ??
          guess?.category ??
          null;
        if (!cat) continue;
        const remembered = memorySubcategory(r.descricao, before);
        const aiSubcategory = guess?.category === cat ? guess.subcategory : null;
        const subcategory = r.tipo === "despesa"
          ? isSubcategoryOf(r.subcategoria, cat) ? r.subcategoria
            : isSubcategoryOf(remembered, cat) ? remembered
              : isSubcategoryOf(aiSubcategory, cat) ? aiSubcategory : null
          : null;
        const patch = {
          ...categoryPatch(cat, r),
          ...(subcategory ? {
            subcategoria: subcategory,
            ...(cat === "Pais" ? { categoria_macro: subcategoryCategory(subcategory) } : {}),
          } : {}),
        };
        const { error } = await sb!
          .from("norte_lancamentos")
          .update(patch)
          .eq("id", r.id)
          .eq("user_id", r.user_id);
        if (error) throw error;
        if (!cancelled.current.has(r.id))
          setRows((old) =>
            old.map((x) => (x.id === r.id ? { ...x, ...patch } : x)),
          );
      }
    } catch {
      setNotice("Lançamento salvo. Confira a categoria pelo swipe se precisar.");
    } finally {
      setPending(
        (s) =>
          new Set([...s].filter((id) => !inserted.some((r) => r.id === id))),
      );
    }
  }
  async function save() {
    if (!uid) return;
    setBusy(true);
    setSheetError("");
    try {
      const items =
        mode === "Valor"
          ? [
              {
                amount: parseMoney(amount),
                label: label.trim(),
                kind,
                category: null,
                subcategory: null,
                dayOffset: 0,
                cardId: payment === "dinheiro" ? null : payment,
              } as Draft,
            ]
          : drafts;
      if (
        !items.length ||
        items.some(
          (d) => !d.label || !Number.isFinite(d.amount) || d.amount <= 0,
        )
      )
        throw new Error("Preencha uma descrição e um valor maior que zero.");
      const before = rows;
      const supportsPlan =
        mode === "Valor" ||
        (mode === "Texto com IA" && items.length === 1 && items[0].kind === "despesa");
      const isPlanned = supportsPlan && plan !== "uma" && items.length === 1;
      let payload: Record<string, unknown>[];
      if (isPlanned) {
        const d = items[0];
        const cat = parentRule(d.label)
          ? "Pais"
          : d.edited
            ? d.category
            : (memory(d.label, before) ?? d.category);
        const base = {
          user_id: uid,
          descricao: d.label,
          tipo: d.kind,
          categoria: d.kind === "receita" && cat === "Pais" ? "reembolso_pais" : d.kind,
          categoria_macro: cat === "Pais"
            ? (isSubcategoryOf(d.subcategory, cat) ? subcategoryCategory(d.subcategory) : knownMacro(d.label, before))
            : cat,
          subcategoria: d.kind === "despesa" && isSubcategoryOf(d.subcategory, isCategory(cat) ? cat : null) ? d.subcategory : null,
          subcategoria_pais: cat === "Pais" ? "Pais" : null,
        };
        const group = crypto.randomUUID();
        if (plan === "parcelado") {
          const n = Number(installments);
          if (!isInstallmentCount(n))
            throw new Error("Preencha parcelas entre 2 e 360.");
          const card = d.kind === "despesa" ? (cards.find((c) => c.id === (mode === "Texto com IA" ? d.cardId : payment)) ?? null) : null;
          payload = installmentRows(base, d.amount, n, now, card, group);
        } else {
          const day = Number(recDay), months = Number(recMonths);
          if (!Number.isInteger(day) || day < 1 || day > 31 || !Number.isInteger(months) || months < 2 || months > 36)
            throw new Error("Preencha dia (1 a 31) e meses (2 a 36).");
          payload = recurringRows(base, d.amount, now, day, months, group);
        }
        if (!payload.length) throw new Error("Preencha uma descrição e um valor maior que zero.");
      } else
      payload = items.map((d) => {
        const day = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + d.dayOffset,
          12,
        );
        const card = d.kind === "despesa" ? cards.find((c) => c.id === (mode === "Texto com IA" ? d.cardId : payment)) : undefined;
        const cat = parentRule(d.label)
          ? "Pais"
          : d.edited
            ? d.category
            : (memory(d.label, before) ?? d.category);
        return {
          user_id: uid,
          descricao: d.label,
          valor: Math.round(d.amount * 100) / 100,
          tipo: d.kind,
          categoria: d.kind === "receita" && cat === "Pais" ? "reembolso_pais" : d.kind,
          categoria_macro: cat === "Pais"
            ? (isSubcategoryOf(d.subcategory, cat) ? subcategoryCategory(d.subcategory) : knownMacro(d.label, before))
            : cat,
          subcategoria: d.kind === "despesa" && isSubcategoryOf(d.subcategory, isCategory(cat) ? cat : null) ? d.subcategory : null,
          subcategoria_pais: cat === "Pais" ? "Pais" : null,
          data: dateKey(day),
          mes_referencia: card ? cardDates(card, day).reference : monthKey(day),
          forma_pagamento: card ? "credito" : "dinheiro",
          cartao_id: card?.id ?? null,
          pago: !card,
          pago_por: "voce",
          is_parcelado: false,
          parcela_atual: null,
          parcela_total: null,
          parcelamento_id: null,
        };
      });
      const { data, error } = await sb!
        .from("norte_lancamentos")
        .insert(payload)
        .select(fields);
      if (error) throw error;
      const inserted = data as Entry[];
      setRows((old) => [...inserted, ...old]);
      setUndo(inserted.map((r) => r.id));
      const incomeCount = inserted.filter((r) => r.tipo === "receita").length;
      const expenseCount = inserted.length - incomeCount;
      const invoiceMonth = inserted.length === 1 && inserted[0].forma_pagamento === "credito"
        && monthKey(effectiveDate(inserted[0])) !== monthKey(now)
        ? monthKey(effectiveDate(inserted[0])) : null;
      setNoticeMonth(invoiceMonth);
      setNotice(isPlanned && plan === "parcelado"
        ? `Compra anotada em ${inserted.length} parcelas.`
        : isPlanned && plan === "recorrente"
        ? `Lançamento anotado por ${inserted.length} meses.`
        : incomeCount && expenseCount
        ? "Lançamentos anotados."
        : incomeCount
        ? incomeCount > 1 ? "Receitas anotadas." : "Receita anotada."
        : expenseCount > 1 ? "Gastos anotados." : "Gasto anotado.");
      dialog.current?.close();
      opener.current?.focus();
      void classify(inserted, before);
    } catch (e) {
      setSheetError(
        e instanceof Error && /Preencha/.test(e.message)
          ? e.message
          : "Não consegui salvar. Seu texto continua aqui para tentar novamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function undoSave() {
    if (!uid || !undo.length) return;
    setUndoBusy(true);
    const ids = [...undo];
    ids.forEach((id) => cancelled.current.add(id));
    try {
      const { data, error } = await sb!
        .from("norte_lancamentos")
        .delete()
        .eq("user_id", uid)
        .in("id", ids)
        .select("id");
      if (error || data?.length !== ids.length)
        throw error ?? new Error("Exclusão não confirmada");
      setRows((old) => old.filter((r) => !ids.includes(r.id)));
      setUndo([]);
      setNotice("Anotação desfeita.");
      setNoticeMonth(null);
    } catch {
      ids.forEach((id) => cancelled.current.delete(id));
      setError("Não consegui desfazer. Tente novamente.");
    } finally {
      setUndoBusy(false);
    }
  }
  if (!authReady)
    return (
      <main className="app">
        <Logo />
        <p role="status">Abrindo seu Norte…</p>
      </main>
    );
  if (!configured)
    return (
      <main className="app">
        <Logo />
        <h1>Falta conectar o Norte.</h1>
        <p>
          Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no
          ambiente.
        </p>
      </main>
    );
  if (!session) return <Login />;
  return (
    <main className="app">
      <header>
        <Logo />
      </header>
      <nav aria-label="Navegação principal">
        {["Mês", "Lançamentos", "Gráfico"].map((t) => (
          <button
            key={t}
            aria-current={t === tab ? "page" : undefined}
            onClick={() => {
              if (t === "Mês")
                setSelectedMonth(
                  new Date(now.getFullYear(), now.getMonth(), 1, 12),
                );
              setTab(t);
              setError("");
            }}
          >
            {t}
          </button>
        ))}
      </nav>
      <MonthSelector
        selected={selectedMonth}
        now={now}
        onChange={setSelectedMonth}
        onStep={(step) =>
          setSelectedMonth((current) => navigateMonth(current, step, now))
        }
      />
      {error && (
        <div className="alert" role="alert">
          {error}
          {loadFailed && <button onClick={() => void load()}>Atualizar</button>}
        </div>
      )}
      {notice && (
        <div className="notice" role="status">
          {notice}
          {undo.length > 0 && (
            <button disabled={undoBusy} onClick={() => void undoSave()}>
              {undoBusy ? "Desfazendo…" : "Desfazer"}
            </button>
          )}
          {noticeMonth && undo.length > 0 && (
            <button type="button" onClick={() => {
              setSelectedMonth(parseDate(noticeMonth + "-01"));
              setTab("Mês");
              setNotice("");
              setNoticeMonth(null);
            }}>
              Ver fatura de {parseDate(noticeMonth + "-01").toLocaleDateString("pt-BR", { month: "long" })}
            </button>
          )}
          <button
            type="button"
            className="notice-close"
            aria-label="Fechar aviso"
            onClick={() => { setNotice(""); setUndo([]); setNoticeMonth(null); }}
          >
            ×
          </button>
        </div>
      )}
      {loading ? (
        <div className="loading" role="status">
          Encontrando seu Norte…
        </div>
      ) : loadFailed ? (
        <p>Seus valores aparecerão após atualizar.</p>
      ) : (
        <>
          {tab === "Mês" && (
            <MonthView rows={rows} selected={selectedDate} now={now} cards={cards} />
          )}
          {tab === "Gráfico" && (
            <Charts
              rows={rows}
              selected={selectedDate}
              onCategory={(category) => {
                setCategoryFilter(category);
                setTab("Lançamentos");
              }}
            />
          )}
          {tab === "Lançamentos" && (
            <Ledger
              rows={rows}
              cards={cards}
              selected={selectedDate}
              pending={pending}
              onDelete={deleteEntry}
              onEdit={editEntry}
              categoryFilter={categoryFilter}
              onClearCategory={() => setCategoryFilter(null)}
            />
          )}
        </>
      )}
      <button
        className="primary floating-add"
        ref={opener}
        onClick={openSheet}
        disabled={loading || loadFailed}
      >
        <span aria-hidden="true">＋</span> Anotar
      </button>
      <dialog
        ref={dialog}
        onCancel={(e) => {
          if (busy) e.preventDefault();
        }}
        aria-labelledby="sheet-title"
      >
        <div className="sheet">
          <div className="sheet-top">
            <h2 id="sheet-title">{mode === "Texto com IA" ? "Anotar com IA" : `Anotar ${kind === "receita" ? "receita" : "gasto"}`}</h2>
            <button
              className="icon-button"
              aria-label="Fechar"
              disabled={busy}
              onClick={closeSheet}
            >
              ×
            </button>
          </div>
          {mode === "Valor" && <div className="sheet-tabs" role="group" aria-label="Tipo de lançamento">
            {(["despesa", "receita"] as const).map((value) => (
              <button key={value} aria-pressed={kind === value} disabled={busy}
                onClick={() => {
                  setKind(value);
                  setDrafts([]);
                  setPlan("uma");
                  setPayment("dinheiro");
                  setSheetError("");
                }}>
                {value === "receita" ? "Receita" : "Gasto"}
              </button>
            ))}
          </div>}
          <div className="sheet-tabs" role="tablist" aria-label="Como anotar">
            {["Texto com IA", "Valor"].map((m) => (
              <button
                role="tab"
                aria-selected={mode === m}
                key={m}
                disabled={busy}
                onClick={() => {
                  setMode(m);
                  setDrafts([]);
                  setPlan("uma");
                  setSheetError("");
                }}
              >
                {m}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (mode === "Texto com IA" && !drafts.length) void parseText();
              else void save();
            }}
          >
            {mode === "Texto com IA" ? (
              <>
                {!drafts.length ? (
                  <>
                    <label htmlFor="ai-text">O que aconteceu?</label>
                    <textarea
                      id="ai-text"
                      maxLength={500}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Gastei 45 no mercado e recebi 300 de uma venda"
                      required
                      disabled={busy}
                    />
                    <p className="muted">Pode escrever do seu jeito.</p>
                  </>
                ) : (
                  <>
                    <p className="muted">Confira antes de anotar.</p>
                    {drafts.map((d, i) => (
                      <article className="draft" key={i}>
                        <div>
                          <strong>{d.label}</strong>
                          <span>{money(d.amount)}</span>
                        </div>
                        <small>
                          {d.kind === "receita" ? "Receita · " : "Gasto · "}
                          {d.dayOffset === 0
                            ? "Hoje"
                            : d.dayOffset === -1
                              ? "Ontem"
                              : `${Math.abs(d.dayOffset)} dias atrás`}
                          {d.kind === "despesa" && ` · ${cards.find((c) => c.id === d.cardId)?.nome ?? "Pix ou dinheiro"}`}
                        </small>
                        <CategorySelect
                          value={d.category}
                          disabled={busy || parentRule(d.label)}
                          onChange={(cat) =>
                            setDrafts((old) =>
                              old.map((x, j) =>
                                j === i
                                  ? { ...x, category: cat, subcategory: null, edited: true }
                                  : x,
                              ),
                            )
                          }
                        />
                        <select aria-label={`Tipo do lançamento: ${d.label}`} value={d.kind} disabled={busy}
                          onChange={(e) => {
                            const nextKind = e.target.value as "despesa" | "receita";
                            setDrafts((old) => old.map((x, j) => j === i ? { ...x, kind: nextKind } : x));
                            if (nextKind === "receita") setPlan("uma");
                          }}>
                          <option value="despesa">Gasto</option>
                          <option value="receita">Receita</option>
                        </select>
                        {d.kind === "despesa" && (
                          <SubcategorySelect
                            category={d.category}
                            value={d.subcategory}
                            disabled={busy || parentRule(d.label)}
                            onChange={(subcategory) =>
                              setDrafts((old) => old.map((x, j) =>
                                j === i ? { ...x, subcategory } : x,
                              ))
                            }
                          />
                        )}
                      </article>
                    ))}
                    <button
                      type="button"
                      className="text-button"
                      disabled={busy}
                      onClick={() => { setDrafts([]); setPlan("uma"); }}
                    >
                      Editar texto
                    </button>
                  </>
                )}
              </>
            ) : (
              <>
                <label htmlFor="amount">{kind === "receita" ? "Quanto entrou? (R$)" : "Quanto foi? (R$)"}</label>
                <input
                  id="amount"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  disabled={busy}
                />
                <label htmlFor="label">{kind === "receita" ? "De onde veio?" : "Com o quê?"}</label>
                <input
                  id="label"
                  maxLength={120}
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder={kind === "receita" ? "Salário, venda, reembolso…" : "Mercado, café, cinema…"}
                  required
                  disabled={busy}
                />
              </>
            )}
            {canChoosePlan && (
              <>
                <div className="sheet-tabs" role="group" aria-label="Frequência">
                  {(mode === "Valor"
                    ? [["uma", "Uma vez"], ["parcelado", "Parcelado"], ["recorrente", "Todo mês"]]
                    : [["uma", "Uma vez"], ["parcelado", "Parcelado"]]
                  ).map(([v, t]) => (
                    <button type="button" key={v} aria-pressed={plan === v} disabled={busy}
                      onClick={() => { setPlan(v as "uma" | "parcelado" | "recorrente"); setSheetError(""); }}>
                      {t}
                    </button>
                  ))}
                </div>
                {plan === "parcelado" && (
                  <>
                    <label htmlFor="installments">
                      Em quantas parcelas? {mode === "Valor"
                        ? "(informe o valor total acima)"
                        : `(total ${money(planAmount)})`}
                    </label>
                    <input id="installments" inputMode="numeric" value={installments}
                      onChange={(e) => setInstallments(e.target.value)} disabled={busy} />
                    {installmentPreview.length > 1 ? (
                      <p className="muted">
                        {installmentPreview.length}x de {money(installmentPreview[0])}
                        {installmentPreview[installmentPreview.length - 1] !== installmentPreview[0] ? ` (última ${money(installmentPreview[installmentPreview.length - 1])})` : ""}
                        {" · total "}{money(planAmount)}
                      </p>
                    ) : null}
                  </>
                )}
                {mode === "Valor" && plan === "recorrente" && (
                  <>
                    <label htmlFor="rec-day">Dia do mês (1 a 31)</label>
                    <input id="rec-day" inputMode="numeric" value={recDay}
                      onChange={(e) => setRecDay(e.target.value)} disabled={busy} />
                    <label htmlFor="rec-months">Por quantos meses? (2 a 36)</label>
                    <input id="rec-months" inputMode="numeric" value={recMonths}
                      onChange={(e) => setRecMonths(e.target.value)} disabled={busy} />
                    <p className="muted">
                      {kind === "receita" ? "Entra" : "Sai"} {money(parseMoney(amount) || 0)} todo mês, a partir deste mês.
                    </p>
                  </>
                )}
              </>
            )}
            {mode === "Valor" && kind === "despesa" && !(canChoosePlan && plan === "recorrente") && <details className="payment" open>
              <summary>
                Pago com{" "}
                <span>
                  {cards.find((c) => c.id === payment)?.nome ??
                    "Pix ou dinheiro"}
                </span>
              </summary>
              <label htmlFor="payment">Forma de pagamento</label>
              <select
                id="payment"
                value={payment}
                onChange={(e) => setPayment(e.target.value)}
                disabled={busy}
              >
                <option value="dinheiro">Pix ou dinheiro</option>
                {ranked.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
              {payment !== "dinheiro" && <p className="muted">Entra no mês de vencimento da fatura.</p>}
            </details>}
            {sheetError && (
              <p className="alert" role="alert">
                {sheetError}
              </p>
            )}
            <button className="primary" disabled={busy}>
              {busy
                ? "Um instante…"
                : mode === "Texto com IA" && !drafts.length
                  ? "Entender texto"
                  : canChoosePlan && plan === "parcelado"
                  ? "Salvar parcelas"
                  : canChoosePlan && mode === "Valor" && plan === "recorrente"
                    ? "Salvar todo mês"
                    : mode === "Texto com IA" && drafts.some((d) => d.kind === "receita") && drafts.some((d) => d.kind === "despesa")
                      ? "Salvar lançamentos"
                      : "Salvar " + ((mode === "Valor" ? kind : drafts[0]?.kind) === "receita" ? "receita" : "gasto") + (drafts.length > 1 ? "s" : "")}
            </button>
          </form>
        </div>
      </dialog>
    </main>
  );
}
function Login() {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <main className="app login">
      <Logo />
      <div className="login-intro">
        <p className="eyebrow">Um gasto de cada vez</p>
        <h1>
          Menos ruído.
          <br />
          Mais direção.
        </h1>
        <p>Seu dinheiro, com espaço para respirar.</p>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const { error } = await sb!.auth.signInWithPassword({
              email: email.trim(),
              password,
            });
            if (error) throw error;
          } catch {
            setError("Não consegui entrar. Confira seu e-mail e sua senha.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label htmlFor="email">E-mail</label>
        <input
          type="email"
          id="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <label htmlFor="password">Senha</label>
        <input
          type="password"
          id="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && (
          <p className="alert" role="alert">
            {error}
          </p>
        )}
        <button className="primary" disabled={busy}>
          {busy ? "Entrando…" : "Entrar"}
        </button>
        <p className="muted login-note">Use o mesmo acesso do FeFin.</p>
      </form>
    </main>
  );
}
