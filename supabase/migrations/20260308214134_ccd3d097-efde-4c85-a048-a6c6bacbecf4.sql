
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS tipo_tributacao text DEFAULT 'clt',
  ADD COLUMN IF NOT EXISTS idade integer,
  ADD COLUMN IF NOT EXISTS idade_aposentadoria integer DEFAULT 55,
  ADD COLUMN IF NOT EXISTS aliquota_aposentadoria_estimada numeric DEFAULT 15;
