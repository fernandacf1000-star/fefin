import { useState } from "react";
import { X, AlertTriangle, ChevronLeft } from "lucide-react";
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

const subcatPais = [
  { value: "paguei_por_eles", label: "💸 Paguei por eles" },
  { value: "paguei_recebo_depois", label: "↩️ Paguei, recebo depois" },
  { value: "eles_pagaram", label: "📋 Eles pagaram" },
  { value: "usaram_meu_cartao", label: "💳 Usaram meu cartão" },
];

// 6 fixed display groups for edit modal (matching dashboard grid)
const DISPLAY_GROUPS = [
  "Moradia", "Alimentação", "Transporte", "Saúde", "Pessoal", "Lazer",
  "Assinaturas", "Pais", "Investimentos", "Outros",
];

const EditLancamentoModal = ({ open, onClose, onSave, onConfirmDelete, showDeleteConfirm, initial, isPending, parcelamentoMode, parcelamentoCount }: Props) => {
  const [form, setForm] = useState({ ...initial, valor: initial.valor || 0 });
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingSaveData, setPendingSaveData] = useState<any>(null);
  const { data: cartoes = [] } = useCartoes();

  if (!open) return null;

  if (showDeleteConfirm) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-[430px] rounded-t-[24px] p-6 space-y-4" style={{ background: "#0d1117" }}>
          <h3 className="text-base font-semibold text-foreground text-center">Excluir lançamento?</h3>
          <p className="text-sm text-muted-foreground text-center">Tem certeza? Esta ação não pode ser desfeita.</p>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-semibold bg-secondary/60 text-muted-foreground">Cancelar</button>
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
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-[430px] rounded-t-[24px] p-6 space-y-4" style={{ background: "#0d1117" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-500/15 flex items-center justify-center shrink-0">
              <AlertTriangle size={18} className="text-yellow-400" />
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
            <button onClick={() => { setShowConfirm(false); setPendingSaveData(null); }} className="flex-1 py-3 rounded-xl text-sm font-semibold bg-secondary/60 text-muted-foreground">Voltar</button>
            <button
              onClick={() => { setShowConfirm(false); onSave(pendingSaveData); setPendingSaveData(null); }}
              disabled={isPending}
              className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
              style={{ background: "#10B981", color: "#fff" }}
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

  const buildSaveData = () => ({
    descricao: form.descricao,
    valor: form.valor,
    categoria: form.categoria,
    data: form.data,
    subcategoria_pais: form.subcategoria_pais || undefined,
    subcategoria: form.subcategoria || undefined,
    categoria_macro: form.categoria_macro || undefined,
    parcela_atual: form.parcela_atual ?? undefined,
    parcela_total: form.parcela_total ?? undefined,
    forma_pagamento: form.forma_pagamento || undefined,
    cartao_id: form.cartao_id || undefined,
  });

  const handleSaveClick = () => {
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
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div
        className="fixed inset-x-0 bottom-0 z-[51] flex flex-col"
        style={{
          maxHeight: "90vh",
          borderRadius: "24px 24px 0 0",
          background: "#0d1117",
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 shrink-0">
          <div>
            <h3 className="text-base font-bold text-foreground">Editar lançamento</h3>
            {modeLabel && <p className="text-[10px] text-primary mt-0.5">{modeLabel}</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-secondary/60 flex items-center justify-center text-muted-foreground">
            <X size={16} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-5">

          {/* Tipo pills (categoria) */}
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
                        ? "text-white"
                        : "bg-secondary/60 text-muted-foreground"
                    )}
                    style={form.categoria === opt.value ? { background: "#10B981" } : {}}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Descrição */}
          <div>
            <p className="text-[11px] text-muted-foreground mb-1.5">Descrição</p>
            <input
              value={form.descricao}
              onChange={(e) => setForm(f => ({ ...f, descricao: e.target.value }))}
              className="w-full rounded-xl bg-secondary/40 border border-border/40 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Ex: Supermercado"
            />
          </div>

          {/* Valor */}
          <div>
            <p className="text-[11px] text-muted-foreground mb-1.5">Valor</p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
              <input
                inputMode="numeric"
                value={formatValorDisplay(form.valor)}
                onChange={(e) => handleValorChange(e.target.value)}
                className="w-full rounded-xl bg-secondary/40 border border-border/40 pl-8 pr-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="0,00"
              />
            </div>
          </div>

          {!isBulkMode && (
            <>
              {/* Categoria Macro - grid 2 cols */}
              <div>
                <p className="text-[11px] text-muted-foreground mb-2">Categoria</p>
                <div className="grid grid-cols-2 gap-2">
                  {SUBCATEGORIA_GROUPS.map((g) => {
                    const selected = form.categoria_macro === g.group;
                    return (
                      <button
                        key={g.group}
                        onClick={() => setForm(f => ({ ...f, categoria_macro: g.group, subcategoria: null }))}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-medium transition-all text-left",
                          selected
                            ? "ring-2 text-foreground"
                            : "bg-secondary/40 text-muted-foreground"
                        )}
                        style={selected ? { background: "rgba(16,185,129,0.12)", outline: "2px solid #10B981" } : {}}
                      >
                        <span className="text-base">{g.emoji}</span>
                        <span className="truncate">{g.group}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Subcategoria - pills */}
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
                            ? "text-white"
                            : "bg-secondary/60 text-muted-foreground"
                        )}
                        style={form.subcategoria === item ? { background: "#10B981" } : {}}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Data */}
              <div>
                <p className="text-[11px] text-muted-foreground mb-1.5">Data</p>
                <input
                  type="date"
                  value={form.data}
                  onChange={(e) => setForm(f => ({ ...f, data: e.target.value }))}
                  className="w-full rounded-xl bg-secondary/40 border border-border/40 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Subcategoria pais */}
              {isPais && (
                <div>
                  <p className="text-[11px] text-muted-foreground mb-2">O que aconteceu?</p>
                  <div className="flex flex-wrap gap-1.5">
                    {subcatPais.map(s => (
                      <button
                        key={s.value}
                        onClick={() => setForm(f => ({ ...f, subcategoria_pais: f.subcategoria_pais === s.value ? "" : s.value }))}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-[11px] font-medium transition-all",
                          form.subcategoria_pais === s.value ? "text-white" : "bg-secondary/60 text-muted-foreground"
                        )}
                        style={form.subcategoria_pais === s.value ? { background: "#10B981" } : {}}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Parcelas */}
              {isParcelado && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-1.5">Parcela atual</p>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={form.parcela_atual ?? ""}
                      onChange={(e) => setForm(f => ({ ...f, parcela_atual: parseInt(e.target.value) || 0 }))}
                      className="w-full rounded-xl bg-secondary/40 border border-border/40 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-1.5">Total de parcelas</p>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={form.parcela_total ?? ""}
                      onChange={(e) => setForm(f => ({ ...f, parcela_total: parseInt(e.target.value) || 0 }))}
                      className="w-full rounded-xl bg-secondary/40 border border-border/40 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>
              )}

              {/* Forma de pagamento */}
              <div>
                <p className="text-[11px] text-muted-foreground mb-2">Pago com</p>
                <div className="flex flex-wrap gap-2">
                  {cartoes.length === 0 ? (
                    <>
                      <button
                        onClick={() => setForm(f => ({
                          ...f,
                          forma_pagamento: "dinheiro",
                          cartao_id: null,
                        }))}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-[11px] font-medium transition-all",
                          form.forma_pagamento === "dinheiro" ? "text-white" : "bg-secondary/60 text-muted-foreground"
                        )}
                        style={form.forma_pagamento === "dinheiro" ? { background: "#10B981" } : {}}
                      >
                        💵 Dinheiro
                      </button>
                      <p className="text-[12px] text-[#475569] w-full mt-1">
                        Adicione um cartão em Minha Conta para selecionar aqui
                      </p>
                    </>
                  ) : (
                    [
                      { key: "dinheiro", label: "💵 Dinheiro", cartao: null },
                      ...cartoes.map(c => ({ key: "cartao_" + c.id, label: "💳 " + c.nome, cartao: c.id })),
                    ].map(opt => {
                      const isCartao = opt.cartao !== null;
                      const isSelected = isCartao
                        ? form.forma_pagamento === "cartao" && form.cartao_id === opt.cartao
                        : form.forma_pagamento === opt.key;
                      return (
                        <button
                          key={opt.key}
                          onClick={() => setForm(f => ({
                            ...f,
                            forma_pagamento: isCartao ? "cartao" : opt.key,
                            cartao_id: isCartao ? opt.cartao : null,
                          }))}
                          className={cn(
                            "px-3 py-1.5 rounded-full text-[11px] font-medium transition-all",
                            isSelected ? "text-white" : "bg-secondary/60 text-muted-foreground"
                          )}
                          style={isSelected ? { background: "#10B981" } : {}}
                        >
                          {opt.label}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}

          {isBulkMode && (
            <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-3">
              <p className="text-[11px] text-yellow-400">
                {parcelamentoMode === "future"
                  ? `⚠️ Apenas descrição e valor serão atualizados em ${parcelamentoCount ?? "N"} parcela(s) futura(s).`
                  : `⚠️ Apenas descrição e valor serão atualizados em todas as ${parcelamentoCount ?? "N"} parcela(s).`
                }
              </p>
            </div>
          )}
        </div>

        {/* Fixed footer - save button */}
        <div className="px-5 pb-8 pt-3 shrink-0 border-t border-border/20">
          <button
            onClick={handleSaveClick}
            disabled={isPending}
            className="w-full py-3.5 rounded-2xl text-sm font-bold text-white disabled:opacity-50 transition-opacity"
            style={{ background: "#10B981" }}
          >
            {isPending ? "Salvando..." : isBulkMode ? "Continuar" : "Salvar alterações"}
          </button>
        </div>
      </div>
    </>
  );
};

export default EditLancamentoModal;
