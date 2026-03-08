import { useMemo } from "react";
import { FileText, Lightbulb } from "lucide-react";
import { useIRLancamentos, calcularIRAnual, fmt } from "@/hooks/useIRLancamentos";
import IRResumoCard from "./IRResumoCard";

const YearCard2027 = () => {
  const { data: lancamentos2026 } = useIRLancamentos(2026);
  const lancs = lancamentos2026 ?? [];

  const hasData = lancs.length > 0;
  const totalRenda = useMemo(
    () => lancs.filter((l) => l.tipo === "renda").reduce((s, l) => s + Number(l.valor), 0),
    [lancs]
  );

  const now = new Date();
  const mesesDecorridos = now.getFullYear() === 2026 ? now.getMonth() + 1 : now.getFullYear() > 2026 ? 12 : 0;
  const projecaoAnual = mesesDecorridos > 0 && totalRenda > 0
    ? (totalRenda / mesesDecorridos) * 12
    : 0;
  const limitePGBL = projecaoAnual * 0.12;

  return (
    <section className="glass-card p-5 animate-fade-up space-y-4" style={{ animationDelay: "0.15s" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Declaração 2027 (ano-base 2026)</h2>
        </div>
        <span className="text-[9px] font-bold px-2.5 py-0.5 rounded-full" style={{ backgroundColor: "rgba(139,92,246,0.15)", color: "#8B5CF6" }}>
          Planejando 🔮
        </span>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-xl bg-secondary/30">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Os dados de 2026 serão consolidados em jan/2027. Acompanhe sua projeção abaixo.
        </p>
      </div>

      {hasData ? (
        <>
          <IRResumoCard lancamentos={lancs} ano={2026} />

          {projecaoAnual > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/10">
              <Lightbulb size={14} className="text-primary shrink-0 mt-0.5" />
              <p className="text-[11px] text-foreground leading-relaxed">
                💡 Maximize seu PGBL até dezembro — você ainda pode deduzir até 12% da renda bruta projetada:{" "}
                <span className="font-bold text-primary">{fmt(limitePGBL)}</span>
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-xl bg-secondary/30 p-4 text-center space-y-3">
          <p className="text-[11px] text-muted-foreground">Nenhum lançamento de 2026 registrado ainda.</p>
          <p className="text-[10px] text-muted-foreground">As projeções aparecerão conforme você registrar receitas.</p>
          <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/10">
            <Lightbulb size={14} className="text-primary shrink-0 mt-0.5" />
            <p className="text-[11px] text-foreground leading-relaxed">
              💡 Maximize seu PGBL até dezembro — você ainda pode deduzir até 12% da renda bruta projetada.
            </p>
          </div>
        </div>
      )}
    </section>
  );
};

export default YearCard2027;
