import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    valor_reembolsado: number;
    quem_reembolsou: string;
    data_reembolso: string;
    observacao?: string;
  }) => void;
  descricao: string;
  valorOriginal: number;
  isPending?: boolean;
}

const ReembolsoModal = ({ open, onClose, onSave, descricao, valorOriginal, isPending }: Props) => {
  const today = new Date().toISOString().split("T")[0];
  const [valor, setValor] = useState(valorOriginal);
  const [quem, setQuem] = useState("");
  const [data, setData] = useState(today);
  const [obs, setObs] = useState("");

  // Resetar estado sempre que o modal abrir com novo lançamento
  useEffect(() => {
    if (open) {
      setValor(valorOriginal);
      setQuem("");
      setData(today);
      setObs("");
    }
  }, [open, valorOriginal]);

  if (!open) return null;

  const handleSave = () => {
    onSave({
      valor_reembolsado: valor,
      quem_reembolsou: quem.trim() || "Pais",
      data_reembolso: data,
      observacao: obs.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/25 backdrop-blur-sm p-4">
      <div className="glass-card w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">
            Registrar reembolso
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{descricao}</span>
          {" · "}Valor pago: <span className="font-semibold">{fmt(valorOriginal)}</span>
        </p>

        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">Valor reembolsado (R$)</Label>
          <Input
            type="number"
            step="0.01"
            value={valor || ""}
            onChange={(e) => setValor(parseFloat(e.target.value) || 0)}
            className="bg-[#E8ECF5] border-0 text-base font-bold"
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">Quem reembolsou <span className="opacity-50">(opcional)</span></Label>
          <Input
            value={quem}
            onChange={(e) => setQuem(e.target.value)}
            placeholder="Ex: Pais, Adriano..."
            className="bg-[#E8ECF5] border-0"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">Data do reembolso</Label>
          <Input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="bg-[#E8ECF5] border-0"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">Observação <span className="opacity-50">(opcional)</span></Label>
          <Textarea
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            placeholder="Detalhes adicionais..."
            className="bg-[#E8ECF5] border-0 min-h-[60px]"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isPending || valor <= 0}
            className="flex-1 gradient-emerald text-white border-0"
          >
            {isPending ? "Salvando..." : "Salvar reembolso"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReembolsoModal;
