import BottomNav from "@/components/BottomNav";
import EmptyState from "@/components/EmptyState";
import {
  Home,
  CreditCard,
  Gift,
  Users,
  CheckCircle2,
  Clock,
  DollarSign,
  HandCoins,
  Receipt,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

const categories = ["Todas", "Fixas", "Parceladas", "Extras", "Pais"] as const;
type Category = (typeof categories)[number];

const months = [
  { label: "Fevereiro 2026", key: "2026-02" },
  { label: "Março 2026", key: "2026-03" },
  { label: "Abril 2026", key: "2026-04" },
];
const currentMonthIndex = 1; // Março

const fixedBills = [
  { label: "Aluguel", value: 1800, dueDay: 10, paid: true },
  { label: "Condomínio", value: 650, dueDay: 10, paid: true },
  { label: "Internet", value: 119.9, dueDay: 15, paid: false },
  { label: "Energia", value: 187.43, dueDay: 18, paid: false },
  { label: "Academia", value: 189, dueDay: 20, paid: false },
  { label: "Streaming", value: 55.9, dueDay: 22, paid: true },
];

const installments = [
  { label: "iPhone 15", total: 12, current: 4, value: 524.92 },
  { label: "Sofá Tok&Stok", total: 10, current: 7, value: 289.9 },
  { label: "Curso de inglês", total: 6, current: 2, value: 199 },
  { label: "Air Fryer", total: 3, current: 3, value: 133.3 },
];

const extras = [
  { label: "Zara", value: 289.9, date: "08 Mar" },
  { label: "Starbucks", value: 27.5, date: "08 Mar" },
  { label: "iFood", value: 62.9, date: "07 Mar" },
  { label: "Uber", value: 34.8, date: "07 Mar" },
  { label: "Farmácia", value: 87.6, date: "05 Mar" },
];

const paisData = {
  custoTotal: 3200,
  euPaguei: 2800,
  reembolsado: 1400,
  subsidioLiquido: 1400,
};

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const Despesas = () => {
  const [activeFilter, setActiveFilter] = useState<Category>("Todas");
  const [selectedMonth, setSelectedMonth] = useState(currentMonthIndex);

  const hasData = selectedMonth === 1; // Only March has data

  const showSection = (cat: Category) =>
    activeFilter === "Todas" || activeFilter === cat;

  return (
    <div className="min-h-screen gradient-bg overflow-x-hidden" style={{ paddingBottom: "calc(80px + env(safe-area-inset-bottom, 16px))" }}>
      <div className="max-w-md mx-auto px-4 pt-12 w-full">
        {/* Header */}
        <h1 className="text-xl font-semibold text-foreground mb-4 animate-fade-up">
          Despesas
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
          <EmptyState title="Nenhum gasto por aqui! 🎉" />
        ) : (
          <>
            {/* Filter Pills */}
            <div className="flex gap-2 overflow-x-auto pb-4 mb-4 animate-fade-up scrollbar-none" style={{ animationDelay: "0.05s" }}>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveFilter(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    activeFilter === cat
                      ? "gradient-emerald text-primary-foreground shadow-lg shadow-primary/20"
                      : "bg-secondary/60 text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Fixas */}
            {showSection("Fixas") && (
              <div className="mb-6 animate-fade-up" style={{ animationDelay: "0.1s" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Home size={14} className="text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">Contas Fixas</h2>
                </div>
                <div className="space-y-1">
                  {fixedBills.map((bill) => (
                    <div
                      key={bill.label}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/30 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                        {bill.paid ? (
                          <CheckCircle2 size={18} className="text-primary" />
                        ) : (
                          <Clock size={18} className="text-yellow-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {bill.label}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Vence dia {bill.dueDay} ·{" "}
                          <span
                            className={
                              bill.paid ? "text-primary" : "text-yellow-400"
                            }
                          >
                            {bill.paid ? "Pago" : "Pendente"}
                          </span>
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-foreground tabular-nums">
                        {fmt(bill.value)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Parceladas */}
            {showSection("Parceladas") && (
              <div className="mb-6 animate-fade-up" style={{ animationDelay: "0.15s" }}>
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard size={14} className="text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">Parceladas</h2>
                </div>
                <div className="space-y-1">
                  {installments.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/30 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                        <Receipt size={18} className="text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {item.label}
                        </p>
                        <div className="flex items-center gap-2">
                          <p className="text-[11px] text-muted-foreground">
                            {item.current}/{item.total} parcelas
                          </p>
                          {item.current === item.total && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                              Última!
                            </span>
                          )}
                        </div>
                        <div className="w-full h-1 rounded-full bg-secondary/60 mt-1.5">
                          <div
                            className="h-full rounded-full gradient-emerald"
                            style={{
                              width: `${(item.current / item.total) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-foreground tabular-nums">
                        {fmt(item.value)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Extras */}
            {showSection("Extras") && (
              <div className="mb-6 animate-fade-up" style={{ animationDelay: "0.2s" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Gift size={14} className="text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">Extras</h2>
                </div>
                <div className="space-y-1">
                  {extras.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/30 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                        <Gift size={18} className="text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {item.label}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {item.date}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-foreground tabular-nums">
                        -{fmt(item.value)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pais */}
            {showSection("Pais") && (
              <div className="mb-6 animate-fade-up" style={{ animationDelay: "0.25s" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Users size={14} className="text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">Pais</h2>
                </div>
                <div className="glass-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-muted-foreground">Custo total com pais</p>
                    <p className="text-sm font-bold text-foreground tabular-nums">{fmt(paisData.custoTotal)}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-muted-foreground">Eu paguei</p>
                    <p className="text-sm font-semibold text-foreground tabular-nums">{fmt(paisData.euPaguei)}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-muted-foreground">Reembolsado</p>
                    <p className="text-sm font-semibold text-primary tabular-nums">+{fmt(paisData.reembolsado)}</p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border/30">
                    <p className="text-xs font-semibold text-muted-foreground">Subsídio líquido</p>
                    <p className="text-sm font-bold text-primary tabular-nums">{fmt(paisData.subsidioLiquido)}</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Despesas;
