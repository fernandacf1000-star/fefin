import { useState, useEffect } from "react";
import { X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { SUBCATEGORIA_GROUPS } from "@/lib/subcategorias";
import { useCartoes } from "@/hooks/useCartoes";

export type ParcelamentoMode = "single" | "future" | "all" | null;

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirmDelete: () => void;
  showDeleteConfirm: boolean;
  onSave: (data: {
    descricao: string;
    valor: number;
    categoria: string;
    data: string;
    subcategoria_pais?: string;
    subcategoria?: string;
    categoria_macro?: string;
    parcela_atual?: number;
    parcela_total?: number;
    forma_pagamento?: string;
    cartao_id?: string;
  }) => void;
  initial: {
    descricao: string;
    valor: number;
    categoria: string;
    data: string;
    subcategoria_pais?: string | null;
    subcategoria?: string | null;
    categoria_macro?: string | null;
    parcela_atual?: number | null;
    parcela_total?: number | null;
    forma_pagamento?: string | null;
    cartao_id?: string | null;
  };
  isPending?: boolean;
  parcelamentoMode?: ParcelamentoMode;
  parcelamentoCount?: number;
}

const DISPLAY_GROUPS = [
  "Moradia", "Alimentação", "Transporte", "Saúde", "Pessoal", "Lazer",
  "Assinaturas", "Pais", "Investimentos", "Outros",
];

const normalizeInitial = (initial: Props["initial"]) => ({
  ...initial,
  valor: initial.valor || 0,
  forma_pagamento: initial.cartao_id ? "cartao" : (initial.forma_pagamento || "dinheiro"),
  cartao_id: initial.cartao_id || null,
  subcategoria_pais: initial.categoria === "pais" ? "paguei_por_eles" : (initial.subcategoria_pais || null),
});

