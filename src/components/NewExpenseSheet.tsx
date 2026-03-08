import { useState } from "react";
import { X, CalendarIcon, ChevronLeft } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAddLancamento } from "@/hooks/useLancamentos";
import { toast } from "sonner";
import { SUBCATEGORIA_GROUPS, detectSubcategoria, detectCategoriaMacro } from "@/lib/subcategorias";

type TipoLanc = "despesa" | "receita" | "parcelada" | "pais";

const tipoOptions = [
  { id: "despesa" as TipoLanc, emoji: "💸", label: "Despesa" },
  { id: "receita" as TipoLanc, emoji: "💰", label: "Receita" },
  { id: "parcelada" as TipoLanc, emoji: "📋", label: "Parcelada" },
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
}

const NewExpenseSheet = ({ open, onClose }: NewExpenseSheetProps) => {
  const [step, setStep] = useState(1);
  const [tipoLanc, setTipoLanc] = useState<TipoLanc>("despesa");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [categoriaMacro, setCategoriaMacro] = useState("");
  const [subcategoria, setSubcategoria] = useState("");
  const [data, setData] = useState<Date>(new Date());
  const [oQueAconteceu, setOQueAconteceu] = useState("paguei_por_eles");
  const [parcelaAtual, setParcelaAtual] = useState("");
  const [parcelaTotal, setParcelaTotal] = useState("");
  const [incomeCat, setIncomeCat] = useState<string>("Salário");

  const addLancamento = useAddLancamento();

  const isParcelada = tipoLanc === "parcelada";
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

  const resetAndClose = () => {
    onClose();
    setStep(1); setDescricao(""); setValor(""); setCategoriaMacro("");
    setSubcategoria(""); setData(new Date()); setParcelaAtual("");
    setParcelaTotal(""); setTipoLanc("despesa"); setIncomeCat("Salário");
    setOQueAconteceu("paguei_por_eles");
  };

  const handleSave = async () => {
    if (!descricao || !valor) {
      toast.error("Preencha descrição e valor");
      return;
    }
    if (needsCategory && !subcategoria) {
      toast.error("Selecione uma subcategoria");
      return;
    }
    const numValor = parseFloat(valor.replace(/\./g, "").replace(",", "."));
    if (isNaN(numValor) || numValor <= 0) {
      toast.error("Valor inválido");
      return;
    }

    const mesRef = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;

    const catMap: Record<TipoLanc, string> = {
      despesa: "extra",
      receita: incomeCatMap[incomeCat] || "outros",
      parcelada: "parcelada",
      pais: "pais",
    };

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
        parcela_atual: isParcelada && parcelaAtual ? parseInt(parcelaAtual) : null,
        parcela_total: isParcelada && parcelaTotal ? parseInt(parcelaTotal) : null,
        pago: false,
      });
      toast.success(isReceita ? "Receita salva!" : "Despesa salva!");
      resetAndClose();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    }
  };

  const canProceedToDetails = () => {
    if (isReceita || isParcelada) return true;
    if (isPais && step === 2) return !!oQueAconteceu;
    if (needsCategory && step === 2) return !!categoriaMacro;
    if (needsCategory && step === 3) return !!subcategoria;
    return true;
  };

  const getMaxStep = () => {
    if (isReceita || isParcelada) return 2; // step 1: tipo, step 2: details
    if (isPais) return 4; // step 1: tipo, step 2: o que aconteceu, step 3: categoria, step 4: details
    return 3; // step 1: tipo, step 2: categoria+sub, step 3: details
  };

  const handleNext = () => {
    if (step < getMaxStep()) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const renderStep = () => {
    // Step 1: Tipo selection
    if (step === 1) {
      return (
        <div className="space-y-4">
          <p className="text-xs font-medium text-muted-foreground">O que você quer registrar?</p>
          <div className="grid grid-cols-2 gap-3">
            {tipoOptions.map(opt => (
              <button
                key={opt.id}
                onClick={() => { setTipoLanc(opt.id); setStep(2); }}
                className={cn(
                  "flex flex-col items-center text-center p-5 rounded-2xl transition-all",
                  tipoLanc === opt.id && step > 1
                    ? "bg-primary/15 ring-2 ring-primary"
                    : "bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary/60"
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

        {isParcelada && (
          <div className="flex gap-3">
            <div className="space-y-1.5 flex-1">
              <label className="text-xs font-medium text-muted-foreground">Parcela atual</label>
              <Input placeholder="1" value={parcelaAtual} onChange={(e) => setParcelaAtual(e.target.value)} className="bg-secondary border-border/50" inputMode="numeric" />
            </div>
            <div className="space-y-1.5 flex-1">
              <label className="text-xs font-medium text-muted-foreground">Total parcelas</label>
              <Input placeholder="12" value={parcelaTotal} onChange={(e) => setParcelaTotal(e.target.value)} className="bg-secondary border-border/50" inputMode="numeric" />
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

        <Button onClick={handleSave} disabled={addLancamento.isPending} className="w-full h-12 bg-primary text-primary-foreground font-semibold text-sm rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow">
          {addLancamento.isPending ? "Salvando..." : "Salvar Lançamento"}
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
