
-- Add pago_por column to lancamentos table
-- Tracks who actually paid for a shared expense ('voce' or 'adriano')
ALTER TABLE public.lancamentos
ADD COLUMN pago_por text NOT NULL DEFAULT 'voce';
