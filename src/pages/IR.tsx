import { useState } from "react";
import BottomNav from "@/components/BottomNav";
import {
  FileText, TrendingDown, TrendingUp, CheckCircle2, Award,
  Heart, ShieldCheck, Gift, Info, Calendar, ArrowDown, ArrowUp,
  RotateCcw, ChevronDown, ChevronUp, Users, AlertTriangle,
} from "lucide-react";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/* ── Tabela progressiva IRPF 2025 (anual) ── */
const calcularIRAnual = (baseCalculo: number): number => {
  if (baseCalculo <= 26963.20) return 0;
  if (baseCalculo <= 33919.80) return baseCalculo * 0.075 - 2023.74;
  if (baseCalculo <= 45012.60) return baseCalculo * 0.15 - 4590.72;
  if (baseCalculo <= 55976.16) return baseCalculo * 0.225 - 7968.21;
  return baseCalculo * 0.275 - 10773.45;
};

/* ── Dados reais ── */
const rendimentosBrutos = 970379.22;
const inssOficial = 11419.44;
const pgblItau = 114110.92;
const planoSaude = 1596.0;
const irRetidoFonte = 219789.77;
const baseCalculoCompleto = rendimentosBrutos - inssOficial - pgblItau - planoSaude;
const irDevidoEstimado = calcularIRAnual(baseCalculoCompleto);
const saldoPagar = irDevidoEstimado - irRetidoFonte;

/* Modelo de declaração */
const descontoSimplificado = Math.min(rendimentosBrutos * 0.2, 16754.34);
const deducoesReais = inssOficial + pgblItau + planoSaude; // 127.126,36
const modeloRecomendado = deducoesReais > descontoSimplificado ? "Completo" : "Simplificado";

/* Deduções */
const deducoes = [
  { label: "INSS oficial", desc: "Contribuição previdenciária", valor: inssOficial, limite: "Sem limite", icon: ShieldCheck },
  { label: "PGBL Itaú Vida", desc: "Até 12% da renda bruta", valor: pgblItau, limite: fmt(rendimentosBrutos * 0.12), icon: ShieldCheck },
  { label: "Plano de saúde Omint", desc: "Titular apenas", valor: planoSaude, limite: "Sem limite", icon: Heart },
];
const totalDeducoes = deducoes.reduce((s, d) => s + d.valor, 0);

/* Doações incentivadas */
const limiteTotal = 13267.27;
const jaDoado = 0;
const saldoDisponivel = limiteTotal - jaDoado;

/* Histórico DARF */
const historicoDARF = [
  {
    ano: 2025,
    status: "Restituição recebida" as const,
    darfTotal: 5200,
    impostoNormal: 3700,
    doacaoIncentivada: 1500,
    restituicao: 1820,
    ganhoSelic: 180,
  },
  {
    ano: 2024,
    status: "Entregue" as const,
    darfTotal: 4800,
    impostoNormal: 4800,
    doacaoIncentivada: 0,
    restituicao: 920,
    ganhoSelic: 0,
  },
  {
    ano: 2023,
    status: "Entregue" as const,
    darfTotal: 4200,
    impostoNormal: 4200,
    doacaoIncentivada: 0,
    restituicao: 650,
    ganhoSelic: 0,
  },
  {
    ano: 2022,
    status: "A pagar" as const,
    darfTotal: 3900,
    impostoNormal: 3900,
    doacaoIncentivada: 0,
    restituicao: 0,
    ganhoSelic: 0,
  },
];

