
-- cartoes: drop public policies, recreate as authenticated
DROP POLICY IF EXISTS "Users can view own cartoes" ON public.cartoes;
DROP POLICY IF EXISTS "Users can insert own cartoes" ON public.cartoes;
DROP POLICY IF EXISTS "Users can update own cartoes" ON public.cartoes;
DROP POLICY IF EXISTS "Users can delete own cartoes" ON public.cartoes;

CREATE POLICY "Users can view own cartoes" ON public.cartoes FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own cartoes" ON public.cartoes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own cartoes" ON public.cartoes FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own cartoes" ON public.cartoes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- patrimonio: drop public policies, recreate as authenticated
DROP POLICY IF EXISTS "Users can view own patrimonio" ON public.patrimonio;
DROP POLICY IF EXISTS "Users can insert own patrimonio" ON public.patrimonio;
DROP POLICY IF EXISTS "Users can update own patrimonio" ON public.patrimonio;
DROP POLICY IF EXISTS "Users can delete own patrimonio" ON public.patrimonio;

CREATE POLICY "Users can view own patrimonio" ON public.patrimonio FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own patrimonio" ON public.patrimonio FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own patrimonio" ON public.patrimonio FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own patrimonio" ON public.patrimonio FOR DELETE TO authenticated USING (user_id = auth.uid());

-- patrimonio_movimentacoes: drop public policies, recreate as authenticated
DROP POLICY IF EXISTS "Users can view own patrimonio_movimentacoes" ON public.patrimonio_movimentacoes;
DROP POLICY IF EXISTS "Users can insert own patrimonio_movimentacoes" ON public.patrimonio_movimentacoes;
DROP POLICY IF EXISTS "Users can update own patrimonio_movimentacoes" ON public.patrimonio_movimentacoes;
DROP POLICY IF EXISTS "Users can delete own patrimonio_movimentacoes" ON public.patrimonio_movimentacoes;

CREATE POLICY "Users can view own patrimonio_movimentacoes" ON public.patrimonio_movimentacoes FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own patrimonio_movimentacoes" ON public.patrimonio_movimentacoes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own patrimonio_movimentacoes" ON public.patrimonio_movimentacoes FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own patrimonio_movimentacoes" ON public.patrimonio_movimentacoes FOR DELETE TO authenticated USING (user_id = auth.uid());
