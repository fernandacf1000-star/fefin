import { useState } from "react";
import { X, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAddLancamento } from "@/hooks/useLancamentos";
import { toast } from "sonner";
import { SUBCATEGORIA_GROUPS, detectSubcategoria } from "@/lib/subcategorias";

const categories = ["Fixa", "Parcelada", "Extra", "Pais"] as const;
type Category = (typeof categories)[number];

const catMap: Record<Category, string> = {
  Fixa: "fixa",
  Parcelada: "parcelada",
  Extra: "extra",
  Pais: "pais",
};

const oQueAconteceuOptions = [
  { id: "paguei_por_eles", emoji: "💸", label: "Paguei por eles", desc: "você pagou do seu bolso" },
  { id: "paguei_recebo_depois", emoji: "↩️", label: "Paguei e vou receber de volta", desc: "você pagou mas eles vão te reembolsar" },
  { id: "eles_pagaram", emoji: "📋", label: "Eles pagaram — só registrando", desc: "eles mesmos pagaram" },
  { id: "usaram_meu_cartao", emoji: "💳", label: "Usaram meu cartão", desc: "eles usaram seu cartão" },
] as const;

interface NewExpenseSheetProps {
  open: boolean;
  onClose: () => void;
}

const NewExpenseSheet = ({ open, onClose }: NewExpenseSheetProps) => {
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [categoria, setCategoria] = useState<Category>("Extra");
  const [subcategoria, setSubcategoria] = useState<string>("");
  const [data, setData] = useState<Date>(new Date());
  const [oQueAconteceu, setOQueAconteceu] = useState<string>("paguei_por_eles");
  const [parcelaAtual, setParcelaAtual] = useState("");
  const [parcelaTotal, setParcelaTotal] = useState("");

  const addLancamento = useAddLancamento();
  const isPais = categoria === "Pais";
  const isParcelada = categoria === "Parcelada";
  const isExtra = categoria === "Extra";

  const handleDescricaoChange = (val: string) => {
    setDescricao(val);
    if (!subcategoria) {
      const detected = detectSubcategoria(val);
      if (detected) setSubcategoria(detected);
    }
  };

  const handleSave = async () => {
    if (!descricao || !valor) {
      toast.error("Preencha descrição e valor");
      return;
    }
    if (isExtra && !subcategoria) {
      toast.error("Selecione uma subcategoria");
      return;
    }
    const numValor = parseFloat(valor.replace(/\./g, "").replace(",", "."));
    if (isNaN(numValor) || numValor <= 0) {
      toast.error("Valor inválido");
      return;
    }

    const mesRef = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;

    try {
      await addLancamento.mutateAsync({
        descricao,
        valor: numValor,
        tipo: "despesa",
        categoria: catMap[categoria],
        subcategoria_pais: isPais ? oQueAconteceu : null,
        subcategoria: subcategoria || null,
        data: format(data, "yyyy-MM-dd"),
        mes_referencia: mesRef,
        parcela_atual: isParcelada && parcelaAtual ? parseInt(parcelaAtual) : null,
        parcela_total: isParcelada && parcelaTotal ? parseInt(parcelaTotal) : null,
        pago: false,
      });
      toast.success("Despesa salva!");
      onClose();
      setDescricao(""); setValor(""); setCategoria("Extra");
      setSubcategoria(""); setData(new Date());
      setParcelaAtual(""); setParcelaTotal("");
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    }
  };

  const handleValorChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) { setValor(""); return; }
    const num = parseInt(digits, 10) / 100;
    setValor(num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  return (
    <>
      <div className={cn("fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm transition-opacity duration-300", open ? "opacity-100" : "opacity-0 pointer-events-none")} onClick={onClose} />
      <div className={cn("fixed inset-x-0 bottom-0 z-[70] rounded-t-3xl bg-card border-t border-border/50 transition-transform duration-300 ease-out max-h-[90vh] overflow-y-auto", open ? "translate-y-0" : "translate-y-full")}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>
        <div className="px-5 pb-8 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Novo Lançamento</h2>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-muted transition-colors">
              <X size={20} className="text-muted-foreground" />
            </button>
          </div>

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

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Categoria</label>
            <div className="flex gap-2">
              {categories.map((cat) => (
                <button key={cat} onClick={() => { setCategoria(cat); setSubcategoria(""); }} className={cn("px-4 py-2 rounded-full text-xs font-medium transition-all", categoria === cat ? "gradient-emerald text-primary-foreground shadow-md shadow-primary/20" : "bg-secondary text-muted-foreground hover:text-foreground")}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Subcategoria selector */}
          <div className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <label className="text-xs font-medium text-muted-foreground">
              Subcategoria {isExtra && <span className="text-destructive">*</span>}
            </label>
            <div className="max-h-40 overflow-y-auto space-y-3 bg-secondary/30 rounded-xl p-3">
              {SUBCATEGORIA_GROUPS.map((group) => (
                <div key={group.group}>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{group.group}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.items.map((item) => (
                      <button
                        key={item}
                        onClick={() => setSubcategoria(subcategoria === item ? "" : item)}
                        className={cn(
                          "px-2.5 py-1 rounded-full text-[11px] font-medium transition-all",
                          subcategoria === item
                            ? "gradient-emerald text-primary-foreground shadow-sm"
                            : "bg-secondary/60 text-muted-foreground hover:text-foreground"
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

          {isParcelada && (
            <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
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

          {isPais && (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <label className="text-xs font-medium text-muted-foreground">O que aconteceu?</label>
              <div className="grid grid-cols-2 gap-2">
                {oQueAconteceuOptions.map((opt) => (
                  <button key={opt.id} onClick={() => setOQueAconteceu(opt.id)} className={cn("flex flex-col items-center text-center p-4 rounded-[14px] transition-all", oQueAconteceu === opt.id ? "bg-[#10B981] text-white shadow-md" : "bg-[#1e2435] text-muted-foreground hover:text-foreground")}>
                    <span className="text-2xl mb-2">{opt.emoji}</span>
                    <span className="text-[13px] font-medium leading-tight">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <Button onClick={handleSave} disabled={addLancamento.isPending} className="w-full h-12 gradient-emerald text-primary-foreground font-semibold text-sm rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow">
            {addLancamento.isPending ? "Salvando..." : "Salvar Lançamento"}
          </Button>
        </div>
      </div>
    </>
  );
};

export default NewExpenseSheet;
