
DO $$
DECLARE
  r RECORD;
  novo_id uuid;
BEGIN
  FOR r IN
    SELECT DISTINCT descricao, parcela_total, user_id
    FROM lancamentos
    WHERE is_parcelado = true
      AND parcelamento_id IS NULL
      AND parcela_total IS NOT NULL
  LOOP
    novo_id := gen_random_uuid();
    UPDATE lancamentos
    SET parcelamento_id = novo_id
    WHERE descricao = r.descricao
      AND parcela_total = r.parcela_total
      AND user_id = r.user_id
      AND is_parcelado = true
      AND parcelamento_id IS NULL;
  END LOOP;
END $$;
