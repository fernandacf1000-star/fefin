import { useEffect, useRef, useState } from "react";
import {
  groupScope,
  categoryOf,
  filterEntries,
  entryDate,
  dateKey,
  isSubcategoryOf,
  monthEntries,
  monthSummary,
  parseDate,
  sumMoney,
  isInstallmentCount,
  splitInstallments,
} from "./domain";
import type { Entry, Card, Category, EntryFilter } from "./domain";
import CategorySelect from "./CategorySelect";
import SubcategorySelect from "./SubcategorySelect";
import SwipeRow from "./SwipeRow";
import { parseMoney } from "./domain";
import { formatMoneyInput } from "./money-input";
const money = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    n,
  );
const displayAsIncome = (row: Entry) => row.tipo === "receita" || row.categoria === "salario" || row.categoria === "reembolso_pais";
const displayDate = (row: Entry) => {
  if (row.forma_pagamento !== "credito" && !row.cartao_id) return dateKey(entryDate(row));
  if (!row.created_at) return row.data;
  const date = new Date(row.created_at);
  if (Number.isNaN(date.getTime())) return row.data;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
};
function CategoryIcon({ category, parent, income }: { category: string | null; parent: boolean; income: boolean }) {
  const icons: Record<string, string> = {
    Moradia: "🏘️", Alimentação: "🥗", Transporte: "🚗", Saúde: "💊",
    Pessoal: "💅", Lazer: "🎮", Aportes: "📈",
  };
  const icon = parent ? "🧓" : income ? "🤑" : icons[category ?? ""] ?? "🧾";
  return <span className="ledger-category-icon" aria-hidden="true">{icon}</span>;
}
export default function Ledger({
  rows,
  cards,
  selected,
  pending,
  onDelete,
  onEdit,
  categoryFilter,
  onClearCategory,
}: {
  rows: Entry[];
  cards: Card[];
  selected: Date;
  pending: Set<string>;
  onDelete: (r: Entry, scope: "one" | "next" | "all") => Promise<void>;
  onEdit: (
    r: Entry,
    edits: { descricao: string; valor: number; data?: string; installments?: number; recurrence?: { day: number; months: number }; category: Category | null; subcategory: string | null },
    scope: "one" | "next" | "all",
  ) => Promise<void>;
  categoryFilter: Category | null;
  onClearCategory: () => void;
}) {
  const [filter, setFilter] = useState<EntryFilter>("Todos"),
    [limit, setLimit] = useState(80),
    [detailId, setDetailId] = useState<string | null>(null),
    [confirm, setConfirm] = useState(false),
    [deleting, setDeleting] = useState(false),
    [scope, setScope] = useState<"one" | "next" | "all">("one"),
    [error, setError] = useState("");
  const [editId, setEditId] = useState<string | null>(null),
    [eDesc, setEDesc] = useState(""),
    [eValue, setEValue] = useState(""),
    [eDate, setEDate] = useState(""),
    [ePlan, setEPlan] = useState<"uma" | "parcelado" | "recorrente">("uma"),
    [eInstallments, setEInstallments] = useState("2"),
    [eRecDay, setERecDay] = useState("1"),
    [eRecMonths, setERecMonths] = useState("12"),
    [eCategory, setECategory] = useState<Category | null>(null),
    [eSubcategory, setESubcategory] = useState<string | null>(null),
    [eScope, setEScope] = useState<"one" | "next" | "all">("one"),
    [eBusy, setEBusy] = useState(false),
    [eError, setEError] = useState("");
  const editSheet = useRef<HTMLDialogElement>(null);
  const sheet = useRef<HTMLDialogElement>(null),
    lastOpener = useRef<HTMLButtonElement | null>(null);
  const detail = rows.find((r) => r.id === detailId);
  const month = monthEntries(rows, selected),
    filtered = filterEntries(month, filter).filter(
      (r) => !categoryFilter || categoryOf(r) === categoryFilter,
    ),
    recent = [...filtered].sort((a, b) =>
      displayDate(b).localeCompare(displayDate(a)) ||
      (b.created_at ?? "").localeCompare(a.created_at ?? "") ||
      b.id.localeCompare(a.id),
    ),
    groups = recent.slice(0, limit).reduce<{ date: string; entries: Entry[] }[]>((acc, row) => {
      const date = displayDate(row);
      const last = acc[acc.length - 1];
      if (last?.date === date) last.entries.push(row);
      else acc.push({ date, entries: [row] });
      return acc;
    }, []),
    totals = monthSummary(month, selected);
  const monthName = selected.toLocaleDateString("pt-BR", { month: "long" });
  useEffect(() => {
    setLimit(80);
  }, [selected, filter, categoryFilter]);
  useEffect(() => {
    if (categoryFilter) setFilter("Gastos");
  }, [categoryFilter]);
  function cardName(row: Entry) {
    return row.cartao_id
      ? (cards.find((c) => c.id === row.cartao_id)?.nome ?? "Cartão")
      : "Pix/dinheiro";
  }
  function open(row: Entry, button: HTMLButtonElement | null, askDelete = false) {
    lastOpener.current = button;
    setDetailId(row.id);
    setScope("one");
    setConfirm(askDelete);
    setError("");
    sheet.current?.showModal();
  }
  function openEdit(row: Entry) {
    setEditId(row.id);
    setEDesc(row.descricao);
    setEValue(formatMoneyInput(Number(row.valor).toFixed(2)));
    setEDate(row.data);
    setEPlan(row.recorrencia_id ? "recorrente" : "uma");
    setERecDay(String(parseDate(row.data).getDate()));
    setERecMonths("12");
    setEInstallments("2");
    setECategory(categoryOf(row));
    setESubcategory(row.subcategoria);
    setEScope("one");
    setEError("");
    editSheet.current?.showModal();
  }
  const editing = rows.find((r) => r.id === editId);
  const editingIncome = !!editing && displayAsIncome(editing);
  const grouped = !!(editing?.parcelamento_id || editing?.recorrencia_id);
  const canSplit = !!editing && !grouped && !editing.is_parcelado && !displayAsIncome(editing);
  const canRecur = !!editing && !grouped && !editing.is_parcelado && displayAsIncome(editing);
  const makingRecurring = canRecur && ePlan === "recorrente";
  const converting = canSplit && ePlan === "parcelado";
  const preview = converting && isInstallmentCount(Number(eInstallments))
    ? splitInstallments(parseMoney(eValue), Number(eInstallments)) : [];
  const totalInstallments = !!(editing?.is_parcelado && editing.parcelamento_id && eScope !== "one");
  function chooseEditScope(next: "one" | "next" | "all") {
    if (!editing) return;
    setEScope(next);
    const targets = groupScope(rows, editing, next);
    const value = editing.is_parcelado && editing.parcelamento_id && next !== "one"
      ? sumMoney(targets.map((r) => Number(r.valor)))
      : Number(editing.valor);
    setEValue(formatMoneyInput(value.toFixed(2)));
  }
  async function saveEdit() {
    if (!editing) return;
    const valor = parseMoney(eValue);
    if (!eDesc.trim() || !Number.isFinite(valor) || valor <= 0) {
      setEError("Preencha uma descrição e um valor maior que zero.");
      return;
    }
    if (converting && (!isInstallmentCount(Number(eInstallments)) || !preview.length || preview.some((value) => value <= 0))) {
      setEError("Informe de 2 a 360 parcelas, com valor de pelo menos R$ 0,01 cada.");
      return;
    }
    if (makingRecurring && (!Number.isInteger(Number(eRecDay)) || Number(eRecDay) < 1 || Number(eRecDay) > 31 || !Number.isInteger(Number(eRecMonths)) || Number(eRecMonths) < 2 || Number(eRecMonths) > 36)) {
      setEError("Preencha dia (1 a 31) e meses (2 a 36).");
      return;
    }
    const withDate = !grouped && /^\d{4}-\d{2}-\d{2}$/.test(eDate);
    setEBusy(true);
    setEError("");
    try {
      await onEdit(
        editing,
        { descricao: eDesc.trim(), valor, category: eCategory, subcategory: eSubcategory, ...(withDate ? { data: eDate } : {}), ...(converting ? { installments: Number(eInstallments) } : {}), ...(makingRecurring ? { recurrence: { day: Number(eRecDay), months: Number(eRecMonths) } } : {}) },
        eScope,
      );
      editSheet.current?.close();
      setEditId(null);
    } catch (error) {
      setEError(error instanceof Error ? error.message : "Não consegui salvar a edição. Tente novamente.");
    } finally {
      setEBusy(false);
    }
  }
  function close() {
    if (deleting) return;
    sheet.current?.close();
    setDetailId(null);
    lastOpener.current?.focus();
  }
  async function remove() {
    if (!detail) return;
    setDeleting(true);
    setError("");
    try {
      await onDelete(detail, scope);
      sheet.current?.close();
      setDetailId(null);
      lastOpener.current?.focus();
    } catch {
      setError("Não consegui apagar. Tente novamente.");
    } finally {
      setDeleting(false);
    }
  }
  return (
    <section className="ledger">
      <h1>Lançamentos</h1>
      <p className="ledger-total">
        Gastou <strong>{money(totals.spent)}</strong>
      </p>
      <div
        className="filter-chips"
        role="group"
        aria-label="Filtrar lançamentos"
      >
        {(["Todos", "Gastos", "Receitas", "Pais"] as EntryFilter[]).map((f) => (
          <button
            key={f}
            aria-pressed={f === filter}
            onClick={() => {
              setFilter(f);
              if (f !== "Gastos") onClearCategory();
            }}
          >
            {f}
          </button>
        ))}
      </div>
      {categoryFilter && (
        <button
          className="category-filter"
          onClick={onClearCategory}
          aria-label={`Remover filtro ${categoryFilter}`}
        >
          {categoryFilter} <span aria-hidden="true">×</span>
        </button>
      )}
      {!month.length ? (
        <p className="empty">Nada lançado em {monthName}.</p>
      ) : !filtered.length ? (
        <p className="empty">Nenhum lançamento neste filtro.</p>
      ) : (
        groups.map((group, index) => (
          <section className="day-group" key={`${group.date}-${index}`}>
            <h2>
              {parseDate(group.date)
                .toLocaleDateString("pt-BR", {
                  weekday: "short",
                  day: "numeric",
                  month: "long",
                })
                .replaceAll(".", "")}
            </h2>
            {group.entries.map((row) => (
              <SwipeRow
                key={row.id}
                label={row.descricao}
                onEdit={() => openEdit(row)}
                onDelete={() => open(row, null, true)}
              >
              <article className={`entry ledger-entry${row.subcategoria_pais ? " ledger-entry-pais" : ""}`}>
                <button
                  className="ledger-open"
                  aria-label={`Ver detalhes de ${row.descricao}`}
                  onClick={(e) => open(row, e.currentTarget)}
                >
                  <span className={`ledger-icon${row.subcategoria_pais ? " ledger-icon-pais" : ""}`}>
                    <CategoryIcon category={categoryOf(row) ?? row.categoria_macro} parent={!!row.subcategoria_pais} income={displayAsIncome(row)} />
                  </span>
                  <span className="ledger-copy">
                    <span className="ledger-title">
                      <strong>{row.descricao}</strong>
                      {row.subcategoria_pais && <span className="ledger-pais-label">PAIS</span>}
                    </span>
                    <span className="entry-meta">
                      <span>{parseDate(group.date).toLocaleDateString("pt-BR")}</span>
                      {row.is_parcelado && (
                        <span className="entry-pill">
                          {row.parcela_atual ?? 1}/{row.parcela_total ?? 1}x
                        </span>
                      )}
                      {row.is_parcelado && row.parcela_atual === row.parcela_total && (
                        <span className="entry-pill entry-pill-last"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 14V2m1 1h9l-2 3 2 3H4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg> última</span>
                      )}
                      {row.recorrencia_id && !row.is_parcelado && <span className="entry-pill">recorrente</span>}
                    </span>
                    <span className="ledger-category-line">
                      {row.subcategoria ?? categoryOf(row) ?? "Escolher categoria"} · {cardName(row)}
                    </span>
                  </span>
                  <span className={displayAsIncome(row) ? "ledger-amount income-value" : row.subcategoria_pais ? "ledger-amount parent-value" : "ledger-amount"}>
                    {displayAsIncome(row) ? "+" : "-"}{money(Math.abs(Number(row.valor)))}
                  </span>
                </button>
                {pending.has(row.id) && <small className="entry-tag" role="status">classificando…</small>}
                {row.subcategoria_pais ? (
                  <small className="entry-tag">Pais</small>
                ) : row.categoria_macro === "Aportes" ? (
                  <small className="entry-tag">Aporte · fora da conta</small>
                ) : row.categoria === "reembolso_pais" ? (
                  <small className="entry-tag">
                    Reembolso dos Pais
                  </small>
                ) : null}
              </article>
              </SwipeRow>
            ))}
          </section>
        ))
      )}
      {recent.length > limit && (
        <button className="see-more" onClick={() => setLimit((n) => n + 80)}>
          Ver mais
        </button>
      )}
      <dialog
        className="detail-dialog"
        ref={editSheet}
        aria-labelledby="edit-title"
        onCancel={(e) => {
          if (eBusy) e.preventDefault();
          else setEditId(null);
        }}
      >
        <div className="sheet">
          <div className="sheet-top">
            <h2 id="edit-title">{editingIncome ? "Editar receita" : "Editar lançamento"}</h2>
            <button
              className="icon-button"
              aria-label="Fechar edição"
              disabled={eBusy}
              onClick={() => {
                editSheet.current?.close();
                setEditId(null);
              }}
            >
              ×
            </button>
          </div>
          {editing && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void saveEdit();
              }}
            >
              <label htmlFor="edit-desc">{editingIncome ? "De onde veio?" : "Descrição"}</label>
              <input id="edit-desc" maxLength={120} value={eDesc}
                onChange={(e) => setEDesc(e.target.value)} disabled={eBusy} />
              <label htmlFor="edit-value">
                {editingIncome ? "Quanto entrou? (R$)" : converting ? "Valor total da compra (R$)" : totalInstallments ? "Valor total das parcelas selecionadas (R$)"
                  : grouped && editing.is_parcelado ? "Valor desta parcela (R$)" : "Valor (R$)"}
              </label>
              <input id="edit-value" inputMode="numeric" value={eValue}
                onChange={(e) => setEValue(formatMoneyInput(e.target.value))} disabled={eBusy} />
              {canRecur && <>
                <div className="sheet-tabs" role="group" aria-label="Frequência">
                  {([["uma", "Uma vez"], ["recorrente", "Todo mês"]] as const).map(([value, label]) => (
                    <button type="button" key={value} aria-pressed={ePlan === value} disabled={eBusy}
                      onClick={() => { setEPlan(value); setEError(""); }}>{label}</button>
                  ))}
                </div>
                {makingRecurring && <>
                  <label htmlFor="edit-rec-day">Dia do mês (1 a 31)</label>
                  <input id="edit-rec-day" inputMode="numeric" value={eRecDay} onChange={(e) => setERecDay(e.target.value)} disabled={eBusy} />
                  <label htmlFor="edit-rec-months">Por quantos meses? (2 a 36)</label>
                  <input id="edit-rec-months" inputMode="numeric" value={eRecMonths} onChange={(e) => setERecMonths(e.target.value)} disabled={eBusy} />
                  <small>O valor se repete a cada mês, a partir do mês da data abaixo. Este lançamento será a primeira receita da série.</small>
                </>}
              </>}
              {editing.recorrencia_id && <p className="muted">{editingIncome ? "Todo mês · receita recorrente." : "Todo mês · gasto recorrente."} Escolha abaixo quais lançamentos alterar.</p>}
              {canSplit && <>
                <div className="sheet-tabs" role="group" aria-label="Parcelamento">
                  {([["uma", "Uma vez"], ["parcelado", "Parcelado"]] as const).map(([value, label]) => (
                    <button type="button" key={value} aria-pressed={ePlan === value} disabled={eBusy}
                      onClick={() => { setEPlan(value); setEError(""); }}>{label}</button>
                  ))}
                </div>
                {converting && <>
                  <label htmlFor="edit-installments">Em quantas parcelas?</label>
                  <input id="edit-installments" inputMode="numeric" value={eInstallments}
                    onChange={(e) => setEInstallments(e.target.value)} disabled={eBusy} />
                  <small>Informe acima o valor total da compra. A primeira parcela usa a data e o cartão deste lançamento.</small>
                  {preview.length > 1 && <p className="muted">
                    {preview.length}x de {money(preview[0])}
                    {preview.at(-1) !== preview[0] ? ` (última ${money(preview.at(-1)!)})` : ""}
                    {" · total "}{money(parseMoney(eValue))}
                  </p>}
                </>}
              </>}
              {!editingIncome && <>
              <label htmlFor="edit-category">Categoria</label>
              <CategorySelect id="edit-category" value={eCategory} disabled={eBusy}
                onChange={(cat) => {
                  setECategory(cat);
                  if (!isSubcategoryOf(eSubcategory, cat)) setESubcategory(null);
                }} />
              {<>
                <label htmlFor="edit-subcategory">Subcategoria</label>
                <SubcategorySelect id="edit-subcategory" category={eCategory} value={eSubcategory} disabled={eBusy}
                  onChange={setESubcategory} />
              </>}
              <small>Para corrigir outra parcela, a categoria será atualizada na série toda.</small>
              </>}
              {!grouped ? (
                <>
                  <label htmlFor="edit-date">{editingIncome ? "Data do recebimento" : "Data"}</label>
                  <input id="edit-date" type="date" value={eDate}
                    onChange={(e) => setEDate(e.target.value)} disabled={eBusy} />
                </>
              ) : (
                <>
                  <div role="group" aria-label="Aplicar a">
                    {([["one", "Só este"], ["next", "Este e os próximos"], ["all", "Todos"]] as const).map(([v, t]) => (
                      <button type="button" key={v} aria-pressed={eScope === v}
                        disabled={eBusy} onClick={() => chooseEditScope(v)}>
                        {t}
                      </button>
                    ))}
                  </div>
                  <small>
                    {totalInstallments
                      ? `O total será dividido entre ${groupScope(rows, editing, eScope).length} parcelas. A data não muda aqui.`
                      : `Serão alterados ${groupScope(rows, editing, eScope).length} lançamento(s). A data não muda aqui.`}
                  </small>
                </>
              )}
              {eError && <p className="alert" role="alert">{eError}</p>}
              <button className="primary" disabled={eBusy}>
                {eBusy ? "Salvando…" : converting ? "Salvar parcelas" : makingRecurring ? "Salvar todo mês" : "Salvar edição"}
              </button>
            </form>
          )}
        </div>
      </dialog>
      <dialog
        className="detail-dialog"
        ref={sheet}
        aria-labelledby="detail-title"
        onCancel={(e) => {
          if (deleting) e.preventDefault();
          else setDetailId(null);
        }}
      >
        <div className="sheet">
          <div className="sheet-top">
            <h2 id="detail-title">Detalhes do lançamento</h2>
            <button
              className="icon-button"
              aria-label="Fechar detalhes"
              disabled={deleting}
              onClick={close}
            >
              ×
            </button>
          </div>
          {detail && (
            <>
              <dl className="entry-details">
                <div>
                  <dt>Descrição</dt>
                  <dd>{detail.descricao}</dd>
                </div>
                <div>
                  <dt>Valor</dt>
                  <dd>{money(Number(detail.valor))}</dd>
                </div>
                <div>
                  <dt>Data da compra</dt>
                  <dd>{parseDate(detail.data).toLocaleDateString("pt-BR")}</dd>
                </div>
                <div>
                  <dt>Cartão</dt>
                  <dd>{cardName(detail)}</dd>
                </div>
                <div>
                  <dt>Mês da fatura</dt>
                  <dd>
                    {detail.forma_pagamento === "credito"
                      ? detail.mes_referencia.split("-").reverse().join("/")
                      : "Não se aplica"}
                  </dd>
                </div>
                <div>
                  <dt>Categoria</dt>
                  <dd>
                    {categoryOf(detail) ??
                      detail.categoria_macro ??
                      detail.categoria}
                  </dd>
                </div>
                <div>
                  <dt>Subcategoria</dt>
                  <dd>{detail.subcategoria ?? "Não informada"}</dd>
                </div>
                {detail.is_parcelado && (
                  <div>
                    <dt>Parcela</dt>
                    <dd>
                      {detail.parcela_atual}/{detail.parcela_total}
                    </dd>
                  </div>
                )}
              </dl>
              {!confirm ? (
                <>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    sheet.current?.close();
                    setDetailId(null);
                    openEdit(detail);
                  }}
                >
                  Editar
                </button>
                <button
                  className="delete-button"
                  onClick={() => { setScope("one"); setConfirm(true); }}
                >
                  Apagar
                </button>
                </>
              ) : (
                <div
                  className="delete-confirm"
                  role="group"
                  aria-label="Confirmar exclusão"
                >
                  <p>Apagar este lançamento?</p>
                  {detail.parcelamento_id || detail.recorrencia_id ? (
                    <>
                      <div role="group" aria-label="O que apagar">
                        {([["one", "Só este"], ["next", "Este e os próximos"], ["all", "Todos"]] as const).map(([v, t]) => (
                          <button type="button" key={v} aria-pressed={scope === v}
                            disabled={deleting} onClick={() => setScope(v)}>
                            {t}
                          </button>
                        ))}
                      </div>
                      <small>
                        Serão apagados {groupScope(rows, detail, scope).length} lançamento(s).
                      </small>
                    </>
                  ) : (
                    <small>Esta ação não pode ser desfeita.</small>
                  )}
                  <div>
                    <button
                      disabled={deleting}
                      onClick={() => setConfirm(false)}
                    >
                      Cancelar
                    </button>
                    <button
                      className="delete-button"
                      disabled={deleting}
                      onClick={() => void remove()}
                    >
                      {deleting ? "Apagando…" : "Confirmar exclusão"}
                    </button>
                  </div>
                </div>
              )}
              {error && (
                <p className="alert" role="alert">
                  {error}
                </p>
              )}
            </>
          )}
        </div>
      </dialog>
    </section>
  );
}

function isMacro(value: string | null): value is Exclude<Category, "Pais"> {
  return value !== null && value !== "Pais" && ["Moradia", "Alimentação", "Transporte", "Saúde", "Pessoal", "Lazer", "Aportes"].includes(value);
}


