import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Info, Plus } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const FAIXAS_ANUAIS_2026 = [
  { ate: 60000.00,  aliquota: 0,     deducao: 0 },
  { ate: 75669.24,  aliquota: 0.075, deducao: 4500.00 },
  { ate: 101887.68, aliquota: 0.15,  deducao: 10164.69 },
  { ate: 122957.04, aliquota: 0.225, deducao: 17716.21 },
  { ate: Infinity,  aliquota: 0.275, deducao: 23852.73 },
];

function calcRedutorAnual(renda: number): number {
  if (renda <= 60000) return 0;
  if (renda <= 88200) return Math.max(0, 11743.44 - 0.133145 * renda);
  return 0;
}

function calcIRAnual(base: number): number {
  if (base <= 0) return 0;
  for (const f of FAIXAS_ANUAIS_2026) {
    if (base <= f.ate) {
      const ir = base * f.aliquota - f.deducao;
      return Math.max(0, ir - calcRedutorAnual(base));
    }
  }
  return 0;
}

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const fmtK = (v: number) => {
  if (v >= 1000) return "R$" + (v / 1000).toFixed(0) + "k";
  return fmt(v);
};

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

const VAZIO: DadosMes = {
  salarioBruto: 0, bonus: 0, irPago: 0, inss: 0,
  pgbl: 0, planoDeSaude: 0, despesasMedicas: 0, doacoes: 0,
};

const DADOS_INICIAIS: Record<number, DadosMes> = {
  2: { salarioBruto: 50005, bonus: 0, irPago: 9798.66, inss: 951.62, pgbl: 6000.60, planoDeSaude: 133, despesasMedicas: 0, doacoes: 0 },
};

