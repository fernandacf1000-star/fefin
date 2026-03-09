import BottomNav from "@/components/BottomNav";
import EmptyState from "@/components/EmptyState";
import {
  useLancamentos,
  useUpdateLancamento,
  useUpdateParcelamentoFuturas,
  useUpdateAllParcelamento,
  useDeleteLancamento,
  fetchParcelamentoCount,
} from "@/hooks/useLancamentos";
import { useAllReembolsos, useAddReembolso, getTotalReembolsado } from "@/hooks/useReembolsos";
import {
  CreditCard, Users, CheckCircle2, Clock,
  Receipt, ChevronLeft, ChevronRight, X, SlidersHorizontal,
  ArrowUpRight,
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import SwipeableItem from "@/components/SwipeableItem";
import LancamentoActions from "@/components/LancamentoActions";
import EditLancamentoModal, { type ParcelamentoMode } from "@/components/EditLancamentoModal";
import ReembolsoModal from "@/components/ReembolsoModal";
import ParcelamentoEditSheet from "@/components/ParcelamentoEditSheet";
import type { Lancamento } from "@/hooks/useLancamentos";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { SUBCATEGORIA_GROUPS, getGroupEmoji } from "@/lib/subcategorias";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type TipoFilter = "Todas" | "Despesas" | "Receitas" | "Parceladas" | "Pais";

const today = new Date().toISOString().split("T")[0];

const now = new Date();
const generateMonths = () => {
  const result = [];
  for (let i = -1; i <= 1; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    result.push({ key, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return result;
};
const months = generateMonths();

const Despesas = () => {
  const [tipoFilter, setTipoFilter] = useState<TipoFilter>("Todas");
  const [catFilters, setCatFilters] = useState<string[]>([]);
  const [subcatFilters, setSubcatFilters] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const [draftTipo, setDraftTipo] = useState<TipoFilter>("Todas");
  const [draftCats, setDraftCats] = useState<string[]>([]);
  const [draftSubcats, setDraftSubcats] = useState<string[]>([]);

  const [selectedLanc, setSelectedLanc] = useState<Lancamento | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [reembolsoOpen, setReembolsoOpen] = useState(false);

  // Parcelamento edit flow
  const [parcelamentoSheetOpen, setParcelamentoSheetOpen] = useState(false);
  const [editMode, setEditMode] = useState<ParcelamentoMode>(null);
  const [parcelamentoCount, setParcelamentoCount] = useState(0);

  const mesRef = months[selectedMonth]?.key;
  const { data: lancamentos = [], isLoading } = useLancamentos(mesRef);
  const { data: allReembolsos = [] } = useAllReembolsos();
  const updateMut = useUpdateLancamento();
  const updateFuturasMut = useUpdateParcelamentoFuturas();
  const updateAllMut = useUpdateAllParcelamento();
  const deleteMut = useDeleteLancamento();
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
    if (lanc.is_parcelado && lanc.parcelamento_id) {
      // Show parcelamento choice sheet
      setParcelamentoSheetOpen(true);
    } else {
      setEditMode("single");
      setEditOpen(true);
    }
  };

  const openDelete = (lanc: Lancamento) => { setSelectedLanc(lanc); setEditOpen(true); setDeleteConfirm(true); };
  const openReembolso = (lanc: Lancamento) => { setSelectedLanc(lanc); setReembolsoOpen(true); };

  const handleSelectParcelamentoSingle = () => {
    setEditMode("single");
    setParcelamentoCount(0);
    setEditOpen(true);
  };

  const handleSelectParcelamentoFuture = async () => {
    if (!selectedLanc?.parcelamento_id) return;
    const count = await fetchParcelamentoCount(selectedLanc.parcelamento_id, today);
    setParcelamentoCount(count);
    setEditMode("future");
    setEditOpen(true);
  };

  const handleSelectParcelamentoAll = async () => {
    if (!selectedLanc?.parcelamento_id) return;
    const count = await fetchParcelamentoCount(selectedLanc.parcelamento_id);
    setParcelamentoCount(count);
    setEditMode("all");
    setEditOpen(true);
  };

  const handleSave = async (data: any) => {
    if (!selectedLanc) return;
    try {
      if (editMode === "future" && selectedLanc.parcelamento_id) {
        await updateFuturasMut.mutateAsync({
          parcelamento_id: selectedLanc.parcelamento_id,
          fromDate: selectedLanc.data >= today ? selectedLanc.data : today,
          updates: { descricao: data.descricao, valor: data.valor },
        });
        toast.success("Parcelas futuras atualizadas ✓");
      } else if (editMode === "all" && selectedLanc.parcelamento_id) {
        await updateAllMut.mutateAsync({
          parcelamento_id: selectedLanc.parcelamento_id,
          updates: { descricao: data.descricao, valor: data.valor },
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
    } catch {
      toast.error("Erro ao atualizar.");
    }
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
    return (
      <SwipeableItem key={item.id} onEdit={() => openEdit(item)} onDelete={() => openDelete(item)}>
        <div
          onClick={() => openActions(item)}
          className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/30 transition-colors cursor-pointer"
          style={{ borderLeft: `3px solid ${borderColor}` }}
        >
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
            {renderReembolsoBadge(item)}
          </div>
          {renderValorItem(item)}
        </div>
      </SwipeableItem>
    );
  };

  const getItemIcon = (item: Lancamento) => {
    if (item.tipo === "receita") return <ArrowUpRight size={17} className="text-emerald-400" />;
    if (item.is_parcelado) return <Receipt size={17} className="text-muted-foreground" />;
    if (item.categoria === "pais") return <Users size={17} className="text-muted-foreground" />;
    return item.pago
      ? <CheckCircle2 size={17} className="text-primary" />
      : <Clock size={17} className="text-yellow-400" />;
  };

  const getItemSubtitle = (item: Lancamento) => (
    <p className="text-[11px] text-muted-foreground">
      {new Date(item.data + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
      {item.tipo === "despesa" && !item.is_parcelado && (
        <> · <span className={item.pago ? "text-primary" : "text-yellow-400"}>{item.pago ? "Pago" : "Pendente"}</span></>
      )}
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
      {filteredPais.length > 0 && (tipoFilter === "Todas" || tipoFilter === "Pais") && (
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
          {unifiedList.map((item) => renderItem(item, getItemIcon(item), getItemSubtitle(item)))}
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

  const isPending = updateMut.isPending || updateFuturasMut.isPending || updateAllMut.isPending || deleteMut.isPending;

  return (
    <div className="min-h-screen gradient-bg overflow-x-hidden pb-[90px] md:pb-6">
      <div className="px-4 pt-12 w-full">
        <h1 className="text-xl font-semibold text-foreground mb-4 animate-fade-up">Transações</h1>

        {/* Month Selector */}
        <div className="flex items-center justify-center gap-3 mb-4 animate-fade-up" style={{ animationDelay: "0.03s" }}>
          <button onClick={() => setSelectedMonth((p) => Math.max(0, p - 1))} disabled={selectedMonth === 0} className="p-1 rounded-full text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            {months.map((m, i) => (
              <button key={m.key} onClick={() => setSelectedMonth(i)} className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all whitespace-nowrap ${i === selectedMonth ? "gradient-emerald text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-foreground"}`}>
                {m.label}
              </button>
            ))}
          </div>
          <button onClick={() => setSelectedMonth((p) => Math.min(months.length - 1, p + 1))} disabled={selectedMonth === months.length - 1} className="p-1 rounded-full text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors">
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

      {/* Filter Bottom Sheet */}
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

      <BottomNav />
    </div>
  );
};

export default Despesas;
