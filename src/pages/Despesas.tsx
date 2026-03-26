import { useState, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight, Trash2, CheckSquare, Square } from "lucide-react";
import SwipeableItem from "@/components/SwipeableItem";
import BottomNav from "@/components/BottomNav";
import EmptyState from "@/components/EmptyState";
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
  type Lancamento,
} from "@/hooks/useLancamentos";
import { useCartoes } from "@/hooks/useCartoes";
import { getGroupEmoji, getSubcategoriaGroup, detectSubcategoria } from "@/lib/subcategorias";
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
  return `${d}/${m}/${y}`;
}

// ── Row ────────────────────────────────────────────────────────────────────
interface RowProps {
  lancamento: Lancamento;
  onTap: (l: Lancamento) => void;
  selected: boolean;
  selectionMode: boolean;
  onToggleSelect: (id: string) => void;
}

const LancamentoRow = ({ lancamento: l, onTap, selected, selectionMode, onToggleSelect }: RowProps) => {
  const isReceita = l.tipo === "receita";
  const isResgate = isReceita && l.categoria === "resgate_investimento";
  const subDetectada = l.subcategoria || detectSubcategoria(l.descricao || "") || null;
  const group = getSubcategoriaGroup(subDetectada || "") || l.categoria_macro || l.categoria || null;
  const emojiMap: Record<string, string> = {
    Moradia: "🏘️",
    Alimentação: "🥗",
    Transporte: "🚗",
    Saúde: "💊",
    Pessoal: "💅",
    Lazer: "🎮",
    Investimentos: "📈",
  };
  const emoji = isResgate ? "📈" : group ? emojiMap[group] || getGroupEmoji(group) : isReceita ? "🤑" : "🔴";
  const isParcelado = l.is_parcelado && l.parcela_total && l.parcela_total > 1;
  const isRecorrente = l.recorrente;
  const isPais = !!(l.subcategoria_pais && l.subcategoria_pais !== "");
  const isVicente = l.subcategoria_pais === "Vicente";
  const isLuisa = l.subcategoria_pais === "Luísa";

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-2xl border transition-colors",
        selected
          ? "border-primary/40 bg-primary/5"
          : isLuisa
            ? "bg-white border-l-2 border-l-pink-400 border-t-transparent border-r-transparent border-b-transparent"
            : isPais
              ? "bg-white border-l-2 border-l-amber-400 border-t-transparent border-r-transparent border-b-transparent"
              : "bg-white border-transparent",
      )}
      onClick={() => (selectionMode ? onToggleSelect(l.id) : onTap(l))}
    >
      {selectionMode && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(l.id);
          }}
          className="shrink-0 text-primary"
        >
          {selected ? <CheckSquare size={18} /> : <Square size={18} className="text-muted-foreground" />}
        </button>
      )}

      <div
        className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 text-xl"
        style={{
          background: isVicente
            ? "#DBEAFE"
            : isLuisa
              ? "#FCE7F3"
              : isPais
                ? "#FDE68A"
                : isResgate
                  ? "rgba(120,113,108,0.12)"
                  : isReceita
                    ? "rgba(13,148,136,0.15)"
                    : "rgba(99,102,241,0.12)",
        }}
      >
        {isVicente ? "👦" : isLuisa ? "👧" : isPais ? "🧓" : emoji}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold text-foreground truncate">{l.descricao}</p>
          {isResgate && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold shrink-0" style={{ background: "rgba(120,113,108,0.15)", color: "#78716C" }}>
              RESGATE
            </span>
          )}
          {isPais && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-700 font-semibold shrink-0">
              PAIS
            </span>
          )}
          {isVicente && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-200 text-blue-700 font-semibold shrink-0">
              VICENTE
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-muted-foreground">{formatDate(l.data)}</span>
          {isParcelado && (
            <>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#E8ECF5] text-muted-foreground">
                {l.parcela_atual}/{l.parcela_total}x
              </span>
              {l.parcela_atual === l.parcela_total && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
                  🏁 última
                </span>
              )}
            </>
          )}
          {isRecorrente && !isParcelado && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#E8ECF5] text-muted-foreground">
              recorrente
            </span>
          )}
          {l.subcategoria && <span className="text-[10px] text-muted-foreground/70 truncate">{l.subcategoria}</span>}
        </div>
      </div>

      <p
        className="text-sm font-bold shrink-0"
        style={{ color: isPais ? "#B45309" : isResgate ? "#78716C" : isReceita ? "#0D9488" : "#1E2A45" }}
      >
        {isReceita ? "+" : "-"}
        {fmt(Number(l.valor))}
      </p>
    </div>
  );
};

