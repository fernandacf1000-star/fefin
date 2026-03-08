import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useLancamentos } from "@/hooks/useLancamentos";
import {
  Eye,
  EyeOff,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Coffee,
  Zap,
  Car,
  Utensils,
  Heart,
  CalendarClock,
  Home,
  CreditCard,
  Users,
  ChevronLeft,
  ChevronRight,
  Settings,
  LogOut,
  Receipt,
} from "lucide-react";
import EmptyState from "@/components/EmptyState";

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

const categoryIconMap: Record<string, any> = {
  fixa: Home,
  parcelada: CreditCard,
  extra: Zap,
  pais: Users,
};

const MascotHead = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="8 5 84 80" fill="none">
    <ellipse cx="50" cy="42" rx="34" ry="36" fill="#2C1810"/>
    <path d="M74 45 Q88 55 85 80 Q82 95 75 100 Q80 80 76 65 Q74 55 74 45Z" fill="#2C1810"/>
    <path d="M26 45 Q12 58 15 82 Q18 96 24 100 Q20 80 24 65 Q26 55 26 45Z" fill="#2C1810"/>
    <ellipse cx="50" cy="50" rx="28" ry="30" fill="#FDDBB4"/>
    <ellipse cx="50" cy="18" rx="16" ry="10" fill="#2C1810"/>
    <ellipse cx="50" cy="16" rx="10" ry="7" fill="#3D2314"/>
    <path d="M32 40 Q39 36 44 39" stroke="#2C1810" strokeWidth="3" strokeLinecap="round" fill="none"/>
    <path d="M56 39 Q61 36 68 40" stroke="#2C1810" strokeWidth="3" strokeLinecap="round" fill="none"/>
    <ellipse cx="38" cy="47" rx="5" ry="5.5" fill="white"/>
    <ellipse cx="62" cy="47" rx="5" ry="5.5" fill="white"/>
    <ellipse cx="38.5" cy="47.5" rx="3.5" ry="4" fill="#3D2314"/>
    <ellipse cx="62.5" cy="47.5" rx="3.5" ry="4" fill="#3D2314"/>
    <circle cx="40" cy="46" r="1.2" fill="white"/>
    <circle cx="64" cy="46" r="1.2" fill="white"/>
    <path d="M48 56 Q50 59 52 56" stroke="#C68642" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    <path d="M38 63 Q50 72 62 63" stroke="#C68642" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
    <ellipse cx="30" cy="60" rx="7" ry="4" fill="#FFB3A7" opacity="0.5"/>
    <ellipse cx="70" cy="60" rx="7" ry="4" fill="#FFB3A7" opacity="0.5"/>
    <circle cx="22" cy="56" r="4" fill="#F7D070"/>
    <circle cx="78" cy="56" r="4" fill="#F7D070"/>
    <line x1="22" y1="50" x2="22" y2="48" stroke="#F7D070" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="22" y1="62" x2="22" y2="64" stroke="#F7D070" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="16" y1="56" x2="14" y2="56" stroke="#F7D070" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="28" y1="56" x2="30" y2="56" stroke="#F7D070" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="78" y1="50" x2="78" y2="48" stroke="#F7D070" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="78" y1="62" x2="78" y2="64" stroke="#F7D070" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="72" y1="56" x2="70" y2="56" stroke="#F7D070" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="84" y1="56" x2="86" y2="56" stroke="#F7D070" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const txIcon = (categoria: string) => {
  const map: Record<string, any> = {
    fixa: Home, parcelada: CreditCard, extra: ShoppingBag, pais: Users,
    salario: TrendingUp, reembolso_pais: Users, renda_extra: Receipt, outros: Receipt,
  };
  return map[categoria] || Receipt;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { data: profile } = useProfile();
  const [showBalance, setShowBalance] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [profileOpen, setProfileOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const mesRef = months[selectedMonth]?.key;
  const { data: lancamentos = [], isLoading } = useLancamentos(mesRef);

  const receitas = useMemo(() => lancamentos.filter((l) => l.tipo === "receita"), [lancamentos]);
  const despesas = useMemo(() => lancamentos.filter((l) => l.tipo === "despesa"), [lancamentos]);

  const totalReceitas = useMemo(() => receitas.reduce((s, l) => s + Number(l.valor), 0), [receitas]);
  const totalDespesas = useMemo(() => despesas.reduce((s, l) => s + Number(l.valor), 0), [despesas]);
  const saldo = totalReceitas - totalDespesas;

  const categoryTotals = useMemo(() => {
    const cats = ["fixa", "parcelada", "extra", "pais"];
    return cats.map((cat) => ({
      key: cat,
      label: cat === "fixa" ? "Fixas" : cat === "parcelada" ? "Parceladas" : cat === "extra" ? "Extras" : "Pais",
      icon: categoryIconMap[cat] || Receipt,
      color: cat === "pais" ? "text-primary" : cat === "extra" ? "text-destructive" : cat === "parcelada" ? "text-[#F59E0B]" : "text-primary",
      value: despesas.filter((d) => d.categoria === cat).reduce((s, d) => s + Number(d.valor), 0),
    }));
  }, [despesas]);

  const upcomingBills = useMemo(() => {
    const today = new Date();
    return despesas
      .filter((d) => (d.categoria === "fixa" || d.categoria === "parcelada") && !d.pago)
      .map((d) => {
        const dt = new Date(d.data + "T12:00:00");
        const daysLeft = Math.max(0, Math.ceil((dt.getTime() - today.getTime()) / 86400000));
        return { ...d, daysLeft, dateStr: dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 5);
  }, [despesas]);

  const recentTransactions = useMemo(() => lancamentos.slice(0, 7), [lancamentos]);

  const healthScore = useMemo(() => {
    if (totalReceitas === 0) return 0;
    const ratio = 1 - totalDespesas / totalReceitas;
    return Math.min(100, Math.max(0, Math.round(ratio * 100)));
  }, [totalReceitas, totalDespesas]);

  const nome = profile?.nome || profile?.full_name || "";
  const email = profile?.email || user?.email || "";

  const handleLogout = async () => {
    setConfirmLogout(false);
    await signOut();
    navigate("/");
  };

  const hasData = lancamentos.length > 0;

  return (
    <div className="min-h-screen gradient-bg overflow-x-hidden pb-[90px]">
      <div className="px-4 pt-12 w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 animate-fade-up">
          <div>
            <p className="text-muted-foreground text-sm">Olá,</p>
            <h1 className="text-xl font-semibold text-foreground">{nome ? `${nome} ✨` : "✨"}</h1>
          </div>
          <button onClick={() => setProfileOpen(true)} className="w-[44px] h-[44px] rounded-full flex items-center justify-center overflow-hidden" style={{ background: "#1a1a2e", border: "2px solid #10B981" }}>
            <MascotHead size={36} />
          </button>
        </div>

        {/* Month Selector */}
        <div className="flex items-center justify-center gap-3 mb-6 animate-fade-up" style={{ animationDelay: "0.03s" }}>
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

        {/* Balance Card */}
        <div className="glass-card p-5 mb-6 animate-fade-up" style={{ animationDelay: "0.1s" }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Saldo disponível</span>
            <button onClick={() => setShowBalance(!showBalance)} className="text-muted-foreground p-1">
              {showBalance ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </div>
          <p className="text-3xl font-bold text-foreground tracking-tight">
            {showBalance ? fmt(saldo) : "••••••"}
          </p>
          <div className="flex gap-3 mt-5">
            <div className="flex-1 bg-secondary/60 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp size={14} className="text-primary" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Receitas</span>
              </div>
              <p className="text-sm font-semibold text-foreground">{showBalance ? fmt(totalReceitas) : "••••"}</p>
            </div>
            <div className="flex-1 bg-secondary/60 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingDown size={14} className="text-destructive" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Despesas</span>
              </div>
              <p className="text-sm font-semibold text-foreground">{showBalance ? fmt(totalDespesas) : "••••"}</p>
            </div>
          </div>
        </div>

        {!hasData && !isLoading ? (
          <EmptyState title="Adicione seu primeiro lançamento! 🚀" />
        ) : (
          <>
            {/* Financial Health Gauge */}
            <div className="glass-card p-5 mb-6 animate-fade-up" style={{ animationDelay: "0.15s" }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-foreground">Saúde financeira</span>
                <span className="text-xs text-primary font-semibold">{healthScore}%</span>
              </div>
              <div className="relative w-full h-3 rounded-full bg-secondary/60 overflow-hidden">
                <div className="absolute inset-y-0 left-0 rounded-full gradient-emerald transition-all duration-700" style={{ width: `${healthScore}%` }} />
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                {healthScore >= 70 ? "Seu controle financeiro está bom! Continue assim 💚" : healthScore >= 40 ? "Atenção com os gastos este mês ⚠️" : "Seus gastos estão acima das receitas 🚨"}
              </p>
            </div>

            {/* Category Summary Cards */}
            <div className="grid grid-cols-2 gap-3 mb-6 animate-fade-up" style={{ animationDelay: "0.2s" }}>
              {categoryTotals.map((cat) => (
                <div key={cat.key} className="glass-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <cat.icon size={16} className={cat.color} />
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">{cat.label}</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {showBalance ? fmt(cat.value) : "••••"}
                  </p>
                </div>
              ))}
            </div>

            {/* Upcoming Bills */}
            {upcomingBills.length > 0 && (
              <div className="animate-fade-up mb-6" style={{ animationDelay: "0.25s" }}>
                <div className="flex items-center gap-1.5 mb-3">
                  <CalendarClock size={14} className="text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">Próximos vencimentos</h2>
                </div>
                <div className="space-y-1">
                  {upcomingBills.map((bill) => {
                    const Icon = txIcon(bill.categoria);
                    return (
                      <div key={bill.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/30 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                          <Icon size={18} className="text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{bill.descricao}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-[11px] text-muted-foreground">{bill.dateStr}</p>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${bill.daysLeft <= 2 ? "bg-destructive/20 text-destructive" : bill.daysLeft <= 7 ? "bg-yellow-500/20 text-yellow-400" : "bg-secondary text-muted-foreground"}`}>
                              {bill.daysLeft <= 2 ? "Urgente" : `${bill.daysLeft} dias`}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-foreground tabular-nums">
                          {showBalance ? fmt(Number(bill.valor)) : "••••"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Transactions */}
            {recentTransactions.length > 0 && (
              <div className="animate-fade-up" style={{ animationDelay: "0.3s" }}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-foreground">Últimas transações</h2>
                </div>
                <div className="space-y-1">
                  {recentTransactions.map((tx) => {
                    const Icon = txIcon(tx.categoria);
                    const val = Number(tx.valor);
                    const isReceita = tx.tipo === "receita";
                    return (
                      <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/30 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                          <Icon size={18} className="text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{tx.descricao}</p>
                          <p className="text-[11px] text-muted-foreground">{tx.categoria} · {new Date(tx.data + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</p>
                        </div>
                        <p className={`text-sm font-semibold tabular-nums ${isReceita ? "text-primary" : "text-foreground"}`}>
                          {isReceita ? "+" : "-"}{fmt(val)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Profile Bottom Sheet */}
      <div className={`fixed inset-0 z-[60] bg-background/60 backdrop-blur-sm transition-opacity duration-300 ${profileOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`} onClick={() => setProfileOpen(false)} />
      <div className={`fixed inset-x-0 bottom-0 z-[70] transition-transform duration-300 ease-out ${profileOpen ? "translate-y-0" : "translate-y-full"}`} style={{ background: "#1a1a2e", borderRadius: "24px 24px 0 0" }}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>
        <div className="px-5 pb-8">
          <div className="flex items-center gap-3 pb-4">
            <div className="w-[40px] h-[40px] rounded-full flex items-center justify-center overflow-hidden shrink-0" style={{ background: "#1a1a2e", border: "2px solid #10B981" }}>
              <MascotHead size={28} />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Olá, {nome}</p>
              <p className="text-xs" style={{ color: "#475569" }}>{email}</p>
            </div>
          </div>
          <div className="h-px bg-border/30 mb-2" />
          <button onClick={() => { setProfileOpen(false); navigate("/conta"); }} className="flex items-center gap-3 w-full px-2 py-3.5 rounded-xl hover:bg-secondary/30 transition-colors">
            <Settings size={18} className="text-foreground" />
            <span className="text-sm font-medium text-foreground">Minha conta</span>
          </button>
          <button onClick={() => { setProfileOpen(false); setConfirmLogout(true); }} className="flex items-center gap-3 w-full px-2 py-3.5 rounded-xl hover:bg-secondary/30 transition-colors">
            <LogOut size={18} style={{ color: "#F87171" }} />
            <span className="text-sm font-medium" style={{ color: "#F87171" }}>Sair</span>
          </button>
        </div>
      </div>

      {/* Logout Confirmation */}
      {confirmLogout && (
        <>
          <div className="fixed inset-0 z-[80] bg-background/70 backdrop-blur-sm" onClick={() => setConfirmLogout(false)} />
          <div className="fixed inset-0 z-[90] flex items-center justify-center px-8">
            <div className="w-full max-w-xs rounded-2xl p-6 space-y-4" style={{ background: "#1a1a2e", border: "1px solid rgba(16,185,129,0.15)" }}>
              <p className="text-base font-bold text-foreground text-center">Deseja sair do FeFin?</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmLogout(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                  Cancelar
                </button>
                <button onClick={handleLogout} className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors" style={{ backgroundColor: "#F87171", color: "#fff" }}>
                  Sair
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <BottomNav />
    </div>
  );
};

export default Dashboard;
