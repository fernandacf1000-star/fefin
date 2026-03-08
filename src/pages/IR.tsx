import { useState, useMemo, useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import {
  Gift, Info, TrendingUp, Users, AlertTriangle,
  ChevronDown, ChevronUp, Briefcase, Building2,
} from "lucide-react";
import { useIRLancamentos, calcularIRAnual, fmt } from "@/hooks/useIRLancamentos";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import YearCard2026 from "@/components/ir/YearCard2026";
import YearCard2027 from "@/components/ir/YearCard2027";
import IRModoPJ from "@/components/ir/IRModoPJ";
import SimuladorPrevidencia from "@/components/ir/SimuladorPrevidencia";

type Modo = "clt" | "pj";

const IR = () => {
  const [conjuntaExpanded, setConjuntaExpanded] = useState(false);
  const { data: profile } = useProfile();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [modo, setModo] = useState<Modo>("clt");
  const { data: lancs2025 } = useIRLancamentos(2025);

  // Load saved preference
  useEffect(() => {
    if (profile?.tipo_tributacao === "socio" || profile?.tipo_tributacao === "pj") {
      setModo("pj");
    }
  }, [profile]);

  const handleModoChange = async (newModo: Modo) => {
    setModo(newModo);
    if (user && profile) {
      await supabase
        .from("profiles" as any)
        .update({ tipo_tributacao: newModo === "pj" ? "socio" : "clt" } as any)
        .eq("user_id", user.id);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    }
  };

  const doacoes = useMemo(() => {
    const l = lancs2025 ?? [];
    const totalRenda = l.filter((x) => x.tipo === "renda").reduce((s, x) => s + Number(x.valor), 0);
    const totalINSS = l.filter((x) => x.tipo === "inss").reduce((s, x) => s + Number(x.valor), 0);
    const totalPGBL = l.filter((x) => x.tipo === "pgbl").reduce((s, x) => s + Number(x.valor), 0);
    const totalSaude = l.filter((x) => x.tipo === "saude").reduce((s, x) => s + Number(x.valor), 0);
    const totalOutro = l.filter((x) => x.tipo === "outro").reduce((s, x) => s + Number(x.valor), 0);
    const base = totalRenda - totalINSS - totalPGBL - totalSaude - totalOutro;
    const irDevido = calcularIRAnual(base);
    const limiteTotal = irDevido * 0.06;
    return { limiteTotal, jaDoado: 0, saldoDisponivel: limiteTotal };
  }, [lancs2025]);

  return (
    <div className="min-h-screen gradient-bg overflow-x-hidden pb-[90px]">
      <div className="px-4 pt-12 space-y-5 w-full">
        <h1 className="text-xl font-semibold text-foreground animate-fade-up">Imposto de Renda</h1>

        {/* Modo Toggle */}
        <div className="flex gap-2 p-1 rounded-xl bg-secondary/40 animate-fade-up" style={{ animationDelay: "0.02s" }}>
          <button
            onClick={() => handleModoChange("clt")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold transition-all ${
              modo === "clt" ? "gradient-emerald text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground"
            }`}
          >
            <Briefcase size={14} /> CLT / Assalariado
          </button>
          <button
            onClick={() => handleModoChange("pj")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold transition-all ${
              modo === "pj" ? "gradient-emerald text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground"
            }`}
          >
            <Building2 size={14} /> Sócio / Autônomo / PJ
          </button>
        </div>

        {modo === "pj" ? (
          <>
            <IRModoPJ />
            <SimuladorPrevidencia />
          </>
        ) : (
          <>
            {/* Card 1 — 2026 historical (collapsed) */}
            <YearCard2026 />

            {/* Card 2 — 2027 active */}
            <YearCard2027 />

            {/* Simulador */}
            <SimuladorPrevidencia />

            {/* Declaração Conjunta */}
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

            {/* Doações Incentivadas */}
            <section className="glass-card p-5 animate-fade-up" style={{ animationDelay: "0.2s" }}>
              <div className="flex items-center gap-2 mb-3">
                <Gift size={16} className="text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Doações Incentivadas</h2>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-xl bg-secondary/40 mb-4">
                <Info size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Pessoa física pode destinar até <span className="font-semibold text-foreground">6% do IR devido</span> para doações incentivadas.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="rounded-xl bg-secondary/40 p-3">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Limite (6%)</p>
                  <p className="text-sm font-bold text-foreground tabular-nums">{fmt(doacoes.limiteTotal)}</p>
                </div>
                <div className="rounded-xl bg-secondary/40 p-3">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Já utilizado</p>
                  <p className="text-sm font-bold text-foreground tabular-nums">{fmt(doacoes.jaDoado)}</p>
                </div>
                <div className="rounded-xl bg-primary/10 p-3">
                  <p className="text-[10px] text-primary mb-0.5">Disponível</p>
                  <p className="text-sm font-bold text-primary tabular-nums">{fmt(doacoes.saldoDisponivel)}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {["Criança e Adolescente", "Idoso", "Cultura (Rouanet)", "Audiovisual", "Desporto"].map((m) => (
                  <span key={m} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/50 text-muted-foreground">{m}</span>
                ))}
              </div>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/10">
                <TrendingUp size={16} className="text-primary shrink-0" />
                <p className="text-xs text-foreground">
                  Direcione <span className="font-bold text-primary">{fmt(doacoes.saldoDisponivel)}</span> do IR para causas que importam 💚
                </p>
              </div>
            </section>
          </>
        )}

        {/* Footer */}
        <p className="text-[10px] text-center pb-2" style={{ color: "#475569" }}>
          Tabela IRPF 2025 — vigente desde jan/2025
        </p>
      </div>
      <BottomNav />
    </div>
  );
};

export default IR;
