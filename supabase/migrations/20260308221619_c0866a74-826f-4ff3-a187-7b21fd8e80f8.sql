
-- Create cartoes table
CREATE TABLE public.cartoes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  nome text NOT NULL,
  bandeira text NOT NULL DEFAULT 'visa',
  dia_fechamento integer NOT NULL DEFAULT 10,
  melhor_dia_compra integer NOT NULL DEFAULT 11,
  cor text NOT NULL DEFAULT '#10B981',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.cartoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cartoes" ON public.cartoes FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own cartoes" ON public.cartoes FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own cartoes" ON public.cartoes FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own cartoes" ON public.cartoes FOR DELETE USING (user_id = auth.uid());

-- Add forma_pagamento and cartao_id to lancamentos
ALTER TABLE public.lancamentos ADD COLUMN IF NOT EXISTS forma_pagamento text;
ALTER TABLE public.lancamentos ADD COLUMN IF NOT EXISTS cartao_id uuid REFERENCES public.cartoes(id) ON DELETE SET NULL;
