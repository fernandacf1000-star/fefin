import { categoryChartData, sixMonthChartData } from "./domain";
import type { Entry, SpendingCategory } from "./domain";
const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    value,
  );
const percentage = (value: number) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value) +
  "%";
const COLORS = [
  "#2E7C70",
  "#4D8F84",
  "#709F96",
  "#94B6AF",
  "#566870",
  "#7D9499",
  "#A0B8B3",
];
export default function Charts({
  rows,
  selected,
  onCategory,
}: {
  rows: Entry[];
  selected: Date;
  onCategory: (category: SpendingCategory) => void;
}) {
  const { categories, spent, unclassified } = categoryChartData(rows, selected),
    months = sixMonthChartData(rows, selected);
  const maximum = Math.max(1, ...months.flatMap((m) => [m.income, m.spent]));
  const y = (value: number) => 145 - (Math.max(0, value) / maximum) * 125;
  return (
    <section className="charts">
      <h1>Gastos por categoria</h1>
      {spent === 0 ? (
        <p className="muted">Nenhum gasto neste mês.</p>
      ) : (
        <div className="category-chart">
          {categories
            .filter((c) => c.amount > 0)
            .map((item, i) => (
              <button
                key={item.category}
                className="category-bar"
                aria-label={`Ver gastos de ${item.category}`}
                onClick={() => onCategory(item.category)}
              >
                <div>
                  <strong>{item.category}</strong>
                  <span>
                    {money(item.amount)}{" "}
                    <small>· {percentage(item.percent)}</small>
                  </span>
                </div>
                <svg viewBox="0 0 320 8" aria-hidden="true">
                  <rect width="320" height="8" rx="4" className="chart-track" />
                  <rect
                    width={Math.min(320, Math.max(0, item.percent) * 3.2)}
                    height="8"
                    rx="4"
                    fill={COLORS[i % COLORS.length]}
                  />
                </svg>
              </button>
            ))}
        </div>
      )}
      {unclassified > 0 && (
        <p className="muted">{money(unclassified)} aguardam categoria.</p>
      )}
      <section className="six-months">
        <h2>Últimos 6 meses</h2>
        <div className="chart-legend">
          <span>
            <i className="income-key" />
            Ganhou
          </span>
          <span>
            <i className="spent-key" />
            Gastou
          </span>
        </div>
        <svg
          className="history-chart"
          viewBox="0 0 336 182"
          role="img"
          aria-label="Ganhou e gastou nos últimos seis meses"
        >
          <line x1="0" y1="145" x2="336" y2="145" className="chart-axis" />
          {months.map((m, i) => {
            const x = i * 56;
            return (
              <g
                key={m.month}
                aria-label={`${m.label}: ganhou ${money(m.income)}, gastou ${money(m.spent)}${m.selected ? ", mês escolhido" : ""}`}
              >
                <title>
                  {m.month}: ganhou {money(m.income)}, gastou {money(m.spent)}
                </title>
                {m.selected && (
                  <rect
                    x={x + 1}
                    y={5}
                    width={54}
                    height={173}
                    rx={9}
                    className="selected-month-bg"
                  />
                )}
                <rect
                  x={x + 12}
                  y={y(m.income)}
                  width={14}
                  height={145 - y(m.income)}
                  rx={3}
                  className="history-income"
                />
                <rect
                  x={x + 30}
                  y={y(m.spent)}
                  width={14}
                  height={145 - y(m.spent)}
                  rx={3}
                  className="history-spent"
                />
                <text
                  x={x + 28}
                  y={166}
                  textAnchor="middle"
                  className={m.selected ? "selected-month-label" : ""}
                >
                  {m.label}
                </text>
              </g>
            );
          })}
        </svg>
        <details className="chart-values">
          <summary>Ver valores</summary>
          <table>
            <caption>Ganhou e gastou por mês</caption>
            <thead>
              <tr>
                <th>Mês</th>
                <th>Ganhou</th>
                <th>Gastou</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => (
                <tr key={m.month}>
                  <th scope="row">{m.month.split("-").reverse().join("/")}</th>
                  <td>{money(m.income)}</td>
                  <td>{money(m.spent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>
    </section>
  );
}
