import BottomNav from "@/components/BottomNav";
import { Lock, CheckCircle2, AlertTriangle, TrendingUp, Wallet, ShieldCheck, Landmark, Info, AlertOctagon } from "lucide-react";

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
const resgatesLP = [
  { data: "10 Jan 2026", valor: 2000, motivo: "Planejado" as const },
  { data: "28 Fev 2026", valor: 1500, motivo: "Emergência" as const },
];
const temEmergenciaLP = resgatesLP.some((r) => r.motivo === "Emergência");
const temResgateLP = resgatesLP.length > 0;

const motivoLPStyle: Record<string, { bg: string; text: string }> = {
  Emergência: { bg: "bg-destructive/20", text: "text-destructive" },
  Planejado: { bg: "bg-yellow-400/20", text: "text-yellow-400" },
  "Oportunidade de investimento": { bg: "bg-blue-400/20", text: "text-blue-400" },
};

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

      {/* Banner comemorativo */}
      {rendMes > 0 && (
        <div
          className="patrimonio-banner flex items-center gap-3 animate-fade-up"
          style={{
            background: "rgba(16,185,129,0.08)",
            border: "1px solid rgba(16,185,129,0.2)",
            borderRadius: 16,
            padding: "12px 16px",
            animationDelay: "0.07s",
          }}
        >
          <svg width="32" height="32" viewBox="8 5 84 80" fill="none" className="shrink-0">
            <ellipse cx="50" cy="42" rx="34" ry="36" fill="#2C1810"/>
            <path d="M74 45 Q88 55 85 80 Q82 95 75 100 Q80 80 76 65 Q74 55 74 45Z" fill="#2C1810"/>
            <path d="M26 45 Q12 58 15 82 Q18 96 24 100 Q20 80 24 65 Q26 55 26 45Z" fill="#2C1810"/>
            <ellipse cx="50" cy="50" rx="28" ry="30" fill="#FDDBB4"/>
            <ellipse cx="50" cy="18" rx="16" ry="10" fill="#2C1810"/>
            <ellipse cx="50" cy="16" rx="10" ry="7" fill="#3D2314"/>
            <path d="M32 40 Q39 36 44 39" stroke="#2C1810" strokeWidth="3" strokeLinecap="round" fill="none"/>
            <path d="M56 39 Q61 36 68 40" stroke="#2C1810" strokeWidth="3" strokeLinecap="round" fill="none"/>
            <ellipse cx="38" cy="47" rx="5" ry="5.5" fill="white"/>
            <ellipse cx="62" cy="47" rx="5" ry="5.5" fill="white"/>
            <ellipse cx="38.5" cy="47.5" rx="3.5" ry="4" fill="#3D2314"/>
            <ellipse cx="62.5" cy="47.5" rx="3.5" ry="4" fill="#3D2314"/>
            <circle cx="40" cy="46" r="1.2" fill="white"/>
            <circle cx="64" cy="46" r="1.2" fill="white"/>
            <path d="M48 56 Q50 59 52 56" stroke="#C68642" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
            <path d="M38 63 Q50 72 62 63" stroke="#C68642" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
            <ellipse cx="30" cy="60" rx="7" ry="4" fill="#FFB3A7" opacity="0.5"/>
            <ellipse cx="70" cy="60" rx="7" ry="4" fill="#FFB3A7" opacity="0.5"/>
            <circle cx="22" cy="56" r="4" fill="#F7D070"/>
            <circle cx="78" cy="56" r="4" fill="#F7D070"/>
            <line x1="22" y1="50" x2="22" y2="48" stroke="#F7D070" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="22" y1="62" x2="22" y2="64" stroke="#F7D070" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="16" y1="56" x2="14" y2="56" stroke="#F7D070" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="28" y1="56" x2="30" y2="56" stroke="#F7D070" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="78" y1="50" x2="78" y2="48" stroke="#F7D070" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="78" y1="62" x2="78" y2="64" stroke="#F7D070" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="72" y1="56" x2="70" y2="56" stroke="#F7D070" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="84" y1="56" x2="86" y2="56" stroke="#F7D070" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <div>
            <p className="text-sm font-bold text-foreground">Seu patrimônio cresceu esse mês! 🎉</p>
            <p className="text-xs font-semibold" style={{ color: "#10B981" }}>+ {fmt(rendMes)} em relação a fevereiro</p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes patrimonioFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .patrimonio-banner { animation: patrimonioFadeIn 0.5s ease both; }
      `}</style>

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

        {/* Alertas de resgate */}
        {temEmergenciaLP && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/15 mb-3">
            <AlertOctagon size={16} className="text-destructive shrink-0" />
            <p className="text-xs text-destructive font-medium">
              ⚠️ Resgate de emergência — reforce sua reserva de liquidez.
            </p>
          </div>
        )}
        {temResgateLP && !temEmergenciaLP && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-orange-500/10 mb-3">
            <AlertTriangle size={16} className="text-orange-400 shrink-0" />
            <p className="text-xs text-orange-300">
              Você resgatou desta aplicação de longo prazo — avalie se era realmente necessário.
            </p>
          </div>
        )}

        {/* Histórico de resgates */}
        <p className="text-xs text-muted-foreground font-medium mb-2">Resgates</p>
        <div className="space-y-1">
          {resgatesLP.map((r, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <Wallet size={14} className="text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{r.data}</p>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${motivoLPStyle[r.motivo].bg} ${motivoLPStyle[r.motivo].text}`}>
                    {r.motivo}
                  </span>
                </div>
              </div>
              <p className="text-sm font-semibold text-foreground tabular-nums">-{fmt(r.valor)}</p>
            </div>
          ))}
        </div>

        <div className="flex items-start gap-2 p-3 rounded-xl bg-secondary/40 mt-3">
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
