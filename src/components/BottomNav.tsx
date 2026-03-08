import { useState } from "react";
import { Home, Receipt, BarChart3, TrendingUp, Plus, Users, Percent } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import NewExpenseSheet from "./NewExpenseSheet";

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
  const [sheetOpen, setSheetOpen] = useState(false);

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

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-xl border-t border-border/30 safe-bottom">
        <div className="max-w-md mx-auto flex items-center justify-around px-2 py-2">
          {leftItems.map(renderItem)}
          <button
            onClick={() => setSheetOpen(true)}
            className="w-14 h-14 -mt-7 rounded-full gradient-emerald flex items-center justify-center shadow-lg shadow-primary/30 active:scale-95 transition-transform"
          >
            <Plus size={28} className="text-primary-foreground" />
          </button>
          {rightItems.map(renderItem)}
        </div>
      </nav>

      <NewExpenseSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
};

export default BottomNav;
