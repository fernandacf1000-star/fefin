import { monthPresentation } from "./domain";
import type { Entry } from "./domain";
const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    value,
  );
export default function MonthView({
  rows,
  selected,
  now,
}: {
  rows: Entry[];
  selected: Date;
  now: Date;
}) {
  const month = monthPresentation(rows, selected, now);
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
    </section>
  );
}
