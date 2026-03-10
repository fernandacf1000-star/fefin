import { useState } from "react";
import { X, CalendarIcon, ChevronLeft } from "lucide-react";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAddLancamento, useAddMultipleLancamentos } from "@/hooimport { useState } from "react";
import { X, CalendarIcon, ChevronLeft } from "lucide-react";
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

const tipoOptions = [
  { id: "despesa" as TipoLanc, emoji: "💸", label: "Despesa" },
  { id: "receita" as TipoLanc, emoji: "💰", label: "Receita" },
  { id: "pais" as TipoLanc, emoji: "👨‍👩‍👧", label: "Pais" },
];

const oQueAconteceuOptions = [
  { id: "paguei_por_eles", emoji: "💸", label: "Paguei por eles", desc: "você pagou do seu bolso" },
  { id: "paguei_recebo_depois", emoji: "↩️", label: "Paguei e vou receber de volta", desc: "você pagou mas eles vão te reembolsar" },
  { id: "eles_pagaram", emoji: "📋", label: "Eles pagaram — só registrando", desc: "eles mesmos pagaram" },
  { id: "usaram_meu_cartao", emoji: "💳", label: "Usaram meu cartão", desc: "eles usaram seu cartão" },
] as const;

const incomeCategories = ["Salário", "Reembolso pais", "Renda extra", "Outros"] as const;
const incomeCatMap: Record<string, string> = {
  "Salário": "salario",
  "Reembolso pais": "reembolso_pais",
  "Renda extra": "renda_extra",
  "Outros": "outros",
};

interface NewExpenseSheetProps {
  open: boolean;
  onClose: () => void;
  initialTipo?: TipoLanc;
}

