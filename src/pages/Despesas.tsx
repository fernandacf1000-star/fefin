import BottomNav from "@/components/BottomNav";
import EmptyState from "@/components/EmptyState";
import {
  useLancamentos,
  useUpdateLancamento,
  useUpdateParcelamentoFuturas,
  useUpdateAllParcelamento,
  useDeleteLancamento,
  useDeleteFutureParcelamento,
  useDeleteAllParcelamento,
  useDeleteFutureRecorrencia,
  useDeleteAllRecorrencia,
  fetchParcelamentoCount,
} from "@/hooks/useLancamentos";
import { useAllReembolsos, useAddReembolso, getTotalReembolsado } from "@/hooks/useReembolsos";
import {
  CreditCard, Users, CircleDollarSign,
  Receipt, ChevronLeft, ChevronRight, X, SlidersHorizontal,
  ArrowUpRight, CheckSquare, Trash2,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import SwipeableItem from "@/components/SwipeableItem";
import LancamentoActions from "@/components/LancamentoActions";
import EditLancamentoModal, { type ParcelamentoMode } from "@/components/EditLancamentoModal";
import ReembolsoModal from "@/components/ReembolsoModal";
import ParcelamentoEditSheet from "@/components/ParcelamentoEditSheet";
import DeleteConfirmSheet from "@/components/DeleteConfirmSheet";
import type { Lancamento } from "@/hooks/useLancamentos";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { SUBCATEGORIA_GROUPS, getGroupEmoji } from "@/lib/subcategorias";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type TipoFilter = "Todas" | "Despesas" | "Receitas" | "Parceladas" | "Pais";

const today = new Date().toISOString().split("T")[0];


const Despesas = () => {
  const [tipoFilter, setTipoFilter] = useState<TipoFilter>("Todas");
  const [catFilters, setCatFilters] = useState<string[]>([]);
  const [subcatFilters, setSubcatFilters] = useState<string[]>([]);
  const [mesAtual, setMesAtual] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const [draftTipo, setDraftTipo] = useState<TipoFilter>("Todas");
  const [draftCats, setDraftCats] = useState<string[]>([]);
  const [draftSubcats, setDraftSubcats] = useState<string[]>([]);

  const [selectedLanc, setSelectedLanc] = useState<Lancamento | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteSheetOpen, setDeleteSheetOpen] = useState(false);
  const [reembolsoOpen, setReembolsoOpen] = useState(false);

  // Multi-select mode
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);

  // Parcelamento edit flow
  const [parcelamentoSheetOpen, setParcelamentoSheetOpen] = useState(false);
  const [editMode, setEditMode] = useState<ParcelamentoMode>(null);
  const [parcelamentoCount, setParcelamentoCount] = useState(0);

  const queryClient = useQueryClient();
  const mesRef = `${mesAtual.year}-${String(mesAtual.month + 1).padStart(2, "0")}`;
  const mesLabel = new Date(mesAtual.year, mesAtual.month, 1)
    .toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const mesLabelFmt = mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1);
  const { data: lancamentos = [], isLoading } = useLancamentos(mesRef);
  const { data: allReembolsos = [] } = useAllReembolsos();
  const updateMut = useUpdateLancamento();
  const updateFuturasMut = useUpdateParcelamentoFuturas();
  const updateAllMut = useUpdateAllParcelamento();
  const deleteMut = useDeleteLancamento();
  const deleteFutureParc = useDeleteFutureParcelamento();
  const deleteAllParc = useDeleteAllParcelamento();
  const deleteFutureRec = useDeleteFutureRecorrencia();
  const deleteAllRec = useDeleteAllRecorrencia();
  const addReembolsoMut = useAddReembolso();

  const todasDespesas = useMemo(() => lancamentos.filter((l) => l.tipo === "despesa"), [lancamentos]);
  const todasReceitas = useMemo(() => lancamentos.filter((l) => l.tipo === "receita"), [lancamentos]);

  // Summary
  const totalReceitas = useMemo(() => todasReceitas.reduce((s, l) => s + Number(l.valor), 0), [todasReceitas]);
  const totalDespesas = useMemo(() => todasDespesas.reduce((s, l) => s + Number(l.valor), 0), [todasDespesas]);
  const saldo = totalReceitas - totalDespesas;

  const applyFiltersToList = useCallback((list: Lancamento[], tipo: TipoFilter, cats: string[], subcats: string[]) => {
    let filtered = list;
    if (tipo === "Despesas") filtered = filtered.filter(d => d.tipo === "despesa" && !d.is_parcelado && d.categoria !== "pais");
    else if (tipo === "Receitas") filtered = filtered.filter(d => d.tipo === "receita");
    else if (tipo === "Parceladas") filtered = filtered.filter(d => d.is_parcelado);
    else if (tipo === "Pais") filtered = filtered.filter(d => d.categoria === "pais");
    if (cats.length > 0) filtered = filtered.filter(d => d.categoria_macro && cats.includes(d.categoria_macro));
    if (subcats.length > 0) filtered = filtered.filter(d => d.subcategoria && subcats.includes(d.subcategoria));
    return filtered;
  }, []);

  const filteredAll = useMemo(() => applyFiltersToList(lancamentos, tipoFilter, catFilters, subcatFilters), [lancamentos, tipoFilter, catFilters, subcatFilters, applyFiltersToList]);
  const draftFiltered = useMemo(() => applyFiltersToList(lancamentos, draftTipo, draftCats, draftSubcats), [lancamentos, draftTipo, draftCats, draftSubcats, applyFiltersToList]);

  const filteredPais = useMemo(() => filteredAll.filter(d => d.categoria === "pais"), [filteredAll]);

  const unifiedList = useMemo(
    () => [...filteredAll].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()),
    [filteredAll]
  );

  const paisTotals = useMemo(() => {
    const custoTotal = filteredPais.reduce((s, d) => s + Number(d.valor), 0);
    const euPaguei = filteredPais
      .filter((d) => d.subcategoria_pais === "paguei_por_eles" || d.subcategoria_pais === "paguei_recebo_depois")
      .reduce((s, d) => s + Number(d.valor), 0);
    const reembolsado = todasReceitas
      .filter((l) => l.categoria === "reembolso_pais")
      .reduce((s, l) => s + Number(l.valor), 0);
    return { custoTotal, euPaguei, reembolsado, subsidioLiquido: euPaguei - reembolsado };
  }, [filteredPais, todasReceitas]);

  const totalFiltrado = useMemo(() => filteredAll.reduce((s, d) => s + Number(d.valor), 0), [filteredAll]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (tipoFilter !== "Todas") count++;
    count += catFilters.length;
    count += subcatFilters.length;
    return count;
  }, [tipoFilter, catFilters, subcatFilters]);

  const hasData = lancamentos.length > 0;

  const openFilterSheet = () => {
    setDraftTipo(tipoFilter);
    setDraftCats([...catFilters]);
    setDraftSubcats([...subcatFilters]);
    setFilterSheetOpen(true);
  };

  const applyFilters = () => {
    setTipoFilter(draftTipo);
    setCatFilters(draftCats);
    setSubcatFilters(draftSubcats);
    setFilterSheetOpen(false);
  };

  const clearAllFilters = () => {
    setDraftTipo("Todas");
    setDraftCats([]);
    setDraftSubcats([]);
  };

  const removeFilter = (type: "tipo" | "cat" | "subcat", value?: string) => {
    if (type === "tipo") setTipoFilter("Todas");
    if (type === "cat" && value) setCatFilters(p => p.filter(c => c !== value));
    if (type === "subcat" && value) setSubcatFilters(p => p.filter(s => s !== value));
  };

  const toggleDraftCat = (cat: string) => {
    setDraftCats(p => p.includes(cat) ? p.filter(c => c !== cat) : [...p, cat]);
    setDraftSubcats([]);
  };

  const toggleDraftSubcat = (sub: string) => {
    setDraftSubcats(p => p.includes(sub) ? p.filter(s => s !== sub) : [...p, sub]);
  };

  const draftAvailableSubcats = useMemo(() => {
    if (draftCats.length === 0) return [];
    return SUBCATEGORIA_GROUPS.filter(g => draftCats.includes(g.group)).flatMap(g => g.items);
  }, [draftCats]);

  const openActions = (lanc: Lancamento) => { setSelectedLanc(lanc); setActionsOpen(true); };

  const openEdit = (lanc: Lancamento) => {
    setSelectedLanc(lanc);
    setDeleteConfirm(false);
    if ((lanc.is_parcelado && lanc.parcelamento_id) || (lanc.recorrente && lanc.recorrencia_pai_id)) {
      // Show parcelamento/recorrente choice sheet
      setParcelamentoSheetOpen(true);
    } else {
      setEditMode("single");
      setEditOpen(true);
    }
  };

  const openDelete = (lanc: Lancamento) => { setSelectedLanc(lanc); setDeleteSheetOpen(true); };
  const openReembolso = (lanc: Lancamento) => { setSelectedLanc(lanc); setReembolsoOpen(true); };

  const handleSelectParcelamentoSingle = () => {
    setEditMode("single");
    setParcelamentoCount(0);
    setEditOpen(true);
  };

  const handleSelectParcelamentoFuture = async () => {
    const groupId = selectedLanc?.parcelamento_id || selectedLanc?.recorrencia_pai_id;
    if (!groupId) return;
    const count = await fetchParcelamentoCount(groupId, today);
    setParcelamentoCount(count);
    setEditMode("future");
    setEditOpen(true);
  };

  const handleSelectParcelamentoAll = async () => {
    const groupId = selectedLanc?.parcelamento_id || selectedLanc?.recorrencia_pai_id;
    if (!groupId) return;
    const count = await fetchParcelamentoCount(groupId);
    setParcelamentoCount(count);
    setEditMode("all");
    setEditOpen(true);
  };

  const handleSave = async (data: any) => {
    if (!selectedLanc) return;
    try {
      const groupId = selectedLanc.parcelamento_id || selectedLanc.recorrencia_pai_id;
      if (editMode === "future" && groupId) {
        await updateFuturasMut.mutateAsync({
          parcelamento_id: groupId,
          fromDate: selectedLanc.data >= today ? selectedLanc.data : today,
          updates: { 
            descricao: data.descricao, 
            valor: data.valor,
            categoria: data.categoria,
            subcategoria: data.subcategoria,
            categoria_macro: data.categoria_macro,
            forma_pagamento: data.forma_pagamento,
            cartao_id: data.cartao_id,
          },
        });
        toast.success("Parcelas futuras atualizadas ✓");
      } else if (editMode === "all" && groupId) {
        await updateAllMut.mutateAsync({
          parcelamento_id: groupId,
          updates: { 
            descricao: data.descricao, 
            valor: data.valor,
            categoria: data.categoria,
            subcategoria: data.subcategoria,
            categoria_macro: data.categoria_macro,
            forma_pagamento: data.forma_pagamento,
            cartao_id: data.cartao_id,
          },
        });
        toast.success("Todas as parcelas atualizadas ✓");
      } else {
        // single mode: update only this lancamento, mark as editado_individualmente
        const updates: any = { ...data };
        if (selectedLanc.is_parcelado) {
          updates.editado_individualmente = true;
        }
        await updateMut.mutateAsync({ id: selectedLanc.id, ...updates });
        toast.success("Lançamento atualizado ✓");
      }
      setEditOpen(false);
      setEditMode(null);
      setSelectedLanc(null);
    } catch (e: any) {
      toast.error("Erro: " + (e?.message || JSON.stringify(e)));
    }
  };

  const handleDelete = async () => {
    if (!selectedLanc) return;
    const lancToDelete = selectedLanc;
    // Remove da UI imediatamente
    queryClient.setQueriesData(
      { queryKey: ["lancamentos"], exact: false },
      (old: any) => Array.isArray(old) 
        ? old.filter((l: any) => l.id !== lancToDelete.id) 
        : old
    );
    setEditOpen(false); 
    setActionsOpen(false); 
    setDeleteSheetOpen(false);
    setSelectedLanc(null);
    try {
      await deleteMut.mutateAsync(lancToDelete.id);
      toast.success("Lançamento excluído ✓");
    } catch (e: any) {
      queryClient.refetchQueries({ queryKey: ["lancamentos"], exact: false });
      toast.error("Erro ao excluir: " + (e?.message || JSON.stringify(e)));
    }
  };

  const handleDeleteFuture = async () => {
    if (!selectedLanc) return;
    const lanc = selectedLanc;
    setDeleteSheetOpen(false);
    setSelectedLanc(null);
    try {
      const groupId = lanc.parcelamento_id || lanc.recorrencia_pai_id;
      if (!groupId) {
        await deleteMut.mutateAsync(lanc.id);
      } else if (lanc.parcelamento_id) {
        await deleteFutureParc.mutateAsync({ parcelamento_id: lanc.parcelamento_id, fromDate: lanc.data });
      } else if (lanc.recorrencia_pai_id) {
        await deleteFutureRec.mutateAsync({ recorrencia_pai_id: lanc.recorrencia_pai_id, fromDate: lanc.data });
      }
      queryClient.refetchQueries({ queryKey: ["lancamentos"], exact: false });
      toast.success("Este e os próximos excluídos ✓");
    } catch (e: any) { toast.error("Erro: " + (e?.message || JSON.stringify(e))); }
  };

  const handleDeleteAll = async () => {
    if (!selectedLanc) return;
    const lanc = selectedLanc;
    setDeleteSheetOpen(false);
    setSelectedLanc(null);
    try {
      const groupId = lanc.parcelamento_id || lanc.recorrencia_pai_id;
      if (!groupId) {
        await deleteMut.mutateAsync(lanc.id);
      } else if (lanc.parcelamento_id) {
        await deleteAllParc.mutateAsync(lanc.parcelamento_id);
      } else if (lanc.recorrencia_pai_id) {
        await deleteAllRec.mutateAsync(lanc.recorrencia_pai_id);
      }
      queryClient.refetchQueries({ queryKey: ["lancamentos"], exact: false });
      toast.success("Todos excluídos ✓");
    } catch (e: any) { toast.error("Erro: " + (e?.message || JSON.stringify(e))); }
  };

  // Multi-select helpers
  const toggleSelectId = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
    setBatchDeleteConfirm(false);
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    setBatchDeleting(true);
    try {
      await Promise.all(Array.from(selectedIds).map(id => deleteMut.mutateAsync(id)));
      toast.success(`${selectedIds.size} lançamento(s) excluído(s) ✓`);
      exitSelectMode();
    } catch (e: any) {
      toast.error("Erro ao excluir: " + (e?.message || JSON.stringify(e)));
    } finally {
      setBatchDeleting(false);
    }
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
    } catch (e: any) { toast.error("Erro: " + (e?.message || JSON.stringify(e))); }
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

  const renderValorItem = (item: Lancamento) => {
    const totalReemb = getTotalReembolsado(allReembolsos, item.id);
    const valorOriginal = Number(item.valor);
    const isReceita = item.tipo === "receita";
    const colorClass = isReceita ? "text-emerald-400" : "text-red-400";
    const prefix = isReceita ? "+ " : "- ";

    if (totalReemb <= 0) {
      return <p className={`text-sm font-semibold tabular-nums ${colorClass}`}>{prefix}{fmt(valorOriginal)}</p>;
    }
    const valorLiquido = Math.max(0, valorOriginal - totalReemb);
    return (
      <div className="text-right">
        <p className="text-[10px] text-muted-foreground line-through tabular-nums">{prefix}{fmt(valorOriginal)}</p>
        <p className={`text-sm font-semibold tabular-nums ${colorClass}`}>{prefix}{fmt(valorLiquido)}</p>
      </div>
    );
  };

  const renderSubcatLabel = (item: Lancamento) => {
    const parts: string[] = [];
    if (item.categoria_macro) parts.push(`${getGroupEmoji(item.categoria_macro)} ${item.categoria_macro}`);
    if (item.subcategoria) parts.push(item.subcategoria);
    if (parts.length === 0) return null;
    return <span className="text-[11px] ml-1 text-muted-foreground">· {parts.join(" · ")}</span>;
  };

  const renderItem = (item: Lancamento, icon: React.ReactNode, subtitle: React.ReactNode) => {
    const isReceita = item.tipo === "receita";
    const borderColor = isReceita ? "#10B981" : "#F87171";
    const isSelected = selectedIds.has(item.id);

    const content = (
      <div
        onClick={() => selectMode ? toggleSelectId(item.id) : openActions(item)}
        className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/30 transition-colors cursor-pointer"
        style={{ borderLeft: `3px solid ${borderColor}` }}
      >
        {selectMode && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => toggleSelectId(item.id)}
            className="shrink-0"
          />
        )}
        <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-medium text-foreground truncate">{item.descricao}</p>
            {(item as any).editado_individualmente && (
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 shrink-0">
                ⚠️ Editado individualmente
              </span>
            )}
          </div>
          <div className="flex items-center flex-wrap">
            {subtitle}
            {renderSubcatLabel(item)}
          </div>
          {item.is_parcelado && item.parcela_atual != null && item.parcela_total != null && (
            <span className="text-[10px] text-muted-foreground">{item.parcela_atual}/{item.parcela_total} parcelas
              {item.parcela_atual === item.parcela_total && (
                <span className="ml-1 text-[9px] font-semibold text-yellow-500">🏁 Última parcela</span>
              )}
            </span>
          )}
          {item.recorrente && (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full inline-block mt-0.5 bg-blue-500/15 text-blue-400">
              🔄 Recorrente
            </span>
          )}
          {renderReembolsoBadge(item)}
        </div>
        {renderValorItem(item)}
      </div>
    );

    if (selectMode) return content;
    return (
      <SwipeableItem onEdit={() => openEdit(item)} onDelete={() => openDelete(item)}>
        {content}
      </SwipeableItem>
    );
  };

  const getItemIcon = (item: Lancamento) => {
    if (item.tipo === "receita") return <ArrowUpRight size={17} className="text-emerald-400" />;
    if (item.is_parcelado) return <Receipt size={17} className="text-muted-foreground" />;
    if (item.categoria === "pais") return <Users size={17} className="text-muted-foreground" />;
    return <CircleDollarSign size={17} className="text-muted-foreground" />;
  };

  const getItemSubtitle = (item: Lancamento) => (
    <p className="text-[11px] text-muted-foreground">
      {new Date(item.data + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
    </p>
  );

  const draftPreviewTotal = draftFiltered.reduce((s, d) => s + Number(d.valor), 0);

  // Inline filter helpers for tablet sidebar
  const toggleInlineCat = (cat: string) => {
    setCatFilters(p => p.includes(cat) ? p.filter(c => c !== cat) : [...p, cat]);
    setSubcatFilters([]);
  };
  const toggleInlineSubcat = (sub: string) => {
    setSubcatFilters(p => p.includes(sub) ? p.filter(s => s !== sub) : [...p, sub]);
  };
  const inlineAvailableSubcats = useMemo(() => {
    if (catFilters.length === 0) return [];
    return SUBCATEGORIA_GROUPS.filter(g => catFilters.includes(g.group)).flatMap(g => g.items);
  }, [catFilters]);

  const filterPanel = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-foreground">Filtros</h3>
        <button onClick={() => { setTipoFilter("Todas"); setCatFilters([]); setSubcatFilters([]); }} className="text-[10px] font-semibold text-destructive">Limpar</button>
      </div>
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground mb-1.5">TIPO</p>
        <div className="flex flex-wrap gap-1.5">
          {(["Todas", "Despesas", "Receitas", "Parceladas", "Pais"] as TipoFilter[]).map(t => (
            <button key={t} onClick={() => setTipoFilter(t)} className={`px-2.5 py-1.5 rounded-full text-[10px] font-semibold transition-all ${tipoFilter === t ? "bg-primary text-primary-foreground shadow-md" : "bg-secondary/60 text-muted-foreground"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground mb-1.5">CATEGORIA</p>
        <div className="grid grid-cols-1 gap-1.5">
          {SUBCATEGORIA_GROUPS.map(g => {
            const selected = catFilters.includes(g.group);
            return (
              <button key={g.group} onClick={() => toggleInlineCat(g.group)} className={`flex items-center gap-2 p-2 rounded-lg text-left text-[10px] font-medium transition-all ${selected ? "ring-1 ring-primary bg-secondary/50 text-foreground font-semibold" : "bg-secondary/30 text-muted-foreground"}`}>
                <span className="text-sm">{g.emoji}</span>
                <span>{g.group}</span>
              </button>
            );
          })}
        </div>
      </div>
      {inlineAvailableSubcats.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground mb-1.5">SUBCATEGORIA</p>
          <div className="flex flex-wrap gap-1">
            {inlineAvailableSubcats.map(sub => {
              const selected = subcatFilters.includes(sub);
              return (
                <button key={sub} onClick={() => toggleInlineSubcat(sub)} className={`px-2 py-1 rounded-full text-[10px] font-medium transition-all ${selected ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground"}`}>
                  {sub}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  const transactionList = (
    <>
      {/* Pais summary block */}
      {filteredPais.length > 0 && tipoFilter === "Pais" && (
        <div className="mb-4 animate-fade-up" style={{ animationDelay: "0.08s" }}>
          <div className="flex items-center gap-2 mb-2">
            <Users size={14} className="text-primary" />
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Resumo Pais</h2>
          </div>
          <div className="glass-card p-4 space-y-2 mb-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">Custo total</p>
              <p className="text-sm font-bold text-foreground tabular-nums">{fmt(paisTotals.custoTotal)}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">Eu paguei</p>
              <p className="text-sm font-semibold text-foreground tabular-nums">{fmt(paisTotals.euPaguei)}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">Reembolsado</p>
              <p className="text-sm font-semibold text-primary tabular-nums">+{fmt(paisTotals.reembolsado)}</p>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border/30">
              <p className="text-xs font-semibold text-muted-foreground">Subsídio líquido</p>
              <p className="text-sm font-bold text-primary tabular-nums">{fmt(paisTotals.subsidioLiquido)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Unified sorted list */}
      {unifiedList.length > 0 ? (
        <div className="space-y-1 md:grid md:grid-cols-2 md:gap-2 md:space-y-0 animate-fade-up" style={{ animationDelay: "0.1s" }}>
          {unifiedList.map((item) => (
            <div key={item.id}>
              {renderItem(item, getItemIcon(item), getItemSubtitle(item))}
            </div>
          ))}
        </div>
      ) : (
        hasData && (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">Nenhum lançamento com esses filtros</p>
          </div>
        )
      )}
    </>
  );

  const isPending = updateMut.isPending || updateFuturasMut.isPending || updateAllMut.isPending || deleteMut.isPending || deleteFutureParc.isPending || deleteAllParc.isPending || deleteFutureRec.isPending || deleteAllRec.isPending;

  return (
    <div className="min-h-screen gradient-bg overflow-x-hidden pb-[90px] md:pb-6">
      <div className="px-4 pt-12 w-full max-w-4xl md:mx-auto">
        <h1 className="text-xl font-semibold text-foreground mb-4 animate-fade-up">Transações</h1>

        {/* Month Selector */}
        <div className="flex items-center justify-center gap-3 mb-4 animate-fade-up" style={{ animationDelay: "0.03s" }}>
          <button
            onClick={() => setMesAtual(p => {
              const d = new Date(p.year, p.month - 1, 1);
              return { year: d.getFullYear(), month: d.getMonth() };
            })}
            className="p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-semibold text-foreground min-w-[140px] text-center">
            {mesLabelFmt}
          </span>
          <button
            onClick={() => setMesAtual(p => {
              const d = new Date(p.year, p.month + 1, 1);
              return { year: d.getFullYear(), month: d.getMonth() };
            })}
            className="p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Summary bar */}
        <div className="flex items-center justify-between mb-3 animate-fade-up" style={{ animationDelay: "0.05s" }}>
          <p className="text-[11px] text-muted-foreground leading-snug">
            <span className="text-emerald-400 font-medium">↑ {fmt(totalReceitas)}</span>
            {" · "}
            <span className="text-red-400 font-medium">↓ {fmt(totalDespesas)}</span>
            {" · "}
            <span className={`font-semibold ${saldo >= 0 ? "text-emerald-400" : "text-red-400"}`}>Saldo {fmt(saldo)}</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { if (selectMode) exitSelectMode(); else setSelectMode(true); }}
              className={`md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                selectMode
                  ? "bg-destructive text-destructive-foreground"
                  : "text-muted-foreground border border-border"
              }`}
            >
              <CheckSquare size={12} />
              {selectMode ? "Cancelar" : "Selecionar"}
            </button>
            {!selectMode && (
              <button
                onClick={openFilterSheet}
                className={`md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  activeFilterCount > 0
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "text-primary border border-primary"
                }`}
              >
                <SlidersHorizontal size={12} />
                Filtrar
                {activeFilterCount > 0 && (
                  <span className="text-[10px] font-bold bg-primary-foreground/20 px-1.5 py-0.5 rounded-full">✦ {activeFilterCount}</span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Quick filter pills (mobile) */}
        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1 md:hidden animate-fade-up" style={{ animationDelay: "0.06s" }}>
          {(["Todas", "Despesas", "Receitas", "Parceladas", "Pais"] as TipoFilter[]).map(t => (
            <button
              key={t}
              onClick={() => setTipoFilter(t)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${tipoFilter === t ? "gradient-emerald text-primary-foreground shadow-md shadow-primary/20" : "bg-secondary/60 text-muted-foreground"}`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Active Filter Chips */}
        {(catFilters.length > 0 || subcatFilters.length > 0) && (
          <div className="flex flex-wrap gap-1.5 mb-3 animate-fade-up md:hidden">
            {catFilters.map(c => (
              <button key={c} onClick={() => removeFilter("cat", c)} className="flex items-center gap-1 px-2.5 h-7 rounded-full text-[11px] font-medium bg-secondary text-primary">
                {getGroupEmoji(c)} {c} <X size={10} />
              </button>
            ))}
            {subcatFilters.map(s => (
              <button key={s} onClick={() => removeFilter("subcat", s)} className="flex items-center gap-1 px-2.5 h-7 rounded-full text-[11px] font-medium bg-secondary text-primary">
                {s} <X size={10} />
              </button>
            ))}
          </div>
        )}

        {!hasData && !isLoading ? (
          <EmptyState title="Nenhum lançamento por aqui! 🎉" />
        ) : (
          <div className="md:flex md:gap-4">
            {/* Tablet: Filter sidebar */}
            <div className="hidden md:block md:w-[220px] md:shrink-0">
              <div className="glass-card p-3 sticky top-4 max-h-[calc(100vh-120px)] overflow-y-auto">
                {filterPanel}
              </div>
            </div>
            {/* Content */}
            <div className="md:flex-1 md:min-w-0">
              {transactionList}
            </div>
          </div>
        )}
      </div>

      {/* Parcelamento edit choice sheet */}
      <ParcelamentoEditSheet
        open={parcelamentoSheetOpen}
        onClose={() => setParcelamentoSheetOpen(false)}
        descricao={selectedLanc?.descricao}
        onSelectSingle={handleSelectParcelamentoSingle}
        onSelectFuture={handleSelectParcelamentoFuture}
        onSelectAll={handleSelectParcelamentoAll}
      />

      {/* Delete confirm sheet */}
      <DeleteConfirmSheet
        open={deleteSheetOpen}
        onClose={() => setDeleteSheetOpen(false)}
        tipo={selectedLanc?.is_parcelado ? "parcelado" : selectedLanc?.recorrente ? "recorrente" : "simples"}
        onDeleteSingle={handleDelete}
        onDeleteFuture={handleDeleteFuture}
        onDeleteAll={handleDeleteAll}
        descricao={selectedLanc?.descricao}
        isPending={isPending}
      />

      <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto pb-24">
          <div className="space-y-5 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Filtrar transações</h2>
              <button onClick={clearAllFilters} className="text-xs font-semibold text-destructive">Limpar tudo</button>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground mb-2">TIPO</p>
              <div className="flex flex-wrap gap-2">
                {(["Todas", "Despesas", "Receitas", "Parceladas", "Pais"] as TipoFilter[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setDraftTipo(t)}
                    className={`px-3.5 py-2 rounded-full text-xs font-semibold transition-all ${
                      draftTipo === t ? "bg-primary text-primary-foreground shadow-md" : "bg-secondary/60 text-muted-foreground"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground mb-2">CATEGORIA</p>
              <div className="grid grid-cols-2 gap-2">
                {SUBCATEGORIA_GROUPS.map(g => {
                  const selected = draftCats.includes(g.group);
                  return (
                    <button
                      key={g.group}
                      onClick={() => toggleDraftCat(g.group)}
                      className={`flex items-center gap-2 p-3 rounded-xl text-left text-xs font-medium transition-all ${
                        selected ? "ring-2 ring-primary bg-secondary/50 text-foreground font-semibold" : "bg-secondary/30 text-muted-foreground"
                      }`}
                    >
                      <span className="text-base">{g.emoji}</span>
                      <span>{g.group}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            {draftAvailableSubcats.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground mb-2">SUBCATEGORIA</p>
                <div className="flex flex-wrap gap-1.5">
                  {draftAvailableSubcats.map(sub => {
                    const selected = draftSubcats.includes(sub);
                    return (
                      <button
                        key={sub}
                        onClick={() => toggleDraftSubcat(sub)}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                          selected ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground"
                        }`}
                      >
                        {sub}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border/30">
            <button
              onClick={applyFilters}
              className="w-full py-3 rounded-xl text-sm font-semibold bg-primary text-primary-foreground shadow-lg"
            >
              Ver {draftFiltered.length} lançamentos · {fmt(draftPreviewTotal)}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <LancamentoActions
        open={actionsOpen}
        onClose={() => setActionsOpen(false)}
        onEdit={() => { if (selectedLanc) openEdit(selectedLanc); setActionsOpen(false); }}
        onDelete={() => { if (selectedLanc) openDelete(selectedLanc); setActionsOpen(false); }}
        onReembolso={() => { if (selectedLanc) openReembolso(selectedLanc); }}
        descricao={selectedLanc?.descricao}
      />

      {selectedLanc && (
        <EditLancamentoModal
          key={selectedLanc.id}
          open={editOpen}
          onClose={() => { setEditOpen(false); setDeleteConfirm(false); setEditMode(null); }}
          showDeleteConfirm={deleteConfirm}
          onConfirmDelete={handleDelete}
          onSave={handleSave}
          isPending={isPending}
          parcelamentoMode={editMode}
          parcelamentoCount={parcelamentoCount}
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
            forma_pagamento: selectedLanc.forma_pagamento,
            cartao_id: selectedLanc.cartao_id,
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

      {/* Batch delete bottom bar */}
      {selectMode && (
        <>
          <div
            className={`fixed inset-0 z-[80] bg-background/80 backdrop-blur-sm transition-opacity duration-300 ${batchDeleteConfirm ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            onClick={() => setBatchDeleteConfirm(false)}
          />
          {batchDeleteConfirm && (
            <div className="fixed inset-x-0 bottom-0 z-[90] rounded-t-[28px] p-5 pb-24 space-y-3" style={{ background: "#1a1a2e" }}>
              <p className="text-sm font-bold text-foreground text-center">
                Excluir {selectedIds.size} lançamento(s)?
              </p>
              <p className="text-xs text-muted-foreground text-center">Esta ação não pode ser desfeita.</p>
              <div className="flex gap-3">
                <button onClick={() => setBatchDeleteConfirm(false)} className="flex-1 py-3 rounded-xl text-sm font-semibold bg-secondary/60 text-muted-foreground">
                  Cancelar
                </button>
                <button onClick={handleBatchDelete} disabled={batchDeleting} className="flex-1 py-3 rounded-xl text-sm font-semibold bg-destructive text-destructive-foreground disabled:opacity-50">
                  {batchDeleting ? "Excluindo..." : "Excluir"}
                </button>
              </div>
            </div>
          )}
          {!batchDeleteConfirm && (
            <div className="fixed inset-x-0 bottom-0 z-50 bg-background/95 backdrop-blur border-t border-border/30 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)] flex items-center justify-between">
              <span className="text-sm text-muted-foreground font-medium">
                {selectedIds.size} selecionado(s)
              </span>
              <div className="flex gap-2">
                <button onClick={exitSelectMode} className="px-4 py-2 rounded-xl text-xs font-semibold bg-secondary/60 text-muted-foreground">
                  Cancelar
                </button>
                <button
                  onClick={() => setBatchDeleteConfirm(true)}
                  disabled={selectedIds.size === 0}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-destructive text-destructive-foreground disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  Excluir
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {!selectMode && <BottomNav />}
    </div>
  );
};

export default Despesas;
