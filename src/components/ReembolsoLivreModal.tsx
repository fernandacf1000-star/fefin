import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAddLancamento } from "@/hooks/useLancamentos";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  quemPadrao: "Pais" | "Adriano" | "Luisa";
  mesReferencia: string; // "YYYY-MM"
}

const ReembolsoLivreModal = ({ open, onClose, quemPadrao, mesReferencia }: Props) => {
  const today = new Date().toISOString().split("T")[0];
  const [valor, setValor] = useState("");
  const [data, setData] = useState(today);
  const [obs, setObs] = useState("");

  const addLancamento = useAddLancamento();

  useEffect(() => {
    if (open) {
      setValor("");
      setData(today);
      setObs("");
    }
  }, [open, today]);

  const handleValorChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) { setValor(""); return; }
    const num = parseInt(digits, 10) / 100;
    setValor(num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  const handleSave = async () => {
    const numValor = parseFloat(valor.replace(/\./g, "").replace(",", "."));
    if (!numValor || numValor <= 0) {
      toast.error("Informe um valor válido");
      return;
    }

    try {
      await addLancamento.mutateAsync({
        descricao: `Reembolso ${quemPadrao}`,
        valor: numValor,
        tipo: "receita",
        categoria: "reembolso_pais",
        subcategoria_pais: quemPadrao,
        subcategoria: null,
        categoria_macro: null,
        data,
        mes_referencia: mesReferencia,
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
        adriano: quemPadrao === "Adriano",
        shared_group_id: null,
        shared_role: null,
        pago_por: "voce",
      } as any);
      toast.success("Reembolso registrado!");
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    }
  };

  if (!open) return null;

  const corAba =
    quemPadrao === "Adriano"
      ? "rgba(59,130,246,0.15)"
      : quemPadrao === "Luisa"
      ? "rgba(236,72,153,0.15)"
      : "rgba(251,191,36,0.2)";

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/25 backdrop-blur-sm p-4">
      <div className="glass-card w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">Registrar reembolso</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          Reembolso recebido de{" "}
          <span
            className="font-semibold px-1.5 py-0.5 rounded-md text-foreground"
            style={{ background: corAba }}
          >
            {quemPadrao}
          </span>{" "}
          · mês {mesReferencia}
        </p>

        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">Valor reembolsado (R$)</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
            <Input
              placeholder="0,00"
              value={valor}
              onChange={(e) => handleValorChange(e.target.value)}
              className="bg-[#E8ECF5] border-0 text-base font-bold pl-9"
              inputMode="numeric"
              autoFocus
            />
          </div>
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
          <Label className="text-[11px] text-muted-foreground">
            Observação <span className="opacity-50">(opcional)</span>
          </Label>
          <Textarea
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            placeholder="Ex: Conta de luz de março..."
            className="bg-[#E8ECF5] border-0 min-h-[60px]"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={addLancamento.isPending || !valor}
            className="flex-1 gradient-emerald text-white border-0"
          >
            {addLancamento.isPending ? "Salvando..." : "Salvar reembolso"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReembolsoLivreModal;

