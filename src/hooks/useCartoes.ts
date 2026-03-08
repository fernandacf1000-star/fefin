import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Cartao {
  id: string;
  user_id: string;
  nome: string;
  bandeira: string;
  dia_fechamento: number;
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

/** Get the current billing cycle dates for a card */
export const getCartaoCycle = (diaFechamento: number) => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const day = today.getDate();

  let cycleStart: Date;
  let cycleEnd: Date;

  if (day <= diaFechamento) {
    // We're before closing day — cycle started last month
    cycleStart = new Date(year, month - 1, diaFechamento + 1);
    cycleEnd = new Date(year, month, diaFechamento);
  } else {
    // We're after closing day — cycle started this month
    cycleStart = new Date(year, month, diaFechamento + 1);
    cycleEnd = new Date(year, month + 1, diaFechamento);
  }

  const daysUntilClose = Math.ceil((cycleEnd.getTime() - today.getTime()) / 86400000);
  const isClosed = daysUntilClose < 0;

  return { cycleStart, cycleEnd, daysUntilClose, isClosed };
};
