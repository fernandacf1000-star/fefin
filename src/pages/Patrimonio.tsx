import { useState, useMemo } from "react";
import { Info, TrendingUp } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const fmtPct = (v: number) => (v * 100).toFixed(1) + "%";

// Tabela regressiva PGBL — tempo de acumulação a partir de hoje
// Com 10+ anos: 10%. Usamos 10% pois tempo de acumulação já é longo.
function irPGBL(anos: number): number {
  if (anos >= 10) return 0.10;
  if (anos >= 8)  return 0.15;
  if (anos >= 6)  return 0.20;
  if (anos >= 4)  return 0.25;
  if (anos >= 2)  return 0.30;
  return 0.35;
}

function projetar(saldo: number, aporteAnual: number, anos: number, rentReal: number, aumentoAnual: number): number {
  let s = saldo;
  let a = aporteAnual;
  for (let i = 0; i < Math.round(anos); i++) {
    s = s * (1 + rentReal) + a;
    a *= (1 + aumentoAnual);
  }
  return s;
}

const IPCA_DEFAULT = 4.5; // % — meta BCB longo prazo

export default function Patrimonio() {
  // Inputs
  const [saldoPGBL, setSaldoPGBL]         = useState(1324846.88);
  const [aporteMensalPGBL, setAporteMensalPGBL] = useState(6341.44);
  const [aporteBonusAnual, setAporteBonusAnual] = useState(18954.35);
  const [saldoFGTS, setSaldoFGTS]         = useState(392261.93);
  const [salarioBruto, setSalarioBruto]   = useState(52845.28);

  // String states para formatação automática dos campos de valor
  const toFmt = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const [pgblStr, setPgblStr]         = useState(toFmt(1324846.88));
  const [aporteStr, setAporteStr]     = useState(toFmt(6341.44));
  const [bonusStr, setBonusStr]       = useState(toFmt(18954.35));
  const [fgtsStr, setFgtsStr]         = useState(toFmt(392261.93));
  const [salarioStr, setSalarioStr]   = useState(toFmt(52845.28));

  const [idadeAposentadoria, setIdadeAposentadoria] = useState(55);
  const [rentPGBLRealPct, setRentPGBLRealPct] = useState(4.0); // IPCA + X%
  const [aumentoAportesPct, setAumentoAportesPct] = useState(4.5); // % aa aumento aportes
  const [ipcaPct, setIpcaPct]             = useState(IPCA_DEFAULT);
  const [aporteBonus, setAporteBonus]     = useState(25000);   // aporte anual do bônus
  const [aumentoBonusPct, setAumentoBonus] = useState(4.5);   // reajuste anual do bônus %

  // Constantes
  const IDADE_ATUAL = 43.4;
  const ANOS_FGTS_REAL = -1.0; // FGTS rende abaixo da inflação (TR + 3% - IPCA)
  const FGTS_NOMINAL = 3.0;    // TR + 3% aa

  const anosAteAposentadoria = useMemo(() =>
    Math.max(0, idadeAposentadoria - IDADE_ATUAL),
  [idadeAposentadoria]);

  const aporteAnualPGBL = aporteMensalPGBL * 12 + aporteBonusAnual;
  const fgtsAnual       = salarioBruto * 0.08 * 12;

  const rentPGBLReal = rentPGBLRealPct / 100;
  const aumentoAportes = aumentoAportesPct / 100;
  const fgtsReal = (FGTS_NOMINAL - ipcaPct) / 100;

  // Cenários PGBL
  const cenarios = useMemo(() => {
    return [
      { label: `IPCA + ${(rentPGBLRealPct - 1).toFixed(0)}%`, rent: rentPGBLReal - 0.01 },
      { label: `IPCA + ${rentPGBLRealPct.toFixed(0)}%`,       rent: rentPGBLReal },
      { label: `IPCA + ${(rentPGBLRealPct + 1).toFixed(0)}%`, rent: rentPGBLReal + 0.01 },
    ].map(c => {
      const aporteTotal       = aporteAnualPGBL + aporteBonus;
      const brutoCte    = projetar(saldoPGBL, aporteTotal, anosAteAposentadoria, c.rent, 0);
      const brutoAument = projetar(saldoPGBL, aporteTotal, anosAteAposentadoria, c.rent, Math.max(aumentoAportes, aumentoBonusPct / 100));
      const ir = irPGBL(anosAteAposentadoria);
      return {
        label: c.label,
        brutoCte,
        brutoAument,
        liqCte:    brutoCte    * (1 - ir),
        liqAument: brutoAument * (1 - ir),
        ir,
      };
    });
  }, [saldoPGBL, aporteAnualPGBL, anosAteAposentadoria, rentPGBLReal, aumentoAportes]);

  // FGTS projeção
  const fgtsProj = useMemo(() => ({
    nominal: projetar(saldoFGTS, fgtsAnual, anosAteAposentadoria, FGTS_NOMINAL / 100, aumentoAportes),
    real:    projetar(saldoFGTS, fgtsAnual, anosAteAposentadoria, fgtsReal, aumentoAportes),
  }), [saldoFGTS, fgtsAnual, anosAteAposentadoria, fgtsReal, aumentoAportes]);

  // Cenário central (moderado)
  const central = cenarios[1];
  const totalBruto  = central.brutoAument + fgtsProj.real;
  const totalLiquido = central.liqAument  + fgtsProj.real; // FGTS isento na aposentadoria

  const [abaAtiva, setAbaAtiva] = useState<"simulacao" | "inputs">("simulacao");

  const SliderRow = ({ label, value, onChange, min, max, step = 0.5, suffix = "%" }: any) => (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-[12px] text-muted-foreground">{label}</span>
        <span className="text-[12px] font-bold text-foreground">{value.toFixed(1)}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full accent-primary" />
    </div>
  );

  return (
    <div className="gradient-bg min-h-screen pb-28">
      <BottomNav />
      <div className="max-w-lg mx-auto px-4 pt-14 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">Projeção Patrimônio</h1>
            <p className="text-[11px] text-muted-foreground">
              Aposentadoria aos {idadeAposentadoria} anos · {anosAteAposentadoria.toFixed(1)} anos restantes
            </p>
          </div>
          <TrendingUp size={22} className="text-primary" />
        </div>

        {/* Abas */}
        <div className="flex gap-1 p-1 rounded-xl bg-[#E8ECF5]">
          {(["simulacao", "inputs"] as const).map(a => (
            <button key={a} onClick={() => setAbaAtiva(a)}
              className={`flex-1 py-2 rounded-lg text-[11px] font-semibold transition-all ${abaAtiva === a ? "bg-white shadow-sm text-foreground" : "text-muted-foreground"}`}>
              {a === "simulacao" ? "📊 Simulação" : "⚙️ Parâmetros"}
            </button>
          ))}
        </div>

        {abaAtiva === "inputs" && (
          <div className="space-y-4">

            {/* Saldos */}
            <div className="glass-card p-4 space-y-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Saldos atuais</p>
              {([
                { label: "Saldo PGBL", valStr: pgblStr, setStr: setPgblStr, setNum: setSaldoPGBL },
                { label: "Aporte mensal PGBL", valStr: aporteStr, setStr: setAporteStr, setNum: setAporteMensalPGBL },
                { label: "Aporte anual bônus no PGBL", valStr: bonusStr, setStr: setBonusStr, setNum: setAporteBonusAnual },
                { label: "Saldo FGTS", valStr: fgtsStr, setStr: setFgtsStr, setNum: setSaldoFGTS },
                { label: "Salário bruto mensal", valStr: salarioStr, setStr: setSalarioStr, setNum: setSalarioBruto },
              ] as const).map((row: any) => (
                <div key={row.label} className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{row.label}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                    <input
                      type="text"
                      value={row.valStr}
                      onChange={e => {
                        const digits = e.target.value.replace(/\D/g, "");
                        if (!digits) { row.setStr(""); row.setNum(0); return; }
                        const num = parseInt(digits, 10) / 100;
                        row.setStr(num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                        row.setNum(num);
                      }}
                      className="w-full bg-[#E8ECF5] border-0 rounded-xl pl-9 py-2.5 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      inputMode="numeric"
                      placeholder="0,00"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Parâmetros */}
            <div className="glass-card p-4 space-y-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Parâmetros da simulação</p>

              {/* Idade aposentadoria */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Idade de aposentadoria</label>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    value={idadeAposentadoria || ""}
                    onChange={e => setIdadeAposentadoria(parseInt(e.target.value) || 55)}
                    className="w-full bg-[#E8ECF5] border-0 rounded-xl px-4 py-2.5 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    inputMode="numeric"
                    placeholder="55"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">anos</span>
                </div>
              </div>

              {/* % inputs */}
              {([
                { label: "Rentabilidade real PGBL (acima do IPCA)", val: rentPGBLRealPct, set: setRentPGBLRealPct },
                { label: "Aumento anual dos aportes", val: aumentoAportesPct, set: setAumentoAportesPct },
                { label: "IPCA assumido (meta longo prazo)", val: ipcaPct, set: setIpcaPct },
              ] as const).map((row: any) => (
                <div key={row.label} className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{row.label}</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={row.val || ""}
                      onChange={e => row.set(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#E8ECF5] border-0 rounded-xl px-4 py-2.5 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      inputMode="decimal"
                      placeholder="0.0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">% aa</span>
                  </div>
                </div>
              ))}

              {/* Bônus */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Aporte anual do bônus no PGBL</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                  <input
                    type="number" step="1000" value={aporteBonus || ""}
                    onChange={e => setAporteBonus(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#E8ECF5] border-0 rounded-xl pl-9 py-2.5 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    inputMode="decimal" placeholder="0,00"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Reajuste anual do bônus</label>
                <div className="relative">
                  <input
                    type="number" step="0.1" value={aumentoBonusPct || ""}
                    onChange={e => setAumentoBonus(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#E8ECF5] border-0 rounded-xl px-4 py-2.5 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    inputMode="decimal" placeholder="0.0"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">% aa</span>
                </div>
              </div>


              <div className="rounded-xl p-3" style={{ background: "rgba(99,102,241,0.06)" }}>
                <p className="text-[11px] text-muted-foreground">
                  FGTS: TR + 3% aa nominal (~{(FGTS_NOMINAL - ipcaPct).toFixed(1)}% real). Isento de IR na aposentadoria.
                </p>
              </div>
            </div>
          </div>
        )}

        {abaAtiva === "simulacao" && (
          <div className="space-y-3">

            {/* Aviso */}
            <div className="glass-card p-3 flex gap-2 items-start">
              <Info size={14} className="text-primary mt-0.5 shrink-0" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Valores em reais de hoje (já descontada inflação de {ipcaPct}% aa). PGBL: tabela regressiva {irPGBL(anosAteAposentadoria) * 100}% de IR na saída (acumulação &gt;10 anos). FGTS: isento de IR por aposentadoria.
              </p>
            </div>

            {/* Destaque total */}
            <div className="glass-card p-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Cenário moderado · PGBL + FGTS · aportes +{aumentoAportesPct}%/ano · bônus +{aumentoBonusPct}%/ano
              </p>
              <div className="flex gap-4">
                <div className="flex-1">
                  <p className="text-[11px] text-muted-foreground">Bruto total</p>
                  <p className="text-xl font-bold text-foreground">{fmt(totalBruto)}</p>
                </div>
                <div className="flex-1">
                  <p className="text-[11px] text-muted-foreground">Líquido total</p>
                  <p className="text-xl font-bold text-green-600">{fmt(totalLiquido)}</p>
                </div>
              </div>
            </div>

            {/* PGBL cenários */}
            <div className="glass-card p-4 space-y-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                PGBL — 3 cenários de rentabilidade · IR saída {irPGBL(anosAteAposentadoria) * 100}%
              </p>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {cenarios.map((c, i) => (
                  <div key={i} className={`rounded-xl p-2.5 text-center ${i === 1 ? "bg-primary/10 ring-1 ring-primary/30" : "bg-[#E8ECF5]"}`}>
                    <p className="text-[9px] font-semibold text-muted-foreground mb-1">{c.label}</p>
                    <p className="text-[11px] font-bold text-foreground">{fmt(c.liqCte)}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">sem aumento</p>
                    <div className="h-px bg-border/40 my-1.5" />
                    <p className="text-[11px] font-bold text-green-600">{fmt(c.liqAument)}</p>
                    <p className="text-[9px] text-muted-foreground">+{aumentoAportesPct}%/ano</p>
                  </div>
                ))}
              </div>
              <div className="text-[10px] text-muted-foreground space-y-0.5 pt-1 border-t border-[#E8ECF5]">
                <div className="flex justify-between"><span>Saldo atual</span><span className="font-semibold">{fmt(saldoPGBL)}</span></div>
                <div className="flex justify-between"><span>Aporte mensal salário</span><span className="font-semibold">{fmt(aporteMensalPGBL)}</span></div>
                <div className="flex justify-between"><span>Aporte anual bônus</span><span className="font-semibold">{fmt(aporteBonus)}</span></div>
                <div className="flex justify-between"><span>Aporte anual total</span><span className="font-semibold">{fmt(aporteAnualPGBL + aporteBonus)}</span></div>
              </div>
            </div>

            {/* FGTS */}
            <div className="glass-card p-4 space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                FGTS — TR + 3% aa · Isento de IR
              </p>
              <div className="flex justify-between items-center py-1 border-b border-[#E8ECF5]">
                <span className="text-[12px] text-muted-foreground">Saldo atual</span>
                <span className="text-[12px] font-bold">{fmt(saldoFGTS)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[#E8ECF5]">
                <span className="text-[12px] text-muted-foreground">Depósito anual atual (8% salário)</span>
                <span className="text-[12px] font-bold">{fmt(fgtsAnual)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[#E8ECF5]">
                <span className="text-[12px] text-muted-foreground">Projetado nominal</span>
                <span className="text-[12px] font-bold">{fmt(fgtsProj.nominal)}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-[12px] font-semibold text-foreground">Projetado em R$ de hoje</span>
                <span className="text-[12px] font-bold text-blue-500">{fmt(fgtsProj.real)}</span>
              </div>
              <div className="rounded-xl p-2.5 mt-1" style={{ background: "rgba(239,68,68,0.06)" }}>
                <p className="text-[10px]" style={{ color: "#EF4444" }}>
                  ⚠️ FGTS rende {(FGTS_NOMINAL - ipcaPct).toFixed(1)}% real — abaixo da inflação. O saldo real pode encolher ao longo do tempo.
                </p>
              </div>
            </div>

            {/* Resgatar */}
            <div className="glass-card p-4 space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Estratégia de resgate PGBL (cenário moderado)
              </p>
              {[
                { label: "Resgate total de uma vez (bruto)", val: central.brutoAument },
                { label: `IR 10% na saída`, val: -central.brutoAument * 0.10 },
                { label: "Líquido após IR", val: central.liqAument, bold: true },
                { label: "Renda mensal equivalente (20 anos)", val: central.liqAument / (20 * 12) },
              ].map((row, i) => (
                <div key={i} className="flex justify-between items-center py-1 border-b border-[#E8ECF5] last:border-0">
                  <span className={`text-[12px] ${row.bold ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{row.label}</span>
                  <span className={`text-[12px] font-bold ${row.val < 0 ? "text-red-500" : row.bold ? "text-green-600" : "text-foreground"}`}>
                    {fmt(Math.abs(row.val))}
                  </span>
                </div>
              ))}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
