import { useEffect, useRef, useState } from "react";
import {
  groupScope,
  categoryOf,
  filterEntries,
  groupEntriesByDay,
  monthEntries,
  monthSummary,
  parseDate,
} from "./domain";
import type { Entry, Card, Category, EntryFilter } from "./domain";
import CategorySelect from "./CategorySelect";
import SubcategorySelect from "./SubcategorySelect";
import SwipeRow from "./SwipeRow";
import { parseMoney } from "./domain";
const money = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    n,
  );
const displayAsIncome = (row: Entry) => row.tipo === "receita" || row.categoria === "salario";
function CategoryIcon({ category, parent, income }: { category: string | null; parent: boolean; income: boolean }) {
  const stroke = parent ? "#8a4f08" : income ? "#2e7c70" : "#435d9b";
  return (
    <svg className="ledger-category-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      {parent ? <>
        <path d="M15 39c1-7 5-11 11-11s10 4 11 11" fill="#f4c997" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="26" cy="18" r="10" fill="#f4c997" stroke={stroke} strokeWidth="2.5" />
        <path d="M17 17c1-9 15-13 19-3M18 19h3m11 0h3m-13 5c2 2 6 2 8 0m5 4 5 7m0 0v8m-3-1h6" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </> : income ? <>
        <path d="M10 31h28M14 31V19l10-7 10 7v12" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M24 29V18m-5 5 5-5 5 5" stroke="#54a38f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </> : category === "Alimentação" ? <><path d="M15 9v14m-5-14v8c0 4 10 4 10 0V9m-5 14v16M31 9c-6 8-5 16 1 16v14m0-30v16" stroke={stroke} strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" /></>
        : category === "Moradia" ? <><path d="m8 23 16-13 16 13v15H10V23m9 15V25h10v13" stroke={stroke} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" /><path d="M19 19h.1M29 19h.1" stroke="#54a38f" strokeWidth="4" strokeLinecap="round" /></>
        : category === "Transporte" ? <><path d="m10 28 3-11h22l3 11v10h-4v-4H14v4h-4V28Z" stroke={stroke} strokeWidth="2.8" strokeLinejoin="round" /><path d="M14 27h20m-18-5h4m8 0h4m-16 11h.1m16 0h.1" stroke="#54a38f" strokeWidth="2.8" strokeLinecap="round" /></>
        : category === "Saúde" ? <><path d="M24 40S9 31 9 20c0-8 10-12 15-4 5-8 15-4 15 4 0 11-15 20-15 20Z" stroke={stroke} strokeWidth="2.8" strokeLinejoin="round" /><path d="M24 17v14m-7-7h14" stroke="#54a38f" strokeWidth="3" strokeLinecap="round" /></>
        : category === "Pessoal" ? <><circle cx="24" cy="17" r="8" stroke={stroke} strokeWidth="2.8" /><path d="M10 40c1-8 6-13 14-13s13 5 14 13" stroke={stroke} strokeWidth="2.8" strokeLinecap="round" /><path d="m20 19 4 3 4-3" stroke="#54a38f" strokeWidth="2.5" strokeLinecap="round" /></>
        : category === "Lazer" ? <><rect x="9" y="12" width="30" height="24" rx="6" stroke={stroke} strokeWidth="2.8" /><path d="M17 20v8m-4-4h8m11-2h.1m4 5h.1" stroke="#54a38f" strokeWidth="3.5" strokeLinecap="round" /></>
        : category === "Aportes" ? <><path d="M11 36 22 25l7 6 10-14m-9 0h9v9" stroke={stroke} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" /><path d="M11 40h28" stroke="#54a38f" strokeWidth="2.8" strokeLinecap="round" /></>
        : <><rect x="11" y="10" width="26" height="28" rx="8" stroke={stroke} strokeWidth="2.8" /><path d="M18 21h.1m12 0h.1m-11 8c3 3 7 3 10 0" stroke="#54a38f" strokeWidth="3" strokeLinecap="round" /></>}
    </svg>
  );
}
export default function Ledger({
  rows,
  cards,
  selected,
  pending,
  changing,
  onCategory,
  onSubcategory,
  onDelete,
  onEdit,
  categoryFilter,
  onClearCategory,
}: {
  rows: Entry[];
  cards: Card[];
  selected: Date;
  pending: Set<string>;
  changing: Set<string>;
  onCategory: (r: Entry, c: Category) => Promise<void>;
  onSubcategory: (r: Entry, subcategory: string) => Promise<void>;
  onDelete: (r: Entry, scope: "one" | "next" | "all") => Promise<void>;
  onEdit: (
    r: Entry,
    edits: { descricao: string; valor: number; data?: string },
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
    groups = groupEntriesByDay(filtered.slice(0, limit)),
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
    setEValue(String(Number(row.valor)).replace(".", ","));
    setEDate(row.data);
    setEScope("one");
    setEError("");
    editSheet.current?.showModal();
  }
  const editing = rows.find((r) => r.id === editId);
  const grouped = !!(editing?.parcelamento_id || editing?.recorrencia_id);
  async function saveEdit() {
    if (!editing) return;
    const valor = parseMoney(eValue);
    if (!eDesc.trim() || !Number.isFinite(valor) || valor <= 0) {
      setEError("Preencha uma descrição e um valor maior que zero.");
      return;
    }
    const withDate = !grouped && /^\d{4}-\d{2}-\d{2}$/.test(eDate);
    setEBusy(true);
    setEError("");
    try {
      await onEdit(
        editing,
        { descricao: eDesc.trim(), valor, ...(withDate ? { data: eDate } : {}) },
        eScope,
      );
      editSheet.current?.close();
      setEditId(null);
    } catch {
      setEError("Não consegui salvar a edição. Tente novamente.");
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
        groups.map((group) => (
          <section className="day-group" key={group.date}>
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
                <div className="entry-bottom">
                  <CategorySelect
                    value={categoryOf(row)}
                    disabled={pending.has(row.id) || changing.has(row.id)}
                    onChange={(cat) => void onCategory(row, cat)}
                  />
                  {row.tipo === "despesa" && (
                    <SubcategorySelect
                      category={isMacro(row.categoria_macro) ? row.categoria_macro : categoryOf(row)}
                      value={row.subcategoria}
                      disabled={pending.has(row.id) || changing.has(row.id)}
                      onChange={(subcategory) => void onSubcategory(row, subcategory)}
                    />
                  )}
                  {pending.has(row.id) && (
                    <small role="status">classificando…</small>
                  )}
                </div>
                {row.subcategoria_pais ? (
                  <small className="entry-tag">Pais · fora da conta</small>
                ) : row.categoria_macro === "Aportes" ? (
                  <small className="entry-tag">Aporte · fora da conta</small>
                ) : row.categoria === "reembolso_pais" ? (
                  <small className="entry-tag">
                    Reembolso dos Pais · fora da conta
                  </small>
                ) : null}
              </article>
              </SwipeRow>
            ))}
          </section>
        ))
      )}
      {filtered.length > limit && (
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
            <h2 id="edit-title">Editar lançamento</h2>
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
              <label htmlFor="edit-desc">Descrição</label>
              <input id="edit-desc" maxLength={120} value={eDesc}
                onChange={(e) => setEDesc(e.target.value)} disabled={eBusy} />
              <label htmlFor="edit-value">
                {grouped && editing.is_parcelado ? "Valor de cada parcela (R$)" : "Valor (R$)"}
              </label>
              <input id="edit-value" inputMode="decimal" value={eValue}
                onChange={(e) => setEValue(e.target.value)} disabled={eBusy} />
              {!grouped ? (
                <>
                  <label htmlFor="edit-date">Data</label>
                  <input id="edit-date" type="date" value={eDate}
                    onChange={(e) => setEDate(e.target.value)} disabled={eBusy} />
                </>
              ) : (
                <>
                  <div role="group" aria-label="Aplicar a">
                    {([["one", "Só este"], ["next", "Este e os próximos"], ["all", "Todos"]] as const).map(([v, t]) => (
                      <button type="button" key={v} aria-pressed={eScope === v}
                        disabled={eBusy} onClick={() => setEScope(v)}>
                        {t}
                      </button>
                    ))}
                  </div>
                  <small>
                    Serão alterados {groupScope(rows, editing, eScope).length} lançamento(s). A data não muda aqui.
                  </small>
                </>
              )}
              {eError && <p className="alert" role="alert">{eError}</p>}
              <button className="primary" disabled={eBusy}>
                {eBusy ? "Salvando…" : "Salvar edição"}
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
