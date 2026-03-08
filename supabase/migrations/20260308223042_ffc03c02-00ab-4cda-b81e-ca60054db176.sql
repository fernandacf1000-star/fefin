-- Add is_parcelado and parcelamento_id columns to lancamentos
ALTER TABLE public.lancamentos
  ADD COLUMN IF NOT EXISTS is_parcelado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS parcelamento_id uuid;

-- Reclassify existing lancamentos based on description patterns
-- Moradia > Condomínio/IPTU
UPDATE public.lancamentos SET categoria_macro = 'Moradia', subcategoria = 'Condomínio/IPTU'
WHERE upper(descricao) ~ '(CONDOMINIO|CONDOMÍNIO|IPTU)' AND tipo = 'despesa';

-- Moradia > Manutenção
UPDATE public.lancamentos SET categoria_macro = 'Moradia', subcategoria = 'Manutenção'
WHERE upper(descricao) ~ '(PAYGO|ARTSOUL|CUKIER|QUADRO E COR|CILA ART|LEROY MERLIN|SAMSUNG|COMERCIAL BUCALO|PORTO SEGURO|TOKIO MARINE)' AND tipo = 'despesa';

-- Moradia > Internet/Celular
UPDATE public.lancamentos SET categoria_macro = 'Moradia', subcategoria = 'Internet/Celular'
WHERE upper(descricao) ~ '(APPLECOMBILL|EC \*LIVO|MP\*LTCOMERC)' AND tipo = 'despesa';

-- Alimentação > Supermercado
UPDATE public.lancamentos SET categoria_macro = 'Alimentação', subcategoria = 'Supermercado'
WHERE upper(descricao) ~ '(PAO DE ACUCAR|HOMEM DE MELLO|HOMEM DE MEL|MERCADO|SACOLAO|HORTIFRUTI|PASTORINHO|MERCADOLIVRE\*2PRODUTOS|MP\*2PRODUTOS)' AND tipo = 'despesa';

-- Alimentação > Restaurantes
UPDATE public.lancamentos SET categoria_macro = 'Alimentação', subcategoria = 'Restaurantes'
WHERE upper(descricao) ~ '(HOT POT RESTAURANT|A LAREIRA RESTAURANTE|RODOSNACK|QUIOSQUE O GUARUCA)' AND tipo = 'despesa';

-- Alimentação > Delivery
UPDATE public.lancamentos SET categoria_macro = 'Alimentação', subcategoria = 'Delivery'
WHERE upper(descricao) ~ '(IFD\*BR|IFD\*IFOOD|IFOOD)' AND tipo = 'despesa';

-- Transporte > Combustível
UPDATE public.lancamentos SET categoria_macro = 'Transporte', subcategoria = 'Combustível'
WHERE upper(descricao) ~ '(ABASTEC)' AND tipo = 'despesa';

-- Transporte > Estacionamento/Pedágio
UPDATE public.lancamentos SET categoria_macro = 'Transporte', subcategoria = 'Estacionamento/Pedágio'
WHERE upper(descricao) ~ '(CARDIM PARK|ALLPARK)' AND tipo = 'despesa';

-- Saúde > Medicamentos
UPDATE public.lancamentos SET categoria_macro = 'Saúde', subcategoria = 'Medicamentos'
WHERE upper(descricao) ~ '(DROGARIA|RD SAUDE|FARMACIA|PANVEL)' AND tipo = 'despesa';

-- Saúde > Consultas/Exames
UPDATE public.lancamentos SET categoria_macro = 'Saúde', subcategoria = 'Consultas/Exames'
WHERE upper(descricao) ~ '(CLINICA CARLA VIDA|OCULISTA)' AND tipo = 'despesa';

-- Saúde > Plano de saúde
UPDATE public.lancamentos SET categoria_macro = 'Saúde', subcategoria = 'Plano de saúde'
WHERE upper(descricao) ~ '(OMINT)' AND tipo = 'despesa';

-- Pessoal > Roupas/Cuidados pessoais
UPDATE public.lancamentos SET categoria_macro = 'Pessoal', subcategoria = 'Roupas/Cuidados pessoais'
WHERE upper(descricao) ~ '(ZARA|CENTAURO|NIKE|CRIS BARROS|LAFORT|CATRAN|GRUPO BRABUS|SHOP2GETHER|VINDI|BOBO PATIO|E-COM HERING|SEPHORA|INVICTU|NETSHOES|ANSELMI|PORTO COMERCIO|STUDIO MORMAII|GRANADO|BELEZA NA WEB|RETRO HAIR|STUDIO GARCIA|MP\*STUDIOGARCIA)' AND tipo = 'despesa';

-- Pessoal > Cursos/Desenvolvimento
UPDATE public.lancamentos SET categoria_macro = 'Pessoal', subcategoria = 'Cursos/Desenvolvimento'
WHERE upper(descricao) ~ '(JIM\.COM)' AND tipo = 'despesa';

-- Pessoal > Presentes
UPDATE public.lancamentos SET categoria_macro = 'Pessoal', subcategoria = 'Presentes'
WHERE upper(descricao) ~ '(CASAR \*PRE\*SENTE)' AND tipo = 'despesa';

-- Pessoal > Outros
UPDATE public.lancamentos SET categoria_macro = 'Pessoal', subcategoria = 'Outros'
WHERE upper(descricao) ~ '(WOW\*WOWRLB|HUGO OLIVEIRA NEVES|55369186ISMAR|VILHENA SILVA ADVO)' AND tipo = 'despesa';

-- Lazer > Entretenimento
UPDATE public.lancamentos SET categoria_macro = 'Lazer', subcategoria = 'Entretenimento'
WHERE upper(descricao) ~ '(SYMPLA|GRANDE HOTEL SAO P|HOTELAR MAUA BRASI)' AND tipo = 'despesa';

-- Lazer > Assinaturas
UPDATE public.lancamentos SET categoria_macro = 'Lazer', subcategoria = 'Assinaturas'
WHERE upper(descricao) ~ '(NETFLIX|SPOTIFY)' AND tipo = 'despesa';

-- Mark existing parcelada entries as is_parcelado
UPDATE public.lancamentos SET is_parcelado = true
WHERE categoria = 'parcelada';

-- Set unclassified despesas to Pessoal > Outros
UPDATE public.lancamentos SET categoria_macro = 'Pessoal', subcategoria = 'Outros'
WHERE tipo = 'despesa' AND (categoria_macro IS NULL OR categoria_macro = '');