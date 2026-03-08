import BottomNav from "@/components/BottomNav";
import EmptyState from "@/components/EmptyState";
import { useLancamentos, useUpdateLancamento, useDeleteLancamento } from "@/hooks/useLancamentos";
import {
  Home, CreditCard, Gift, Users, CheckCircle2, Clock,
  Receipt, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import SwipeableItem from "@/components/SwipeableItem";
import LancamentoActions from "@/components/LancamentoActions";
import EditLancamentoModal from "@/components/EditLancamentoModal";
import type { Lancamento } from "@/hooks/useLancamentos";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const categories = ["Todas", "Fixas", "Parceladas", "Extras", "Pais"] as const;
type Category = (typeof categories)[number];

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
  const [activeFilter, setActiveFilter] = useState<Category>("Todas");
  const [selectedMonth, setSelectedMonth] = useState(1);

  // Edit/delete state
  const [selectedLanc, setSelectedLanc] = useState<Lancamento | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const mesRef = months[selectedMonth]?.key;
  const { data: lancamentos = [], isLoading } = useLancamentos(mesRef);
  const updateMut = useUpdateLancamento();
  const deleteMut = useDeleteLancamento();

  const despesas = useMemo(() => lancamentos.filter((l) => l.tipo === "despesa"), [lancamentos]);
  const fixas = useMemo(() => despesas.filter((d) => d.categoria === "fixa"), [despesas]);
  const parceladas = useMemo(() => despesas.filter((d) => d.categoria === "parcelada"), [despesas]);
  const extras = useMemo(() => despesas.filter((d) => d.categoria === "extra"), [despesas]);
  const pais = useMemo(() => despesas.filter((d) => d.categoria === "pais"), [despesas]);

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

  const hasData = despesas.length > 0;
  const showSection = (cat: Category) => activeFilter === "Todas" || activeFilter === cat;

  const openActions = (lanc: Lancamento) => {
    setSelectedLanc(lanc);
    setActionsOpen(true);
  };

  const openEdit = (lanc: Lancamento) => {
    setSelectedLanc(lanc);
    setEditOpen(true);
    setDeleteConfirm(false);
  };

  const openDelete = (lanc: Lancamento) => {
    setSelectedLanc(lanc);
    setEditOpen(true);
    setDeleteConfirm(true);
  };

  const handleSave = async (data: any) => {
    if (!selectedLanc) return;
    try {
      await updateMut.mutateAsync({ id: selectedLanc.id, ...data });
      toast.success("Lançamento atualizado ✓");
      setEditOpen(false);
    } catch {
      toast.error("Erro ao atualizar.");
    }
  };

  const handleDelete = async () => {
    if (!selectedLanc) return;
    try {
      await deleteMut.mutateAsync(selectedLanc.id);
      toast.success("Lançamento excluído ✓");
      setEditOpen(false);
      setActionsOpen(false);
    } catch {
      toast.error("Erro ao excluir.");
    }
  };

  const renderItem = (item: Lancamento, icon: React.ReactNode, subtitle: React.ReactNode, valuePrefix = "") => (
    <SwipeableItem
      key={item.id}
      onEdit={() => openEdit(item)}
      onDelete={() => openDelete(item)}
    >
      <div
        onClick={() => openActions(item)}
        className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/30 transition-colors cursor-pointer"
      >
        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{item.descricao}</p>
          {subtitle}
        </div>
        <p className="text-sm font-semibold text-foreground tabular-nums">{valuePrefix}{fmt(Number(item.valor))}</p>
      </div>
    </SwipeableItem>
  );

  return (
    <div className="min-h-screen gradient-bg overflow-x-hidden pb-[90px]">
      <div className="px-4 pt-12 w-full">
        <h1 className="text-xl font-semibold text-foreground mb-4 animate-fade-up">Despesas</h1>

        {/* Month Selector */}
        <div className="flex items-center justify-center gap-3 mb-5 animate-fade-up" style={{ animationDelay: "0.03s" }}>
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

        {!hasData && !isLoading ? (
          <EmptyState title="Nenhum gasto por aqui! 🎉" />
        ) : (
          <>
            {/* Filter Pills */}
            <div className="flex gap-2 overflow-x-auto pb-4 mb-4 animate-fade-up scrollbar-none" style={{ animationDelay: "0.05s" }}>
              {categories.map((cat) => (
                <button key={cat} onClick={() => setActiveFilter(cat)} className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${activeFilter === cat ? "gradient-emerald text-primary-foreground shadow-lg shadow-primary/20" : "bg-secondary/60 text-muted-foreground hover:bg-secondary"}`}>
                  {cat}
                </button>
              ))}
            </div>

            {/* Fixas */}
            {showSection("Fixas") && fixas.length > 0 && (
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
            {showSection("Parceladas") && parceladas.length > 0 && (
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
                          <p className="text-sm font-medium text-foreground truncate">{item.descricao}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-[11px] text-muted-foreground">{item.parcela_atual}/{item.parcela_total} parcelas</p>
                            {item.parcela_atual === item.parcela_total && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/20 text-primary">Última!</span>
                            )}
                          </div>
                          {item.parcela_atual && item.parcela_total && (
                            <div className="w-full h-1 rounded-full bg-secondary/60 mt-1.5">
                              <div className="h-full rounded-full gradient-emerald" style={{ width: `${(item.parcela_atual / item.parcela_total) * 100}%` }} />
                            </div>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-foreground tabular-nums">{fmt(Number(item.valor))}</p>
                      </div>
                    </SwipeableItem>
                  ))}
                </div>
              </div>
            )}

            {/* Extras */}
            {showSection("Extras") && extras.length > 0 && (
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
            {showSection("Pais") && pais.length > 0 && (
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
          </>
        )}
      </div>

      <LancamentoActions
        open={actionsOpen}
        onClose={() => setActionsOpen(false)}
        onEdit={() => { if (selectedLanc) openEdit(selectedLanc); }}
        onDelete={() => { if (selectedLanc) openDelete(selectedLanc); setActionsOpen(false); }}
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
            parcela_atual: selectedLanc.parcela_atual,
            parcela_total: selectedLanc.parcela_total,
          }}
        />
      )}

      <BottomNav />
    </div>
  );
};

export default Despesas;
