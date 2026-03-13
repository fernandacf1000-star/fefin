import { useMemo } from "react";
import { CreditCard } from "lucide-react";
import type { Cartao } from "@/hooks/useCartoes";
import { getCartaoCycle } from "@/hooks/useCartoes";
import type { Lancamento } from "@/hooks/useLancamentos";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const BandeiraIcon = ({ bandeira }: { bandeira: string }) => {
  if (bandeira === "visa") {
    return (
      <span
        style={{
          fontStyle: "italic",
          fontWeight: 900,
          fontSize: 12,
          color: "#1A1F71",
          background: "#EDF1F8",
          borderRadius: 4,
          padding: "2px 6px",
          letterSpacing: 1,
          lineHeight: 1,
        }}
      >
        VISA
      </span>
    );
  }
  if (bandeira === "mastercard") {
    return (
      <div style={{ position: "relative", width: 32, height: 20, flexShrink: 0 }}>
        <div style={{ position: "absolute", left: 0, width: 20, height: 20, borderRadius: "50%", background: "#EB001B" }} />
        <div style={{ position: "absolute", left: 12, width: 20, height: 20, borderRadius: "50%", background: "#F79E1B", opacity: 0.9 }} />
      </div>
    );
  }
  return <CreditCard size={16} />;
};

interface Props {
  cartao: Cartao;
  lancamentos: Lancamento[];
  showBalance: boolean;
  isBest?: boolean;
}

const CartaoCard = ({ cartao, lancamentos, showBalance, isBest }: Props) => {
  const {
    cycleStart,
    cycleEnd,
    previousCycleMonthRef,
    cycleMonthRef,
    daysUntilClose,
  } = getCartaoCycle(cartao.dia_fechamento);

  const isCycleOpen = daysUntilClose >= 0;

  const faturaFechada = useMemo(() => {
    return lancamentos
      .filter((l) => {
        if (!l.cartao_id || l.cartao_id !== cartao.id) return false;
        if (l.tipo !== "despesa") return false;
        if (l.is_parcelado || l.recorrente) {
          return l.mes_referencia === previousCycleMonthRef;
        }
        const d = new Date(l.data + "T12:00:00");
        const prevStart = new Date(cycleStart);
        prevStart.setMonth(prevStart.getMonth() - 1);
        return d < cycleStart && d >= prevStart;
      })
      .reduce((s, l) => s + Number(l.valor), 0);
  }, [lancamentos, cartao.id, previousCycleMonthRef, cycleStart]);

  const faturaAberta = useMemo(() => {
    return lancamentos
      .filter((l) => {
        if (!l.cartao_id || l.cartao_id !== cartao.id) return false;
        if (l.tipo !== "despesa") return false;
        if (l.is_parcelado || l.recorrente) {
          return l.mes_referencia === cycleMonthRef;
        }
        const d = new Date(l.data + "T12:00:00");
        return d >= cycleStart && d <= cycleEnd;
      })
      .reduce((s, l) => s + Number(l.valor), 0);
  }, [lancamentos, cartao.id, cycleMonthRef, cycleStart, cycleEnd]);

  const showFaturaFechada = !isCycleOpen && faturaFechada > 0;
  const valorDestaque = showFaturaFechada ? faturaFechada : faturaAberta;
  const isClosingSoon = isCycleOpen && daysUntilClose <= 5;

  return (
    <div
      className="p-4 rounded-xl border border-border space-y-3 bg-white"
      style={{ borderLeft: `3px solid ${cartao.cor}` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BandeiraIcon bandeira={cartao.bandeira} />
          <span className="text-sm font-semibold text-foreground">{cartao.nome}</span>
        </div>
        {isBest && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary">
            💡 Melhor hoje
          </span>
        )}
      </div>

      <div>
        <p className="text-[10px] text-muted-foreground mb-0.5">
          {showFaturaFechada ? "Fatura fechada · a pagar" : "Fatura aberta · acumulado"}
        </p>
        <p className="text-xl font-bold text-foreground tabular-nums">
          {showBalance ? fmt(valorDestaque) : "R$ ••••"}
        </p>
        {showFaturaFechada && faturaAberta > 0 && (
          <p className="text-[11px] text-muted-foreground mt-0.5">
            + {showBalance ? fmt(faturaAberta) : "R$ ••••"} acumulando
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
          📅 Melhor dia: {cartao.melhor_dia_compra}
        </span>
        {showFaturaFechada && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600">
            ⏳ Aguardando pagamento
          </span>
        )}
        {isCycleOpen && isClosingSoon && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600">
            ⚠️ Fecha em {daysUntilClose} dia{daysUntilClose !== 1 ? "s" : ""}
          </span>
        )}
        {isCycleOpen && !isClosingSoon && (
          <span className="text-[10px] text-muted-foreground">
            Fecha em {daysUntilClose} dias
          </span>
        )}
      </div>
    </div>
  );
};

export default CartaoCard;
