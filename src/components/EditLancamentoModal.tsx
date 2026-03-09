import { useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
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

const categorias = [
  { value: "extra", label: "Despesa" },
  { value: "pais", label: "Pais" },
];

const subcatPais = [
  { value: "paguei_por_eles", label: "💸 Paguei por eles" },
  { value: "paguei_recebo_depois", label: "↩️ Paguei, recebo depois" },
  { value: "eles_pagaram", label: "📋 Eles pagaram" },
  { value: "usaram_meu_cartao", label: "💳 Usaram meu cartão" },
];

const EditLancamentoModal = ({ open, onClose, onSave, onConfirmDelete, showDeleteConfirm, initial, isPending, parcelamentoMode, parcelamentoCount }: Props) => {
  const [form, setForm] = useState({ ...initial });
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingSaveData, setPendingSaveData] = useState<any>(null);
  const { data: cartoes = [] } = useCartoes();

  if (!open) return null;

  if (showDeleteConfirm) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
        <div className="glass-card w-full max-w-sm p-6 space-y-4">
          <h3 className="text-base font-semibold text-foreground text-center">Excluir lançamento?</h3>
          <p className="text-sm text-muted-foreground text-center">Tem certeza? Esta ação não pode ser desfeita.</p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button variant="destructive" onClick={onConfirmDelete} className="flex-1" disabled={isPending}>
              {isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Confirmation dialog for bulk edits (future/all)
  if (showConfirm && pendingSaveData) {
    const isFuture = parcelamentoMode === "future";
    const count = parcelamentoCount ?? 0;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
        <div className="glass-card w-full max-w-sm p-6 space-y-4">
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
            <Button variant="outline" onClick={() => { setShowConfirm(false); setPendingSaveData(null); }} className="flex-1">Voltar</Button>
            <Button
              onClick={() => { setShowConfirm(false); onSave(pendingSaveData); setPendingSaveData(null); }}
              disabled={isPending}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isPending ? "Salvando..." : `Atualizar ${count} parcela${count !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isPais = form.categoria === "pais";
  const isParcelado = !!(form.parcela_atual && form.parcela_total);
  const selectedGroup = SUBCATEGORIA_GROUPS.find(g => g.group === form.categoria_macro);

  // Restrict fields for bulk parcelamento edits
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="glass-card w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">Editar lançamento</h3>
            {modeLabel && (
              <p className="text-[10px] text-primary mt-0.5">{modeLabel}</p>
            )}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">Descrição</Label>
          <Input value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} className="bg-secondary/40 border-border/50" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">Valor (R$)</Label>
          <Input type="number" step="0.01" value={form.valor || ""} onChange={(e) => setForm((f) => ({ ...f, valor: parseFloat(e.target.value) || 0 }))} className="bg-secondary/40 border-border/50" />
        </div>

        {/* Fields hidden in bulk mode */}
        {!isBulkMode && (
          <>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Tipo</Label>
              <Select value={form.categoria} onValueChange={(v) => setForm((f) => ({ ...f, categoria: v }))}>
                <SelectTrigger className="bg-secondary/40 border-border/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Categoria Macro */}
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Categoria</Label>
              <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto">
                {SUBCATEGORIA_GROUPS.map((g) => {
                  const selected = form.categoria_macro === g.group;
                  return (
                    <button
                      key={g.group}
                      onClick={() => setForm((f) => ({ ...f, categoria_macro: g.group, subcategoria: null }))}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[11px] font-medium transition-all text-left",
                        selected ? "bg-primary/15 ring-1 ring-primary text-foreground" : "bg-secondary/40 text-muted-foreground"
                      )}
                    >
                      <span>{g.emoji}</span> {g.group}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Subcategoria */}
            {selectedGroup && (
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Subcategoria</Label>
                <div className="flex flex-wrap gap-1">
                  {selectedGroup.items.map((item) => (
                    <button
                      key={item}
                      onClick={() => setForm((f) => ({ ...f, subcategoria: f.subcategoria === item ? null : item }))}
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-medium transition-all",
                        form.subcategoria === item
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary/60 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Data</Label>
              <Input type="date" value={form.data} onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))} className="bg-secondary/40 border-border/50" />
            </div>

            {isPais && (
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">O que aconteceu?</Label>
                <Select value={form.subcategoria_pais || ""} onValueChange={(v) => setForm((f) => ({ ...f, subcategoria_pais: v }))}>
                  <SelectTrigger className="bg-secondary/40 border-border/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {subcatPais.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {isParcelado && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">Parcela atual</Label>
                  <Input type="number" value={form.parcela_atual ?? ""} onChange={(e) => setForm((f) => ({ ...f, parcela_atual: parseInt(e.target.value) || 0 }))} className="bg-secondary/40 border-border/50" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">Total de parcelas</Label>
                  <Input type="number" value={form.parcela_total ?? ""} onChange={(e) => setForm((f) => ({ ...f, parcela_total: parseInt(e.target.value) || 0 }))} className="bg-secondary/40 border-border/50" />
                </div>
              </div>
            )}

            {/* Forma de pagamento */}
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Pago com</Label>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setForm(f => ({ ...f, forma_pagamento: "pix", cartao_id: null }))}
                  className={cn("px-2.5 py-1 rounded-full text-[11px] font-medium transition-all",
                    form.forma_pagamento === "pix" ? "bg-primary text-primary-foreground" : "bg-secondary/60 text-muted-foreground"
                  )}
                >PIX</button>
                <button
                  onClick={() => setForm(f => ({ ...f, forma_pagamento: "dinheiro", cartao_id: null }))}
                  className={cn("px-2.5 py-1 rounded-full text-[11px] font-medium transition-all",
                    form.forma_pagamento === "dinheiro" ? "bg-primary text-primary-foreground" : "bg-secondary/60 text-muted-foreground"
                  )}
                >Dinheiro</button>
                {cartoes.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setForm(f => ({ ...f, forma_pagamento: "cartao", cartao_id: c.id }))}
                    className={cn("px-2.5 py-1 rounded-full text-[11px] font-medium transition-all",
                      form.forma_pagamento === "cartao" && form.cartao_id === c.id ? "bg-primary text-primary-foreground" : "bg-secondary/60 text-muted-foreground"
                    )}
                  >💳 {c.nome}</button>
                ))}
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

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button
            onClick={handleSaveClick}
            disabled={isPending}
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isPending ? "Salvando..." : isBulkMode ? "Continuar" : "Salvar alterações"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditLancamentoModal;
