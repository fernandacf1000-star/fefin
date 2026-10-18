import { monthKey, navigateMonth } from "./domain";
export default function MonthSelector({
  selected,
  now,
  onChange,
}: {
  selected: Date;
  now: Date;
  onChange: (date: Date) => void;
}) {
  const previous = navigateMonth(selected, -1, now),
    next = navigateMonth(selected, 1, now);
  return (
    <div className="month-selector" role="group" aria-label="Mês selecionado">
      <button
        aria-label="Mês anterior"
        disabled={monthKey(previous) === monthKey(selected)}
        onClick={() => onChange(previous)}
      >
        ‹
      </button>
      <span aria-live="polite">
        {selected.toLocaleDateString("pt-BR", {
          month: "long",
          year: "numeric",
        })}
      </span>
      <button
        aria-label="Próximo mês"
        disabled={monthKey(next) === monthKey(selected)}
        onClick={() => onChange(next)}
      >
        ›
      </button>
      {monthKey(selected) !== monthKey(now) && (
        <button
          className="month-today"
          onClick={() =>
            onChange(new Date(now.getFullYear(), now.getMonth(), 1, 12))
          }
        >
          Hoje
        </button>
      )}
    </div>
  );
}
