import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const FAIXAS_ANUAIS_2026 = [
  { ate: 60000.00,   aliquota: 0,     deducao: 0 },
  { ate: 75669.24,   aliquota: 0.075, deducao: 4500.00 },
  { ate: 101887.68,  aliquota: 0.15,  deducao: 10164.69 },
  { ate: 122957.04,  aliquota: 0.225, deducao: 17716.21 },
  { ate: Infinity,   aliquota: 0.275, deducao: 23852.73 },
];

function calcRedutorAnual(rendaBruta: number): number {
  if (rendaBruta <= 60000) return 0;
  if (rendaBruta <= 88200) return Math.max(0, 11743.44 - 0.133145 * rendaBruta);
  return 0;
}

function calcIRAnual(baseCalculo: number): number {
  if (baseCalculo <= 0) return 0;
  for (const faixa of FAIXAS_ANUAIS_2026) {
    if (baseCalculo <= faixa.ate) {
      const ir = baseCalculo * faixa.aliquota - faixa.deducao;
      const redutor = calcRedutorAnual(baseCalculo);
      return Math.max(0, ir - redutor);
    }
  }
  return 0;
}

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

interface DadosMes {
  salarioBruto: number;
  bonus: number;
  irPago: number;
  inss: number;
  pgbl: number;
  planoDeSaude: number;
  despesasMedicas: number;
  doacoes: number;
}

const VAZIO: DadosMes = { salarioBruto: 0, bonus: 0, irPago: 0, inss: 0, pgbl: 0, planoDeSaude: 0, despesasMedicas: 0, doacoes: 0 };

const DADOS_INICIAIS: Record<number, DadosMes> = {};

