import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, TrendingDown, RotateCcw, Wallet, Heart } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import EmptyState from "@/components/EmptyState";
import ReembolsoModal from "@/components/ReembolsoModal";
import SwipeableItem from "@/components/SwipeableItem";
import LancamentoActions from "@/components/LancamentoActions";
import DeleteConfirmSheet from "@/components/DeleteConfirmSheet";
import EditLancamentoModal from "@/components/EditLancamentoModal";
import {
  useLancamentos,
  useDeleteLancamento,
  useDeleteFutureParcelamento,
  useDeleteAllParcelamento,
  useDeleteFutureRecorrencia,
  useDeleteAllRecorrencia,
  useUpdateLancamento,
  isLuisaLancamento,
} from "@/hooks/useLancamentos";
import type { Lancamento } from "@/hooks/useLancamentos";
import { useCartoes } from "@/hooks/useCartoes";
import { useAllReembolsos, useAddReembolso, useUpdateReembolso, useDeleteReembolso, getTotalReembolsado } from "@/hooks/useReembolsos";
import { getGroupEmoji, getSubcategoriaGroup } from "@/lib/subcategorias";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function getMesRef(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}
function getMesLabel(year: number, month: number) {
  const label = new Date(year, month, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}
function formatDate(dateStr: string) {
  const [, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

function getTipo(l: Lancamento | null): "parcelado" | "recorrente" | "simples" {
  if (!l) return "simples";
  if (l.is_parcelado && l.parcelamento_id) return "parcelado";
  if (l.recorrente && l.recorrencia_pai_id) return "recorrente";
  return "simples";
}

// -- Resumo Card reutilizavel --
function ResumoCard({
  totalPago,
  totalReembolsado,
  totalLiquido,
  totalLuisa,
  totalReembolsadoAdriano,
  totalReembolsadoLuisa,
  accentColor = "#F59E0B",
}: {
  totalPago: number;
  totalReembolsado: number;
  totalLiquido: number;
  totalLuisa?: number;
  totalReembolsadoAdriano?: number;
  totalReembolsadoLuisa?: number;
  accentColor?: string;
}) {
  return (
    <div className="glass-card p-4 space-y-3">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Resumo do mes</p>

      <div className="flex items-center justify-between py-2 border-b border-[#E8ECF5]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(99,102,241,0.12)" }}>
            <TrendingDown size={14} className="text-primary" />
          </div>
          <span className="text-sm text-muted-foreground">Total pago</span>
        </div>
        <span className="text-sm font-bold text-foreground">{fmt(totalPago)}</span>
      </div>

      {totalReembolsadoLuisa != null ? (
        <>
          <div className="flex items-center justify-between py-2 border-b border-[#E8ECF5]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(13,148,136,0.12)" }}>
                <RotateCcw size={14} style={{ color: "#0D9488" }} />
              </div>
              <span className="text-sm text-muted-foreground">Reemb. Adriano</span>
            </div>
            <span className="text-sm font-bold" style={{ color: "#0D9488" }}>
              {totalReembolsadoAdriano && totalReembolsadoAdriano > 0 ? `- ${fmt(totalReembolsadoAdriano)}` : fmt(0)}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-[#E8ECF5]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(236,72,153,0.12)" }}>
                <RotateCcw size={14} style={{ color: "#EC4899" }} />
              </div>
              <span className="text-sm text-muted-foreground">Reemb. Luisa</span>
            </div>
            <span className="text-sm font-bold" style={{ color: "#EC4899" }}>
              {totalReembolsadoLuisa > 0 ? `- ${fmt(totalReembolsadoLuisa)}` : fmt(0)}
            </span>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-between py-2 border-b border-[#E8ECF5]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(13,148,136,0.12)" }}>
              <RotateCcw size={14} style={{ color: "#0D9488" }} />
            </div>
            <span className="text-sm text-muted-foreground">Reembolsado</span>
          </div>
          <span className="text-sm font-bold" style={{ color: "#0D9488" }}>
            {totalReembolsado > 0 ? `- ${fmt(totalReembolsado)}` : fmt(0)}
          </span>
        </div>
      )}

      {/* Bloco separado Luisa */}
      {totalLuisa != null && totalLuisa > 0 && (
        <div className="flex items-center justify-between py-2 border-b border-[#E8ECF5]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(236,72,153,0.12)" }}>
              <Heart size={14} style={{ color: "#EC4899" }} />
            </div>
            <span className="text-sm text-muted-foreground">Luisa</span>
          </div>
          <span className="text-sm font-bold" style={{ color: "#EC4899" }}>{fmt(totalLuisa)}</span>
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(217,112,82,0.12)" }}>
            <Wallet size={14} style={{ color: "#D97052" }} />
          </div>
          <span className="text-sm font-semibold text-foreground">Liquido (meu custo)</span>
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

  // == PAIS (exclui Adriano e Luisa) ==
  const lancamentosPais = useMemo(
    () => todos.filter((l) => {
      const sub = l.subcategoria_pais;
      if (!sub || sub === "") return false;
      if (l.adriano) return false;
      if (sub === "Adriano") return false;
      if (isLuisaLancamento(l)) return false;
      return true;
    }),
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
        return { cat, valor, emoji: cat === "Vicente" ? "\u{1F466}" : getGroupEmoji(group) };
      })
      .sort((a, b) => b.valor - a.valor);
  }, [despesasPais]);

  const lancamentosComReembolsoPais = useMemo(() => {
    return despesasPais.map((l) => {
      const reembolsado = getTotalReembolsado(todosReembolsos, l.id);
      return { ...l, reembolsado, liquido: Number(l.valor) - reembolsado };
    }).sort((a, b) => Number(a.valor) - Number(b.valor));
  }, [despesasPais, todosReembolsos]);

  // == ADRIANO (inclui Luisa) ==
  const lancamentosAdriano = useMemo(
    () => todos.filter((l) => (l.adriano === true || isLuisaLancamento(l)) && l.tipo === "despesa"),
    [todos],
  );

  // Separar Luisa
  const lancamentosLuisa = useMemo(() => lancamentosAdriano.filter(isLuisaLancamento), [lancamentosAdriano]);
  const lancamentosAdrianoSomente = useMemo(() => lancamentosAdriano.filter(l => !isLuisaLancamento(l)), [lancamentosAdriano]);

  const totalPagoAdriano = useMemo(() => lancamentosAdriano.reduce((s, l) => s + Number(l.valor), 0), [lancamentosAdriano]);
  const totalLuisa = useMemo(() => lancamentosLuisa.reduce((s, l) => s + Number(l.valor), 0), [lancamentosLuisa]);

  // Totais separados por quem pagou (so Adriano, sem Luisa)
  const totalVocePagouAdriano = useMemo(() =>
    lancamentosAdrianoSomente
      .filter(l => (l.pago_por || "voce").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === "voce")
      .reduce((s, l) => s + Number(l.valor), 0),
    [lancamentosAdrianoSomente]
  );
  const totalElepagouAdriano = useMemo(() =>
    lancamentosAdrianoSomente
      .filter(l => (l.pago_por || "voce").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") !== "voce")
      .reduce((s, l) => s + Number(l.valor), 0),
    [lancamentosAdrianoSomente]
  );

  const totalReembolsadoAdrianoTabela = useMemo(() => {
    const ids = new Set(lancamentosAdriano.map((l) => l.id));
    return todosReembolsos.filter((r) => ids.has(r.lancamento_id)).reduce((s, r) => s + Number(r.valor_reembolsado), 0);
  }, [lancamentosAdriano, todosReembolsos]);
  const totalLiquidoAdriano = totalPagoAdriano - totalReembolsadoAdrianoTabela;

  const porCategoriaAdriano = useMemo(() => {
    const map: Record<string, number> = {};
    lancamentosAdriano.forEach((l) => {
      if (isLuisaLancamento(l)) {
        map["Luisa"] = (map["Luisa"] || 0) + Number(l.valor);
      } else {
        const cat = l.categoria_macro || l.subcategoria || "Outros";
        map[cat] = (map[cat] || 0) + Number(l.valor);
      }
    });
    return Object.entries(map)
      .map(([cat, valor]) => {
        const group = getSubcategoriaGroup(cat) || cat;
        return { cat, valor, emoji: cat === "Luisa" ? "\u{1F469}\u200D\u{1F9B3}" : getGroupEmoji(group) };
      })
      .sort((a, b) => b.valor - a.valor);
  }, [lancamentosAdriano]);

  const lancamentosComReembolsoAdriano = useMemo(() => {
    return lancamentosAdriano.map((l) => {
      const reembolsado = getTotalReembolsado(todosReembolsos, l.id);
      return { ...l, reembolsado, liquido: Number(l.valor) - reembolsado };
    }).sort((a, b) => Number(a.valor) - Number(b.valor));
  }, [lancamentosAdriano, todosReembolsos]);

  const reembolsoByLancamento = useMemo(() => {
    const map = new Map<string, any>();
    for (const r of [...todosReembolsos].sort((a, b) => b.data_reembolso.localeCompare(a.data_reembolso))) {
      if (!map.has(r.lancamento_id)) map.set(r.lancamento_id, r);
    }
    return map;
  }, [todosReembolsos]);

  const totalReembolsadoAdrianoSeparado = useMemo(() => {
    const ids = new Set(lancamentosAdrianoSomente.map((l) => l.id));
    return todosReembolsos.filter((r) => ids.has(r.lancamento_id)).reduce((s, r) => s + Number(r.valor_reembolsado), 0);
  }, [lancamentosAdrianoSomente, todosReembolsos]);

  const totalReembolsadoLuisaSeparado = useMemo(() => {
    const ids = new Set(lancamentosLuisa.map((l) => l.id));
    return todosReembolsos.filter((r) => ids.has(r.lancamento_id)).reduce((s, r) => s + Number(r.valor_reembolsado), 0);
  }, [lancamentosLuisa, todosReembolsos]);

  // Saldo liquido Adriano: positivo = Adriano te deve, negativo = voce deve ao Adriano
  const saldoLiquidoAdriano = useMemo(() => {
    let saldo = 0;
    for (const l of lancamentosAdrianoSomente) {
      const valor = Number(l.valor) || 0;
      if (!valor) continue;
      const pagoPor = (l.pago_por || "voce").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (pagoPor === "voce") {
        saldo += valor;
      } else {
        saldo -= valor;
      }
    }
    saldo -= totalReembolsadoAdrianoSeparado;
    return saldo;
  }, [lancamentosAdrianoSomente, totalReembolsadoAdrianoSeparado]);

  // Saldo liquido Luisa: total despesas - reembolsos
  const saldoLiquidoLuisa = totalLuisa - totalReembolsadoLuisaSeparado;

  const [reembolsoTarget, setReembolsoTarget] = useState<any>(null);
  const addReembolso = useAddReembolso();
  const updateReembolso = useUpdateReembolso();
  const deleteReembolso = useDeleteReembolso();

  const handleSaveReembolso = async (data: {
    valor_reembolsado: number;
    quem_reembolsou: string;
    data_reembolso: string;
    observacao?: string;
  }) => {
    if (!reembolsoTarget) return;
    try {
      if (reembolsoTarget.reembolsoExistente?.id) {
        await updateReembolso.mutateAsync({
          id: reembolsoTarget.reembolsoExistente.id,
          updates: {
            valor_reembolsado: data.valor_reembolsado,
            quem_reembolsou: data.quem_reembolsou || (aba === "adriano" ? "Adriano" : "Pais"),
            data_reembolso: data.data_reembolso,
            observacao: data.observacao ?? null,
          },
        });
        toast.success("Reembolso atualizado!");
      } else {
        await addReembolso.mutateAsync({
          lancamento_id: reembolsoTarget.id,
          valor_reembolsado: data.valor_reembolsado,
          quem_reembolsou: data.quem_reembolsou || (aba === "adriano" ? "Adriano" : "Pais"),
          data_reembolso: data.data_reembolso,
          observacao: data.observacao ?? null,
        });
        toast.success("Reembolso registrado!");
      }
      setReembolsoTarget(null);
    } catch (e: any) {
      toast.error("Erro ao salvar: " + (e?.message || JSON.stringify(e)));
    }
  };

  const handleDeleteReembolso = async () => {
    if (!reembolsoTarget?.reembolsoExistente?.id) return;
    try {
      await deleteReembolso.mutateAsync(reembolsoTarget.reembolsoExistente.id);
      setReembolsoTarget(null);
      toast.success("Reembolso excluido!");
    } catch (e: any) {
      toast.error("Erro ao excluir: " + (e?.message || JSON.stringify(e)));
    }
  };

  // == Delete state & hooks (Adriano tab) ==
  const [actionsLanc, setActionsLanc] = useState<Lancamento | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Lancamento | null>(null);
  const [editTarget, setEditTarget] = useState<Lancamento | null>(null);

  const { data: cartoes = [] } = useCartoes();
  const updateLancamento = useUpdateLancamento();

  const handleSaveEdit = async (updates: Partial<Lancamento>) => {
    if (!editTarget) return;
    await updateLancamento.mutateAsync({ id: editTarget.id, ...updates });
    setEditTarget(null);
  };

  const deleteLancamento = useDeleteLancamento();
  const deleteFutureParcelamento = useDeleteFutureParcelamento();
  const deleteAllParcelamento = useDeleteAllParcelamento();
  const deleteFutureRecorrencia = useDeleteFutureRecorrencia();
  const deleteAllRecorrencia = useDeleteAllRecorrencia();

  const handleDeleteSingle = async () => {
    if (!deleteTarget) return;
    try {
      await deleteLancamento.mutateAsync(deleteTarget.id);
      toast.success("Lancamento excluido!");
    } catch (e: any) {
      toast.error("Erro ao excluir: " + (e?.message || ""));
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleDeleteFuture = async () => {
    if (!deleteTarget) return;
    try {
      const tipo = getTipo(deleteTarget);
      if (tipo === "parcelado" && deleteTarget.parcelamento_id) {
        await deleteFutureParcelamento.mutateAsync({ parcelamento_id: deleteTarget.parcelamento_id, fromDate: deleteTarget.data });
      } else if (tipo === "recorrente" && deleteTarget.recorrencia_pai_id) {
        await deleteFutureRecorrencia.mutateAsync({ recorrencia_pai_id: deleteTarget.recorrencia_pai_id, fromDate: deleteTarget.data });
      }
      toast.success("Lancamentos futuros excluidos!");
    } catch (e: any) {
      toast.error("Erro ao excluir: " + (e?.message || ""));
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleDeleteAll = async () => {
    if (!deleteTarget) return;
    try {
      const tipo = getTipo(deleteTarget);
      if (tipo === "parcelado" && deleteTarget.parcelamento_id) {
        await deleteAllParcelamento.mutateAsync(deleteTarget.parcelamento_id);
      } else if (tipo === "recorrente" && deleteTarget.recorrencia_pai_id) {
        await deleteAllRecorrencia.mutateAsync(deleteTarget.recorrencia_pai_id);
      }
      toast.success("Todos os lancamentos excluidos!");
    } catch (e: any) {
      toast.error("Erro ao excluir: " + (e?.message || ""));
    } finally {
      setDeleteTarget(null);
    }
  };

  // Helper para renderizar lista de lancamentos
  const renderLancamentos = (
    items: Array<{ id: string; descricao: string; data: string; subcategoria_pais: string | null; categoria_macro: string | null; valor: number; reembolsado: number; liquido: number; adriano: boolean; is_parcelado: boolean; parcelamento_id: string | null; recorrente: boolean; recorrencia_pai_id: string | null; pago_por?: string }>,
    borderColor: string,
    getEmoji: (l: any) => string,
  ) => (
    <div className="space-y-1">
      {items.map((l) => {
        const isLuisa = (l.subcategoria_pais || "").trim() === "Luisa" || (l.subcategoria_pais || "").trim() === "Luisa";
        const pagoPorNorm = (l.pago_por || "voce").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const vocePagou = pagoPorNorm === "voce";

        const row = (
          <div
            key={l.id}
            onClick={() => setReembolsoTarget({ ...l, reembolsoExistente: reembolsoByLancamento.get(l.id) || null })}
            className={cn(
              "flex items-center gap-3 py-2.5 last:border-0 cursor-pointer active:opacity-70",
              isLuisa && "rounded-xl bg-pink-50/60 px-2 -mx-2"
            )}
            style={{ borderBottom: `0.5px solid ${borderColor}` }}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm"
              style={{
                background: isLuisa
                  ? "rgba(236,72,153,0.15)"
                  : aba === "adriano"
                    ? "rgba(59,130,246,0.15)"
                    : "rgba(251,191,36,0.2)"
              }}
            >
              {getEmoji(l)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-[13px] font-semibold text-foreground truncate">{l.descricao}</p>
                {isLuisa && (
                  <span className="shrink-0 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider"
                    style={{ background: "rgba(236,72,153,0.15)", color: "#DB2777" }}>
                    LUISA
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] text-muted-foreground">
                  {formatDate(l.data)}
                  {l.subcategoria_pais && l.subcategoria_pais !== "Geral" && !isLuisa ? ` \u00B7 ${l.subcategoria_pais}` : ""}
                </p>
                {aba === "adriano" && !isLuisa && (
                  <span className="text-[9px] text-muted-foreground">
                    {vocePagou ? "\u{1F64B}\u200D\u2640\uFE0F eu paguei" : "\u{1F468} ele pagou"}
                  </span>
                )}
              </div>
            </div>

            <div className="text-right shrink-0">
              <p className="text-[13px] font-bold text-foreground">{fmt(Number(l.valor))}</p>
              {l.reembolsado > 0 && (
                <p className="text-[10px]" style={{ color: "#0D9488" }}>reimb. {fmt(l.reembolsado)}</p>
              )}
              {l.reembolsado > 0 && (
                <p className="text-[10px] text-muted-foreground font-semibold">liq. {fmt(l.liquido)}</p>
              )}
            </div>
          </div>
        );

        if (aba === "adriano") {
          return (
            <SwipeableItem
              key={l.id}
              onEdit={() => setActionsLanc(l as any)}
              onDelete={() => setDeleteTarget(l as any)}
            >
              {row}
            </SwipeableItem>
          );
        }

        // Aba pais tambem tem swipe para editar/excluir
        return (
          <SwipeableItem
            key={l.id}
            onEdit={() => setActionsLanc(l as any)}
            onDelete={() => setDeleteTarget(l as any)}
          >
            {row}
          </SwipeableItem>
        );
      })}
    </div>
  );

  return (
    <div className="gradient-bg min-h-screen pb-28 overflow-x-hidden">
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
            {"\u{1F9D3}"} Pais
          </button>
          <button onClick={() => setAba("adriano")}
            className={cn("flex-1 py-2 rounded-xl text-sm font-semibold transition-all",
              aba === "adriano" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground")}>
            {"\u{1F468}"} Adriano
          </button>
        </div>

        {/* == ABA PAIS == */}
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
                            <span style={{ color: "#0D9488" }}>- {fmt(reembolsadoCat)} reimb.</span>
                            <span className="text-muted-foreground font-semibold">liq. {fmt(liquidoCat)}</span>
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
              <EmptyState title="Sem lancamentos dos pais" subtitle="Nenhuma despesa dos pais registrada neste mes" />
            ) : (
              <div className="glass-card p-4 space-y-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Lancamentos</p>
                {renderLancamentos(
                  lancamentosComReembolsoPais,
                  "rgba(251,191,36,0.3)",
                  (l) => l.subcategoria_pais === "Vicente" ? "\u{1F466}" : getGroupEmoji(getSubcategoriaGroup(l.subcategoria_pais || "") || l.categoria_macro || "Outros"),
                )}

                {/* Receitas "Reembolso pais" */}
                {receitasReembolsoPais.map((l) => (
                  <div key={l.id} className="flex items-center gap-3 py-2.5 border-b border-amber-100 last:border-0">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm"
                      style={{ background: "rgba(13,148,136,0.15)" }}>{"\u{1F4B8}"}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-foreground truncate">{l.descricao}</p>
                      <p className="text-[10px] text-muted-foreground">{formatDate(l.data)} - Reembolso recebido</p>
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

        {/* == ABA ADRIANO == */}
        {aba === "adriano" && (
          <>
            {lancamentosAdriano.length > 0 && (
              <div className="glass-card p-4 space-y-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Resumo do mes</p>

                {/* Total dividido */}
                <div className="flex items-center justify-between py-2 border-b border-[#E8ECF5]">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(99,102,241,0.12)" }}>
                      <TrendingDown size={14} className="text-primary" />
                    </div>
                    <span className="text-sm text-muted-foreground">Total dividido</span>
                  </div>
                  <span className="text-sm font-bold text-foreground">{fmt(totalPagoAdriano - totalLuisa)}</span>
                </div>

                {/* Sub-item: voce pagou */}
                {totalVocePagouAdriano > 0 && (
                  <div className="flex items-center justify-between py-1.5 pl-9">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{"\u{1F64B}\u200D\u2640\uFE0F"}</span>
                      <span className="text-xs text-muted-foreground">Voce pagou</span>
                    </div>
                    <span className="text-xs font-bold text-foreground">{fmt(totalVocePagouAdriano)}</span>
                  </div>
                )}

                {/* Sub-item: Adriano pagou */}
                {totalElepagouAdriano > 0 && (
                  <div className="flex items-center justify-between py-1.5 pl-9">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{"\u{1F468}"}</span>
                      <span className="text-xs text-muted-foreground">Adriano pagou</span>
                    </div>
                    <span className="text-xs font-bold text-foreground">{fmt(totalElepagouAdriano)}</span>
                  </div>
                )}

                {/* Saldo Adriano */}
                <div className="flex items-center justify-between py-2 border-b border-[#E8ECF5]">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(59,130,246,0.12)" }}>
                      <Wallet size={14} style={{ color: "#3B82F6" }} />
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {saldoLiquidoAdriano >= 0 ? "Adriano te deve" : "Voce deve ao Adriano"}
                    </span>
                  </div>
                  <span className="text-sm font-bold" style={{ color: saldoLiquidoAdriano >= 0 ? "#3B82F6" : "#D97052" }}>
                    {fmt(Math.abs(saldoLiquidoAdriano))}
                  </span>
                </div>

                {/* Saldo Luisa */}
                {(totalLuisa > 0 || saldoLiquidoLuisa !== 0) && (
                  <div className="flex items-center justify-between py-2 border-b border-[#E8ECF5]">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(236,72,153,0.12)" }}>
                        <Heart size={14} style={{ color: "#EC4899" }} />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {saldoLiquidoLuisa >= 0 ? "Luisa te deve" : "Voce deve a Luisa"}
                      </span>
                    </div>
                    <span className="text-sm font-bold" style={{ color: saldoLiquidoLuisa >= 0 ? "#EC4899" : "#D97052" }}>
                      {fmt(Math.abs(saldoLiquidoLuisa))}
                    </span>
                  </div>
                )}

                {/* Total liquido a receber */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(217,112,82,0.12)" }}>
                      <Wallet size={14} style={{ color: "#D97052" }} />
                    </div>
                    <span className="text-sm font-semibold text-foreground">Total liquido</span>
                  </div>
                  <span className="text-lg font-bold" style={{ color: (saldoLiquidoAdriano + saldoLiquidoLuisa) >= 0 ? "#3B82F6" : "#D97052" }}>
                    {fmt(Math.abs(saldoLiquidoAdriano + saldoLiquidoLuisa))}
                  </span>
                </div>
              </div>
            )}

            {porCategoriaAdriano.length > 0 && (
              <div className="glass-card p-4 space-y-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Despesas por categoria</p>
                <div className="space-y-2.5">
                  {porCategoriaAdriano.map(({ cat, valor, emoji }) => {
                    const pct = totalPagoAdriano > 0 ? (valor / totalPagoAdriano) * 100 : 0;
                    const isLuisaCat = cat === "Luisa";
                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-sm shrink-0">{emoji}</span>
                            <span className={cn("text-[12px] font-medium truncate",
                              isLuisaCat ? "text-pink-700" : "text-foreground")}>{cat}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span className="text-[10px] text-muted-foreground">{pct.toFixed(0)}%</span>
                            <span className={cn("text-[12px] font-bold",
                              isLuisaCat ? "text-pink-700" : "text-foreground")}>{fmt(valor)}</span>
                          </div>
                        </div>
                        <div className={cn("h-1 rounded-full overflow-hidden",
                          isLuisaCat ? "bg-pink-100" : "bg-blue-100")}>
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, background: isLuisaCat ? "#EC4899" : "#3B82F6" }} />
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
              <EmptyState title="Sem lancamentos do Adriano" subtitle="Marque 'Dividir com Adriano' ao criar uma despesa" />
            ) : (
              <div className="glass-card p-4 space-y-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Lancamentos</p>
                {renderLancamentos(
                  lancamentosComReembolsoAdriano,
                  "rgba(59,130,246,0.2)",
                  (l) => isLuisaLancamento(l as any) ? "\u{1F469}\u200D\u{1F9B3}" : "\u{1F468}",
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
          existingReembolso={reembolsoTarget.reembolsoExistente || null}
          onSave={handleSaveReembolso}
          onDelete={reembolsoTarget.reembolsoExistente ? handleDeleteReembolso : undefined}
          isPending={addReembolso.isPending || updateReembolso.isPending}
          isDeletePending={deleteReembolso.isPending}
        />
      )}

      <LancamentoActions
        open={!!actionsLanc}
        onClose={() => setActionsLanc(null)}
        descricao={actionsLanc?.descricao}
        onEdit={() => {
          setEditTarget(actionsLanc);
          setActionsLanc(null);
        }}
        onDelete={() => {
          setDeleteTarget(actionsLanc);
          setActionsLanc(null);
        }}
      />

      <DeleteConfirmSheet
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        tipo={getTipo(deleteTarget)}
        descricao={deleteTarget?.descricao}
        onDeleteSingle={handleDeleteSingle}
        onDeleteFuture={handleDeleteFuture}
        onDeleteAll={handleDeleteAll}
      />

      {editTarget && (
        <EditLancamentoModal
          open={!!editTarget}
          lancamento={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={handleSaveEdit}
          cartoes={cartoes}
        />
      )}
    </div>
  );
}