const IR = () => {
  const [conjuntaExpanded, setConjuntaExpanded] = useState(false);

  return (
    <div className="min-h-screen gradient-bg overflow-x-hidden pb-[90px]">
      <div className="px-4 pt-12 space-y-5 w-full">
        <h1 className="text-xl font-semibold text-foreground animate-fade-up">Imposto de Renda</h1>

        {/* 1 — Resumo Fiscal */}
        <section className="glass-card p-5 animate-fade-up" style={{ animationDelay: "0.05s" }}>
          <div className="flex items-center gap-2 mb-3">
            <FileText size={16} className="text-primary" />
            <span className="text-xs text-muted-foreground font-medium">Ano fiscal 2026</span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl bg-secondary/40 p-3">
              <p className="text-[11px] text-muted-foreground mb-0.5">Rendimentos tributáveis</p>
              <p className="text-sm font-bold text-foreground tabular-nums">{fmt(rendimentosBrutos)}</p>
            </div>
            <div className="rounded-xl bg-secondary/40 p-3">
              <p className="text-[11px] text-muted-foreground mb-0.5">IR retido na fonte</p>
              <p className="text-sm font-bold text-foreground tabular-nums">{fmt(irRetidoFonte)}</p>
            </div>
            <div className="rounded-xl bg-secondary/40 p-3">
              <p className="text-[11px] text-muted-foreground mb-0.5">Base cálculo (Completo)</p>
              <p className="text-sm font-bold text-foreground tabular-nums">{fmt(baseCalculoCompleto)}</p>
            </div>
            <div className="rounded-xl bg-secondary/40 p-3">
              <p className="text-[11px] text-muted-foreground mb-0.5">IR devido estimado</p>
              <p className="text-sm font-bold text-foreground tabular-nums">{fmt(irDevidoEstimado)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10">
            <ArrowUp size={16} className="text-destructive shrink-0" />
            <p className="text-sm font-bold tabular-nums text-destructive">
              Estimativa a pagar: {fmt(saldoPagar)}
            </p>
          </div>
        </section>

        {/* 2 — Modelo de Declaração */}
        <section className="glass-card p-5 animate-fade-up" style={{ animationDelay: "0.1s" }}>
          <div className="flex items-center gap-2 mb-4">
            <Award size={16} className="text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Modelo de Declaração</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className={`rounded-xl p-4 border ${modeloRecomendado === "Simplificado" ? "border-primary bg-primary/10" : "border-border/50 bg-secondary/30"}`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-foreground">Simplificado</p>
                {modeloRecomendado === "Simplificado" && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary">Recomendado</span>
                )}
              </div>
              <p className="text-lg font-bold text-foreground tabular-nums">{fmt(descontoSimplificado)}</p>
              <p className="text-[10px] text-muted-foreground mt-1">20% da renda (limite R$ 16.754)</p>
            </div>

            <div className={`rounded-xl p-4 border ${modeloRecomendado === "Completo" ? "border-primary bg-primary/10" : "border-border/50 bg-secondary/30"}`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-foreground">Completo</p>
                {modeloRecomendado === "Completo" && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary">Recomendado</span>
                )}
              </div>
              <p className="text-lg font-bold text-foreground tabular-nums">{fmt(deducoesReais)}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Deduções reais acumuladas</p>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/10 mt-3">
            <CheckCircle2 size={14} className="text-primary shrink-0 mt-0.5" />
            <p className="text-[11px] text-foreground">
              O modelo <span className="font-bold text-primary">{modeloRecomendado}</span> gera economia de{" "}
              <span className="font-bold text-primary">{fmt(Math.abs(deducoesReais - descontoSimplificado))}</span> em deduções adicionais.
            </p>
          </div>
        </section>

        {/* 2.5 — Declaração Conjunta */}
        <section className="glass-card p-5 animate-fade-up" style={{ animationDelay: "0.12s" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-primary" />
              <h2 className="text-sm font-semibold text-foreground">💑 Declarar junto com o cônjuge?</h2>
            </div>
            <span className="text-[9px] font-bold px-2.5 py-0.5 rounded-full bg-destructive/15 text-destructive">
              Não recomendado
            </span>
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
            Ambos têm renda na alíquota máxima (27,5%). Declarar separado preserva as deduções individuais de cada um.
          </p>

          <div className="flex items-start gap-2 p-3 rounded-xl bg-[hsl(var(--chart-4))]/15 mb-3">
            <AlertTriangle size={14} className="text-[hsl(var(--chart-4))] shrink-0 mt-0.5" />
            <p className="text-[11px] text-[hsl(var(--chart-4))]">
              ⚠️ Se parte da renda do cônjuge for distribuição de lucros (isenta), confirme com sua contadora — pode mudar o cenário.
            </p>
          </div>

          <button
            onClick={() => setConjuntaExpanded(!conjuntaExpanded)}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-border/50 text-xs font-medium text-foreground hover:bg-secondary/30 transition-colors"
          >
            Saiba mais
            {conjuntaExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {conjuntaExpanded && (
            <div className="mt-3 p-4 rounded-xl bg-secondary/30 text-[11px] text-muted-foreground leading-relaxed animate-fade-up">
              Na declaração conjunta, todas as rendas e deduções se somam em uma única declaração. Vale quando um cônjuge tem renda baixa e muitas deduções. No seu caso, como ambos têm renda elevada, declarar separado é mais vantajoso pois cada um usa suas próprias deduções integralmente.
            </div>
          )}
        </section>

        {/* 3 — Deduções Legais */}
        <section className="glass-card p-5 animate-fade-up" style={{ animationDelay: "0.15s" }}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown size={16} className="text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Deduções Legais</h2>
          </div>

          <div className="space-y-3">
            {deducoes.map((d) => (
              <div key={d.label} className="flex items-center justify-between p-3 rounded-xl bg-secondary/30">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <d.icon size={14} className="text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{d.label}</p>
                    <p className="text-[10px] text-muted-foreground">{d.desc} · Limite: {d.limite}</p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-foreground tabular-nums">{fmt(d.valor)}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/30">
            <p className="text-xs font-semibold text-muted-foreground">Total de deduções</p>
            <p className="text-base font-bold text-primary tabular-nums">{fmt(totalDeducoes)}</p>
          </div>
        </section>

        {/* 4 — Doações Incentivadas */}
        <section className="glass-card p-5 animate-fade-up" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center gap-2 mb-3">
            <Gift size={16} className="text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Doações Incentivadas</h2>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-xl bg-secondary/40 mb-4">
            <Info size={14} className="text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Pessoa física pode destinar até <span className="font-semibold text-foreground">6% do IR devido</span> para doações incentivadas — o valor é deduzido diretamente do imposto, não da base de cálculo.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="rounded-xl bg-secondary/40 p-3">
              <p className="text-[10px] text-muted-foreground mb-0.5">Limite total (6%)</p>
              <p className="text-sm font-bold text-foreground tabular-nums">{fmt(limiteTotal)}</p>
            </div>
            <div className="rounded-xl bg-secondary/40 p-3">
              <p className="text-[10px] text-muted-foreground mb-0.5">Já utilizado</p>
              <p className="text-sm font-bold text-foreground tabular-nums">{fmt(jaDoado)}</p>
            </div>
            <div className="rounded-xl bg-primary/10 p-3">
              <p className="text-[10px] text-primary mb-0.5">Saldo disponível</p>
              <p className="text-sm font-bold text-primary tabular-nums">{fmt(saldoDisponivel)}</p>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground font-medium mb-1.5">Modalidades aceitas</p>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {["Criança e Adolescente", "Idoso", "Cultura (Rouanet)", "Audiovisual", "Desporto"].map((m) => (
              <span key={m} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/50 text-muted-foreground">{m}</span>
            ))}
          </div>

          <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/10">
            <TrendingUp size={16} className="text-primary shrink-0" />
            <p className="text-xs text-foreground">
              Você ainda pode direcionar{" "}
              <span className="font-bold text-primary">{fmt(saldoDisponivel)}</span>{" "}
              do seu IR obrigatório para causas que importam 💚
            </p>
          </div>
        </section>

        {/* 5 — Histórico DARF */}
        <section className="glass-card p-5 animate-fade-up" style={{ animationDelay: "0.25s" }}>
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={16} className="text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Histórico de Pagamentos DARF</h2>
          </div>

          <div className="space-y-3">
            {historicoDARF.map((h) => (
              <div key={h.ano} className="rounded-xl bg-secondary/30 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-foreground">{h.ano}</p>
                  <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${h.status === "A pagar" ? "bg-destructive/15 text-destructive" : h.status === "Restituição recebida" ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"}`}>
                    {h.status}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-muted-foreground">DARF total pago</p>
                  <p className="text-sm font-semibold text-foreground tabular-nums">{fmt(h.darfTotal)}</p>
                </div>

                <div className="flex items-center justify-between pl-3 border-l-2 border-border/30">
                  <p className="text-[11px] text-muted-foreground">Imposto normal</p>
                  <p className="text-xs font-medium text-foreground tabular-nums">{fmt(h.impostoNormal)}</p>
                </div>

                {h.doacaoIncentivada > 0 && (
                  <div className="flex items-center justify-between pl-3 border-l-2 border-primary/40">
                    <div className="flex items-center gap-1.5">
                      <RotateCcw size={12} className="text-primary" />
                      <p className="text-[11px] text-primary font-medium">Doação incentivada (retorna na restituição)</p>
                    </div>
                    <p className="text-xs font-medium text-primary tabular-nums">{fmt(h.doacaoIncentivada)}</p>
                  </div>
                )}

                {h.restituicao > 0 && (
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-primary/10">
                    <p className="text-[11px] text-primary font-medium">Restituição recebida</p>
                    <p className="text-sm font-bold text-primary tabular-nums">+{fmt(h.restituicao)}</p>
                  </div>
                )}

                {h.ganhoSelic > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                      Corrigido pela Selic 📈
                    </span>
                    <p className="text-xs font-semibold text-primary tabular-nums">+{fmt(h.ganhoSelic)}</p>
                  </div>
                )}

                {h.status === "A pagar" && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-destructive/10">
                    <Info size={12} className="text-destructive shrink-0" />
                    <p className="text-[11px] text-destructive font-medium">Pendente — sem restituição</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
      <BottomNav />
    </div>
  );
};

export default IR;
