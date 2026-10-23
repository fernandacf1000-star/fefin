import { useEffect, useRef, useState } from "react";
import {
  groupScope,
  categoryOf,
  filterEntries,
  groupEntriesByDay,
  isSubcategoryOf,
  monthEntries,
  monthSummary,
  parseDate,
  sumMoney,
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
const displayAsIncome = (row: Entry) => row.tipo === "receita" || row.categoria === "salario" || row.categoria === "reembolso_pais";
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
    edits: { descricao: string; valor: number; data?: string; category: Category | null; subcategory: string | null },
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
    setECategory(categoryOf(row));
    setESubcategory(row.subcategoria);
    setEScope("one");
    setEError("");
    editSheet.current?.showModal();
  }
  const editing = rows.find((r) => r.id === editId);
  const grouped = !!(editing?.parcelamento_id || editing?.recorrencia_id);
  const totalInstallments = !!(editing?.is_parcelado && editing.parcelamento_id && eScope !== "one");
  function chooseEditScope(next: "one" | "next" | "all") {
    if (!editing) return;
    setEScope(next);
    const targets = groupScope(rows, editing, next);
    const value = editing.is_parcelado && editing.parcelamento_id && next !== "one"
      ? sumMoney(targets.map((r) => Number(r.valor)))
      : Number(editing.valor);
    setEValue(value.toFixed(2).replace(".", ","));
  }
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
        { descricao: eDesc.trim(), valor, category: eCategory, subcategory: eSubcategory, ...(withDate ? { data: eDate } : {}) },
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
                {totalInstallments ? "Valor total das parcelas selecionadas (R$)"
                  : grouped && editing.is_parcelado ? "Valor desta parcela (R$)" : "Valor (R$)"}
              </label>
              <input id="edit-value" inputMode="decimal" value={eValue}
                onChange={(e) => setEValue(e.target.value)} disabled={eBusy} />
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
              {editing.tipo === "despesa" && <small>Para corrigir outra parcela, a categoria será atualizada na série toda.</small>}
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