const NewExpenseSheet = ({ open, onClose, initialTipo }: NewExpenseSheetProps) => {
  const [step, setStep] = useState(2);
  const [tipoLanc, setTipoLanc] = useState<TipoLanc>(initialTipo || "despesa");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [categoriaMacro, setCategoriaMacro] = useState("");
  const [subcategoria, setSubcategoria] = useState("");
  const [data, setData] = useState<Date>(new Date());
  const [oQueAconteceu, setOQueAconteceu] = useState("paguei_por_eles");
  const [incomeCat, setIncomeCat] = useState<string>("Salário");
  const [formaPagamento, setFormaPagamento] = useState<string>("dinheiro");
  const [cartaoId, setCartaoId] = useState<string>("");

  // Parcelamento as attribute
  const [isParcelado, setIsParcelado] = useState(false);
  const [numParcelas, setNumParcelas] = useState("");
  const [valorTotal, setValorTotal] = useState("");

  // Recorrência
  const [recorrente, setRecorrente] = useState(false);
  const [diaRecorrencia, setDiaRecorrencia] = useState("1");
  const [recorrenciaAte, setRecorrenciaAte] = useState<Date | undefined>();

  const addLancamento = useAddLancamento();
  const addMultiple = useAddMultipleLancamentos();
  const { data: cartoes = [] } = useCartoes();

  const isPais = tipoLanc === "pais";
  const isReceita = tipoLanc === "receita";
  const needsCategory = tipoLanc === "despesa" || tipoLanc === "pais";

  const selectedGroup = SUBCATEGORIA_GROUPS.find(g => g.group === categoriaMacro);

  const handleDescricaoChange = (val: string) => {
    setDescricao(val);
    if (!subcategoria) {
      const detected = detectSubcategoria(val);
      if (detected) {
        setSubcategoria(detected);
        const macro = detectCategoriaMacro(detected);
        if (macro) setCategoriaMacro(macro);
      }
    }
  };

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

  const resetAndClose = () => {
    onClose();
    setStep(2); setDescricao(""); setValor(""); setCategoriaMacro("");
    setSubcategoria(""); setData(new Date());
    setTipoLanc(initialTipo || "despesa"); setIncomeCat("Salário");
    setOQueAconteceu("paguei_por_eles"); setFormaPagamento("pix"); setCartaoId("");
    setIsParcelado(false); setNumParcelas(""); setValorTotal("");
    setRecorrente(false); setDiaRecorrencia("1"); setRecorrenciaAte(undefined);
  };

  const parseValor = (v: string) => parseFloat(v.replace(/\./g, "").replace(",", "."));

  const handleSave = async () => {
    if (!descricao || !valor) {
      toast.error("Preencha descrição e valor");
      return;
    }
    if (needsCategory && !subcategoria) {
      toast.error("Selecione uma subcategoria");
      return;
    }

    const numValor = parseValor(valor);
    if (isNaN(numValor) || numValor <= 0) {
      toast.error("Valor inválido");
      return;
    }

    // Parcelamento logic
    if (isParcelado && !isReceita) {
      const nParcelas = parseInt(numParcelas);
      const vTotal = valorTotal ? parseValor(valorTotal) : numValor * nParcelas;
      if (!nParcelas || nParcelas < 2) {
        toast.error("Número de parcelas deve ser pelo menos 2");
        return;
      }
      const valorParcela = vTotal / nParcelas;
      const parcelamentoId = crypto.randomUUID();

      const lancamentos = Array.from({ length: nParcelas }, (_, i) => {
        const parcelaDate = new Date(data);
        parcelaDate.setMonth(parcelaDate.getMonth() + i);
        const mesRef = `${parcelaDate.getFullYear()}-${String(parcelaDate.getMonth() + 1).padStart(2, "0")}`;
        return {
          descricao,
          valor: valorParcela,
          tipo: "despesa" as const,
          categoria: isPais ? "pais" : "extra",
          categoria_macro: categoriaMacro || null,
          subcategoria: subcategoria || null,
          subcategoria_pais: isPais ? oQueAconteceu : null,
          data: format(parcelaDate, "yyyy-MM-dd"),
          mes_referencia: mesRef,
          parcela_atual: i + 1,
          parcela_total: nParcelas,
          is_parcelado: true,
          parcelamento_id: parcelamentoId,
          pago: false,
          forma_pagamento: isReceita ? null : formaPagamento,
          cartao_id: formaPagamento === "cartao" && cartaoId ? cartaoId : null,
          recorrente: false,
          dia_recorrencia: null,
          recorrencia_ate: null,
          recorrencia_pai_id: null,
        };
      });

      try {
        await addMultiple.mutateAsync(lancamentos);
        toast.success(`${nParcelas} parcelas criadas!`, { duration: 1500 });
        resetAndClose();
      } catch (e: any) {
        toast.error(e.message || "Erro ao salvar parcelas");
      }
      return;
    }

    const mesRef = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;

    const catMap: Record<TipoLanc, string> = {
      despesa: "extra",
      receita: incomeCatMap[incomeCat] || "outros",
      pais: "pais",
    };

    // Recorrência para despesas
    if (recorrente && !isReceita && !isPais) {
      const dia = parseInt(diaRecorrencia, 10) || 1;
      const recorrenciaPaiId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
      const maxMonths = 24;
      const lancamentos: any[] = [];
      for (let i = 0; i < maxMonths; i++) {
        const monthDate = addMonths(data, i);
        if (recorrenciaAte && monthDate > recorrenciaAte) break;
        const mRef = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
        const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
        const actualDay = Math.min(dia, daysInMonth);
        const dateStr = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}-${String(actualDay).padStart(2, "0")}`;
        lancamentos.push({
          descricao,
          valor: numValor,
          tipo: "despesa",
          categoria: catMap[tipoLanc],
          categoria_macro: categoriaMacro || null,
          subcategoria: subcategoria || null,
          subcategoria_pais: null,
          data: dateStr,
          mes_referencia: mRef,
          parcela_atual: null,
          parcela_total: null,
          is_parcelado: false,
          parcelamento_id: null,
          pago: false,
          forma_pagamento: formaPagamento,
          cartao_id: formaPagamento === "cartao" && cartaoId ? cartaoId : null,
          recorrente: true,
          dia_recorrencia: dia,
          recorrencia_ate: recorrenciaAte ? format(recorrenciaAte, "yyyy-MM-dd") : null,
          recorrencia_pai_id: recorrenciaPaiId,
        });
      }
      try {
        await addMultiple.mutateAsync(lancamentos);
        toast.success(`Despesa recorrente criada! (${lancamentos.length} meses)`, { duration: 1500 });
        resetAndClose();
      } catch (e: any) {
        toast.error(e.message || "Erro ao salvar");
      }
      return;
    }

    try {
      await addLancamento.mutateAsync({
        descricao,
        valor: numValor,
        tipo: isReceita ? "receita" : "despesa",
        categoria: catMap[tipoLanc],
        categoria_macro: needsCategory ? categoriaMacro : null,
        subcategoria: needsCategory ? subcategoria : null,
        subcategoria_pais: isPais ? oQueAconteceu : null,
        data: format(data, "yyyy-MM-dd"),
        mes_referencia: mesRef,
        parcela_atual: null,
        parcela_total: null,
        is_parcelado: false,
        parcelamento_id: null,
        pago: false,
        forma_pagamento: isReceita ? null : formaPagamento,
        cartao_id: formaPagamento === "cartao" && cartaoId ? cartaoId : null,
        recorrente: false,
        dia_recorrencia: null,
        recorrencia_ate: null,
        recorrencia_pai_id: null,
      });
      toast.success(isReceita ? "Receita salva!" : "Despesa salva!", { duration: 1500 });
      resetAndClose();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    }
  };

  const getMaxStep = () => {
    if (isReceita) return 2;
    if (isPais) return 4; // tipo, o que aconteceu, categoria, details
    return 3; // tipo, categoria+sub, details
  };

  const handleNext = () => {
    if (step < getMaxStep()) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const parcelaParsed = parseInt(numParcelas);
  const valorTotalParsed = valorTotal ? parseValor(valorTotal) : 0;
  const valorParcelaPreview = parcelaParsed > 0 && valorTotalParsed > 0
    ? (valorTotalParsed / parcelaParsed).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : null;

  const renderStep = () => {
    // Step 1: Tipo selection
    if (step === 1) {
      return (
        <div className="space-y-4">
          <p className="text-xs font-medium text-muted-foreground">O que você quer registrar?</p>
          <div className="grid grid-cols-3 gap-3">
            {tipoOptions.map(opt => (
              <button
                key={opt.id}
                onClick={() => { setTipoLanc(opt.id); setStep(2); }}
                className={cn(
                  "flex flex-col items-center text-center p-5 rounded-2xl transition-all",
                  "bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                )}
              >
                <span className="text-2xl mb-2">{opt.emoji}</span>
                <span className="text-sm font-semibold">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      );
    }

    // Pais step 2: O que aconteceu?
    if (isPais && step === 2) {
      return (
        <div className="space-y-4">
          <p className="text-xs font-medium text-muted-foreground">O que aconteceu?</p>
          <div className="grid grid-cols-2 gap-2">
            {oQueAconteceuOptions.map(opt => (
              <button
                key={opt.id}
                onClick={() => { setOQueAconteceu(opt.id); setStep(3); }}
                className={cn(
                  "flex flex-col items-center text-center p-4 rounded-[14px] transition-all",
                  oQueAconteceu === opt.id
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-secondary/40 text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="text-2xl mb-2">{opt.emoji}</span>
                <span className="text-[13px] font-medium leading-tight">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      );
    }

    // Category + subcategory step (step 2 for despesa, step 3 for pais)
    if (needsCategory && ((tipoLanc === "despesa" && step === 2) || (isPais && step === 3))) {
      return (
        <div className="space-y-4">
          <p className="text-xs font-medium text-muted-foreground">Categoria</p>
          <div className="grid grid-cols-2 gap-2">
            {SUBCATEGORIA_GROUPS.map(g => {
              const selected = categoriaMacro === g.group;
              return (
                <button
                  key={g.group}
                  onClick={() => { setCategoriaMacro(g.group); setSubcategoria(""); }}
                  className={cn(
                    "flex items-center gap-2.5 p-3.5 rounded-xl text-left transition-all",
                    selected
                      ? "bg-primary/15 ring-2 ring-primary"
                      : "bg-secondary/40 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="text-lg">{g.emoji}</span>
                  <span className={cn("text-xs font-medium", selected && "text-foreground font-semibold")}>{g.group}</span>
                </button>
              );
            })}
          </div>

          {selectedGroup && (
            <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <p className="text-xs font-medium text-muted-foreground">Subcategoria</p>
              <div className="flex flex-wrap gap-2">
                {selectedGroup.items.map(item => (
                  <button
                    key={item}
                    onClick={() => {
                      setSubcategoria(item);
                      handleNext();
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                      subcategoria === item
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-secondary/60 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    // Details step (final step for all types)
    return (
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Descrição</label>
          <Input placeholder="Ex: Conta de Luz" value={descricao} onChange={(e) => handleDescricaoChange(e.target.value)} className="bg-secondary border-border/50" />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Valor</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
            <Input placeholder="0,00" value={valor} onChange={(e) => handleValorChange(e.target.value)} className="bg-secondary border-border/50 pl-9" inputMode="numeric" />
          </div>
        </div>

        {isReceita && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Categoria</label>
            <div className="flex gap-2 flex-wrap">
              {incomeCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setIncomeCat(cat)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                    incomeCat === cat
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-secondary/60 text-muted-foreground hover:text-foreground"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

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

        {/* Forma de pagamento - only for expenses */}
        {!isReceita && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Pago com</label>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => { setFormaPagamento("dinheiro"); setCartaoId(""); }}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                  formaPagamento === "dinheiro" ? "bg-primary text-primary-foreground shadow-sm" : "bg-secondary/60 text-muted-foreground"
                )}
              >💵 Dinheiro</button>
              {cartoes.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setFormaPagamento("cartao"); setCartaoId(c.id); }}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                    formaPagamento === "cartao" && cartaoId === c.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-secondary/60 text-muted-foreground"
                  )}
                >💳 {c.nome}</button>
              ))}
              {cartoes.length === 0 && (
                <p className="text-[12px] text-[#475569] w-full mt-1">
                  Adicione um cartão em Minha Conta para selecionar aqui
                </p>
              )}
            </div>
          </div>
        )}

        {/* Compra parcelada toggle - only for expenses */}
        {!isReceita && !recorrente && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Compra parcelada?</label>
              <Switch checked={isParcelado} onCheckedChange={(v) => { setIsParcelado(v); if (v) setRecorrente(false); }} />
            </div>
            {isParcelado && (
              <div className="space-y-3 p-3 rounded-xl bg-secondary/30 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-muted-foreground">Valor total da compra</label>
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
                  <p className="text-xs text-primary font-medium">
                    {valorParcelaPreview} por mês durante {parcelaParsed} meses
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Despesa recorrente toggle - only for expenses, not parcelado, not pais */}
        {!isReceita && !isPais && !isParcelado && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">🔄 Despesa recorrente?</label>
              <Switch checked={recorrente} onCheckedChange={(v) => { setRecorrente(v); if (v) setIsParcelado(false); }} />
            </div>
            {recorrente && (
              <div className="space-y-3 p-3 rounded-xl bg-secondary/30 animate-in fade-in slide-in-from-bottom-2 duration-200">
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
                <p className="text-[10px] text-muted-foreground">Será lançada todo mês neste dia. Sem data de fim: gera 24 meses.</p>
              </div>
            )}
          </div>
        )}

        {/* Summary chips */}
        {needsCategory && subcategoria && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium">
              {SUBCATEGORIA_GROUPS.find(g => g.group === categoriaMacro)?.emoji} {categoriaMacro}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/60 text-foreground font-medium">
              {subcategoria}
            </span>
          </div>
        )}

        <Button onClick={handleSave} disabled={addLancamento.isPending || addMultiple.isPending} className="w-full h-12 bg-primary text-primary-foreground font-semibold text-sm rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow">
          {addLancamento.isPending || addMultiple.isPending ? "Salvando..." : "Salvar Lançamento"}
        </Button>
      </div>
    );
  };

  return (
    <>
      <div className={cn("fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm transition-opacity duration-300", open ? "opacity-100" : "opacity-0 pointer-events-none")} onClick={resetAndClose} />
      <div className={cn("fixed inset-x-0 bottom-0 z-[70] rounded-t-3xl bg-card border-t border-border/50 transition-transform duration-300 ease-out max-h-[90vh] overflow-y-auto", open ? "translate-y-0" : "translate-y-full")}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>
        <div className="px-5 pb-8 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {step > 1 && (
                <button onClick={handleBack} className="p-1 rounded-full hover:bg-muted transition-colors">
                  <ChevronLeft size={18} className="text-muted-foreground" />
                </button>
              )}
              <h2 className="text-lg font-semibold text-foreground">Novo Lançamento</h2>
            </div>
            <button onClick={resetAndClose} className="p-1 rounded-full hover:bg-muted transition-colors">
              <X size={20} className="text-muted-foreground" />
            </button>
          </div>

          {/* Step indicator */}
          {step > 1 && (
            <div className="flex gap-1">
              {Array.from({ length: getMaxStep() }, (_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1 rounded-full flex-1 transition-all",
                    i < step ? "bg-primary" : "bg-secondary/60"
                  )}
                />
              ))}
            </div>
          )}

          {renderStep()}
        </div>
      </div>
    </>
  );
};

export default NewExpenseSheet;
