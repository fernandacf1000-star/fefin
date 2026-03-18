// New category/subcategory structure
export interface SubcategoriaGroup {
  group: string;
  emoji: string;
  items: string[];
}

export const SUBCATEGORIA_GROUPS: SubcategoriaGroup[] = [
  { group: "Moradia", emoji: "🏠", items: ["Condomínio/IPTU", "Manutenção", "Internet/Celular"] },
  { group: "Alimentação", emoji: "🍔", items: ["Supermercado", "Restaurantes", "Delivery"] },
  { group: "Transporte", emoji: "🚗", items: ["Combustível", "Uber/Taxi", "Estacionamento/Pedágio", "Manutenção/Seguro"] },
  { group: "Saúde", emoji: "🏥", items: ["Plano de saúde", "Consultas/Exames", "Medicamentos"] },
  { group: "Pessoal", emoji: "🛍️", items: ["Roupas/Cuidados pessoais", "Presentes", "Outros"] },
  { group: "Lazer", emoji: "🎉", items: ["Viagens", "Entretenimento", "Assinaturas"] },
  { group: "Investimentos", emoji: "💰", items: ["Renda fixa", "Ações/ETF", "Fundos", "Previdência"] },
];

/** Groups that Pais can use (all) */
export const PAIS_GROUPS = SUBCATEGORIA_GROUPS;

/** Flat list of all subcategorias */
export const ALL_SUBCATEGORIAS: string[] = SUBCATEGORIA_GROUPS.flatMap((g) => g.items);

/** Get the group for a subcategoria */
export const getSubcategoriaGroup = (sub: string): string | undefined => {
  return SUBCATEGORIA_GROUPS.find((g) => g.items.includes(sub))?.group;
};

/** Get emoji for a group */
export const getGroupEmoji = (group: string): string => {
  return SUBCATEGORIA_GROUPS.find((g) => g.group === group)?.emoji || "📋";
};

/** Format subcategoria for display: "Group > Item" */
export const formatSubcategoria = (sub: string): string => {
  const group = getSubcategoriaGroup(sub);
  return group ? `${group} > ${sub}` : sub;
};

/** Auto-detect subcategoria from description */
export const detectSubcategoria = (descricao: string): string | null => {
  const d = descricao.toUpperCase();

  // Moradia
  if (/CONDOMINIO|CONDOMÍNIO|IPTU/.test(d)) return "Condomínio/IPTU";
  if (/PAYGO|ARTSOUL|CUKIER|QUADRO E COR|CILA ART|LEROY MERLIN|SAMSUNG|COMERCIAL BUCALO|PORTO SEGURO|TOKIO MARINE/.test(d)) return "Manutenção";
  if (/APPLECOMBILL|EC \*LIVO|MP\*LTCOMERC|INTERNET|CELULAR|CLARO|VIVO|TIM|OI\s|FIBRA/.test(d)) return "Internet/Celular";

  // Alimentação
  if (/PAO DE ACUCAR|HOMEM DE MELLO|HOMEM DE MEL|MERCADO|SACOLAO|HORTIFRUTI|PASTORINHO|MERCADOLIVRE|MP\*2PRODUTOS|CARREFOUR|EXTRA\s|ASSAI|ATACADAO/.test(d)) return "Supermercado";
  if (/IFD\*BR|IFD\*IFOOD|IFOOD|RAPPI|DELIVERY|UBER EATS/.test(d)) return "Delivery";
  if (/HOT POT RESTAURANT|A LAREIRA|RODOSNACK|QUIOSQUE O GUARUCA|RESTAURANTE|CANTINA|LANCHONETE|BURGUER|BURGER|PIZZA|PADARIA|CAFE|CAFETERIA|STARBUCKS/.test(d)) return "Restaurantes";

  // Transporte
  if (/UBER|99\s|99POP|CABIFY/.test(d)) return "Uber/Taxi";
  if (/ABASTEC|COMBUSTIVEL|GASOLINA|ETANOL|POSTO|SHELL|IPIRANGA/.test(d)) return "Combustível";
  if (/CARDIM PARK|ALLPARK|ESTACIONAMENTO|ZONA AZUL|ESTAPAR|PEDAGIO|PEDÁGIO/.test(d)) return "Estacionamento/Pedágio";

  // Saúde
  if (/DROGARIA|RD SAUDE|FARMACIA|PANVEL|DROGASIL|RAIA|PACHECO/.test(d)) return "Medicamentos";
  if (/CLINICA CARLA VIDA|OCULISTA|CLINICA|MEDIC|HOSPITAL|LABORAT|CONSULTA|EXAME/.test(d)) return "Consultas/Exames";
  if (/OMINT|PLANO.*SAUDE|UNIMED|AMIL|HAPVIDA/.test(d)) return "Plano de saúde";

  // Pessoal
  if (/ZARA|CENTAURO|NIKE|CRIS BARROS|LAFORT|CATRAN|GRUPO BRABUS|SHOP2GETHER|VINDI|BOBO PATIO|E-COM HERING|SEPHORA|INVICTU|NETSHOES|ANSELMI|PORTO COMERCIO|STUDIO MORMAII|GRANADO|BELEZA NA WEB|RETRO HAIR|STUDIO GARCIA|MP\*STUDIOGARCIA|ACADEMIA|SMART FIT/.test(d)) return "Roupas/Cuidados pessoais";
  if (/JIM\.COM|CURSO|UDEMY|ALURA|ESCOLA/.test(d)) return "Outros";
  if (/CASAR \*PRE\*SENTE/.test(d)) return "Presentes";

  // Lazer
  if (/NETFLIX|SPOTIFY|DISNEY|YOUTUBE|APPLE|GOOGLE\sONE|PRIME|HBO|GLOBOPLAY/.test(d)) return "Assinaturas";
  if (/SYMPLA|GRANDE HOTEL SAO P|HOTELAR MAUA BRASI/.test(d)) return "Entretenimento";

  return null;
};