const EditLancamentoModal = ({ open, onClose, onSave, onConfirmDelete, showDeleteConfirm, initial, isPending, parcelamentoMode, parcelamentoCount }: Props) => {
  const [form, setForm] = useState(normalizeInitial(initial));
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingSaveData, setPendingSaveData] = useState<any>(null);
  const [valorTouched, setValorTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(normalizeInitial(initial));
      setShowConfirm(false);
      setPendingSaveData(null);
      setValorTouched(false);
    }
  }, [open, initial]);

  const { data: cartoes = [] } = useCartoes();
  const cartoesFiltrados = cartoes.filter((c) => {
    const bandeira = c.bandeira?.toLowerCase?.() ?? "";
    return bandeira === "visa" || bandeira === "mastercard" || bandeira === "master";
  });

  if (!open) return null;

  if (showDeleteConfirm) {
    return (
      <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/25 backdrop-blur-sm">
        <div className="w-full max-w-[430px] rounded-t-[24px] p-6 pb-24 space-y-4 bg-white border-t border-border">
          <h3 className="text-base font-semibold text-foreground text-center">Excluir lançamento?</h3>
          <p className="text-sm text-muted-foreground text-center">Tem certeza? Esta ação não pode ser desfeita.</p>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-semibold bg-secondary text-muted-foreground">Cancelar</button>
            <button onClick={onConfirmDelete} disabled={isPending} className="flex-1 py-3 rounded-xl text-sm font-semibold bg-destructive text-destructive-foreground disabled:opacity-50">
              {isPending ? "Excluindo..." : "Excluir"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showConfirm && pendingSaveData) {
    const isFuture = parcelamentoMode === "future";
    const count = parcelamentoCount ?? 0;
    return (
      <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/25 backdrop-blur-sm">
        <div className="w-full max-w-[430px] rounded-t-[24px] p-6 pb-24 space-y-4 bg-white border-t border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
              <AlertTriangle size={18} className="text-amber-500" />
            </div>
            <h3 className="text-base font-semibold text-foreground">Confirmar edição em lote</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            {isFuture
              ? `Isso vai atualizar ${count} parcela${count !== 1 ? "s" : ""} futura${count !== 1 ? "s" : ""}. Confirmar?`
              : `Isso vai atualizar todas as ${count} parcela${count !== 1 ? "s" : ""} deste parcelamento. Confirmar?`
            }
          </p>
          <div className="flex gap-3">
            <button onClick={() => { setShowConfirm(false); setPendingSaveData(null); }} className="flex-1 py-3 rounded-xl text-sm font-semibold bg-secondary text-muted-foreground">Voltar</button>
            <button
              onClick={() => { setShowConfirm(false); onSave(pendingSaveData); setPendingSaveData(null); }}
              disabled={isPending}
              className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-50 gradient-emerald text-white"
            >
              {isPending ? "Salvando..." : `Atualizar ${count} parcela${count !== 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isPais = form.categoria === "pais";
  const isParcelado = !!(form.parcela_atual && form.parcela_total);
  const selectedGroup = SUBCATEGORIA_GROUPS.find(g => g.group === form.categoria_macro);
  const isBulkMode = parcelamentoMode === "future" || parcelamentoMode === "all";

  const getModeLabel = () => {
    if (parcelamentoMode === "future") return "Editando: este e os próximos";
    if (parcelamentoMode === "all") return "Editando: todas as parcelas";
    return null;
  };
  const modeLabel = getModeLabel();

  const buildSaveData = () => {
    const data: any = {
      descricao: form.descricao,
      categoria: form.categoria,
      data: form.data,
      subcategoria_pais: form.categoria === "pais" ? "paguei_por_eles" : undefined,
      subcategoria: form.subcategoria || undefined,
      categoria_macro: form.categoria_macro || undefined,
      parcela_atual: form.parcela_atual ?? undefined,
      parcela_total: form.parcela_total ?? undefined,
      forma_pagamento: form.forma_pagamento || undefined,
      cartao_id: form.cartao_id || undefined,
    };
    if (!isBulkMode || valorTouched) {
      data.valor = form.valor;
    }
    return data;
  };

  const handleSaveClick = () => {
    if (form.forma_pagamento === "cartao" && !form.cartao_id) {
      return;
    }
    const data = buildSaveData();
    if (isBulkMode) {
      setPendingSaveData(data);
      setShowConfirm(true);
    } else {
      onSave(data);
    }
  };

  const formatValorDisplay = (v: number) => {
    if (!v) return "";
    return v.toFixed(2).replace(".", ",");
  };

  const handleValorChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    const num = parseInt(digits || "0", 10) / 100;
    setForm(f => ({ ...f, valor: num }));
    setValorTouched(true);
  };

  const paymentOptions = [
    { key: "dinheiro", label: "💵 Dinheiro", cartao: null },
    ...cartoesFiltrados.map(c => ({ key: `cartao_${c.id}`, label: `💳 ${c.nome}`, cartao: c.id })),
  ];

  return (
    <>
      <div className="fixed inset-0 z-[80] bg-black/25 backdrop-blur-sm" onClick={onClose} />
      <div
        className="fixed inset-x-0 bottom-0 z-[90] flex flex-col bg-white border-t border-border"
        style={{ maxHeight: "90vh", borderRadius: "24px 24px 0 0" }}
      >
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="flex items-center justify-between px-5 py-3 shrink-0">
          <div>
            <h3 className="text-base font-bold text-foreground">Editar lançamento</h3>
            {modeLabel && <p className="text-[10px] text-primary mt-0.5">{modeLabel}</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-5">
          {!isBulkMode && (
            <div>
              <p className="text-[11px] text-muted-foreground mb-2">Tipo</p>
              <div className="flex gap-2">
                {[
                  { value: "extra", label: "Despesa" },
                  { value: "pais", label: "Pais" },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setForm(f => ({ ...f, categoria: opt.value }))}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-sm font-semibold transition-all",
                      form.categoria === opt.value
                        ? "gradient-emerald text-white"
                        : "bg-secondary text-muted-foreground"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-[11px] text-muted-foreground mb-1.5">Descrição</p>
            <input
              value={form.descricao}
              onChange={(e) => setForm(f => ({ ...f, descricao: e.target.value }))}
              className="w-full rounded-xl bg-secondary border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Ex: Supermercado"
            />
          </div>

          <div>
            <p className="text-[11px] text-muted-foreground mb-1.5">Valor</p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
              <input
                inputMode="numeric"
                value={formatValorDisplay(form.valor)}
                onChange={(e) => handleValorChange(e.target.value)}
                className="w-full rounded-xl bg-secondary border border-border pl-8 pr-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="0,00"
              />
            </div>
          </div>

          {!isBulkMode && (
            <>
              <div>
                <p className="text-[11px] text-muted-foreground mb-2">Categoria</p>
                <div className="grid grid-cols-2 gap-2">
                  {SUBCATEGORIA_GROUPS
                    .filter((g) => DISPLAY_GROUPS.includes(g.group))
                    .map((g) => {
                      const selected = form.categoria_macro === g.group;
                      return (
                        <button
                          key={g.group}
                          onClick={() => setForm(f => ({ ...f, categoria_macro: g.group, subcategoria: null }))}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-medium transition-all text-left",
                            selected
                              ? "ring-2 ring-primary bg-primary/10 text-foreground"
                              : "bg-secondary text-muted-foreground"
                          )}
                        >
                          <span className="text-base">{g.emoji}</span>
                          <span className="truncate">{g.group}</span>
                        </button>
                      );
                    })}
                </div>
              </div>

              {selectedGroup && (
                <div>
                  <p className="text-[11px] text-muted-foreground mb-2">Subcategoria</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedGroup.items.map((item) => (
                      <button
                        key={item}
                        onClick={() => setForm(f => ({ ...f, subcategoria: f.subcategoria === item ? null : item }))}
                        className={cn(
                          "px-3 py-1 rounded-full text-[11px] font-medium transition-all",
                          form.subcategoria === item
                            ? "gradient-emerald text-white"
                            : "bg-secondary text-muted-foreground"
                        )}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-[11px] text-muted-foreground mb-1.5">Data</p>
                <input
                  type="date"
                  value={form.data}
                  onChange={(e) => setForm(f => ({ ...f, data: e.target.value }))}
                  className="w-full rounded-xl bg-secondary border border-border px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {isParcelado && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-1.5">Parcela atual</p>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={form.parcela_atual ?? ""}
                      onChange={(e) => setForm(f => ({ ...f, parcela_atual: parseInt(e.target.value) || 0 }))}
                      className="w-full rounded-xl bg-secondary border border-border px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-1.5">Total de parcelas</p>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={form.parcela_total ?? ""}
                      onChange={(e) => setForm(f => ({ ...f, parcela_total: parseInt(e.target.value) || 0 }))}
                      className="w-full rounded-xl bg-secondary border border-border px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>
              )}

              <div>
                <p className="text-[11px] text-muted-foreground mb-2">Pago com</p>
                <div className="flex flex-wrap gap-2">
                  {paymentOptions.map(opt => {
                    const isCartao = opt.cartao !== null;
                    const isSelected = isCartao
                      ? form.forma_pagamento === "cartao" && form.cartao_id === opt.cartao
                      : form.forma_pagamento === "dinheiro";

                    return (
                      <button
                        key={opt.key}
                        onClick={() => setForm(f => ({
                          ...f,
                          forma_pagamento: isCartao ? "cartao" : "dinheiro",
                          cartao_id: isCartao ? opt.cartao : null,
                        }))}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-[11px] font-medium transition-all",
                          isSelected ? "gradient-emerald text-white" : "bg-secondary text-muted-foreground"
                        )}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                {cartoesFiltrados.length === 0 && (
                  <p className="text-[12px] text-muted-foreground w-full mt-1">
                    Adicione um cartão Visa ou Master em Minha Conta para selecionar aqui
                  </p>
                )}
              </div>
            </>
          )}

          {isBulkMode && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3">
              <p className="text-[11px] text-amber-600">
                {parcelamentoMode === "future"
                  ? `⚠️ Apenas descrição e valor serão atualizados em ${parcelamentoCount ?? "N"} parcela(s) futura(s).`
                  : `⚠️ Apenas descrição e valor serão atualizados em todas as ${parcelamentoCount ?? "N"} parcela(s).`
                }
              </p>
            </div>
          )}
        </div>

        <div className="px-5 pb-8 pt-3 shrink-0 border-t border-border">
          <button
            onClick={handleSaveClick}
            disabled={isPending || (form.forma_pagamento === "cartao" && !form.cartao_id)}
            className="w-full py-3.5 rounded-2xl text-sm font-bold text-white disabled:opacity-50 transition-opacity gradient-emerald"
          >
            {isPending ? "Salvando..." : isBulkMode ? "Continuar" : "Salvar alterações"}
          </button>
        </div>
      </div>
    </>
  );
};

export default EditLancamentoModal;
