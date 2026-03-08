import { useState, useEffect } from "react";
import { FileText, ChevronDown, ChevronUp } from "lucide-react";
import { useIRLancamentos, useSeedIRData, fmt } from "@/hooks/useIRLancamentos";
import IRResumoCard from "./IRResumoCard";

const YearCard2026 = () => {
  const [expanded, setExpanded] = useState(false);
  const { data: lancamentos, isLoading } = useIRLancamentos(2025);
  const seedMut = useSeedIRData();

  useEffect(() => {
    if (lancamentos && lancamentos.length === 0 && !seedMut.isPending) {
      seedMut.mutate();
    }
  }, [lancamentos]);

  const lancs = lancamentos ?? [];

  if (isLoading) {
    return (
      <section className="glass-card p-5 animate-fade-up">
        <p className="text-xs text-muted-foreground text-center py-4">Carregando dados...</p>
      </section>
    );
  }

  return (
    <section className="glass-card p-5 animate-fade-up space-y-3" style={{ animationDelay: "0.05s" }}>
      {/* Header — clickable to expand */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Declaração 2026 (ano-base 2025)</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold px-2.5 py-0.5 rounded-full" style={{ backgroundColor: "rgba(71,85,105,0.15)", color: "#475569" }}>
            Entregue até 30/mai/2026
          </span>
          {expanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="space-y-4 pt-2 border-t border-border/30 animate-fade-up">
          <IRResumoCard lancamentos={lancs} ano={2025} />

          {/* Read-only deductions summary */}
          <div className="space-y-2">
            {[
              { label: "Rendimentos", valor: lancs.filter(l => l.tipo === "renda").reduce((s, l) => s + Number(l.valor), 0) },
              { label: "IR retido", valor: lancs.filter(l => l.tipo === "ir_retido").reduce((s, l) => s + Number(l.valor), 0) },
              { label: "INSS", valor: lancs.filter(l => l.tipo === "inss").reduce((s, l) => s + Number(l.valor), 0) },
              { label: "PGBL", valor: lancs.filter(l => l.tipo === "pgbl").reduce((s, l) => s + Number(l.valor), 0) },
              { label: "Saúde", valor: lancs.filter(l => l.tipo === "saude").reduce((s, l) => s + Number(l.valor), 0) },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between px-1">
                <p className="text-[11px] text-muted-foreground">{item.label}</p>
                <p className="text-xs font-medium text-foreground tabular-nums">{fmt(item.valor)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default YearCard2026;
