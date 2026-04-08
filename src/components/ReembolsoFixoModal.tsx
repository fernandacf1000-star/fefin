import { useState } from "react";
import { X, CalendarIcon } from "lucide-react";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAddMultipleLancamentos, useAddLancamento } from "@/hooks/useLancamentos";
import { toast } from "sonner";

interface ReembolsoFixoModalProps {
  open: boolean;
  onClose: () => void;
}

const ReembolsoFixoModal = ({ open, onClose }: ReembolsoFixoModalProps) => {
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [dia, setDia] = useState("5");
  const [recorrente, setRecorrente] = useState(true);
  const [recorrenciaAte, setRecorrenciaAte] = useState<Date | undefined>(undefined);

  const addLancamento = useAddLancamento();
  const addMultiple = useAddMultipleLancamentos();

  const handleValorChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) { setValor(""); return; }
    const num = parseInt(digits, 10) / 100;
    setValor(num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  const handleSave = async () => {
    if (!descricao || !valor) {
      toast.error("Preencha descrição e valor");
      return;
    }
    const numValor = parseFloat(valor.replace(/\./g, "").replace(",", "."));
    if (isNaN(numValor) || numValor <= 0) {
      toast.error("Valor inválido");
      return;
    }

    const diaNum = parseInt(dia, 10) || 5;
    const now = new Date();

    try {
      if (recorrente) {
        const recorrenciaPaiId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
        const lancamentos: any[] = [];
        const maxMonths = 12;
        for (let i = 0; i < maxMonths; i++) {
          const monthDate = addMonths(now, i);
          if (recorrenciaAte && monthDate > recorrenciaAte) break;
          const mRef = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
          const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
          const actualDay = Math.min(diaNum, daysInMonth);
          const dateStr = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}-${String(actualDay).padStart(2, "0")}`;
          lancamentos.push({
            descricao,
            valor: numValor,
            tipo: "receita",
            categoria: "reembolso_pais",
            subcategoria_pais: null,
            subcategoria: null,
            categoria_macro: null,
            data: dateStr,
            mes_referencia: mRef,
            parcela_atual: null,
            parcela_total: null,
            is_parcelado: false,
            parcelamento_id: null,
            pago: false,
            forma_pagamento: null,
            cartao_id: null,
            recorrente: true,
            dia_recorrencia: diaNum,
            recorrencia_ate: recorrenciaAte ? format(recorrenciaAte, "yyyy-MM-dd") : null,
            recorrencia_pai_id: recorrenciaPaiId,
            adriano: false,
            shared_group_id: null,
            shared_role: null,
            pago_por: 'voce',
          });
        }
        await addMultiple.mutateAsync(lancamentos);
        toast.success(`Reembolso fixo criado! (${lancamentos.length} meses)`);
      } else {
        const mRef = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const actualDay = Math.min(diaNum, daysInMonth);
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(actualDay).padStart(2, "0")}`;
        await addLancamento.mutateAsync({
          descricao,
          valor: numValor,
          tipo: "receita",
          categoria: "reembolso_pais",
          subcategoria_pais: null,
          subcategoria: null,
          categoria_macro: null,
          data: dateStr,
          mes_referencia: mRef,
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
          adriano: false,
          pago_por: 'voce',
        });
        toast.success("Reembolso salvo!");
      }
      onClose();
      setDescricao("");
      setValor("");
      setDia("5");
      setRecorrente(true);
      setRecorrenciaAte(undefined);
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    }
  };

  const isPending = addLancamento.isPending || addMultiple.isPending;

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-[70] rounded-t-3xl bg-card border-t border-border/50 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>
        <div className="px-5 pb-8 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">+ Reembolso Fixo</h2>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-muted transition-colors">
              <X size={20} className="text-muted-foreground" />
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Descrição</label>
            <Input placeholder="Ex: Mensalidade pais" value={descricao} onChange={(e) => setDescricao(e.target.value)} className="bg-secondary border-border/50" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Valor (R$)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
              <Input placeholder="0,00" value={valor} onChange={(e) => handleValorChange(e.target.value)} className="bg-secondary border-border/50 pl-9" inputMode="numeric" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Dia do mês que costuma receber</label>
            <Input type="number" min={1} max={31} value={dia} onChange={(e) => setDia(e.target.value)} className="bg-secondary border-border/50 w-24" inputMode="numeric" />
          </div>

          <div className="glass-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground">Recorrente todo mês?</label>
              <Switch checked={recorrente} onCheckedChange={setRecorrente} />
            </div>
            {recorrente && (
              <div className="space-y-1.5">
                <label className="text-[11px] text-muted-foreground">Até quando? (opcional — vazio = 12 meses)</label>
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
                  <button onClick={() => setRecorrenciaAte(undefined)} className="text-[10px] text-primary hover:underline">
                    Limpar data limite
                  </button>
                )}
              </div>
            )}
          </div>

          <Button onClick={handleSave} disabled={isPending} className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm rounded-xl shadow-lg">
            {isPending ? "Salvando..." : "Salvar Reembolso Fixo"}
          </Button>
        </div>
      </div>
    </>
  );
};

export default ReembolsoFixoModal;
