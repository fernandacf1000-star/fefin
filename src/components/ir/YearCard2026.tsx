import { useState, useMemo } from "react";
import {
  FileText, ArrowUp, ArrowDown, Award, CheckCircle2,
  TrendingDown, Heart, ShieldCheck, Pencil,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { IRDados, calcularIRAnual, fmt, useLancamentosAno } from "@/hooks/useIRData";
import EditIRModal from "./EditIRModal";

interface Props {
  irDados: IRDados;
}

const YearCard2026 = ({ irDados }: Props) => {
  const [editOpen, setEditOpen] = useState(false);
  const { data: lancamentos2025 } = useLancamentosAno(2025);

  const computed = useMemo(() => {
    // Base from saved data or defaults
    const rendimentos = irDados.rendimentos ?? 970379.22;
    const irRetido = irDados.ir_retido ?? 219789.77;
    const pgblBase = irDados.pgbl ?? 114110.92;
    const planoSaude = irDados.plano_saude ?? 1596.0;
    const outrasMedicas = irDados.outras_deducoes_medicas ?? 0;
    const inss = 11419.44;

    // Dynamic from lancamentos 2025
    let saudeLancamentos = 0;
    let pgblLancamentos = 0;

    if (lancamentos2025) {
      lancamentos2025.forEach((l) => {
        if (
          l.categoria === "extra" &&
          l.subcategoria_pais?.toLowerCase().includes("saúde")
        ) {
          saudeLancamentos += Number(l.valor);
        }
        if (
          l.categoria === "fixa" &&
          (l.descricao.toLowerCase().includes("pgbl") ||
            l.descricao.toLowerCase().includes("previdencia") ||
            l.descricao.toLowerCase().includes("previdência"))
        ) {
          pgblLancamentos += Number(l.valor);
        }
      });
    }

    const totalSaude = planoSaude + outrasMedicas + saudeLancamentos;
    const totalPGBL = pgblBase + pgblLancamentos;
    const totalDeducoes = inss + totalPGBL + totalSaude;
    const baseCalculo = rendimentos - totalDeducoes;
    const irDevido = calcularIRAnual(baseCalculo);
    const saldo = irDevido - irRetido;
    const descontoSimplificado = Math.min(rendimentos * 0.2, 16754.34);
    const modelo = totalDeducoes > descontoSimplificado ? "Completo" : "Simplificado";

    // Progress: current month (Mar 2026 = 3/12 = 25%)
    const now = new Date();
    const currentMonth = now.getFullYear() === 2025 ? now.getMonth() + 1 : now.getFullYear() < 2025 ? 0 : 12;
    const progressPct = Math.min(Math.round((currentMonth / 12) * 100), 100);

    const updatedAt = irDados.updated_at
      ? new Date(irDados.updated_at).toLocaleDateString("pt-BR")
      : null;

    return {
      rendimentos, irRetido, inss, totalPGBL, totalSaude, planoSaude,
      outrasMedicas, saudeLancamentos, pgblLancamentos, pgblBase,
      totalDeducoes, baseCalculo, irDevido, saldo,
      descontoSimplificado, modelo, progressPct, currentMonth, updatedAt,
    };
  }, [irDados, lancamentos2025]);

  const deducoes = [
    { label: "INSS oficial", desc: "Contribuição previdenciária", valor: computed.inss, limite: "Sem limite", icon: ShieldCheck },
    { label: "PGBL", desc: "Informe + lançamentos", valor: computed.totalPGBL, limite: fmt(computed.rendimentos * 0.12), icon: ShieldCheck },
    { label: "Despesas médicas", desc: "Plano + outras + lançamentos", valor: computed.totalSaude, limite: "Sem limite", icon: Heart },
  ];

  return (
    <>
      <section className="glass-card p-5 animate-fade-up space-y-4" style={{ animationDelay: "0.05s" }}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Declaração 2026 (ano-base 2025)</h2>
          </div>
          <span className="text-[9px] font-bold px-2.5 py-0.5 rounded-full" style={{ backgroundColor: "rgba(245,158,11,0.15)", color: "#F59E0B" }}>
            Em andamento 📝
          </span>
        </div>

        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">Progresso do ano-base</p>
            <p className="text-[10px] text-muted-foreground">{computed.progressPct}%</p>
          </div>
          <Progress value={computed.progressPct} className="h-1.5" />
          <p className="text-[10px]" style={{ color: "#475569" }}>
            📅 Estimativa baseada em {computed.currentMonth} meses
            {computed.updatedAt && ` — atualizada em ${computed.updatedAt}`}
          </p>
        </div>

        {/* Edit button */}
        <button
          onClick={() => setEditOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-border/50 text-xs font-medium text-foreground hover:bg-secondary/30 transition-colors"
        >
          <Pencil size={14} />
          ✏️ Atualizar dados
        </button>

        {/* Summary grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-secondary/40 p-3">
            <p className="text-[11px] text-muted-foreground mb-0.5">Rendimentos tributáveis</p>
            <p className="text-sm font-bold text-foreground tabular-nums">{fmt(computed.rendimentos)}</p>
          </div>
          <div className="rounded-xl bg-secondary/40 p-3">
            <p className="text-[11px] text-muted-foreground mb-0.5">IR retido na fonte</p>
            <p className="text-sm font-bold text-foreground tabular-nums">{fmt(computed.irRetido)}</p>
          </div>
          <div className="rounded-xl bg-secondary/40 p-3">
            <p className="text-[11px] text-muted-foreground mb-0.5">Base cálculo (Completo)</p>
            <p className="text-sm font-bold text-foreground tabular-nums">{fmt(computed.baseCalculo)}</p>
          </div>
          <div className="rounded-xl bg-secondary/40 p-3">
            <p className="text-[11px] text-muted-foreground mb-0.5">IR devido estimado</p>
            <p className="text-sm font-bold text-foreground tabular-nums">{fmt(computed.irDevido)}</p>
          </div>
        </div>

        {/* Result */}
        {computed.saldo > 0 ? (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10">
            <ArrowUp size={16} className="text-destructive shrink-0" />
            <p className="text-sm font-bold tabular-nums text-destructive">
              Estimativa a pagar: {fmt(computed.saldo)}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/10">
            <ArrowDown size={16} className="text-primary shrink-0" />
            <p className="text-sm font-bold tabular-nums text-primary">
              Estimativa a restituir: {fmt(Math.abs(computed.saldo))}
            </p>
          </div>
        )}

        {/* Deadline */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary/30">
          <p className="text-[11px] text-muted-foreground">📅 Prazo de entrega: <span className="font-semibold text-foreground">até 30/maio/2026</span></p>
        </div>

        {/* Modelo */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Award size={16} className="text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Modelo de Declaração</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className={`rounded-xl p-4 border ${computed.modelo === "Simplificado" ? "border-primary bg-primary/10" : "border-border/50 bg-secondary/30"}`}>
              <p className="text-xs font-semibold text-foreground mb-1">Simplificado</p>
              <p className="text-lg font-bold text-foreground tabular-nums">{fmt(computed.descontoSimplificado)}</p>
              <p className="text-[10px] text-muted-foreground mt-1">20% (limite R$ 16.754)</p>
              {computed.modelo === "Simplificado" && (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary mt-1 inline-block">Recomendado</span>
              )}
            </div>
            <div className={`rounded-xl p-4 border ${computed.modelo === "Completo" ? "border-primary bg-primary/10" : "border-border/50 bg-secondary/30"}`}>
              <p className="text-xs font-semibold text-foreground mb-1">Completo</p>
              <p className="text-lg font-bold text-foreground tabular-nums">{fmt(computed.totalDeducoes)}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Deduções reais</p>
              {computed.modelo === "Completo" && (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary mt-1 inline-block">Recomendado</span>
              )}
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/10">
            <CheckCircle2 size={14} className="text-primary shrink-0 mt-0.5" />
            <p className="text-[11px] text-foreground">
              O modelo <span className="font-bold text-primary">{computed.modelo}</span> gera economia de{" "}
              <span className="font-bold text-primary">{fmt(Math.abs(computed.totalDeducoes - computed.descontoSimplificado))}</span> em deduções.
            </p>
          </div>
        </div>

        {/* Deduções */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingDown size={16} className="text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Deduções Legais</h3>
          </div>
          {deducoes.map((d) => (
            <div key={d.label} className="flex items-center justify-between p-3 rounded-xl bg-secondary/30">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <d.icon size={14} className="text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{d.label}</p>
                  <p className="text-[10px] text-muted-foreground">{d.desc} · Limite: {d.limite}</p>
                </div>
              </div>
              <p className="text-sm font-semibold text-foreground tabular-nums">{fmt(d.valor)}</p>
            </div>
          ))}
          <div className="flex items-center justify-between pt-3 border-t border-border/30">
            <p className="text-xs font-semibold text-muted-foreground">Total de deduções</p>
            <p className="text-base font-bold text-primary tabular-nums">{fmt(computed.totalDeducoes)}</p>
          </div>
        </div>
      </section>

      <EditIRModal open={editOpen} onClose={() => setEditOpen(false)} dados={irDados} />
    </>
  );
};

export default YearCard2026;
