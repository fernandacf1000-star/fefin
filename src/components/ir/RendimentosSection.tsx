import { useState } from "react";
import { X, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  IRLancamento, useAddIRLancamento, useUpdateIRLancamento,
  useDeleteIRLancamento, fmt, MESES,
} from "@/hooks/useIRLancamentos";

interface Props {
  ano: number;
  lancamentos: IRLancamento[];
}

const RendimentosSection = ({ ano, lancamentos }: Props) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<IRLancamento | null>(null);
  const [form, setForm] = useState({ mes: 1, salario: 0, irRetido: 0, inss: 0, outros: 0 });

  const addMut = useAddIRLancamento();
  const updateMut = useUpdateIRLancamento();
  const deleteMut = useDeleteIRLancamento();

  const rendaLancs = lancamentos.filter((l) => l.tipo === "renda");
  const irRetidoLancs = lancamentos.filter((l) => l.tipo === "ir_retido");
  const inssLancs = lancamentos.filter((l) => l.tipo === "inss");

  const totalRenda = rendaLancs.reduce((s, l) => s + Number(l.valor), 0);
  const totalIR = irRetidoLancs.reduce((s, l) => s + Number(l.valor), 0);
  const totalINSS = inssLancs.reduce((s, l) => s + Number(l.valor), 0);

  // Group by description to show entries
  const entries = rendaLancs.map((r) => {
    const ir = irRetidoLancs.find((l) => l.mes === r.mes && l.descricao === r.descricao);
    const inss = inssLancs.find((l) => l.mes === r.mes && l.descricao === r.descricao);
    return { renda: r, ir, inss };
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ mes: 1, salario: 0, irRetido: 0, inss: 0, outros: 0 });
    setModalOpen(true);
  };

  const openEdit = (entry: typeof entries[0]) => {
    setEditing(entry.renda);
    setForm({
      mes: entry.renda.mes ?? 1,
      salario: Number(entry.renda.valor),
      irRetido: Number(entry.ir?.valor ?? 0),
      inss: Number(entry.inss?.valor ?? 0),
      outros: 0,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editing) {
        // Update existing
        await updateMut.mutateAsync({ id: editing.id, valor: form.salario, mes: form.mes });
        const irEntry = irRetidoLancs.find((l) => l.mes === editing.mes && l.descricao === editing.descricao);
        const inssEntry = inssLancs.find((l) => l.mes === editing.mes && l.descricao === editing.descricao);
        if (irEntry) await updateMut.mutateAsync({ id: irEntry.id, valor: form.irRetido, mes: form.mes });
        if (inssEntry) await updateMut.mutateAsync({ id: inssEntry.id, valor: form.inss, mes: form.mes });
      } else {
        const desc = form.mes ? `${MESES[form.mes - 1]}/${ano}` : `Rendimento ${ano}`;
        const base = { ano, mes: form.mes, data: `${ano}-${String(form.mes).padStart(2, "0")}-28` };
        await addMut.mutateAsync({ ...base, tipo: "renda", descricao: desc, valor: form.salario, subtipo: "salario" });
        if (form.irRetido > 0) await addMut.mutateAsync({ ...base, tipo: "ir_retido", descricao: desc, valor: form.irRetido, subtipo: null });
        if (form.inss > 0) await addMut.mutateAsync({ ...base, tipo: "inss", descricao: desc, valor: form.inss, subtipo: null });
        if (form.outros > 0) await addMut.mutateAsync({ ...base, tipo: "renda", descricao: `Outros ${MESES[form.mes - 1]}/${ano}`, valor: form.outros, subtipo: "outros" });
      }
      toast.success("Rendimento salvo! ✓");
      setModalOpen(false);
    } catch {
      toast.error("Erro ao salvar.");
    }
  };

  const handleDelete = async (entry: typeof entries[0]) => {
    try {
      await deleteMut.mutateAsync(entry.renda.id);
      if (entry.ir) await deleteMut.mutateAsync(entry.ir.id);
      if (entry.inss) await deleteMut.mutateAsync(entry.inss.id);
      toast.success("Removido!");
    } catch {
      toast.error("Erro ao remover.");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">📊 Rendimentos do ano</h3>
        <button
          onClick={openAdd}
          className="flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
        >
          <Plus size={14} /> Adicionar mês
        </button>
      </div>

      {/* Entries list */}
      <div className="space-y-2">
        {entries.length === 0 && (
          <p className="text-[11px] text-muted-foreground py-3 text-center">Nenhum rendimento lançado</p>
        )}
        {entries.map((entry) => (
          <div key={entry.renda.id} className="rounded-xl bg-secondary/30 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-foreground">{entry.renda.descricao}</p>
              <div className="flex items-center gap-2">
                <button onClick={() => openEdit(entry)} className="text-muted-foreground hover:text-foreground">
                  <Pencil size={12} />
                </button>
                <button onClick={() => handleDelete(entry)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
            <div className="flex gap-3 text-[10px] text-muted-foreground">
              <span>Renda: <span className="text-foreground font-medium">{fmt(Number(entry.renda.valor))}</span></span>
              {entry.ir && <span>IR: <span className="text-foreground font-medium">{fmt(Number(entry.ir.valor))}</span></span>}
              {entry.inss && <span>INSS: <span className="text-foreground font-medium">{fmt(Number(entry.inss.valor))}</span></span>}
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/30">
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground">Total renda</p>
          <p className="text-xs font-bold text-foreground tabular-nums">{fmt(totalRenda)}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground">Total IR retido</p>
          <p className="text-xs font-bold text-foreground tabular-nums">{fmt(totalIR)}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground">Total INSS</p>
          <p className="text-xs font-bold text-foreground tabular-nums">{fmt(totalINSS)}</p>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="glass-card w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">{editing ? "Editar rendimento" : "Adicionar mês"}</h3>
              <button onClick={() => setModalOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Mês/Ano</Label>
              <Select value={String(form.mes)} onValueChange={(v) => setForm((f) => ({ ...f, mes: parseInt(v) }))}>
                <SelectTrigger className="bg-secondary/40 border-border/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MESES.map((m, i) => (
                    <SelectItem key={i} value={String(i + 1)}>{m}/{ano}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {[
              { key: "salario" as const, label: "Salário bruto do mês (R$)" },
              { key: "irRetido" as const, label: "IR retido no mês (R$)" },
              { key: "inss" as const, label: "INSS retido no mês (R$)" },
              { key: "outros" as const, label: "Outros rendimentos (R$, opcional)" },
            ].map(({ key, label }) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">{label}</Label>
                <Input
                  type="number" step="0.01"
                  value={form[key] || ""}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: parseFloat(e.target.value) || 0 }))}
                  className="bg-secondary/40 border-border/50"
                />
              </div>
            ))}

            <Button
              onClick={handleSave}
              disabled={addMut.isPending || updateMut.isPending}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {addMut.isPending || updateMut.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RendimentosSection;
