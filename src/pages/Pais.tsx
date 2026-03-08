import BottomNav from "@/components/BottomNav";
import EmptyState from "@/components/EmptyState";
import { useLancamentos } from "@/hooks/useLancamentos";
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

const subcatLabels: Record<string, string> = {
  paguei_por_eles: "Paguei por eles",
  paguei_recebo_depois: "Paguei, recebo depois",
  eles_pagaram: "Eles pagaram",
  usaram_meu_cartao: "Usaram meu cartão",
};

const Pais = () => {
  const [selectedMonth, setSelectedMonth] = useState(1);
  const mesRef = months[selectedMonth]?.key;
  const { data: lancamentos = [], isLoading } = useLancamentos(mesRef);

  const paisDespesas = useMemo(() => lancamentos.filter((l) => l.tipo === "despesa" && l.categoria === "pais"), [lancamentos]);
  const reembolsos = useMemo(() => lancamentos.filter((l) => l.tipo === "receita" && l.categoria === "reembolso_pais"), [lancamentos]);

  const custoTotal = useMemo(() => paisDespesas.reduce((s, d) => s + Number(d.valor), 0), [paisDespesas]);
  const euPaguei = useMemo(() =>
    paisDespesas
      .filter((d) => d.subcategoria_pais === "paguei_por_eles" || d.subcategoria_pais === "paguei_recebo_depois")
      .reduce((s, d) => s + Number(d.valor), 0),
    [paisDespesas]
  );
  const reembolsado = useMemo(() => reembolsos.reduce((s, l) => s + Number(l.valor), 0), [reembolsos]);
  const subsidioLiquido = euPaguei - reembolsado;

  const historico = useMemo(() => {
    const all = [...paisDespesas, ...reembolsos].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    return all;
  }, [paisDespesas, reembolsos]);

  const hasData = historico.length > 0;

  return (
    <div className="min-h-screen gradient-bg overflow-x-hidden pb-[90px]">
      <div className="px-4 pt-12 w-full">
        <h1 className="text-xl font-semibold text-foreground mb-4 animate-fade-up">Pais</h1>

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
          <EmptyState title="Sem gastos com os pais esse mês 💚" />
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3 mb-6 animate-fade-up" style={{ animationDelay: "0.05s" }}>
              {[
                { icon: DollarSign, label: "Custo Total", value: custoTotal, color: "text-foreground" },
                { icon: HandCoins, label: "Eu Paguei", value: euPaguei, color: "text-destructive" },
                { icon: RefreshCw, label: "Reembolsado", value: reembolsado, color: "text-primary" },
                { icon: Receipt, label: "Meu Subsídio Líquido", value: subsidioLiquido, color: "text-yellow-400" },
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
                {historico.map((item) => {
                  const isReembolso = item.tipo === "receita";
                  const subLabel = item.subcategoria_pais ? subcatLabels[item.subcategoria_pais] || item.subcategoria_pais : (isReembolso ? "Reembolso recebido" : "");
                  return (
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/30 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                        {isReembolso ? <ArrowDownLeft size={18} className="text-primary" /> : <Receipt size={18} className="text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.descricao}</p>
                        <div className="flex items-center gap-1.5">
                          <p className={`text-[11px] ${isReembolso ? "text-primary" : "text-muted-foreground"}`}>{subLabel}</p>
                          <span className="text-[11px] text-muted-foreground">· {new Date(item.data + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>
                        </div>
                      </div>
                      <p className={`text-sm font-semibold tabular-nums ${isReembolso ? "text-primary" : "text-foreground"}`}>
                        {isReembolso ? "+" : "-"}{fmt(Number(item.valor))}
                      </p>
                    </div>
                  );
                })}
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
