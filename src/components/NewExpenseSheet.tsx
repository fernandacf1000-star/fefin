import { useState, useMemo } from "react";
import { X, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const recentEntries = [
  "Supermercado Extra",
  "Farmácia Drogasil",
  "Conta de Luz",
  "Conta de Água",
  "Internet Vivo",
  "Parcela Sofá",
  "Consulta Dr. Silva",
  "Remédio Pressão - Pai",
  "Supermercado Pão de Açúcar",
  "Gasolina Shell",
  "Plano de Saúde Pais",
  "Exame Laboratório - Mãe",
];

const categories = ["Fixa", "Parcelada", "Extra", "Pais"] as const;
type Category = (typeof categories)[number];

const oQueAconteceuOptions = [
  { id: "paguei_por_eles", emoji: "💸", label: "Paguei por eles", desc: "você pagou do seu bolso por remédio, mercado, conta etc." },
  { id: "paguei_vou_receber", emoji: "↩️", label: "Paguei e vou receber de volta", desc: "você pagou mas eles vão te reembolsar" },
  { id: "eles_pagaram", emoji: "📋", label: "Eles pagaram — só registrando", desc: "eles mesmos pagaram, você só quer ter o controle" },
  { id: "usaram_meu_cartao", emoji: "💳", label: "Usaram meu cartão", desc: "eles usaram seu cartão extra como dependentes" },
] as const;

interface NewExpenseSheetProps {
  open: boolean;
  onClose: () => void;
}

const NewExpenseSheet = ({ open, onClose }: NewExpenseSheetProps) => {
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [categoria, setCategoria] = useState<Category>("Extra");
  const [data, setData] = useState<Date>(new Date());
  const [paraQuem, setParaQuem] = useState<string>("Gasto com os pais");
  const [quemPagou, setQuemPagou] = useState<string>("Paguei do meu bolso");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = useMemo(() => {
    if (descricao.length < 2) return [];
    return recentEntries.filter((e) =>
      e.toLowerCase().includes(descricao.toLowerCase())
    );
  }, [descricao]);

  const isPais = categoria === "Pais";

  const handleSave = () => {
    // placeholder
    onClose();
    setDescricao("");
    setValor("");
    setCategoria("Extra");
    setData(new Date());
  };

  const handleValorChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) { setValor(""); return; }
    const num = parseInt(digits, 10) / 100;
    setValor(num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-[70] rounded-t-3xl bg-card border-t border-border/50 transition-transform duration-300 ease-out max-h-[90vh] overflow-y-auto",
          open ? "translate-y-0" : "translate-y-full"
        )}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="px-5 pb-8 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Novo Lançamento</h2>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-muted transition-colors">
              <X size={20} className="text-muted-foreground" />
            </button>
          </div>

          {/* Descrição */}
          <div className="space-y-1.5 relative">
            <label className="text-xs font-medium text-muted-foreground">Descrição</label>
            <Input
              placeholder="Ex: Conta de Luz"
              value={descricao}
              onChange={(e) => { setDescricao(e.target.value); setShowSuggestions(true); }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              className="bg-secondary border-border/50"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border/50 rounded-xl overflow-hidden z-10 shadow-xl">
                {suggestions.slice(0, 4).map((s) => (
                  <button
                    key={s}
                    className="w-full text-left px-3 py-2.5 text-sm text-foreground hover:bg-muted/60 transition-colors"
                    onMouseDown={() => { setDescricao(s); setShowSuggestions(false); }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Valor */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Valor</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
              <Input
                placeholder="0,00"
                value={valor}
                onChange={(e) => handleValorChange(e.target.value)}
                className="bg-secondary border-border/50 pl-9"
                inputMode="numeric"
              />
            </div>
          </div>

          {/* Categoria pills */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Categoria</label>
            <div className="flex gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoria(cat)}
                  className={cn(
                    "px-4 py-2 rounded-full text-xs font-medium transition-all",
                    categoria === cat
                      ? "gradient-emerald text-primary-foreground shadow-md shadow-primary/20"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  )}
                >
                  {cat}
                </button>
              ))}
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

          {/* Campos condicionais - Pais */}
          {isPais && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
              {/* Para quem */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Tipo de gasto</label>
                <div className="flex gap-2">
                  {paraQuemOptions.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setParaQuem(opt)}
                      className={cn(
                        "flex-1 px-3 py-2.5 rounded-xl text-xs font-medium transition-all",
                        paraQuem === opt
                          ? "gradient-emerald text-primary-foreground shadow-md shadow-primary/20"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quem pagou */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Como foi pago</label>
                <div className="grid grid-cols-2 gap-2">
                  {quemPagouOptions.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setQuemPagou(opt)}
                      className={cn(
                        "px-3 py-2.5 rounded-xl text-xs font-medium transition-all",
                        quemPagou === opt
                          ? "gradient-emerald text-primary-foreground shadow-md shadow-primary/20"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Salvar */}
          <Button
            onClick={handleSave}
            className="w-full h-12 gradient-emerald text-primary-foreground font-semibold text-sm rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow"
          >
            Salvar Lançamento
          </Button>
        </div>
      </div>
    </>
  );
};

export default NewExpenseSheet;
