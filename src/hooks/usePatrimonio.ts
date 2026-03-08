import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Patrimonio {
  id: string;
  user_id: string;
  tipo: string;
  saldo: number;
  rendimento_mensal: number | null;
  data_atualizacao: string;
  created_at: string;
}

export interface PatrimonioMovimentacao {
  id: string;
  user_id: string;
  patrimonio_tipo: string;
  tipo_movimentacao: string;
  motivo: string | null;
  valor: number;
  data: string;
  created_at: string;
}

export const usePatrimonioData = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["patrimonio", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patrimonio")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Patrimonio[];
    },
    enabled: !!user,
  });
};

export const usePatrimonioMovimentacoes = (patrimonioTipo?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["patrimonio_movimentacoes", user?.id, patrimonioTipo],
    queryFn: async () => {
      let query = supabase
        .from("patrimonio_movimentacoes")
        .select("*")
        .order("data", { ascending: false });

      if (patrimonioTipo) {
        query = query.eq("patrimonio_tipo", patrimonioTipo);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as PatrimonioMovimentacao[];
    },
    enabled: !!user,
  });
};
