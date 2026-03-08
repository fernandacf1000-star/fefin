import { useState } from "react";
import { X, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const incomeCategories = ["Salário", "Reembolso pais", "Renda extra", "Outros"] as const;
type IncomeCategory = (typeof incomeCategories)[number];

interface NewIncomeSheetProps {
  open: boolean;
  onClose: () => void;
}

const NewIncomeSheet = ({ open, onClose }: NewIncomeSheetProps) => {
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [categoria, setCategoria] = useState<IncomeCategory>("Salário");
  const [data, setData] = useState<Date>(new Date());

  const handleSave = () => {
    onClose();
    setDescricao("");
    setValor("");
    setCategoria("Salário");
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
      <div
        className={cn(
          "fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-[70] rounded-t-3xl bg-card border-t border-border/50 transition-transform duration-300 ease-out max-h-[90vh] overflow-y-auto",
          open ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="px-5 pb-8 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Nova Receita</h2>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-muted transition-colors">
              <X size={20} className="text-muted-foreground" />
            </button>
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Descrição</label>
            <Input
              placeholder="Ex: Salário março"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="bg-secondary border-border/50"
            />
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
            <div className="flex flex-wrap gap-2">
              {incomeCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoria(cat)}
                  className={cn(
                    "px-4 py-2 rounded-full text-xs font-medium transition-all",
                    categoria === cat
                      ? "bg-[#10B981] text-white shadow-md"
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

          {/* Salvar */}
          <Button
            onClick={handleSave}
            className="w-full h-12 bg-[#10B981] hover:bg-[#0d9668] text-white font-semibold text-sm rounded-xl shadow-lg transition-shadow"
          >
            Salvar Receita
          </Button>
        </div>
      </div>
    </>
  );
};

export default NewIncomeSheet;
