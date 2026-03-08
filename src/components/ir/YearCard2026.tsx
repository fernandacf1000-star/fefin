import { useEffect, useMemo } from "react";
import { FileText } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useIRLancamentos, useSeedIRData, fmt } from "@/hooks/useIRLancamentos";
import IRResumoCard from "./IRResumoCard";
import RendimentosSection from "./RendimentosSection";
import DeducoesSection from "./DeducoesSection";

const YearCard2026 = () => {
  const { data: lancamentos, isLoading } = useIRLancamentos(2025);
  const seedMut = useSeedIRData();

  // Seed initial data on first load
  useEffect(() => {
    if (lancamentos && lancamentos.length === 0 && !seedMut.isPending) {
      seedMut.mutate();
    }
  }, [lancamentos]);

  const lancs = lancamentos ?? [];

  const totalRenda = useMemo(
    () => lancs.filter((l) => l.tipo === "renda").reduce((s, l) => s + Number(l.valor), 0),
    [lancs]
  );

  // Progress: current month in 2025
  const now = new Date();
  const currentMonth = now.getFullYear() === 2025 ? now.getMonth() + 1 : now.getFullYear() > 2025 ? 12 : 0;
  const progressPct = Math.min(Math.round((currentMonth / 12) * 100), 100);

  if (isLoading) {
    return (
      <section className="glass-card p-5 animate-fade-up">
        <p className="text-xs text-muted-foreground text-center py-4">Carregando dados...</p>
      </section>
    );
  }

  return (
    <section className="glass-card p-5 animate-fade-up space-y-5" style={{ animationDelay: "0.05s" }}>
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
          <p className="text-[10px] text-muted-foreground">{progressPct}%</p>
        </div>
        <Progress value={progressPct} className="h-1.5" />
      </div>

      {/* Deadline */}
      <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary/30">
        <p className="text-[11px] text-muted-foreground">📅 Prazo de entrega: <span className="font-semibold text-foreground">até 30/maio/2026</span></p>
      </div>

      {/* Resumo */}
      <IRResumoCard lancamentos={lancs} ano={2025} />

      {/* Rendimentos */}
      <div className="border-t border-border/30 pt-4">
        <RendimentosSection ano={2025} lancamentos={lancs} />
      </div>

      {/* Deduções */}
      <div className="border-t border-border/30 pt-4">
        <DeducoesSection ano={2025} lancamentos={lancs} rendaBruta={totalRenda} />
      </div>
    </section>
  );
};

export default YearCard2026;