/** Detect categoria_macro from subcategoria */
export const detectCategoriaMacro = (subcategoria: string): string | null => {
  return getSubcategoriaGroup(subcategoria) || null;
};

/** Per-subcategoria unique colors */
export const SUBCAT_COLORS: Record<string, string> = {
  /* MORADIA */
  "Condomínio/IPTU": "#6366F1",
  "Manutenção": "#8B5CF6",
  "Internet/Celular": "#0EA5E9",
  /* ALIMENTAÇÃO */
  "Supermercado": "#F59E0B",
  "Restaurantes": "#F97316",
  "Delivery": "#EF4444",
  /* TRANSPORTE */
  "Combustível": "#3B82F6",
  "Uber/Taxi": "#06B6D4",
  "Estacionamento/Pedágio": "#64748B",
  "Manutenção/Seguro": "#475569",
  /* SAÚDE */
  "Plano de saúde": "#10B981",
  "Consultas/Exames": "#34D399",
  "Medicamentos": "#14B8A6",
  /* PESSOAL */
  "Roupas/Cuidados pessoais": "#EC4899",
  
  "Presentes": "#F43F5E",
  "Outros": "#94A3B8",
  /* LAZER */
  "Viagens": "#FBBF24",
  "Entretenimento": "#FB7185",
  "Assinaturas": "#C084FC",
  /* INVESTIMENTOS */
  "Renda fixa": "#4ADE80",
  "Ações/ETF": "#FCD34D",
  "Fundos": "#67E8F9",
  "Previdência": "#86EFAC",
};

/** Get color for a subcategoria — unique per subcategoria */
export const getSubcategoriaColor = (sub: string, _macro?: string | null): string => {
  return SUBCAT_COLORS[sub] || "#475569";
};

/** Category colors for charts */
export const CAT_COLORS: Record<string, string> = {
  "Moradia": "#6366F1",
  "Alimentação": "#F59E0B",
  "Transporte": "#3B82F6",
  "Saúde": "#10B981",
  "Pessoal": "#EC4899",
  "Lazer": "#F97316",
  "Investimentos": "#8B5CF6",
};

/** Legacy category mapping — remap old categoria_macro to new structure */
const LEGACY_CATEGORY_MAP: Record<string, { macro: string; sub: string }> = {
  "Compras Online": { macro: "Pessoal", sub: "Outros" },
};

/** Legacy subcategoria mapping — remap old subcategorias to new structure */
const LEGACY_SUB_MAP: Record<string, { macro: string; sub: string }> = {
  "Amazon": { macro: "Pessoal", sub: "Roupas/Cuidados pessoais" },
  "Shopee": { macro: "Pessoal", sub: "Roupas/Cuidados pessoais" },
  "Outros e-commerce": { macro: "Pessoal", sub: "Outros" },
  "Roupas/Calçados": { macro: "Pessoal", sub: "Roupas/Cuidados pessoais" },
  "Hortifruti": { macro: "Alimentação", sub: "Supermercado" },
  "Mercado": { macro: "Alimentação", sub: "Supermercado" },
  "Cabelo/Estética": { macro: "Pessoal", sub: "Roupas/Cuidados pessoais" },
  "Farmácia/Remédios": { macro: "Saúde", sub: "Medicamentos" },
  "Advogado/Jurídico": { macro: "Pessoal", sub: "Outros" },
  "Seguros": { macro: "Transporte", sub: "Manutenção/Seguro" },
  "Itens domésticos": { macro: "Moradia", sub: "Manutenção" },
  "Hotel/Hospedagem": { macro: "Lazer", sub: "Entretenimento" },
  "Objetos de arte": { macro: "Moradia", sub: "Manutenção" },
  "Miscelânea": { macro: "Pessoal", sub: "Outros" },
  "Livros": { macro: "Pessoal", sub: "Outros" },
  "Loteria": { macro: "Lazer", sub: "Entretenimento" },
};

/** Normalize a categoria_macro, remapping legacy values */
export const normalizeMacro = (macro: string | null | undefined, sub?: string | null): string => {
  // First check if subcategoria has a legacy mapping
  if (sub && LEGACY_SUB_MAP[sub]) return LEGACY_SUB_MAP[sub].macro;
  if (!macro) return "Sem categoria";
  const mapped = LEGACY_CATEGORY_MAP[macro];
  return mapped ? mapped.macro : macro;
};

/** Normalize subcategoria for legacy categories */
export const normalizeSub = (macro: string | null | undefined, sub: string | null | undefined): string | null => {
  if (sub && LEGACY_SUB_MAP[sub]) return LEGACY_SUB_MAP[sub].sub;
  if (macro && LEGACY_CATEGORY_MAP[macro]) return LEGACY_CATEGORY_MAP[macro].sub;
  return sub || null;
};
