import BottomNav from "@/components/BottomNav";
import EmptyState from "@/components/EmptyState";
import { useLancamentos } from "@/hooks/useLancamentos";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip,
  PieChart, Pie, Cell,
} from "recharts";
import { CalendarClock, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";

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

const Graficos = () => {
  const [selectedMonth, setSelectedMonth] = useState(1);
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
    const cats = [
      { name: "Fixas", key: "fixa", color: "hsl(var(--primary))" },
      { name: "Parceladas", key: "parcelada", color: "hsl(45 93% 58%)" },
      { name: "Extras", key: "extra", color: "hsl(var(--destructive))" },
      { name: "Pais", key: "pais", color: "hsl(200 80% 60%)" },
    ];
    return cats
      .map((c) => ({
        ...c,
        value: lancamentos
          .filter((l) => l.tipo === "despesa" && l.categoria === c.key)
          .reduce((s, l) => s + Number(l.valor), 0),
      }))
      .filter((c) => c.value > 0);
  }, [lancamentos]);

  const totalMes = composicao.reduce((s, c) => s + c.value, 0);

  const receitasDespesasChart = useMemo(() => [
    { mes: months[selectedMonth]?.label?.split(" ")[0] || "", receitas: totalReceitas, despesas: totalDespesas },
  ], [totalReceitas, totalDespesas, selectedMonth]);

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

            {/* Composição do mês */}
            {composicao.length > 0 && (
              <section className="glass-card p-4 animate-fade-up" style={{ animationDelay: "0.1s" }}>
                <h2 className="text-sm font-semibold text-foreground">Composição do Mês</h2>
                <p className="text-[11px] text-muted-foreground mb-4">{months[selectedMonth]?.label}</p>
                <div className="relative h-52 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={composicao} dataKey="value" innerRadius="60%" outerRadius="85%" paddingAngle={3} stroke="none">
                        {composicao.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmt(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[11px] text-muted-foreground">Total</span>
                    <span className="text-lg font-bold text-foreground tabular-nums">{fmt(totalMes)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-4 mt-2">
                  {composicao.map((c) => (
                    <div key={c.name} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ background: c.color }} />
                      <span className="text-[11px] text-muted-foreground">{c.name}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default Graficos;
