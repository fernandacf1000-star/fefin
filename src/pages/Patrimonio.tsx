import BottomNav from "@/components/BottomNav";
import EmptyState from "@/components/EmptyState";
import { usePatrimonioData, usePatrimonioMovimentacoes } from "@/hooks/usePatrimonio";
import { Lock, CheckCircle2, AlertTriangle, TrendingUp, Wallet, ShieldCheck, Landmark, Info, AlertOctagon } from "lucide-react";
import { useMemo } from "react";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const pct = (v: number) => `${v.toFixed(1)}%`;

const motivoStyle: Record<string, { bg: string; text: string }> = {
  emergencia: { bg: "bg-destructive/20", text: "text-destructive" },
  planejado: { bg: "bg-yellow-400/20", text: "text-yellow-400" },
  oportunidade: { bg: "bg-blue-400/20", text: "text-blue-400" },
};

const motivoLabel: Record<string, string> = {
  emergencia: "Emergência",
  planejado: "Planejado",
  oportunidade: "Oportunidade",
};

const MascotHead = () => (
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
  </svg>
);

const Patrimonio = () => {
  const { data: patrimonios = [], isLoading } = usePatrimonioData();
  const { data: movimentacoes = [] } = usePatrimonioMovimentacoes();

  const getPatrimonio = (tipo: string) => patrimonios.find((p) => p.tipo === tipo);
  const getMovs = (tipo: string) => movimentacoes.filter((m) => m.patrimonio_tipo === tipo);

  const aplicacao = getPatrimonio("liquidez_diaria");
  const previdencia = getPatrimonio("previdencia");
  const longoPrazo = getPatrimonio("sem_liquidez");
  const fgts = getPatrimonio("fgts");

  const totalInvestido = patrimonios.reduce((s, p) => s + Number(p.saldo), 0);
  const rendMes = patrimonios.reduce((s, p) => s + Number(p.rendimento_mensal || 0), 0);

  const resgatesLiquidez = useMemo(() => getMovs("liquidez_diaria").filter((m) => m.tipo_movimentacao === "resgate"), [movimentacoes]);
  const resgatesLP = useMemo(() => getMovs("sem_liquidez").filter((m) => m.tipo_movimentacao === "resgate"), [movimentacoes]);

  const emergencias6m = resgatesLiquidez.filter((r) => r.motivo === "emergencia").length;
  const temEmergenciaLP = resgatesLP.some((r) => r.motivo === "emergencia");

  const hasData = patrimonios.length > 0;

  if (!hasData && !isLoading) {
    return (
      <div className="min-h-screen gradient-bg overflow-x-hidden pb-[90px]">
        <div className="px-4 pt-12 w-full">
          <h1 className="text-xl font-semibold text-foreground animate-fade-up">Patrimônio</h1>
          <div className="mt-6"><EmptyState title="Cadastre seus investimentos! 📈" /></div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg overflow-x-hidden pb-[90px]">
      <div className="px-4 pt-12 space-y-5 w-full">
        <h1 className="text-xl font-semibold text-foreground animate-fade-up">Patrimônio</h1>

        {/* Hero: Total Investido */}
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
          </div>
        </section>

        {/* Banner */}
        {rendMes > 0 && (
          <div className="patrimonio-banner flex items-center gap-3 animate-fade-up" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 16, padding: "12px 16px", animationDelay: "0.07s" }}>
            <MascotHead />
            <div>
              <p className="text-sm font-bold text-foreground">Seu patrimônio cresceu esse mês! 🎉</p>
              <p className="text-xs font-semibold" style={{ color: "#10B981" }}>+ {fmt(rendMes)} de rendimento</p>
            </div>
          </div>
        )}

        <style>{`
          @keyframes patrimonioFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
          .patrimonio-banner { animation: patrimonioFadeIn 0.5s ease both; }
        `}</style>

        {/* Aplicação Liquidez Diária */}
        {aplicacao && (
          <section className="glass-card p-5 animate-fade-up" style={{ animationDelay: "0.1s" }}>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={16} className="text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Aplicação · Liquidez Diária</h2>
            </div>
            <div className="flex items-baseline justify-between mb-1">
              <p className="text-xl font-bold text-foreground tabular-nums">{fmt(Number(aplicacao.saldo))}</p>
              {aplicacao.rendimento_mensal && <p className="text-xs text-primary font-semibold">+{fmt(Number(aplicacao.rendimento_mensal))}/mês</p>}
            </div>
            {emergencias6m >= 2 && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-orange-500/10 mt-3 mb-3">
                <AlertTriangle size={16} className="text-orange-400 shrink-0" />
                <p className="text-xs text-orange-300">{emergencias6m} resgates por emergência — atenção!</p>
              </div>
            )}
            {resgatesLiquidez.length > 0 && (
              <>
                <p className="text-xs text-muted-foreground font-medium mt-3 mb-2">Últimos resgates</p>
                <div className="space-y-1">
                  {resgatesLiquidez.slice(0, 4).map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                          <Wallet size={14} className="text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{new Date(r.data + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</p>
                          {r.motivo && (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${(motivoStyle[r.motivo] || motivoStyle.planejado).bg} ${(motivoStyle[r.motivo] || motivoStyle.planejado).text}`}>
                              {motivoLabel[r.motivo] || r.motivo}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-foreground tabular-nums">-{fmt(Number(r.valor))}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {/* Previdência Privada */}
        {previdencia && (
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
            <p className="text-xl font-bold text-foreground tabular-nums">{fmt(Number(previdencia.saldo))}</p>
            {previdencia.rendimento_mensal && (
              <p className="text-[11px] text-muted-foreground mt-1">Rendimento mensal: <span className="text-primary font-semibold">{fmt(Number(previdencia.rendimento_mensal))}</span></p>
            )}
          </section>
        )}

        {/* Longo Prazo */}
        {longoPrazo && (
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
            <p className="text-xl font-bold text-foreground tabular-nums">{fmt(Number(longoPrazo.saldo))}</p>
            {temEmergenciaLP && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/15 mt-3 mb-3">
                <AlertOctagon size={16} className="text-destructive shrink-0" />
                <p className="text-xs text-destructive font-medium">⚠️ Resgate de emergência — reforce sua reserva de liquidez.</p>
              </div>
            )}
            {resgatesLP.length > 0 && (
              <>
                <p className="text-xs text-muted-foreground font-medium mt-3 mb-2">Resgates</p>
                <div className="space-y-1">
                  {resgatesLP.map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                          <Wallet size={14} className="text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{new Date(r.data + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</p>
                          {r.motivo && (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${(motivoStyle[r.motivo] || motivoStyle.planejado).bg} ${(motivoStyle[r.motivo] || motivoStyle.planejado).text}`}>
                              {motivoLabel[r.motivo] || r.motivo}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-foreground tabular-nums">-{fmt(Number(r.valor))}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
            <div className="flex items-start gap-2 p-3 rounded-xl bg-secondary/40 mt-3">
              <Info size={14} className="text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">Aplicações de longo prazo — priorize não resgatar.</p>
            </div>
          </section>
        )}

        {/* FGTS */}
        {fgts && (
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
            <p className="text-xl font-bold text-foreground tabular-nums">{fmt(Number(fgts.saldo))}</p>
            <p className="text-[11px] text-muted-foreground mt-1 mb-3">Última atualização: {new Date(fgts.data_atualizacao + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}</p>
            <div className="flex items-start gap-2 p-3 rounded-xl bg-secondary/40">
              <Info size={14} className="text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">Disponível em demissão sem justa causa, aposentadoria ou situações especiais.</p>
            </div>
          </section>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default Patrimonio;
