import BottomNav from "@/components/BottomNav";
import EmptyState from "@/components/EmptyState";
import { useLancamentos } from "@/hooks/useLancamentos";
import {
  PieChart, Pie, Cell, ResponsiveContainer,
} from "recharts";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { SUBCATEGORIA_GROUPS, getGroupEmoji, CAT_COLORS, normalizeMacro } from "@/lib/subcategorias";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const now = new Date();
const generateMonths = () => {
  const result = [];
  for (let i = -1; i <= 1; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    result.push({ key, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return result;
};
const months = generateMonths();

const Graficos = () => {
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [subcatCatFilter, setSubcatCatFilter] = useState<string | null>(null);
  const [activePieIndex, setActivePieIndex] = useState<number | undefined>(undefined);
  const mesRef = months[selectedMonth]?.key;
  const { data: lancamentos = [], isLoading } = useLancamentos(mesRef);

  const totalReceitas = useMemo(() =>
    lancamentos.filter((l) => l.tipo === "receita").reduce((s, l) => s + Number(l.valor), 0),
    [lancamentos]
  );
  const totalDespesas = useMemo(() =>
    lancamentos.filter((l) => l.tipo === "despesa").reduce((s, l) => s + Number(l.valor), 0),
    [lancamentos]
  );

  const composicao = useMemo(() => {
    const despesas = lancamentos.filter((l) => l.tipo === "despesa");
    const map: Record<string, number> = {};
    despesas.forEach(d => {
      const key = normalizeMacro(d.categoria_macro);
      map[key] = (map[key] || 0) + Number(d.valor);
    });
    return Object.entries(map)
      .map(([name, value]) => ({
        name,
        value,
        color: CAT_COLORS[name] || "#475569",
      }))
      .filter(c => c.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [lancamentos]);

  const totalMes = composicao.reduce((s, c) => s + c.value, 0);

  // Subcategoria bar data with parent category color
  const subcatData = useMemo(() => {
    let despesas = lancamentos.filter((l) => l.tipo === "despesa" && l.subcategoria);
    if (subcatCatFilter) {
      despesas = despesas.filter((l) => normalizeMacro(l.categoria_macro) === subcatCatFilter);
    }
    const map: Record<string, { value: number; macro: string }> = {};
    despesas.forEach((d) => {
      const key = d.subcategoria!;
      const macro = normalizeMacro(d.categoria_macro);
      if (!map[key]) map[key] = { value: 0, macro };
      map[key].value += Number(d.valor);
    });
    return Object.entries(map)
      .map(([name, { value, macro }]) => ({
        name,
        value,
        macro,
        color: CAT_COLORS[macro] || "#475569",
        emoji: getGroupEmoji(macro),
      }))
      .sort((a, b) => b.value - a.value);
  }, [lancamentos, subcatCatFilter]);

  const subcatTotal = subcatData.reduce((s, c) => s + c.value, 0);
  const subcatMax = subcatData.length > 0 ? subcatData[0].value : 1;

  const catFilterOptions = [
    { key: null, label: "Todas" },
    ...SUBCATEGORIA_GROUPS.map(g => ({ key: g.group, label: `${g.emoji} ${g.group}` })),
  ];

  const hasData = lancamentos.length > 0;

  const activeEntry = activePieIndex !== undefined ? composicao[activePieIndex] : null;

  const handlePieEnter = useCallback((_: any, index: number) => {
    setActivePieIndex(index);
  }, []);

  const handlePieLeave = useCallback(() => {
    setActivePieIndex(undefined);
  }, []);

  return (
    <div className="min-h-screen gradient-bg overflow-x-hidden pb-[90px]">
      <div className="px-4 pt-12 space-y-6 w-full">
        <h1 className="text-xl font-semibold text-foreground animate-fade-up">Gráficos</h1>

        {/* Month Selector */}
        <div className="flex items-center justify-center gap-3 animate-fade-up" style={{ animationDelay: "0.03s" }}>
          <button onClick={() => setSelectedMonth((p) => Math.max(0, p - 1))} disabled={selectedMonth === 0} className="p-1 rounded-full text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <div className="flex items-center gap-2 overflow-hidden">
            {months.map((m, i) => (
              <button key={m.key} onClick={() => setSelectedMonth(i)} className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all whitespace-nowrap ${i === selectedMonth ? "gradient-emerald text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-foreground"}`}>
                {m.label}
              </button>
            ))}
          </div>
          <button onClick={() => setSelectedMonth((p) => Math.min(months.length - 1, p + 1))} disabled={selectedMonth === months.length - 1} className="p-1 rounded-full text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>

        {!hasData && !isLoading ? (
          <EmptyState title="Adicione lançamentos para ver seus gráficos 📊" />
        ) : (
          <>
            {/* Receitas vs Despesas */}
            <section className="glass-card p-4 animate-fade-up" style={{ animationDelay: "0.05s" }}>
              <h2 className="text-sm font-semibold text-foreground mb-4">Receitas vs Despesas</h2>
              <div className="flex justify-between items-end px-4 h-32">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-16 rounded-t-lg gradient-emerald" style={{ height: `${Math.max(8, totalReceitas > 0 ? 100 : 0)}px` }} />
                  <span className="text-[11px] text-muted-foreground">Receitas</span>
                  <span className="text-xs font-bold text-primary">{fmt(totalReceitas)}</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-16 rounded-t-lg bg-destructive" style={{ height: `${Math.max(8, totalReceitas > 0 ? (totalDespesas / totalReceitas) * 100 : totalDespesas > 0 ? 100 : 0)}px` }} />
                  <span className="text-[11px] text-muted-foreground">Despesas</span>
                  <span className="text-xs font-bold text-destructive">{fmt(totalDespesas)}</span>
                </div>
              </div>
            </section>

            {/* Composição por Categoria */}
            {composicao.length > 0 && (
              <section className="glass-card p-4 animate-fade-up" style={{ animationDelay: "0.1s" }}>
                <h2 className="text-sm font-semibold text-foreground">Composição por Categoria</h2>
                <p className="text-[11px] text-muted-foreground mb-4">{months[selectedMonth]?.label}</p>
                <div className="relative h-52 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={composicao}
                        dataKey="value"
                        innerRadius="60%"
                        outerRadius="85%"
                        paddingAngle={3}
                        stroke="none"
                        onMouseEnter={handlePieEnter}
                        onMouseLeave={handlePieLeave}
                        onClick={handlePieEnter}
                      >
                        {composicao.map((entry, i) => (
                          <Cell key={i} fill={entry.color} opacity={activePieIndex === undefined || activePieIndex === i ? 1 : 0.4} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    {activeEntry ? (
                      <>
                        <span className="text-[11px] text-muted-foreground">{getGroupEmoji(activeEntry.name)} {activeEntry.name}</span>
                        <span className="text-lg font-bold text-foreground tabular-nums">{fmt(activeEntry.value)}</span>
                        <span className="text-[10px] text-muted-foreground">{Math.round((activeEntry.value / totalMes) * 100)}%</span>
                      </>
                    ) : (
                      <>
                        <span className="text-[11px] text-muted-foreground">Total</span>
                        <span className="text-lg font-bold text-foreground tabular-nums">{fmt(totalMes)}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5 mt-3">
                  {composicao.map((c) => (
                    <div key={c.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: c.color }} />
                        <span className="text-[11px] text-foreground">{getGroupEmoji(c.name)} {c.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-foreground tabular-nums">{fmt(c.value)}</span>
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          {totalMes > 0 ? `${Math.round((c.value / totalMes) * 100)}%` : "0%"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Gastos por Subcategoria — Barras horizontais */}
            <section className="glass-card p-4 animate-fade-up" style={{ animationDelay: "0.15s" }}>
              <h2 className="text-sm font-semibold text-foreground mb-2">Gastos por Subcategoria</h2>

              <div className="flex gap-1.5 flex-wrap pb-3">
                {catFilterOptions.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => setSubcatCatFilter(opt.key)}
                    className={`px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all ${subcatCatFilter === opt.key ? "bg-foreground/10 text-foreground" : "bg-secondary/40 text-muted-foreground hover:text-foreground"}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {subcatData.length > 0 ? (
                <div className="space-y-2">
                  {subcatData.map((item) => {
                    const pct = subcatMax > 0 ? (item.value / subcatMax) * 100 : 0;
                    const pctTotal = subcatTotal > 0 ? Math.round((item.value / subcatTotal) * 100) : 0;
                    return (
                      <div key={item.name} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-foreground truncate flex-1 min-w-0">
                            {item.emoji} {item.name}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            <span className="text-[11px] font-semibold text-foreground tabular-nums">{fmt(item.value)}</span>
                            <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">{pctTotal}%</span>
                          </div>
                        </div>
                        <div className="relative w-full h-[8px] rounded-full bg-secondary/40 overflow-hidden">
                          <div
                            className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${pct}%`, background: item.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-6">Nenhum lançamento com subcategoria neste mês</p>
              )}
            </section>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default Graficos;
