
-- Add nome and email to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nome text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- Update trigger to populate nome and email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$function$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create lancamentos table
CREATE TABLE public.lancamentos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  tipo text NOT NULL DEFAULT 'despesa',
  categoria text NOT NULL DEFAULT 'outros',
  subcategoria_pais text,
  data date NOT NULL DEFAULT CURRENT_DATE,
  mes_referencia text NOT NULL DEFAULT to_char(CURRENT_DATE, 'YYYY-MM'),
  parcela_atual integer,
  parcela_total integer,
  pago boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.lancamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own lancamentos" ON public.lancamentos FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own lancamentos" ON public.lancamentos FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own lancamentos" ON public.lancamentos FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own lancamentos" ON public.lancamentos FOR DELETE USING (user_id = auth.uid());

-- Create patrimonio table
CREATE TABLE public.patrimonio (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  saldo numeric NOT NULL DEFAULT 0,
  rendimento_mensal numeric,
  data_atualizacao date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.patrimonio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own patrimonio" ON public.patrimonio FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own patrimonio" ON public.patrimonio FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own patrimonio" ON public.patrimonio FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own patrimonio" ON public.patrimonio FOR DELETE USING (user_id = auth.uid());

-- Create patrimonio_movimentacoes table
CREATE TABLE public.patrimonio_movimentacoes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patrimonio_tipo text NOT NULL,
  tipo_movimentacao text NOT NULL,
  motivo text,
  valor numeric NOT NULL DEFAULT 0,
  data date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.patrimonio_movimentacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own patrimonio_movimentacoes" ON public.patrimonio_movimentacoes FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own patrimonio_movimentacoes" ON public.patrimonio_movimentacoes FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own patrimonio_movimentacoes" ON public.patrimonio_movimentacoes FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own patrimonio_movimentacoes" ON public.patrimonio_movimentacoes FOR DELETE USING (user_id = auth.uid());
