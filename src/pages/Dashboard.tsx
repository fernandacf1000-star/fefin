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
} from "lucide-react";
import { useState } from "react";

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

  return (
    <div className="min-h-screen gradient-bg pb-24">
      <div className="max-w-md mx-auto px-4 pt-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-fade-up">
          <div>
            <p className="text-muted-foreground text-sm">Olá,</p>
            <h1 className="text-xl font-semibold text-foreground">Fernanda ✨</h1>
          </div>
          <div className="w-10 h-10 rounded-full gradient-emerald flex items-center justify-center text-primary-foreground font-semibold text-sm">
            FE
          </div>
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
