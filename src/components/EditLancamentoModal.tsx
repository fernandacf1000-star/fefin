import { useEffect, useState } from "react";
import { X, CalendarIcon } from "lucide-react";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Lancamento } from "@/hooks/useLancamentos";
import {
  useUpdateLancamento,
  useUpdateAllParcelamento,
  useUpdateParcelamentoFuturas,
  useAddMultipleLancamentos,
  useUpdateFutureRecorrencia,
  useUpdateAllRecorrencia,
} from "@/hooks/useLancamentos";
import type { Cartao } from "@/hooks/useCartoes";
import { SUBCATEGORIA_GROUPS, detectCategoriaMacro } from "@/lib/subcategorias";

interface Props {
  open: boolean;
  lancamento: Lancamento | null;
  onClose: () => void;
  onSave: (updates: Partial<Lancamento>) => Promise<void>;
  cartoes: Cartao[];
}

type EditScope = "este" | "futuras" | "todos";

const EditLancamentoModal = ({ open, lancamento, onClose, onSave, cartoes }: Props) => {
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState<Date>(new Date());
  const [subcategoria, setSubcategoria] = useState<string | null>(null);
  const [formaPagamento, setFormaPagamento] = useState<"dinheiro" | "credito">("dinheiro");
  const [cartaoId, setCartaoId] = useState("");
  const [saving, setSaving] = useState(false);
  const [isParcelado, setIsParcelado] = useState(false);
  const [parcelas, setParcelas] = useState("2");
  const [recorrente, setRecorrente] = useState(false);
  const [diaRecorrencia, setDiaRecorrencia] = useState("1");
  const [editScope, setEditScope] = useState<EditScope>("este");

  const updateLancamento = useUpdateLancamento();
  const updateAll = useUpdateAllParcelamento();
  const updateFuturas = useUpdateParcelamentoFuturas();
  const addMultiple = useAddMultipleLancamentos();
  const updateFuturasRecorrencia = useUpdateFutureRecorrencia();
  const updateAllRecorrencia = useUpdateAllRecorrencia();

  useEffect(() => {
    if (!lancamento) return;
    setDescricao(lancamento.descricao || "");
    setValor(
      Number(lancamento.valor).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
    setData(lancamento.data ? new Date(lancamento.data + "T12:00:00") : new Date());
    setSubcategoria(lancamento.subcategoria || null);
    setIsParcelado(lancamento.is_parcelado || false);
    setParcelas(String(lancamento.parcela_total || 2));
    setRecorrente(lancamento.recorrente || false);
    setDiaRecorrencia(String(lancamento.dia_recorrencia || 1));
    setEditScope("este");
    if (lancamento.cartao_id) {
      setFormaPagamento("credito");
      setCartaoId(lancamento.cartao_id);
    } else {
      setFormaPagamento("dinheiro");
      setCartaoId("");
    }
  }, [lancamento]);

  const handleValorChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) {
      setValor("");
      return;
    }
    setValor(
      (parseInt(digits, 10) / 100).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  };

  const getNumValor = () => parseFloat(valor.replace(/\./g, "").replace(",", ".")) || 0;

  const handleSave = async () => {
    if (!lancamento) return;
    const numValor = getNumValor();
    if (numValor <= 0) return;
    setSaving(true);
    try {
      const macro = detectCategoriaMacro(subcategoria || "") || null;
      const forma = formaPagamento === "dinheiro" ? "dinheiro" : "credito";
      const cartao = formaPagamento === "credito" ? (cartaoId || null) : null;
      const baseUpdates = {
        descricao,
        valor: numValor,
        subcategoria: subcategoria || null,
        categoria_macro: macro,
        forma_pagamento: forma,
        cartao_id: cartao,
      };

      const wasParcelado = lancamento.is_parcelado && lancamento.parcelamento_id;
      const wasRecorrente = lancamento.recorrente && lancamento.recorrencia_pai_id;
      const wasSimples = !wasParcelado && !wasRecorrente;

      if (wasSimples && isParcelado && !recorrente) {
        const nParcelas = parseInt(parcelas, 10) || 2;
        const parcelamentoId = crypto.randomUUID?.() ?? `${Date.now()}`;
        await updateLancamento.mutateAsync({
          id: lancamento.id,
          ...baseUpdates,
          data: format(data, "yyyy-MM-dd"),
          mes_referencia: `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`,
          is_parcelado: true,
          parcela_atual: 1,
          parcela_total: nParcelas,
          parcelamento_id: parcelamentoId,
        });
        const rows: any[] = [];
        for (let i = 1; i < nParcelas; i++) {
          const d = addMonths(data, i);
          rows.push({
            ...baseUpdates,
            tipo: "despesa",
            categoria: lancamento.categoria || "extra",
            subcategoria_pais: lancamento.subcategoria_pais || null,
            data: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`,
            mes_referencia: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
            parcela_atual: i + 1,
            parcela_total: nParcelas,
            is_parcelado: true,
            parcelamento_id: parcelamentoId,
            pago: false,
            recorrente: false,
            dia_recorrencia: null,
            recorrencia_ate: null,
            recorrencia_pai_id: null,
          });
        }
        if (rows.length > 0) await addMultiple.mutateAsync(rows);
      } else if (wasSimples && recorrente && !isParcelado) {
        const dia = parseInt(diaRecorrencia, 10) || 1;
        const paiId = crypto.randomUUID?.() ?? `${Date.now()}`;
        await updateLancamento.mutateAsync({
          id: lancamento.id,
          ...baseUpdates,
          data: format(data, "yyyy-MM-dd"),
          mes_referencia: `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`,
          recorrente: true,
          dia_recorrencia: dia,
          recorrencia_pai_id: paiId,
          is_parcelado: false,
          parcela_atual: null,
          parcela_total: null,
          parcelamento_id: null,
        });
        const rows: any[] = [];
        for (let i = 1; i < 24; i++) {
          const m = addMonths(data, i);
          const daysInMonth = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
          rows.push({
            ...baseUpdates,
            tipo: "despesa",
            categoria: lancamento.categoria || "extra",
            subcategoria_pais: lancamento.subcategoria_pais || null,
            data: `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}-${String(Math.min(dia, daysInMonth)).padStart(2, "0")}`,
            mes_referencia: `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`,
            parcela_atual: null,
            parcela_total: null,
            is_parcelado: false,
            parcelamento_id: null,
            pago: false,
            recorrente: true,
            dia_recorrencia: dia,
            recorrencia_ate: null,
            recorrencia_pai_id: paiId,
          });
        }
        await addMultiple.mutateAsync(rows);
      } else if (wasParcelado) {
        if (editScope === "este") {
          await updateLancamento.mutateAsync({ id: lancamento.id, ...baseUpdates, data: format(data, "yyyy-MM-dd") });
        } else if (editScope === "futuras") {
          await updateFuturas.mutateAsync({
            parcelamento_id: lancamento.parcelamento_id!,
            fromDate: lancamento.data,
            updates: baseUpdates,
          });
        } else {
          await updateAll.mutateAsync({
            parcelamento_id: lancamento.parcelamento_id!,
            updates: baseUpdates,
          });
        }
      } else if (wasRecorrente) {
        if (editScope === "este") {
          await updateLancamento.mutateAsync({ id: lancamento.id, ...baseUpdates, data: format(data, "yyyy-MM-dd") });
        } else if (editScope === "futuras") {
          await updateFuturasRecorrencia.mutateAsync({
            recorrencia_pai_id: lancamento.recorrencia_pai_id!,
            fromDate: lancamento.data,
            updates: baseUpdates,
          });
        } else {
          await updateAllRecorrencia.mutateAsync({
            recorrencia_pai_id: lancamento.recorrencia_pai_id!,
            updates: baseUpdates,
          });
        }
      } else {
        await onSave({ ...baseUpdates, data: format(data, "yyyy-MM-dd") });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!open || !lancamento) return null;

  const isReceita = lancamento.tipo === "receita";
  const wasParcelado = lancamento.is_parcelado && lancamento.parcelamento_id;
  const wasRecorrente = lancamento.recorrente && lancamento.recorrencia_pai_id;
  const wasSimples = !wasParcelado && !wasRecorrente;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[80] bg-black/25 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[90] max-h-[85vh] overflow-y-auto rounded-3xl bg-white shadow-xl border border-border">
        <div className="px-5 pt-5 pb-8 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">Editar lançamento</h2>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-secondary transition-colors">
              <X size={17} className="text-muted-foreground" />
            </button>
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Descrição</label>
            <Input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="bg-[#E8ECF5] border-0 rounded-xl"
            />
          </div>

          {/* Valor */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Valor</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
              <Input
                value={valor}
                onChange={(e) => handleValorChange(e.target.value)}
                className="bg-[#E8ECF5] border-0 pl-9 text-base font-bold rounded-xl"
                inputMode="numeric"
              />
            </div>
          </div>

          {/* Data */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Data</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start bg-[#E8ECF5] border-0 text-foreground text-sm rounded-xl">
                  <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                  {format(data, "dd 'de' MMMM, yyyy", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[100]" align="start">
                <Calendar
                  mode="single"
                  selected={data}
                  onSelect={(d) => d && setData(d)}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Subcategoria (só despesa) */}
          {!isReceita && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Categoria</label>
              <div className="flex flex-wrap gap-1.5">
                {SUBCATEGORIA_GROUPS.map((group) =>
                  group.items.map((item) => (
                    <button
                      key={item}
                      onClick={() => setSubcategoria(subcategoria === item ? null : item)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors",
                        subcategoria === item
                          ? "bg-primary text-primary-foreground"
                          : "bg-[#E8ECF5] text-muted-foreground"
                      )}
                    >
                      {group.emoji} {item}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Forma de pagamento (só despesa) */}
          {!isReceita && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Pagamento</label>
              <div className="flex gap-2 p-1 rounded-2xl bg-[#E8ECF5]">
                {(["dinheiro", "credito"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormaPagamento(f)}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-xs font-semibold transition-all",
                      formaPagamento === f
                        ? "bg-white shadow-sm text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {f === "dinheiro" ? "💵 Dinheiro" : "💳 Crédito"}
                  </button>
                ))}
              </div>

              {formaPagamento === "credito" && cartoes.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {cartoes.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setCartaoId(c.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors",
                        cartaoId === c.id
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-white border-border text-muted-foreground"
                      )}
                    >
                      {c.nome}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Converter em parcelado/recorrente (só despesa simples) */}
          {!isReceita && wasSimples && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Converter em</label>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsParcelado((v) => !v);
                    if (!isParcelado) setRecorrente(false);
                  }}
                  className={cn(
                    "flex-1 flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium border transition-all",
                    isParcelado
                      ? "border-primary/40 bg-primary/5 text-primary"
                      : "border-[#E8ECF5] bg-[#E8ECF5] text-muted-foreground"
                  )}
                >
                  📆 Parcelado
                  {isParcelado && (
                    <Input
                      value={parcelas}
                      onChange={(e) => setParcelas(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-10 text-center bg-white rounded-lg border border-border text-xs font-bold text-foreground"
                      inputMode="numeric"
                    />
                  )}
                </button>
                <button
                  onClick={() => {
                    setRecorrente((v) => !v);
                    if (!recorrente) setIsParcelado(false);
                  }}
                  className={cn(
                    "flex-1 flex items-center justify-center px-3 py-2.5 rounded-xl text-sm font-medium border transition-all",
                    recorrente
                      ? "border-primary/40 bg-primary/5 text-primary"
                      : "border-[#E8ECF5] bg-[#E8ECF5] text-muted-foreground"
                  )}
                >
                  🔁 Recorrente
                </button>
              </div>

              {recorrente && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Repetir no dia</span>
                  <Input
                    value={diaRecorrencia}
                    onChange={(e) => setDiaRecorrencia(e.target.value)}
                    className="bg-[#E8ECF5] border-0 w-16 text-center rounded-xl"
                    inputMode="numeric"
                  />
                  <span>de cada mês</span>
                </div>
              )}
            </div>
          )}

          {/* Escopo de edição (parcelado ou recorrente existente) */}
          {!isReceita && (wasParcelado || wasRecorrente) && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Aplicar alteração em</label>
              <div className="space-y-1.5">
                {[
                  { key: "este", label: "Só este lançamento" },
                  {
                    key: "futuras",
                    label: wasParcelado
                      ? "Este e próximas parcelas"
                      : "Este e próximas recorrências",
                  },
                  {
                    key: "todos",
                    label: wasParcelado
                      ? "Todas as parcelas"
                      : "Todas as recorrências",
                  },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setEditScope(opt.key as EditScope)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all text-left w-full",
                      editScope === opt.key
                        ? "border-primary/40 bg-primary/5 text-primary"
                        : "border-[#E8ECF5] bg-[#E8ECF5] text-muted-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                        editScope === opt.key ? "border-primary" : "border-muted-foreground/40"
                      )}
                    >
                      {editScope === opt.key && (
                        <span className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 bg-secondary border-border/50 text-muted-foreground"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 gradient-emerald text-primary-foreground font-semibold"
            >
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default EditLancamentoModal;
