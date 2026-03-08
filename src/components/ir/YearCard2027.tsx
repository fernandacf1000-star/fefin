import { useMemo } from "react";
import { FileText, TrendingUp, Lightbulb } from "lucide-react";
import { calcularIRAnual, fmt, useLancamentosAno } from "@/hooks/useIRData";

const YearCard2027 = () => {
  const { data: lancamentos2026 } = useLancamentosAno(2026);

  const computed = useMemo(() => {
    if (!lancamentos2026 || lancamentos2026.length === 0) {
      return null;
    }

    const now = new Date();
    const mesesDecorridos = now.getFullYear() === 2026 ? now.getMonth() + 1 : now.getFullYear() > 2026 ? 12 : 0;
    if (mesesDecorridos === 0) return null;

    let receitasAcumuladas = 0;
    lancamentos2026.forEach((l) => {
      if (l.tipo === "receita") {
        receitasAcumuladas += Number(l.valor);
      }
    });

    const projecaoAnual = (receitasAcumuladas / mesesDecorridos) * 12;
    const irProjetado = calcularIRAnual(projecaoAnual * 0.725); // rough estimate after deductions
    const limitePGBL = projecaoAnual * 0.12;

    return {
      receitasAcumuladas,
      projecaoAnual,
      irProjetado,
      limitePGBL,
      mesesDecorridos,
    };
  }, [lancamentos2026]);

  return (
    <section className="glass-card p-5 animate-fade-up space-y-4" style={{ animationDelay: "0.1s" }}>
      {/* Header */}
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

      {computed ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-secondary/40 p-3">
              <p className="text-[11px] text-muted-foreground mb-0.5">Receitas acumuladas ({computed.mesesDecorridos} meses)</p>
              <p className="text-sm font-bold text-foreground tabular-nums">{fmt(computed.receitasAcumuladas)}</p>
            </div>
            <div className="rounded-xl bg-secondary/40 p-3">
              <p className="text-[11px] text-muted-foreground mb-0.5">Projeção 12 meses</p>
              <p className="text-sm font-bold text-foreground tabular-nums">{fmt(computed.projecaoAnual)}</p>
            </div>
          </div>

          <div className="rounded-xl bg-secondary/40 p-3">
            <p className="text-[11px] text-muted-foreground mb-0.5">Projeção IR 2027 (estimativa)</p>
            <p className="text-sm font-bold text-foreground tabular-nums">{fmt(computed.irProjetado)}</p>
            <p className="text-[10px] mt-1" style={{ color: "#475569" }}>
              Projeção 12 meses: {fmt(computed.projecaoAnual)}
            </p>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/10">
            <Lightbulb size={14} className="text-primary shrink-0 mt-0.5" />
            <p className="text-[11px] text-foreground leading-relaxed">
              💡 Maximize seu PGBL até dezembro — você ainda pode deduzir até 12% da renda bruta projetada:{" "}
              <span className="font-bold text-primary">{fmt(computed.limitePGBL)}</span>
            </p>
          </div>
        </>
      ) : (
        <div className="rounded-xl bg-secondary/30 p-4 text-center">
          <p className="text-[11px] text-muted-foreground">Nenhum lançamento de 2026 registrado ainda.</p>
          <p className="text-[10px] text-muted-foreground mt-1">As projeções aparecerão conforme você registrar receitas.</p>
          <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/10 mt-3">
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
