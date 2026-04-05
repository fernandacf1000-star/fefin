
-- Add explicit link column for Adriano mirror entries
ALTER TABLE public.lancamentos
ADD COLUMN lancamento_origem_id uuid DEFAULT NULL;

-- Index for efficient lookups
CREATE INDEX idx_lancamentos_origem_id ON public.lancamentos (lancamento_origem_id)
WHERE lancamento_origem_id IS NOT NULL;

-- Backfill existing Adriano mirrors: match by adriano=true to their origin
-- by matching descricao + data where adriano=false for same user
UPDATE public.lancamentos AS mirror
SET lancamento_origem_id = origin.id
FROM public.lancamentos AS origin
WHERE mirror.adriano = true
  AND mirror.lancamento_origem_id IS NULL
  AND origin.adriano = false
  AND mirror.user_id = origin.user_id
  AND mirror.descricao = origin.descricao
  AND mirror.data = origin.data;
