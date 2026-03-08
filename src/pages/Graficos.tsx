import BottomNav from "@/components/BottomNav";
import EmptyState from "@/components/EmptyState";
import { useLancamentos } from "@/hooks/useLancamentos";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from "recharts";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";
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

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 12,
  fontSize: 12,
};

const SUBCAT_COLORS = [
  "#6366F1", "#F59E0B", "#3B82F6",
  "#10B981", "#EC4899", "#F97316",
  "#8B5CF6", "#14B8A6", "#EAB308",
  "#6D28D9", "#059669", "#DC2626",
];

const Graficos = () => {
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [subcatCatFilter, setSubcatCatFilter] = useState<string | null>(null);
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

  // Composição por categoria macro
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
        color: CAT_COLORS[name] || SUBCAT_COLORS[Object.keys(map).indexOf(name) % SUBCAT_COLORS.length],
      }))
      .filter(c => c.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [lancamentos]);

  const totalMes = composicao.reduce((s, c) => s + c.value, 0);

  // Subcategoria chart data
  const subcatData = useMemo(() => {
    let despesas = lancamentos.filter((l) => l.tipo === "despesa" && l.subcategoria);
    if (subcatCatFilter) {
      despesas = despesas.filter((l) => normalizeMacro(l.categoria_macro) === subcatCatFilter);
    }
    const map: Record<string, number> = {};
    despesas.forEach((d) => {
      const key = d.subcategoria!;
      map[key] = (map[key] || 0) + Number(d.valor);
    });
    return Object.entries(map)
      .map(([name, value], i) => ({ name, value, color: SUBCAT_COLORS[i % SUBCAT_COLORS.length] }))
      .sort((a, b) => b.value - a.value);
  }, [lancamentos, subcatCatFilter]);

  const subcatTotal = subcatData.reduce((s, c) => s + c.value, 0);

  const catFilterOptions = [
    { key: null, label: "Todas" },
    ...SUBCATEGORIA_GROUPS.map(g => ({ key: g.group, label: `${g.emoji} ${g.group}` })),
  ];

  const hasData = lancamentos.length > 0;

  return (
    <div className="min-h-screen gradient-bg overflow-x-hidden pb-[90px]">
      <div className="px-4 pt-12 space-y-6 w-full">
        <h1 className="text-xl font-semibold text-foreground animate-fade-up">Gráficos</h1>

        {/* Month Selector */}
        <div className="flex items-center justify-center gap-3 animate-fade-up" style={{ animationDelay: "0.03s" }}>
          <button onClick={() => setSelectedMonth((p) => Math.max(0, p - 1))} disabled={selectedMonth === 0} className="p-1 rounded-full text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
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
                      <Pie data={composicao} dataKey="value" innerRadius="60%" outerRadius="85%" paddingAngle={3} stroke="none" isAnimationActive={true}>
                        {composicao.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmt(v)} trigger="click" />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[11px] text-muted-foreground">Total</span>
                    <span className="text-lg font-bold text-foreground tabular-nums">{fmt(totalMes)}</span>
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

            {/* Gastos por Subcategoria */}
            <section className="glass-card p-4 animate-fade-up" style={{ animationDelay: "0.15s" }}>
              <h2 className="text-sm font-semibold text-foreground mb-2">Gastos por Subcategoria</h2>

              <div className="flex gap-1.5 overflow-x-auto pb-3 scrollbar-none">
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
                <>
                  <div className="relative h-52 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={subcatData} dataKey="value" innerRadius="60%" outerRadius="85%" paddingAngle={2} stroke="none">
                          {subcatData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmt(v)} trigger="click" />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[11px] text-muted-foreground">Total</span>
                      <span className="text-lg font-bold text-foreground tabular-nums">{fmt(subcatTotal)}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 mt-3">
                    {subcatData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: item.color }} />
                          <span className="text-[11px] text-foreground">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-foreground tabular-nums">{fmt(item.value)}</span>
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            {subcatTotal > 0 ? `${Math.round((item.value / subcatTotal) * 100)}%` : "0%"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
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
