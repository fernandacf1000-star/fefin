import BottomNav from "@/components/BottomNav";
import {
  FileText, TrendingDown, TrendingUp, CheckCircle2, Award,
  Heart, ShieldCheck, Gift, Info, Calendar, ArrowDown, ArrowUp,
  RotateCcw,
} from "lucide-react";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (v: number) => `${v.toFixed(1)}%`;

/* ── Dados fictícios (CLT R$ 12.800/mês) ── */
const salarioMensal = 12800;
const mesesDecorridos = 3; // Jan–Mar 2026
const rendimentosBrutos = salarioMensal * mesesDecorridos; // 38.400
const rendimentoAnual = salarioMensal * 12; // 153.600
const irRetidoFonte = 6840; // acumulado até Mar
const estimativaIRAnual = 27360;
const irRetidoAnualEstimado = irRetidoFonte * (12 / mesesDecorridos); // 27.360
const saldoIR = irRetidoAnualEstimado - estimativaIRAnual; // 0 → vamos forçar restituição
const saldoRestituicao = 1820; // valor fictício positivo = a restituir

/* Modelo de declaração */
const descontoSimplificado = Math.min(rendimentoAnual * 0.2, 16754.34);
const deducoesReais = 28450; // soma abaixo
const modeloRecomendado = deducoesReais > descontoSimplificado ? "Completo" : "Simplificado";

/* Deduções */
const deducoes = [
  { label: "Saúde", desc: "Plano, médicos, dentistas", valor: 14200, limite: "Sem limite", icon: Heart },
  { label: "Previdência PGBL", desc: "Até 12% da renda bruta", valor: 14250, limite: fmt(rendimentoAnual * 0.12), icon: ShieldCheck },
];
const totalDeducoes = deducoes.reduce((s, d) => s + d.valor, 0);

/* Doações incentivadas */
const irDevido = estimativaIRAnual;
const limiteCriancaIdoso = irDevido * 0.06;
const limiteCulturaEsporte = irDevido * 0.04;
const jaDoado = 820;
const saldoDisponivel = limiteCriancaIdoso + limiteCulturaEsporte - jaDoado;

/* Histórico DARF */
const historicoDARF = [
  { ano: 2025, status: "Restituição recebida", cor: "text-primary" },
  { ano: 2024, status: "Entregue", cor: "text-muted-foreground" },
  { ano: 2023, status: "Entregue", cor: "text-muted-foreground" },
  { ano: 2022, status: "A pagar", cor: "text-destructive" },
];

const IR = () => (
  <div className="min-h-screen gradient-bg pb-24">
    <div className="max-w-md mx-auto px-4 pt-12 space-y-5">
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
          <div className="rounded-xl bg-secondary/40 p-3 col-span-2">
            <p className="text-[11px] text-muted-foreground mb-0.5">Estimativa IR total no ano</p>
            <p className="text-sm font-bold text-foreground tabular-nums">{fmt(estimativaIRAnual)}</p>
          </div>
        </div>

        <div className={`flex items-center gap-2 p-3 rounded-xl ${saldoRestituicao >= 0 ? "bg-primary/10" : "bg-destructive/10"}`}>
          {saldoRestituicao >= 0 ? (
            <ArrowDown size={16} className="text-primary shrink-0" />
          ) : (
            <ArrowUp size={16} className="text-destructive shrink-0" />
          )}
          <p className={`text-sm font-bold tabular-nums ${saldoRestituicao >= 0 ? "text-primary" : "text-destructive"}`}>
            {saldoRestituicao >= 0
              ? `Estimativa a restituir: ${fmt(saldoRestituicao)}`
              : `Estimativa a pagar: ${fmt(Math.abs(saldoRestituicao))}`}
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
          {/* Simplificado */}
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

          {/* Completo */}
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
            Doações para Fundos da Criança/Adolescente, Idoso, Cultura (Rouanet), Audiovisual e Desporto são deduzidas diretamente do IR devido — não da base de cálculo.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-xl bg-secondary/40 p-3">
            <p className="text-[10px] text-muted-foreground mb-0.5">Criança / Idoso (até 6%)</p>
            <p className="text-sm font-bold text-foreground tabular-nums">{fmt(limiteCriancaIdoso)}</p>
          </div>
          <div className="rounded-xl bg-secondary/40 p-3">
            <p className="text-[10px] text-muted-foreground mb-0.5">Cultura / Esporte (até 4%)</p>
            <p className="text-sm font-bold text-foreground tabular-nums">{fmt(limiteCulturaEsporte)}</p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground">Já doado no ano</p>
          <p className="text-sm font-semibold text-foreground tabular-nums">{fmt(jaDoado)}</p>
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

        <div className="space-y-2">
          {historicoDARF.map((h) => (
            <div key={h.ano} className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary/30 transition-colors">
              <p className="text-sm font-medium text-foreground">{h.ano}</p>
              <span className={`text-xs font-semibold ${h.cor}`}>{h.status}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
    <BottomNav />
  </div>
);

export default IR;
