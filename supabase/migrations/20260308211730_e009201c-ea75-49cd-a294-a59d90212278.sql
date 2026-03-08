
CREATE TABLE public.reembolsos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lancamento_id uuid NOT NULL REFERENCES public.lancamentos(id) ON DELETE CASCADE,
  valor_reembolsado numeric NOT NULL DEFAULT 0,
  quem_reembolsou text NOT NULL DEFAULT '',
  data_reembolso date NOT NULL DEFAULT CURRENT_DATE,
  observacao text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.reembolsos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reembolsos" ON public.reembolsos FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own reembolsos" ON public.reembolsos FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own reembolsos" ON public.reembolsos FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own reembolsos" ON public.reembolsos FOR DELETE TO authenticated USING (user_id = auth.uid());
