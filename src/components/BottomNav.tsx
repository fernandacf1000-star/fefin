import { useState } from "react";
import { Home, Receipt, BarChart3, TrendingUp, Plus, Users } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import NewExpenseSheet from "./NewExpenseSheet";

const navItems = [
  { icon: Home, label: "Início", path: "/dashboard" },
  { icon: Receipt, label: "Despesas", path: "/despesas" },
  { type: "fab" as const },
  { icon: Users, label: "Pais", path: "/pais" },
  { icon: BarChart3, label: "Gráficos", path: "/graficos" },
  { icon: TrendingUp, label: "Patrimônio", path: "/patrimonio" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-xl border-t border-border/30 safe-bottom">
        <div className="max-w-md mx-auto flex items-center justify-around px-2 py-2">
          {navItems.map((item, i) => {
            if ("type" in item && item.type === "fab") {
              return (
                <button
                  key="fab"
                  onClick={() => setSheetOpen(true)}
                  className="w-14 h-14 -mt-7 rounded-full gradient-emerald flex items-center justify-center shadow-lg shadow-primary/30 active:scale-95 transition-transform"
                >
                  <Plus size={28} className="text-primary-foreground" />
                </button>
              );
            }
            const path = (item as any).path;
            const isActive = location.pathname === path;
            const Icon = (item as any).icon;
            return (
              <button
                key={(item as any).label}
                onClick={() => navigate(path)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                <span className="text-[10px] font-medium">{(item as any).label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <NewExpenseSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
};

export default BottomNav;
