import { useState } from "react";
import { X, CalendarIcon } from "lucide-react";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAddLancamento, useAddMultipleLancamentos } from "@/hooks/useLancamentos";
import { useCartoes } from "@/hooks/useCartoes";
import { toast } from "sonner";
import { SUBCATEGORIA_GROUPS, detectSubcategoria, detectCategoriaMacro } from "@/lib/subcategorias";
import { Switch } from "@/components/ui/switch";

type TipoLanc = "despesa" | "receita" | "pais";

const oQueAconteceuOptions = [
  { id: "paguei_por_eles", emoji: "💸", label: "Paguei por eles" },
  { id: "paguei_recebo_depois", emoji: "↩️", label: "Vou receber de volta" },
  { id: "eles_pagaram", emoji: "📋", label: "Eles pagaram" },
  { id: "usaram_meu_cartao", emoji: "💳", label: "Usaram meu cartão" },
] as const;

const incomeCategories = ["Salário", "Reembolso pais", "Renda extra", "Outros"] as const;
const incomeCatMap: Record<string, string> = {
  "Salário": "salario",
  "Reembolso pais": "reembolso_pais",
  "Renda extra": "renda_extra",
  "Outros": "outros",
};

interface Props {
  open: boolean;
  onClose: () => void;
  initialTipo?: TipoLanc;
}

