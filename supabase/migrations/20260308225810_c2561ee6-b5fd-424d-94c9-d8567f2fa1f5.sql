-- Reclassify legacy subcategorias to new structure
UPDATE public.lancamentos SET subcategoria = 'Roupas/Cuidados pessoais', categoria_macro = 'Pessoal' WHERE subcategoria IN ('Amazon', 'Shopee', 'Roupas/Calçados', 'Cabelo/Estética') AND tipo = 'despesa';
UPDATE public.lancamentos SET subcategoria = 'Outros', categoria_macro = 'Pessoal' WHERE subcategoria IN ('Outros e-commerce', 'Advogado/Jurídico', 'Miscelânea') AND tipo = 'despesa';
UPDATE public.lancamentos SET subcategoria = 'Supermercado', categoria_macro = 'Alimentação' WHERE subcategoria IN ('Hortifruti', 'Mercado') AND tipo = 'despesa';
UPDATE public.lancamentos SET subcategoria = 'Medicamentos', categoria_macro = 'Saúde' WHERE subcategoria = 'Farmácia/Remédios' AND tipo = 'despesa';
UPDATE public.lancamentos SET subcategoria = 'Manutenção/Seguro', categoria_macro = 'Transporte' WHERE subcategoria = 'Seguros' AND tipo = 'despesa';
UPDATE public.lancamentos SET subcategoria = 'Manutenção', categoria_macro = 'Moradia' WHERE subcategoria IN ('Itens domésticos', 'Objetos de arte') AND tipo = 'despesa';
UPDATE public.lancamentos SET subcategoria = 'Entretenimento', categoria_macro = 'Lazer' WHERE subcategoria IN ('Hotel/Hospedagem', 'Loteria') AND tipo = 'despesa';
UPDATE public.lancamentos SET subcategoria = 'Cursos/Desenvolvimento', categoria_macro = 'Pessoal' WHERE subcategoria = 'Livros' AND tipo = 'despesa';
-- Reclassify Compras Online macro category
UPDATE public.lancamentos SET categoria_macro = 'Pessoal', subcategoria = COALESCE(subcategoria, 'Outros') WHERE categoria_macro = 'Compras Online' AND tipo = 'despesa';