import BottomNav from "@/components/BottomNav";
import EmptyState from "@/components/EmptyState";
import { useLancamentos } from "@/hooks/useLancamentos";
import {
  Home,
  CreditCard,
  Gift,
  Users,
  CheckCircle2,
  Clock,
  Receipt,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState, useMemo } from "react";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const categories = ["Todas", "Fixas", "Parceladas", "Extras", "Pais"] as const;
type Category = (typeof categories)[number];

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

const catToFilter: Record<string, Category> = {
  fixa: "Fixas",
  parcelada: "Parceladas",
  extra: "Extras",
  pais: "Pais",
};

const Despesas = () => {
  const [activeFilter, setActiveFilter] = useState<Category>("Todas");
  const [selectedMonth, setSelectedMonth] = useState(1);

  const mesRef = months[selectedMonth]?.key;
  const { data: lancamentos = [], isLoading } = useLancamentos(mesRef);

  const despesas = useMemo(() => lancamentos.filter((l) => l.tipo === "despesa"), [lancamentos]);

  const fixas = useMemo(() => despesas.filter((d) => d.categoria === "fixa"), [despesas]);
  const parceladas = useMemo(() => despesas.filter((d) => d.categoria === "parcelada"), [despesas]);
  const extras = useMemo(() => despesas.filter((d) => d.categoria === "extra"), [despesas]);
  const pais = useMemo(() => despesas.filter((d) => d.categoria === "pais"), [despesas]);

  const paisTotals = useMemo(() => {
    const custoTotal = pais.reduce((s, d) => s + Number(d.valor), 0);
    const euPaguei = pais
      .filter((d) => d.subcategoria_pais === "paguei_por_eles" || d.subcategoria_pais === "paguei_recebo_depois")
      .reduce((s, d) => s + Number(d.valor), 0);
    const reembolsado = lancamentos
      .filter((l) => l.tipo === "receita" && l.categoria === "reembolso_pais")
      .reduce((s, l) => s + Number(l.valor), 0);
    return { custoTotal, euPaguei, reembolsado, subsidioLiquido: euPaguei - reembolsado };
  }, [pais, lancamentos]);

  const hasData = despesas.length > 0;
  const showSection = (cat: Category) => activeFilter === "Todas" || activeFilter === cat;

  return (
    <div className="min-h-screen gradient-bg overflow-x-hidden pb-[90px]">
      <div className="px-4 pt-12 w-full">
        <h1 className="text-xl font-semibold text-foreground mb-4 animate-fade-up">Despesas</h1>

        {/* Month Selector */}
        <div className="flex items-center justify-center gap-3 mb-5 animate-fade-up" style={{ animationDelay: "0.03s" }}>
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
          <EmptyState title="Nenhum gasto por aqui! 🎉" />
        ) : (
          <>
            {/* Filter Pills */}
            <div className="flex gap-2 overflow-x-auto pb-4 mb-4 animate-fade-up scrollbar-none" style={{ animationDelay: "0.05s" }}>
              {categories.map((cat) => (
                <button key={cat} onClick={() => setActiveFilter(cat)} className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${activeFilter === cat ? "gradient-emerald text-primary-foreground shadow-lg shadow-primary/20" : "bg-secondary/60 text-muted-foreground hover:bg-secondary"}`}>
                  {cat}
                </button>
              ))}
            </div>

            {/* Fixas */}
            {showSection("Fixas") && fixas.length > 0 && (
              <div className="mb-6 animate-fade-up" style={{ animationDelay: "0.1s" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Home size={14} className="text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">Contas Fixas</h2>
                </div>
                <div className="space-y-1">
                  {fixas.map((bill) => (
                    <div key={bill.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/30 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                        {bill.pago ? <CheckCircle2 size={18} className="text-primary" /> : <Clock size={18} className="text-yellow-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{bill.descricao}</p>
                        <p className="text-[11px] text-muted-foreground">
                          Vence {new Date(bill.data + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} · <span className={bill.pago ? "text-primary" : "text-yellow-400"}>{bill.pago ? "Pago" : "Pendente"}</span>
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-foreground tabular-nums">{fmt(Number(bill.valor))}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Parceladas */}
            {showSection("Parceladas") && parceladas.length > 0 && (
              <div className="mb-6 animate-fade-up" style={{ animationDelay: "0.15s" }}>
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard size={14} className="text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">Parceladas</h2>
                </div>
                <div className="space-y-1">
                  {parceladas.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/30 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                        <Receipt size={18} className="text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.descricao}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-[11px] text-muted-foreground">
                            {item.parcela_atual}/{item.parcela_total} parcelas
                          </p>
                          {item.parcela_atual === item.parcela_total && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/20 text-primary">Última!</span>
                          )}
                        </div>
                        {item.parcela_atual && item.parcela_total && (
                          <div className="w-full h-1 rounded-full bg-secondary/60 mt-1.5">
                            <div className="h-full rounded-full gradient-emerald" style={{ width: `${(item.parcela_atual / item.parcela_total) * 100}%` }} />
                          </div>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-foreground tabular-nums">{fmt(Number(item.valor))}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Extras */}
            {showSection("Extras") && extras.length > 0 && (
              <div className="mb-6 animate-fade-up" style={{ animationDelay: "0.2s" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Gift size={14} className="text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">Extras</h2>
                </div>
                <div className="space-y-1">
                  {extras.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/30 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                        <Gift size={18} className="text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.descricao}</p>
                        <p className="text-[11px] text-muted-foreground">{new Date(item.data + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</p>
                      </div>
                      <p className="text-sm font-semibold text-foreground tabular-nums">-{fmt(Number(item.valor))}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pais */}
            {showSection("Pais") && pais.length > 0 && (
              <div className="mb-6 animate-fade-up" style={{ animationDelay: "0.25s" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Users size={14} className="text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">Pais</h2>
                </div>
                <div className="glass-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-muted-foreground">Custo total com pais</p>
                    <p className="text-sm font-bold text-foreground tabular-nums">{fmt(paisTotals.custoTotal)}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-muted-foreground">Eu paguei</p>
                    <p className="text-sm font-semibold text-foreground tabular-nums">{fmt(paisTotals.euPaguei)}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-muted-foreground">Reembolsado</p>
                    <p className="text-sm font-semibold text-primary tabular-nums">+{fmt(paisTotals.reembolsado)}</p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border/30">
                    <p className="text-xs font-semibold text-muted-foreground">Subsídio líquido</p>
                    <p className="text-sm font-bold text-primary tabular-nums">{fmt(paisTotals.subsidioLiquido)}</p>
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
