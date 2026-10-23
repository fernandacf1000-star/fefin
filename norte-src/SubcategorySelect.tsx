import { subcategoriesFor } from "./domain";
import type { Category } from "./domain";

export default function SubcategorySelect({
  category,
  value,
  onChange,
  disabled = false,
  id,
}: {
  category: Category | null;
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
}) {
  const choices = subcategoriesFor(category);
  return (
    <select
      id={id}
      aria-label="Subcategoria do lançamento"
      value={choices.includes(value ?? "") ? value ?? "" : ""}
      disabled={disabled || !category}
      onChange={(event) => {
        if (choices.includes(event.target.value)) onChange(event.target.value);
      }}
    >
      <option value="" disabled>Escolher subcategoria</option>
      {choices.map((item) => (
        <option key={item} value={item}>
          {item}
        </option>
      ))}
    </select>
  );
}

