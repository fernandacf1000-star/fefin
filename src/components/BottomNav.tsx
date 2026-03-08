import { useState } from "react";
import { Home, Receipt, BarChart3, TrendingUp, Plus, Users, Percent, ArrowDownLeft, ArrowUpRight, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import NewExpenseSheet from "./NewExpenseSheet";
import NewIncomeSheet from "./NewIncomeSheet";

const leftItems = [
  { icon: Home, label: "Início", path: "/dashboard" },
  { icon: Receipt, label: "Despesas", path: "/despesas" },
  { icon: Users, label: "Pais", path: "/pais" },
];

const rightItems = [
  { icon: Percent, label: "IR", path: "/ir" },
  { icon: BarChart3, label: "Gráficos", path: "/graficos" },
  { icon: TrendingUp, label: "Patrimônio", path: "/patrimonio" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [incomeOpen, setIncomeOpen] = useState(false);

  const renderItem = (item: { icon: any; label: string; path: string }) => {
    const isActive = location.pathname === item.path;
    const Icon = item.icon;
    return (
      <button
        key={item.label}
        onClick={() => navigate(item.path)}
        className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
          isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
        <span className="text-[10px] font-medium">{item.label}</span>
      </button>
    );
  };

  const handleSelectExpense = () => {
    setSelectorOpen(false);
    setTimeout(() => setExpenseOpen(true), 200);
  };

  const handleSelectIncome = () => {
    setSelectorOpen(false);
    setTimeout(() => setIncomeOpen(true), 200);
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-xl border-t border-border/30 safe-bottom">
        <div className="max-w-md mx-auto flex items-center justify-around px-2 py-2">
          {leftItems.map(renderItem)}
          <button
            onClick={() => setSelectorOpen(true)}
            className="w-14 h-14 -mt-7 rounded-full gradient-emerald flex items-center justify-center shadow-lg shadow-primary/30 active:scale-95 transition-transform"
          >
            <Plus size={28} className="text-primary-foreground" />
          </button>
          {rightItems.map(renderItem)}
        </div>
      </nav>

      {/* Selector bottom sheet */}
      <div
        className={cn(
          "fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm transition-opacity duration-300",
          selectorOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setSelectorOpen(false)}
      />
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-[70] rounded-t-[28px] transition-transform duration-300 ease-out",
          selectorOpen ? "translate-y-0" : "translate-y-full"
        )}
        style={{ background: "#1a1a2e" }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>
        <div className="px-5 pb-8 space-y-5">
          <p className="text-center text-base font-bold text-white">O que deseja registrar?</p>
          <div className="grid grid-cols-2 gap-3">
            {/* Despesa */}
            <button
              onClick={handleSelectExpense}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-card/60 border border-border/30 active:scale-[0.97] transition-transform"
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "rgba(248,113,113,0.12)" }}>
                <ArrowDownLeft size={24} style={{ color: "#F87171" }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-white">Despesa</p>
                <p className="text-xs mt-0.5" style={{ color: "#475569" }}>Fixa, parcelada, extra ou pais</p>
              </div>
            </button>

            {/* Receita */}
            <button
              onClick={handleSelectIncome}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-card/60 border border-border/30 active:scale-[0.97] transition-transform"
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "rgba(16,185,129,0.12)" }}>
                <ArrowUpRight size={24} style={{ color: "#10B981" }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-white">Receita</p>
                <p className="text-xs mt-0.5" style={{ color: "#475569" }}>Salário, reembolso ou extra</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      <NewExpenseSheet open={expenseOpen} onClose={() => setExpenseOpen(false)} />
      <NewIncomeSheet open={incomeOpen} onClose={() => setIncomeOpen(false)} />
    </>
  );
};

export default BottomNav;
