import { useMemo } from "react";
import { CreditCard } from "lucide-react";
import type { Cartao } from "@/hooks/useCartoes";
import { getCartaoCycle } from "@/hooks/useCartoes";
import type { Lancamento } from "@/hooks/useLancamentos";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const bandeiraSvg: Record<string, string> = {
  visa: "💳",
  mastercard: "💳",
  elo: "💳",
  amex: "💳",
};

interface Props {
  cartao: Cartao;
  lancamentos: Lancamento[];
  showBalance: boolean;
  isBest?: boolean;
}

const CartaoCard = ({ cartao, lancamentos, showBalance, isBest }: Props) => {
  const { cycleStart, cycleEnd, daysUntilClose } = getCartaoCycle(cartao.dia_fechamento);

  const faturaAtual = useMemo(() => {
    return lancamentos
      .filter((l) => {
        if ((l as any).cartao_id !== cartao.id) return false;
        const d = new Date(l.data + "T12:00:00");
        return d >= cycleStart && d <= cycleEnd;
      })
      .reduce((s, l) => s + Number(l.valor), 0);
  }, [lancamentos, cartao.id, cycleStart, cycleEnd]);

  const isClosingSoon = daysUntilClose >= 0 && daysUntilClose <= 3;
  const isClosed = daysUntilClose < 0;

  return (
    <div
      className="p-4 rounded-xl border border-border/30 space-y-2"
      style={{ borderLeft: `3px solid ${cartao.cor}` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard size={16} style={{ color: cartao.cor }} />
          <span className="text-sm font-semibold text-foreground">{cartao.nome}</span>
          <span className="text-[10px] text-muted-foreground capitalize">{cartao.bandeira}</span>
        </div>
        {isBest && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary">
            💡 Melhor hoje
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Fatura atual</span>
        <span className="text-sm font-bold text-foreground tabular-nums">
          {showBalance ? fmt(faturaAtual) : "••••"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {isClosingSoon && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-500">
            ⚠️ Fecha em {daysUntilClose} dia{daysUntilClose !== 1 ? "s" : ""}
          </span>
        )}
        {isClosed && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-destructive/15 text-destructive">
            🔴 Fatura fechada — {showBalance ? fmt(faturaAtual) : "••••"} a pagar
          </span>
        )}
        {!isClosingSoon && !isClosed && daysUntilClose > 3 && (
          <span className="text-[10px] text-muted-foreground">
            Fecha em {daysUntilClose} dias
          </span>
        )}
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
          📅 Melhor dia: {cartao.melhor_dia_compra}
        </span>
      </div>
    </div>
  );
};

export default CartaoCard;
