import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { IRDados, useSaveIRDados } from "@/hooks/useIRData";

interface Props {
  open: boolean;
  onClose: () => void;
  dados: IRDados;
}

const EditIRModal = ({ open, onClose, dados }: Props) => {
  const [form, setForm] = useState({
    rendimentos: dados.rendimentos ?? 0,
    ir_retido: dados.ir_retido ?? 0,
    pgbl: dados.pgbl ?? 0,
    plano_saude: dados.plano_saude ?? 0,
    outras_deducoes_medicas: dados.outras_deducoes_medicas ?? 0,
  });

  const save = useSaveIRDados();

  useEffect(() => {
    setForm({
      rendimentos: dados.rendimentos ?? 0,
      ir_retido: dados.ir_retido ?? 0,
      pgbl: dados.pgbl ?? 0,
      plano_saude: dados.plano_saude ?? 0,
      outras_deducoes_medicas: dados.outras_deducoes_medicas ?? 0,
    });
  }, [dados]);

  if (!open) return null;

  const handleSave = async () => {
    try {
      await save.mutateAsync(form);
      toast.success("Dados atualizados! ✓");
      onClose();
    } catch {
      toast.error("Erro ao salvar dados.");
    }
  };

  const fields: { key: keyof typeof form; label: string }[] = [
    { key: "rendimentos", label: "Rendimentos tributáveis acumulados (R$)" },
    { key: "ir_retido", label: "IR retido na fonte acumulado (R$)" },
    { key: "pgbl", label: "PGBL total do ano (R$)" },
    { key: "plano_saude", label: "Plano de saúde (R$)" },
    { key: "outras_deducoes_medicas", label: "Outras deduções médicas (R$)" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="glass-card w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">✏️ Atualizar dados do ano</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        {fields.map(({ key, label }) => (
          <div key={key} className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">{label}</Label>
            <Input
              type="number"
              step="0.01"
              value={form[key] || ""}
              onChange={(e) => setForm((f) => ({ ...f, [key]: parseFloat(e.target.value) || 0 }))}
              className="bg-secondary/40 border-border/50"
            />
          </div>
        ))}

        <Button
          onClick={handleSave}
          disabled={save.isPending}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {save.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  );
};

export default EditIRModal;
