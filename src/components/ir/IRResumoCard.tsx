import { useMemo } from "react";
import { ArrowUp, ArrowDown, TrendingUp } from "lucide-react";
import { IRLancamento, calcularIRAnual, fmt } from "@/hooks/useIRLancamentos";

interface Props {
  lancamentos: IRLancamento[];
  ano: number;
}

const IRResumoCard = ({ lancamentos, ano }: Props) => {
  const computed = useMemo(() => {
    const totalRenda = lancamentos
      .filter((l) => l.tipo === "renda")
      .reduce((s, l) => s + Number(l.valor), 0);

    const totalIRRetido = lancamentos
      .filter((l) => l.tipo === "ir_retido")
      .reduce((s, l) => s + Number(l.valor), 0);

    const totalINSS = lancamentos
      .filter((l) => l.tipo === "inss")
      .reduce((s, l) => s + Number(l.valor), 0);

    const totalSaude = lancamentos
      .filter((l) => l.tipo === "saude")
      .reduce((s, l) => s + Number(l.valor), 0);

    const totalPGBL = lancamentos
      .filter((l) => l.tipo === "pgbl")
      .reduce((s, l) => s + Number(l.valor), 0);

    const totalOutro = lancamentos
      .filter((l) => l.tipo === "outro")
      .reduce((s, l) => s + Number(l.valor), 0);

    const totalDeducoes = totalINSS + totalSaude + totalPGBL + totalOutro;
    const baseCalculo = totalRenda - totalDeducoes;
    const irDevido = calcularIRAnual(baseCalculo);
    const resultado = irDevido - totalIRRetido;

    // Count unique months with renda entries
    const mesesLancados = new Set(
      lancamentos.filter((l) => l.tipo === "renda" && l.mes).map((l) => l.mes)
    ).size;
    // If no monthly breakdown (consolidated), count as 12
    const mesesEfetivos = mesesLancados > 0 ? mesesLancados : (totalRenda > 0 ? 12 : 0);

    const projecao12 = mesesEfetivos > 0 && mesesEfetivos < 12
      ? (totalRenda / mesesEfetivos) * 12
      : null;

    const descontoSimplificado = Math.min(totalRenda * 0.2, 16754.34);
    const modelo = totalDeducoes > descontoSimplificado ? "Completo" : "Simplificado";

    return {
      totalRenda, totalIRRetido, totalINSS, totalSaude, totalPGBL,
      totalOutro, totalDeducoes, baseCalculo, irDevido, resultado,
      mesesEfetivos, projecao12, modelo, descontoSimplificado,
    };
  }, [lancamentos]);

  const statusBadge = computed.resultado > 0
    ? { label: "A pagar", bgClass: "bg-destructive/15", textClass: "text-destructive" }
    : { label: "A restituir", bgClass: "bg-primary/15", textClass: "text-primary" };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">📊 Resumo do IR {ano}</h3>
        <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full ${statusBadge.bgClass} ${statusBadge.textClass}`}>
          {statusBadge.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-secondary/40 p-3">
          <p className="text-[10px] text-muted-foreground mb-0.5">Rendimentos acumulados</p>
          <p className="text-sm font-bold text-foreground tabular-nums">{fmt(computed.totalRenda)}</p>
        </div>
        <div className="rounded-xl bg-secondary/40 p-3">
          <p className="text-[10px] text-muted-foreground mb-0.5">IR retido acumulado</p>
          <p className="text-sm font-bold text-foreground tabular-nums">{fmt(computed.totalIRRetido)}</p>
        </div>
        <div className="rounded-xl bg-secondary/40 p-3">
          <p className="text-[10px] text-muted-foreground mb-0.5">Total deduções</p>
          <p className="text-sm font-bold text-foreground tabular-nums">{fmt(computed.totalDeducoes)}</p>
        </div>
        <div className="rounded-xl bg-secondary/40 p-3">
          <p className="text-[10px] text-muted-foreground mb-0.5">Base de cálculo</p>
          <p className="text-sm font-bold text-foreground tabular-nums">{fmt(computed.baseCalculo)}</p>
        </div>
      </div>

      <div className="rounded-xl bg-secondary/40 p-3">
        <p className="text-[10px] text-muted-foreground mb-0.5">IR devido estimado ({computed.modelo})</p>
        <p className="text-sm font-bold text-foreground tabular-nums">{fmt(computed.irDevido)}</p>
      </div>

      {/* Projeção 12 meses */}
      {computed.projecao12 && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary/30">
          <TrendingUp size={14} className="text-muted-foreground shrink-0" />
          <p className="text-[11px] text-muted-foreground">
            Projeção 12 meses: <span className="font-bold text-foreground">{fmt(computed.projecao12)}</span>
          </p>
        </div>
      )}

      {/* Resultado */}
      {computed.resultado > 0 ? (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10">
          <ArrowUp size={16} className="text-destructive shrink-0" />
          <p className="text-sm font-bold tabular-nums text-destructive">
            Estimativa a pagar: {fmt(computed.resultado)}
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/10">
          <ArrowDown size={16} className="text-primary shrink-0" />
          <p className="text-sm font-bold tabular-nums text-primary">
            Estimativa a restituir: {fmt(Math.abs(computed.resultado))}
          </p>
        </div>
      )}

      {computed.mesesEfetivos > 0 && (
        <p className="text-[10px]" style={{ color: "#475569" }}>
          📅 Estimativa baseada em {computed.mesesEfetivos} {computed.mesesEfetivos === 1 ? "mês" : "meses"}
        </p>
      )}
    </div>
  );
};

export default IRResumoCard;
