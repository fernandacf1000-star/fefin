import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const bandeiras = [
  { value: "visa", label: "Visa" },
  { value: "mastercard", label: "Mastercard" },
  { value: "elo", label: "Elo" },
  { value: "amex", label: "Amex" },
];

const cores = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    nome: string;
    bandeira: string;
    dia_fechamento: number;
    melhor_dia_compra: number;
    cor: string;
  }) => void;
  isPending?: boolean;
  initial?: {
    nome: string;
    bandeira: string;
    dia_fechamento: number;
    melhor_dia_compra: number;
    cor: string;
  };
}

const CartaoModal = ({ open, onClose, onSave, isPending, initial }: Props) => {
  const [nome, setNome] = useState(initial?.nome || "");
  const [bandeira, setBandeira] = useState(initial?.bandeira || "visa");
  const [diaFechamento, setDiaFechamento] = useState(initial?.dia_fechamento || 10);
  const [melhorDia, setMelhorDia] = useState(initial?.melhor_dia_compra || 11);
  const [cor, setCor] = useState(initial?.cor || "#10B981");
  const [melhorDiaEditado, setMelhorDiaEditado] = useState(!!initial);

  useEffect(() => {
    if (!melhorDiaEditado) {
      setMelhorDia(diaFechamento >= 31 ? 1 : diaFechamento + 1);
    }
  }, [diaFechamento, melhorDiaEditado]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="glass-card w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">
            {initial ? "Editar cartão" : "Novo cartão"}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">Nome do cartão</Label>
          <Input
            placeholder="Ex: Itaú Personnalité"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="bg-secondary/40 border-border/50"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">Bandeira</Label>
          <div className="flex gap-2">
            {bandeiras.map((b) => (
              <button
                key={b.value}
                onClick={() => setBandeira(b.value)}
                className={cn(
                  "flex-1 py-2 rounded-lg text-xs font-semibold transition-all text-center",
                  bandeira === b.value
                    ? "bg-primary/15 ring-1 ring-primary text-foreground"
                    : "bg-secondary/40 text-muted-foreground"
                )}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">Dia de fechamento</Label>
            <Input
              type="number"
              min={1}
              max={31}
              value={diaFechamento}
              onChange={(e) => setDiaFechamento(parseInt(e.target.value) || 1)}
              className="bg-secondary/40 border-border/50"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">Melhor dia de compra</Label>
            <Input
              type="number"
              min={1}
              max={31}
              value={melhorDia}
              onChange={(e) => { setMelhorDiaEditado(true); setMelhorDia(parseInt(e.target.value) || 1); }}
              className="bg-secondary/40 border-border/50"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">Cor</Label>
          <div className="flex gap-2">
            {cores.map((c) => (
              <button
                key={c}
                onClick={() => setCor(c)}
                className={cn(
                  "w-8 h-8 rounded-full transition-all",
                  cor === c ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button
            onClick={() => onSave({ nome, bandeira, dia_fechamento: diaFechamento, melhor_dia_compra: melhorDia, cor })}
            disabled={isPending || !nome}
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CartaoModal;
