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
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 overflow-hidden transition-all ${
          isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
        }`}
        style={{ textAlign: "center" }}
      >
        <Icon size={18} strokeWidth={isActive ? 2.5 : 1.5} className="shrink-0" />
        {isActive && (
          <span className="text-[9px] font-medium leading-tight truncate w-full text-center">{item.label}</span>
        )}
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
      <nav
        className="fixed bottom-0 left-1/2 -translate-x-1/2 z-50 w-full sm:max-w-[430px] bg-card/90 backdrop-blur-xl border-t border-border/30"
        style={{ paddingBottom: "calc(8px + env(safe-area-inset-bottom, 16px))" }}
      >
        <div className="grid grid-cols-7 items-center px-1 py-1.5 overflow-hidden">
          {leftItems.map(renderItem)}
          <button
            onClick={() => setSelectorOpen(true)}
            className="w-12 h-12 -mt-6 mx-auto rounded-full gradient-emerald flex items-center justify-center shadow-lg shadow-primary/30 active:scale-95 transition-transform shrink-0"
          >
            <Plus size={24} className="text-primary-foreground" />
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
