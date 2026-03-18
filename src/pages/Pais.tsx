import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, TrendingDown, RotateCcw, Wallet } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import EmptyState from "@/components/EmptyState";
import ReembolsoModal from "@/components/ReembolsoModal";
import { useLancamentos } from "@/hooks/useLancamentos";
import { useAllReembolsos, useAddReembolso, getTotalReembolsado } from "@/hooks/useReembolsos";
import { getGroupEmoji, getSubcategoriaGroup } from "@/lib/subcategorias";

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
function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

export default function Pais() {
  const [mesAtual, setMesAtual] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const mesRef = getMesRef(mesAtual.year, mesAtual.month);
  const mesLabel = getMesLabel(mesAtual.year, mesAtual.month);

  const { data: todos = [], isLoading } = useLancamentos(mesRef);
  const { data: todosReembolsos = [] } = useAllReembolsos();

  const prevMes = () =>
    setMesAtual(({ year, month }) =>
      month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }
    );
  const nextMes = () =>
    setMesAtual(({ year, month }) =>
      month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }
    );

  // Lançamentos dos pais = subcategoria_pais preenchida
  const lancamentos = useMemo(
    () =>
      todos.filter(
        (l) => l.subcategoria_pais !== null && l.subcategoria_pais !== ""
      ),
    [todos]
  );

  const despesasPais = useMemo(
    () => lancamentos.filter((l) => l.tipo === "despesa"),
    [lancamentos]
  );

  // ── Totais consolidados ────────────────────────────────────────────────
  const totalPago = useMemo(
    () => despesasPais.reduce((s, l) => s + Number(l.valor), 0),
    [despesasPais]
  );

  const totalReembolsado = useMemo(() => {
    // Reembolsos cujo lancamento_id está entre os lançamentos dos pais deste mês
    const idsDoMes = new Set(despesasPais.map((l) => l.id));
    return todosReembolsos
      .filter((r) => idsDoMes.has(r.lancamento_id))
      .reduce((s, r) => s + Number(r.valor_reembolsado), 0);
  }, [despesasPais, todosReembolsos]);

  const totalLiquido = totalPago - totalReembolsado;

  // ── Por categoria ──────────────────────────────────────────────────────
  const porCategoria = useMemo(() => {
    const map: Record<string, number> = {};
    despesasPais.forEach((l) => {
      const subP = l.subcategoria_pais;
      const cat = (subP && subP !== "" && subP !== "Geral")
        ? subP
        : l.categoria_macro || "Outros";
      map[cat] = (map[cat] || 0) + Number(l.valor);
    });
    return Object.entries(map)
      .map(([cat, valor]) => {
        const group = getSubcategoriaGroup(cat) || cat;
        return { cat, valor, emoji: cat === "Vicente" ? "👦" : getGroupEmoji(group) };
      })
      .sort((a, b) => b.valor - a.valor);
  }, [despesasPais]);

  // ── Lançamentos com reembolso por item ─────────────────────────────────
  const lancamentosComReembolso = useMemo(() => {
    return despesasPais.map((l) => {
      const reembolsado = getTotalReembolsado(todosReembolsos, l.id);
      const liquido = Number(l.valor) - reembolsado;
      return { ...l, reembolsado, liquido };
    });
  }, [despesasPais, todosReembolsos]);

  const [reembolsoTarget, setReembolsoTarget] = useState<any>(null);
  const addReembolso = useAddReembolso();

  const handleSaveReembolso = async (data: {
    valor_reembolsado: number;
    quem_reembolsou: string;
    data_reembolso: string;
    observacao?: string;
  }) => {
    if (!reembolsoTarget) return;
    await addReembolso.mutateAsync({
      lancamento_id: reembolsoTarget.id,
      valor_reembolsado: data.valor_reembolsado,
      quem_reembolsou: data.quem_reembolsou,
      data_reembolso: data.data_reembolso,
      observacao: data.observacao ?? null,
    });
    setReembolsoTarget(null);
  };

  return (
    <div className="gradient-bg min-h-screen pb-28">
      <BottomNav />

      <div className="max-w-lg mx-auto px-4 pt-14 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">Pais</h1>
            <p className="text-[11px] text-muted-foreground">{mesLabel}</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={prevMes}
              className="w-8 h-8 rounded-full bg-white border border-border flex items-center justify-center text-muted-foreground"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              onClick={nextMes}
              className="w-8 h-8 rounded-full bg-white border border-border flex items-center justify-center text-muted-foreground"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        {/* ── Resumo consolidado ── */}
        {despesasPais.length > 0 && (
          <div className="glass-card p-4 space-y-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              Resumo do mês
            </p>

            {/* Pago */}
            <div className="flex items-center justify-between py-2 border-b border-[#E8ECF5]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(99,102,241,0.12)" }}>
                  <TrendingDown size={14} className="text-primary" />
                </div>
                <span className="text-sm text-muted-foreground">Total pago</span>
              </div>
              <span className="text-sm font-bold text-foreground">{fmt(totalPago)}</span>
            </div>

            {/* Reembolsado */}
            <div className="flex items-center justify-between py-2 border-b border-[#E8ECF5]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(13,148,136,0.12)" }}>
                  <RotateCcw size={14} style={{ color: "#0D9488" }} />
                </div>
                <span className="text-sm text-muted-foreground">Reembolsado</span>
              </div>
              <span className="text-sm font-bold" style={{ color: "#0D9488" }}>
                {totalReembolsado > 0 ? `− ${fmt(totalReembolsado)}` : fmt(0)}
              </span>
            </div>

            {/* Líquido */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(217,112,82,0.12)" }}>
                  <Wallet size={14} style={{ color: "#D97052" }} />
                </div>
                <span className="text-sm font-semibold text-foreground">Líquido (meu custo)</span>
              </div>
              <span className="text-lg font-bold" style={{ color: totalLiquido > 0 ? "#D97052" : "#0D9488" }}>
                {fmt(totalLiquido)}
              </span>
            </div>

            {/* Barra de reembolso */}
            {totalPago > 0 && (
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>reembolsado</span>
                  <span>{totalPago > 0 ? ((totalReembolsado / totalPago) * 100).toFixed(0) : 0}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#E8ECF5] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, totalPago > 0 ? (totalReembolsado / totalPago) * 100 : 0)}%`,
                      background: "#0D9488",
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Por categoria ── */}
        {porCategoria.length > 0 && (
          <div className="glass-card p-4 space-y-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              Despesas por categoria
            </p>
            <div className="space-y-2.5">
              {porCategoria.map(({ cat, valor, emoji }) => {
                const pct = totalPago > 0 ? (valor / totalPago) * 100 : 0;
                // reembolsado desta categoria
                const reembolsadoCat = lancamentosComReembolso
                  .filter((l) => {
                    const subP = l.subcategoria_pais;
                    const c = (subP && subP !== "" && subP !== "Geral") ? subP : l.categoria_macro || "Outros";
                    return c === cat;
                  })
                  .reduce((s, l) => s + l.reembolsado, 0);
                const liquidoCat = valor - reembolsadoCat;
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
                    <div className="h-1 rounded-full bg-amber-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: "#F59E0B" }}
                      />
                    </div>
                    {reembolsadoCat > 0 && (
                      <div className="flex justify-end gap-3 text-[10px]">
                        <span style={{ color: "#0D9488" }}>− {fmt(reembolsadoCat)} reimb.</span>
                        <span className="text-muted-foreground font-semibold">líq. {fmt(liquidoCat)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Lançamentos individuais ── */}
        {isLoading ? (
          <div className="text-center py-12 text-sm text-muted-foreground">Carregando...</div>
        ) : lancamentos.length === 0 ? (
          <EmptyState
            title="Sem lançamentos dos pais"
            subtitle="Nenhuma despesa dos pais registrada neste mês"
          />
        ) : (
          <div className="glass-card p-4 space-y-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              Lançamentos
            </p>
            <div className="space-y-1">
              {lancamentosComReembolso.map((l) => {
                    const group = getSubcategoriaGroup(l.subcategoria_pais || "") || l.categoria_macro || "Outros";
                    const emoji = l.subcategoria_pais === "Vicente" ? "👦" : getGroupEmoji(group);
                return (
                  <div key={l.id} onClick={() => setReembolsoTarget(l)} className="flex items-center gap-3 py-2.5 border-b border-amber-100 last:border-0 cursor-pointer active:opacity-70">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm"
                      style={{ background: "rgba(251,191,36,0.2)" }}
                    >
                      {emoji}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-foreground truncate">{l.descricao}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDate(l.data)}
                        {l.subcategoria_pais && l.subcategoria_pais !== "Geral" ? ` · ${l.subcategoria_pais}` : ""}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-[13px] font-bold text-foreground">{fmt(Number(l.valor))}</p>
                      {l.reembolsado > 0 && (
                        <p className="text-[10px]" style={{ color: "#0D9488" }}>
                          reimb. {fmt(l.reembolsado)}
                        </p>
                      )}
                      {l.reembolsado > 0 && (
                        <p className="text-[10px] text-muted-foreground font-semibold">
                          líq. {fmt(l.liquido)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {reembolsoTarget && (
        <ReembolsoModal
          open={!!reembolsoTarget}
          onClose={() => setReembolsoTarget(null)}
          descricao={reembolsoTarget.descricao}
          valorOriginal={Number(reembolsoTarget.valor)}
          onSave={handleSaveReembolso}
          isPending={addReembolso.isPending}
        />
      )}
    </div>
  );
}
