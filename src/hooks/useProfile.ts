import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  nome: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  tipo_tributacao: string | null;
  idade: number | null;
  idade_aposentadoria: number | null;
  aliquota_aposentadoria_estimada: number | null;
  ir_dados: any;
  meta_mensal: number | null;
}

export const useProfile = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data as Profile;
    },
    enabled: !!user,
  });
};
