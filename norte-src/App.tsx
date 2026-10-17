import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase as sb, configured } from "./supabase";
import {
  CATEGORIES,
  knownMacro,
  isCategory,
  categoryOf,
  categoryPatch,
  memory,
  parentRule,
  dateKey,
  monthKey,
  parseMoney,
  effectiveDate,
  countsAsSpending,
  monthSpending,
  cardDates,
} from "./domain";
import type { Entry, Card, Category } from "./domain";
const money = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    n,
  );
const shortDate = (d: Date) =>
  d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
const message = (e: unknown) =>
  e instanceof Error
    ? e.message
    : "Não foi possível concluir. Tente novamente.";
type Draft = {
  amount: number;
  label: string;
  category: Category | null;
  dayOffset: number;
  edited?: boolean;
};
const fields =
  "id,user_id,descricao,valor,tipo,categoria,categoria_macro,subcategoria,subcategoria_pais,data,mes_referencia,forma_pagamento,cartao_id,pago,pago_por,is_parcelado,parcela_atual,parcela_total,parcelamento_id,created_at";
async function historyFor(uid: string) {
  const all: Entry[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await sb!
      .from("lancamentos")
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
  if (error)
    throw new Error("A IA está indisponível. Você pode anotar pelo valor.");
  if (data?.error)
    throw new Error("A IA está indisponível. Você pode anotar pelo valor.");
  return data;
}
function Logo() {
  return (
    <span className="brand">
      <img src="/compass.svg" alt="" />
      norte<span className="brand-dot">.</span>
    </span>
  );
}
function CategorySelect({
  value,
  onChange,
  disabled = false,
}: {
  value: Category | null;
  onChange: (v: Category) => void;
  disabled?: boolean;
}) {
  return (
    <select
      aria-label="Categoria do gasto"
      value={value ?? ""}
      disabled={disabled}
      onChange={(e) => {
        if (isCategory(e.target.value)) onChange(e.target.value);
      }}
    >
      <option value="" disabled>
        Escolher categoria
      </option>
      {CATEGORIES.map((c) => (
        <option key={c}>{c}</option>
      ))}
    </select>
  );
}
export default function App() {
  const [session, setSession] = useState<Session | null>(null),
    [authReady, setAuthReady] = useState(false);
  const [rows, setRows] = useState<Entry[]>([]),
    [cards, setCards] = useState<Card[]>([]),
    [budget, setBudget] = useState<number | null>(null),
    [loading, setLoading] = useState(true),
    [loadFailed, setLoadFailed] = useState(false);
  const [tab, setTab] = useState("Hoje"),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [pending, setPending] = useState<Set<string>>(new Set()),
    [changing, setChanging] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(new Date()),
    [review, setReview] = useState(""),
    [budgetInput, setBudgetInput] = useState(""),
    [budgetBusy, setBudgetBusy] = useState(false),
    [undo, setUndo] = useState<string[]>([]),
    [undoBusy, setUndoBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null),
    opener = useRef<HTMLButtonElement>(null),
    cancelled = useRef(new Set<string>());
  const [mode, setMode] = useState("Texto com IA"),
    [text, setText] = useState(""),
    [amount, setAmount] = useState(""),
    [label, setLabel] = useState(""),
    [drafts, setDrafts] = useState<Draft[]>([]),
    [payment, setPayment] = useState("dinheiro"),
    [busy, setBusy] = useState(false),
    [sheetError, setSheetError] = useState("");
  const uid = session?.user.id;
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
      const [entries, c, p] = await Promise.all([
        historyFor(uid),
        sb!
          .from("cartoes")
          .select("id,nome,dia_fechamento,dia_vencimento,ativo")
          .eq("user_id", uid)
          .eq("ativo", true),
        sb!
          .from("profiles")
          .select("meta_mensal")
          .eq("user_id", uid)
          .maybeSingle(),
      ]);
      if (c.error) throw c.error;
      if (p.error) throw p.error;
      setRows(entries);
      setCards(c.data ?? []);
      setBudget(
        p.data?.meta_mensal == null ? null : Number(p.data.meta_mensal),
      );
      setBudgetInput(
        p.data?.meta_mensal == null ? "" : String(p.data.meta_mensal),
      );
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
    setBudget(null);
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
  const weekStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - ((now.getDay() + 6) % 7),
      12,
    ),
    weekKey = dateKey(weekStart);
  useEffect(() => {
    if (uid) {
      try {
        setReview(localStorage.getItem(`norte-review-${uid}`) ?? "");
      } catch {
        setReview("");
      }
    }
  }, [uid]);
  const ranked = cards
    .map((c) => ({ ...c, ...cardDates(c, now) }))
    .sort((a, b) => b.days - a.days || a.nome.localeCompare(b.nome));
  const spent = monthSpending(rows, now),
    left = (budget ?? 0) - spent,
    daysLeft =
      new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() -
      now.getDate() +
      1;
  const weekAgo = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 6,
    12,
  );
  const weekly = rows.filter(
    (r) =>
      countsAsSpending(r) &&
      dateKey(effectiveDate(r)) >= dateKey(weekAgo) &&
      dateKey(effectiveDate(r)) <= dateKey(now),
  );
  const byCategory = new Map<string, number>();
  weekly.forEach((r) => {
    const c = categoryOf(r);
    if (c) byCategory.set(c, (byCategory.get(c) ?? 0) + Number(r.valor));
  });
  const top =
    [...byCategory].sort((a, b) => b[1] - a[1])[0]?.[0] ??
    "Ainda sem gastos classificados";
  const todayRows = rows.filter(
    (r) =>
      r.tipo === "despesa" &&
      (r.created_at
        ? dateKey(new Date(r.created_at)) === dateKey(now)
        : r.data === dateKey(now)) &&
      (!r.is_parcelado || (r.parcela_atual ?? 1) === 1),
  );
  async function changeCategory(row: Entry, cat: Category) {
    if (!uid) return;
    if (parentRule(row.descricao) && cat !== "Pais") {
      setNotice("Esse gasto é dos Pais pela descrição.");
      return;
    }
    setError("");
    const related = rows.filter(
      (r) =>
        r.id === row.id ||
        (row.parcelamento_id && r.parcelamento_id === row.parcelamento_id),
    );
    const ids = related.map((r) => r.id);
    setChanging((s) => new Set([...s, ...ids]));
    try {
      const patch = categoryPatch(cat, row);
      const { data, error } = await sb!
        .from("lancamentos")
        .update(patch)
        .eq("user_id", uid)
        .in("id", ids)
        .select("id");
      if (error) throw error;
      if (data.length !== ids.length)
        throw new Error("Alteração não confirmada.");
      setRows((old) =>
        old.map((r) => (ids.includes(r.id) ? { ...r, ...patch } : r)),
      );
    } catch {
      setError("Não consegui mudar a categoria. Tente novamente.");
    } finally {
      setChanging((s) => new Set([...s].filter((id) => !ids.includes(id))));
    }
  }
  function openSheet() {
    setSheetError("");
    setDrafts([]);
    setMode("Texto com IA");
    setText("");
    setAmount("");
    setLabel("");
    setPayment("dinheiro");
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
      const examples = rows
        .filter((r) => categoryOf(r))
        .slice(0, 60)
        .map((r) => `${r.descricao} → ${categoryOf(r)}`);
      const data = await askAI({
        task: "parse",
        text,
        today: dateKey(now),
        examples,
      });
      const items: Draft[] = (Array.isArray(data.items) ? data.items : [])
        .slice(0, 10)
        .map((v: Record<string, unknown>) => ({
          amount: Number(v.amount),
          label: String(v.label ?? "")
            .trim()
            .slice(0, 120),
          category:
            memory(String(v.label ?? ""), rows) ??
            (isCategory(v.category) ? v.category : null),
          dayOffset: Number.isInteger(v.dayOffset)
            ? Math.max(-30, Math.min(0, Number(v.dayOffset)))
            : 0,
        }))
        .filter(
          (v: Draft) => Number.isFinite(v.amount) && v.amount > 0 && v.label,
        );
      if (!items.length)
        throw new Error("Não identifiquei um gasto. Inclua valor e descrição.");
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
      const unknown = inserted.filter(
        (r) => !categoryOf(r) && !memory(r.descricao, before),
      );
      let guesses: unknown[] = [];
      if (unknown.length) {
        try {
          const data = await askAI({
            task: "classify",
            items: unknown.map((r) => ({
              label: r.descricao,
              amount: r.valor,
            })),
            examples: before
              .filter((r) => categoryOf(r))
              .slice(0, 60)
              .map((r) => `${r.descricao} → ${categoryOf(r)}`),
          });
          guesses = Array.isArray(data.categories) ? data.categories : [];
        } catch {
          /* The row remains saved and can be classified manually. */
        }
      }
      for (const r of inserted) {
        if (cancelled.current.has(r.id)) continue;
        const guess = guesses[unknown.findIndex((x) => x.id === r.id)];
        const cat =
          categoryOf(r) ??
          memory(r.descricao, before) ??
          (isCategory(guess) ? guess : null);
        if (!cat) continue;
        const patch = categoryPatch(cat, r);
        const { error } = await sb!
          .from("lancamentos")
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
      setNotice("Gasto salvo. Confira a categoria na lista.");
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
                category: null,
                dayOffset: 0,
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
      const payload = items.map((d) => {
        const day = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + d.dayOffset,
          12,
        );
        const card = cards.find((c) => c.id === payment);
        const cat = parentRule(d.label)
          ? "Pais"
          : d.edited
            ? d.category
            : (memory(d.label, before) ?? d.category);
        return {
          user_id: uid,
          descricao: d.label,
          valor: Math.round(d.amount * 100) / 100,
          tipo: "despesa",
          categoria: "despesa",
          categoria_macro: cat === "Pais" ? knownMacro(d.label, before) : cat,
          subcategoria: null,
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
        .from("lancamentos")
        .insert(payload)
        .select(fields);
      if (error) throw error;
      const inserted = data as Entry[];
      setRows((old) => [...inserted, ...old]);
      setUndo(inserted.map((r) => r.id));
      setNotice(inserted.length > 1 ? "Gastos anotados." : "Gasto anotado.");
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
        .from("lancamentos")
        .delete()
        .eq("user_id", uid)
        .in("id", ids)
        .select("id");
      if (error || data?.length !== ids.length)
        throw error ?? new Error("Exclusão não confirmada");
      setRows((old) => old.filter((r) => !ids.includes(r.id)));
      setUndo([]);
      setNotice("Anotação desfeita.");
    } catch {
      ids.forEach((id) => cancelled.current.delete(id));
      setError("Não consegui desfazer. Tente novamente.");
    } finally {
      setUndoBusy(false);
    }
  }
  async function saveBudget() {
    if (!uid) return;
    const value = parseMoney(budgetInput);
    if (!budgetInput.trim() || !Number.isFinite(value) || value < 0) {
      setError("Use um valor válido para o mês.");
      return;
    }
    setBudgetBusy(true);
    try {
      const { data, error } = await sb!
        .from("profiles")
        .update({ meta_mensal: Math.round(value * 100) / 100 })
        .eq("user_id", uid)
        .select("user_id");
      if (error || data?.length !== 1)
        throw error ?? new Error("Perfil não encontrado");
      setBudget(value);
      setError("");
      setNotice("Valor do mês atualizado.");
    } catch {
      setError("Não consegui atualizar o valor. Tente novamente.");
    } finally {
      setBudgetBusy(false);
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
        <span className="date">
          {now.toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}
        </span>
      </header>
      <nav aria-label="Navegação principal">
        {["Hoje", "Semana", "Tudo"].map((t) => (
          <button
            key={t}
            aria-current={t === tab ? "page" : undefined}
            onClick={() => {
              setTab(t);
              setError("");
              setNotice("");
            }}
          >
            {t}
          </button>
        ))}
      </nav>
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
          {tab === "Hoje" && (
            <>
              <section className="balance">
                <p className="eyebrow">Seu espaço neste mês</p>
                <h1>
                  Ainda dá para gastar
                  <br />
                  neste mês
                </h1>
                {budget === null ? (
                  <>
                    <p className="setup">
                      Defina seu gasto livre para começar.
                    </p>
                    <button onClick={() => setTab("Tudo")}>
                      Definir valor do mês
                    </button>
                  </>
                ) : (
                  <>
                    <div className="big-number">{money(Math.max(0, left))}</div>
                    <progress
                      aria-label="Parcela do gasto livre já utilizada"
                      max="100"
                      value={
                        budget > 0
                          ? Math.min(100, (spent / budget) * 100)
                          : spent > 0
                            ? 100
                            : 0
                      }
                    />
                    <p className="pace">
                      {left < 0
                        ? "O valor planejado foi usado. Um ajuste de cada vez."
                        : spent <=
                            (budget * now.getDate()) /
                              new Date(
                                now.getFullYear(),
                                now.getMonth() + 1,
                                0,
                              ).getDate()
                          ? "Seu ritmo está dentro do planejado."
                          : "Dá para seguir com um pouco mais de calma."}
                    </p>
                  </>
                )}
                <button
                  className="primary add"
                  ref={opener}
                  onClick={openSheet}
                >
                  <span aria-hidden="true">＋</span> Anotar gasto
                </button>
              </section>
              {ranked[0] ? (
                <section className="best">
                  <div className="compass-mini" aria-hidden="true">
                    ↗
                  </div>
                  <div>
                    <p className="eyebrow">Melhor cartão hoje</p>
                    <h2>{ranked[0].nome}</h2>
                    <p>Compra hoje, paga em {shortDate(ranked[0].due)}.</p>
                  </div>
                </section>
              ) : (
                <p className="muted">Seus cartões ativos aparecerão aqui.</p>
              )}
              <section className="entries">
                <div className="section-title">
                  <h2>Anotado hoje</h2>
                  <span>{todayRows.length}</span>
                </div>
                {!todayRows.length ? (
                  <div className="empty">
                    <span aria-hidden="true">✓</span>
                    <p>Tudo tranquilo por aqui.</p>
                    <small>O que você anotar hoje aparece aqui.</small>
                  </div>
                ) : (
                  todayRows.map((r) => (
                    <article className="entry" key={r.id}>
                      <div className="entry-top">
                        <strong>{r.descricao}</strong>
                        <span>{money(Number(r.valor))}</span>
                      </div>
                      <div className="entry-bottom">
                        <CategorySelect
                          value={categoryOf(r)}
                          disabled={pending.has(r.id) || changing.has(r.id)}
                          onChange={(c) => void changeCategory(r, c)}
                        />
                        {pending.has(r.id) && (
                          <small role="status">classificando…</small>
                        )}
                        {r.subcategoria_pais && <small>Reembolsado</small>}
                      </div>
                    </article>
                  ))
                )}
              </section>
            </>
          )}
          {tab === "Semana" && (
            <section className="week">
              <p className="eyebrow">Uma pausa para se situar</p>
              <h1>
                Sua semana,
                <br />
                sem complicar.
              </h1>
              <div className="week-line">
                <span>Gasto nos últimos 7 dias</span>
                <strong>
                  {money(weekly.reduce((n, r) => n + Number(r.valor), 0))}
                </strong>
              </div>
              <div className="week-line">
                <span>Onde você mais gastou</span>
                <strong>{top}</strong>
              </div>
              <div className="week-line">
                <span>Por semana até o fim do mês</span>
                <strong>
                  {budget === null
                    ? "Defina o valor do mês"
                    : money(Math.max(0, left) / Math.max(1, daysLeft / 7))}
                </strong>
              </div>
              <button
                className="primary"
                disabled={review === weekKey}
                onClick={() => {
                  try {
                    localStorage.setItem(`norte-review-${uid}`, weekKey);
                    setReview(weekKey);
                  } catch {
                    setError("Não consegui guardar a revisão neste aparelho.");
                  }
                }}
              >
                {review === weekKey ? "✓ Semana revisada" : "Já olhei"}
              </button>
              <p className="muted">
                {review === weekKey
                  ? "Pronto. Pode seguir seu dia."
                  : "Só isso. Você já tem uma visão do caminho."}
              </p>
            </section>
          )}
          {tab === "Tudo" && (
            <section className="all">
              <p className="eyebrow">Cada coisa no seu lugar</p>
              <h1>O essencial.</h1>
              <h2>Cartões e faturas</h2>
              {ranked.map((c, i) => {
                const invoices = new Map<string, number>();
                rows
                  .filter(
                    (r) =>
                      r.tipo === "despesa" && r.cartao_id === c.id && !r.pago,
                  )
                  .forEach((r) =>
                    invoices.set(
                      r.mes_referencia,
                      (invoices.get(r.mes_referencia) ?? 0) + Number(r.valor),
                    ),
                  );
                return (
                  <details className="card-details" key={c.id}>
                    <summary>
                      <div>
                        <strong>{c.nome}</strong>
                        <small>
                          {i === 0 ? "Melhor hoje · " : ""}
                          {c.days} dias até pagar
                        </small>
                      </div>
                      <span aria-hidden="true">＋</span>
                    </summary>
                    <p>
                      Fecha dia {c.dia_fechamento} · vence dia{" "}
                      {c.dia_vencimento}
                    </p>
                    {invoices.size ? (
                      [...invoices]
                        .sort((a, b) => a[0].localeCompare(b[0]))
                        .map(([ref, total]) => (
                          <div className="invoice" key={ref}>
                            <span>
                              Fatura {ref.slice(5)}/{ref.slice(0, 4)}
                            </span>
                            <strong>{money(total)}</strong>
                          </div>
                        ))
                    ) : (
                      <p className="muted">Sem faturas em aberto.</p>
                    )}
                  </details>
                );
              })}
              {!cards.length && <p className="muted">Nenhum cartão ativo.</p>}
              <form
                className="budget-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void saveBudget();
                }}
              >
                <h2>Seu gasto livre do mês</h2>
                <p>O valor disponível para seus gastos pessoais.</p>
                <label htmlFor="budget">Valor mensal (R$)</label>
                <div className="input-action">
                  <input
                    id="budget"
                    inputMode="decimal"
                    value={budgetInput}
                    onChange={(e) => setBudgetInput(e.target.value)}
                    placeholder="0,00"
                    required
                  />
                  <button disabled={budgetBusy}>
                    {budgetBusy ? "Salvando…" : "Salvar"}
                  </button>
                </div>
              </form>
              <a
                className="external"
                href="https://fefin.lovable.app"
                target="_blank"
                rel="noreferrer"
              >
                Abrir FeFin <span aria-hidden="true">↗</span>
              </a>
              <button
                className="signout"
                onClick={async () => {
                  const { error } = await sb!.auth.signOut();
                  if (error) setError("Não consegui sair. Tente novamente.");
                }}
              >
                Sair
              </button>
            </section>
          )}
        </>
      )}
      <dialog
        ref={dialog}
        onCancel={(e) => {
          if (busy) e.preventDefault();
        }}
        aria-labelledby="sheet-title"
      >
        <div className="sheet">
          <div className="sheet-top">
            <h2 id="sheet-title">Anotar gasto</h2>
            <button
              className="icon-button"
              aria-label="Fechar"
              disabled={busy}
              onClick={closeSheet}
            >
              ×
            </button>
          </div>
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
                    <label htmlFor="ai-text">O que você gastou?</label>
                    <textarea
                      id="ai-text"
                      maxLength={500}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="45 no mercado e cinema ontem 30"
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
                          {d.dayOffset === 0
                            ? "Hoje"
                            : d.dayOffset === -1
                              ? "Ontem"
                              : `${Math.abs(d.dayOffset)} dias atrás`}
                        </small>
                        <CategorySelect
                          value={d.category}
                          disabled={busy || parentRule(d.label)}
                          onChange={(cat) =>
                            setDrafts((old) =>
                              old.map((x, j) =>
                                j === i
                                  ? { ...x, category: cat, edited: true }
                                  : x,
                              ),
                            )
                          }
                        />
                      </article>
                    ))}
                    <button
                      type="button"
                      className="text-button"
                      disabled={busy}
                      onClick={() => setDrafts([])}
                    >
                      Editar texto
                    </button>
                  </>
                )}
              </>
            ) : (
              <>
                <label htmlFor="amount">Quanto foi? (R$)</label>
                <input
                  id="amount"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  disabled={busy}
                />
                <label htmlFor="label">Com o quê?</label>
                <input
                  id="label"
                  maxLength={120}
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Mercado, café, cinema…"
                  required
                  disabled={busy}
                />
              </>
            )}
            <details className="payment">
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
            </details>
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
                  : "Salvar gasto" + (drafts.length > 1 ? "s" : "")}
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
