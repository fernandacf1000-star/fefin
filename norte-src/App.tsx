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
  cardDates,
  monthPeriod,
} from "./domain";
import type { Entry, Card, Category } from "./domain";
import CategorySelect from "./CategorySelect";
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
      <img src="/norte-compass-v3.svg" alt="" />
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
    [pending, setPending] = useState<Set<string>>(new Set()),
    [changing, setChanging] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(new Date()),
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
  const [selectedMonth, setSelectedMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12),
  );
  const period = monthPeriod(selectedMonth, now);
  const selectedDate = period === "current" ? now : selectedMonth;
  const [categoryFilter, setCategoryFilter] = useState<Category | null>(null);
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
      const [entries, c] = await Promise.all([
        historyFor(uid),
        sb!
          .from("cartoes")
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
  async function deleteEntry(row: Entry) {
    if (!uid) throw new Error("Sessão encerrada");
    cancelled.current.add(row.id);
    const { data, error } = await sb!
      .from("lancamentos")
      .delete()
      .eq("user_id", uid)
      .eq("id", row.id)
      .select("id");
    if (error || data?.length !== 1) {
      cancelled.current.delete(row.id);
      throw error ?? new Error("Exclusão não confirmada");
    }
    setRows((old) => old.filter((r) => r.id !== row.id));
    setUndo((old) => old.filter((id) => id !== row.id));
    setNotice("Lançamento apagado.");
  }
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
        {["Mês", "Gráfico", "Lançamentos"].map((t) => (
          <button
            key={t}
            aria-current={t === tab ? "page" : undefined}
            onClick={() => {
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
            <MonthView rows={rows} selected={selectedDate} now={now} />
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
              changing={changing}
              onCategory={changeCategory}
              onDelete={deleteEntry}
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
