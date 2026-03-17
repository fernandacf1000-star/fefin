import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useLancamentos } from "@/hooks/useLancamentos";
import { useCartoes, getCartaoCycle } from "@/hooks/useCartoes";
import { useProfile } from "@/hooks/useProfile";
import { getGroupEmoji } from "@/lib/subcategorias";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ── SVG logos ──────────────────────────────────────────────────────────────
const MastercardLogo = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={Math.round(size * 0.62)} viewBox="0 0 38 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="14" cy="12" r="9" fill="#EB001B" />
    <circle cx="24" cy="12" r="9" fill="#F79E1B" />
    <path d="M19 5.5a9 9 0 0 1 0 13 9 9 0 0 1 0-13z" fill="#FF5F00" />
  </svg>
);

const VisaLogo = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={Math.round(size * 0.4)} viewBox="0 0 60 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <text x="2" y="16" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="18" fill="#1A1F71" letterSpacing="-1">VISA</text>
  </svg>
);

const BandeiraLogo = ({ bandeira, size = 28 }: { bandeira: string; size?: number }) => {
  const b = (bandeira || "").toLowerCase();
  if (b === "mastercard") return <MastercardLogo size={size} />;
  if (b === "visa") return <VisaLogo size={size} />;
  return null;
};

// ── Mascot ─────────────────────────────────────────────────────────────────
const MascotHead = ({ size = 64 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="36" cy="32" rx="20" ry="22" fill="#1A1A2E" />
    <rect x="10" y="28" width="7" height="18" rx="3.5" fill="#1A1A2E" />
    <rect x="55" y="28" width="7" height="18" rx="3.5" fill="#1A1A2E" />
    <ellipse cx="36" cy="36" rx="17" ry="18" fill="#D4956A" />
    <ellipse cx="29" cy="34" rx="2.5" ry="3" fill="#1A1A2E" />
    <ellipse cx="43" cy="34" rx="2.5" ry="3" fill="#1A1A2E" />
    <circle cx="30" cy="33" r="1" fill="white" />
    <circle cx="44" cy="33" r="1" fill="white" />
    <path d="M29 42 Q36 48 43 42" stroke="#1A1A2E" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <ellipse cx="24" cy="40" rx="4" ry="2.5" fill="#E8A07A" opacity="0.5" />
    <ellipse cx="48" cy="40" rx="4" ry="2.5" fill="#E8A07A" opacity="0.5" />
    <ellipse cx="36" cy="20" rx="17" ry="8" fill="#1A1A2E" />
    <path d="M20 62 Q22 54 36 54 Q50 54 52 62" fill="#6366F1" />
    <circle cx="19" cy="38" r="2.5" fill="#F5C842" />
    <circle cx="53" cy="38" r="2.5" fill="#F5C842" />
  </svg>
);

// ── Helpers ────────────────────────────────────────────────────────────────
function getMesRef(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function getMesLabel(year: number, month: number) {
  const label = new Date(year, month, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function getLastDay(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

// ── Dashboard ──────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [mesAtual, setMesAtual] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const mesRef = getMesRef(mesAtual.year, mesAtual.month);
  const mesLabel = getMesLabel(mesAtual.year, mesAtual.month);

  const { data: lancamentos = [], isLoading } = useLancamentos(mesRef);
  const { data: cartoes = [] } = useCartoes();
  const { data: profile } = useProfile();

  const nome = profile?.nome || profile?.full_name || "";
  const firstName = nome.split(" ")[0] || "você";

  const prevMes = () =>
    setMesAtual(({ year, month }) =>
      month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }
    );
  const nextMes = () =>
    setMesAtual(({ year, month }) =>
      month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }
    );

  // ── Totals ────────────────────────────────────────────────────────────────
  const despesas = useMemo(() => lancamentos.filter((l) => l.tipo === "despesa"), [lancamentos]);
  const receitas = useMemo(() => lancamentos.filter((l) => l.tipo === "receita"), [lancamentos]);

  const totalDespesas = useMemo(
    () => despesas.reduce((s, l) => s + Number(l.valor), 0),
    [despesas]
  );
  const totalReceitas = useMemo(
    () => receitas.reduce((s, l) => s + Number(l.valor), 0),
    [receitas]
  );
  const reserva = totalReceitas - totalDespesas;
  const reservaPct = totalReceitas > 0 ? (reserva / totalReceitas) * 100 : 0;
  const gastoPct = totalReceitas > 0 ? Math.min(100, (totalDespesas / totalReceitas) * 100) : 0;

  // ── Quinzenas ─────────────────────────────────────────────────────────────
  const quinzenas = useMemo(() => {
    const lastDay = getLastDay(mesAtual.year, mesAtual.month);

    const somaDesp = (start: number, end: number) =>
      despesas
        .filter((l) => {
          const d = parseInt(l.data.slice(8, 10), 10);
          return d >= start && d <= end;
        })
        .reduce((s, l) => s + Number(l.valor), 0);

    const somaRec = (start: number, end: number) =>
      receitas
        .filter((l) => {
          const d = parseInt(l.data.slice(8, 10), 10);
          return d >= start && d <= end;
        })
        .reduce((s, l) => s + Number(l.valor), 0);

    return [
      {
        label: "1ª quinzena",
        sub: "dias 1–15",
        despesas: somaDesp(1, 15),
        receitas: somaRec(1, 15),
      },
      {
        label: "2ª quinzena",
        sub: `dias 16–${lastDay}`,
        despesas: somaDesp(16, lastDay),
        receitas: somaRec(16, lastDay),
      },
    ];
  }, [despesas, receitas, mesAtual]);

  // ── Melhor cartão ─────────────────────────────────────────────────────────
  const melhorCartao = useMemo(() => {
    if (!cartoes.length) return null;
    return cartoes.reduce((best, c) => {
      const { daysUntilClose: d } = getCartaoCycle(c.dia_fechamento);
      const { daysUntilClose: bd } = getCartaoCycle(best.dia_fechamento);
      return d > bd ? c : best;
    });
  }, [cartoes]);

  const melhorDays = melhorCartao
    ? getCartaoCycle(melhorCartao.dia_fechamento).daysUntilClose
    : 0;

  // ── Por cartão ────────────────────────────────────────────────────────────
  const porCartao = useMemo(
    () =>
      cartoes
        .map((c) => ({
          cartao: c,
          total: despesas
            .filter((l) => l.cartao_id === c.id)
            .reduce((s, l) => s + Number(l.valor), 0),
        }))
        .filter((x) => x.total > 0),
    [despesas, cartoes]
  );

  // ── Categorias ────────────────────────────────────────────────────────────
  const categorias = useMemo(() => {
    const map: Record<string, number> = {};
    despesas.forEach((l) => {
      const cat = l.categoria_macro || l.categoria || "Outros";
      map[cat] = (map[cat] || 0) + Number(l.valor);
    });
    return Object.entries(map)
      .map(([cat, valor]) => ({ cat, valor, emoji: getGroupEmoji(cat) }))
      .sort((a, b) => b.valor - a.valor);
  }, [despesas]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="gradient-bg min-h-screen pb-28">
      <BottomNav />

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MascotHead size={52} />
            <div>
              <p className="text-[11px] text-muted-foreground">Olá,</p>
              <p className="text-base font-bold text-foreground">{firstName} 👋</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={prevMes}
              className="w-8 h-8 rounded-full bg-white border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="text-[11px] font-semibold text-foreground px-1 min-w-[96px] text-center">
              {mesLabel}
            </span>
            <button
              onClick={nextMes}
              className="w-8 h-8 rounded-full bg-white border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        {/* Melhor cartão chip */}
        {melhorCartao && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-border w-fit shadow-sm">
            <BandeiraLogo bandeira={melhorCartao.bandeira} size={22} />
            <span className="text-[12px] font-semibold text-foreground">{melhorCartao.nome}</span>
            <span className="text-[10px] text-muted-foreground">· fecha em {melhorDays}d</span>
          </div>
        )}

        {/* Despesas / Receitas */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-card p-4 space-y-1">
            <div className="flex items-center gap-1.5">
              <TrendingDown size={13} className="text-destructive" />
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Despesas</span>
            </div>
            <p className="text-lg font-bold text-foreground leading-tight">{fmt(totalDespesas)}</p>
          </div>
          <div className="glass-card p-4 space-y-1">
            <div className="flex items-center gap-1.5">
              <TrendingUp size={13} style={{ color: "#0D9488" }} />
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Receitas</span>
            </div>
            <p className="text-lg font-bold text-foreground leading-tight">{fmt(totalReceitas)}</p>
          </div>
        </div>

        {/* Reserva */}
        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🌿</span>
              <div>
                <p className="text-sm font-bold text-foreground">Reserva</p>
                <p className="text-[10px] text-muted-foreground">economia do mês</p>
              </div>
            </div>
            <div className="text-right">
              <p
                className="text-xl font-bold leading-tight"
                style={{ color: reserva >= 0 ? "#0D9488" : "#D97052" }}
              >
                {fmt(reserva)}
              </p>
              {totalReceitas > 0 && (
                <p
                  className="text-[11px] font-semibold"
                  style={{ color: reserva >= 0 ? "#0D9488" : "#D97052" }}
                >
                  {Math.abs(reservaPct).toFixed(1)}% da receita
                </p>
              )}
            </div>
          </div>
          {totalReceitas > 0 && (
            <div className="h-1.5 rounded-full bg-[#E8ECF5] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${gastoPct}%`,
                  background: reserva >= 0 ? "#6366F1" : "#D97052",
                }}
              />
            </div>
          )}
        </div>

        {/* Quinzenas */}
        <div className="grid grid-cols-2 gap-3">
          {quinzenas.map((q, i) => (
            <div key={i} className="glass-card p-3 space-y-2">
              <div>
                <p className="text-[11px] font-semibold text-foreground">{q.label}</p>
                <p className="text-[9px] text-muted-foreground">{q.sub}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <TrendingDown size={11} className="text-destructive shrink-0" />
                  <span className="text-xs font-bold text-foreground">{fmt(q.despesas)}</span>
                </div>
                {q.receitas > 0 && (
                  <div className="flex items-center gap-1">
                    <TrendingUp size={11} style={{ color: "#0D9488" }} className="shrink-0" />
                    <span className="text-[11px] text-muted-foreground">{fmt(q.receitas)}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Faturas por cartão */}
        {porCartao.length > 0 && (
          <div className="glass-card p-4 space-y-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              Faturas do mês
            </p>
            <div className="space-y-2.5">
              {porCartao.map(({ cartao, total }) => (
                <div key={cartao.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BandeiraLogo bandeira={cartao.bandeira} size={22} />
                    <span className="text-sm text-foreground font-medium">{cartao.nome}</span>
                  </div>
                  <span className="text-sm font-bold text-foreground">{fmt(total)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Categorias */}
        {categorias.length > 0 && (
          <div className="glass-card p-4 space-y-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              Despesas por categoria
            </p>
            <div className="space-y-2.5">
              {categorias.map(({ cat, valor, emoji }) => {
                const pct = totalDespesas > 0 ? (valor / totalDespesas) * 100 : 0;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm shrink-0">{emoji}</span>
                        <span className="text-[12px] font-medium text-foreground truncate">{cat}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-[10px] text-muted-foreground">{pct.toFixed(0)}%</span>
                        <span className="text-[12px] font-bold text-foreground">{fmt(valor)}</span>
                      </div>
                    </div>
                    <div className="h-1 rounded-full bg-[#E8ECF5] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: "#6366F1" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty */}
        {!isLoading && lancamentos.length === 0 && (
          <div className="flex flex-col items-center py-16 space-y-3">
            <MascotHead size={56} />
            <p className="text-sm text-muted-foreground">Nenhum lançamento neste mês</p>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-12 text-sm text-muted-foreground">Carregando...</div>
        )}
      </div>
    </div>
  );
}
