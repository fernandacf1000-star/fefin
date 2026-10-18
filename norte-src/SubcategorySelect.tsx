import { subcategoriesFor } from "./domain";
import type { Category } from "./domain";

export default function SubcategorySelect({
  category,
  value,
  onChange,
  disabled = false,
}: {
  category: Category | null;
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const choices = subcategoriesFor(category);
  return (
    <select
      aria-label="Subcategoria do lançamento"
      value={choices.includes(value ?? "") ? value ?? "" : ""}
      disabled={disabled || !category}
      onChange={(event) => {
        if (choices.includes(event.target.value)) onChange(event.target.value);
      }}
    >
      <option value="">Sem subcategoria</option>
      {choices.map((item) => (
        <option key={item} value={item}>
          {item}
        </option>
      ))}
    </select>
  );
}