export default function IR() {
  const anoAtual = new Date().getFullYear();
  const [ano, setAno] = useState(anoAtual);
  const [dados, setDados] = useState<Record<number, DadosMes>>(DADOS_INICIAIS);
  const [mesEditando, setMesEditando] = useState<number | null>(null);
  const [form, setForm] = useState<DadosMes>(VAZIO);
  const [abaAtiva, setAbaAtiva] = useState<"tabela" | "projecao" | "incentivos">("tabela");

  const getMes = (m: number): DadosMes => dados[m] || VAZIO;

  const totais = useMemo(() => {
    let salario = 0, bonus = 0, irPago = 0, inss = 0, pgbl = 0, saude = 0, medicas = 0, doacoes = 0, fgts = 0;
    for (let m = 0; m < 12; m++) {
      const d = getMes(m);
      salario  += d.salarioBruto;
      bonus    += d.bonus;
      irPago   += d.irPago;
      inss     += d.inss;
      pgbl     += d.pgbl;
      saude    += d.planoDeSaude;
      medicas  += d.despesasMedicas;
      doacoes  += d.doacoes;
      fgts     += d.salarioBruto * 0.08;
    }
    return { salario, bonus, irPago, inss, pgbl, saude, medicas, doacoes, fgts };
  }, [dados]);

  const projecao = useMemo(() => {
    const salarioProjetado  = totais.salario;
    const pgblProjetado     = totais.pgbl;
    const saudeProjetado    = totais.saude;
    const medicasProjetado  = totais.medicas;
    const doacoesProjetado  = totais.doacoes;
    const inssProjetado     = totais.inss;
    const limPGBL = salarioProjetado * 0.12;
    const pgblDedutivel = Math.min(pgblProjetado, limPGBL);
    const base = Math.max(0, salarioProjetado - inssProjetado - pgblDedutivel - saudeProjetado - medicasProjetado - doacoesProjetado);
    const irProjetado = calcIRAnual(base);
    const irPagoAteAgora = totais.irPago;
    const saldoIR = irProjetado - irPagoAteAgora;
    const pgblRestante = Math.max(0, limPGBL - pgblProjetado);
    const baseComPGBLMax = Math.max(0, base - pgblRestante);
    const economiaIRPGBL = irProjetado - calcIRAnual(baseComPGBLMax);
    return { base, irProjetado, irPagoAteAgora, saldoIR, pgblRestante, economiaIRPGBL, limPGBL, pgblDedutivel };
  }, [totais]);

  const doacoes = useMemo(() => {
    const ir = projecao.irProjetado;
    return {
      tetoConjunto6pct: ir * 0.06,
      esporte7pct: ir * 0.07,
      pronon1pct: ir * 0.01,
      pronas1pct: ir * 0.01,
    };
  }, [projecao]);

  const abrirEdicao = (m: number) => {
    setForm({ ...getMes(m) });
    setMesEditando(m);
  };

  const salvarEdicao = () => {
    if (mesEditando === null) return;
    setDados(prev => ({ ...prev, [mesEditando]: { ...form } }));
    setMesEditando(null);
  };

  const handleNum = (field: keyof DadosMes, val: string) => {
    const n = parseFloat(val) || 0;
    setForm(prev => ({ ...prev, [field]: n }));
  };

  return (
    <div className="gradient-bg min-h-screen pb-28">
      <BottomNav />
      <div className="max-w-lg mx-auto px-4 pt-14 space-y-4">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">Imposto de Renda</h1>
            <p className="text-[11px] text-muted-foreground">Planejamento {ano}</p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setAno(a => a - 1)} className="w-8 h-8 rounded-full bg-white border border-border flex items-center justify-center text-muted-foreground"><ChevronLeft size={15} /></button>
            <span className="text-sm font-bold text-foreground w-12 text-center">{ano}</span>
            <button onClick={() => setAno(a => a + 1)} className="w-8 h-8 rounded-full bg-white border border-border flex items-center justify-center text-muted-foreground"><ChevronRight size={15} /></button>
          </div>
        </div>

        <div className="flex gap-1 p-1 rounded-xl bg-[#E8ECF5]">
          {(["tabela", "projecao", "incentivos"] as const).map(aba => (
            <button key={aba} onClick={() => setAbaAtiva(aba)}
              className={`flex-1 py-2 rounded-lg text-[11px] font-semibold transition-all ${abaAtiva === aba ? "bg-white shadow-sm text-foreground" : "text-muted-foreground"}`}>
              {aba === "tabela" ? "📋 Mensal" : aba === "projecao" ? "📊 Projeção" : "🎁 Incentivos"}
            </button>
          ))}
        </div>

        {abaAtiva === "tabela" && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "IR pago", val: totais.irPago, color: "#EF4444" },
                { label: "FGTS acum.", val: totais.fgts, color: "#3B82F6" },
                { label: "PGBL aport.", val: totais.pgbl, color: "#8B5CF6" },
              ].map(c => (
                <div key={c.label} className="glass-card p-3 text-center">
                  <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide">{c.label}</p>
                  <p className="text-[13px] font-bold mt-1" style={{ color: c.color }}>{fmt(c.val)}</p>
                </div>
              ))}
            </div>

            <div className="glass-card p-4 space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Lançamentos por mês</p>
              {MESES.map((nome, m) => {
                const d = getMes(m);
                const temDados = d.salarioBruto > 0;
                const fgts = d.salarioBruto * 0.08;
                return (
                  <div key={m} onClick={() => abrirEdicao(m)}
                    className="flex items-center justify-between py-2.5 border-b border-[#E8ECF5] last:border-0 cursor-pointer active:opacity-70">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold ${temDados ? "bg-primary/10 text-primary" : "bg-[#E8ECF5] text-muted-foreground"}`}>
                        {nome}
                      </div>
                      <div>
                        {temDados ? (
                          <>
                            <p className="text-[12px] font-semibold text-foreground">{fmt(d.salarioBruto)}</p>
                            <p className="text-[10px] text-muted-foreground">IR {fmt(d.irPago)} · PGBL {fmt(d.pgbl)}</p>
                          </>
                        ) : (
                          <p className="text-[12px] text-muted-foreground">Clique para lançar</p>
                        )}
                      </div>
                    </div>
                    {temDados && (
                      <div className="text-right">
                        <p className="text-[11px] text-blue-500 font-semibold">FGTS {fmt(fgts)}</p>
                        <p className="text-[10px] text-muted-foreground">INSS {fmt(d.inss)}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="glass-card p-4 space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Total anual</p>
              {[
                { label: "Salário bruto", val: totais.salario },
                { label: "IR retido", val: totais.irPago, color: "#EF4444" },
                { label: "INSS", val: totais.inss },
                { label: "PGBL aportado", val: totais.pgbl, color: "#8B5CF6" },
                { label: "FGTS acumulado (8%)", val: totais.fgts, color: "#3B82F6" },
                { label: "Plano de saúde", val: totais.saude },
                { label: "Despesas médicas", val: totais.medicas },
                { label: "Doações", val: totais.doacoes },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center py-1 border-b border-[#E8ECF5] last:border-0">
                  <span className="text-[12px] text-muted-foreground">{row.label}</span>
                  <span className="text-[12px] font-bold" style={{ color: row.color || "#1E2A45" }}>{fmt(row.val)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {abaAtiva === "projecao" && (
          <div className="space-y-3">
            <div className="glass-card p-3 flex gap-2 items-start">
              <Info size={14} className="text-primary mt-0.5 shrink-0" />
              <p className="text-[11px] text-muted-foreground">
                Tabela IR 2026 (Lei 15.270/2025) · Isenção total até R$5.000/mês · Desconto gradual até R$7.350/mês · Bônus/PLR não entra na base (tributação exclusiva na fonte)
              </p>
            </div>

            <div className="glass-card p-4 space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Base de cálculo projetada</p>
              {[
                { label: "Salário bruto anual", val: totais.salario },
                { label: "(-) INSS", val: totais.inss, color: "#EF4444" },
                { label: `(-) PGBL dedutível (máx 12%)`, val: projecao.pgblDedutivel, color: "#8B5CF6" },
                { label: "(-) Plano de saúde", val: totais.saude, color: "#EF4444" },
                { label: "(-) Despesas médicas", val: totais.medicas, color: "#EF4444" },
                { label: "(-) Doações dedutíveis", val: totais.doacoes, color: "#EF4444" },
                { label: "= Base tributável", val: projecao.base, bold: true },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center py-1 border-b border-[#E8ECF5] last:border-0">
                  <span className={`text-[12px] ${(row as any).bold ? "font-bold text-foreground" : "text-muted-foreground"}`}>{row.label}</span>
                  <span className="text-[12px] font-bold" style={{ color: row.color || "#1E2A45" }}>{fmt(row.val)}</span>
                </div>
              ))}
            </div>

            <div className="glass-card p-4 space-y-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">IR anual</p>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">IR projetado (ano completo)</span>
                <span className="text-sm font-bold text-red-500">{fmt(projecao.irProjetado)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">IR já retido na fonte</span>
                <span className="text-sm font-bold text-green-600">{fmt(projecao.irPagoAteAgora)}</span>
              </div>
              <div className="h-px bg-[#E8ECF5]" />
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-foreground">
                  {projecao.saldoIR >= 0 ? "Saldo a pagar" : "Restituição estimada"}
                </span>
                <span className="text-lg font-bold" style={{ color: projecao.saldoIR >= 0 ? "#EF4444" : "#16A34A" }}>
                  {fmt(Math.abs(projecao.saldoIR))}
                </span>
              </div>
            </div>

            <div className="glass-card p-4 space-y-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Planejamento PGBL</p>
              <div className="flex justify-between">
                <span className="text-[12px] text-muted-foreground">Limite dedutível (12% do salário)</span>
                <span className="text-[12px] font-bold">{fmt(projecao.limPGBL)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[12px] text-muted-foreground">Já aportado</span>
                <span className="text-[12px] font-bold text-purple-600">{fmt(totais.pgbl)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[12px] font-semibold text-foreground">Restante para aportar</span>
                <span className="text-[12px] font-bold" style={{ color: projecao.pgblRestante > 0 ? "#8B5CF6" : "#16A34A" }}>
                  {fmt(projecao.pgblRestante)}
                </span>
              </div>
              {projecao.pgblRestante > 0 && (
                <div className="rounded-xl p-3" style={{ background: "rgba(139,92,246,0.08)" }}>
                  <p className="text-[11px] font-semibold" style={{ color: "#8B5CF6" }}>
                    💡 Aportar {fmt(projecao.pgblRestante)} no PGBL pode economizar {fmt(projecao.economiaIRPGBL)} em IR
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {abaAtiva === "incentivos" && (
          <div className="space-y-3">
            <div className="glass-card p-3 flex gap-2 items-start">
              <Info size={14} className="text-primary mt-0.5 shrink-0" />
              <p className="text-[11px] text-muted-foreground">
                Valores calculados sobre o IR anual projetado de {fmt(projecao.irProjetado)}. Doações devem ser feitas até 31/dez para deduzir no ano seguinte.
              </p>
            </div>

            <div className="glass-card p-4 space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Teto compartilhado — até 6% do IR</p>
                <span className="text-sm font-bold text-green-600">{fmt(doacoes.tetoConjunto6pct)}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">As leis abaixo competem entre si. O total não pode ultrapassar {fmt(doacoes.tetoConjunto6pct)}.</p>
              {["ECA / FIA — Criança e Adolescente", "Fundo do Idoso", "Lei Rouanet — Cultura", "Lei do Audiovisual"].map(lei => (
                <div key={lei} className="flex justify-between items-center py-2 border-b border-[#E8ECF5] last:border-0">
                  <span className="text-[12px] text-foreground">{lei}</span>
                  <span className="text-[10px] text-muted-foreground bg-[#E8ECF5] px-2 py-0.5 rounded-full">compartilha 6%</span>
                </div>
              ))}
            </div>

            <div className="glass-card p-4 space-y-2">
              <div className="flex justify-between items-center">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Lei do Esporte — até 7%</p>
                <span className="text-sm font-bold text-blue-500">{fmt(doacoes.esporte7pct)}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Limite próprio de 7%. Não concorre com o teto de 6% acima. (LC 222/2025)</p>
            </div>

            <div className="glass-card p-4 space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Saúde — limites independentes (+2%)</p>
              <p className="text-[10px] text-muted-foreground">Cada um tem 1% próprio, não concorre com os demais.</p>
              {[
                { nome: "PRONON — Oncologia", val: doacoes.pronon1pct },
                { nome: "PRONAS/PCD — Deficiência", val: doacoes.pronas1pct },
              ].map(lei => (
                <div key={lei.nome} className="flex justify-between items-center py-2 border-b border-[#E8ECF5] last:border-0">
                  <span className="text-[12px] text-foreground">{lei.nome}</span>
                  <span className="text-[12px] font-bold text-orange-500">{fmt(lei.val)}</span>
                </div>
              ))}
            </div>

            <div className="glass-card p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-foreground">Total máximo possível</span>
                <span className="text-lg font-bold text-green-600">{fmt(doacoes.tetoConjunto6pct + doacoes.esporte7pct + doacoes.pronon1pct + doacoes.pronas1pct)}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">6% (compartilhado) + 7% (esporte) + 1% PRONON + 1% PRONAS</p>
            </div>
          </div>
        )}
      </div>

      {mesEditando !== null && (
        <>
          <div className="fixed inset-0 z-[80] bg-black/25 backdrop-blur-sm" onClick={() => setMesEditando(null)} />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[90] max-h-[88vh] overflow-y-auto rounded-3xl bg-white shadow-xl border border-border">
            <div className="px-5 pt-5 pb-8 space-y-4">
              <h2 className="text-base font-bold text-foreground">{MESES[mesEditando]} {ano}</h2>
              {([
                { field: "salarioBruto" as const,    label: "Salário bruto" },
                { field: "bonus" as const,            label: "Bônus / PLR (separado)" },
                { field: "irPago" as const,           label: "IR retido na fonte" },
                { field: "inss" as const,             label: "INSS retido" },
                { field: "pgbl" as const,             label: "PGBL aportado" },
                { field: "planoDeSaude" as const,     label: "Plano de saúde (sua parte)" },
                { field: "despesasMedicas" as const,  label: "Despesas médicas" },
                { field: "doacoes" as const,          label: "Doações incentivadas" },
              ]).map(({ field, label }) => (
                <div key={field} className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{label}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={form[field] || ""}
                      onChange={e => handleNum(field, e.target.value)}
                      className="w-full bg-[#E8ECF5] border-0 rounded-xl pl-9 py-2.5 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      inputMode="decimal"
                      placeholder="0,00"
                    />
                  </div>
                  {field === "salarioBruto" && (form.salarioBruto || 0) > 0 && (
                    <p className="text-[10px] text-blue-500">FGTS calculado: {fmt((form.salarioBruto || 0) * 0.08)}</p>
                  )}
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setMesEditando(null)}
                  className="flex-1 py-3 rounded-xl bg-secondary text-muted-foreground text-sm font-semibold">
                  Cancelar
                </button>
                <button onClick={salvarEdicao}
                  className="flex-1 py-3 rounded-xl gradient-emerald text-white text-sm font-semibold">
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
