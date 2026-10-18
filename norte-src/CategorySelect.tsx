import { CATEGORIES, isCategory } from "./domain";
import type { Category } from "./domain";
export default function CategorySelect({
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
