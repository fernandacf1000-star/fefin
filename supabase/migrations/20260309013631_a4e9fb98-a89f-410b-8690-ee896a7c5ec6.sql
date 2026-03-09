
ALTER TABLE public.lancamentos
  ADD COLUMN IF NOT EXISTS recorrente boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dia_recorrencia integer,
  ADD COLUMN IF NOT EXISTS recorrencia_ate date,
  ADD COLUMN IF NOT EXISTS recorrencia_pai_id uuid;
