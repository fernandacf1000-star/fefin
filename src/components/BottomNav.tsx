import { useState } from "react";
import { Home, Receipt, BarChart3, TrendingUp, Plus, Users, Percent, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import NewExpenseSheet from "./NewExpenseSheet";
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



  return (
    <>
      {/* Tablet sidebar */}
      <TabletSidebar
        onNewExpense={() => { setExpenseInitialTipo("despesa"); setExpenseOpen(true); }}
        onNewIncome={() => { setExpenseInitialTipo("receita"); setExpenseOpen(true); }}
      />

      {/* Mobile bottom nav - hidden on tablet+ */}
      <nav
        className="fixed bottom-0 left-1/2 -translate-x-1/2 z-50 w-full sm:max-w-[430px] bg-card/90 backdrop-blur-xl border-t border-border/30 md:hidden"
        style={{ paddingBottom: "calc(8px + env(safe-area-inset-bottom, 16px))" }}
      >
        <div className="flex justify-around items-center w-full px-0" style={{ padding: "8px 0" }}>
          {leftItems.map(renderItem)}
          <button
            onClick={() => { setExpenseInitialTipo("despesa"); setExpenseOpen(true); }}
            className="w-[52px] h-[52px] -mt-6 rounded-full gradient-emerald flex items-center justify-center shadow-lg shadow-primary/30 active:scale-95 transition-transform shrink-0"
          >
            <Plus size={24} className="text-primary-foreground" />
          </button>
          {rightItems.map(renderItem)}
        </div>
      </nav>



      <NewExpenseSheet open={expenseOpen} onClose={() => setExpenseOpen(false)} initialTipo={expenseInitialTipo} />
    </>
  );
};

export default BottomNav;
