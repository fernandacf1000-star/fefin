import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Cartao {
  id: string;
  user_id: string;
  nome: string;
  bandeira: string;
  dia_fechamento: number;
  dia_vencimento: number;
  melhor_dia_compra: number;
  cor: string;
  ativo: boolean;
  created_at: string;
}

export const useCartoes = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["cartoes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cartoes" as any)
        .select("*")
        .eq("ativo", true)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Cartao[];
    },
    enabled: !!user,
  });
};

export const useAddCartao = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (cartao: Omit<Cartao, "id" | "user_id" | "created_at" | "ativo">) => {
      if (!user) throw new Error("Não autenticado");
      const { data, error } = await supabase
        .from("cartoes" as any)
        .insert({ ...cartao, user_id: user.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cartoes"] }),
  });
};

export const useUpdateCartao = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Cartao> & { id: string }) => {
      const { data, error } = await supabase
        .from("cartoes" as any)
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cartoes"] }),
  });
};

export const useDeleteCartao = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("cartoes" as any)
        .update({ ativo: false } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cartoes"] }),
  });
};

/**
 * Get the current billing cycle dates for a card.
 *
 * Cycle logic:
 *   - cycleEnd   = next occurrence of diaFechamento (the closing date)
 *   - cycleStart = day after the previous closing date
 *   - daysUntilClose = days remaining until cycleEnd (0 = closes today, <0 = already closed)
 *
 * "Melhor cartão" = the card with most daysUntilClose (most time to pay)
 *
 * Fatura display:
 *   - If daysUntilClose >= 0  → cycle still open, show acumulado (compras de cycleStart até hoje)
 *   - If daysUntilClose < 0   → cycle closed, show fatura fechada aguardando pagamento
 *     (use previousCycleStart / previousCycleEnd)
 */
export const getCartaoCycle = (diaFechamento: number) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const year = today.getFullYear();
  const month = today.getMonth();
  const day = today.getDate();

  let cycleStart: Date;
  let cycleEnd: Date;
  let previousCycleStart: Date;
  let previousCycleEnd: Date;

  if (day <= diaFechamento) {
    // Before or on closing day this month → current cycle ends this month
    cycleEnd = new Date(year, month, diaFechamento);
    cycleStart = new Date(year, month - 1, diaFechamento + 1);
    previousCycleEnd = new Date(year, month - 1, diaFechamento);
    previousCycleStart = new Date(year, month - 2, diaFechamento + 1);
  } else {
    // After closing day → current cycle ends next month
    cycleEnd = new Date(year, month + 1, diaFechamento);
    cycleStart = new Date(year, month, diaFechamento + 1);
    previousCycleEnd = new Date(year, month, diaFechamento);
    previousCycleStart = new Date(year, month - 1, diaFechamento + 1);
  }

  // mes_referencia do ciclo atual (YYYY-MM) — mês em que a fatura vence
  // Vencimento = 5 dias corridos após fechamento (aproximação; data exata vem do banco)
  const vencimento = new Date(cycleEnd);
  vencimento.setDate(vencimento.getDate() + 5);
  const cycleMonthRef = `${vencimento.getFullYear()}-${String(vencimento.getMonth() + 1).padStart(2, '0')}`;

  // mes_referencia do ciclo anterior
  const vencimentoPrev = new Date(previousCycleEnd);
  vencimentoPrev.setDate(vencimentoPrev.getDate() + 5);
  const previousCycleMonthRef = `${vencimentoPrev.getFullYear()}-${String(vencimentoPrev.getMonth() + 1).padStart(2, '0')}`;

  const daysUntilClose = Math.ceil((cycleEnd.getTime() - today.getTime()) / 86400000);

  return {
    cycleStart,
    cycleEnd,
    previousCycleStart,
    previousCycleEnd,
    cycleMonthRef,
    previousCycleMonthRef,
    daysUntilClose,
  };
};
