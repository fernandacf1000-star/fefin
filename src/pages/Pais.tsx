import BottomNav from "@/components/BottomNav";
import EmptyState from "@/components/EmptyState";
import {
  DollarSign,
  HandCoins,
  RefreshCw,
  Receipt,
  CreditCard,
  Banknote,
  ArrowDownLeft,
  ShoppingBag,
  Pill,
  Stethoscope,
  Car,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useState } from "react";

const paisData = {
  custoTotal: 3200,
  euPaguei: 2800,
  reembolsado: 1400,
  subsidioLiquido: 1400,
};

const historico = [
  { icon: Pill, label: "Farmácia Drogasil", method: "Cartão meu", value: 287.5, date: "08 Mar" },
  { icon: Stethoscope, label: "Consulta Dr. Silva", method: "Cartão dependente", value: 450, date: "06 Mar" },
  { icon: ShoppingBag, label: "Supermercado Extra", method: "Cartão meu", value: 312.8, date: "04 Mar" },
  { icon: ArrowDownLeft, label: "Reembolso plano saúde", method: "Reembolso recebido", value: -450, date: "03 Mar" },
  { icon: Car, label: "Uber - consulta médica", method: "Espécie", value: 42, date: "02 Mar" },
  { icon: Pill, label: "Farmácia Pague Menos", method: "Cartão meu", value: 156.9, date: "28 Fev" },
];

const chartData = [
  { mes: "Out", custoTotal: 2800, subsidio: 1200 },
  { mes: "Nov", custoTotal: 3100, subsidio: 1350 },
  { mes: "Dez", custoTotal: 3500, subsidio: 1600 },
  { mes: "Jan", custoTotal: 2900, subsidio: 1100 },
  { mes: "Fev", custoTotal: 3000, subsidio: 1300 },
  { mes: "Mar", custoTotal: 3200, subsidio: 1400 },
];

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const methodColor: Record<string, string> = {
  "Cartão meu": "text-destructive",
  "Cartão dependente": "text-yellow-400",
  "Espécie": "text-muted-foreground",
  "Reembolso recebido": "text-primary",
};

const methodIcon: Record<string, typeof CreditCard> = {
  "Cartão meu": CreditCard,
  "Cartão dependente": CreditCard,
  "Espécie": Banknote,
  "Reembolso recebido": ArrowDownLeft,
};

const months = [
  { label: "Fevereiro 2026", key: "2026-02" },
  { label: "Março 2026", key: "2026-03" },
  { label: "Abril 2026", key: "2026-04" },
];

const Pais = () => {
  const [selectedMonth, setSelectedMonth] = useState(1);

  const hasData = selectedMonth === 1;

  return (
    <div className="min-h-screen gradient-bg pb-24">
      <div className="max-w-md mx-auto px-4 pt-12">
        <h1 className="text-xl font-semibold text-foreground mb-4 animate-fade-up">
          Pais
        </h1>

        {/* Month Selector */}
        <div className="flex items-center justify-center gap-3 mb-5 animate-fade-up" style={{ animationDelay: "0.03s" }}>
          <button
            onClick={() => setSelectedMonth((p) => Math.max(0, p - 1))}
            disabled={selectedMonth === 0}
            className="p-1 rounded-full text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            {months.map((m, i) => (
              <button
                key={m.key}
                onClick={() => setSelectedMonth(i)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all whitespace-nowrap ${
                  i === selectedMonth
                    ? "gradient-emerald text-primary-foreground shadow-lg shadow-primary/20"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setSelectedMonth((p) => Math.min(months.length - 1, p + 1))}
            disabled={selectedMonth === months.length - 1}
            className="p-1 rounded-full text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {!hasData ? (
          <EmptyState title="Sem gastos com os pais esse mês 💚" />
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3 mb-6 animate-fade-up" style={{ animationDelay: "0.05s" }}>
              {[
                { icon: DollarSign, label: "Custo Total", value: paisData.custoTotal, color: "text-foreground" },
                { icon: HandCoins, label: "Eu Paguei", value: paisData.euPaguei, color: "text-destructive" },
                { icon: RefreshCw, label: "Reembolsado", value: paisData.reembolsado, color: "text-primary" },
                { icon: Receipt, label: "Meu Subsídio Líquido", value: paisData.subsidioLiquido, color: "text-yellow-400" },
              ].map((card) => (
                <div key={card.label} className="glass-card p-4">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center mb-2">
                    <card.icon size={16} className={card.color} />
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-1">{card.label}</p>
                  <p className={`text-lg font-bold ${card.color} tabular-nums`}>{fmt(card.value)}</p>
                </div>
              ))}
            </div>

            {/* Histórico */}
            <div className="mb-6 animate-fade-up" style={{ animationDelay: "0.1s" }}>
              <h2 className="text-sm font-semibold text-foreground mb-3">Histórico</h2>
              <div className="space-y-1">
                {historico.map((item, i) => {
                  const MethodIcon = methodIcon[item.method] || CreditCard;
                  return (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/30 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                        <item.icon size={18} className="text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.label}</p>
                        <div className="flex items-center gap-1.5">
                          <MethodIcon size={11} className={methodColor[item.method]} />
                          <p className={`text-[11px] ${methodColor[item.method]}`}>{item.method}</p>
                          <span className="text-[11px] text-muted-foreground">· {item.date}</span>
                        </div>
                      </div>
                      <p className={`text-sm font-semibold tabular-nums ${item.value < 0 ? "text-primary" : "text-foreground"}`}>
                        {item.value < 0 ? "+" : "-"}{fmt(Math.abs(item.value))}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chart */}
            <div className="glass-card p-4 mb-6 animate-fade-up" style={{ animationDelay: "0.15s" }}>
              <h2 className="text-sm font-semibold text-foreground mb-4">Custo Total vs Meu Subsídio</h2>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barGap={4}>
                    <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                      formatter={(value: number) => fmt(value)}
                    />
                    <Bar dataKey="custoTotal" name="Custo Total" fill="hsl(var(--muted-foreground))" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="subsidio" name="Meu Subsídio" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-4 mt-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm bg-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground">Custo Total</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm bg-primary" />
                  <span className="text-[11px] text-muted-foreground">Meu Subsídio</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Pais;
