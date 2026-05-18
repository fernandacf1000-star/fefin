import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp, User, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import BottomNav from "@/components/BottomNav";
import { useLancamentos, calcularSaldoAdriano, getCategoriaDashboard } from "@/hooks/useLancamentos";
import { useCartoes, getCartaoCycle } from "@/hooks/useCartoes";
import { useProfile } from "@/hooks/useProfile";
import { useAllReembolsos } from "@/hooks/useReembolsos";
import { getGroupEmoji } from "@/lib/subcategorias";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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

function normalizeKey(value: string | null | undefined): string {
  return (value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const ignoredDashboardCategories = new Set([
  "reembolso_pais",
  "reembolso_adriano",
  "reembolso_luisa",
  "resgate_investimento",
]);

function isPaisLancamento(l: { subcategoria_pais: string | null; adriano: boolean }) {
  const subPais = normalizeKey(l.subcategoria_pais);
  return !!subPais && subPais !== "geral" && subPais !== "adriano" && !l.adriano;
}

const emojiMapDash: Record<string, string> = {
  Moradia: "🏘️",
  Alimentação: "🥗",
  Transporte: "🚗",
  Saúde: "💊",
  Pessoal: "💅",
  Lazer: "🎮",
  Investimentos: "📈",
  Pais: "🧓",
  Vicente: "👦",
  "Luísa": "💗",
  Adriano: "👨",
  Casa: "🏠",
  Roupas: "👗",
  Farmácia: "💊",
  "Compras Online": "🛒",
  Beleza: "💄",
  Supermercado: "🛍️",
  Academia: "🏋️",
  Contas: "💡",
  "Internet/Celular": "📱",
  "Plano de saúde": "🩺",
  Consultas: "🩺",
  Combustível: "⛽",
  Estacionamento: "🅿️",
  Restaurantes: "🍽️",
  Presentes: "🎁",
  Viagens: "✈️",
  "Condomínio/IPTU": "🏢",
  Seguro: "🛡️",
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [mesAtual, setMesAtual] = useState(() => {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { year: next.getFullYear(), month: next.getMonth() };
  });

  const mesRef = getMesRef(mesAtual.year, mesAtual.month);
  const mesLabel = getMesLabel(mesAtual.year, mesAtual.month);

  const { data: lancamentos = [], isLoading } = useLancamentos(mesRef);
  const { data: cartoes = [] } = useCartoes();
  const { data: profile } = useProfile();
  const { data: todosReembolsos = [] } = useAllReembolsos();

  const nome = profile?.nome || profile?.full_name || "Fernanda";
  const firstName = nome.split(" ")[0] || "Fernanda";

  const prevMes = () =>
    setMesAtual(({ year, month }) =>
      month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }
    );

  const nextMes = () =>
    setMesAtual(({ year, month }) =>
      month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }
    );

  const despesas = useMemo(
    () =>
      lancamentos.filter(
        (l) =>
          l.tipo === "despesa" &&
          !l.adriano &&
          !ignoredDashboardCategories.has(normalizeKey(l.categoria))
      ),
    [lancamentos]
  );

  const receitas = useMemo(
    () => lancamentos.filter((l) => l.tipo === "receita"),
    [lancamentos]
  );

  const totalReembolsadoMesTabela = useMemo(() => {
    const ids = new Set(despesas.map((l) => l.id));
    return todosReembolsos
      .filter((r) => ids.has(r.lancamento_id) && r.data_reembolso.startsWith(mesRef))
      .reduce((s, r) => s + Number(r.valor_reembolsado), 0);
  }, [despesas, todosReembolsos, mesRef]);

  const totalReembolsadoMesReceitas = useMemo(
    () =>
      lancamentos
        .filter((l) => l.tipo === "receita" && l.categoria === "reembolso_pais")
        .reduce((s, l) => s + Number(l.valor), 0),
    [lancamentos]
  );

  const totalReembolsadoMes = totalReembolsadoMesTabela + totalReembolsadoMesReceitas;

  const totalResgates = useMemo(
    () =>
      receitas
        .filter((l) => l.categoria === "resgate_investimento")
        .reduce((s, l) => s + Number(l.valor), 0),
    [receitas]
  );

  const totalDespesasBrutas = useMemo(
    () => despesas.reduce((s, l) => s + Number(l.valor), 0),
    [despesas]
  );

  const totalDespesas = useMemo(
    () => totalDespesasBrutas - totalReembolsadoMes,
    [totalDespesasBrutas, totalReembolsadoMes]
  );

  const totalReceitas = useMemo(
    () =>
      receitas
        .filter((l) => l.categoria !== "resgate_investimento")
        .reduce((s, l) => s + Number(l.valor), 0),
    [receitas]
  );

  const saldoAdriano = useMemo(() => calcularSaldoAdriano(lancamentos), [lancamentos]);

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

  const porCartao = useMemo(
    () =>
      cartoes
        .map((c) => ({
          cartao: c,
          total: lancamentos
            .filter((l) => l.cartao_id === c.id && l.tipo === "despesa" && !l.adriano)
            .reduce((s, l) => s + Number(l.valor), 0),
        }))
        .filter((x) => x.total > 0),
    [lancamentos, cartoes]
  );

  const categorias = useMemo(() => {
    const map: Record<string, number> = {};

    despesas.forEach((l) => {
      let cat = isPaisLancamento(l) ? "Pais" : (getCategoriaDashboard(l) || "").trim();

      if (!cat) {
        if (l.subcategoria && l.subcategoria.trim()) cat = l.subcategoria.trim();
        else if (l.categoria_macro && l.categoria_macro.trim()) cat = l.categoria_macro.trim();
      }

      if (!cat) return;

      const catNorm = normalizeKey(cat);

      if (["despesa", "extra"].includes(catNorm)) return;
      if (ignoredDashboardCategories.has(catNorm)) return;

      map[cat] = (map[cat] || 0) + Number(l.valor);
    });

    return Object.entries(map)
      .map(([cat, valor]) => ({
        cat,
        valor,
        emoji: emojiMapDash[cat] || getGroupEmoji(cat) || "📦",
      }))
      .sort((a, b) => b.valor - a.valor);
  }, [despesas]);

  return (
    <div className="min-h-screen pb-24 overflow-x-hidden" style={{ background: "linear-gradient(135deg, #7C5BBF 0%, #EDE8FF 100%)" }}>
      <BottomNav />

      <div className="max-w-lg mx-auto px-3 pt-[calc(env(safe-area-inset-top)+0.6rem)] space-y-2.5 relative">
        <button
          onClick={() => navigate("/conta")}
          className="absolute top-[calc(env(safe-area-inset-top)+0.6rem)] right-3 z-20 w-9 h-9 rounded-full bg-white/20 backdrop-blur border border-white/30 flex items-center justify-center text-white hover:bg-white/30 transition-colors shadow-sm"
          title="Perfil e Cartões"
        >
          <User size={16} />
        </button>

        <div className="flex items-center gap-2.5 pr-12 min-h-[58px]">
          <img src="/fina-mascot.png" alt="Fina" style={{ width: 58, height: "auto" }} className="drop-shadow shrink-0" />
          <div className="min-w-0">
            <p className="text-sm leading-none text-white/75">Olá,</p>
            <p className="text-2xl leading-tight font-bold text-white whitespace-nowrap">{firstName}</p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 py-0.5">
          <button
            onClick={prevMes}
            className="w-9 h-9 rounded-full bg-white/20 backdrop-blur border border-white/30 flex items-center justify-center text-white hover:bg-white/30 transition-colors shrink-0"
          >
            <ChevronLeft size={17} />
          </button>
          <span className="text-2xl sm:text-3xl font-bold text-white px-1 min-w-[170px] text-center leading-tight whitespace-nowrap">
            {mesLabel}
          </span>
          <button
            onClick={nextMes}
            className="w-9 h-9 rounded-full bg-white/20 backdrop-blur border border-white/30 flex items-center justify-center text-white hover:bg-white/30 transition-colors shrink-0"
          >
            <ChevronRight size={17} />
          </button>
        </div>

        {melhorCartao && (
          <div className="bg-white/82 backdrop-blur rounded-xl px-4 py-2.5 min-h-[68px] flex items-center justify-between border border-purple-200/30 shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-[58px] h-[38px] shrink-0 rounded-lg bg-gradient-to-br from-blue-600 to-blue-400 shadow-inner flex items-center justify-center text-white text-[9px] font-bold uppercase tracking-wide">
                {melhorCartao.nome}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground leading-none">Melhor cartão</p>
                <p className="text-lg font-bold text-foreground leading-tight mt-1 truncate">{melhorCartao.nome}</p>
              </div>
            </div>
            <span className="text-sm text-muted-foreground shrink-0 ml-2 whitespace-nowrap">fecha em {melhorDays}d</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5 pt-0.5">
          <div className="bg-white/82 backdrop-blur rounded-xl p-3 space-y-1 border border-purple-200/30 overflow-hidden">
            <div className="flex items-center gap-1.5">
              <TrendingDown size={12} className="text-destructive" />
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                Despesas
              </span>
            </div>
            <p className="text-[clamp(1rem,4.4vw,1.15rem)] font-bold text-foreground leading-tight whitespace-nowrap tabular-nums">{fmt(totalDespesas)}</p>
          </div>

          <div className="bg-white/82 backdrop-blur rounded-xl p-3 space-y-1 border border-purple-200/30 overflow-hidden">
            <div className="flex items-center gap-1.5">
              <TrendingUp size={12} style={{ color: "#0D9488" }} />
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                Receitas
              </span>
            </div>
            <p className="text-[clamp(1rem,4.4vw,1.15rem)] font-bold text-foreground leading-tight whitespace-nowrap tabular-nums">{fmt(totalReceitas)}</p>
          </div>
        </div>

        {totalResgates > 0 && (
          <div className="bg-white/82 backdrop-blur rounded-xl px-3.5 py-2.5 flex items-center justify-between border border-purple-200/30">
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
              Resgates
            </span>
            <span className="text-sm font-bold text-muted-foreground tabular-nums">{fmt(totalResgates)}</span>
          </div>
        )}

        {saldoAdriano !== 0 && (
          <div
            className={cn(
              "bg-white/82 backdrop-blur rounded-xl px-3.5 py-2.5 flex items-center justify-between border-l-4 border border-purple-200/30",
              saldoAdriano > 0 ? "border-l-emerald-500" : "border-l-red-400"
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Users size={14} className="text-muted-foreground shrink-0" />
              <span className="text-[12px] text-muted-foreground font-medium truncate">
                {saldoAdriano > 0 ? "Adriano te deve" : "Você deve para Adriano"}
              </span>
            </div>
            <span className={cn("text-base font-bold tabular-nums whitespace-nowrap ml-2", saldoAdriano > 0 ? "text-emerald-600" : "text-red-500")}>
              {fmt(Math.abs(saldoAdriano))}
            </span>
          </div>
        )}

        {saldoAdriano === 0 && lancamentos.some((l) => l.adriano) && (
          <div className="bg-white/82 backdrop-blur rounded-xl px-3.5 py-2.5 flex items-center justify-between border border-purple-200/30">
            <div className="flex items-center gap-2 min-w-0">
              <Users size={14} className="text-muted-foreground shrink-0" />
              <span className="text-[12px] text-muted-foreground font-medium truncate">Contas com Adriano</span>
            </div>
            <span className="text-sm font-medium text-emerald-600 whitespace-nowrap ml-2">✓ Em dia</span>
          </div>
        )}

        {porCartao.length > 0 && (
          <div className="bg-white/82 backdrop-blur rounded-xl p-3.5 space-y-2.5 border border-purple-200/30">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              Faturas do mês
            </p>
            <div className="space-y-2">
              {porCartao.map(({ cartao, total }) => (
                <div key={cartao.id} className="flex items-center justify-between gap-3">
                  <span className="text-[13px] text-foreground font-medium truncate">{cartao.nome}</span>
                  <span className="text-[13px] font-bold text-foreground tabular-nums whitespace-nowrap">{fmt(total)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {categorias.length > 0 && (
          <div className="bg-white/82 backdrop-blur rounded-xl p-3.5 space-y-2.5 border border-purple-200/30">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              Despesas por categoria
            </p>
            <div className="space-y-2">
              {categorias.map(({ cat, valor, emoji }) => {
                const pct = totalDespesasBrutas > 0 ? (valor / totalDespesasBrutas) * 100 : 0;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[13px] shrink-0">{emoji}</span>
                        <span className="text-[11px] font-medium text-foreground truncate">{cat}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-1">
                        <span className="text-[10px] text-muted-foreground tabular-nums">{pct.toFixed(0)}%</span>
                        <span className="text-[11px] font-bold text-foreground tabular-nums whitespace-nowrap">{fmt(valor)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#E8ECF5] overflow-hidden">
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

        {!isLoading && lancamentos.length === 0 && (
          <div className="flex flex-col items-center py-14 space-y-3">
            <img src="/fina-mascot.png" alt="Fina" style={{ width: 44, height: "auto" }} className="drop-shadow" />
            <p className="text-sm text-muted-foreground">Nenhum lançamento neste mês</p>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-12 text-sm text-muted-foreground">
            Carregando...
          </div>
        )}
      </div>
    </div>
  );
}
