import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useLancamentos } from "@/hooks/useLancamentos";
import { useAllReembolsos, getTotalReembolsado } from "@/hooks/useReembolsos";
import { useCartoes, getCartaoCycle } from "@/hooks/useCartoes";
import CartaoCard from "@/components/CartaoCard";
import { SUBCATEGORIA_GROUPS, getGroupEmoji, normalizeMacro } from "@/lib/subcategorias";
import {
  Eye, EyeOff, TrendingUp, TrendingDown,
  ShoppingBag, CreditCard, Users,
  ChevronLeft, ChevronRight, Settings, LogOut, Receipt, ClipboardList, Pencil, X,
} from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { APP_VERSION, APP_UPDATED } from "@/version";

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

const txIcon = (categoria: string) => {
  const map: Record<string, any> = {
    fixa: ShoppingBag, extra: ShoppingBag, pais: Users,
    salario: TrendingUp, reembolso_pais: Users, renda_extra: Receipt, outros: Receipt,
  };
  return map[categoria] || Receipt;
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

const Dashboard = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { data: profile } = useProfile();
  const [showBalance, setShowBalance] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [profileOpen, setProfileOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [metaOpen, setMetaOpen] = useState(false);
  const [metaValue, setMetaValue] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);
  const queryClient = useQueryClient();

  const mesRef = months[selectedMonth]?.key;
  const { data: lancamentos = [], isLoading } = useLancamentos(mesRef);
  const { data: allReembolsos = [] } = useAllReembolsos();
  const { data: cartoes = [] } = useCartoes();

  const receitas = useMemo(() => lancamentos.filter((l) => l.tipo === "receita"), [lancamentos]);
  const despesas = useMemo(() => lancamentos.filter((l) => l.tipo === "despesa"), [lancamentos]);

  const totalReceitas = useMemo(() => receitas.reduce((s, l) => s + Number(l.valor), 0), [receitas]);
  const totalDespesas = useMemo(() => {
    return despesas.reduce((s, l) => {
      const reemb = getTotalReembolsado(allReembolsos, l.id);
      return s + Math.max(0, Number(l.valor) - reemb);
    }, 0);
  }, [despesas, allReembolsos]);
  const saldo = totalReceitas - totalDespesas;

  // Category totals by macro categories
  const categoryTotals = useMemo(() => {
    return SUBCATEGORIA_GROUPS.map((g) => ({
      key: g.group,
      label: g.group,
      emoji: g.emoji,
      value: despesas
        .filter((d) => normalizeMacro(d.categoria_macro, d.subcategoria) === g.group)
        .reduce((s, d) => {
          const reemb = getTotalReembolsado(allReembolsos, d.id);
          return s + Math.max(0, Number(d.valor) - reemb);
        }, 0),
    }));
  }, [despesas, allReembolsos]);

  // Meta do mês - use profile meta or fallback to receitas
  const metaMensal = profile?.meta_mensal ? Number(profile.meta_mensal) : null;
  const metaPct = useMemo(() => {
    const base = metaMensal || totalReceitas;
    if (base === 0) return 0;
    // Exclude Investimentos from gastos for meta calculation
    const gastosParaMeta = despesas
      .filter(d => normalizeMacro(d.categoria_macro, d.subcategoria) !== 'Investimentos')
      .reduce((s, d) => {
        const reemb = getTotalReembolsado(allReembolsos, d.id);
        return s + Math.max(0, Number(d.valor) - reemb);
      }, 0);
    return Math.min(100, Math.round((gastosParaMeta / base) * 100));
  }, [metaMensal, totalReceitas, despesas, allReembolsos]);

  // Total despesas sem investimentos (para exibição na meta)
  const totalDespesasSemInvest = useMemo(() => {
    return despesas
      .filter(d => normalizeMacro(d.categoria_macro, d.subcategoria) !== 'Investimentos')
      .reduce((s, d) => {
        const reemb = getTotalReembolsado(allReembolsos, d.id);
        return s + Math.max(0, Number(d.valor) - reemb);
      }, 0);
  }, [despesas, allReembolsos]);

  // Parcelamentos card
  const parcelamentos = useMemo(() => {
    const parceladas = despesas.filter(d => d.is_parcelado);
    const total = parceladas.reduce((s, d) => s + Number(d.valor), 0);
    const top5 = [...parceladas].sort((a, b) => Number(b.valor) - Number(a.valor)).slice(0, 5);
    return { total, top5, count: parceladas.length };
  }, [despesas]);

  // Best card logic
  const bestCartaoId = useMemo(() => {
    if (cartoes.length <= 1) return null;
    let best: string | null = null;
    let maxDays = -1;
    for (const c of cartoes) {
      const { daysUntilClose } = getCartaoCycle(c.dia_fechamento);
      if (daysUntilClose > maxDays) {
        maxDays = daysUntilClose;
        best = c.id;
      }
    }
    return best;
  }, [cartoes]);

  const recentTransactions = useMemo(() => lancamentos.slice(0, 7), [lancamentos]);

  const nome = profile?.nome || profile?.full_name || "";
  const email = profile?.email || user?.email || "";

  const handleLogout = async () => {
    setConfirmLogout(false);
    await signOut();
    navigate("/");
  };

  const handleSaveMeta = async () => {
    if (!user) return;
    setSavingMeta(true);
    const val = parseFloat(metaValue.replace(/\./g, "").replace(",", "."));
    const { error } = await supabase
      .from("profiles")
      .update({ meta_mensal: isNaN(val) ? null : val } as any)
      .eq("user_id", user.id);
    setSavingMeta(false);
    if (error) { toast.error("Erro ao salvar meta"); return; }
    toast.success("Meta atualizada!");
    queryClient.invalidateQueries({ queryKey: ["profile"] });
    setMetaOpen(false);
  };

  const hasData = lancamentos.length > 0;

  return (
    <div className="min-h-screen gradient-bg overflow-x-hidden pb-[90px] md:pb-6">
      <div className="px-4 pt-12 w-full max-w-4xl md:mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 animate-fade-up">
          <div>
            <p className="text-muted-foreground text-sm">Olá,</p>
            <h1 className="text-xl font-semibold text-foreground">{nome ? `${nome} ✨` : "✨"}</h1>
          </div>
          <button onClick={() => setProfileOpen(true)} className="w-[44px] h-[44px] rounded-full flex items-center justify-center overflow-hidden" style={{ background: "#1a1a2e", border: "2px solid hsl(var(--primary))" }}>
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
          <div className="md:grid md:grid-cols-2 md:gap-4 md:items-start">
            {/* Meta do mês */}
            <div className="glass-card p-4 mb-6 animate-fade-up" style={{ animationDelay: "0.15s", minHeight: "100px" }}>
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <span className="text-base shrink-0">🎯</span>
                  <span className="text-sm font-semibold text-foreground whitespace-nowrap">Meta do mês</span>
                </div>
                <button onClick={() => { setMetaValue(metaMensal ? String(metaMensal) : ""); setMetaOpen(true); }} className="p-1 text-muted-foreground hover:text-foreground transition-colors shrink-0 ml-2">
                  <Pencil size={14} />
                </button>
              </div>
              {!metaMensal && (
                <p className="text-[11px] mb-2" style={{ color: "#475569" }}>Toque em ✏️ para definir sua meta</p>
              )}
              {metaMensal && (
                <>
                  <p className="text-xs font-semibold text-primary mb-2">{metaPct}% usado</p>
                  <div className="relative w-full h-2.5 rounded-full bg-secondary/60 overflow-hidden">
                    <div
                      className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ${
                        metaPct >= 90 ? "bg-destructive" : metaPct >= 70 ? "bg-yellow-500" : "gradient-emerald"
                      }`}
                      style={{ width: `${metaPct}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    {metaPct >= 90
                      ? "Cuidado! Gastos próximos da meta 🚨"
                      : metaPct >= 70
                      ? "Atenção com os gastos este mês ⚠️"
                      : "Dentro do orçamento 💚"}
                  </p>
                </>
              )}
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-muted-foreground">Gastos: {showBalance ? fmt(totalDespesasSemInvest) : "••••"}</span>
                <span className="text-[10px] text-muted-foreground">{metaMensal ? `Meta: ${showBalance ? fmt(metaMensal) : "••••"}` : `Receitas: ${showBalance ? fmt(totalReceitas) : "••••"}`}</span>
              </div>
            </div>

            {/* Category Summary - 2x3 grid fixo */}
            {(() => {
              const displayKeys = ["Moradia", "Alimentação", "Transporte", "Saúde", "Pessoal", "Lazer"];
              const displayCats = displayKeys.map(k => categoryTotals.find(c => c.key === k)).filter(Boolean) as typeof categoryTotals;
              return (
                <div className="mb-6 animate-fade-up" style={{ animationDelay: "0.2s" }}>
                  <div className="grid grid-cols-2 gap-2">
                    {displayCats.map((cat) => (
                      <div key={cat.key} className="glass-card p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-base">{cat.emoji}</span>
                          <span className="text-[10px] text-muted-foreground font-medium truncate">{cat.label}</span>
                        </div>
                        <p className="text-sm font-semibold text-foreground tabular-nums">
                          {showBalance ? fmt(cat.value) : "••••"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Compromissos Parcelados */}
            {parcelamentos.count > 0 && (
              <div className="glass-card p-5 mb-6 animate-fade-up" style={{ animationDelay: "0.22s" }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ClipboardList size={16} className="text-primary" />
                    <span className="text-sm font-semibold text-foreground">📋 Compromissos parcelados</span>
                  </div>
                  <span className="text-xs font-bold text-foreground tabular-nums">{showBalance ? fmt(parcelamentos.total) : "••••"}</span>
                </div>
                <div className="space-y-2">
                  {parcelamentos.top5.map(p => (
                    <div key={p.id} className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground truncate">{p.descricao}</p>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-muted-foreground">{p.parcela_atual}/{p.parcela_total} parcelas</span>
                          {p.parcela_atual === p.parcela_total && (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-yellow-500/15 text-yellow-500">🏁 Última</span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs font-semibold text-foreground tabular-nums">{showBalance ? fmt(Number(p.valor)) : "••••"}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/20">
                  <span className="text-[10px] text-muted-foreground">{parcelamentos.count} compras parceladas · Total {showBalance ? fmt(parcelamentos.total) : "••••"} este mês</span>
                  <button onClick={() => navigate("/despesas")} className="text-[11px] text-primary font-medium">
                    Ver todas →
                  </button>
                </div>
              </div>
            )}

            {/* Meus Cartões */}
            {cartoes.length > 0 && (
              <div className="animate-fade-up mb-6" style={{ animationDelay: "0.25s" }}>
                <div className="flex items-center gap-1.5 mb-3">
                  <CreditCard size={14} className="text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">💳 Meus Cartões</h2>
                </div>
                {cartoes.length > 1 && bestCartaoId && (
                  <p className="text-[11px] text-primary font-medium mb-2">
                    💡 Melhor cartão hoje: {cartoes.find(c => c.id === bestCartaoId)?.nome}
                  </p>
                )}
                <div className="space-y-2 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
                  {cartoes.map((c) => (
                    <CartaoCard
                      key={c.id}
                      cartao={c}
                      lancamentos={lancamentos}
                      showBalance={showBalance}
                      isBest={c.id === bestCartaoId && cartoes.length > 1}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Transactions */}
            {recentTransactions.length > 0 && (
              <div className="animate-fade-up" style={{ animationDelay: "0.3s" }}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-foreground">Últimas transações</h2>
                </div>
                <div className="space-y-1 md:grid md:grid-cols-2 md:gap-2 md:space-y-0">
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
                          <p className="text-[11px] text-muted-foreground">
                            {tx.categoria_macro ? `${getGroupEmoji(normalizeMacro(tx.categoria_macro, tx.subcategoria))} ${normalizeMacro(tx.categoria_macro, tx.subcategoria)}` : tx.categoria} · {new Date(tx.data + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                            {tx.is_parcelado && tx.parcela_atual && tx.parcela_total && (
                              <span className="text-muted-foreground"> · {tx.parcela_atual}/{tx.parcela_total}</span>
                            )}
                          </p>
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
          </div>
        )}
      </div>

      {/* Profile Bottom Sheet */}
      <div className={`fixed inset-0 z-[60] bg-background/60 backdrop-blur-sm transition-opacity duration-300 ${profileOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`} onClick={() => setProfileOpen(false)} />
      <div className={`fixed inset-x-0 bottom-0 z-[70] transition-transform duration-300 ease-out ${profileOpen ? "translate-y-0" : "translate-y-full"}`} style={{ background: "#1a1a2e", borderRadius: "24px 24px 0 0" }}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>
        <div className="px-5 pb-6">
          <div className="flex items-center gap-3 pb-4">
            <div className="w-[40px] h-[40px] rounded-full flex items-center justify-center overflow-hidden shrink-0" style={{ background: "#1a1a2e", border: "2px solid hsl(var(--primary))" }}>
              <MascotHead size={28} />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">{nome ? `Olá, ${nome}` : "Olá!"}</p>
              <p className="text-xs text-muted-foreground">{email}</p>
            </div>
          </div>
          <div className="h-px bg-border/30 mb-2" />
          <button onClick={() => { setProfileOpen(false); navigate("/conta"); }} className="flex items-center gap-3 w-full px-2 py-3.5 rounded-xl hover:bg-secondary/30 transition-colors">
            <Settings size={18} className="text-foreground" />
            <span className="text-sm font-medium text-foreground">Minha conta</span>
          </button>
          <button onClick={() => { setProfileOpen(false); setConfirmLogout(true); }} className="flex items-center gap-3 w-full px-2 py-3.5 rounded-xl hover:bg-secondary/30 transition-colors">
            <LogOut size={18} className="text-destructive" />
            <span className="text-sm font-medium text-destructive">Sair</span>
          </button>
          <div className="h-px mt-2 mb-3" style={{ background: "#1e2433" }} />
          <p className="text-center text-[11px]" style={{ color: "#475569" }}>FeFin {APP_VERSION}</p>
          <p className="text-center text-[10px]" style={{ color: "#475569" }}>Atualizado em {APP_UPDATED}</p>
        </div>
      </div>

      {/* Logout Confirmation */}
      {confirmLogout && (
        <>
          <div className="fixed inset-0 z-[80] bg-background/70 backdrop-blur-sm" onClick={() => setConfirmLogout(false)} />
          <div className="fixed inset-0 z-[90] flex items-center justify-center px-8">
            <div className="w-full max-w-xs rounded-2xl p-6 space-y-4" style={{ background: "#1a1a2e", border: "1px solid hsl(var(--primary) / 0.15)" }}>
              <p className="text-base font-bold text-foreground text-center">Deseja sair do FeFin?</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmLogout(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                  Cancelar
                </button>
                <button onClick={handleLogout} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-destructive text-destructive-foreground transition-colors">
                  Sair
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Meta Modal */}
      {metaOpen && (
        <>
          <div className="fixed inset-0 z-[80] bg-background/70 backdrop-blur-sm" onClick={() => setMetaOpen(false)} />
          <div className="fixed inset-0 z-[90] flex items-center justify-center px-8">
            <div className="w-full max-w-xs rounded-2xl p-6 space-y-4" style={{ background: "#1a1a2e", border: "1px solid hsl(var(--primary) / 0.15)" }}>
              <div className="flex items-center justify-between">
                <p className="text-base font-bold text-foreground">🎯 Meta mensal</p>
                <button onClick={() => setMetaOpen(false)} className="text-muted-foreground"><X size={18} /></button>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Meta mensal (R$)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={metaValue}
                  onChange={(e) => setMetaValue(e.target.value)}
                  placeholder="Ex: 5000"
                  className="w-full rounded-xl bg-secondary/60 border border-border/30 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Valor máximo de gastos por mês</p>
              </div>
              <button
                onClick={handleSaveMeta}
                disabled={savingMeta}
                className="w-full py-2.5 rounded-xl text-sm font-semibold gradient-emerald text-primary-foreground transition-colors disabled:opacity-50"
              >
                {savingMeta ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </>
      )}

      <BottomNav />
    </div>
  );
};

export default Dashboard;
