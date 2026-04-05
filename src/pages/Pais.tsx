import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, TrendingDown, RotateCcw, Wallet } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import EmptyState from "@/components/EmptyState";
import ReembolsoModal from "@/components/ReembolsoModal";
import { useLancamentos } from "@/hooks/useLancamentos";
import { useAllReembolsos, useAddReembolso, getTotalReembolsado } from "@/hooks/useReembolsos";
import { getGroupEmoji, getSubcategoriaGroup } from "@/lib/subcategorias";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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

// ── Resumo Card reutilizável ──────────────────────────────────────────────
function ResumoCard({
  totalPago,
  totalReembolsado,
  totalLiquido,
  accentColor = "#F59E0B",
}: {
  totalPago: number;
  totalReembolsado: number;
  totalLiquido: number;
  accentColor?: string;
}) {
  return (
    <div className="glass-card p-4 space-y-3">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Resumo do mês</p>

      <div className="flex items-center justify-between py-2 border-b border-[#E8ECF5]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(99,102,241,0.12)" }}>
            <TrendingDown size={14} className="text-primary" />
          </div>
          <span className="text-sm text-muted-foreground">Total pago</span>
        </div>
        <span className="text-sm font-bold text-foreground">{fmt(totalPago)}</span>
      </div>

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

      {totalPago > 0 && (
        <div className="space-y-1 pt-1">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>reembolsado</span>
            <span>{((totalReembolsado / totalPago) * 100).toFixed(0)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-[#E8ECF5] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, (totalReembolsado / totalPago) * 100)}%`,
                background: "#0D9488",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function Pais() {
  const [mesAtual, setMesAtual] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [aba, setAba] = useState<"pais" | "adriano">("pais");

  const mesRef = getMesRef(mesAtual.year, mesAtual.month);
  const mesLabel = getMesLabel(mesAtual.year, mesAtual.month);

  const { data: todos = [], isLoading } = useLancamentos(mesRef);
  const { data: todosReembolsos = [] } = useAllReembolsos();

  const prevMes = () =>
    setMesAtual(({ year, month }) => (month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }));
  const nextMes = () =>
    setMesAtual(({ year, month }) => (month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }));

  // ══ PAIS ═══════════════════════════════════════════════════════════════
  const lancamentosPais = useMemo(
    () => todos.filter((l) => l.subcategoria_pais !== null && l.subcategoria_pais !== "" && l.subcategoria_pais !== "Luísa" && l.subcategoria_pais !== "Adriano" && !l.adriano),
    [todos],
  );
  const despesasPais = useMemo(() => lancamentosPais.filter((l) => l.tipo === "despesa"), [lancamentosPais]);
  const receitasReembolsoPais = useMemo(
    () => todos.filter((l) => l.tipo === "receita" && l.categoria === "reembolso_pais"),
    [todos],
  );

  const totalPagoPais = useMemo(() => despesasPais.reduce((s, l) => s + Number(l.valor), 0), [despesasPais]);
  const totalReembolsadoPaisTabela = useMemo(() => {
    const idsDoMes = new Set(despesasPais.map((l) => l.id));
    return todosReembolsos.filter((r) => idsDoMes.has(r.lancamento_id)).reduce((s, r) => s + Number(r.valor_reembolsado), 0);
  }, [despesasPais, todosReembolsos]);
  const totalReembolsadoPaisReceitas = useMemo(
    () => receitasReembolsoPais.reduce((s, l) => s + Number(l.valor), 0), [receitasReembolsoPais],
  );
  const totalReembolsadoPais = totalReembolsadoPaisTabela + totalReembolsadoPaisReceitas;
  const totalLiquidoPais = totalPagoPais - totalReembolsadoPais;

  const porCategoriaPais = useMemo(() => {
    const map: Record<string, number> = {};
    despesasPais.forEach((l) => {
      const subP = l.subcategoria_pais;
      const cat = subP && subP !== "" && subP !== "Geral" ? subP : l.categoria_macro || "Outros";
      map[cat] = (map[cat] || 0) + Number(l.valor);
    });
    return Object.entries(map)
      .map(([cat, valor]) => {
        const group = getSubcategoriaGroup(cat) || cat;
        return { cat, valor, emoji: cat === "Vicente" ? "👦" : getGroupEmoji(group) };
      })
      .sort((a, b) => b.valor - a.valor);
  }, [despesasPais]);

  const lancamentosComReembolsoPais = useMemo(() => {
    return despesasPais.map((l) => {
      const reembolsado = getTotalReembolsado(todosReembolsos, l.id);
      return { ...l, reembolsado, liquido: Number(l.valor) - reembolsado };
    }).sort((a, b) => Number(a.valor) - Number(b.valor));
  }, [despesasPais, todosReembolsos]);

  // ══ ADRIANO ════════════════════════════════════════════════════════════
  const lancamentosAdriano = useMemo(
    () => todos.filter((l) => l.adriano === true && l.tipo === "despesa"),
    [todos],
  );
  const totalPagoAdriano = useMemo(() => lancamentosAdriano.reduce((s, l) => s + Number(l.valor), 0), [lancamentosAdriano]);
  const totalReembolsadoAdrianoTabela = useMemo(() => {
    const ids = new Set(lancamentosAdriano.map((l) => l.id));
    return todosReembolsos.filter((r) => ids.has(r.lancamento_id)).reduce((s, r) => s + Number(r.valor_reembolsado), 0);
  }, [lancamentosAdriano, todosReembolsos]);
  const totalLiquidoAdriano = totalPagoAdriano - totalReembolsadoAdrianoTabela;

  const porCategoriaAdriano = useMemo(() => {
    const map: Record<string, number> = {};
    lancamentosAdriano.forEach((l) => {
      const cat = l.categoria_macro || l.subcategoria || "Outros";
      map[cat] = (map[cat] || 0) + Number(l.valor);
    });
    return Object.entries(map)
      .map(([cat, valor]) => {
        const group = getSubcategoriaGroup(cat) || cat;
        return { cat, valor, emoji: cat === "Luísa" ? "👩‍🦳" : getGroupEmoji(group) };
      })
      .sort((a, b) => b.valor - a.valor);
  }, [lancamentosAdriano]);

  const lancamentosComReembolsoAdriano = useMemo(() => {
    return lancamentosAdriano.map((l) => {
      const reembolsado = getTotalReembolsado(todosReembolsos, l.id);
      return { ...l, reembolsado, liquido: Number(l.valor) - reembolsado };
    }).sort((a, b) => Number(a.valor) - Number(b.valor));
  }, [lancamentosAdriano, todosReembolsos]);

  // ══ Reembolso modal ════════════════════════════════════════════════════
  const [reembolsoTarget, setReembolsoTarget] = useState<any>(null);
  const addReembolso = useAddReembolso();

  const handleSaveReembolso = async (data: {
    valor_reembolsado: number;
    quem_reembolsou: string;
    data_reembolso: string;
    observacao?: string;
  }) => {
    if (!reembolsoTarget) return;
    try {
      await addReembolso.mutateAsync({
        lancamento_id: reembolsoTarget.id,
        valor_reembolsado: data.valor_reembolsado,
        quem_reembolsou: data.quem_reembolsou || (aba === "adriano" ? "Adriano" : "Pais"),
        data_reembolso: data.data_reembolso,
        observacao: data.observacao ?? null,
      });
      setReembolsoTarget(null);
      toast.success("Reembolso registrado!");
    } catch (e: any) {
      toast.error("Erro ao salvar: " + (e?.message || JSON.stringify(e)));
    }
  };

  // Helper para renderizar lista de lançamentos
  const renderLancamentos = (
    items: Array<{ id: string; descricao: string; data: string; subcategoria_pais: string | null; categoria_macro: string | null; valor: number; reembolsado: number; liquido: number; adriano: boolean }>,
    borderColor: string,
    getEmoji: (l: any) => string,
  ) => (
    <div className="space-y-1">
      {items.map((l) => (
        <div
          key={l.id}
          onClick={() => setReembolsoTarget(l)}
          className="flex items-center gap-3 py-2.5 last:border-0 cursor-pointer active:opacity-70"
          style={{ borderBottom: `0.5px solid ${borderColor}` }}
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm"
            style={{ background: aba === "adriano" ? (l.subcategoria_pais === "Luísa" ? "rgba(236,72,153,0.15)" : "rgba(59,130,246,0.15)") : "rgba(251,191,36,0.2)" }}
          >
            {getEmoji(l)}
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
              <p className="text-[10px]" style={{ color: "#0D9488" }}>reimb. {fmt(l.reembolsado)}</p>
            )}
            {l.reembolsado > 0 && (
              <p className="text-[10px] text-muted-foreground font-semibold">líq. {fmt(l.liquido)}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="gradient-bg min-h-screen pb-28">
      <BottomNav />

      <div className="max-w-lg mx-auto px-4 pt-14 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">Pais</h1>
            <p className="text-xl font-bold text-muted-foreground">{mesLabel}</p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={prevMes} className="w-8 h-8 rounded-full bg-white border border-border flex items-center justify-center text-muted-foreground">
              <ChevronLeft size={15} />
            </button>
            <button onClick={nextMes} className="w-8 h-8 rounded-full bg-white border border-border flex items-center justify-center text-muted-foreground">
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        {/* Abas */}
        <div className="flex gap-1 p-1 rounded-2xl bg-[#E8ECF5]">
          <button onClick={() => setAba("pais")}
            className={cn("flex-1 py-2 rounded-xl text-sm font-semibold transition-all",
              aba === "pais" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground")}>
            🧓 Pais
          </button>
          <button onClick={() => setAba("adriano")}
            className={cn("flex-1 py-2 rounded-xl text-sm font-semibold transition-all",
              aba === "adriano" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground")}>
            👨 Adriano
          </button>
        </div>

        {/* ══ ABA PAIS ═══════════════════════════════════════════════════ */}
        {aba === "pais" && (
          <>
            {despesasPais.length > 0 && (
              <ResumoCard
                totalPago={totalPagoPais}
                totalReembolsado={totalReembolsadoPais}
                totalLiquido={totalLiquidoPais}
              />
            )}

            {porCategoriaPais.length > 0 && (
              <div className="glass-card p-4 space-y-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Despesas por categoria</p>
                <div className="space-y-2.5">
                  {porCategoriaPais.map(({ cat, valor, emoji }) => {
                    const pct = totalPagoPais > 0 ? (valor / totalPagoPais) * 100 : 0;
                    const reembolsadoCat = lancamentosComReembolsoPais
                      .filter((l) => {
                        const subP = l.subcategoria_pais;
                        const c = subP && subP !== "" && subP !== "Geral" ? subP : l.categoria_macro || "Outros";
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
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: "#F59E0B" }} />
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

            {isLoading ? (
              <div className="text-center py-12 text-sm text-muted-foreground">Carregando...</div>
            ) : lancamentosPais.length === 0 && receitasReembolsoPais.length === 0 ? (
              <EmptyState title="Sem lançamentos dos pais" subtitle="Nenhuma despesa dos pais registrada neste mês" />
            ) : (
              <div className="glass-card p-4 space-y-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Lançamentos</p>
                {renderLancamentos(
                  lancamentosComReembolsoPais,
                  "rgba(251,191,36,0.3)",
                  (l) => l.subcategoria_pais === "Vicente" ? "👦" : l.subcategoria_pais === "Luísa" ? "👩‍🦳" : getGroupEmoji(getSubcategoriaGroup(l.subcategoria_pais || "") || l.categoria_macro || "Outros"),
                )}

                {/* Receitas "Reembolso pais" */}
                {receitasReembolsoPais.map((l) => (
                  <div key={l.id} className="flex items-center gap-3 py-2.5 border-b border-amber-100 last:border-0">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm"
                      style={{ background: "rgba(13,148,136,0.15)" }}>💸</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-foreground truncate">{l.descricao}</p>
                      <p className="text-[10px] text-muted-foreground">{formatDate(l.data)} · Reembolso recebido</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[13px] font-bold" style={{ color: "#0D9488" }}>+ {fmt(Number(l.valor))}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ══ ABA ADRIANO ════════════════════════════════════════════════ */}
        {aba === "adriano" && (
          <>
            {lancamentosAdriano.length > 0 && (
              <ResumoCard
                totalPago={totalPagoAdriano}
                totalReembolsado={totalReembolsadoAdrianoTabela}
                totalLiquido={totalLiquidoAdriano}
                accentColor="#3B82F6"
              />
            )}

            {porCategoriaAdriano.length > 0 && (
              <div className="glass-card p-4 space-y-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Despesas por categoria</p>
                <div className="space-y-2.5">
                  {porCategoriaAdriano.map(({ cat, valor, emoji }) => {
                    const pct = totalPagoAdriano > 0 ? (valor / totalPagoAdriano) * 100 : 0;
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
                        <div className="h-1 rounded-full bg-blue-100 overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: "#3B82F6" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="text-center py-12 text-sm text-muted-foreground">Carregando...</div>
            ) : lancamentosAdriano.length === 0 ? (
              <EmptyState title="Sem lançamentos do Adriano" subtitle="Marque 'Dividir com Adriano' ao criar uma despesa" />
            ) : (
              <div className="glass-card p-4 space-y-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Lançamentos</p>
                {renderLancamentos(
                  lancamentosComReembolsoAdriano,
                  "rgba(59,130,246,0.2)",
                  (l) => l.subcategoria_pais === "Luísa" ? "👩‍🦳" : "👨",
                )}
              </div>
            )}
          </>
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