const NewExpenseSheet = ({ open, onClose }: Props) => {
  // TELA 1: tipo + descrição + valor + data
  // TELA 2: categoria + subcategoria + forma pagamento + opções
  const [step, setStep] = useState(1);
  const [tipoLanc, setTipoLanc] = useState<TipoLanc>("despesa");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState<Date>(new Date());
  const [categoriaMacro, setCategoriaMacro] = useState("");
  const [subcategoria, setSubcategoria] = useState("");
  const [oQueAconteceu, setOQueAconteceu] = useState("paguei_por_eles");
  const [incomeCat, setIncomeCat] = useState("Salário");
  const [formaPagamento, setFormaPagamento] = useState("dinheiro");
  const [cartaoId, setCartaoId] = useState("");
  const [isParcelado, setIsParcelado] = useState(false);
  const [numParcelas, setNumParcelas] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [recorrente, setRecorrente] = useState(false);
  const [diaRecorrencia, setDiaRecorrencia] = useState("1");
  const [recorrenciaAte, setRecorrenciaAte] = useState<Date | undefined>();

  const addLancamento = useAddLancamento();
  const addMultiple = useAddMultipleLancamentos();
  const { data: cartoes = [] } = useCartoes();

  const isPais = tipoLanc === "pais";
  const isReceita = tipoLanc === "receita";

  const reset = () => {
    setStep(1); setTipoLanc("despesa"); setDescricao(""); setValor("");
    setData(new Date()); setCategoriaMacro(""); setSubcategoria("");
    setOQueAconteceu("paguei_por_eles"); setIncomeCat("Salário");
    setFormaPagamento("dinheiro"); setCartaoId("");
    setIsParcelado(false); setNumParcelas(""); setValorTotal("");
    setRecorrente(false); setDiaRecorrencia("1"); setRecorrenciaAte(undefined);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleDescricaoChange = (val: string) => {
    setDescricao(val);
    if (!subcategoria) {
      const det = detectSubcategoria(val);
      if (det) { setSubcategoria(det); const m = detectCategoriaMacro(det); if (m) setCategoriaMacro(m); }
    }
  };

  const parseValor = (v: string) => parseFloat(v.replace(/\./g, "").replace(",", "."));

  const handleValorChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) { setValor(""); return; }
    const num = parseInt(digits, 10) / 100;
    setValor(num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  const handleValorTotalChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) { setValorTotal(""); return; }
    const num = parseInt(digits, 10) / 100;
    setValorTotal(num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  const handleNext = () => {
    if (!descricao || !valor) { toast.error("Preencha descrição e valor"); return; }
    if (isReceita) { handleSave(); return; }
    setStep(2);
  };

  const handleSave = async () => {
    if (!descricao || !valor) { toast.error("Preencha descrição e valor"); return; }
    const numValor = parseValor(valor);
    if (isNaN(numValor) || numValor <= 0) { toast.error("Valor inválido"); return; }

    const mesRef = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
    const catMap: Record<TipoLanc, string> = {
      despesa: "extra", receita: incomeCatMap[incomeCat] || "outros", pais: "pais",
    };

    // Parcelamento
    if (isParcelado && !isReceita) {
      const nParcelas = parseInt(numParcelas);
      if (!nParcelas || nParcelas < 2) { toast.error("Mínimo 2 parcelas"); return; }
      const vTotal = valorTotal ? parseValor(valorTotal) : numValor * nParcelas;
      const valorParcela = vTotal / nParcelas;
      const parcelamentoId = crypto.randomUUID();
      const lancamentos = Array.from({ length: nParcelas }, (_, i) => {
        const d = new Date(data); d.setMonth(d.getMonth() + i);
        const mRef = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        return {
          descricao, valor: valorParcela, tipo: "despesa" as const,
          categoria: isPais ? "pais" : "extra",
          categoria_macro: categoriaMacro || null, subcategoria: subcategoria || null,
          subcategoria_pais: isPais ? oQueAconteceu : null,
          data: format(d, "yyyy-MM-dd"), mes_referencia: mRef,
          parcela_atual: i + 1, parcela_total: nParcelas,
          is_parcelado: true, parcelamento_id: parcelamentoId, pago: false,
          forma_pagamento: formaPagamento,
          cartao_id: formaPagamento === "cartao" && cartaoId ? cartaoId : null,
          recorrente: false, dia_recorrencia: null, recorrencia_ate: null, recorrencia_pai_id: null,
        };
      });
      try {
        await addMultiple.mutateAsync(lancamentos);
        toast.success(`${nParcelas} parcelas criadas!`, { duration: 1500 });
        handleClose();
      } catch (e: any) { toast.error(e.message || "Erro ao salvar"); }
      return;
    }

    // Recorrência
    if (recorrente && !isReceita && !isPais) {
      const dia = parseInt(diaRecorrencia, 10) || 1;
      const paiId = crypto.randomUUID();
      const lancamentos: any[] = [];
      for (let i = 0; i < 24; i++) {
        const md = addMonths(data, i);
        if (recorrenciaAte && md > recorrenciaAte) break;
        const mRef = `${md.getFullYear()}-${String(md.getMonth() + 1).padStart(2, "0")}`;
        const days = new Date(md.getFullYear(), md.getMonth() + 1, 0).getDate();
        const dateStr = `${md.getFullYear()}-${String(md.getMonth() + 1).padStart(2, "0")}-${String(Math.min(dia, days)).padStart(2, "0")}`;
        lancamentos.push({
          descricao, valor: numValor, tipo: "despesa",
          categoria: catMap[tipoLanc], categoria_macro: categoriaMacro || null,
          subcategoria: subcategoria || null, subcategoria_pais: null,
          data: dateStr, mes_referencia: mRef,
          parcela_atual: null, parcela_total: null, is_parcelado: false, parcelamento_id: null,
          pago: false, forma_pagamento: formaPagamento,
          cartao_id: formaPagamento === "cartao" && cartaoId ? cartaoId : null,
          recorrente: true, dia_recorrencia: dia,
          recorrencia_ate: recorrenciaAte ? format(recorrenciaAte, "yyyy-MM-dd") : null,
          recorrencia_pai_id: paiId,
        });
      }
      try {
        await addMultiple.mutateAsync(lancamentos);
        toast.success(`Recorrência criada! (${lancamentos.length} meses)`, { duration: 1500 });
        handleClose();
      } catch (e: any) { toast.error(e.message || "Erro ao salvar"); }
      return;
    }

    try {
      await addLancamento.mutateAsync({
        descricao, valor: numValor,
        tipo: isReceita ? "receita" : "despesa",
        categoria: catMap[tipoLanc],
        categoria_macro: !isReceita ? categoriaMacro || null : null,
        subcategoria: !isReceita ? subcategoria || null : null,
        subcategoria_pais: isPais ? oQueAconteceu : null,
        data: format(data, "yyyy-MM-dd"), mes_referencia: mesRef,
        parcela_atual: null, parcela_total: null,
        is_parcelado: false, parcelamento_id: null, pago: false,
        forma_pagamento: isReceita ? null : formaPagamento,
        cartao_id: formaPagamento === "cartao" && cartaoId ? cartaoId : null,
        recorrente: false, dia_recorrencia: null, recorrencia_ate: null, recorrencia_pai_id: null,
      });
      toast.success(isReceita ? "Receita salva!" : "Despesa salva!", { duration: 1500 });
      handleClose();
    } catch (e: any) { toast.error(e.message || "Erro ao salvar"); }
  };

  const parcelaParsed = parseInt(numParcelas);
  const valorTotalParsed = valorTotal ? parseValor(valorTotal) : 0;
  const valorParcelaPreview = parcelaParsed > 0 && valorTotalParsed > 0
    ? (valorTotalParsed / parcelaParsed).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : null;

  const selectedGroup = SUBCATEGORIA_GROUPS.find(g => g.group === categoriaMacro);

  return (
    <>
      <div
        className={cn("fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm transition-opacity duration-300", open ? "opacity-100" : "opacity-0 pointer-events-none")}
        onClick={handleClose}
      />
      <div className={cn("fixed inset-x-0 bottom-0 z-[70] rounded-t-3xl bg-card border-t border-border/50 transition-transform duration-300 ease-out max-h-[92vh] overflow-y-auto", open ? "translate-y-0" : "translate-y-full")}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="px-5 pb-10 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Novo Lançamento</h2>
            <button onClick={handleClose} className="p-1 rounded-full hover:bg-muted transition-colors">
              <X size={20} className="text-muted-foreground" />
            </button>
          </div>

          {/* TELA 1: Tipo + campos principais */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Toggle tipo */}
              <div className="flex gap-2">
                {([
                  { id: "despesa" as TipoLanc, emoji: "💸", label: "Despesa" },
                  { id: "receita" as TipoLanc, emoji: "💰", label: "Receita" },
                  { id: "pais" as TipoLanc, emoji: "👨‍👩‍👧", label: "Pais" },
                ]).map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { setTipoLanc(opt.id); setCategoriaMacro(""); setSubcategoria(""); }}
                    className={cn(
                      "flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all",
                      tipoLanc === opt.id ? "gradient-emerald text-primary-foreground shadow-md" : "bg-secondary/60 text-muted-foreground"
                    )}
                  >
                    {opt.emoji} {opt.label}
                  </button>
                ))}
              </div>

              {/* Descrição */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Descrição</label>
                <Input placeholder="Ex: Conta de Luz" value={descricao} onChange={(e) => handleDescricaoChange(e.target.value)} className="bg-secondary border-border/50" />
              </div>

              {/* Valor */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Valor</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                  <Input placeholder="0,00" value={valor} onChange={(e) => handleValorChange(e.target.value)} className="bg-secondary border-border/50 pl-9" inputMode="numeric" />
                </div>
              </div>

              {/* Data */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Data</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start bg-secondary border-border/50 text-foreground">
                      <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                      {format(data, "dd 'de' MMMM, yyyy", { locale: ptBR })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[80]" align="start">
                    <Calendar mode="single" selected={data} onSelect={(d) => d && setData(d)} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Categoria receita */}
              {isReceita && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Categoria</label>
                  <div className="flex gap-2 flex-wrap">
                    {incomeCategories.map(cat => (
                      <button key={cat} onClick={() => setIncomeCat(cat)}
                        className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                          incomeCat === cat ? "bg-primary text-primary-foreground" : "bg-secondary/60 text-muted-foreground"
                        )}>{cat}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* Botão próximo / salvar */}
              <Button
                onClick={handleNext}
                disabled={addLancamento.isPending || addMultiple.isPending}
                className="w-full h-12 gradient-emerald text-primary-foreground font-semibold text-sm rounded-xl"
              >
                {isReceita ? (addLancamento.isPending ? "Salvando..." : "Salvar") : "Próximo →"}
              </Button>
            </div>
          )}

          {/* TELA 2: Categoria + opções (despesa e pais) */}
          {step === 2 && (
            <div className="space-y-4">

              {/* O que aconteceu — só para pais */}
              {isPais && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">O que aconteceu?</label>
                  <div className="grid grid-cols-2 gap-2">
                    {oQueAconteceuOptions.map(opt => (
                      <button key={opt.id} onClick={() => setOQueAconteceu(opt.id)}
                        className={cn("flex flex-col items-center text-center p-3 rounded-xl transition-all",
                          oQueAconteceu === opt.id ? "bg-primary/15 ring-2 ring-primary text-foreground" : "bg-secondary/40 text-muted-foreground"
                        )}>
                        <span className="text-xl mb-1">{opt.emoji}</span>
                        <span className="text-[11px] font-medium leading-tight">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Categoria */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Categoria</label>
                <div className="grid grid-cols-2 gap-2">
                  {SUBCATEGORIA_GROUPS.map(g => {
                    const selected = categoriaMacro === g.group;
                    return (
                      <button key={g.group} onClick={() => { setCategoriaMacro(g.group); setSubcategoria(""); }}
                        className={cn("flex items-center gap-2 p-2.5 rounded-xl text-left transition-all",
                          selected ? "bg-primary/15 ring-2 ring-primary" : "bg-secondary/40 text-muted-foreground"
                        )}>
                        <span className="text-base">{g.emoji}</span>
                        <span className={cn("text-xs font-medium", selected && "text-foreground font-semibold")}>{g.group}</span>
                      </button>
                    );
                  })}
                </div>
                {selectedGroup && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedGroup.items.map(item => (
                      <button key={item} onClick={() => setSubcategoria(item)}
                        className={cn("px-2.5 py-1 rounded-full text-xs font-medium transition-all",
                          subcategoria === item ? "bg-primary text-primary-foreground" : "bg-secondary/60 text-muted-foreground"
                        )}>{item}</button>
                    ))}
                  </div>
                )}
              </div>

              {/* Forma de pagamento */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Pago com</label>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => { setFormaPagamento("dinheiro"); setCartaoId(""); }}
                    className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                      formaPagamento === "dinheiro" ? "bg-primary text-primary-foreground" : "bg-secondary/60 text-muted-foreground"
                    )}>💵 Dinheiro</button>
                  {cartoes.map(c => (
                    <button key={c.id} onClick={() => { setFormaPagamento("cartao"); setCartaoId(c.id); }}
                      className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                        formaPagamento === "cartao" && cartaoId === c.id ? "bg-primary text-primary-foreground" : "bg-secondary/60 text-muted-foreground"
                      )}>💳 {c.nome}</button>
                  ))}
                </div>
              </div>

              {/* Parcelado */}
              {!recorrente && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground">Compra parcelada?</label>
                    <Switch checked={isParcelado} onCheckedChange={(v) => { setIsParcelado(v); if (v) setRecorrente(false); }} />
                  </div>
                  {isParcelado && (
                    <div className="space-y-3 p-3 rounded-xl bg-secondary/30">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-muted-foreground">Valor total</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                          <Input placeholder="0,00" value={valorTotal} onChange={(e) => handleValorTotalChange(e.target.value)} className="bg-secondary border-border/50 pl-9" inputMode="numeric" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-muted-foreground">Número de parcelas</label>
                        <Input placeholder="12" value={numParcelas} onChange={(e) => setNumParcelas(e.target.value.replace(/\D/g, ""))} className="bg-secondary border-border/50" inputMode="numeric" />
                      </div>
                      {valorParcelaPreview && (
                        <p className="text-xs text-primary font-medium">{valorParcelaPreview} × {parcelaParsed} meses</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Recorrente */}
              {!isPais && !isParcelado && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground">🔄 Despesa recorrente?</label>
                    <Switch checked={recorrente} onCheckedChange={(v) => { setRecorrente(v); if (v) setIsParcelado(false); }} />
                  </div>
                  {recorrente && (
                    <div className="space-y-3 p-3 rounded-xl bg-secondary/30">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-muted-foreground">Dia do mês</label>
                        <Input type="number" min={1} max={31} value={diaRecorrencia} onChange={(e) => setDiaRecorrencia(e.target.value)} className="bg-secondary border-border/50 w-24" inputMode="numeric" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-muted-foreground">Repetir até (opcional)</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start bg-secondary border-border/50 text-foreground text-xs">
                              <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                              {recorrenciaAte ? format(recorrenciaAte, "dd/MM/yyyy") : "Sem data de fim"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 z-[80]" align="start">
                            <Calendar mode="single" selected={recorrenciaAte} onSelect={(d) => setRecorrenciaAte(d || undefined)} initialFocus className="p-3 pointer-events-auto" disabled={(d) => d < new Date()} />
                          </PopoverContent>
                        </Popover>
                        {recorrenciaAte && (
                          <button onClick={() => setRecorrenciaAte(undefined)} className="text-[10px] text-primary hover:underline">Limpar data limite</button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Botões */}
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl text-sm font-semibold bg-secondary/60 text-muted-foreground">
                  ← Voltar
                </button>
                <Button
                  onClick={handleSave}
                  disabled={addLancamento.isPending || addMultiple.isPending}
                  className="flex-1 h-12 gradient-emerald text-primary-foreground font-semibold text-sm rounded-xl"
                >
                  {addLancamento.isPending || addMultiple.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default NewExpenseSheet;
