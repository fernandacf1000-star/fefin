import { useState, useMemo } from "react";
import { TrendingUp, Trophy, AlertTriangle, Lightbulb, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmt } from "@/hooks/useIRLancamentos";
import { useProfile } from "@/hooks/useProfile";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const ALIQUOTAS = [0, 7.5, 15, 22.5, 27.5];

// VGBL regressiva: 35%→10% every 2 years
const vgblAliquota = (anos: number): number => {
  if (anos <= 2) return 0.35;
  if (anos <= 4) return 0.30;
  if (anos <= 6) return 0.25;
  if (anos <= 8) return 0.20;
  if (anos <= 10) return 0.15;
  return 0.10;
};

interface Result {
  nome: string;
  bruto: number;
  liquido: number;
  imposto: number;
  cor: string;
}

const SimuladorPrevidencia = () => {
  const { data: profile } = useProfile();
  const [expanded, setExpanded] = useState(false);

  const [aporteMensal, setAporteMensal] = useState(1000);
  const [idadeAtual, setIdadeAtual] = useState(profile?.idade ?? 43);
  const [idadeApos, setIdadeApos] = useState(profile?.idade_aposentadoria ?? 55);
  const [aliqAtual] = useState(27.5);
  const [aliqApos, setAliqApos] = useState(profile?.aliquota_aposentadoria_estimada ?? 15);
  const [rentAnual, setRentAnual] = useState(10);

  const horizonte = Math.max(idadeApos - idadeAtual, 1);
  const meses = horizonte * 12;
  const taxaMensal = Math.pow(1 + rentAnual / 100, 1 / 12) - 1;

  const results = useMemo((): Result[] => {
    // Future value of monthly contributions
    const fv = aporteMensal * ((Math.pow(1 + taxaMensal, meses) - 1) / taxaMensal);
    const totalAportado = aporteMensal * meses;
    const rendimento = fv - totalAportado;

    // PGBL: deduction benefit reinvested
    const beneficioAnual = aporteMensal * 12 * (aliqAtual / 100);
    const beneficioMensal = beneficioAnual / 12;
    const fvBeneficio = beneficioMensal * ((Math.pow(1 + taxaMensal, meses) - 1) / taxaMensal);
    const brutoPGBL = fv + fvBeneficio;
    const impostoPGBL = brutoPGBL * (aliqApos / 100);
    const liqPGBL = brutoPGBL - impostoPGBL;

    // VGBL: IR only on rendimento
    const brutoVGBL = fv;
    const rendVGBL = brutoVGBL - totalAportado;
    const aliqVGBL = vgblAliquota(horizonte);
    const impostoVGBL = rendVGBL * aliqVGBL;
    const liqVGBL = brutoVGBL - impostoVGBL;

    // Aplicação comum (CDB/Tesouro) — 15% for long horizon
    const aliqApp = horizonte >= 2 ? 0.15 : horizonte >= 1 ? 0.175 : 0.225;
    const impostoApp = rendimento * aliqApp;
    const liqApp = fv - impostoApp;

    return [
      { nome: "PGBL", bruto: brutoPGBL, liquido: liqPGBL, imposto: impostoPGBL, cor: "hsl(var(--primary))" },
      { nome: "VGBL", bruto: brutoVGBL, liquido: liqVGBL, imposto: impostoVGBL, cor: "hsl(var(--chart-2))" },
      { nome: "CDB/Tesouro", bruto: fv, liquido: liqApp, imposto: impostoApp, cor: "hsl(var(--chart-4))" },
    ].sort((a, b) => b.liquido - a.liquido);
  }, [aporteMensal, meses, taxaMensal, aliqAtual, aliqApos, horizonte]);

  const melhor = results[0];
  const pior = results[results.length - 1];
  const diferenca = melhor.liquido - pior.liquido;

  // Dynamic recommendation
  const recomendacao = useMemo(() => {
    if (horizonte < 5) {
      return { icon: <AlertTriangle size={14} className="shrink-0 mt-0.5" style={{ color: "#F59E0B" }} />, text: "⚠️ Horizonte curto — PGBL e VGBL têm carência. Considere aplicações de liquidez diária.", bgClass: "bg-[hsl(var(--chart-4))]/10", textColor: "#F59E0B" };
    }
    if (aliqApos < aliqAtual && horizonte > 10) {
      return { icon: <Lightbulb size={14} className="text-primary shrink-0 mt-0.5" />, text: `💡 PGBL é vantajoso: você deduz hoje a ${aliqAtual}% e paga ${aliqApos}% no resgate. Com ${horizonte} anos de horizonte, o benefício compensa.`, bgClass: "bg-primary/10", textColor: undefined };
    }
    if (horizonte > 10 && aliqApos >= aliqAtual) {
      return { icon: <Lightbulb size={14} className="text-primary shrink-0 mt-0.5" />, text: `💡 VGBL pode ser melhor: sem dedução hoje, mas paga só ${(vgblAliquota(horizonte) * 100).toFixed(0)}% sobre os rendimentos no resgate após ${horizonte} anos.`, bgClass: "bg-primary/10", textColor: undefined };
    }
    return null;
  }, [horizonte, aliqAtual, aliqApos]);

  const chartData = results.map(r => ({ name: r.nome, value: r.liquido }));

  return (
    <section className="glass-card p-5 animate-fade-up" style={{ animationDelay: "0.25s" }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-primary" />
          <h2 className="text-sm font-semibold text-foreground">📈 Onde investir meu dinheiro?</h2>
        </div>
        {expanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="mt-4 space-y-4 animate-fade-up">
          {/* Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Aporte mensal (R$)</Label>
              <Input type="number" value={aporteMensal || ""} onChange={e => setAporteMensal(parseFloat(e.target.value) || 0)} className="bg-secondary/40 border-border/50" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Idade atual</Label>
              <Input type="number" value={idadeAtual} onChange={e => setIdadeAtual(parseInt(e.target.value) || 0)} className="bg-secondary/40 border-border/50" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Aposentadoria</Label>
              <Input type="number" value={idadeApos} onChange={e => setIdadeApos(parseInt(e.target.value) || 0)} className="bg-secondary/40 border-border/50" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Horizonte</Label>
              <Input type="text" value={`${horizonte} anos`} disabled className="bg-secondary/40 border-border/50" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Alíquota na apos. (%)</Label>
              <Select value={String(aliqApos)} onValueChange={v => setAliqApos(Number(v))}>
                <SelectTrigger className="bg-secondary/40 border-border/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALIQUOTAS.map(a => <SelectItem key={a} value={String(a)}>{a}%</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Rentabilidade a.a. (%)</Label>
              <Input type="number" step="0.5" value={rentAnual} onChange={e => setRentAnual(parseFloat(e.target.value) || 0)} className="bg-secondary/40 border-border/50" />
            </div>
          </div>

          {/* Chart */}
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 60, right: 10 }}>
                <XAxis type="number" tickFormatter={(v) => fmt(v)} tick={{ fontSize: 9 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={60} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {results.map((r, i) => (
                    <Cell key={i} fill={r.cor} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Result cards ranked */}
          <div className="space-y-2">
            {results.map((r, i) => (
              <div key={r.nome} className={`rounded-xl p-3 ${i === 0 ? "bg-primary/10 ring-1 ring-primary/30" : "bg-secondary/30"}`}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-foreground">{r.nome}</p>
                  {i === 0 && (
                    <span className="text-[9px] font-bold px-2.5 py-0.5 rounded-full bg-primary/15 text-primary flex items-center gap-1">
                      <Trophy size={10} /> Melhor opção
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 text-[10px]">
                  <div><p className="text-muted-foreground">Bruto</p><p className="font-semibold text-foreground tabular-nums">{fmt(r.bruto)}</p></div>
                  <div><p className="text-muted-foreground">IR estimado</p><p className="font-semibold text-foreground tabular-nums">{fmt(r.imposto)}</p></div>
                  <div><p className="text-muted-foreground">Líquido</p><p className={`font-bold tabular-nums ${i === 0 ? "text-primary" : "text-foreground"}`}>{fmt(r.liquido)}</p></div>
                </div>
              </div>
            ))}
          </div>

          {/* Difference */}
          <div className="rounded-xl bg-secondary/30 p-3 text-center">
            <p className="text-[11px] text-muted-foreground">
              Diferença entre melhor e pior: <span className="font-bold text-primary">{fmt(diferenca)}</span>
            </p>
          </div>

          {/* Recommendation */}
          {recomendacao && (
            <div className={`flex items-start gap-2 p-3 rounded-xl ${recomendacao.bgClass}`}>
              {recomendacao.icon}
              <p className="text-[11px] leading-relaxed" style={recomendacao.textColor ? { color: recomendacao.textColor } : undefined}>
                {recomendacao.text}
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default SimuladorPrevidencia;
