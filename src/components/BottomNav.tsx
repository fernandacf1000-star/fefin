import { useState } from "react";
import { Home, Receipt, BarChart3, TrendingUp, Plus, Users, Percent, ArrowDownLeft, ArrowUpRight, Sparkles, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import NewExpenseSheet from "./NewExpenseSheet";
import QuickEntrySheet from "./QuickEntrySheet";
import SmartImportSheet from "./SmartImportSheet";
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
  onQuickEntry,
  onSmartImport,
}: {
  onNewExpense: () => void;
  onNewIncome: () => void;
  onQuickEntry: () => void;
  onSmartImport: () => void;
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const { user } = useAuth();
  const nome = profile?.nome || profile?.full_name || "";

  return (
    <aside className="hidden md:flex flex-col w-[220px] shrink-0 border-r border-border bg-white h-screen fixed top-0 left-0 z-40">
      {/* User header */}
      <div className="px-4 pt-6 pb-4 border-b border-border">
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
                  ? "gradient-emerald text-[#7C5BBF]-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
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
          className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl bg-[#7C5BBF]/10 text-[#7C5BBF] text-sm font-medium hover:bg-[#7C5BBF]/20 transition-colors"
        >
          <ArrowUpRight size={16} />
          <span>Nova receita</span>
        </button>
        <button
          onClick={onSmartImport}
          className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
        >
          <Sparkles size={16} />
          <span>Importar notificação</span>
        </button>
        <button
          onClick={onQuickEntry}
          className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl bg-[#6366F1]/10 text-[#6366F1] text-sm font-medium hover:bg-[#6366F1]/20 transition-colors"
        >
          <span className="text-base">⚡</span>
          <span>Entrada rápida</span>
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
  const [quickEntryOpen, setQuickEntryOpen] = useState(false);
  const [smartImportOpen, setSmartImportOpen] = useState(false);
  const [expenseInitialTipo, setExpenseInitialTipo] = useState<"despesa" | "receita">("despesa");
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);

  const handlePlusOption = (fn: () => void) => {
    setPlusMenuOpen(false);
    fn();
  };

  const renderItem = (item: { icon: any; label: string; path: string }) => {
    const isActive = location.pathname === item.path;
    const Icon = item.icon;
    return (
      <button
        key={item.label}
        onClick={() => navigate(item.path)}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 h-12 overflow-hidden transition-all ${
          isActive ? "text-[#7C5BBF]" : "text-muted-foreground/50 hover:text-foreground"
        }`}
        style={{ textAlign: "center" }}
      >
        <Icon size={18} strokeWidth={isActive ? 2.5 : 1.5} className="shrink-0" />
        <span
          className="leading-tight text-center w-full transition-all"
          style={{
            fontSize: "9px",
            fontWeight: 500,
            opacity: isActive ? 1 : 0,
            height: isActive ? "auto" : 0,
            overflow: "hidden",
          }}
        >
          {item.label}
        </span>
      </button>
    );
  };

  return (
    <>
      {/* Tablet sidebar */}
      <TabletSidebar
        onNewExpense={() => { setExpenseInitialTipo("despesa"); setExpenseOpen(true); }}
        onNewIncome={() => { setExpenseInitialTipo("receita"); setExpenseOpen(true); }}
        onQuickEntry={() => setQuickEntryOpen(true)}
        onSmartImport={() => setSmartImportOpen(true)}
      />

      {/* Plus menu overlay */}
      {plusMenuOpen && (
        <div
          className="fixed inset-0 z-[55] bg-black/20 backdrop-blur-sm md:hidden"
          onClick={() => setPlusMenuOpen(false)}
        />
      )}

      {/* Plus menu popup */}
      <div
        className={cn(
          "fixed z-[56] left-1/2 -translate-x-1/2 md:hidden transition-all duration-200",
          plusMenuOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none translate-y-2"
        )}
        style={{ bottom: "calc(80px + env(safe-area-inset-bottom, 16px))" }}
      >
        <div className="flex flex-col items-center gap-2 bg-white rounded-3xl shadow-2xl border border-border px-4 py-3 min-w-[220px]">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Nova entrada</p>

          {/* Importar notificação */}
          <button
            onClick={() => handlePlusOption(() => setSmartImportOpen(true))}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-primary/8 hover:bg-primary/15 transition-colors"
          >
            <div className="w-9 h-9 rounded-full gradient-emerald flex items-center justify-center shrink-0">
              <Sparkles size={16} className="text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">Importar notificação</p>
              <p className="text-[10px] text-muted-foreground">Cole SMS ou tire foto</p>
            </div>
          </button>

          <div className="w-full h-px bg-border/60" />

          {/* Despesa manual */}
          <button
            onClick={() => handlePlusOption(() => { setExpenseInitialTipo("despesa"); setExpenseOpen(true); })}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl hover:bg-secondary transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <ArrowDownLeft size={15} className="text-red-500" />
            </div>
            <p className="text-sm font-medium text-foreground">Despesa manual</p>
          </button>

          {/* Receita manual */}
          <button
            onClick={() => handlePlusOption(() => { setExpenseInitialTipo("receita"); setExpenseOpen(true); })}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl hover:bg-secondary transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <ArrowUpRight size={15} className="text-green-500" />
            </div>
            <p className="text-sm font-medium text-foreground">Receita manual</p>
          </button>
        </div>

        {/* Seta apontando para o botão + */}
        <div className="flex justify-center mt-1">
          <div className="w-3 h-3 bg-white border-b border-r border-border rotate-45 -mt-2" />
        </div>
      </div>

      {/* Mobile bottom nav - hidden on tablet+ */}
      <nav
        className="fixed bottom-0 left-1/2 -translate-x-1/2 z-50 w-full sm:max-w-[430px] border-t md:hidden"
        style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderColor: "#DDE3EE", paddingBottom: "calc(8px + env(safe-area-inset-bottom, 16px))" }}
      >
        <div className="flex justify-around items-center w-full px-0" style={{ padding: "8px 0" }}>
          {leftItems.map(renderItem)}
          <button
            onClick={() => setPlusMenuOpen(v => !v)}
            className={cn(
              "w-[52px] h-[52px] -mt-6 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all shrink-0",
              plusMenuOpen ? "bg-muted" : "gradient-emerald"
            )}
            style={{ boxShadow: plusMenuOpen ? "none" : "0 4px 16px rgba(99,102,241,0.4)" }}
          >
            {plusMenuOpen
              ? <X size={22} className="text-muted-foreground" />
              : <Plus size={24} className="text-white" />
            }
          </button>
          {rightItems.map(renderItem)}
        </div>
      </nav>

      <QuickEntrySheet open={quickEntryOpen} onClose={() => setQuickEntryOpen(false)} />
      <NewExpenseSheet open={expenseOpen} onClose={() => setExpenseOpen(false)} initialTipo={expenseInitialTipo} />
      <SmartImportSheet open={smartImportOpen} onClose={() => setSmartImportOpen(false)} />
    </>
  );
};

export default BottomNav;
