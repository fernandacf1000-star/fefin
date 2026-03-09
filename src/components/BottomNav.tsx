import { useState } from "react";
import { Home, Receipt, BarChart3, TrendingUp, Plus, Users, Percent, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import NewExpenseSheet from "./NewExpenseSheet";
import NewIncomeSheet from "./NewIncomeSheet";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { APP_VERSION } from "@/version";

const navItems = [
  { icon: Home, label: "Início", path: "/dashboard" },
  { icon: Receipt, label: "Transações", path: "/despesas" },
  { icon: Users, label: "Pais", path: "/pais" },
  { icon: Percent, label: "IR", path: "/ir" },
  { icon: BarChart3, label: "Gráficos", path: "/graficos" },
  { icon: TrendingUp, label: "Patrimônio", path: "/patrimonio" },
];

const leftItems = navItems.slice(0, 3);
const rightItems = navItems.slice(3);

/** Tablet sidebar (≥768px) */
const TabletSidebar = ({
  onNewExpense,
  onNewIncome,
}: {
  onNewExpense: () => void;
  onNewIncome: () => void;
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const { user } = useAuth();
  const nome = profile?.nome || profile?.full_name || "";

  return (
    <aside className="hidden md:flex flex-col w-[220px] shrink-0 border-r border-border/30 bg-card/50 backdrop-blur-xl h-screen fixed top-0 left-0 z-40">
      {/* User header */}
      <div className="px-4 pt-6 pb-4 border-b border-border/20">
        <p className="text-sm font-semibold text-foreground truncate">{nome || "FeFin"}</p>
        <p className="text-[10px] text-muted-foreground truncate">{user?.email || ""}</p>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                isActive
                  ? "gradient-emerald text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              )}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 1.5} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* New entry buttons */}
      <div className="px-3 pb-3 space-y-2">
        <button
          onClick={onNewExpense}
          className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20 transition-colors"
        >
          <ArrowDownLeft size={16} />
          <span>Nova despesa</span>
        </button>
        <button
          onClick={onNewIncome}
          className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
        >
          <ArrowUpRight size={16} />
          <span>Nova receita</span>
        </button>
      </div>

      {/* Version */}
      <div className="px-4 pb-4">
        <p className="text-[9px] text-muted-foreground">FeFin {APP_VERSION}</p>
      </div>
    </aside>
  );
};

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expenseInitialTipo, setExpenseInitialTipo] = useState<"despesa" | "receita">("despesa");

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
          <span className="leading-tight text-center w-full" style={{ fontSize: "9px", fontWeight: 500 }}>{item.label}</span>
        )}
      </button>
    );
  };

  const handleSelectExpense = () => {
    setSelectorOpen(false);
    setExpenseInitialTipo("despesa");
    setTimeout(() => setExpenseOpen(true), 200);
  };

  const handleSelectIncome = () => {
    setSelectorOpen(false);
    setExpenseInitialTipo("receita");
    setTimeout(() => setExpenseOpen(true), 200);
  };

  return (
    <>
      {/* Tablet sidebar */}
      <TabletSidebar
        onNewExpense={() => setExpenseOpen(true)}
        onNewIncome={() => setIncomeOpen(true)}
      />

      {/* Mobile bottom nav - hidden on tablet+ */}
      <nav
        className="fixed bottom-0 left-1/2 -translate-x-1/2 z-50 w-full sm:max-w-[430px] bg-card/90 backdrop-blur-xl border-t border-border/30 md:hidden"
        style={{ paddingBottom: "calc(8px + env(safe-area-inset-bottom, 16px))" }}
      >
        <div className="flex justify-around items-center w-full px-0" style={{ padding: "8px 0" }}>
          {leftItems.map(renderItem)}
          <button
            onClick={() => setSelectorOpen(true)}
            className="w-[52px] h-[52px] -mt-6 rounded-full gradient-emerald flex items-center justify-center shadow-lg shadow-primary/30 active:scale-95 transition-transform shrink-0"
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

      <NewExpenseSheet open={expenseOpen} onClose={() => setExpenseOpen(false)} initialTipo={expenseInitialTipo} />
    </>
  );
};

export default BottomNav;
