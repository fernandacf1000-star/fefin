import { useState, useMemo } from "react";
import { Plus, Trash2, Edit2, Lightbulb, Info, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  useIRLancamentos, useAddIRLancamento, useDeleteIRLancamento,
  calcularIRAnual, calcularIRMensal, fmt, MESES, TETO_INSS_2025,
} from "@/hooks/useIRLancamentos";
import IRResumoCard from "./IRResumoCard";
import DeducoesSection from "./DeducoesSection";
import { toast } from "sonner";

const ANO = 2026;

const IRModoPJ = () => {
  const { data: lancamentos = [], isLoading } = useIRLancamentos(ANO);
  const addMut = useAddIRLancamento();
  const delMut = useDeleteIRLancamento();

  const [modalOpen, setModalOpen] = useState(false);
  const [mes, setMes] = useState(1);
  const [proLabore, setProLabore] = useState(0);
  const [distLucros, setDistLucros] = useState(0);
  const [outrosTrib, setOutrosTrib] = useState(0);
  const [saving, setSaving] = useState(false);

  // Group PJ entries by month
  const pjEntries = useMemo(() => {
    const proLabores = lancamentos.filter(l => l.tipo === "pj_prolabore");
    const dists = lancamentos.filter(l => l.tipo === "pj_dist_lucros");
    const outros = lancamentos.filter(l => l.tipo === "pj_outros_trib");

    const mesesSet = new Set<number>();
    proLabores.forEach(l => l.mes && mesesSet.add(l.mes));

    return Array.from(mesesSet).sort((a, b) => a - b).map(m => {
      const pl = proLabores.find(l => l.mes === m);
      const dl = dists.find(l => l.mes === m);
      const ot = outros.find(l => l.mes === m);
      const plVal = pl ? Number(pl.valor) : 0;
      const dlVal = dl ? Number(dl.valor) : 0;
      const otVal = ot ? Number(ot.valor) : 0;
      const inss = Math.min(plVal * 0.20, TETO_INSS_2025);
      const baseIR = plVal + otVal - inss;
      const irMensal = calcularIRMensal(baseIR);
      return { mes: m, plVal, dlVal, otVal, inss, baseIR, irMensal, plId: pl?.id, dlId: dl?.id, otId: ot?.id };
    });
  }, [lancamentos]);

  const totals = useMemo(() => {
    const totalPL = pjEntries.reduce((s, e) => s + e.plVal, 0);
    const totalDist = pjEntries.reduce((s, e) => s + e.dlVal, 0);
    const totalINSS = pjEntries.reduce((s, e) => s + e.inss, 0);
    const totalOutros = pjEntries.reduce((s, e) => s + e.otVal, 0);
    const totalTrib = totalPL + totalOutros;
    const totalRenda = totalPL + totalDist + totalOutros;
    const distPct = totalRenda > 0 ? (totalDist / totalRenda) * 100 : 0;
    return { totalPL, totalDist, totalINSS, totalOutros, totalTrib, totalRenda, distPct };
  }, [pjEntries]);

  // Build synthetic lancamentos for IRResumoCard compatibility
  const syntheticLancs = useMemo(() => {
    const result: any[] = [];
    pjEntries.forEach(e => {
      if (e.plVal > 0) result.push({ tipo: "renda", valor: e.plVal, mes: e.mes });
      if (e.otVal > 0) result.push({ tipo: "renda", valor: e.otVal, mes: e.mes });
      result.push({ tipo: "inss", valor: e.inss, mes: e.mes });
    });
    // Add deductions from ir_lancamentos
    lancamentos.filter(l => ["pgbl", "saude", "outro"].includes(l.tipo)).forEach(l => result.push(l));
    return result;
  }, [pjEntries, lancamentos]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const inserts: any[] = [];
      if (proLabore > 0) inserts.push({ ano: ANO, mes, tipo: "pj_prolabore", descricao: `Pró-labore ${MESES[mes - 1]}`, valor: proLabore, data: null, subtipo: null });
      if (distLucros > 0) inserts.push({ ano: ANO, mes, tipo: "pj_dist_lucros", descricao: `Dist. lucros ${MESES[mes - 1]}`, valor: distLucros, data: null, subtipo: null });
      if (outrosTrib > 0) inserts.push({ ano: ANO, mes, tipo: "pj_outros_trib", descricao: `Outros trib. ${MESES[mes - 1]}`, valor: outrosTrib, data: null, subtipo: null });
      for (const ins of inserts) await addMut.mutateAsync(ins);
      toast.success("Mês adicionado!");
      setModalOpen(false);
      setProLabore(0); setDistLucros(0); setOutrosTrib(0);
    } catch { toast.error("Erro ao salvar"); }
    setSaving(false);
  };

  const handleDeleteMonth = async (entry: typeof pjEntries[0]) => {
    try {
      const ids = [entry.plId, entry.dlId, entry.otId].filter(Boolean) as string[];
      for (const id of ids) await delMut.mutateAsync(id);
      toast.success(`${MESES[entry.mes - 1]} removido`);
    } catch { toast.error("Erro ao excluir"); }
  };

  const totalRendaTrib = totals.totalPL + totals.totalOutros;

  if (isLoading) return <p className="text-xs text-muted-foreground text-center py-4">Carregando...</p>;

  return (
    <div className="space-y-5">
      {/* Info banner */}
      <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/10 animate-fade-up">
        <Lightbulb size={14} className="text-primary shrink-0 mt-0.5" />
        <p className="text-[11px] text-foreground leading-relaxed">
          💡 Distribuição de lucros é isenta de IR — apenas o pró-labore é tributável.
        </p>
      </div>

      {/* Monthly entries */}
      <section className="glass-card p-5 space-y-4 animate-fade-up" style={{ animationDelay: "0.05s" }}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">📋 Rendimentos do ano</h2>
          <button
            onClick={() => { setMes(pjEntries.length > 0 ? Math.min(pjEntries[pjEntries.length - 1].mes + 1, 12) : 1); setModalOpen(true); }}
            className="flex items-center gap-1 text-[11px] font-semibold text-primary"
          >
            <Plus size={14} /> Adicionar mês
          </button>
        </div>

        {pjEntries.length === 0 && (
          <div className="rounded-xl bg-secondary/30 p-4 text-center">
            <p className="text-[11px] text-muted-foreground">Nenhum mês lançado ainda.</p>
          </div>
        )}

        {pjEntries.map((e) => (
          <div key={e.mes} className="rounded-xl bg-secondary/30 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground">{MESES[e.mes - 1]}</p>
              <div className="flex items-center gap-2">
                {e.dlVal > 0 && e.plVal === 0 && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary">Isento 🎉</span>
                )}
                <button onClick={() => handleDeleteMonth(e)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-1 text-[10px]">
              <div><p className="text-muted-foreground">Pró-labore</p><p className="font-semibold text-foreground tabular-nums">{fmt(e.plVal)}</p></div>
              <div><p className="text-muted-foreground">Dist. (isenta)</p><p className="font-semibold text-primary tabular-nums">{fmt(e.dlVal)}</p></div>
              <div><p className="text-muted-foreground">INSS</p><p className="font-semibold text-foreground tabular-nums">{fmt(e.inss)}</p></div>
              <div><p className="text-muted-foreground">Base IR</p><p className="font-semibold text-foreground tabular-nums">{fmt(e.baseIR)}</p></div>
              <div><p className="text-muted-foreground">IR est.</p><p className="font-semibold text-foreground tabular-nums">{fmt(e.irMensal)}</p></div>
            </div>
          </div>
        ))}

        {/* Totals */}
        {pjEntries.length > 0 && (
          <div className="rounded-xl bg-secondary/50 p-3">
            <p className="text-[10px] text-muted-foreground font-semibold mb-1">ACUMULADO NO ANO</p>
            <div className="grid grid-cols-3 gap-2 text-[10px]">
              <div><p className="text-muted-foreground">Pró-labore</p><p className="font-bold text-foreground tabular-nums">{fmt(totals.totalPL)}</p></div>
              <div><p className="text-muted-foreground">Dist. lucros</p><p className="font-bold text-primary tabular-nums">{fmt(totals.totalDist)}</p></div>
              <div><p className="text-muted-foreground">INSS total</p><p className="font-bold text-foreground tabular-nums">{fmt(totals.totalINSS)}</p></div>
            </div>
          </div>
        )}

        {/* High dist warning */}
        {totals.distPct > 60 && (
          <div className="flex items-start gap-2 p-3 rounded-xl" style={{ backgroundColor: "rgba(245,158,11,0.1)" }}>
            <AlertTriangle size={14} className="shrink-0 mt-0.5" style={{ color: "#F59E0B" }} />
            <p className="text-[11px] leading-relaxed" style={{ color: "#F59E0B" }}>
              ⚠️ Alta proporção de distribuição ({totals.distPct.toFixed(0)}%) — confirme com seu contador se a empresa tem lucro suficiente para justificar.
            </p>
          </div>
        )}
      </section>

      {/* Annual summary */}
      {pjEntries.length > 0 && <IRResumoCard lancamentos={syntheticLancs} ano={ANO} />}

      {/* Deduções */}
      {pjEntries.length > 0 && (
        <div className="border-t border-border/30 pt-4">
          <DeducoesSection ano={ANO} lancamentos={lancamentos} rendaBruta={totalRendaTrib} />
        </div>
      )}

      {/* Add month modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Adicionar mês — Sócio/PJ</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Mês</Label>
              <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
                <SelectTrigger className="bg-secondary/40 border-border/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MESES.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Pró-labore bruto (R$)</Label>
              <Input type="number" step="0.01" value={proLabore || ""} onChange={e => setProLabore(parseFloat(e.target.value) || 0)} className="bg-secondary/40 border-border/50" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Distribuição de lucros (R$)</Label>
              <Input type="number" step="0.01" value={distLucros || ""} onChange={e => setDistLucros(parseFloat(e.target.value) || 0)} className="bg-secondary/40 border-border/50" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Outros rendimentos tributáveis (R$)</Label>
              <Input type="number" step="0.01" value={outrosTrib || ""} onChange={e => setOutrosTrib(parseFloat(e.target.value) || 0)} className="bg-secondary/40 border-border/50" />
            </div>
            <button
              onClick={handleSave}
              disabled={saving || (proLabore === 0 && distLucros === 0)}
              className="w-full py-2.5 rounded-xl text-xs font-semibold text-primary-foreground gradient-emerald disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Salvar mês"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IRModoPJ;
