import { useState, useMemo } from "react";
import { ArrowUp, ArrowDown, Lightbulb, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { calcularIRAnual, fmt } from "@/hooks/useIRLancamentos";

const TETO_INSS_2025 = 908.85;

const IRModoPJ = () => {
  const [proLabore, setProLabore] = useState(0);
  const [distLucros, setDistLucros] = useState(0);
  const [meses, setMeses] = useState(12);
  const [pgbl, setPgbl] = useState(0);
  const [saude, setSaude] = useState(0);

  const computed = useMemo(() => {
    const proLaboreAnual = proLabore * meses;
    const inssmensal = Math.min(proLabore * 0.2, TETO_INSS_2025);
    const inssAnual = inssmensal * meses;
    const rendaTributavel = proLaboreAnual;
    const totalDeducoes = inssAnual + pgbl + saude;
    const baseCalculo = rendaTributavel - totalDeducoes;
    const irDevido = calcularIRAnual(baseCalculo);

    // Carnê-leão rough check
    const irMensalEstimado = calcularIRAnual(proLabore * 12 - totalDeducoes) / 12;
    const temCarneLeao = proLabore > 2259.20;

    const limitePGBL = rendaTributavel * 0.12;
    const pgblPct = limitePGBL > 0 ? Math.min((pgbl / limitePGBL) * 100, 100) : 0;

    return {
      proLaboreAnual, distLucrosAnual: distLucros * meses,
      inssmensal, inssAnual, rendaTributavel, totalDeducoes,
      baseCalculo, irDevido, temCarneLeao, irMensalEstimado,
      limitePGBL, pgblPct,
    };
  }, [proLabore, distLucros, meses, pgbl, saude]);

  return (
    <div className="space-y-5">
      {/* Info banner */}
      <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/10 animate-fade-up">
        <Lightbulb size={14} className="text-primary shrink-0 mt-0.5" />
        <p className="text-[11px] text-foreground leading-relaxed">
          💡 Distribuição de lucros é isenta de IR — apenas o pró-labore é tributável.
        </p>
      </div>

      {/* Simulator fields */}
      <section className="glass-card p-5 space-y-4 animate-fade-up" style={{ animationDelay: "0.05s" }}>
        <h2 className="text-sm font-semibold text-foreground">🧮 Simulador PJ</h2>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">Pró-labore mensal (R$)</Label>
            <Input
              type="number" step="0.01"
              value={proLabore || ""}
              onChange={(e) => setProLabore(parseFloat(e.target.value) || 0)}
              className="bg-secondary/40 border-border/50"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">Dist. lucros mensal (R$)</Label>
            <Input
              type="number" step="0.01"
              value={distLucros || ""}
              onChange={(e) => setDistLucros(parseFloat(e.target.value) || 0)}
              className="bg-secondary/40 border-border/50"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">Meses no ano</Label>
            <Input
              type="number"
              value={meses}
              onChange={(e) => setMeses(parseInt(e.target.value) || 12)}
              className="bg-secondary/40 border-border/50"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">PGBL total ano (R$)</Label>
            <Input
              type="number" step="0.01"
              value={pgbl || ""}
              onChange={(e) => setPgbl(parseFloat(e.target.value) || 0)}
              className="bg-secondary/40 border-border/50"
            />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label className="text-[11px] text-muted-foreground">Despesas médicas ano (R$)</Label>
            <Input
              type="number" step="0.01"
              value={saude || ""}
              onChange={(e) => setSaude(parseFloat(e.target.value) || 0)}
              className="bg-secondary/40 border-border/50"
            />
          </div>
        </div>
      </section>

      {/* Results */}
      {proLabore > 0 && (
        <section className="glass-card p-5 space-y-4 animate-fade-up" style={{ animationDelay: "0.1s" }}>
          <h2 className="text-sm font-semibold text-foreground">📊 Resultado da simulação</h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-secondary/40 p-3">
              <p className="text-[10px] text-muted-foreground mb-0.5">Pró-labore anual (tributável)</p>
              <p className="text-sm font-bold text-foreground tabular-nums">{fmt(computed.proLaboreAnual)}</p>
            </div>
            <div className="rounded-xl bg-secondary/40 p-3">
              <p className="text-[10px] text-muted-foreground mb-0.5">Dist. lucros anual (isenta)</p>
              <p className="text-sm font-bold text-primary tabular-nums">{fmt(computed.distLucrosAnual)}</p>
            </div>
            <div className="rounded-xl bg-secondary/40 p-3">
              <p className="text-[10px] text-muted-foreground mb-0.5">INSS autônomo/mês</p>
              <p className="text-sm font-bold text-foreground tabular-nums">{fmt(computed.inssmensal)}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">20% do pró-labore · teto R$ {TETO_INSS_2025.toFixed(2)}</p>
            </div>
            <div className="rounded-xl bg-secondary/40 p-3">
              <p className="text-[10px] text-muted-foreground mb-0.5">INSS anual</p>
              <p className="text-sm font-bold text-foreground tabular-nums">{fmt(computed.inssAnual)}</p>
            </div>
          </div>

          <div className="rounded-xl bg-secondary/40 p-3">
            <p className="text-[10px] text-muted-foreground mb-0.5">Base de cálculo</p>
            <p className="text-sm font-bold text-foreground tabular-nums">{fmt(computed.baseCalculo)}</p>
          </div>

          <div className="rounded-xl bg-secondary/40 p-3">
            <p className="text-[10px] text-muted-foreground mb-0.5">IR devido estimado</p>
            <p className="text-lg font-bold text-foreground tabular-nums">{fmt(computed.irDevido)}</p>
          </div>

          {/* PGBL progress */}
          {pgbl > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] text-muted-foreground">
                PGBL: {fmt(pgbl)} de {fmt(computed.limitePGBL)} (12% pró-labore)
              </p>
              <Progress value={computed.pgblPct} className="h-1.5" />
              {pgbl > computed.limitePGBL && (
                <p className="text-[10px] font-medium" style={{ color: "#F59E0B" }}>
                  ⚠️ PGBL excedeu 12% — excedente não dedutível
                </p>
              )}
            </div>
          )}

          {/* Carnê-leão */}
          {computed.temCarneLeao && (
            <div className="flex items-start gap-2 p-3 rounded-xl" style={{ backgroundColor: "rgba(245,158,11,0.1)" }}>
              <Info size={14} className="shrink-0 mt-0.5" style={{ color: "#F59E0B" }} />
              <p className="text-[11px] leading-relaxed" style={{ color: "#F59E0B" }}>
                Com pró-labore acima de R$ 2.259,20/mês, aplica-se o carnê-leão mensal (~{fmt(computed.irMensalEstimado)}/mês).
              </p>
            </div>
          )}

          {/* Result */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary/30">
            <p className="text-[11px] text-muted-foreground">
              Renda total: <span className="font-bold text-foreground">{fmt(computed.proLaboreAnual + computed.distLucrosAnual)}</span>
              {" "}· Tributável: <span className="font-bold text-foreground">{fmt(computed.proLaboreAnual)}</span>
              {" "}· Alíquota efetiva: <span className="font-bold text-primary">{computed.proLaboreAnual > 0 ? ((computed.irDevido / computed.proLaboreAnual) * 100).toFixed(1) : "0.0"}%</span>
            </p>
          </div>
        </section>
      )}
    </div>
  );
};

export default IRModoPJ;
