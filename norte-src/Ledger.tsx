import { useEffect, useRef, useState } from "react";
import {
  groupScope,
  categoryOf,
  countsAsIncome,
  filterEntries,
  groupEntriesByDay,
  monthEntries,
  monthSummary,
  parseDate,
} from "./domain";
import type { Entry, Card, Category, EntryFilter } from "./domain";
import CategorySelect from "./CategorySelect";
const money = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    n,
  );
export default function Ledger({
  rows,
  cards,
  selected,
  pending,
  changing,
  onCategory,
  onDelete,
  categoryFilter,
  onClearCategory,
}: {
  rows: Entry[];
  cards: Card[];
  selected: Date;
  pending: Set<string>;
  changing: Set<string>;
  onCategory: (r: Entry, c: Category) => Promise<void>;
  onDelete: (r: Entry, scope: "one" | "next" | "all") => Promise<void>;
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
  function open(row: Entry, button: HTMLButtonElement) {
    lastOpener.current = button;
    setDetailId(row.id);
    setConfirm(false);
    setError("");
    sheet.current?.showModal();
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
              <article className="entry ledger-entry" key={row.id}>
                <button
                  className="ledger-open"
                  aria-label={`Ver detalhes de ${row.descricao}`}
                  onClick={(e) => open(row, e.currentTarget)}
                >
                  <div className="entry-top">
                    <strong>{row.descricao}</strong>
                    <span className={countsAsIncome(row) ? "income-value" : ""}>
                      {countsAsIncome(row) ? "+ " : ""}
                      {money(Number(row.valor))}
                    </span>
                  </div>
                  <div className="entry-meta">
                    <span>{cardName(row)}</span>
                    {row.is_parcelado && (
                      <span>
                        parcela {row.parcela_atual ?? 1}/
                        {row.parcela_total ?? 1}
                      </span>
                    )}
                    {row.recorrencia_id && <span>Todo mês</span>}
                  </div>
                </button>
                <div className="entry-bottom">
                  <CategorySelect
                    value={categoryOf(row)}
                    disabled={pending.has(row.id) || changing.has(row.id)}
                    onChange={(cat) => void onCategory(row, cat)}
                  />
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
                <button
                  className="delete-button"
                  onClick={() => { setScope("one"); setConfirm(true); }}
                >
                  Apagar
                </button>
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
