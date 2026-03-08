import BottomNav from "@/components/BottomNav";
import {
  Eye,
  EyeOff,
  TrendingUp,
  TrendingDown,
  ArrowDownLeft,
  ShoppingBag,
  Coffee,
  Zap,
  Car,
  Utensils,
  Heart,
  CalendarClock,
  Home,
  CreditCard,
  Gift,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

const months = [
  { label: "Fevereiro 2026", key: "2026-02" },
  { label: "Março 2026", key: "2026-03" },
  { label: "Abril 2026", key: "2026-04" },
];

const transactions = [
  { icon: ShoppingBag, label: "Zara", category: "Compras", value: -289.9, date: "Hoje" },
  { icon: Coffee, label: "Starbucks", category: "Alimentação", value: -27.5, date: "Hoje" },
  { icon: ArrowDownLeft, label: "Pix recebido", category: "Transferência", value: 1500, date: "Ontem" },
  { icon: Zap, label: "Conta de Luz", category: "Contas", value: -187.43, date: "Ontem" },
  { icon: Car, label: "Uber", category: "Transporte", value: -34.8, date: "07 Mar" },
  { icon: Utensils, label: "iFood", category: "Alimentação", value: -62.9, date: "07 Mar" },
  { icon: Heart, label: "Pilates", category: "Saúde", value: -250, date: "06 Mar" },
];

const categoryCards = [
  { icon: Home, label: "Fixas", value: 2350, color: "text-primary" },
  { icon: CreditCard, label: "Parceladas", value: 890, color: "text-accent-foreground" },
  { icon: Gift, label: "Extras", value: 415, color: "text-destructive" },
  { icon: Users, label: "Pais", value: 600, color: "text-primary" },
];

const upcomingBills = [
  { label: "Aluguel", date: "10 Mar", value: 1800, daysLeft: 2, icon: Home },
  { label: "Cartão Nubank", date: "12 Mar", value: 1243.5, daysLeft: 4, icon: CreditCard },
  { label: "Internet", date: "15 Mar", value: 119.9, daysLeft: 7, icon: Zap },
];

const HEALTH_SCORE = 74;

const Dashboard = () => {
  const [showBalance, setShowBalance] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(1);

  return (
    <div className="min-h-screen gradient-bg pb-24">
      <div className="max-w-md mx-auto px-4 pt-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 animate-fade-up">
          <div>
            <p className="text-muted-foreground text-sm">Olá,</p>
            <h1 className="text-xl font-semibold text-foreground">Fernanda ✨</h1>
          </div>
          <div className="w-[44px] h-[44px] rounded-full flex items-center justify-center overflow-hidden" style={{ background: "#1a1a2e", border: "2px solid #10B981" }}>
            <svg width="36" height="36" viewBox="8 5 84 80" fill="none">
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
          </div>
        </div>

        {/* Month Selector */}
        <div className="flex items-center justify-center gap-3 mb-6 animate-fade-up" style={{ animationDelay: "0.03s" }}>
          <button
            onClick={() => setSelectedMonth((p) => Math.max(0, p - 1))}
            disabled={selectedMonth === 0}
            className="p-1 rounded-full text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            {months.map((m, i) => (
              <button
                key={m.key}
                onClick={() => setSelectedMonth(i)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all whitespace-nowrap ${
                  i === selectedMonth
                    ? "gradient-emerald text-primary-foreground shadow-lg shadow-primary/20"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setSelectedMonth((p) => Math.min(months.length - 1, p + 1))}
            disabled={selectedMonth === months.length - 1}
            className="p-1 rounded-full text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Balance Card */}
        <div className="glass-card p-5 mb-6 animate-fade-up" style={{ animationDelay: "0.1s" }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
              Saldo disponível
            </span>
            <button onClick={() => setShowBalance(!showBalance)} className="text-muted-foreground p-1">
              {showBalance ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </div>
          <p className="text-3xl font-bold text-foreground tracking-tight">
            {showBalance ? "R$ 12.458,32" : "••••••"}
          </p>

          <div className="flex gap-3 mt-5">
            <div className="flex-1 bg-secondary/60 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp size={14} className="text-primary" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Receitas</span>
              </div>
              <p className="text-sm font-semibold text-foreground">
                {showBalance ? "R$ 8.500,00" : "••••"}
              </p>
            </div>
            <div className="flex-1 bg-secondary/60 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingDown size={14} className="text-destructive" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Despesas</span>
              </div>
              <p className="text-sm font-semibold text-foreground">
                {showBalance ? "R$ 3.241,68" : "••••"}
              </p>
            </div>
          </div>
        </div>

        {/* Financial Health Gauge */}
        <div className="glass-card p-5 mb-6 animate-fade-up" style={{ animationDelay: "0.15s" }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-foreground">Saúde financeira</span>
            <span className="text-xs text-primary font-semibold">{HEALTH_SCORE}%</span>
          </div>
          <div className="relative w-full h-3 rounded-full bg-secondary/60 overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full gradient-emerald transition-all duration-700"
              style={{ width: `${HEALTH_SCORE}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Seu controle financeiro está bom! Continue assim 💚
          </p>
        </div>

        {/* Category Summary Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6 animate-fade-up" style={{ animationDelay: "0.2s" }}>
          {categoryCards.map((cat) => (
            <div key={cat.label} className="glass-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <cat.icon size={16} className={cat.color} />
                </div>
                <span className="text-xs text-muted-foreground font-medium">{cat.label}</span>
              </div>
              <p className="text-sm font-semibold text-foreground">
                {showBalance
                  ? cat.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                  : "••••"}
              </p>
            </div>
          ))}
        </div>

        {/* Upcoming Bills */}
        <div className="animate-fade-up mb-6" style={{ animationDelay: "0.25s" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <CalendarClock size={14} className="text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Próximos vencimentos</h2>
            </div>
          </div>
          <div className="space-y-1">
            {upcomingBills.map((bill) => (
              <div key={bill.label} className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/30 transition-colors">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <bill.icon size={18} className="text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{bill.label}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] text-muted-foreground">{bill.date}</p>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        bill.daysLeft <= 2
                          ? "bg-destructive/20 text-destructive"
                          : bill.daysLeft <= 7
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {bill.daysLeft <= 2 ? "Urgente" : `${bill.daysLeft} dias`}
                    </span>
                  </div>
                </div>
                <p className="text-sm font-semibold text-foreground tabular-nums">
                  {showBalance
                    ? bill.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                    : "••••"}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Transactions */}
        <div className="animate-fade-up" style={{ animationDelay: "0.3s" }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Últimas transações</h2>
            <span className="text-xs text-primary cursor-pointer">Ver todas</span>
          </div>
          <div className="space-y-1">
            {transactions.map((tx, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/30 transition-colors">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <tx.icon size={18} className="text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{tx.label}</p>
                  <p className="text-[11px] text-muted-foreground">{tx.category} · {tx.date}</p>
                </div>
                <p className={`text-sm font-semibold tabular-nums ${tx.value > 0 ? "text-primary" : "text-foreground"}`}>
                  {tx.value > 0 ? "+" : ""}
                  {tx.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Dashboard;
