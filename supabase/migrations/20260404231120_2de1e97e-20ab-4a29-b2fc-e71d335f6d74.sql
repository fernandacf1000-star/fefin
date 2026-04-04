
-- Drop existing public-role policies
DROP POLICY IF EXISTS "Users can delete own lancamentos" ON public.lancamentos;
DROP POLICY IF EXISTS "Users can insert own lancamentos" ON public.lancamentos;
DROP POLICY IF EXISTS "Users can update own lancamentos" ON public.lancamentos;
DROP POLICY IF EXISTS "Users can view own lancamentos" ON public.lancamentos;

-- Recreate with authenticated role
CREATE POLICY "Users can view own lancamentos" ON public.lancamentos FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own lancamentos" ON public.lancamentos FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own lancamentos" ON public.lancamentos FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own lancamentos" ON public.lancamentos FOR DELETE TO authenticated USING (user_id = auth.uid());