// ── Despesas ───────────────────────────────────────────────────────────────
export default function Despesas() {
  const [mesAtual, setMesAtual] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const mesRef = getMesRef(mesAtual.year, mesAtual.month);
  const mesLabel = getMesLabel(mesAtual.year, mesAtual.month);

  const { data: lancamentos = [], isLoading } = useLancamentos(mesRef);
  const { data: cartoes = [] } = useCartoes();

  const deleteLancamento = useDeleteLancamento();
  const deleteFutureParcelamento = useDeleteFutureParcelamento();
  const deleteAllParcelamento = useDeleteAllParcelamento();
  const deleteFutureRecorrencia = useDeleteFutureRecorrencia();
  const deleteAllRecorrencia = useDeleteAllRecorrencia();
  const updateLancamento = useUpdateLancamento();
  // ── state ─────────────────────────────────────────────────────────────────
  const [actionsLanc, setActionsLanc] = useState<Lancamento | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Lancamento | null>(null);
  const [editTarget, setEditTarget] = useState<Lancamento | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [filterTipo, setFilterTipo] = useState<"todos" | "despesa" | "receita" | "resgate">("todos");

  const prevMes = () =>
    setMesAtual(({ year, month }) => (month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }));
  const nextMes = () =>
    setMesAtual(({ year, month }) => (month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }));

  // ── filter ────────────────────────────────────────────────────────────────
  const lista = useMemo(() => {
    let filtered: typeof lancamentos;
    if (filterTipo === "todos") filtered = lancamentos;
    else if (filterTipo === "resgate") filtered = lancamentos.filter((l) => l.tipo === "receita" && l.categoria === "resgate_investimento");
    else if (filterTipo === "receita") filtered = lancamentos.filter((l) => l.tipo === "receita" && l.categoria !== "resgate_investimento");
    else filtered = lancamentos.filter((l) => l.tipo === filterTipo);
    return [...filtered].sort((a, b) => Number(a.valor) - Number(b.valor));
  }, [lancamentos, filterTipo]);

  const totalDespesas = useMemo(
    () => lancamentos.filter((l) => l.tipo === "despesa").reduce((s, l) => s + Number(l.valor), 0),
    [lancamentos],
  );
  const totalReceitas = useMemo(
    () => lancamentos.filter((l) => l.tipo === "receita" && l.categoria !== "resgate_investimento").reduce((s, l) => s + Number(l.valor), 0),
    [lancamentos],
  );
  const totalResgates = useMemo(
    () => lancamentos.filter((l) => l.tipo === "receita" && l.categoria === "resgate_investimento").reduce((s, l) => s + Number(l.valor), 0),
    [lancamentos],
  );

  // ── selection ─────────────────────────────────────────────────────────────
  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const exitSelection = () => {
    setSelectionMode(false);
    setSelected(new Set());
  };

  // ── delete helpers ────────────────────────────────────────────────────────
  const getTipo = (l: Lancamento): "parcelado" | "recorrente" | "simples" => {
    if (l.is_parcelado && l.parcelamento_id) return "parcelado";
    if (l.recorrente && l.recorrencia_pai_id) return "recorrente";
    return "simples";
  };

  const handleDeleteSingle = async () => {
    if (!deleteTarget) return;
    await deleteLancamento.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  const handleDeleteFuture = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.is_parcelado && deleteTarget.parcelamento_id) {
      await deleteFutureParcelamento.mutateAsync({
        parcelamento_id: deleteTarget.parcelamento_id,
        fromDate: deleteTarget.data,
      });
    } else if (deleteTarget.recorrente && deleteTarget.recorrencia_pai_id) {
      await deleteFutureRecorrencia.mutateAsync({
        recorrencia_pai_id: deleteTarget.recorrencia_pai_id,
        fromDate: deleteTarget.data,
      });
    }
    setDeleteTarget(null);
  };

  const handleDeleteAll = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.is_parcelado && deleteTarget.parcelamento_id) {
      await deleteAllParcelamento.mutateAsync(deleteTarget.parcelamento_id);
    } else if (deleteTarget.recorrente && deleteTarget.recorrencia_pai_id) {
      await deleteAllRecorrencia.mutateAsync(deleteTarget.recorrencia_pai_id);
    }
    setDeleteTarget(null);
  };

  // ── bulk delete ───────────────────────────────────────────────────────────
  const handleBulkDelete = async () => {
    const ids = Array.from(selected);
    for (const id of ids) {
      await deleteLancamento.mutateAsync(id);
    }
    exitSelection();
    setBulkDeleteOpen(false);
  };

  // ── edit ──────────────────────────────────────────────────────────────────
  const handleSaveEdit = async (updates: Partial<Lancamento>) => {
    if (!editTarget) return;
    await updateLancamento.mutateAsync({ id: editTarget.id, ...updates });
    setEditTarget(null);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="gradient-bg min-h-screen pb-28">
      <BottomNav />

      <div className="max-w-lg mx-auto px-4 pt-14 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">Transações</h1>
            {!selectionMode && <p className="text-[11px] text-muted-foreground">{mesLabel}</p>}
          </div>
          <div className="flex items-center gap-2">
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

        {/* Resumo */}
        {!selectionMode && (
          <div className="grid grid-cols-3 gap-2">
            <div className="glass-card px-2 py-3 border-l-2 min-w-0" style={{ borderLeftColor: "#6366F1" }}>
              <p className="text-[10px] text-muted-foreground">Despesas</p>
              <p className="text-xs font-bold text-foreground truncate">{fmt(totalDespesas)}</p>
            </div>
            <div className="glass-card px-2 py-3 border-l-2 min-w-0" style={{ borderLeftColor: "#0D9488" }}>
              <p className="text-[10px] text-muted-foreground">Receitas</p>
              <p className="text-xs font-bold text-foreground truncate">{fmt(totalReceitas)}</p>
            </div>
            <div className="glass-card px-2 py-3 border-l-2 min-w-0" style={{ borderLeftColor: "#78716C" }}>
              <p className="text-[10px] text-muted-foreground">Resgates</p>
              <p className="text-xs font-bold text-foreground truncate">{fmt(totalResgates)}</p>
            </div>
          </div>
        )}

        {/* Filtros / Seleção */}
        <div className="flex gap-2 items-center">
          {selectionMode ? (
            <>
              <span className="text-xs text-muted-foreground font-medium">
                {selected.size} selecionado{selected.size !== 1 ? "s" : ""}
              </span>
              {selected.size > 0 && (
                <button
                  onClick={() => setBulkDeleteOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold"
                >
                  <Trash2 size={13} />
                  Excluir
                </button>
              )}
              <button
                onClick={exitSelection}
                className="ml-auto px-3 py-1.5 rounded-xl bg-secondary text-muted-foreground text-xs font-semibold"
              >
                Cancelar
              </button>
            </>
          ) : (
            <>
              {(["todos", "despesa", "receita", "resgate"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterTipo(t)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors",
                    filterTipo === t
                      ? t === "resgate"
                        ? "text-white"
                        : "gradient-emerald text-primary-foreground"
                      : "bg-white border border-border text-muted-foreground",
                  )}
                  style={filterTipo === t && t === "resgate" ? { background: "#78716C" } : undefined}
                >
                  {t === "todos" ? "Todos" : t === "despesa" ? "Despesas" : t === "receita" ? "Receitas" : "Resgates"}
                </button>
              ))}
              <button
                onClick={() => {
                  setSelectionMode(true);
                  setSelected(new Set());
                }}
                className="ml-auto px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-border text-muted-foreground"
              >
                Selecionar
              </button>
            </>
          )}
        </div>

        {/* Lista */}
        {isLoading ? (
          <div className="text-center py-12 text-sm text-muted-foreground">Carregando...</div>
        ) : lista.length === 0 ? (
          <EmptyState title="Nenhum lançamento" subtitle="Adicione sua primeira transação pelo botão +" />
        ) : (
          <div className="space-y-2">
            {lista.map((l) =>
              selectionMode ? (
                <LancamentoRow
                  key={l.id}
                  lancamento={l}
                  onTap={(ll) => setActionsLanc(ll)}
                  selected={selected.has(l.id)}
                  selectionMode={selectionMode}
                  onToggleSelect={toggleSelect}
                />
              ) : (
                <SwipeableItem key={l.id} onEdit={() => setEditTarget(l)} onDelete={() => setDeleteTarget(l)}>
                  <LancamentoRow
                    lancamento={l}
                    onTap={(ll) => setActionsLanc(ll)}
                    selected={false}
                    selectionMode={false}
                    onToggleSelect={toggleSelect}
                  />
                </SwipeableItem>
              ),
            )}
          </div>
        )}
      </div>

      {/* Actions sheet */}
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

      {/* Delete confirm */}
      {deleteTarget && (
        <DeleteConfirmSheet
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          tipo={getTipo(deleteTarget)}
          descricao={deleteTarget.descricao}
          onDeleteSingle={handleDeleteSingle}
          onDeleteFuture={handleDeleteFuture}
          onDeleteAll={handleDeleteAll}
        />
      )}

      {/* Bulk delete confirm */}
      <DeleteConfirmSheet
        open={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        tipo="simples"
        descricao={`${selected.size} lançamento(s) selecionado(s)`}
        onDeleteSingle={handleBulkDelete}
        onDeleteFuture={handleBulkDelete}
        onDeleteAll={handleBulkDelete}
      />

      {/* Edit modal */}
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

