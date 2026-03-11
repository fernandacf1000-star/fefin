import { useMemo } from "react";
import { CreditCard } from "lucide-react";
import type { Cartao } from "@/hooks/useCartoes";
import { getCartaoCycle } from "@/hooks/useCartoes";
import type { Lancamento } from "@/hooks/useLancamentos";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Logo real da bandeira
const BandeiraIcon = ({ bandeira }: { bandeira: string }) => {
  if (bandeira === "visa") {
    return (
      <span
        style={{
          fontStyle: "italic",
          fontWeight: 900,
          fontSize: 12,
          color: "#1A1F71",
          background: "white",
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
        <div
          style={{
            position: "absolute",
            left: 0,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "#EB001B",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 12,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "#F79E1B",
            opacity: 0.9,
          }}
        />
      </div>
    );
  }
  return <CreditCard size={16} />;
};

interface Props {
  cartao: Cartao;
  lancamentos: Lancamento[]; // todos os lançamentos, sem filtro de mês
  showBalance: boolean;
  isBest?: boolean;
}

const CartaoCard = ({ cartao, lancamentos, showBalance, isBest }: Props) => {
  const { cycleStart, cycleEnd, daysUntilClose } = getCartaoCycle(cartao.dia_fechamento);

  // mes_referencia do ciclo atual (ex: "2026-03")
  const cycleMonthRef = useMemo(() => {
    const y = cycleEnd.getFullYear();
    const m = String(cycleEnd.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }, [cycleEnd]);

  // Soma lançamentos vinculados a este cartão cujo mes_referencia cai no ciclo atual
  const faturaAtual = useMemo(() => {
    return lancamentos
      .filter((l) => {
        if (!l.cartao_id || l.cartao_id !== cartao.id) return false;
        if (l.tipo !== "despesa") return false;
        return l.mes_referencia === cycleMonthRef;
      })
      .reduce((s, l) => s + Number(l.valor), 0);
  }, [lancamentos, cartao.id, cycleMonthRef]);

  const isClosingSoon = daysUntilClose >= 0 && daysUntilClose <= 5;
  const isClosed = daysUntilClose < 0;

  return (
    <div
      className="p-4 rounded-xl border border-border/30 space-y-3"
      style={{ borderLeft: `3px solid ${cartao.cor}`, background: "#12121f" }}
    >
      {/* Linha 1: Bandeira + Nome + Badge melhor */}
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

      {/* Linha 2: Fatura atual em destaque */}
      <div>
        <p className="text-[10px] text-muted-foreground mb-0.5">Fatura atual</p>
        <p className="text-xl font-bold text-foreground tabular-nums">
          {showBalance ? fmt(faturaAtual) : "R$ ••••"}
        </p>
      </div>

      {/* Linha 3: Melhor dia + status de fechamento */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
          📅 Melhor dia: {cartao.melhor_dia_compra}
        </span>

        {isClosed && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-destructive/15 text-destructive">
            🔴 Fatura vencida — {showBalance ? fmt(faturaAtual) : "••••"} a pagar
          </span>
        )}
        {!isClosed && isClosingSoon && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-500">
            ⚠️ Vence em {daysUntilClose} dia{daysUntilClose !== 1 ? "s" : ""}
          </span>
        )}
        {!isClosed && !isClosingSoon && (
          <span className="text-[10px] text-muted-foreground">
            Vence em {daysUntilClose} dias
          </span>
        )}
      </div>
    </div>
  );
};

export default CartaoCard;
