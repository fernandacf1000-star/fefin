import { useState, useRef } from "react";
import { X, CalendarIcon, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import {
  useAddLancamento,
  useAddMultipleLancamentos,
} from "@/hooks/useLancamentos";
import { useCartoes } from "@/hooks/useCartoes";
import {
  SUBCATEGORIA_GROUPS,
  detectSubcategoria,
  detectCategoriaMacro,
} from "@/lib/subcategorias";
import { toast } from "sonner";

interface NewExpenseSheetProps {
  open: boolean;
  onClose: () => void;
  initialTipo?: "despesa" | "receita";
}

type Tela = 1 | 2;
type TipoDespesa = "normal" | "pais";
type FormaPagamento = "dinheiro" | "cartao";

const incomeCategories = [
  "Salário",
  "Reembolso pais",
  "Renda extra",
  "Investimentos",
  "Resgate Investimento",
  "Outros",
] as const;
type IncomeCategory = (typeof incomeCategories)[number];

const incomeCatMap: Record<IncomeCategory, string> = {
  Salário: "salario",
  "Reembolso pais": "reembolso_pais",
  "Renda extra": "renda_extra",
  Investimentos: "investimentos",
  "Resgate Investimento": "resgate_investimento",
  Outros: "outros",
};

const NewExpenseSheet = ({
  open,
  onClose,
  initialTipo = "despesa",
}: NewExpenseSheetProps) => {
  const [tela, setTela] = useState<Tela>(1);
  const [tipo, setTipo] = useState<"despesa" | "receita">(initialTipo);
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState<Date>(new Date());

  const [tipoDespesa, setTipoDespesa] = useState<TipoDespesa>("normal");
  const [subcategoria, setSubcategoria] = useState<string | null>(null);
  const [categoriaMacro, setCategoriaMacro] = useState<string | null>(null);
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>("dinheiro");
  const [cartaoId, setCartaoId] = useState<string | null>(null);
  const [isParcelado, setIsParcelado] = useState(false);
  const [numParcelas, setNumParcelas] = useState("2");
  const [isRecorrente, setIsRecorrente] = useState(false);
  const [diaRecorrencia, setDiaRecorrencia] = useState("1");
  const [recorrenciaAte, setRecorrenciaAte] = useState<Date | undefined>(undefined);

  const [sugestaoSubcat, setSugestaoSubcat] = useState<string | null>(null);
  const [sugestaoMacro, setSugestaoMacro] = useState<string | null>(null);
  const sugestaoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [incomeCategoria, setIncomeCategoria] = useState<IncomeCategory>("Salário");
  const [isRecorrenteReceita, setIsRecorrenteReceita] = useState(false);
  const [diaRecorrenteReceita, setDiaRecorrenteReceita] = useState("1");
  const [recorrenciaAteReceita, setRecorrenciaAteReceita] = useState<Date | undefined>(undefined);

  const addLancamento = useAddLancamento();
  const addMultiple = useAddMultipleLancamentos();
  const { data: cartoes = [] } = useCartoes();

  const cartoesFiltrados = cartoes.filter((c) => {
    const bandeira = c.bandeira?.toLowerCase?.() ?? "";
    return bandeira === "visa" || bandeira === "mastercard" || bandeira === "master";
  });

  const isPending = addLancamento.isPending || addMultiple.isPending;
  const isDespesa = tipo === "despesa";

  const resetForm = () => {
    setTela(1);
    setTipo(initialTipo);
    setDescricao("");
    setValor("");
    setData(new Date());
    setTipoDespesa("normal");
    setSubcategoria(null);
    setCategoriaMacro(null);
    setSugestaoSubcat(null);
    setSugestaoMacro(null);
    setFormaPagamento("dinheiro");
    setCartaoId(null);
    setIsParcelado(false);
    setNumParcelas("2");
    setIsRecorrente(false);
    setDiaRecorrencia("1");
    setRecorrenciaAte(undefined);
    setIncomeCategoria("Salário");
    setIsRecorrenteReceita(false);
    setDiaRecorrenteReceita("1");
    setRecorrenciaAteReceita(undefined);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleValorChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) {
      setValor("");
      return;
    }
    const num = parseInt(digits, 10) / 100;
    setValor(num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  const handleDescricaoChange = (v: string) => {
    setDescricao(v);
    if (sugestaoTimer.current) clearTimeout(sugestaoTimer.current);
    if (tipo === "despesa" && v.trim().length > 3) {
      sugestaoTimer.current = setTimeout(() => {
        const detected = detectSubcategoria(v);
        if (detected && !subcategoria) {
          setSugestaoSubcat(detected);
          setSugestaoMacro(detectCategoriaMacro(detected));
        }
      }, 600);
    } else {
      setSugestaoSubcat(null);
      setSugestaoMacro(null);
    }
  };

  const aceitarSugestao = () => {
    if (sugestaoSubcat) {
      setSubcategoria(sugestaoSubcat);
      setCategoriaMacro(sugestaoMacro);
      setSugestaoSubcat(null);
      setSugestaoMacro(null);
    }
  };

  const recusarSugestao = () => {
    setSugestaoSubcat(null);
    setSugestaoMacro(null);
  };

  const handleNextTela = () => {
    if (!descricao.trim()) {
      toast.error("Preencha a descrição");
      return;
    }
    if (!valor) {
      toast.error("Preencha o valor");
      return;
    }
    setTela(2);
  };

  const buildPagamento = () => {
    if (formaPagamento === "cartao") {
      if (!cartaoId) {
        toast.error("Selecione Visa ou Master");
        return null;
      }
      return {
        forma_pagamento: "cartao",
        cartao_id: cartaoId,
      };
    }

    return {
      forma_pagamento: "dinheiro",
      cartao_id: null,
    };
  };

  const handleSave = async () => {
    const numValor = parseFloat(valor.replace(/\./g, "").replace(",", "."));
    if (isNaN(numValor) || numValor <= 0) {
      toast.error("Valor inválido");
      return;
    }

    const mesRef = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
    const dateStr = format(data, "yyyy-MM-dd");
    const pagamento = buildPagamento();
    if (!pagamento) return;

    try {
      if (tipo === "receita") {
        if (isRecorrenteReceita) {
          const recorrenciaPaiId = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
          const lancamentos: any[] = [];
          const maxMonths = recorrenciaAteReceita ? 120 : 24;
          const dia = parseInt(diaRecorrenteReceita, 10) || 1;
          for (let i = 0; i < maxMonths; i++) {
            const monthDate = addMonths(data, i);
            if (recorrenciaAteReceita && monthDate > recorrenciaAteReceita) break;
            const mRef = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
            const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
            const actualDay = Math.min(dia, daysInMonth);
            const dStr = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}-${String(actualDay).padStart(2, "0")}`;
            lancamentos.push({
              descricao,
              valor: numValor,
              tipo: "receita",
              categoria: incomeCatMap[incomeCategoria],
              subcategoria_pais: null,
              subcategoria: null,
              categoria_macro: null,
              data: dStr,
              mes_referencia: mRef,
              parcela_atual: null,
              parcela_total: null,
              is_parcelado: false,
              parcelamento_id: null,
              pago: false,
              forma_pagamento: null,
              cartao_id: null,
              recorrente: true,
              dia_recorrencia: dia,
              recorrencia_ate: recorrenciaAteReceita ? format(recorrenciaAteReceita, "yyyy-MM-dd") : null,
              recorrencia_pai_id: recorrenciaPaiId,
            });
          }
          await addMultiple.mutateAsync(lancamentos);
          toast.success(`Receita recorrente criada! (${lancamentos.length} meses)`);
        } else {
          await addLancamento.mutateAsync({
            descricao,
            valor: numValor,
            tipo: "receita",
            categoria: incomeCatMap[incomeCategoria],
            subcategoria_pais: null,
            subcategoria: null,
            categoria_macro: null,
            data: dateStr,
            mes_referencia: mesRef,
            parcela_atual: null,
            parcela_total: null,
            is_parcelado: false,
            parcelamento_id: null,
            pago: false,
            forma_pagamento: null,
            cartao_id: null,
            recorrente: false,
            dia_recorrencia: null,
            recorrencia_ate: null,
            recorrencia_pai_id: null,
          });
          toast.success("Receita salva!");
        }
      } else {
        const isPais = tipoDespesa === "pais";
        const categoria = isPais ? "pais" : "extra";
        const subcatPaisValue = isPais ? "paguei_por_eles" : null;
        const subcatValue = subcategoria;
        const catMacroValue = categoriaMacro;

        if (!isPais && isParcelado) {
          const parcelas = parseInt(numParcelas, 10) || 2;
          const parcelamentoId = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
          const lancamentos: any[] = [];
          for (let i = 0; i < parcelas; i++) {
            const monthDate = addMonths(data, i);
            const mRef = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
            lancamentos.push({
              descricao: `${descricao} (${i + 1}/${parcelas})`,
              valor: numValor,
              tipo: "despesa",
              categoria,
              subcategoria_pais: null,
              subcategoria: subcatValue,
              categoria_macro: catMacroValue,
              data: format(monthDate, "yyyy-MM-dd"),
              mes_referencia: mRef,
              parcela_atual: i + 1,
              parcela_total: parcelas,
              is_parcelado: true,
              parcelamento_id: parcelamentoId,
              pago: false,
              ...pagamento,
              recorrente: false,
              dia_recorrencia: null,
              recorrencia_ate: null,
              recorrencia_pai_id: null,
            });
          }
          await addMultiple.mutateAsync(lancamentos);
          toast.success(`Despesa parcelada em ${parcelas}x salva!`);
        } else if (!isPais && isRecorrente) {
          const recorrenciaPaiId = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
          const lancamentos: any[] = [];
          const maxMonths = recorrenciaAte ? 120 : 24;
          const dia = parseInt(diaRecorrencia, 10) || data.getDate();
          for (let i = 0; i < maxMonths; i++) {
            const monthDate = addMonths(data, i);
            if (recorrenciaAte && monthDate > recorrenciaAte) break;
            const mRef = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
            const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
            const actualDay = Math.min(dia, daysInMonth);
            const dStr = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}-${String(actualDay).padStart(2, "0")}`;
            lancamentos.push({
              descricao,
              valor: numValor,
              tipo: "despesa",
              categoria,
              subcategoria_pais: null,
              subcategoria: subcatValue,
              categoria_macro: catMacroValue,
              data: dStr,
              mes_referencia: mRef,
              parcela_atual: null,
              parcela_total: null,
              is_parcelado: false,
              parcelamento_id: null,
              pago: false,
              ...pagamento,
              recorrente: true,
              dia_recorrencia: dia,
              recorrencia_ate: recorrenciaAte ? format(recorrenciaAte, "yyyy-MM-dd") : null,
              recorrencia_pai_id: recorrenciaPaiId,
            });
          }
          await addMultiple.mutateAsync(lancamentos);
          toast.success(`Despesa recorrente criada! (${lancamentos.length} meses)`);
        } else {
          await addLancamento.mutateAsync({
            descricao,
            valor: numValor,
            tipo: "despesa",
            categoria,
            subcategoria_pais: subcatPaisValue,
            subcategoria: subcatValue,
            categoria_macro: catMacroValue,
            data: dateStr,
            mes_referencia: mesRef,
            parcela_atual: null,
            parcela_total: null,
            is_parcelado: false,
            parcelamento_id: null,
            pago: false,
            ...pagamento,
            recorrente: false,
            dia_recorrencia: null,
            recorrencia_ate: null,
            recorrencia_pai_id: null,
          });
          toast.success(isPais ? "Gasto dos pais salvo!" : "Despesa salva!");
        }
      }

      handleClose();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    }
  };

  const renderPagamentoButtons = (accent: "despesa" | "pais") => {
    const selectedClass = accent === "pais"
      ? "bg-amber-500 text-white shadow"
      : "bg-destructive text-destructive-foreground shadow";

    const baseButtons = [
      {
        key: "dinheiro",
        label: "💵 Dinheiro",
        isSelected: formaPagamento === "dinheiro",
        onClick: () => {
          setFormaPagamento("dinheiro");
          setCartaoId(null);
        },
      },
      ...cartoesFiltrados.map((c) => ({
        key: c.id,
        label: `💳 ${c.nome}`,
        isSelected: formaPagamento === "cartao" && cartaoId === c.id,
        onClick: () => {
          setFormaPagamento("cartao");
          setCartaoId(c.id);
        },
      })),
    ];

    return (
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Forma de pagamento</label>
        <div className="flex flex-wrap gap-2">
          {baseButtons.map((opt) => (
            <button
              key={opt.key}
              onClick={opt.onClick}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-medium transition-all",
                opt.isSelected ? selectedClass : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {cartoesFiltrados.length === 0 && (
          <p className="text-[11px] text-muted-foreground">Cadastre um cartão Visa ou Master para usar no lançamento.</p>
        )}
      </div>
    );
  };

  return (
    <>
      <div className={cn("fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm transition-opacity duration-300", open ? "opacity-100" : "opacity-0 pointer-events-none")} onClick={handleClose} />
      <div className={cn("fixed inset-x-0 bottom-0 z-[70] rounded-t-3xl bg-card border-t border-border/50 transition-transform duration-300 ease-out max-h-[90vh] overflow-y-auto", open ? "translate-y-0" : "translate-y-full")}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>
        <div className="px-5 pb-8 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {tela === 2 && (
                <button onClick={() => setTela(1)} className="p-1 rounded-full hover:bg-muted transition-colors">
                  <ChevronLeft size={20} className="text-muted-foreground" />
                </button>
              )}
              <h2 className="text-lg font-semibold text-foreground">
                {tela === 1 ? "Novo lançamento" : isDespesa ? (tipoDespesa === "pais" ? "Gasto dos pais" : "Categoria e pagamento") : "Detalhes da receita"}
              </h2>
            </div>
            <button onClick={handleClose} className="p-1 rounded-full hover:bg-muted transition-colors">
              <X size={20} className="text-muted-foreground" />
            </button>
          </div>

          {tela === 1 && (
            <>
              <div className="flex gap-2 p-1 rounded-xl bg-secondary/50">
                <button
                  onClick={() => setTipo("despesa")}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-sm font-semibold transition-all",
                    tipo === "despesa" ? "bg-destructive text-destructive-foreground shadow" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Despesa
                </button>
                <button
                  onClick={() => setTipo("receita")}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-sm font-semibold transition-all",
                    tipo === "receita" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Receita
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Descrição</label>
                <Input
                  placeholder="Ex: Supermercado, Salário..."
                  value={descricao}
                  onChange={(e) => handleDescricaoChange(e.target.value)}
                  className="bg-secondary border-border/50"
                />
                {sugestaoSubcat && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/60 border border-border/30">
                    <Sparkles size={14} className="text-primary shrink-0" />
                    <span className="text-xs text-muted-foreground">Sugestão: <strong className="text-foreground">{sugestaoSubcat}</strong></span>
                    <button onClick={aceitarSugestao} className="ml-auto text-[10px] font-semibold text-primary hover:underline">Usar</button>
                    <button onClick={recusarSugestao} className="text-[10px] text-muted-foreground hover:underline">Ignorar</button>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Valor</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                  <Input
                    placeholder="0,00"
                    value={valor}
                    onChange={(e) => handleValorChange(e.target.value)}
                    className="bg-secondary border-border/50 pl-9 text-lg font-semibold"
                    inputMode="numeric"
                  />
                </div>
              </div>

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

              <Button
                onClick={handleNextTela}
                className={cn(
                  "w-full h-12 font-semibold text-sm rounded-xl shadow-lg",
                  isDespesa
                    ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                    : "bg-primary hover:bg-primary/90 text-primary-foreground"
                )}
              >
                Continuar <ChevronRight size={16} className="ml-1" />
              </Button>
            </>
          )}

          {tela === 2 && isDespesa && (
            <>
              <div className="flex gap-2 p-1 rounded-xl bg-secondary/50">
                <button
                  onClick={() => setTipoDespesa("normal")}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-sm font-semibold transition-all",
                    tipoDespesa === "normal" ? "bg-destructive text-destructive-foreground shadow" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Minha despesa
                </button>
                <button
                  onClick={() => setTipoDespesa("pais")}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-sm font-semibold transition-all",
                    tipoDespesa === "pais" ? "bg-amber-500 text-white shadow" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  👴👵 Pais
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">Categoria</label>
                  {subcategoria && <span className="text-[10px] text-primary font-semibold">✓ {subcategoria}</span>}
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {SUBCATEGORIA_GROUPS.map((group) => (
                    <div key={group.group}>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                        {group.emoji} {group.group}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {group.items.map((item) => (
                          <button
                            key={item}
                            onClick={() => {
                              setSubcategoria(item === subcategoria ? null : item);
                              setCategoriaMacro(item === subcategoria ? null : group.group);
                            }}
                            className={cn(
                              "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                              subcategoria === item
                                ? "bg-destructive text-destructive-foreground shadow"
                                : "bg-secondary text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {renderPagamentoButtons(tipoDespesa === "pais" ? "pais" : "despesa")}

              {tipoDespesa === "normal" && (
                <>
                  <div className="glass-card p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-foreground">Parcelado?</label>
                      <Switch checked={isParcelado} onCheckedChange={(v) => { setIsParcelado(v); if (v) setIsRecorrente(false); }} />
                    </div>
                    {isParcelado && (
                      <div className="space-y-1">
                        <label className="text-[11px] text-muted-foreground">Número de parcelas</label>
                        <Input type="number" min={2} max={60} value={numParcelas} onChange={(e) => setNumParcelas(e.target.value)} className="bg-secondary border-border/50 w-24" inputMode="numeric" />
                      </div>
                    )}
                  </div>

                  <div className="glass-card p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-foreground">Recorrente?</label>
                      <Switch checked={isRecorrente} onCheckedChange={(v) => { setIsRecorrente(v); if (v) setIsParcelado(false); }} />
                    </div>
                    {isRecorrente && (
                      <>
                        <div className="space-y-1">
                          <label className="text-[11px] text-muted-foreground">Repetir todo mês no dia</label>
                          <Input type="number" min={1} max={31} value={diaRecorrencia} onChange={(e) => setDiaRecorrencia(e.target.value)} className="bg-secondary border-border/50 w-24" inputMode="numeric" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] text-muted-foreground">Até quando? (vazio = 24 meses)</label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full justify-start bg-secondary border-border/50 text-foreground text-xs">
                                <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                                {recorrenciaAte ? format(recorrenciaAte, "dd/MM/yyyy") : "Indefinido"}
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
                      </>
                    )}
                  </div>
                </>
              )}

              <Button onClick={handleSave} disabled={isPending} className={cn("w-full h-12 font-semibold text-sm rounded-xl shadow-lg", tipoDespesa === "pais" ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-destructive hover:bg-destructive/90 text-destructive-foreground")}>
                {isPending ? "Salvando..." : tipoDespesa === "pais" ? "Salvar gasto dos pais" : "Salvar despesa"}
              </Button>
            </>
          )}

          {tela === 2 && !isDespesa && (
            <>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Categoria</label>
                <div className="flex flex-wrap gap-2">
                  {incomeCategories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setIncomeCategoria(cat)}
                      className={cn(
                        "px-4 py-2 rounded-full text-xs font-medium transition-all",
                        incomeCategoria === cat
                          ? "bg-primary text-primary-foreground shadow"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="glass-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground">Receita recorrente?</label>
                  <Switch checked={isRecorrenteReceita} onCheckedChange={setIsRecorrenteReceita} />
                </div>
                {isRecorrenteReceita && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground">Repetir todo mês no dia</label>
                      <Input type="number" min={1} max={31} value={diaRecorrenteReceita} onChange={(e) => setDiaRecorrenteReceita(e.target.value)} className="bg-secondary border-border/50 w-24" inputMode="numeric" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground">Até quando? (vazio = 24 meses)</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start bg-secondary border-border/50 text-foreground text-xs">
                            <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                            {recorrenciaAteReceita ? format(recorrenciaAteReceita, "dd/MM/yyyy") : "Indefinido"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-[80]" align="start">
                          <Calendar mode="single" selected={recorrenciaAteReceita} onSelect={(d) => setRecorrenciaAteReceita(d || undefined)} initialFocus className="p-3 pointer-events-auto" disabled={(d) => d < new Date()} />
                        </PopoverContent>
                      </Popover>
                      {recorrenciaAteReceita && (
                        <button onClick={() => setRecorrenciaAteReceita(undefined)} className="text-[10px] text-primary hover:underline">Limpar data limite</button>
                      )}
                    </div>
                  </>
                )}
              </div>

              <Button onClick={handleSave} disabled={isPending} className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm rounded-xl shadow-lg">
                {isPending ? "Salvando..." : isRecorrenteReceita ? "Salvar Receita Recorrente" : "Salvar Receita"}
              </Button>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default NewExpenseSheet;
