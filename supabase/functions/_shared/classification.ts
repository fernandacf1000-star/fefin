import { categoryOf, isCategory, isSubcategoryOf, memory, memoryExamples, normalize, parentRule } from './norte.ts';
import type { Category, Entry } from './norte.ts';

type Input = { label: string; amount: number; kind: 'despesa' | 'receita'; category: Category | null; subcategory: string | null; edited?: boolean };
type Pair = { category: Category; subcategory: string };
const key = (label: string) => normalize(label).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

// Vote on complete pairs, never on category and subcategory independently.
export function historicalClassification(label: string, kind: string, history: Entry[]): Pair | null {
  const counts = new Map<string, { pair: Pair; count: number; rank: number }>();
  for (const [rank, row] of memoryExamples(history, history.length).entries()) {
    if (row.tipo !== kind || key(row.descricao) !== key(label)) continue;
    const category = parentRule(label) ? 'Pais' : categoryOf(row);
    if (!category || !isSubcategoryOf(row.subcategoria, category)) continue;
    const id = `${category}|${row.subcategoria}`;
    const prior = counts.get(id);
    counts.set(id, { pair: { category, subcategory: row.subcategoria }, count: (prior?.count ?? 0) + 1, rank: prior?.rank ?? rank });
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.rank - b.rank)[0]?.pair ?? null;
}

export async function completeClassifications<T extends Input>(items: T[], history: Entry[], ask: (body: Record<string, unknown>) => Promise<any>): Promise<T[]> {
  const resolved = items.map((item) => {
    const sameKind = history.filter((r) => r.tipo === item.kind);
    const remembered = item.edited ? null : historicalClassification(item.label, item.kind, sameKind);
    const category = parentRule(item.label) || item.category === 'Pais' ? 'Pais' : remembered?.category ?? (item.edited ? item.category : memory(item.label, sameKind) ?? item.category);
    return { ...item, category, subcategory: remembered?.subcategory ?? (isSubcategoryOf(item.subcategory, category) ? item.subcategory : null) };
  });
  for (const kind of ['despesa', 'receita'] as const) {
    const missing = resolved.filter((item) => item.kind === kind && (!isCategory(item.category) || !isSubcategoryOf(item.subcategory, item.category)));
    for (let offset = 0; offset < missing.length; offset += 10) {
      const batch = missing.slice(offset, offset + 10);
      const response = await ask({ task: 'classify', kind,
        items: batch.map((item) => ({ label: item.label, amount: item.amount, ...(item.category ? { category: item.category } : {}) })),
        examples: memoryExamples(history.filter((r) => r.tipo === kind)).map((r) => `${r.descricao}${r.recorrencia_id ? ' (recorrente)' : ''} → ${categoryOf(r)}${r.subcategoria ? ` / ${r.subcategoria}` : ''}`),
      });
      if (!Array.isArray(response?.categories) || !Array.isArray(response?.subcategories) || response.categories.length !== batch.length || response.subcategories.length !== batch.length)
        throw new Error('Não consegui completar a classificação. Tente novamente; nada foi salvo.');
      batch.forEach((item, index) => {
        const category = item.category ?? response.categories[index];
        const subcategory = response.subcategories[index];
        if (!isCategory(category) || response.categories[index] !== category || !isSubcategoryOf(subcategory, category))
          throw new Error('Não consegui completar a classificação. Tente novamente; nada foi salvo.');
        item.category = category;
        item.subcategory = subcategory;
      });
    }
  }
  return resolved;
}

