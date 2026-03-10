import BottomNav from "@/components/BottomNav";
import EmptyState from "@/components/EmptyState";
import { useLancamentos, useUpdateLancamento, useDeleteLancamento } from "@/hooks/useLancamentos";
import { useAllReembolsos, useAddReembolso, getTotalReembolsado } from "@/hooks/useReembolsos";
import type { Lancamento } from "@/hooks/useLancamentos";
import {
  DollarSign, HandCoins, RefreshCw, Receipt,
  ArrowDownLeft, ChevronLeft, ChevronRight, Plus, Check,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import SwipeableItem from "@/components/SwipeableItem";
import LancamentoActions from "@/components/LancamentoActions";
import EditLancamentoModal from "@/components/EditLancamentoModal";
import ReembolsoModal from "@/components/ReembolsoModal";
import ReembolsoFixoModal from "@/components/ReembolsoFixoModal";
import { getGroupEmoji } from "@/lib/subcategorias";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });


const subcatLabels: Record<string, string> = {
  paguei_por_eles: "Paguei por eles",
  paguei_recebo_depois: "Paguei, recebo depois",
  eles_pagaram: "Eles pagaram",
  usaram_meu_cartao: "Usaram meu cartão",
};

const Pais = () => {
  const [mesAtual, setMesAtual] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedLanc, setSelectedLanc] = useState<Lancamento | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [reembolsoOpen, setReembolsoOpen] = useState(false);
  const [reembolsoFixoOpen, setReembolsoFixoOpen] = useState(false);

  const mesRef = `${mesAtual.year}-${String(mesAtual.month + 1).padStart(2, "0")}`;
  const mesLabel = new Date(mesAtual.year, mesAtual.month, 1)
    .toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const mesLabelFmt = mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1);
  const { data: lancamentos = [], isLoading } = useLancamentos(mesRef);
  const { data: allReembolsos = [] } = useAllReembolsos();
  const updateMut = useUpdateLancamento();
  const deleteMut = useDeleteLancamento();
  const addReembolsoMut = useAddReembolso();

  const paisDespesas = useMemo(() => lancamentos.filter((l) => l.tipo === "despesa" && l.categoria === "pais"), [lancamentos]);
  const reembolsos = useMemo(() => lancamentos.filter((l) => l.tipo === "receita" && l.categoria === "reembolso_pais"), [lancamentos]);

  const custoTotal = useMemo(() => paisDespesas.reduce((s, d) => s + Number(d.valor), 0), [paisDespesas]);
  const euPaguei = useMemo(() =>
    paisDespesas
      .filter((d) => d.subcategoria_pais === "paguei_por_eles" || d.subcategoria_pais === "paguei_recebo_depois")
      .reduce((s, d) => s + Number(d.valor), 0),
    [paisDespesas]
  );
  const reembolsado = useMemo(() => reembolsos.reduce((s, l) => s + Number(l.valor), 0), [reembolsos]);
  const subsidioLiquido = euPaguei - reembolsado;

  const historico = useMemo(() => {
    return [...paisDespesas, ...reembolsos].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [paisDespesas, reembolsos]);

  const hasData = historico.length > 0;

  const openActions = (lanc: Lancamento) => { setSelectedLanc(lanc); setActionsOpen(true); };
  const openEdit = (lanc: Lancamento) => { setSelectedLanc(lanc); setEditOpen(true); setDeleteConfirm(false); };
  const openDelete = (lanc: Lancamento) => { setSelectedLanc(lanc); setEditOpen(true); setDeleteConfirm(true); };
  const openReembolso = (lanc: Lancamento) => { setSelectedLanc(lanc); setReembolsoOpen(true); };

  const handleSave = async (data: any) => {
    if (!selectedLanc) return;
    try {
      await updateMut.mutateAsync({ id: selectedLanc.id, ...data });
      toast.success("Lançamento atualizado ✓");
      setEditOpen(false);
    } catch { toast.error("Erro ao atualizar."); }
  };

  const handleDelete = async () => {
    if (!selectedLanc) return;
    try {
      await deleteMut.mutateAsync(selectedLanc.id);
      toast.success("Lançamento excluído ✓");
      setEditOpen(false); setActionsOpen(false);
    } catch { toast.error("Erro ao excluir."); }
  };

  const handleReembolso = async (data: { valor_reembolsado: number; quem_reembolsou: string; data_reembolso: string; observacao?: string }) => {
    if (!selectedLanc) return;
    try {
      await addReembolsoMut.mutateAsync({
        lancamento_id: selectedLanc.id,
        valor_reembolsado: data.valor_reembolsado,
        quem_reembolsou: data.quem_reembolsou,
        data_reembolso: data.data_reembolso,
        observacao: data.observacao || null,
      });
      toast.success("Reembolso registrado ✓");
      setReembolsoOpen(false);
    } catch { toast.error("Erro ao registrar reembolso."); }
  };

  const handleMarkReceived = async (item: Lancamento) => {
    try {
      await updateMut.mutateAsync({ id: item.id, pago: true });
      toast.success("Reembolso marcado como recebido ✓");
    } catch { toast.error("Erro ao atualizar."); }
  };

  const renderReembolsoBadge = (item: Lancamento) => {
    const totalReemb = getTotalReembolsado(allReembolsos, item.id);
    if (totalReemb <= 0) return null;
    const valorOriginal = Number(item.valor);
    const isTotal = totalReemb >= valorOriginal;
    return (
      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full inline-block mt-0.5 bg-primary/15 text-primary">
        {isTotal ? "↩️ Reembolso total · Quitado ✓" : `↩️ Reembolso parcial: ${fmt(totalReemb)}`}
      </span>
    );
  };

  const renderValor = (item: Lancamento, isReembolso: boolean) => {
    const totalReemb = getTotalReembolsado(allReembolsos, item.id);
    const valorOriginal = Number(item.valor);
    const prefix = isReembolso ? "+" : "-";
    if (totalReemb <= 0) {
      return (
        <p className={`text-sm font-semibold tabular-nums ${isReembolso ? "text-primary" : "text-foreground"}`}>
          {prefix}{fmt(valorOriginal)}
        </p>
      );
    }
    const valorLiquido = Math.max(0, valorOriginal - totalReemb);
    return (
      <div className="text-right">
        <p className="text-[10px] text-muted-foreground line-through tabular-nums">{prefix}{fmt(valorOriginal)}</p>
        <p className={`text-sm font-semibold tabular-nums ${isReembolso ? "text-primary" : "text-foreground"}`}>{prefix}{fmt(valorLiquido)}</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen gradient-bg overflow-x-hidden pb-[90px] md:pb-6">
      <div className="px-4 pt-12 w-full">
        <div className="flex items-center justify-between mb-4 animate-fade-up">
          <h1 className="text-xl font-semibold text-foreground">Pais</h1>
          <button onClick={() => setReembolsoFixoOpen(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-lg">
            <Plus size={14} /> Reembolso fixo
          </button>
        </div>

        {/* Month Selector */}
        <div className="flex items-center justify-center gap-3 mb-5 animate-fade-up" style={{ animationDelay: "0.03s" }}>
          <button onClick={() => setMesAtual(p => { const d = new Date(p.year, p.month - 1, 1); return { year: d.getFullYear(), month: d.getMonth() }; })} className="p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-semibold text-foreground min-w-[160px] text-center">{mesLabelFmt}</span>
          <button onClick={() => setMesAtual(p => { const d = new Date(p.year, p.month + 1, 1); return { year: d.getFullYear(), month: d.getMonth() }; })} className="p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>

        {!hasData && !isLoading ? (
          <EmptyState title="Sem gastos com os pais esse mês 💚" />
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3 mb-6 animate-fade-up" style={{ animationDelay: "0.05s" }}>
              {[
                { icon: DollarSign, label: "Custo Total", value: custoTotal, color: "text-foreground" },
                { icon: HandCoins, label: "Eu Paguei", value: euPaguei, color: "text-destructive" },
                { icon: RefreshCw, label: "Reembolsado", value: reembolsado, color: "text-primary" },
                { icon: Receipt, label: "Meu Subsídio Líquido", value: subsidioLiquido, color: "text-yellow-400" },
              ].map((card) => (
                <div key={card.label} className="glass-card p-4">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center mb-2">
                    <card.icon size={16} className={card.color} />
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-1">{card.label}</p>
                  <p className={`text-lg font-bold ${card.color} tabular-nums`}>{fmt(card.value)}</p>
                </div>
              ))}
            </div>

            {/* Resumo por Categoria */}
            {(() => {
              const catMap: Record<string, { total: number; euPaguei: number; elesPagaram: number }> = {};
              paisDespesas.forEach((d) => {
                const key = d.categoria_macro
                  ? `${getGroupEmoji(d.categoria_macro)} ${d.categoria_macro}`
                  : (d.subcategoria || "Sem categoria");
                if (!catMap[key]) catMap[key] = { total: 0, euPaguei: 0, elesPagaram: 0 };
                catMap[key].total += Number(d.valor);
                if (d.subcategoria_pais === "paguei_por_eles" || d.subcategoria_pais === "paguei_recebo_depois") {
                  catMap[key].euPaguei += Number(d.valor);
                } else {
                  catMap[key].elesPagaram += Number(d.valor);
                }
              });
              const entries = Object.entries(catMap).filter(([, v]) => v.total > 0).sort((a, b) => b[1].total - a[1].total);
              if (entries.length === 0) return null;
              return (
                <div className="mb-6 animate-fade-up" style={{ animationDelay: "0.08s" }}>
                  <h2 className="text-sm font-semibold text-foreground mb-3">Por categoria</h2>
                  <div className="space-y-2">
                    {entries.map(([name, vals]) => (
                      <div key={name} className="glass-card p-3">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-semibold text-foreground">{name}</p>
                          <p className="text-xs font-bold text-foreground tabular-nums">{fmt(vals.total)}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-[10px] text-muted-foreground">Você pagou: <span className="font-semibold text-foreground">{fmt(vals.euPaguei)}</span></p>
                          <p className="text-[10px] text-muted-foreground">Eles pagaram: <span className="font-semibold text-foreground">{fmt(vals.elesPagaram)}</span></p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Histórico */}
            <div className="mb-6 animate-fade-up" style={{ animationDelay: "0.1s" }}>
              <h2 className="text-sm font-semibold text-foreground mb-3">Histórico</h2>
              <div className="space-y-1">
                {historico.map((item) => {
                  const isReembolso = item.tipo === "receita";
                  const subLabel = item.subcategoria_pais ? subcatLabels[item.subcategoria_pais] || item.subcategoria_pais : (isReembolso ? "Reembolso recebido" : "");
                  const isRecorrente = item.recorrente;
                  const isPago = item.pago;
                  return (
                    <SwipeableItem key={item.id} onEdit={() => openEdit(item)} onDelete={() => openDelete(item)}>
                      <div onClick={() => openActions(item)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/30 transition-colors cursor-pointer">
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                          {isReembolso ? <ArrowDownLeft size={18} className="text-primary" /> : <Receipt size={18} className="text-muted-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{item.descricao}</p>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className={`text-[11px] ${isReembolso ? "text-primary" : "text-muted-foreground"}`}>{subLabel}</p>
                            {item.categoria_macro && <span className="text-[11px] text-muted-foreground">· {getGroupEmoji(item.categoria_macro)} {item.categoria_macro}</span>}
                            {item.subcategoria && <span className="text-[11px] text-muted-foreground">· {item.subcategoria}</span>}
                            <span className="text-[11px] text-muted-foreground">· {new Date(item.data + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {isRecorrente && isReembolso && !isPago && (
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-yellow-500/15 text-yellow-500">⏳ Aguardando</span>
                            )}
                            {isRecorrente && isReembolso && isPago && (
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">✅ Recebido</span>
                            )}
                            {isRecorrente && (
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">🔄 Recorrente</span>
                            )}
                            {renderReembolsoBadge(item)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isRecorrente && isReembolso && !isPago && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleMarkReceived(item); }}
                              className="p-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                              title="Marcar como recebido"
                            >
                              <Check size={14} />
                            </button>
                          )}
                          {renderValor(item, isReembolso)}
                        </div>
                      </div>
                    </SwipeableItem>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      <LancamentoActions
        open={actionsOpen}
        onClose={() => setActionsOpen(false)}
        onEdit={() => { if (selectedLanc) openEdit(selectedLanc); }}
        onDelete={() => { if (selectedLanc) openDelete(selectedLanc); setActionsOpen(false); }}
        onReembolso={() => { if (selectedLanc) openReembolso(selectedLanc); }}
        descricao={selectedLanc?.descricao}
      />

      {selectedLanc && (
        <EditLancamentoModal
          open={editOpen}
          onClose={() => { setEditOpen(false); setDeleteConfirm(false); }}
          showDeleteConfirm={deleteConfirm}
          onConfirmDelete={handleDelete}
          onSave={handleSave}
          isPending={updateMut.isPending || deleteMut.isPending}
          initial={{
            descricao: selectedLanc.descricao,
            valor: Number(selectedLanc.valor),
            categoria: selectedLanc.categoria,
            data: selectedLanc.data,
            subcategoria_pais: selectedLanc.subcategoria_pais,
            subcategoria: selectedLanc.subcategoria,
            categoria_macro: selectedLanc.categoria_macro,
            parcela_atual: selectedLanc.parcela_atual,
            parcela_total: selectedLanc.parcela_total,
          }}
        />
      )}

      {selectedLanc && (
        <ReembolsoModal
          open={reembolsoOpen}
          onClose={() => setReembolsoOpen(false)}
          onSave={handleReembolso}
          descricao={selectedLanc.descricao}
          valorOriginal={Number(selectedLanc.valor)}
          isPending={addReembolsoMut.isPending}
        />
      )}

      <ReembolsoFixoModal open={reembolsoFixoOpen} onClose={() => setReembolsoFixoOpen(false)} />

      <BottomNav />
    </div>
  );
};

export default Pais;