export default function IR() {
  const [ano, setAno] = useState(new Date().getFullYear());
  const [dados, setDados] = useState<Record<number, DadosMes>>(DADOS_INICIAIS);
  const [mesEditando, setMesEditando] = useState<number | null>(null);
  const [form, setForm] = useState<DadosMes>(VAZIO);
  const [aba, setAba] = useState<"mensal" | "projecao" | "doacoes">("mensal");
  const [calendarOpen, setCalendarOpen] = useState(false);

  const getMes = (m: number): DadosMes => dados[m] || VAZIO;

  const totais = useMemo(() => {
    let sal = 0, bonus = 0, ir = 0, inss = 0, pgbl = 0, saude = 0, med = 0, doac = 0, fgts = 0;
    for (let m = 0; m < 12; m++) {
      const d = getMes(m);
      sal   += d.salarioBruto; bonus += d.bonus;   ir   += d.irPago;
      inss  += d.inss;         pgbl  += d.pgbl;    saude += d.planoDeSaude;
      med   += d.despesasMedicas; doac += d.doacoes;
      fgts  += d.salarioBruto * 0.08;
    }
    return { sal, bonus, ir, inss, pgbl, saude, med, doac, fgts };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dados]);

  const proj = useMemo(() => {
    const limPGBL = totais.sal * 0.12;
    const pgblDed = Math.min(totais.pgbl, limPGBL);
    const base = Math.max(0, totais.sal - totais.inss - pgblDed - totais.saude - totais.med - totais.doac);
    const irProj = calcIRAnual(base);
    const saldo = irProj - totais.ir;
    const pgblRest = Math.max(0, limPGBL - totais.pgbl);
    const baseComMax = Math.max(0, base - pgblRest);
    const economia = irProj - calcIRAnual(baseComMax);
    return { base, irProj, saldo, pgblRest, economia, limPGBL, pgblDed };
  }, [totais]);

  const doac = useMemo(() => ({
    conjunto6: proj.irProj * 0.06,
    esporte7:  proj.irProj * 0.07,
    pronon1:   proj.irProj * 0.01,
    pronas1:   proj.irProj * 0.01,
  }), [proj]);

  const abrirEdicao = (m: number) => { setForm({ ...getMes(m) }); setMesEditando(m); };
  const salvarEdicao = () => {
    if (mesEditando === null) return;
    setDados(prev => ({ ...prev, [mesEditando]: { ...form } }));
    setMesEditando(null);
  };
  const handleNum = (field: keyof DadosMes, val: string) => {
    const n = parseFloat(val) || 0;
    setForm(prev => ({ ...prev, [field]: n }));
  };

  const Row = ({ label, val, color, bold }: { label: string; val: number; color?: string; bold?: boolean }) => (
    <div className="flex justify-between items-center py-1.5" style={{ borderBottom: "0.5px solid hsl(var(--border))" }}>
      <span className={`text-xs ${bold ? "font-bold text-foreground" : "text-muted-foreground"}`}>{label}</span>
      <span className="text-xs font-bold tabular-nums" style={{ color: color || "hsl(var(--foreground))" }}>{fmt(val)}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      <BottomNav />
      <main className="flex-1 md:ml-[220px] pb-24 md:pb-8 px-4 pt-6 max-w-2xl mx-auto w-full">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-foreground">Imposto de Renda</h1>
            <p className="text-xs text-muted-foreground">Planejamento {ano}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setAno(a => a - 1)} className="w-8 h-8 rounded-full bg-white border border-border flex items-center justify-center">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-bold text-foreground">{ano}</span>
            <button onClick={() => setAno(a => a + 1)} className="w-8 h-8 rounded-full bg-white border border-border flex items-center justify-center">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Abas */}
        <div className="flex gap-1 p-1 rounded-xl bg-secondary/60 mb-4">
          {(["mensal","projecao","doacoes"] as const).map(a => (
            <button key={a} onClick={() => setAba(a)}
              className={`flex-1 py-2 rounded-lg text-[11px] font-semibold transition-all ${aba === a ? "bg-white shadow-sm text-foreground" : "text-muted-foreground"}`}>
              {a === "mensal" ? "📋 Mensal" : a === "projecao" ? "📊 Projeção" : "🎁 Doações"}
            </button>
          ))}
        </div>

        {/* ── ABA MENSAL ── */}
        {aba === "mensal" && (
          <div className="space-y-4">
            {/* KPIs */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "IR retido", val: totais.ir,   color: "#EF4444" },
                { label: "FGTS acum.", val: totais.fgts, color: "#3B82F6" },
                { label: "PGBL aport.", val: totais.pgbl, color: "#8B5CF6" },
              ].map(c => (
                <div key={c.label} className="rounded-xl bg-secondary/40 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground mb-0.5">{c.label}</p>
                  <p className="text-sm font-bold tabular-nums" style={{ color: c.color }}>{fmtK(c.val)}</p>
                </div>
              ))}
            </div>

            {/* Tabela compacta */}
            <div className="rounded-xl bg-white border border-border overflow-hidden">
              <p className="text-[10px] text-muted-foreground px-3 pt-2">Lançamentos mensais — clique para editar</p>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-muted-foreground" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                      <th className="text-left py-2 px-3 font-medium">Mês</th>
                      <th className="text-right py-2 px-2 font-medium">Salário</th>
                      <th className="text-right py-2 px-2 font-medium">IR</th>
                      <th className="text-right py-2 px-2 font-medium">FGTS</th>
                      <th className="text-right py-2 px-3 font-medium">PGBL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MESES.map((nome, m) => {
                      const d = getMes(m);
                      const tem = d.salarioBruto > 0;
                      const fgts = d.salarioBruto * 0.08;
                      return (
                        <tr key={m} onClick={() => abrirEdicao(m)}
                          style={{ borderBottom: "0.5px solid hsl(var(--border))", cursor: "pointer" }}
                          className="hover:bg-secondary/40 active:opacity-70 transition-colors">
                          <td className="py-2 px-3">
                            <span className="font-medium text-foreground">{nome}</span>
                            {!tem && <Plus size={10} className="inline ml-1 text-muted-foreground" />}
                          </td>
                          <td className="text-right py-2 px-2 tabular-nums text-foreground">
                            {tem ? fmtK(d.salarioBruto) : "—"}
                          </td>
                          <td className="text-right py-2 px-2 tabular-nums" style={{ color: "#EF4444" }}>
                            {tem ? fmtK(d.irPago) : "—"}
                          </td>
                          <td className="text-right py-2 px-2 tabular-nums" style={{ color: "#3B82F6" }}>
                            {tem ? fmtK(fgts) : "—"}
                          </td>
                          <td className="text-right py-2 px-3 tabular-nums" style={{ color: "#8B5CF6" }}>
                            {tem ? fmtK(d.pgbl) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="font-bold text-foreground" style={{ borderTop: "2px solid hsl(var(--border))" }}>
                      <td className="py-2 px-3">Total</td>
                      <td className="text-right py-2 px-2 tabular-nums">{fmtK(totais.sal)}</td>
                      <td className="text-right py-2 px-2 tabular-nums" style={{ color: "#EF4444" }}>{fmtK(totais.ir)}</td>
                      <td className="text-right py-2 px-2 tabular-nums" style={{ color: "#3B82F6" }}>{fmtK(totais.fgts)}</td>
                      <td className="text-right py-2 px-3 tabular-nums" style={{ color: "#8B5CF6" }}>{fmtK(totais.pgbl)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Detalhes adicionais */}
            <div className="rounded-xl bg-secondary/40 p-3">
              <p className="text-[10px] text-muted-foreground mb-1 font-semibold">Outros totais anuais</p>
              <Row label="Bônus / PLR" val={totais.bonus} />
              <Row label="INSS retido" val={totais.inss} />
              <Row label="Plano de saúde" val={totais.saude} />
              <Row label="Despesas médicas" val={totais.med} />
              <Row label="Doações incentivadas" val={totais.doac} />
            </div>
          </div>
        )}

        {/* ── ABA PROJEÇÃO ── */}
        {aba === "projecao" && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 p-3 rounded-xl bg-secondary/30">
              <Info size={14} className="text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Tabela IR 2026 (Lei 15.270/2025) · Isenção total até R$5.000/mês · Desconto gradual até R$7.350/mês · PLR não entra na base (tributação exclusiva na fonte)
              </p>
            </div>

            <div className="rounded-xl bg-white border border-border p-4">
              <p className="text-xs font-semibold text-foreground mb-2">Resultado estimado</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="rounded-lg bg-secondary/40 p-2.5">
                  <p className="text-[10px] text-muted-foreground">IR projetado no ano</p>
                  <p className="text-sm font-bold tabular-nums text-foreground">{fmt(proj.irProj)}</p>
                </div>
                <div className="rounded-lg bg-secondary/40 p-2.5">
                  <p className="text-[10px] text-muted-foreground">Já retido na fonte</p>
                  <p className="text-sm font-bold tabular-nums text-foreground">{fmt(totais.ir)}</p>
                </div>
              </div>
              <div className="rounded-xl p-3" style={{ backgroundColor: proj.saldo >= 0 ? "rgba(239,68,68,0.08)" : "rgba(22,163,74,0.08)" }}>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold" style={{ color: proj.saldo >= 0 ? "#EF4444" : "#16A34A" }}>
                    {proj.saldo >= 0 ? "Saldo a pagar (estimado)" : "Restituição estimada"}
                  </span>
                  <span className="text-lg font-bold tabular-nums" style={{ color: proj.saldo >= 0 ? "#EF4444" : "#16A34A" }}>
                    {fmt(Math.abs(proj.saldo))}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-secondary/40 p-3">
              <p className="text-[10px] text-muted-foreground mb-1 font-semibold">Como chegamos nisso</p>
              <Row label="Rendimentos brutos" val={totais.sal} bold />
              <Row label="(−) INSS" val={totais.inss} color="#EF4444" />
              <Row label="(−) PGBL dedutível" val={proj.pgblDed} color="#8B5CF6" />
              <Row label="(−) Plano de saúde" val={totais.saude} color="#EF4444" />
              <Row label="(−) Desp. médicas" val={totais.med} color="#EF4444" />
              <Row label="(−) Doações" val={totais.doac} color="#EF4444" />
              <Row label="= Base de cálculo" val={proj.base} bold />
            </div>

            <div className="rounded-xl bg-secondary/40 p-3">
              <p className="text-[10px] text-muted-foreground mb-1 font-semibold">Oportunidade PGBL</p>
              <Row label="Limite 12% da renda" val={proj.limPGBL} />
              <Row label="Já aportado" val={totais.pgbl} />
              <Row label="Espaço restante" val={proj.pgblRest} color={proj.pgblRest > 0 ? "#8B5CF6" : "#16A34A"} />
              {proj.pgblRest > 0 && (
                <div className="mt-2 p-2.5 rounded-lg bg-primary/10">
                  <p className="text-[11px] text-primary font-medium">
                    Aportar {fmt(proj.pgblRest)} no PGBL pode economizar {fmt(proj.economia)} em IR
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ABA DOAÇÕES ── */}
        {aba === "doacoes" && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 p-3 rounded-xl bg-secondary/30">
              <Info size={14} className="text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Valores sobre IR projetado de {fmt(proj.irProj)}. Doações até 31/dez deduzem no ajuste anual. Declare pelo modelo completo para aproveitar.
              </p>
            </div>

            <div className="rounded-xl bg-white border border-border p-4">
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs font-semibold text-foreground">Teto compartilhado — 6% do IR</p>
                <span className="text-sm font-bold tabular-nums text-foreground">{fmt(doac.conjunto6)}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mb-2">As leis abaixo competem entre si. O total das doações não pode ultrapassar {fmt(doac.conjunto6)}.</p>
              {[
                "ECA / FIA — Criança e Adolescente",
                "Fundo do Idoso",
                "Lei Rouanet — Cultura",
                "Lei do Audiovisual",
              ].map(lei => (
                <div key={lei} className="flex justify-between items-center py-1" style={{ borderBottom: "0.5px solid hsl(var(--border))" }}>
                  <span className="text-[11px] text-muted-foreground">{lei}</span>
                  <span className="text-[10px] text-muted-foreground/60">compartilha</span>
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-white border border-border p-4">
              <div className="flex justify-between items-center mb-1">
                <p className="text-xs font-semibold text-foreground">Lei do Esporte — 7%</p>
                <span className="text-sm font-bold tabular-nums text-foreground">{fmt(doac.esporte7)}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Limite próprio. Não concorre com o teto de 6%. (LC 222/2025)</p>
            </div>

            <div className="rounded-xl bg-white border border-border p-4">
              <p className="text-xs font-semibold text-foreground mb-1">Saúde — limites independentes</p>
              <p className="text-[10px] text-muted-foreground mb-2">Cada um tem 1% próprio, independente dos demais.</p>
              {[
                { nome: "PRONON — Oncologia",       val: doac.pronon1 },
                { nome: "PRONAS/PCD — Deficiência", val: doac.pronas1 },
              ].map(l => (
                <div key={l.nome} className="flex justify-between items-center py-1" style={{ borderBottom: "0.5px solid hsl(var(--border))" }}>
                  <span className="text-[11px] text-muted-foreground">{l.nome}</span>
                  <span className="text-xs font-bold tabular-nums text-foreground">{fmt(l.val)}</span>
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-primary/10 p-4">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-primary">Total máximo possível</span>
                <span className="text-sm font-bold tabular-nums text-primary">{fmt(doac.conjunto6 + doac.esporte7 + doac.pronon1 + doac.pronas1)}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">6% (compartilhado) + 7% (esporte) + 1% PRONON + 1% PRONAS</p>
            </div>
          </div>
        )}
      </main>

      {/* ── Modal edição ── */}
      {mesEditando !== null && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setMesEditando(null)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-2xl max-h-[85vh] overflow-y-auto p-5 animate-in slide-in-from-bottom">
            <div className="max-w-lg mx-auto space-y-4">
              <h2 className="text-base font-bold text-foreground">{MESES[mesEditando]} {ano}</h2>
              {([
                { field: "salarioBruto" as const,     label: "Salário bruto" },
                { field: "bonus" as const,             label: "Bônus / PLR" },
                { field: "irPago" as const,            label: "IR retido na fonte" },
                { field: "inss" as const,              label: "INSS retido" },
                { field: "pgbl" as const,              label: "PGBL aportado" },
                { field: "planoDeSaude" as const,      label: "Plano de saúde" },
                { field: "despesasMedicas" as const,   label: "Despesas médicas" },
                { field: "doacoes" as const,           label: "Doações incentivadas" },
              ]).map(({ field, label }) => (
                <div key={field}>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">{label}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                    <input
                      type="number"
                      value={form[field] || ""}
                      onChange={e => handleNum(field, e.target.value)}
                      className="w-full bg-secondary border-0 rounded-xl pl-9 py-2.5 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      inputMode="decimal"
                      placeholder="0,00"
                    />
                  </div>
                  {field === "salarioBruto" && (form.salarioBruto || 0) > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-1">FGTS calculado automaticamente: R${((form.salarioBruto || 0) * 0.08).toFixed(2)}</p>
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
