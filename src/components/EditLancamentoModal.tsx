import { useEffect, useState } from "react";
import { X, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Lancamento } from "@/hooks/useLancamentos";
import type { Cartao } from "@/hooks/useCartoes";
import { SUBCATEGORIA_GROUPS, detectCategoriaMacro } from "@/lib/subcategorias";

interface Props {
  open: boolean;
  lancamento: Lancamento | null;
  onClose: () => void;
  onSave: (updates: Partial<Lancamento>) => Promise<void>;
  cartoes: Cartao[];
}

const EditLancamentoModal = ({ open, lancamento, onClose, onSave, cartoes }: Props) => {
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState<Date>(new Date());
  const [subcategoria, setSubcategoria] = useState<string | null>(null);
  const [formaPagamento, setFormaPagamento] = useState<"dinheiro" | "credito">("dinheiro");
  const [cartaoId, setCartaoId] = useState<string>("");
  const [saving, setSaving] = useState(false);

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
    if (!digits) { setValor(""); return; }
    const num = parseInt(digits, 10) / 100;
    setValor(num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  const handleSave = async () => {
    if (!lancamento) return;
    const numValor = parseFloat(valor.replace(/\./g, "").replace(",", ".")) || 0;
    if (numValor <= 0) return;

    setSaving(true);
    try {
      const macro = detectCategoriaMacro(subcategoria || "") || null;
      await onSave({
        descricao,
        valor: numValor,
        data: format(data, "yyyy-MM-dd"),
        subcategoria: subcategoria || null,
        categoria_macro: macro,
        forma_pagamento: formaPagamento === "dinheiro" ? "dinheiro" : "credito",
        cartao_id: formaPagamento === "credito" ? (cartaoId || null) : null,
      });
    } finally {
      setSaving(false);
    }
  };

  if (!open || !lancamento) return null;

  const isReceita = lancamento.tipo === "receita";

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
              className="bg-[#E8ECF5] border-border/50"
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
                className="bg-[#E8ECF5] border-border/50 pl-9 text-base font-bold"
                inputMode="numeric"
              />
            </div>
          </div>

          {/* Data */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Data</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start bg-[#E8ECF5] border-border/50 text-foreground text-sm">
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
              {SUBCATEGORIA_GROUPS.map((group) => (
                <div key={group.group} className="space-y-1">
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide px-0.5">
                    {group.emoji} {group.group}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.items.map((item) => (
                      <button
                        key={item}
                        onClick={() => setSubcategoria(subcategoria === item ? null : item)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-medium transition-colors",
                          subcategoria === item
                            ? "bg-primary text-primary-foreground"
                            : "bg-[#E8ECF5] text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
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
                      "flex-1 py-2 rounded-xl text-xs font-semibold transition-all",
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
                        "px-3 py-2 rounded-xl text-xs font-medium transition-colors border",
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
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default EditLancamentoModal;
