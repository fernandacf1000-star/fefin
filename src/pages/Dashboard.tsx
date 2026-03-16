import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useLancamentos } from "@/hooks/useLancamentos";
import { useAllReembolsos, getTotalReembolsado } from "@/hooks/useReembolsos";
import { useCartoes, getCartaoCycle } from "@/hooks/useCartoes";
import { SUBCATEGORIA_GROUPS, normalizeMacro } from "@/lib/subcategorias";
import {
  Eye, EyeOff,
  ChevronLeft, ChevronRight, Settings, LogOut, Pencil, X,
} from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { APP_VERSION, APP_UPDATED } from "@/version";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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

/* ─── light-theme tokens (inline) ─── */
const T = {
  bg: "#D8DDE9",
  card: "#FFFFFF",
  shadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)",
  text: "#1E293B",
  textSec: "#64748B",
  dim: "#94A3B8",
  accent: "#6366F1",
  teal: "#0D9488",
  tealBg: "rgba(13,148,136,0.06)",
  tealBorder: "rgba(13,148,136,0.15)",
  alert: "#E07A5F",
  subCard: "#EDF1F8",
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { data: profile } = useProfile();
  const [showBalance, setShowBalance] = useState(true);
  const [mesAtual, setMesAtual] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [profileOpen, setProfileOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [metaOpen, setMetaOpen] = useState(false);
  const [metaValue, setMetaValue] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);
  const queryClient = useQueryClient();

  const mesRef = `${mesAtual.year}-${String(mesAtual.month + 1).padStart(2, "0")}`;
  const mesLabel = new Date(mesAtual.year, mesAtual.month, 1)
    .toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const mesLabelFmt = mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1);
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

  const reserva = totalReceitas - totalDespesas;
  const reservaPct = totalReceitas > 0 ? Math.round((reserva / totalReceitas) * 100) : 0;

  // Category totals
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

  // Best card logic
  const bestCartao = useMemo(() => {
    if (cartoes.length === 0) return null;
    let best = cartoes[0];
    let maxDays = 0;
    for (const c of cartoes) {
      const { daysUntilClose } = getCartaoCycle(c.dia_fechamento);
      if (daysUntilClose > maxDays) {
        maxDays = daysUntilClose;
        best = c;
      }
    }
    return { ...best, daysUntilClose: maxDays };
  }, [cartoes]);

  // Quinzenas
  const quinzenas = useMemo(() => {
    const lastDay = new Date(mesAtual.year, mesAtual.month + 1, 0).getDate();
    const getDay = (d: string) => parseInt(d.split("-")[2], 10);
    const sumDesp = (items: typeof despesas) =>
      items.reduce((s, d) => {
        const reemb = getTotalReembolsado(allReembolsos, d.id);
        return s + Math.max(0, Number(d.valor) - reemb);
      }, 0);
    const sumRec = (items: typeof receitas) =>
      items.reduce((s, r) => s + Number(r.valor), 0);

    const q1Desp = despesas.filter((d) => getDay(d.data) <= 15);
    const q2Desp = despesas.filter((d) => getDay(d.data) >= 16);
    const q1Rec = receitas.filter((r) => getDay(r.data) <= 15);
    const q2Rec = receitas.filter((r) => getDay(r.data) >= 16);

    const q1DespTotal = sumDesp(q1Desp);
    const q2DespTotal = sumDesp(q2Desp);
    const q1RecTotal = sumRec(q1Rec);
    const q2RecTotal = sumRec(q2Rec);

    const totalDesp = q1DespTotal + q2DespTotal;

    return {
      q1: { desp: q1DespTotal, rec: q1RecTotal, reserva: q1RecTotal - q1DespTotal, pct: totalDesp > 0 ? Math.round((q1DespTotal / totalDesp) * 100) : 0 },
      q2: { desp: q2DespTotal, rec: q2RecTotal, reserva: q2RecTotal - q2DespTotal, pct: totalDesp > 0 ? Math.round((q2DespTotal / totalDesp) * 100) : 0 },
      lastDay,
    };
  }, [despesas, receitas, allReembolsos, mesAtual]);

  // Meta (kept for future use)
  const metaMensal = profile?.meta_mensal ? Number(profile.meta_mensal) : null;

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

  const monthNames = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const monthShort = monthNames[mesAtual.month];

  return (
    <div className="min-h-screen overflow-x-hidden pb-[90px] md:pb-6" style={{ background: T.bg }}>
      <div className="px-4 pt-10 w-full max-w-4xl md:mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-1 animate-fade-up">
          <div>
            <h1 className="text-xl font-bold" style={{ color: T.text }}>
              Olá, {nome || "FeFin"} ✨
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowBalance(!showBalance)} className="p-2 rounded-full" style={{ color: T.dim }}>
              {showBalance ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
            <button onClick={() => setProfileOpen(true)} className="w-[38px] h-[38px] rounded-full flex items-center justify-center overflow-hidden" style={{ background: "#F0EFFF", border: `2px solid ${T.accent}` }}>
              <MascotHead size={30} />
            </button>
          </div>
        </div>

        {/* Month Selector */}
        <div className="flex items-center justify-center gap-3 mb-5 animate-fade-up" style={{ animationDelay: "0.03s" }}>
          <button onClick={() => setMesAtual(p => { const d = new Date(p.year, p.month - 1, 1); return { year: d.getFullYear(), month: d.getMonth() }; })} className="p-2 rounded-full transition-colors" style={{ color: T.dim }}>
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-semibold min-w-[160px] text-center" style={{ color: T.text }}>{mesLabelFmt}</span>
          <button onClick={() => setMesAtual(p => { const d = new Date(p.year, p.month + 1, 1); return { year: d.getFullYear(), month: d.getMonth() }; })} className="p-2 rounded-full transition-colors" style={{ color: T.dim }}>
            <ChevronRight size={18} />
          </button>
        </div>

        {!hasData && !isLoading ? (
          <EmptyState title="Adicione seu primeiro lançamento! 🚀" />
        ) : (
          <>
            {/* Main Card */}
            <div className="rounded-[20px] p-5 mb-5 animate-fade-up" style={{ background: T.card, boxShadow: T.shadow, animationDelay: "0.08s" }}>
              {/* Best card chip */}
              {bestCartao && (
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg mb-3" style={{ background: `${T.accent}08`, fontSize: 11, color: T.accent, fontWeight: 600 }}>
                  💳 {bestCartao.nome} · fecha em {bestCartao.daysUntilClose}d
                </div>
              )}

              <p className="uppercase text-[10px] font-semibold tracking-[1.5px] mb-1" style={{ color: T.dim }}>
                Despesas do mês
              </p>
              <p className="text-[32px] font-extrabold tabular-nums leading-tight" style={{ color: T.text }}>
                {showBalance ? fmt(totalDespesas) : "••••••"}
              </p>

              {/* Sub-cards */}
              <div className="flex gap-2.5 mt-4">
                <div className="flex-1 rounded-xl p-3" style={{ background: T.subCard }}>
                  <p className="uppercase text-[9px] font-semibold tracking-[1.5px] mb-0.5" style={{ color: T.dim }}>Receitas</p>
                  <p className="text-sm font-bold tabular-nums" style={{ color: T.text }}>
                    {showBalance ? fmt(totalReceitas) : "••••"}
                  </p>
                </div>
                <div className="flex-1 rounded-xl p-3" style={{ background: T.tealBg, border: `1px solid ${T.tealBorder}` }}>
                  <p className="uppercase text-[9px] font-semibold tracking-[1.5px] mb-0.5" style={{ color: T.teal }}>🌿 Reserva</p>
                  <p className="text-sm font-bold tabular-nums" style={{ color: T.teal }}>
                    {showBalance ? fmt(reserva) : "••••"}
                  </p>
                  {showBalance && totalReceitas > 0 && (
                    <p className="text-[10px] mt-0.5" style={{ color: T.teal }}>
                      {reservaPct}% da receita
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Quinzenas */}
            <div className="mb-5 animate-fade-up" style={{ animationDelay: "0.14s" }}>
              <p className="uppercase text-[10px] font-semibold tracking-[1.5px] mb-2.5 px-1" style={{ color: T.dim }}>
                Quinzenas
              </p>
              <div className="flex gap-2.5">
                {/* Q1 */}
                <div className="flex-1 rounded-[16px] p-3.5" style={{ background: T.card, boxShadow: T.shadow }}>
                  <p className="text-xs font-semibold mb-0.5" style={{ color: T.text }}>1ª quinzena</p>
                  <p className="text-[10px] mb-2" style={{ color: T.dim }}>1–15 {monthShort}</p>
                  <p className="text-lg font-bold tabular-nums" style={{ color: T.text }}>
                    {showBalance ? fmt(quinzenas.q1.desp) : "••••"}
                  </p>
                  <div className="w-full h-1 rounded-full mt-2 mb-2" style={{ background: T.subCard }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${quinzenas.q1.pct}%`, background: T.accent }} />
                  </div>
                  <p className="text-[10px] font-medium" style={{ color: quinzenas.q1.reserva >= 0 ? T.teal : T.alert }}>
                    🌿 {showBalance ? fmt(quinzenas.q1.reserva) : "••••"} reserva
                  </p>
                </div>
                {/* Q2 */}
                <div className="flex-1 rounded-[16px] p-3.5" style={{ background: T.card, boxShadow: T.shadow }}>
                  <p className="text-xs font-semibold mb-0.5" style={{ color: T.text }}>2ª quinzena</p>
                  <p className="text-[10px] mb-2" style={{ color: T.dim }}>16–{quinzenas.lastDay} {monthShort}</p>
                  <p className="text-lg font-bold tabular-nums" style={{ color: T.text }}>
                    {showBalance ? fmt(quinzenas.q2.desp) : "••••"}
                  </p>
                  <div className="w-full h-1 rounded-full mt-2 mb-2" style={{ background: T.subCard }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${quinzenas.q2.pct}%`, background: T.accent }} />
                  </div>
                  <p className="text-[10px] font-medium" style={{ color: quinzenas.q2.reserva >= 0 ? T.teal : T.alert }}>
                    🌿 {showBalance ? fmt(quinzenas.q2.reserva) : "••••"} reserva
                  </p>
                </div>
              </div>
            </div>

            {/* Categorias */}
            <div className="mb-6 animate-fade-up" style={{ animationDelay: "0.2s" }}>
              <p className="uppercase text-[10px] font-semibold tracking-[1.5px] mb-2.5 px-1" style={{ color: T.dim }}>
                Categorias
              </p>
              <div className="grid grid-cols-2 gap-2">
                {categoryTotals.filter(c => c.value > 0).map((cat) => (
                  <div key={cat.key} className="rounded-[14px] p-3" style={{ background: T.card, boxShadow: T.shadow }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-base">{cat.emoji}</span>
                      <span className="text-[11px] font-medium truncate" style={{ color: T.textSec }}>{cat.label}</span>
                    </div>
                    <p className="text-[15px] font-bold tabular-nums" style={{ color: T.text }}>
                      {showBalance ? fmt(cat.value) : "••••"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Profile Bottom Sheet */}
      <div className={`fixed inset-0 z-[60] backdrop-blur-sm transition-opacity duration-300 ${profileOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`} style={{ background: "rgba(0,0,0,0.25)" }} onClick={() => setProfileOpen(false)} />
      <div className={`fixed inset-x-0 bottom-0 z-[70] transition-transform duration-300 ease-out ${profileOpen ? "translate-y-0" : "translate-y-full"}`} style={{ background: T.card, borderRadius: "24px 24px 0 0", boxShadow: "0 -4px 24px rgba(0,0,0,0.08)" }}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: "#D1D5DB" }} />
        </div>
        <div className="px-5 pb-6">
          <div className="flex items-center gap-3 pb-4">
            <div className="w-[40px] h-[40px] rounded-full flex items-center justify-center overflow-hidden shrink-0" style={{ background: "#F0EFFF", border: `2px solid ${T.accent}` }}>
              <MascotHead size={28} />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: T.text }}>{nome ? `Olá, ${nome}` : "Olá!"}</p>
              <p className="text-xs" style={{ color: T.textSec }}>{email}</p>
            </div>
          </div>
          <div className="h-px mb-2" style={{ background: "#E5E7EB" }} />
          <button onClick={() => { setProfileOpen(false); navigate("/conta"); }} className="flex items-center gap-3 w-full px-2 py-3.5 rounded-xl transition-colors hover:bg-[#F1F5F9]">
            <Settings size={18} style={{ color: T.text }} />
            <span className="text-sm font-medium" style={{ color: T.text }}>Minha conta</span>
          </button>
          <button onClick={() => { setProfileOpen(false); setConfirmLogout(true); }} className="flex items-center gap-3 w-full px-2 py-3.5 rounded-xl transition-colors hover:bg-[#FEF2F2]">
            <LogOut size={18} style={{ color: T.alert }} />
            <span className="text-sm font-medium" style={{ color: T.alert }}>Sair</span>
          </button>
          <div className="h-px mt-2 mb-3" style={{ background: "#E5E7EB" }} />
          <p className="text-center text-[11px]" style={{ color: T.dim }}>FeFin {APP_VERSION}</p>
          <p className="text-center text-[10px]" style={{ color: T.dim }}>Atualizado em {APP_UPDATED}</p>
        </div>
      </div>

      {/* Logout Confirmation */}
      {confirmLogout && (
        <>
          <div className="fixed inset-0 z-[80] backdrop-blur-sm" style={{ background: "rgba(0,0,0,0.3)" }} onClick={() => setConfirmLogout(false)} />
          <div className="fixed inset-0 z-[90] flex items-center justify-center px-8">
            <div className="w-full max-w-xs rounded-2xl p-6 space-y-4" style={{ background: T.card, boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}>
              <p className="text-base font-bold text-center" style={{ color: T.text }}>Deseja sair do FeFin?</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmLogout(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors" style={{ background: T.subCard, color: T.textSec }}>
                  Cancelar
                </button>
                <button onClick={handleLogout} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors" style={{ background: T.alert }}>
                  Sair
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Meta Modal (kept for future use) */}
      {metaOpen && (
        <>
          <div className="fixed inset-0 z-[80] backdrop-blur-sm" style={{ background: "rgba(0,0,0,0.3)" }} onClick={() => setMetaOpen(false)} />
          <div className="fixed inset-0 z-[90] flex items-center justify-center px-8">
            <div className="w-full max-w-xs rounded-2xl p-6 space-y-4" style={{ background: T.card, boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}>
              <div className="flex items-center justify-between">
                <p className="text-base font-bold" style={{ color: T.text }}>🎯 Meta mensal</p>
                <button onClick={() => setMetaOpen(false)} style={{ color: T.dim }}><X size={18} /></button>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: T.textSec }}>Meta mensal (R$)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={metaValue}
                  onChange={(e) => setMetaValue(e.target.value)}
                  placeholder="Ex: 5000"
                  className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                  style={{ background: T.subCard, border: "1px solid #E5E7EB", color: T.text }}
                />
                <p className="text-[10px] mt-1" style={{ color: T.dim }}>Valor máximo de gastos por mês</p>
              </div>
              <button
                onClick={handleSaveMeta}
                disabled={savingMeta}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50"
                style={{ background: T.accent }}
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
