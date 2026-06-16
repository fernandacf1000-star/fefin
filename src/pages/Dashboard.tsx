import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import BottomNav from "@/components/BottomNav";
import { useLancamentos, getCategoriaDashboard } from "@/hooks/useLancamentos";
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

  const hoje = new Date();
  const isCurrentMonth = hoje.getFullYear() === mesAtual.year && hoje.getMonth() === mesAtual.month;
  const diasRestantes = isCurrentMonth
    ? new Date(mesAtual.year, mesAtual.month + 1, 0).getDate() - hoje.getDate()
    : null;

  const sobrou = totalReceitas - totalDespesas;

  return (
    <div className="relative min-h-screen overflow-x-hidden pb-28" style={{ background: "linear-gradient(178deg,#F2F3FD 0%,#FBFBFE 30%)" }}>
      <BottomNav />

      <div className="relative z-10 max-w-lg mx-auto px-4 pt-[calc(env(safe-area-inset-top)+0.8rem)] space-y-3">

        {/* Perfil */}
        <button
          onClick={() => navigate("/conta")}
          className="absolute top-[calc(env(safe-area-inset-top)+0.8rem)] right-4 z-20 w-8 h-8 rounded-full bg-white border border-[#EEEFF7] flex items-center justify-center text-[#6366F1] shadow-sm"
          title="Perfil e Cartões"
        >
          <User size={14} />
        </button>

        {/* Topo */}
        <div className="text-center pt-1">
          <p className="text-xs text-[#8B8FA8]">Olá, {firstName} 👋</p>
          <div className="flex items-center justify-center gap-2 mt-0.5">
            <button onClick={prevMes} className="w-7 h-7 rounded-full bg-white border border-[#EEEFF7] flex items-center justify-center text-[#9CA0B8] shadow-sm shrink-0">
              <ChevronLeft size={14} />
            </button>
            <h1 className="text-[22px] font-bold text-[#22253A] leading-tight min-w-[150px]">{mesLabel}</h1>
            <button onClick={nextMes} className="w-7 h-7 rounded-full bg-white border border-[#EEEFF7] flex items-center justify-center text-[#9CA0B8] shadow-sm shrink-0">
              <ChevronRight size={14} />
            </button>
          </div>
          {diasRestantes !== null && diasRestantes > 0 && (
            <span className="inline-block mt-1.5 text-[10.5px] font-semibold text-[#6366F1] bg-[#EAEAFE] rounded-full px-3 py-1">
              faltam {diasRestantes} dias para o mês acabar
            </span>
          )}
        </div>

        {/* Herói: Sobrou */}
        <div className="bg-white rounded-[22px] px-4 py-5 text-center shadow-[0_3px_14px_rgba(99,102,241,0.08)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9CA0B8]">
            {isCurrentMonth ? "Sobrou até agora" : "Sobrou no mês"}
          </p>
          <p className={cn(
            "text-[32px] font-semibold leading-tight mt-1.5 tabular-nums tracking-tight",
            sobrou >= 0 ? "text-[#22253A]" : "text-[#D26358]"
          )}>
            {sobrou >= 0 && <span className="text-[#3D8B5F]">+</span>}{fmt(sobrou)}
          </p>
          <div className="flex mt-4 pt-3.5 border-t border-[#F0F1F8]">
            <div className="flex-1 border-r border-[#F0F1F8]">
              <p className="text-[10px] font-semibold text-[#9CA0B8]">↑ Entrou</p>
              <p className="text-[14.5px] font-semibold text-[#3D8B5F] tabular-nums mt-0.5">{fmt(totalReceitas)}</p>
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-semibold text-[#9CA0B8]">↓ Saiu</p>
              <p className="text-[14.5px] font-semibold text-[#D26358] tabular-nums mt-0.5">{fmt(totalDespesas)}</p>
            </div>
          </div>
          {totalResgates > 0 && (
            <p className="text-[10px] text-[#9CA0B8] mt-2.5">
              + {fmt(totalResgates)} em resgates de investimento
            </p>
          )}
        </div>

        {/* Melhor cartão para comprar agora */}
        {melhorCartao && (
          <div className="rounded-[20px] px-4 py-3 flex items-center gap-3 shadow-[0_3px_14px_rgba(99,102,241,0.10)]" style={{ background: "linear-gradient(120deg,#5B5FD6,#6366F1)" }}>
            <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center text-xl shrink-0">
              {"\u{1F4B3}"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70 leading-none">Melhor cartão para comprar agora</p>
              <p className="text-[15px] font-bold text-white leading-tight mt-1 truncate">{melhorCartao.nome}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[18px] font-bold text-white leading-none tabular-nums">{melhorDays}</p>
              <p className="text-[9px] font-medium text-white/70 mt-0.5">dias p/ fechar</p>
            </div>
          </div>
        )}

        {/* Faturas */}
        {porCartao.length > 0 && (
          <div className="bg-white rounded-[22px] px-4 py-4 shadow-[0_2px_10px_rgba(99,102,241,0.06)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9CA0B8] mb-2">Faturas</p>
            {porCartao.map(({ cartao, total }, i) => {
              const { daysUntilClose } = getCartaoCycle(cartao.dia_fechamento);
              return (
                <div
                  key={cartao.id}
                  className={cn(
                    "flex items-center justify-between py-2.5",
                    i > 0 && "border-t border-dashed border-[#EEEFF7]"
                  )}
                >
                  <div>
                    <p className="text-[13px] font-semibold text-[#22253A]">{cartao.nome}</p>
                    <p className="text-[10.5px] font-medium text-[#9CA0B8] mt-0.5">
                      {daysUntilClose > 0 ? `fecha em ${daysUntilClose} dias` : "fechada"}
                    </p>
                  </div>
                  <span className="text-[13.5px] font-semibold text-[#22253A] tabular-nums">{fmt(total)}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Categorias */}
        {categorias.length > 0 && (
          <div className="bg-white rounded-[22px] px-4 py-4 shadow-[0_2px_10px_rgba(99,102,241,0.06)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9CA0B8] mb-2">Para onde foi</p>
            {categorias.map(({ cat, valor, emoji }, i) => {
              const pct = totalDespesasBrutas > 0 ? (valor / totalDespesasBrutas) * 100 : 0;
              const filled = Math.min(10, Math.max(1, Math.round(pct / 10)));
              return (
                <div
                  key={cat}
                  className={cn(
                    "flex items-center gap-2.5 py-2",
                    i > 0 && "border-t border-dashed border-[#EEEFF7]"
                  )}
                >
                  <span className="text-[15px] w-5 text-center shrink-0">{emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-semibold text-[#22253A] truncate">{cat}</p>
                    <div className="flex gap-[3px] mt-1">
                      {Array.from({ length: 10 }).map((_, d) => (
                        <span
                          key={d}
                          className="h-[5px] w-[11px] rounded-[3px]"
                          style={{ background: d < filled ? "#6366F1" : "#EEEFF7" }}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="text-[12.5px] font-semibold text-[#22253A] tabular-nums shrink-0">{fmt(valor)}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Vazio */}
        {!isLoading && lancamentos.length === 0 && (
          <div className="flex flex-col items-center py-14 space-y-3">
            <img src="/fina-mascot.png" alt="Fina" style={{ width: 44, height: "auto" }} className="drop-shadow" />
            <p className="text-sm text-[#9CA0B8]">Nenhum lançamento neste mês</p>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-12 text-sm text-[#9CA0B8]">Carregando...</div>
        )}
      </div>
    </div>
  );
}
