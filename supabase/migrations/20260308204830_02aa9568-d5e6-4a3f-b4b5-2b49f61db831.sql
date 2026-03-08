
CREATE TABLE public.ir_lancamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ano integer NOT NULL,
  mes integer,
  tipo text NOT NULL DEFAULT 'outro',
  descricao text NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  data date DEFAULT CURRENT_DATE,
  subtipo text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ir_lancamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ir_lancamentos" ON public.ir_lancamentos
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert own ir_lancamentos" ON public.ir_lancamentos
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own ir_lancamentos" ON public.ir_lancamentos
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can delete own ir_lancamentos" ON public.ir_lancamentos
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX idx_ir_lancamentos_user_ano ON public.ir_lancamentos(user_id, ano);
