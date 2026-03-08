import BottomNav from "@/components/BottomNav";
import { Lock, CheckCircle2, AlertTriangle, TrendingUp, Wallet, ShieldCheck, Landmark, Info } from "lucide-react";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const pct = (v: number) => `${v.toFixed(1)}%`;

/* Data */
const previdencia = { valor: 82450.0, rentAnual: 11.2, aporteFeito: true, aporteMensal: 1020 };
const fgts = { saldo: 18400.0, ultimaAtualizacao: "01 Mar 2026" };
const aplicacao = { saldo: 24800.0, rendMensal: 198.4 };
const resgates = [
  { data: "02 Mar", valor: 1200, motivo: "Emergência" as const },
  { data: "18 Jan", valor: 3500, motivo: "Planejado" as const },
  { data: "05 Dez", valor: 800, motivo: "Emergência" as const },
  { data: "22 Out", valor: 2000, motivo: "Planejado" as const },
];
const emergencias6m = resgates.filter((r) => r.motivo === "Emergência").length;

const longoPrazo = { saldo: 12000, rentAnual: 9.8, ultimoAporte: "15 Fev 2026" };

const totalInvestido = previdencia.valor + aplicacao.saldo + fgts.saldo + longoPrazo.saldo;
const rendMes = aplicacao.rendMensal + 756.2;
const rendAno = 4820.5;

const motivoStyle: Record<string, { bg: string; text: string }> = {
  Emergência: { bg: "bg-destructive/20", text: "text-destructive" },
  Planejado: { bg: "bg-yellow-400/20", text: "text-yellow-400" },
};

const Patrimonio = () => (
  <div className="min-h-screen gradient-bg pb-24">
    <div className="max-w-md mx-auto px-4 pt-12 space-y-5">
      <h1 className="text-xl font-semibold text-foreground animate-fade-up">Patrimônio</h1>

      {/* 1 — Hero: Total Investido */}
      <section className="glass-card p-5 animate-fade-up" style={{ animationDelay: "0.05s" }}>
        <div className="flex items-center gap-2 mb-3">
          <Wallet size={16} className="text-primary" />
          <span className="text-xs text-muted-foreground font-medium">Total Investido</span>
        </div>
        <p className="text-2xl font-bold text-foreground tabular-nums mb-4">{fmt(totalInvestido)}</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-secondary/40 p-3">
            <p className="text-[11px] text-muted-foreground mb-0.5">Rendimento do mês</p>
            <p className="text-sm font-bold text-primary tabular-nums">+{fmt(rendMes)}</p>
          </div>
          <div className="rounded-xl bg-secondary/40 p-3">
            <p className="text-[11px] text-muted-foreground mb-0.5">Rendimento do ano</p>
            <p className="text-sm font-bold text-primary tabular-nums">+{fmt(rendAno)}</p>
          </div>
        </div>
      </section>

      {/* 2 — Aplicação Liquidez Diária */}
      <section className="glass-card p-5 animate-fade-up" style={{ animationDelay: "0.1s" }}>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={16} className="text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Aplicação · Liquidez Diária</h2>
        </div>
        <div className="flex items-baseline justify-between mb-1">
          <p className="text-xl font-bold text-foreground tabular-nums">{fmt(aplicacao.saldo)}</p>
          <p className="text-xs text-primary font-semibold">+{fmt(aplicacao.rendMensal)}/mês</p>
        </div>

        {emergencias6m >= 2 && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-orange-500/10 mt-3 mb-3">
            <AlertTriangle size={16} className="text-orange-400 shrink-0" />
            <p className="text-xs text-orange-300">
              {emergencias6m} resgates por emergência nos últimos 6 meses — atenção!
            </p>
          </div>
        )}

        <p className="text-xs text-muted-foreground font-medium mt-3 mb-2">Últimos resgates</p>
        <div className="space-y-1">
          {resgates.map((r, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <Wallet size={14} className="text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{r.data}</p>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${motivoStyle[r.motivo].bg} ${motivoStyle[r.motivo].text}`}>
                    {r.motivo}
                  </span>
                </div>
              </div>
              <p className="text-sm font-semibold text-foreground tabular-nums">-{fmt(r.valor)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3 — Previdência Privada */}
      <section className="glass-card p-5 animate-fade-up" style={{ animationDelay: "0.15s" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Previdência Privada</h2>
          </div>
          <span className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-primary/15 text-primary">
            <Lock size={10} /> Intocável 🔒
          </span>
        </div>
        <p className="text-xl font-bold text-foreground tabular-nums">{fmt(previdencia.valor)}</p>
        <p className="text-[11px] text-muted-foreground mt-1 mb-4">
          Rentabilidade anual: <span className="text-primary font-semibold">{pct(previdencia.rentAnual)}</span>
        </p>
        <div className={`flex items-center gap-2 p-3 rounded-xl ${previdencia.aporteFeito ? "bg-primary/10" : "bg-yellow-400/10"}`}>
          {previdencia.aporteFeito ? (
            <CheckCircle2 size={16} className="text-primary shrink-0" />
          ) : (
            <AlertTriangle size={16} className="text-yellow-400 shrink-0" />
          )}
          <p className="text-xs text-foreground">
            {previdencia.aporteFeito
              ? `Aporte de ${fmt(previdencia.aporteMensal)} (12% do salário) realizado este mês ✓`
              : "Aporte pendente este mês"}
          </p>
        </div>
      </section>

      {/* 4 — Aplicação Sem Liquidez — Longo Prazo */}
      <section className="glass-card p-5 animate-fade-up" style={{ animationDelay: "0.2s" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Aplicação Sem Liquidez — Longo Prazo</h2>
          </div>
          <span className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-yellow-400/15 text-yellow-400">
            Evitar resgates ⚠️
          </span>
        </div>
        <p className="text-xl font-bold text-foreground tabular-nums">{fmt(longoPrazo.saldo)}</p>
        <p className="text-[11px] text-muted-foreground mt-1">
          Rentabilidade anual estimada: <span className="text-primary font-semibold">{pct(longoPrazo.rentAnual)}</span>
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5 mb-3">
          Último aporte: {longoPrazo.ultimoAporte}
        </p>
        <div className="flex items-start gap-2 p-3 rounded-xl bg-secondary/40">
          <Info size={14} className="text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Aplicações de longo prazo — priorize não resgatar.
          </p>
        </div>
      </section>

      {/* 5 — FGTS */}
      <section className="glass-card p-5 animate-fade-up" style={{ animationDelay: "0.25s" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Landmark size={16} className="text-primary" />
            <h2 className="text-sm font-semibold text-foreground">FGTS</h2>
          </div>
          <span className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-primary/15 text-primary">
            <Lock size={10} /> Resgate restrito 🔒
          </span>
        </div>
        <p className="text-xl font-bold text-foreground tabular-nums">{fmt(fgts.saldo)}</p>
        <p className="text-[11px] text-muted-foreground mt-1 mb-3">
          Última atualização: {fgts.ultimaAtualizacao}
        </p>
        <div className="flex items-start gap-2 p-3 rounded-xl bg-secondary/40">
          <Info size={14} className="text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Disponível em demissão sem justa causa, aposentadoria ou situações especiais.
          </p>
        </div>
      </section>
    </div>
    <BottomNav />
  </div>
);

export default Patrimonio;
