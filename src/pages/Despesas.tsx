import BottomNav from "@/components/BottomNav";
import EmptyState from "@/components/EmptyState";
import { useLancamentos, useUpdateLancamento, useDeleteLancamento } from "@/hooks/useLancamentos";
import { useAllReembolsos, useAddReembolso, getTotalReembolsado } from "@/hooks/useReembolsos";
import {
  Home, CreditCard, Gift, Users, CheckCircle2, Clock,
  Receipt, ChevronLeft, ChevronRight, X, SlidersHorizontal,
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import SwipeableItem from "@/components/SwipeableItem";
import LancamentoActions from "@/components/LancamentoActions";
import EditLancamentoModal from "@/components/EditLancamentoModal";
import ReembolsoModal from "@/components/ReembolsoModal";
import type { Lancamento } from "@/hooks/useLancamentos";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { SUBCATEGORIA_GROUPS } from "@/lib/subcategorias";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const CATEGORY_EMOJIS: Record<string, string> = {
  "Casa": "🏠", "Alimentação fora": "🍽️", "Transporte": "🚗", "Saúde": "💊",
  "Moda e Beleza": "👗", "Compras Online": "📦", "Serviços Fixos": "🏛️",
  "Lazer e Viagem": "✈️", "Arte e Decoração": "🎨", "Educação": "📚", "Outros": "🎲",
};

type TipoFilter = "Todas" | "Fixas" | "Parceladas" | "Extras" | "Pais";
type PeriodoFilter = "mes_atual" | "3_meses" | "ano" | "personalizado";

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

const tipoToCat = (t: TipoFilter): string | null => {
  if (t === "Fixas") return "fixa";
  if (t === "Parceladas") return "parcelada";
  if (t === "Extras") return "extra";
  if (t === "Pais") return "pais";
  return null;
};

const Despesas = () => {
  // Filters state
  const [tipoFilter, setTipoFilter] = useState<TipoFilter>("Todas");
  const [catFilters, setCatFilters] = useState<string[]>([]);
  const [subcatFilters, setSubcatFilters] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  // Draft filters (applied only on "Ver resultados")
  const [draftTipo, setDraftTipo] = useState<TipoFilter>("Todas");
  const [draftCats, setDraftCats] = useState<string[]>([]);
  const [draftSubcats, setDraftSubcats] = useState<string[]>([]);

  const [selectedLanc, setSelectedLanc] = useState<Lancamento | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [reembolsoOpen, setReembolsoOpen] = useState(false);

  const mesRef = months[selectedMonth]?.key;
  const { data: lancamentos = [], isLoading } = useLancamentos(mesRef);
  const { data: allReembolsos = [] } = useAllReembolsos();
  const updateMut = useUpdateLancamento();
  const deleteMut = useDeleteLancamento();
  const addReembolsoMut = useAddReembolso();

  const despesas = useMemo(() => lancamentos.filter((l) => l.tipo === "despesa"), [lancamentos]);

  // Apply filters
  const filteredDespesas = useMemo(() => {
    let filtered = despesas;
    const catKey = tipoToCat(tipoFilter);
    if (catKey) filtered = filtered.filter(d => d.categoria === catKey);
    if (catFilters.length > 0) {
      // Map group names to subcategorias within those groups
      const subsInGroups = SUBCATEGORIA_GROUPS.filter(g => catFilters.includes(g.group)).flatMap(g => g.items);
      filtered = filtered.filter(d => d.subcategoria && subsInGroups.includes(d.subcategoria));
    }
    if (subcatFilters.length > 0) {
      filtered = filtered.filter(d => d.subcategoria && subcatFilters.includes(d.subcategoria));
    }
    return filtered;
  }, [despesas, tipoFilter, catFilters, subcatFilters]);

  // Preview count for draft filters
  const draftFiltered = useMemo(() => {
    let filtered = despesas;
    const catKey = tipoToCat(draftTipo);
    if (catKey) filtered = filtered.filter(d => d.categoria === catKey);
    if (draftCats.length > 0) {
      const subsInGroups = SUBCATEGORIA_GROUPS.filter(g => draftCats.includes(g.group)).flatMap(g => g.items);
      filtered = filtered.filter(d => d.subcategoria && subsInGroups.includes(d.subcategoria));
    }
    if (draftSubcats.length > 0) {
      filtered = filtered.filter(d => d.subcategoria && draftSubcats.includes(d.subcategoria));
    }
    return filtered;
  }, [despesas, draftTipo, draftCats, draftSubcats]);

  const fixas = useMemo(() => filteredDespesas.filter((d) => d.categoria === "fixa"), [filteredDespesas]);
  const parceladas = useMemo(() => filteredDespesas.filter((d) => d.categoria === "parcelada"), [filteredDespesas]);
  const extras = useMemo(() => filteredDespesas.filter((d) => d.categoria === "extra"), [filteredDespesas]);
  const pais = useMemo(() => filteredDespesas.filter((d) => d.categoria === "pais"), [filteredDespesas]);

  const paisTotals = useMemo(() => {
    const custoTotal = pais.reduce((s, d) => s + Number(d.valor), 0);
    const euPaguei = pais
      .filter((d) => d.subcategoria_pais === "paguei_por_eles" || d.subcategoria_pais === "paguei_recebo_depois")
      .reduce((s, d) => s + Number(d.valor), 0);
    const reembolsado = lancamentos
      .filter((l) => l.tipo === "receita" && l.categoria === "reembolso_pais")
      .reduce((s, l) => s + Number(l.valor), 0);
    return { custoTotal, euPaguei, reembolsado, subsidioLiquido: euPaguei - reembolsado };
  }, [pais, lancamentos]);

  const totalFiltrado = useMemo(() => filteredDespesas.reduce((s, d) => s + Number(d.valor), 0), [filteredDespesas]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (tipoFilter !== "Todas") count++;
    count += catFilters.length;
    count += subcatFilters.length;
    return count;
  }, [tipoFilter, catFilters, subcatFilters]);

  const hasData = despesas.length > 0;
  const showSection = (cat: string) => {
    if (tipoFilter === "Todas" && catFilters.length === 0 && subcatFilters.length === 0) return true;
    if (tipoFilter !== "Todas") return tipoToCat(tipoFilter) === cat;
    return true; // when only cat/subcat filters, show all sections
  };

  // Filter sheet handlers
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
    setDraftSubcats([]); // reset subcats when cats change
  };

  const toggleDraftSubcat = (sub: string) => {
    setDraftSubcats(p => p.includes(sub) ? p.filter(s => s !== sub) : [...p, sub]);
  };

  // Available subcats for selected draft cats
  const draftAvailableSubcats = useMemo(() => {
    if (draftCats.length === 0) return [];
    return SUBCATEGORIA_GROUPS.filter(g => draftCats.includes(g.group)).flatMap(g => g.items);
  }, [draftCats]);

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

  const renderReembolsoBadge = (item: Lancamento) => {
    const totalReemb = getTotalReembolsado(allReembolsos, item.id);
    if (totalReemb <= 0) return null;
    const valorOriginal = Number(item.valor);
    const isTotal = totalReemb >= valorOriginal;
    return (
      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full inline-block mt-0.5" style={{ backgroundColor: "rgba(16,185,129,0.15)", color: "#10B981" }}>
        {isTotal ? "↩️ Reembolso total · Quitado ✓" : `↩️ Reembolso parcial: ${fmt(totalReemb)}`}
      </span>
    );
  };

  const renderValor = (item: Lancamento, prefix = "") => {
    const totalReemb = getTotalReembolsado(allReembolsos, item.id);
    const valorOriginal = Number(item.valor);
    if (totalReemb <= 0) {
      return <p className="text-sm font-semibold text-foreground tabular-nums">{prefix}{fmt(valorOriginal)}</p>;
    }
    const valorLiquido = Math.max(0, valorOriginal - totalReemb);
    return (
      <div className="text-right">
        <p className="text-[10px] text-muted-foreground line-through tabular-nums">{prefix}{fmt(valorOriginal)}</p>
        <p className="text-sm font-semibold text-foreground tabular-nums">{prefix}{fmt(valorLiquido)}</p>
      </div>
    );
  };

  const renderSubcatLabel = (item: Lancamento) => {
    if (!item.subcategoria) return null;
    return <span className="text-[11px] ml-1" style={{ color: "#475569" }}>· {item.subcategoria}</span>;
  };

  const renderItem = (item: Lancamento, icon: React.ReactNode, subtitle: React.ReactNode, valuePrefix = "") => (
    <SwipeableItem key={item.id} onEdit={() => openEdit(item)} onDelete={() => openDelete(item)}>
      <div onClick={() => openActions(item)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/30 transition-colors cursor-pointer">
        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{item.descricao}</p>
          <div className="flex items-center">
            {subtitle}
            {renderSubcatLabel(item)}
          </div>
          {renderReembolsoBadge(item)}
        </div>
        {renderValor(item, valuePrefix)}
      </div>
    </SwipeableItem>
  );

  const draftPreviewTotal = draftFiltered.reduce((s, d) => s + Number(d.valor), 0);

  return (
    <div className="min-h-screen gradient-bg overflow-x-hidden pb-[90px]">
      <div className="px-4 pt-12 w-full">
        <h1 className="text-xl font-semibold text-foreground mb-4 animate-fade-up">Despesas</h1>

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

        {/* Summary + Filter Button */}
        <div className="flex items-center justify-between mb-3 animate-fade-up" style={{ animationDelay: "0.05s" }}>
          <p className="text-xs" style={{ color: "#475569" }}>
            {filteredDespesas.length} lançamentos · {fmt(totalFiltrado)}
          </p>
          <button
            onClick={openFilterSheet}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeFilterCount > 0
                ? "text-primary-foreground shadow-lg shadow-primary/20"
                : "text-foreground border"
            }`}
            style={activeFilterCount > 0
              ? { backgroundColor: "#10B981" }
              : { borderColor: "#10B981", color: "#10B981" }
            }
          >
            <SlidersHorizontal size={12} />
            Filtrar
            {activeFilterCount > 0 && (
              <span className="text-[10px] font-bold bg-white/20 px-1.5 py-0.5 rounded-full">✦ {activeFilterCount}</span>
            )}
          </button>
        </div>

        {/* Active Filter Chips */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3 animate-fade-up">
            {tipoFilter !== "Todas" && (
              <button
                onClick={() => removeFilter("tipo")}
                className="flex items-center gap-1 px-2.5 h-7 rounded-full text-[11px] font-medium"
                style={{ backgroundColor: "#1a1a2e", color: "#10B981" }}
              >
                {tipoFilter} <X size={10} />
              </button>
            )}
            {catFilters.map(c => (
              <button
                key={c}
                onClick={() => removeFilter("cat", c)}
                className="flex items-center gap-1 px-2.5 h-7 rounded-full text-[11px] font-medium"
                style={{ backgroundColor: "#1a1a2e", color: "#10B981" }}
              >
                {CATEGORY_EMOJIS[c] || ""} {c} <X size={10} />
              </button>
            ))}
            {subcatFilters.map(s => (
              <button
                key={s}
                onClick={() => removeFilter("subcat", s)}
                className="flex items-center gap-1 px-2.5 h-7 rounded-full text-[11px] font-medium"
                style={{ backgroundColor: "#1a1a2e", color: "#10B981" }}
              >
                {s} <X size={10} />
              </button>
            ))}
          </div>
        )}

        {!hasData && !isLoading ? (
          <EmptyState title="Nenhum gasto por aqui! 🎉" />
        ) : (
          <>
            {/* Fixas */}
            {showSection("fixa") && fixas.length > 0 && (
              <div className="mb-6 animate-fade-up" style={{ animationDelay: "0.1s" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Home size={14} className="text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">Contas Fixas</h2>
                </div>
                <div className="space-y-1">
                  {fixas.map((bill) =>
                    renderItem(
                      bill,
                      bill.pago ? <CheckCircle2 size={18} className="text-primary" /> : <Clock size={18} className="text-yellow-400" />,
                      <p className="text-[11px] text-muted-foreground">
                        Vence {new Date(bill.data + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} · <span className={bill.pago ? "text-primary" : "text-yellow-400"}>{bill.pago ? "Pago" : "Pendente"}</span>
                      </p>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Parceladas */}
            {showSection("parcelada") && parceladas.length > 0 && (
              <div className="mb-6 animate-fade-up" style={{ animationDelay: "0.15s" }}>
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard size={14} className="text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">Parceladas</h2>
                </div>
                <div className="space-y-1">
                  {parceladas.map((item) => (
                    <SwipeableItem key={item.id} onEdit={() => openEdit(item)} onDelete={() => openDelete(item)}>
                      <div onClick={() => openActions(item)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/30 transition-colors cursor-pointer">
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                          <Receipt size={18} className="text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground truncate">{item.descricao}</p>
                            {item.parcela_atual != null && item.parcela_total != null && item.parcela_atual === item.parcela_total && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0" style={{ backgroundColor: "rgba(245,158,11,0.15)", color: "#F59E0B" }}>🏁 Última parcela!</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-[11px] text-muted-foreground">{item.parcela_atual}/{item.parcela_total} parcelas</p>
                            {renderSubcatLabel(item)}
                          </div>
                          {item.parcela_atual && item.parcela_total && (
                            <div className="w-full h-1 rounded-full bg-secondary/60 mt-1.5">
                              <div className="h-full rounded-full gradient-emerald" style={{ width: `${(item.parcela_atual / item.parcela_total) * 100}%` }} />
                            </div>
                          )}
                          {renderReembolsoBadge(item)}
                        </div>
                        {renderValor(item)}
                      </div>
                    </SwipeableItem>
                  ))}
                </div>
              </div>
            )}

            {/* Extras */}
            {showSection("extra") && extras.length > 0 && (
              <div className="mb-6 animate-fade-up" style={{ animationDelay: "0.2s" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Gift size={14} className="text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">Extras</h2>
                </div>
                <div className="space-y-1">
                  {extras.map((item) =>
                    renderItem(
                      item,
                      <Gift size={18} className="text-muted-foreground" />,
                      <p className="text-[11px] text-muted-foreground">{new Date(item.data + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</p>,
                      "-"
                    )
                  )}
                </div>
              </div>
            )}

            {/* Pais */}
            {showSection("pais") && pais.length > 0 && (
              <div className="mb-6 animate-fade-up" style={{ animationDelay: "0.25s" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Users size={14} className="text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">Pais</h2>
                </div>
                <div className="glass-card p-4 space-y-3 mb-3">
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
                <div className="space-y-1">
                  {pais.map((item) =>
                    renderItem(
                      item,
                      <Users size={18} className="text-muted-foreground" />,
                      <p className="text-[11px] text-muted-foreground">{new Date(item.data + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</p>,
                      "-"
                    )
                  )}
                </div>
              </div>
            )}

            {filteredDespesas.length === 0 && hasData && (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">Nenhum lançamento com esses filtros</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Filter Bottom Sheet */}
      <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto pb-24">
          <div className="space-y-5 pt-2">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Filtrar despesas</h2>
              <button onClick={clearAllFilters} className="text-xs font-semibold text-destructive">Limpar tudo</button>
            </div>

            {/* Tipo */}
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground mb-2">TIPO</p>
              <div className="flex flex-wrap gap-2">
                {(["Todas", "Fixas", "Parceladas", "Extras", "Pais"] as TipoFilter[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setDraftTipo(t)}
                    className={`px-3.5 py-2 rounded-full text-xs font-semibold transition-all ${
                      draftTipo === t ? "text-primary-foreground shadow-md" : "bg-secondary/60 text-muted-foreground"
                    }`}
                    style={draftTipo === t ? { backgroundColor: "#10B981" } : undefined}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Categoria */}
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
                        selected ? "ring-2 bg-secondary/50" : "bg-secondary/30 text-muted-foreground"
                      }`}
                      style={selected ? { ringColor: "#10B981", borderColor: "#10B981" } : undefined}
                    >
                      <span className="text-base">{CATEGORY_EMOJIS[g.group] || "📋"}</span>
                      <span className={selected ? "text-foreground font-semibold" : ""}>{g.group}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Subcategoria */}
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
                          selected ? "text-primary-foreground" : "bg-secondary/50 text-muted-foreground"
                        }`}
                        style={selected ? { backgroundColor: "#10B981" } : undefined}
                      >
                        {sub}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Fixed footer button */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border/30">
            <button
              onClick={applyFilters}
              className="w-full py-3 rounded-xl text-sm font-semibold text-primary-foreground shadow-lg"
              style={{ backgroundColor: "#10B981" }}
            >
              Ver {draftFiltered.length} lançamentos · {fmt(draftPreviewTotal)}
            </button>
          </div>
        </SheetContent>
      </Sheet>

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

      <BottomNav />
    </div>
  );
};

export default Despesas;
