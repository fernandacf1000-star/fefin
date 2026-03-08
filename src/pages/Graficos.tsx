import BottomNav from "@/components/BottomNav";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip,
  PieChart, Pie, Cell,
} from "recharts";
import { CalendarClock } from "lucide-react";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/* 1 — Receitas vs Despesas */
const receitasDespesas = [
  { mes: "Out", receitas: 8500, despesas: 6200 },
  { mes: "Nov", receitas: 8500, despesas: 6800 },
  { mes: "Dez", receitas: 9200, despesas: 7900 },
  { mes: "Jan", receitas: 8500, despesas: 6400 },
  { mes: "Fev", receitas: 8500, despesas: 6100 },
  { mes: "Mar", receitas: 8500, despesas: 6750 },
];

/* 2 — Composição do mês */
const composicao = [
  { name: "Fixas", value: 3002.23, color: "hsl(var(--primary))" },
  { name: "Parceladas", value: 1147.12, color: "hsl(45 93% 58%)" },
  { name: "Extras", value: 502.7, color: "hsl(var(--destructive))" },
];
const totalMes = composicao.reduce((s, c) => s + c.value, 0);

/* 3 — Projeção */
const projecao = [
  { mes: "Abril 2026", fixas: 3002, parceladas: 1013, total: 4015 },
  { mes: "Maio 2026", fixas: 3002, parceladas: 823, total: 3825 },
  { mes: "Junho 2026", fixas: 3002, parceladas: 489, total: 3491 },
];

/* 4 — Pais */
const paisChart = [
  { mes: "Out", custoTotal: 2800, subsidio: 1200 },
  { mes: "Nov", custoTotal: 3100, subsidio: 1350 },
  { mes: "Dez", custoTotal: 3500, subsidio: 1600 },
  { mes: "Jan", custoTotal: 2900, subsidio: 1100 },
  { mes: "Fev", custoTotal: 3000, subsidio: 1300 },
  { mes: "Mar", custoTotal: 3200, subsidio: 1400 },
];

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 12,
  fontSize: 12,
};

const Graficos = () => (
  <div className="min-h-screen gradient-bg pb-24">
    <div className="max-w-md mx-auto px-4 pt-12 space-y-6">
      <h1 className="text-xl font-semibold text-foreground animate-fade-up">Gráficos</h1>

      {/* 1 — Receitas vs Despesas */}
      <section className="glass-card p-4 animate-fade-up" style={{ animationDelay: "0.05s" }}>
        <h2 className="text-sm font-semibold text-foreground mb-4">Receitas vs Despesas</h2>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={receitasDespesas} barGap={4}>
              <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <YAxis hide />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "hsl(var(--foreground))" }} formatter={(v: number) => fmt(v)} />
              <Bar dataKey="receitas" name="Receitas" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              <Bar dataKey="despesas" name="Despesas" fill="hsl(var(--destructive))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-4 mt-3">
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-primary" /><span className="text-[11px] text-muted-foreground">Receitas</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-destructive" /><span className="text-[11px] text-muted-foreground">Despesas</span></div>
        </div>
      </section>

      {/* 2 — Composição do mês */}
      <section className="glass-card p-4 animate-fade-up" style={{ animationDelay: "0.1s" }}>
        <h2 className="text-sm font-semibold text-foreground">Composição do Mês</h2>
        <p className="text-[11px] text-muted-foreground mb-4">Março 2026</p>
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

      {/* 3 — Projeção */}
      <section className="glass-card p-4 animate-fade-up" style={{ animationDelay: "0.15s" }}>
        <div className="flex items-center gap-2 mb-4">
          <CalendarClock size={14} className="text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Projeção</h2>
        </div>
        <div className="space-y-3">
          {projecao.map((p) => (
            <div key={p.mes} className="flex items-center justify-between p-3 rounded-xl bg-secondary/30">
              <div>
                <p className="text-sm font-medium text-foreground">{p.mes}</p>
                <p className="text-[11px] text-muted-foreground">
                  Fixas {fmt(p.fixas)} · Parceladas {fmt(p.parceladas)}
                </p>
              </div>
              <p className="text-sm font-bold text-foreground tabular-nums">{fmt(p.total)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4 — Pais */}
      <section className="glass-card p-4 animate-fade-up" style={{ animationDelay: "0.2s" }}>
        <h2 className="text-sm font-semibold text-foreground mb-4">Pais — Custo vs Subsídio</h2>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={paisChart} barGap={4}>
              <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <YAxis hide />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "hsl(var(--foreground))" }} formatter={(v: number) => fmt(v)} />
              <Bar dataKey="custoTotal" name="Custo Total" fill="hsl(var(--muted-foreground))" radius={[6, 6, 0, 0]} />
              <Bar dataKey="subsidio" name="Meu Subsídio" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-4 mt-3">
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-muted-foreground" /><span className="text-[11px] text-muted-foreground">Custo Total</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-primary" /><span className="text-[11px] text-muted-foreground">Meu Subsídio</span></div>
        </div>
      </section>
    </div>
    <BottomNav />
  </div>
);

export default Graficos;
