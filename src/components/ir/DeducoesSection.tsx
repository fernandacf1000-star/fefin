import { useState } from "react";
import { X, Plus, Pencil, Trash2, Heart, ShieldCheck, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  IRLancamento, useAddIRLancamento, useUpdateIRLancamento,
  useDeleteIRLancamento, fmt,
} from "@/hooks/useIRLancamentos";

interface Props {
  ano: number;
  lancamentos: IRLancamento[];
  rendaBruta: number;
}

const SAUDE_TIPOS = ["Consulta", "Exame", "Internação", "Plano de saúde", "Dentista", "Psicólogo", "Outros"];
const PGBL_TIPOS = ["Aporte mensal", "Aporte extraordinário", "Outros"];

type SectionType = "saude" | "pgbl" | "outro";

interface ModalState {
  open: boolean;
  section: SectionType;
  editing: IRLancamento | null;
}

const DeducoesSection = ({ ano, lancamentos, rendaBruta }: Props) => {
  const [modal, setModal] = useState<ModalState>({ open: false, section: "saude", editing: null });
  const [form, setForm] = useState({ descricao: "", valor: 0, data: "", subtipo: "" });

  const addMut = useAddIRLancamento();
  const updateMut = useUpdateIRLancamento();
  const deleteMut = useDeleteIRLancamento();

  const saudeLancs = lancamentos.filter((l) => l.tipo === "saude");
  const pgblLancs = lancamentos.filter((l) => l.tipo === "pgbl");
  const outroLancs = lancamentos.filter((l) => l.tipo === "outro");

  const totalSaude = saudeLancs.reduce((s, l) => s + Number(l.valor), 0);
  const totalPGBL = pgblLancs.reduce((s, l) => s + Number(l.valor), 0);
  const totalOutro = outroLancs.reduce((s, l) => s + Number(l.valor), 0);

  const limitePGBL = rendaBruta * 0.12;
  const pgblPct = limitePGBL > 0 ? Math.min((totalPGBL / limitePGBL) * 100, 100) : 0;
  const pgblExcedeu = totalPGBL > limitePGBL;

  const openAdd = (section: SectionType) => {
    setModal({ open: true, section, editing: null });
    setForm({ descricao: "", valor: 0, data: "", subtipo: section === "saude" ? SAUDE_TIPOS[0] : section === "pgbl" ? PGBL_TIPOS[0] : "" });
  };

  const openEdit = (section: SectionType, lanc: IRLancamento) => {
    setModal({ open: true, section, editing: lanc });
    setForm({
      descricao: lanc.descricao,
      valor: Number(lanc.valor),
      data: lanc.data ?? "",
      subtipo: lanc.subtipo ?? "",
    });
  };

  const handleSave = async () => {
    try {
      if (modal.editing) {
        await updateMut.mutateAsync({
          id: modal.editing.id,
          descricao: form.descricao,
          valor: form.valor,
          data: form.data || null,
          subtipo: form.subtipo || null,
        });
      } else {
        await addMut.mutateAsync({
          ano,
          mes: form.data ? parseInt(form.data.split("-")[1]) : null,
          tipo: modal.section,
          descricao: form.descricao,
          valor: form.valor,
          data: form.data || null,
          subtipo: form.subtipo || null,
        });
      }
      toast.success("Dedução salva! ✓");
      setModal({ open: false, section: "saude", editing: null });
    } catch {
      toast.error("Erro ao salvar.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMut.mutateAsync(id);
      toast.success("Removido!");
    } catch {
      toast.error("Erro ao remover.");
    }
  };

  const tiposOptions = modal.section === "saude" ? SAUDE_TIPOS : modal.section === "pgbl" ? PGBL_TIPOS : null;

  const renderList = (items: IRLancamento[], section: SectionType) => (
    <div className="space-y-2">
      {items.length === 0 && (
        <p className="text-[11px] text-muted-foreground py-2 text-center">Nenhum lançamento</p>
      )}
      {items.map((l) => (
        <div key={l.id} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/20">
          <div>
            <p className="text-[11px] font-medium text-foreground">{l.descricao}</p>
            <p className="text-[10px] text-muted-foreground">{l.subtipo && `${l.subtipo} · `}{l.data}</p>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-foreground tabular-nums">{fmt(Number(l.valor))}</p>
            <button onClick={() => openEdit(section, l)} className="text-muted-foreground hover:text-foreground"><Pencil size={11} /></button>
            <button onClick={() => handleDelete(l.id)} className="text-muted-foreground hover:text-destructive"><Trash2 size={11} /></button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">📋 Deduções do ano</h3>

      {/* A) Despesas Médicas */}
      <div className="rounded-xl bg-secondary/20 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart size={14} className="text-primary" />
            <p className="text-xs font-semibold text-foreground">Despesas Médicas</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary">Sem limite de dedução ✓</span>
            <button onClick={() => openAdd("saude")} className="text-primary hover:text-primary/80"><Plus size={14} /></button>
          </div>
        </div>
        {renderList(saudeLancs, "saude")}
        <div className="flex items-center justify-between pt-2 border-t border-border/20">
          <p className="text-[10px] text-muted-foreground">Total</p>
          <p className="text-xs font-bold text-primary tabular-nums">{fmt(totalSaude)}</p>
        </div>
      </div>

      {/* B) PGBL / Previdência */}
      <div className="rounded-xl bg-secondary/20 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-primary" />
            <p className="text-xs font-semibold text-foreground">PGBL / Previdência</p>
          </div>
          <button onClick={() => openAdd("pgbl")} className="text-primary hover:text-primary/80"><Plus size={14} /></button>
        </div>
        {renderList(pgblLancs, "pgbl")}
        <div className="space-y-1.5 pt-2 border-t border-border/20">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">Utilizado: {fmt(totalPGBL)} de {fmt(limitePGBL)} (12% da renda)</p>
          </div>
          <Progress value={pgblPct} className="h-1.5" />
          {pgblExcedeu && (
            <div className="flex items-center gap-1.5 p-2 rounded-lg" style={{ backgroundColor: "rgba(245,158,11,0.1)" }}>
              <p className="text-[10px] font-medium" style={{ color: "#F59E0B" }}>
                ⚠️ PGBL excedeu 12% da renda bruta — o excedente não será dedutível
              </p>
            </div>
          )}
        </div>
      </div>

      {/* C) Outras Deduções */}
      <div className="rounded-xl bg-secondary/20 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-primary" />
            <p className="text-xs font-semibold text-foreground">Outras Deduções</p>
          </div>
          <button onClick={() => openAdd("outro")} className="text-primary hover:text-primary/80"><Plus size={14} /></button>
        </div>
        {renderList(outroLancs, "outro")}
        {totalOutro > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-border/20">
            <p className="text-[10px] text-muted-foreground">Total</p>
            <p className="text-xs font-bold text-primary tabular-nums">{fmt(totalOutro)}</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="glass-card w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">
                {modal.editing ? "Editar" : "Adicionar"} {modal.section === "saude" ? "despesa médica" : modal.section === "pgbl" ? "PGBL" : "dedução"}
              </h3>
              <button onClick={() => setModal({ open: false, section: "saude", editing: null })} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Descrição</Label>
              <Input
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                className="bg-secondary/40 border-border/50"
                placeholder="Ex: Consulta Dr. Silva"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Valor (R$)</Label>
              <Input
                type="number" step="0.01"
                value={form.valor || ""}
                onChange={(e) => setForm((f) => ({ ...f, valor: parseFloat(e.target.value) || 0 }))}
                className="bg-secondary/40 border-border/50"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Data</Label>
              <Input
                type="date"
                value={form.data}
                onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))}
                className="bg-secondary/40 border-border/50"
              />
            </div>

            {tiposOptions ? (
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Tipo</Label>
                <Select value={form.subtipo} onValueChange={(v) => setForm((f) => ({ ...f, subtipo: v }))}>
                  <SelectTrigger className="bg-secondary/40 border-border/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {tiposOptions.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Tipo (livre)</Label>
                <Input
                  value={form.subtipo}
                  onChange={(e) => setForm((f) => ({ ...f, subtipo: e.target.value }))}
                  className="bg-secondary/40 border-border/50"
                  placeholder="Ex: Pensão alimentícia"
                />
              </div>
            )}

            <Button
              onClick={handleSave}
              disabled={addMut.isPending || updateMut.isPending || !form.descricao}
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

export default DeducoesSection;
