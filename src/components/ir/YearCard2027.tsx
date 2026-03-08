import { useMemo } from "react";
import { FileText, Lightbulb } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useIRLancamentos, fmt } from "@/hooks/useIRLancamentos";
import IRResumoCard from "./IRResumoCard";
import RendimentosSection from "./RendimentosSection";
import DeducoesSection from "./DeducoesSection";

const YearCard2027 = () => {
  const { data: lancamentos2026, isLoading } = useIRLancamentos(2026);
  const lancs = lancamentos2026 ?? [];

  const totalRenda = useMemo(
    () => lancs.filter((l) => l.tipo === "renda").reduce((s, l) => s + Number(l.valor), 0),
    [lancs]
  );

  const now = new Date();
  const mesesDecorridos = now.getFullYear() === 2026 ? now.getMonth() + 1 : now.getFullYear() > 2026 ? 12 : 0;
  const projecaoAnual = mesesDecorridos > 0 && totalRenda > 0
    ? (totalRenda / mesesDecorridos) * 12
    : 0;
  const limitePGBL = projecaoAnual > 0 ? projecaoAnual * 0.12 : totalRenda * 0.12;
  const progressPct = Math.min(Math.round((mesesDecorridos / 12) * 100), 100);

  if (isLoading) {
    return (
      <section className="glass-card p-5 animate-fade-up">
        <p className="text-xs text-muted-foreground text-center py-4">Carregando dados...</p>
      </section>
    );
  }

  return (
    <section className="glass-card p-5 animate-fade-up space-y-5" style={{ animationDelay: "0.1s" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Planejamento 2027 (ano-base 2026)</h2>
        </div>
        <span className="text-[9px] font-bold px-2.5 py-0.5 rounded-full" style={{ backgroundColor: "rgba(245,158,11,0.15)", color: "#F59E0B" }}>
          Em andamento 📝
        </span>
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground">Progresso do ano-base 2026</p>
          <p className="text-[10px] text-muted-foreground">{progressPct}%</p>
        </div>
        <Progress value={progressPct} className="h-1.5" />
        <p className="text-[10px]" style={{ color: "#475569" }}>
          📅 Estimativa baseada em {mesesDecorridos} {mesesDecorridos === 1 ? "mês" : "meses"} de 2026
        </p>
      </div>

      {/* Resumo */}
      {lancs.length > 0 && <IRResumoCard lancamentos={lancs} ano={2026} />}

      {lancs.length === 0 && (
        <div className="rounded-xl bg-secondary/30 p-4 text-center">
          <p className="text-[11px] text-muted-foreground">Nenhum lançamento de 2026 registrado ainda.</p>
          <p className="text-[10px] text-muted-foreground mt-1">Adicione seus rendimentos e deduções abaixo.</p>
        </div>
      )}

      {/* Rendimentos */}
      <div className="border-t border-border/30 pt-4">
        <RendimentosSection ano={2026} lancamentos={lancs} />
      </div>

      {/* Deduções */}
      <div className="border-t border-border/30 pt-4">
        <DeducoesSection ano={2026} lancamentos={lancs} rendaBruta={projecaoAnual > 0 ? projecaoAnual : totalRenda} />
      </div>

      {/* PGBL tip */}
      <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/10">
        <Lightbulb size={14} className="text-primary shrink-0 mt-0.5" />
        <p className="text-[11px] text-foreground leading-relaxed">
          💡 Maximize seu PGBL até dezembro — você ainda pode deduzir até 12% da renda bruta projetada:{" "}
          <span className="font-bold text-primary">{fmt(limitePGBL)}</span>
        </p>
      </div>
    </section>
  );
};

export default YearCard2027;
