import { monthPresentation, bestCard, monthEntries, sumMoney } from "./domain";
import type { Entry, Card } from "./domain";
const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    value,
  );
export default function MonthView({
  rows,
  selected,
  now,
  cards,
}: {
  rows: Entry[];
  selected: Date;
  now: Date;
  cards: Card[];
}) {
  const month = monthPresentation(rows, selected, now);
  const parents = sumMoney(monthEntries(rows, selected)
    .filter((r) => r.tipo === "despesa" && !!r.subcategoria_pais)
    .map((r) => Number(r.valor)));
  const recommended = bestCard(cards, now);
  return (
    <section className="month-view" aria-label="Resumo do mês">
      <h1>{month.label}</h1>
      <div className={`big-number${month.over ? " attention-text" : ""}`}>
        {money(month.displayAmount)}
      </div>
      <dl className="month-summary">
        <div>
          <dt>Ganhou</dt>
          <dd>{money(month.income)}</dd>
        </div>
        <div>
          <dt>Gastou</dt>
          <dd>{money(month.spent)}</dd>
        </div>
        {parents > 0 && <div className="parents-summary">
          <dt>Pais · fora do saldo</dt>
          <dd>{money(parents)}</dd>
        </div>}
      </dl>
      <progress
        className={month.spent > month.income ? "care-progress" : ""}
        aria-label="Gasto sobre receita"
        max={100}
        value={month.progress}
      />
      {month.period === "future" && (
        <p className="future-note">Só o que já está lançado</p>
      )}
      {recommended && (
        <aside className="best-card" aria-label="Melhor cartão hoje">
          <span>Melhor cartão hoje</span>
          <strong>{recommended.nome}</strong>
          <small>Compra hoje · paga em {recommended.due.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</small>
        </aside>
      )}
    </section>
  );
}
